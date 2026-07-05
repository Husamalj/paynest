import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/audit-log?entity=...&action=...&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=N
 * Returns audit log entries for the current company.
 * Only owner / hr / super_admin can read the audit log.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "auditLog");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const entity = url.searchParams.get("entity") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const from   = url.searchParams.get("from") || undefined;
    const to     = url.searchParams.get("to") || undefined;
    const limit  = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

    const where: any = { companyId: session.companyId };
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(logs);
  } catch (err) {
    return errorResponse(err);
  }
}
