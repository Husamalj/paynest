import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const toTimeISO = (t: string | null | undefined): Date | null => {
  if (!t) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(1970, 0, 1, parseInt(m[1], 10), parseInt(m[2], 10), 0));
};

async function getMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

/**
 * POST /api/attendance/manual
 * HR/Owner records (or completes) an attendance punch for an employee on a date.
 * Only the provided side(s) are written; the existing side is preserved.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const employeeId: string = body.employee_id;
    const dateStr: string = body.work_date;
    if (!employeeId || !dateStr) throw new HttpError(400, "Employee and date are required");

    const mode = await getMode(session.companyId);
    const workDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(workDate.getTime())) throw new HttpError(400, "Invalid date");

    const existing = await prisma.attendanceRecord.findFirst({
      where: { companyId: session.companyId, systemMode: mode, employeeId, workDate },
    });

    // Merge: only overwrite a side if a new value is provided
    const newIn = body.clock_in ? toTimeISO(body.clock_in) : (existing?.clockIn ?? null);
    const newOut = body.clock_out ? toTimeISO(body.clock_out) : (existing?.clockOut ?? null);

    let hours = existing ? Number(existing.hoursWorked) : 0;
    if (newIn && newOut) {
      const diff = (newOut.getTime() - newIn.getTime()) / 3_600_000;
      hours = diff > 0 ? Math.round(diff * 100) / 100 : 0;
    }

    let record;
    if (existing) {
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { clockIn: newIn, clockOut: newOut, hoursWorked: hours },
      });
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          companyId: session.companyId,
          employeeId,
          workDate,
          clockIn: newIn,
          clockOut: newOut,
          hoursWorked: hours,
          systemMode: mode,
          uploadBatch: "manual",
        },
      });
    }

    await logAudit(session, "update", "attendance", record.id, { employeeId, date: dateStr, clock_in: body.clock_in ?? null, clock_out: body.clock_out ?? null });
    return NextResponse.json({ success: true, record });
  } catch (err) {
    return errorResponse(err);
  }
}
