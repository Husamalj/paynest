import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const fmtTime = (d: Date | null) => {
  if (!d) return null;
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const s = `${h}:${m}`;
  return s === "00:00" ? null : s; // treat 00:00 as not-a-real punch
};

/**
 * GET /api/attendance/missing?month=&year=
 * Returns attendance records in the period where exactly ONE side was punched
 * (clock-in without clock-out, or vice versa) — i.e. someone forgot to punch.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year = parseInt(url.searchParams.get("year") || "0", 10);
    if (!month || !year) throw new HttpError(400, "Missing month or year");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const records = await prisma.attendanceRecord.findMany({
      where: { companyId: session.companyId, systemMode: mode, workDate: { gte: start, lte: end } },
      orderBy: { workDate: "asc" },
    });

    // employee names
    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId, systemMode: mode },
      select: { employeeId: true, name: true },
    });
    const nameMap = new Map(employees.map((e) => [e.employeeId, e.name]));

    const out = records
      .map((r) => ({ r, cin: fmtTime(r.clockIn ?? null), cout: fmtTime(r.clockOut ?? null) }))
      .filter(({ cin, cout }) => (cin && !cout) || (!cin && cout)) // exactly one side present
      .map(({ r, cin, cout }) => ({
        id: r.id,
        employee_id: r.employeeId,
        employee_name: (r.employeeId && nameMap.get(r.employeeId)) || r.employeeId,
        work_date: r.workDate?.toISOString().substring(0, 10),
        clock_in: cin,
        clock_out: cout,
        missing: cin ? "out" : "in",
      }));

    return NextResponse.json(out);
  } catch (err) {
    return errorResponse(err);
  }
}
