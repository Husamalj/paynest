import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const companyId = session.companyId;
    const mode = await getSystemMode(companyId);

    const where: any = {
      companyId,
      systemMode: mode,
    };
    if (month && year) {
      where.periodMonth = parseInt(month, 10);
      where.periodYear = parseInt(year, 10);
    }

    const bonuses = await prisma.bonusDeduction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bonuses);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const companyId = session.companyId;
    const mode = await getSystemMode(companyId);
    const now = new Date();

    const record = await prisma.bonusDeduction.create({
      data: {
        companyId,
        employeeId: body.employee_id ?? null,
        employeeName: body.employee_name ?? null,
        type: body.type ?? null,
        reason: body.reason ?? null,
        amount: body.amount ?? null,
        periodMonth: body.period_month ?? (now.getMonth() + 1),
        periodYear: body.period_year ?? now.getFullYear(),
        systemMode: mode,
      },
    });
    return NextResponse.json(record);
  } catch (err) {
    return errorResponse(err);
  }
}
