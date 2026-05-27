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
    const { name, holiday_date } = await req.json();
    if (!name || !holiday_date) throw new HttpError(400, "Name and date required");

    // Look up existing holiday for THIS company — don't collide with another company's same-date holiday
    const date = new Date(holiday_date);
    const existing = await prisma.officialHoliday.findFirst({
      where: { companyId: session.companyId, holidayDate: date },
    });

    if (existing) {
      const updated = await prisma.officialHoliday.update({
        where: { id: existing.id },
        data: { name },
      });
      return NextResponse.json(updated);
    }
    const created = await prisma.officialHoliday.create({
      data: { companyId: session.companyId, name, holidayDate: date },
    });
    return NextResponse.json(created);
  } catch (err) {
    return errorResponse(err);
  }
}
