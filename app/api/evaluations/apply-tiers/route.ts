import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const SCORE_KEYS = [
  "scoreAccuracy", "scoreInnovation", "scoreSpeed", "scoreDevelopment",
  "scoreQualityCheck", "scorePrioritization", "scoreIndependence", "scoreDeadlines",
  "scoreTeamwork", "scoreCommunication", "scoreKnowledgeSharing", "scoreFeedback",
  "scoreCompliance",
] as const;
const MAX_TOTAL = SCORE_KEYS.length * 5; // 13 criteria × 5 stars

/**
 * POST /api/evaluations/apply-tiers  { month, year }
 * Recompute the bonus from the current tiers for every evaluation in the period
 * — except the ones HR flagged as a manual exception (bonus_override).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { month, year } = await req.json();
    if (!month || !year) throw new HttpError(400, "month and year are required");

    const tiers = await prisma.bonusTier.findMany({ where: { companyId: session.companyId } });
    const bonusForGrade = (grade: number) => {
      const t = tiers.find((x) => grade >= x.minGrade && grade <= x.maxGrade);
      return t ? t.amount : 0;
    };

    const evals = await prisma.evaluation.findMany({
      where: { companyId: session.companyId, periodMonth: Number(month), periodYear: Number(year), bonusOverride: false },
    });

    let updated = 0;
    for (const ev of evals) {
      const sum = SCORE_KEYS.reduce((a, k) => a + ((ev as any)[k] || 0), 0);
      const grade = (sum / MAX_TOTAL) * 100;
      const amount = bonusForGrade(grade);
      if (amount !== ev.bonusAmount || (amount > 0) !== ev.bonusWorthy) {
        await prisma.evaluation.update({ where: { id: ev.id }, data: { bonusAmount: amount, bonusWorthy: amount > 0 } });
        updated++;
      }
    }
    return NextResponse.json({ success: true, updated, total: evals.length });
  } catch (err) {
    return errorResponse(err);
  }
}
