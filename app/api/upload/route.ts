import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { parseAttendanceFile, parseSalaryFile, detectFileKind } from "@/lib/excelParser";
import { logAudit, withAuditMeta } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { getCompanySystemMode } from "@/lib/companyContext";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";
import { deleteStoredFile, storeFile } from "@/lib/fileStorage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_FILES = 5;
const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;
const ALLOWED_SPREADSHEET_EXTENSIONS = new Set([".csv", ".xlsx"]);

async function getSystemMode(companyId: number) {
  return getCompanySystemMode(companyId);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await requirePageAccess(session, "upload");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const companyId = session.companyId;
    const mode = await getSystemMode(companyId);
    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const where = { companyId, systemMode: mode };

    const [files, total] = await Promise.all([
      prisma.uploadedFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(pagination.enabled ? paginationQuery(pagination) : { take: 100 }),
        // Exclude the heavy base64 blob from the list; expose only whether a
        // downloadable copy exists via `hasFile`.
        select: {
          id: true, companyId: true, filename: true, originalName: true,
          fileType: true, uploadBatch: true, rowCount: true, employeeCount: true,
          systemMode: true, mimeType: true, periodMonth: true, periodYear: true, createdAt: true,
          fileData: false,
          fileUrl: true,
          fileStorageKey: true,
        },
      }),
      pagination.enabled ? prisma.uploadedFile.count({ where }) : Promise.resolve(undefined),
    ]);
    const visibleIds = files.map((file) => file.id);
    const withFlag = visibleIds.length > 0
      ? await prisma.$queryRaw<{ id: number; has: boolean }[]>(
          Prisma.sql`SELECT id, (file_data IS NOT NULL OR file_url IS NOT NULL) AS has FROM uploaded_files WHERE company_id = ${companyId} AND id IN (${Prisma.join(visibleIds)})`,
        )
      : [];
    const hasMap = new Map(withFlag.map((r) => [r.id, r.has]));
    return withPaginationHeaders(files.map((f) => ({ ...f, hasFile: hasMap.get(f.id) ?? false })), pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await requirePageAccess(session, "upload");
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
    await deleteStoredFile(file.fileStorageKey);
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

function assertSafeSpreadsheetFile(file: File) {
  const name = file.name || "";
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";

  if (!ALLOWED_SPREADSHEET_EXTENSIONS.has(extension)) {
    throw new HttpError(400, "Only .xlsx and .csv files are allowed.");
  }

  if (file.size > MAX_SPREADSHEET_BYTES) {
    throw new HttpError(400, "Spreadsheet file is too large. Maximum size is 5MB.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "upload");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const limited = rateLimit(`upload:${session.companyId}:${getClientIp(req)}`, 20, 60 * 60_000);
    if (limited) return limited;

    const companyId = session.companyId;
    const url = new URL(req.url);
    const fileType = url.searchParams.get("type") || "attendance";
    const now = new Date();
    const periodMonth = parseInt(url.searchParams.get("month") || "", 10) || (now.getMonth() + 1);
    const periodYear = parseInt(url.searchParams.get("year") || "", 10) || now.getFullYear();
    const batchId = `batch_${Date.now()}`;
    const systemMode = await getSystemMode(companyId);

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) throw new HttpError(400, "No files uploaded");
    if (files.length > MAX_UPLOAD_FILES) throw new HttpError(400, `Upload at most ${MAX_UPLOAD_FILES} files at a time.`);

    const results = [];

    for (const file of files) {
      assertSafeSpreadsheetFile(file);
      const buf = Buffer.from(await file.arrayBuffer());
      let rowCount = 0;
      let employeeCount = 0;
      let preview: any[] = [];

      if (fileType === "attendance") {
        const records = await parseAttendanceFile(buf, batchId);
        rowCount = records.length;
        employeeCount = (records as any).employeeCount ?? new Set(records.map((r) => r.employee_id)).size;
        preview = records.slice(0, 10);

        // Smart mismatch warning: file dropped in the wrong box
        if (records.length === 0 && (await detectFileKind(buf)) === "salary") {
          throw new HttpError(400, "WRONG_BOX_SALARY: This looks like a Salary file. Please upload it in the \"Salary File\" box, not Attendance.");
        }

        if (records.length > 0) {
          const uniqueEmpIds = [...new Set(records.map((r) => r.employee_id))];

          // 1. Batch upsert employees — one transaction
          const empNameMap = new Map<string, string>();
          for (const r of records) {
            if (!empNameMap.has(r.employee_id)) empNameMap.set(r.employee_id, r.employee_name);
          }
          await prisma.$transaction(
            uniqueEmpIds.map((id) =>
              prisma.employee.upsert({
                where: { employeeId_companyId: { employeeId: id, companyId } },
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
            select: { id: true, employeeId: true, workDate: true, uploadBatch: true },
          });
          const existingMap = new Map<string, { id: number; uploadBatch: string | null }>();
          for (const row of existingRows) {
            if (!row.workDate) continue;
            const key = `${row.employeeId}:${row.workDate.toISOString().slice(0, 10)}`;
            existingMap.set(key, { id: row.id, uploadBatch: row.uploadBatch ?? null });
          }

          // 4. Split records into creates and updates, then run one transaction
          const creates: any[] = [];
          const updates: any[] = [];

          for (const record of records) {
            const key = `${record.employee_id}:${record.work_date}`;
            const existing = existingMap.get(key);
            // Protect online punches: if the file row is empty (no in/out) and an
            // online check-in already exists for this day, keep the online punch
            // instead of overwriting it with an absent row.
            const rowEmpty = !record.clock_in && !record.clock_out;
            if (existing && existing.uploadBatch === "online" && rowEmpty) {
              continue;
            }
            if (existing != null) {
              updates.push(
                prisma.attendanceRecord.update({
                  where: { id: existing.id },
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
        const emps = await parseSalaryFile(buf);
        rowCount = emps.length;
        employeeCount = emps.length;
        preview = emps.slice(0, 10);

        // Smart mismatch warning: file dropped in the wrong box
        if (emps.length === 0 && (await detectFileKind(buf)) === "attendance") {
          throw new HttpError(400, "WRONG_BOX_ATTENDANCE: This looks like an Attendance file. Please upload it in the \"Attendance Files\" box, not Salary.");
        }

        if (emps.length > 0) {
          // 1. Quota enforcement
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

          // 1b. Dedup by NAME: if an incoming employee number is new but a
          //     person with the same name already exists, reuse that existing
          //     record so the same person isn't duplicated across months.
          const normName = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
          const existingForDedup = await prisma.employee.findMany({
            where: { companyId, systemMode },
            select: { employeeId: true, name: true },
          });
          const existingIdSet2 = new Set(existingForDedup.map((e) => e.employeeId).filter(Boolean) as string[]);
          const nameToId = new Map<string, string>();
          for (const e of existingForDedup) {
            const k = normName(e.name);
            if (e.employeeId && k && !nameToId.has(k)) nameToId.set(k, e.employeeId);
          }
          for (const emp of emps) {
            if (!existingIdSet2.has(emp.employee_id)) {
              const match = nameToId.get(normName(emp.name));
              if (match) emp.employee_id = match; // reuse the existing person's id
            }
          }

          // 2. Batch upsert all employees — one transaction.
          //    New SANA format also carries email / department / contract dates.
          //    Collapse rows that now share an id (keep the last seen).
          const toDate = (d?: string | null) => (d ? new Date(d) : null);
          const empById = new Map<string, (typeof emps)[number]>();
          for (const emp of emps) empById.set(emp.employee_id, emp);
          const dedupedEmps = Array.from(empById.values());
          await prisma.$transaction(
            dedupedEmps.map((emp) =>
              prisma.employee.upsert({
                where: { employeeId_companyId: { employeeId: emp.employee_id, companyId } },
                create: {
                  employeeId: emp.employee_id,
                  name: emp.name,
                  baseSalary: emp.base_salary,
                  socialSecurity: emp.social_security,
                  email: emp.email ?? "",
                  phone: emp.phone ?? "",
                  department: emp.department ?? null,
                  joinDate: toDate(emp.join_date),
                  contractEndDate: toDate(emp.contract_end_date),
                  systemMode,
                  companyId,
                },
                update: {
                  name: emp.name,
                  baseSalary: emp.base_salary,
                  socialSecurity: emp.social_security,
                  ...(emp.email ? { email: emp.email } : {}),
                  ...(emp.phone ? { phone: emp.phone } : {}),
                  ...(emp.department ? { department: emp.department } : {}),
                  ...(emp.join_date ? { joinDate: toDate(emp.join_date) } : {}),
                  ...(emp.contract_end_date ? { contractEndDate: toDate(emp.contract_end_date) } : {}),
                },
              })
            )
          );

          // 2b. Snapshot THIS month's roster + salaries (the file is the
          //     definitive payroll source for the selected period). Replace any
          //     previous snapshot for the same period so re-uploads stay clean.
          await prisma.monthlySalary.deleteMany({ where: { companyId, periodMonth, periodYear, systemMode } });
          await prisma.monthlySalary.createMany({
            data: emps.map((emp) => ({
              companyId, periodMonth, periodYear, systemMode,
              employeeId: emp.employee_id,
              name: emp.name,
              baseSalary: emp.base_salary,
              socialSecurity: emp.social_security,
            })),
            skipDuplicates: true,
          });

          // 3. Auto-create login accounts for employees that have an email and
          //    don't already have a user. Temp password "123456" + forced change.
          const withEmail = emps.filter((e) => e.email && e.email.includes("@"));
          if (withEmail.length > 0) {
            const emails = withEmail.map((e) => e.email as string);
            const existingUsers = await prisma.user.findMany({
              where: { email: { in: emails } },
              select: { email: true },
            });
            const haveAccount = new Set(existingUsers.map((u) => u.email));
            const tempHash = await bcrypt.hash("123456", 10);
            const toCreate = withEmail.filter((e) => !haveAccount.has(e.email as string));
            if (toCreate.length > 0) {
              await prisma.user.createMany({
                data: toCreate.map((e) => ({
                  name: e.name,
                  email: e.email as string,
                  password: tempHash,
                  role: "employee",
                  companyId,
                  employeeNumber: e.employee_id,
                  mustChangePassword: true,
                })),
                skipDuplicates: true,
              });
            }
          }
        }
      }

      const stored = await storeFile({
        companyId,
        area: "uploads",
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes: buf,
      });

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
          // Keep the original bytes in Blob when configured; fall back to DB
          // base64 only in local/test or when external storage is unavailable.
          fileData: stored.base64,
          fileUrl: stored.url,
          fileStorageKey: stored.key,
          mimeType: file.type || "application/octet-stream",
          // The month/year this file belongs to (chosen at upload).
          periodMonth,
          periodYear,
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

    await logAudit(session, "upload", "upload", batchId, withAuditMeta(req, {
      type: fileType,
      filesCount: files.length,
      totalRows: results.reduce((s, r) => s + (r.row_count || 0), 0),
      totalEmployees: results.reduce((s, r) => s + (r.employee_count || 0), 0),
    }));
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
