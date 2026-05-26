import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/evaluations?employee_id=...&month=...&year=...
// Returns the existing evaluation (if any) for the authenticated evaluator + employee + period.
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employee_id");
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year = parseInt(url.searchParams.get("year") || "0", 10);

    if (!employeeId || !month || !year) {
      throw new HttpError(400, "Missing employee_id, month, or year");
    }

    const result = await prisma.$queryRaw<any[]>`
      SELECT * FROM evaluations
      WHERE company_id  = ${session.companyId}
        AND evaluator_id = ${session.id}
        AND employee_id  = ${employeeId}
        AND period_month = ${month}
        AND period_year  = ${year}
      LIMIT 1
    `;

    return NextResponse.json(result[0] ?? null);
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/evaluations
// Upserts an evaluation for the authenticated evaluator.
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const {
      employee_id,
      period_month,
      period_year,
      score_accuracy,
      score_innovation,
      score_speed,
      score_development,
      score_quality_check,
      score_prioritization,
      score_independence,
      score_deadlines,
      score_teamwork,
      score_communication,
      score_knowledge_sharing,
      score_feedback,
      score_compliance,
      bonus_worthy,
      recommendations,
    } = body;

    if (!employee_id || !period_month || !period_year) {
      throw new HttpError(400, "Missing required fields");
    }

    const clamp = (v: any) => {
      const n = parseInt(v, 10);
      return n >= 1 && n <= 5 ? n : 3;
    };

    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO evaluations (
        company_id, evaluator_id, employee_id, period_month, period_year,
        score_accuracy, score_innovation, score_speed, score_development,
        score_quality_check, score_prioritization, score_independence,
        score_deadlines, score_teamwork, score_communication,
        score_knowledge_sharing, score_feedback, score_compliance,
        bonus_worthy, recommendations, updated_at
      ) VALUES (
        ${session.companyId}, ${session.id}, ${employee_id},
        ${period_month}, ${period_year},
        ${clamp(score_accuracy)}, ${clamp(score_innovation)}, ${clamp(score_speed)},
        ${clamp(score_development)}, ${clamp(score_quality_check)}, ${clamp(score_prioritization)},
        ${clamp(score_independence)}, ${clamp(score_deadlines)}, ${clamp(score_teamwork)},
        ${clamp(score_communication)}, ${clamp(score_knowledge_sharing)}, ${clamp(score_feedback)},
        ${clamp(score_compliance)},
        ${bonus_worthy ?? false}, ${recommendations ?? null}, NOW()
      )
      ON CONFLICT (company_id, evaluator_id, employee_id, period_month, period_year) DO UPDATE SET
        score_accuracy         = EXCLUDED.score_accuracy,
        score_innovation       = EXCLUDED.score_innovation,
        score_speed            = EXCLUDED.score_speed,
        score_development      = EXCLUDED.score_development,
        score_quality_check    = EXCLUDED.score_quality_check,
        score_prioritization   = EXCLUDED.score_prioritization,
        score_independence     = EXCLUDED.score_independence,
        score_deadlines        = EXCLUDED.score_deadlines,
        score_teamwork         = EXCLUDED.score_teamwork,
        score_communication    = EXCLUDED.score_communication,
        score_knowledge_sharing = EXCLUDED.score_knowledge_sharing,
        score_feedback         = EXCLUDED.score_feedback,
        score_compliance       = EXCLUDED.score_compliance,
        bonus_worthy           = EXCLUDED.bonus_worthy,
        recommendations        = EXCLUDED.recommendations,
        updated_at             = NOW()
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (err) {
    return errorResponse(err);
  }
}
