import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/** Creates the evaluations table if it doesn't exist yet (idempotent). */
async function ensureTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS evaluations (
      id                      SERIAL PRIMARY KEY,
      company_id              INTEGER NOT NULL DEFAULT 1,
      evaluator_id            INTEGER NOT NULL,
      employee_id             VARCHAR(50) NOT NULL,
      period_month            INTEGER NOT NULL,
      period_year             INTEGER NOT NULL,
      score_accuracy          SMALLINT CHECK (score_accuracy BETWEEN 1 AND 5),
      score_innovation        SMALLINT CHECK (score_innovation BETWEEN 1 AND 5),
      score_speed             SMALLINT CHECK (score_speed BETWEEN 1 AND 5),
      score_development       SMALLINT CHECK (score_development BETWEEN 1 AND 5),
      score_quality_check     SMALLINT CHECK (score_quality_check BETWEEN 1 AND 5),
      score_prioritization    SMALLINT CHECK (score_prioritization BETWEEN 1 AND 5),
      score_independence      SMALLINT CHECK (score_independence BETWEEN 1 AND 5),
      score_deadlines         SMALLINT CHECK (score_deadlines BETWEEN 1 AND 5),
      score_teamwork          SMALLINT CHECK (score_teamwork BETWEEN 1 AND 5),
      score_communication     SMALLINT CHECK (score_communication BETWEEN 1 AND 5),
      score_knowledge_sharing SMALLINT CHECK (score_knowledge_sharing BETWEEN 1 AND 5),
      score_feedback          SMALLINT CHECK (score_feedback BETWEEN 1 AND 5),
      score_compliance        SMALLINT CHECK (score_compliance BETWEEN 1 AND 5),
      bonus_worthy            BOOLEAN DEFAULT FALSE,
      recommendations         TEXT,
      created_at              TIMESTAMP DEFAULT NOW(),
      updated_at              TIMESTAMP DEFAULT NOW(),
      UNIQUE (company_id, evaluator_id, employee_id, period_month, period_year)
    )
  `;
}

/**
 * GET /api/evaluations?employee_id=...&month=...&year=...
 *   → returns the single evaluation for the logged-in evaluator + employee + period
 *
 * GET /api/evaluations?month=...&year=...
 *   → returns ALL evaluations for the period in this company
 *     (owner sees all evaluators; hr/employee sees only their own)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    await ensureTable();

    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employee_id");
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year = parseInt(url.searchParams.get("year") || "0", 10);

    if (!month || !year) throw new HttpError(400, "Missing month or year");

    // ── Single eval (pre-fill modal) ──────────────────────────────────────
    if (employeeId) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM evaluations
        WHERE company_id  = ${session.companyId}
          AND evaluator_id = ${session.id}
          AND employee_id  = ${employeeId}
          AND period_month = ${month}
          AND period_year  = ${year}
        LIMIT 1
      `;
      return NextResponse.json(rows[0] ?? null);
    }

    // ── List mode (HR results page) ───────────────────────────────────────
    let rows: any[];
    if (session.role === "owner") {
      rows = await prisma.$queryRaw<any[]>`
        SELECT ev.*,
               emp.name  AS employee_name,
               u.name    AS evaluator_name
        FROM   evaluations ev
        LEFT JOIN employees emp
               ON emp.employee_id = ev.employee_id
              AND emp.company_id  = ev.company_id
        LEFT JOIN users u ON u.id = ev.evaluator_id
        WHERE  ev.company_id  = ${session.companyId}
          AND  ev.period_month = ${month}
          AND  ev.period_year  = ${year}
        ORDER BY emp.name
      `;
    } else {
      rows = await prisma.$queryRaw<any[]>`
        SELECT ev.*,
               emp.name AS employee_name,
               u.name   AS evaluator_name
        FROM   evaluations ev
        LEFT JOIN employees emp
               ON emp.employee_id = ev.employee_id
              AND emp.company_id  = ev.company_id
        LEFT JOIN users u ON u.id = ev.evaluator_id
        WHERE  ev.company_id   = ${session.companyId}
          AND  ev.evaluator_id = ${session.id}
          AND  ev.period_month = ${month}
          AND  ev.period_year  = ${year}
        ORDER BY emp.name
      `;
    }
    return NextResponse.json(rows);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/evaluations
 * Upserts an evaluation (create or update) for the authenticated evaluator.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    await ensureTable();

    const body = await req.json();
    const {
      employee_id, period_month, period_year,
      score_accuracy, score_innovation, score_speed, score_development,
      score_quality_check, score_prioritization, score_independence,
      score_deadlines, score_teamwork, score_communication,
      score_knowledge_sharing, score_feedback, score_compliance,
      bonus_worthy, recommendations,
    } = body;

    if (!employee_id || !period_month || !period_year) {
      throw new HttpError(400, "Missing required fields");
    }

    const clamp = (v: any) => { const n = parseInt(v, 10); return n >= 1 && n <= 5 ? n : 3; };

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
        score_accuracy          = EXCLUDED.score_accuracy,
        score_innovation        = EXCLUDED.score_innovation,
        score_speed             = EXCLUDED.score_speed,
        score_development       = EXCLUDED.score_development,
        score_quality_check     = EXCLUDED.score_quality_check,
        score_prioritization    = EXCLUDED.score_prioritization,
        score_independence      = EXCLUDED.score_independence,
        score_deadlines         = EXCLUDED.score_deadlines,
        score_teamwork          = EXCLUDED.score_teamwork,
        score_communication     = EXCLUDED.score_communication,
        score_knowledge_sharing = EXCLUDED.score_knowledge_sharing,
        score_feedback          = EXCLUDED.score_feedback,
        score_compliance        = EXCLUDED.score_compliance,
        bonus_worthy            = EXCLUDED.bonus_worthy,
        recommendations         = EXCLUDED.recommendations,
        updated_at              = NOW()
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (err) {
    return errorResponse(err);
  }
}
