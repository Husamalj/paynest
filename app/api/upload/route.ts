import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { parseAttendanceFile, parseSalaryFile } from "@/lib/excelParser";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

async function getSystemMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const companyId = session.companyId;
    const mode = await getSystemMode(companyId);

    const files = await prisma.uploadedFile.findMany({
      where: { companyId, systemMode: mode },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(files);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) throw new HttpError(400, "id required");

    const companyId = session.companyId;
    const file = await prisma.uploadedFile.findFirst({ where: { id: Number(id), companyId } });
    if (!file) throw new HttpError(404, "File not found");

    if (file.fileType === "attendance" && file.uploadBatch) {
      await prisma.attendanceRecord.deleteMany({ where: { uploadBatch: file.uploadBatch, companyId } });
    }
    await prisma.uploadedFile.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true, deleted: file });
  } catch (err) {
    return errorResponse(err);
  }
}

const toTimeISO = (t: string | null | undefined): Date | null => {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(1970, 0, 1, parseInt(m[1], 10), parseInt(m[2], 10), 0));
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const companyId = session.companyId;
    const url = new URL(req.url);
    const fileType = url.searchParams.get("type") || "attendance";
    const batchId = `batch_${Date.now()}`;
    const systemMode = await getSystemMode(companyId);

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) throw new HttpError(400, "No files uploaded");

    const results = [];

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      let rowCount = 0;
      let employeeCount = 0;
      let preview: any[] = [];

      if (fileType === "attendance") {
        const records = parseAttendanceFile(buf, batchId);
        rowCount = records.length;
        employeeCount = (records as any).employeeCount ?? new Set(records.map((r) => r.employee_id)).size;
        preview = records.slice(0, 10);

        if (records.length > 0) {
          const uniqueEmpIds = [...new Set(records.map((r) => r.employee_id))];

          // 1. Batch collision check — one query for all employee IDs
          const collisions = await prisma.employee.findMany({
            where: {
              employeeId: { in: uniqueEmpIds },
              systemMode,
              NOT: { companyId },
            },
            select: { employeeId: true },
          });
          if (collisions.length > 0) {
            throw new HttpError(
              409,
              `Employee ID "${collisions[0].employeeId}" is already used by another company`
            );
          }

          // 2. Batch upsert employees — one transaction
          const empNameMap = new Map<string, string>();
          for (const r of records) {
            if (!empNameMap.has(r.employee_id)) empNameMap.set(r.employee_id, r.employee_name);
          }
          await prisma.$transaction(
            uniqueEmpIds.map((id) =>
              prisma.employee.upsert({
                where: { employeeId_systemMode: { employeeId: id, systemMode } },
                create: { employeeId: id, name: empNameMap.get(id) || id, systemMode, companyId },
                update: {
                  name:
                    empNameMap.get(id) && empNameMap.get(id) !== id
                      ? empNameMap.get(id)
                      : undefined,
                },
              })
            )
          );

          // 3. Batch fetch existing attendance records — one query
          const uniqueDates = [...new Set(records.map((r) => r.work_date))].map(
            (d) => new Date(d)
          );
          const existingRows = await prisma.attendanceRecord.findMany({
            where: {
              companyId,
              systemMode,
              employeeId: { in: uniqueEmpIds },
              workDate: { in: uniqueDates },
            },
            select: { id: true, employeeId: true, workDate: true },
          });
          const existingMap = new Map<string, number>();
          for (const row of existingRows) {
            if (!row.workDate) continue;
            const key = `${row.employeeId}:${row.workDate.toISOString().slice(0, 10)}`;
            existingMap.set(key, row.id);
          }

          // 4. Split records into creates and updates, then run one transaction
          const creates: any[] = [];
          const updates: any[] = [];

          for (const record of records) {
            const key = `${record.employee_id}:${record.work_date}`;
            const existingId = existingMap.get(key);
            if (existingId != null) {
              updates.push(
                prisma.attendanceRecord.update({
                  where: { id: existingId },
                  data: {
                    clockIn: toTimeISO(record.clock_in),
                    clockOut: toTimeISO(record.clock_out),
                    hoursWorked: record.hours_worked,
                    uploadBatch: batchId,
                  },
                })
              );
            } else {
              creates.push({
                companyId,
                employeeId: record.employee_id,
                workDate: new Date(record.work_date),
                clockIn: toTimeISO(record.clock_in),
                clockOut: toTimeISO(record.clock_out),
                hoursWorked: record.hours_worked,
                uploadBatch: batchId,
                systemMode,
              });
            }
          }

          await prisma.$transaction([
            prisma.attendanceRecord.createMany({ data: creates, skipDuplicates: true }),
            ...updates,
          ]);
        }
      } else if (fileType === "salary") {
        const emps = parseSalaryFile(buf);
        rowCount = emps.length;
        employeeCount = emps.length;
        preview = emps.slice(0, 10);

        if (emps.length > 0) {
          const empIds = emps.map((e) => e.employee_id);

          // 1. Batch collision check — one query
          const collisions = await prisma.employee.findMany({
            where: {
              employeeId: { in: empIds },
              systemMode,
              NOT: { companyId },
            },
            select: { employeeId: true },
          });
          if (collisions.length > 0) {
            throw new HttpError(
              409,
              `Employee ID "${collisions[0].employeeId}" is already used by another company`
            );
          }

          // 2. Quota enforcement (unchanged logic)
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { maxEmployees: true },
          });
          if (company?.maxEmployees != null) {
            const adminUsers = await prisma.user.findMany({
              where: { companyId, role: { in: ["owner", "hr", "super_admin"] } },
              select: { employeeNumber: true },
            });
            const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];
            const existingIds = new Set(
              (
                await prisma.employee.findMany({
                  where: {
                    companyId,
                    systemMode,
                    ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}),
                  },
                  select: { employeeId: true },
                })
              )
                .map((e) => e.employeeId)
                .filter(Boolean) as string[]
            );
            const currentCount = existingIds.size;
            const newIds = emps.filter(
              (e) => !existingIds.has(e.employee_id) && !adminNums.includes(e.employee_id)
            );
            if (currentCount + newIds.length > company.maxEmployees) {
              throw new HttpError(
                403,
                `QUOTA_EXCEEDED: Your plan allows up to ${company.maxEmployees} employees. You have ${currentCount}, the file adds ${newIds.length} new ones (total ${currentCount + newIds.length}). Please upgrade your plan.`
              );
            }
          }

          // 3. Batch upsert all employees — one transaction
          await prisma.$transaction(
            emps.map((emp) =>
              prisma.employee.upsert({
                where: { employeeId_systemMode: { employeeId: emp.employee_id, systemMode } },
                create: {
                  employeeId: emp.employee_id,
                  name: emp.name,
                  baseSalary: emp.base_salary,
                  socialSecurity: emp.social_security,
                  systemMode,
                  companyId,
                },
                update: {
                  name: emp.name,
                  baseSalary: emp.base_salary,
                  socialSecurity: emp.social_security,
                },
              })
            )
          );
        }
      }

      await prisma.uploadedFile.create({
        data: {
          companyId,
          filename: file.name,
          originalName: file.name,
          fileType,
          uploadBatch: batchId,
          rowCount,
          employeeCount,
          systemMode,
        },
      });

      results.push({
        filename: file.name,
        row_count: rowCount,
        employee_count: employeeCount,
        type: fileType,
        preview,
      });
    }

    await logAudit(session, "upload", "upload", batchId, {
      type: fileType,
      filesCount: files.length,
      totalRows: results.reduce((s, r) => s + (r.row_count || 0), 0),
      totalEmployees: results.reduce((s, r) => s + (r.employee_count || 0), 0),
    });
    return NextResponse.json({
      success: true,
      batch_id: batchId,
      system_mode: systemMode,
      company_id: companyId,
      files: results,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
