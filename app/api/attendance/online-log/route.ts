import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const fmtTime = (d: Date | null): string | null => {
  if (!d) return null;
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const s = `${h}:${m}`;
  return s === "00:00" ? null : s; // 00:00 means "no real punch"
};

// Hours between two time-only punches; if check-out is "earlier" than check-in
// the shift crossed midnight, so add 24h.
const calcHours = (cin: Date | null, cout: Date | null): number => {
  if (!cin || !cout) return 0;
  const a = cin.getUTCHours() * 60 + cin.getUTCMinutes();
  let b = cout.getUTCHours() * 60 + cout.getUTCMinutes();
  if (b < a) b += 24 * 60; // overnight
  return Math.round(((b - a) / 60) * 100) / 100;
};

/**
 * GET /api/attendance/online-log
 * Self check-in/out records (uploadBatch="online") for the company, so HR can
 * see the actual entry/exit times behind each approved online-work request.
 * Returns one row per employee/day with clock-in, clock-out and hours.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const records = await prisma.attendanceRecord.findMany({
      where: { companyId: session.companyId, uploadBatch: "online" },
      orderBy: { workDate: "desc" },
    });

    return NextResponse.json(
      records.map((r) => ({
        employee_id: r.employeeId,
        work_date: r.workDate ? r.workDate.toISOString().slice(0, 10) : null,
        clock_in: fmtTime(r.clockIn ?? null),
        clock_out: fmtTime(r.clockOut ?? null),
        hours_worked: calcHours(r.clockIn ?? null, r.clockOut ?? null),
      })),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
