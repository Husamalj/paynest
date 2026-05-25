import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    let settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    if (!settings) {
      settings = await prisma.companySettings.create({ data: { companyId: session.companyId } });
    }
    return NextResponse.json(toSnake(settings));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const existing = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });

    const data = {
      companyName: body.company_name ?? body.companyName,
      systemMode: body.system_mode ?? body.systemMode,
      language: body.language,
      reqHours: body.req_hours != null ? Number(body.req_hours) : body.reqHours != null ? Number(body.reqHours) : undefined,
      monthDays: body.month_days != null ? Number(body.month_days) : body.monthDays != null ? Number(body.monthDays) : undefined,
      lateTolerance: body.late_tolerance != null ? Number(body.late_tolerance) : body.lateTolerance != null ? Number(body.lateTolerance) : undefined,
      workdays: body.workdays,
      deductionRate: body.deduction_rate != null ? Number(body.deduction_rate) : body.deductionRate != null ? Number(body.deductionRate) : undefined,
      extraRate: body.extra_rate != null ? Number(body.extra_rate) : body.extraRate != null ? Number(body.extraRate) : undefined,
    };
    // Remove undefined keys
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: clean })
      : await prisma.companySettings.create({ data: { ...clean, companyId: session.companyId } });

    return NextResponse.json(toSnake(settings));
  } catch (err) {
    return errorResponse(err);
  }
}

export { PUT as PATCH };

function toSnake(s: any) {
  return {
    id: s.id,
    company_id: s.companyId,
    company_name: s.companyName,
    system_mode: s.systemMode,
    language: s.language,
    req_hours: s.reqHours,
    month_days: s.monthDays,
    late_tolerance: s.lateTolerance,
    workdays: s.workdays,
    deduction_rate: s.deductionRate,
    extra_rate: s.extraRate,
    created_at: s.createdAt,
    // also camel for newer code
    companyId: s.companyId,
    companyName: s.companyName,
    systemMode: s.systemMode,
    reqHours: s.reqHours,
    monthDays: s.monthDays,
    lateTolerance: s.lateTolerance,
    deductionRate: s.deductionRate,
    extraRate: s.extraRate,
  };
}
