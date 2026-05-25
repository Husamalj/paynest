import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    const holidays = await prisma.officialHoliday.findMany({ orderBy: { holidayDate: "asc" } });
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

    const holiday = await prisma.officialHoliday.upsert({
      where: { holidayDate: new Date(holiday_date) },
      create: { companyId: session.companyId, name, holidayDate: new Date(holiday_date) },
      update: { name },
    });
    return NextResponse.json(holiday);
  } catch (err) {
    return errorResponse(err);
  }
}
