import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    // Scope by company so each tenant sees only their own holidays
    const holidays = await prisma.officialHoliday.findMany({
      where: { companyId: session.companyId },
      orderBy: { holidayDate: "asc" },
    });
    return NextResponse.json(holidays);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const body = await req.json();
    const { name } = body;
    // Accept either a single date (holiday_date) or a range (start_date..end_date)
    const startStr = body.start_date || body.holiday_date;
    const endStr = body.end_date || body.holiday_date;
    if (!name || !startStr) throw new HttpError(400, "Name and date required");

    const start = new Date(startStr);
    const end = new Date(endStr || startStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new HttpError(400, "Invalid date");
    if (end < start) throw new HttpError(400, "End date is before start date");

    // Build the list of dates in the range (cap at 60 days for safety)
    const dates: Date[] = [];
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    let guard = 0;
    while (cur <= last && guard < 60) {
      dates.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
      guard++;
    }

    const results: any[] = [];
    for (const date of dates) {
      try {
        const existing = await prisma.officialHoliday.findFirst({
          where: { companyId: session.companyId, holidayDate: date },
        });
        if (existing) {
          results.push(await prisma.officialHoliday.update({ where: { id: existing.id }, data: { name } }));
        } else {
          results.push(await prisma.officialHoliday.create({
            data: { companyId: session.companyId, name, holidayDate: date },
          }));
        }
      } catch { /* skip a date that collides globally */ }
    }
    return NextResponse.json(results);
  } catch (err) {
    return errorResponse(err);
  }
}
