import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/bonus-tiers
 *   → list the company's grade→bonus tiers (any evaluator role)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const tiers = await prisma.bonusTier.findMany({
      where: { companyId: session.companyId },
      orderBy: { minGrade: "asc" },
    });
    return NextResponse.json(tiers);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/bonus-tiers   { tiers: [{ minGrade, maxGrade, amount }] }
 *   → replace the company's full tier set (owner/hr only)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const raw: any[] = Array.isArray(body?.tiers) ? body.tiers : [];

    const clamp = (v: any) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    };
    const tiers = raw
      .map((t) => ({
        companyId: session.companyId as number,
        minGrade: clamp(t.minGrade),
        maxGrade: clamp(t.maxGrade),
        amount: Math.max(0, Math.round(Number(t.amount)) || 0),
      }))
      .filter((t) => t.maxGrade >= t.minGrade);

    await prisma.$transaction([
      prisma.bonusTier.deleteMany({ where: { companyId: session.companyId } }),
      ...(tiers.length ? [prisma.bonusTier.createMany({ data: tiers })] : []),
    ]);

    const saved = await prisma.bonusTier.findMany({
      where: { companyId: session.companyId },
      orderBy: { minGrade: "asc" },
    });
    return NextResponse.json(saved);
  } catch (err) {
    return errorResponse(err);
  }
}
