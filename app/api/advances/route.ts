import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

/** GET /api/advances — employee sees own; owner/hr/super_admin see all company requests. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "advances");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const status = url.searchParams.get("status");
    const where: any = { companyId: session.companyId };
    if (session.role === "employee") where.employeeId = session.employeeNumber;
    if (status) where.status = status;

    const [advances, total] = await Promise.all([
      prisma.advanceRequest.findMany({ where, orderBy: { createdAt: "desc" }, ...paginationQuery(pagination) }),
      pagination.enabled ? prisma.advanceRequest.count({ where }) : Promise.resolve(undefined),
    ]);
    return withPaginationHeaders(advances, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/advances — employee requests an advance (or HR creates one for an employee). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "advances");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    let employeeId = body.employee_id;
    let employeeName = body.employee_name;
    if (session.role === "employee") {
      employeeId = session.employeeNumber;
      employeeName = session.name;
    }

    const amount = parseFloat(body.amount);
    if (!employeeId || !amount || amount <= 0) throw new HttpError(400, "Employee and a valid amount are required");
    const installments = Math.min(12, Math.max(1, parseInt(body.installments, 10) || 1));

    const advance = await prisma.advanceRequest.create({
      data: {
        companyId: session.companyId,
        employeeId,
        employeeName: employeeName ?? employeeId,
        amount,
        installments,
        reason: body.reason ?? null,
        status: "pending",
      },
    });

    // Notify HR/owner
    prisma.notification.create({
      data: {
        companyId: session.companyId,
        type: "advance_submitted",
        message: `${employeeName || "An employee"} requested a salary advance of ${amount.toFixed(2)}.`,
        link: "/advances",
      },
    }).catch(() => {});

    return NextResponse.json(advance);
  } catch (err) {
    return errorResponse(err);
  }
}
