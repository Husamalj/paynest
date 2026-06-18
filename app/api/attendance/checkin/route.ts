import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const toTimeISO = (hhmm: string): Date | null => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(1970, 0, 1, parseInt(m[1], 10), parseInt(m[2], 10), 0));
};

function localNow(tz: string) {
  const now = new Date();
  let date: string, time: string;
  try {
    date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  } catch {
    date = now.toISOString().slice(0, 10);
    time = now.toISOString().slice(11, 16);
  }
  return { date, time };
}

/** GET /api/attendance/checkin — today's online punch status for the employee. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const employeeId = session.employeeNumber ?? "";
    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const { date } = localNow(settings?.timezone || "Asia/Amman");
    const workDate = new Date(`${date}T00:00:00.000Z`);
    const rec = await prisma.attendanceRecord.findFirst({ where: { companyId: session.companyId, employeeId, workDate } });
    return NextResponse.json({
      date,
      clock_in: rec?.clockIn ? rec.clockIn.toISOString().slice(11, 16) : null,
      clock_out: rec?.clockOut ? rec.clockOut.toISOString().slice(11, 16) : null,
      hours_worked: rec ? Number(rec.hoursWorked) : 0,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/attendance/checkin { action: "in" | "out" } — employee self check-in/out for online work. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const employeeId = session.employeeNumber ?? "";
    if (!employeeId) throw new HttpError(400, "No employee record");

    const { action } = await req.json();
    if (action !== "in" && action !== "out") throw new HttpError(400, "action must be 'in' or 'out'");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const { date, time } = localNow(settings?.timezone || "Asia/Amman");
    const workDate = new Date(`${date}T00:00:00.000Z`);

    const existing = await prisma.attendanceRecord.findFirst({ where: { companyId: session.companyId, employeeId, workDate } });

    if (action === "in" && existing?.clockIn) throw new HttpError(400, "Already checked in today");
    if (action === "out" && !(existing?.clockIn)) throw new HttpError(400, "Check in first");
    if (action === "out" && existing?.clockOut) throw new HttpError(400, "Already checked out today");

    const newIn = action === "in" ? toTimeISO(time) : (existing?.clockIn ?? null);
    const newOut = action === "out" ? toTimeISO(time) : (existing?.clockOut ?? null);
    let hours = existing ? Number(existing.hoursWorked) : 0;
    if (newIn && newOut) {
      let diff = (newOut.getTime() - newIn.getTime()) / 3_600_000;
      if (diff < 0) diff += 24; // shift crossed midnight
      hours = Math.round(diff * 100) / 100;
    }

    let record;
    if (existing) {
      record = await prisma.attendanceRecord.update({ where: { id: existing.id }, data: { clockIn: newIn, clockOut: newOut, hoursWorked: hours, uploadBatch: "online" } });
    } else {
      record = await prisma.attendanceRecord.create({
        data: { companyId: session.companyId, employeeId, workDate, clockIn: newIn, clockOut: newOut, hoursWorked: hours, systemMode: "daily", uploadBatch: "online" },
      });
    }
    return NextResponse.json({ success: true, action, time, date, hours_worked: hours, record_id: record.id });
  } catch (err) {
    return errorResponse(err);
  }
}
