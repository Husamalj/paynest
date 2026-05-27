import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { parseAttendanceFile, parseSalaryFile } from "@/lib/excelParser";

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

        for (const record of records) {
          // Cross-company safety check
          const collision = await prisma.employee.findUnique({
            where: { employeeId_systemMode: { employeeId: record.employee_id, systemMode } },
            select: { companyId: true },
          });
          if (collision && collision.companyId !== companyId) {
            throw new HttpError(409, `Employee ID "${record.employee_id}" is already used by another company`);
          }
          await prisma.employee.upsert({
            where: { employeeId_systemMode: { employeeId: record.employee_id, systemMode } },
            create: { employeeId: record.employee_id, name: record.employee_name || record.employee_id, systemMode, companyId },
            update: {
              name: record.employee_name && record.employee_name !== record.employee_id ? record.employee_name : undefined,
              // Do NOT change companyId on update — keep the record in its original company
            },
          });

          // Prisma needs ISO DateTime for @db.Time columns — wrap "HH:mm" into a date
          const toTimeISO = (t: string | null | undefined): Date | null => {
            if (!t) return null;
            const m = t.match(/^(\d{1,2}):(\d{2})/);
            if (!m) return null;
            const h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            return new Date(Date.UTC(1970, 0, 1, h, min, 0));
          };

          const existing = await prisma.attendanceRecord.findFirst({
            where: { employeeId: record.employee_id, workDate: new Date(record.work_date), systemMode, companyId },
          });

          if (existing) {
            await prisma.attendanceRecord.update({
              where: { id: existing.id },
              data: {
                clockIn: toTimeISO(record.clock_in),
                clockOut: toTimeISO(record.clock_out),
                hoursWorked: record.hours_worked,
                uploadBatch: batchId,
              },
            });
          } else {
            await prisma.attendanceRecord.create({
              data: {
                companyId,
                employeeId: record.employee_id,
                workDate: new Date(record.work_date),
                clockIn: toTimeISO(record.clock_in),
                clockOut: toTimeISO(record.clock_out),
                hoursWorked: record.hours_worked,
                uploadBatch: batchId,
                systemMode,
              },
            });
          }
        }
      } else if (fileType === "salary") {
        const emps = parseSalaryFile(buf);
        rowCount = emps.length;
        employeeCount = emps.length;
        preview = emps.slice(0, 10);

        // Enforce quota: count new employees that would be added vs the cap
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
            (await prisma.employee.findMany({
              where: { companyId, systemMode, ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}) },
              select: { employeeId: true },
            })).map((e) => e.employeeId).filter(Boolean) as string[]
          );
          const currentCount = existingIds.size;
          const newIds = emps.filter((e) => !existingIds.has(e.employee_id) && !adminNums.includes(e.employee_id));
          if (currentCount + newIds.length > company.maxEmployees) {
            throw new HttpError(
              403,
              `QUOTA_EXCEEDED: Your plan allows up to ${company.maxEmployees} employees. You have ${currentCount}, the file adds ${newIds.length} new ones (total ${currentCount + newIds.length}). Please upgrade your plan.`
            );
          }
        }

        for (const emp of emps) {
          // Cross-company safety check
          const collision = await prisma.employee.findUnique({
            where: { employeeId_systemMode: { employeeId: emp.employee_id, systemMode } },
            select: { companyId: true },
          });
          if (collision && collision.companyId !== companyId) {
            throw new HttpError(409, `Employee ID "${emp.employee_id}" is already used by another company`);
          }
          await prisma.employee.upsert({
            where: { employeeId_systemMode: { employeeId: emp.employee_id, systemMode } },
            create: { employeeId: emp.employee_id, name: emp.name, baseSalary: emp.base_salary, socialSecurity: emp.social_security, systemMode, companyId },
            update: { name: emp.name, baseSalary: emp.base_salary, socialSecurity: emp.social_security },
          });
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

      results.push({ filename: file.name, row_count: rowCount, employee_count: employeeCount, type: fileType, preview });
    }

    return NextResponse.json({ success: true, batch_id: batchId, system_mode: systemMode, company_id: companyId, files: results });
  } catch (err) {
    return errorResponse(err);
  }
}
