import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getCompanySystemMode } from "@/lib/companyContext";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  return getCompanySystemMode(companyId);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "bonuses");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const pagination = parsePagination(url, { limit: 100 });
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

    const [bonuses, total] = await Promise.all([
      prisma.bonusDeduction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationQuery(pagination),
      }),
      pagination.enabled ? prisma.bonusDeduction.count({ where }) : Promise.resolve(undefined),
    ]);
    return withPaginationHeaders(bonuses, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "bonuses");
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
    await logAudit(session, "create", "bonus", record.id, {
      employeeId: record.employeeId, type: record.type, amount: record.amount, reason: record.reason,
    });
    return NextResponse.json(record);
  } catch (err) {
    return errorResponse(err);
  }
}
