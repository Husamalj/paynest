import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/evaluations/[id]  { bonus_amount } | { clear_override: true }
 * HR/owner sets a manual bonus (an exception) for one employee's evaluation,
 * or clears the exception so the tier-based amount applies again.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "evaluations");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();

    const ev = await prisma.evaluation.findFirst({ where: { id: Number(id), companyId: session.companyId } });
    if (!ev) throw new HttpError(404, "Not found");

    if (body.clear_override) {
      const updated = await prisma.evaluation.update({
        where: { id: ev.id },
        data: { bonusOverride: false },
      });
      return NextResponse.json(updated);
    }

    const amount = Math.max(0, parseInt(body.bonus_amount, 10) || 0);
    const updated = await prisma.evaluation.update({
      where: { id: ev.id },
      data: { bonusAmount: amount, bonusWorthy: amount > 0, bonusOverride: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
