import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

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

    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employee_id");
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year = parseInt(url.searchParams.get("year") || "0", 10);

    if (!month || !year) throw new HttpError(400, "Missing month or year");

    // ── Single eval (pre-fill modal) ─────────────────────────────────────
    if (employeeId) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM evaluations
        WHERE company_id   = ${session.companyId}
          AND evaluator_id = ${session.id}
          AND employee_id  = ${employeeId}
          AND period_month = ${month}
          AND period_year  = ${year}
        LIMIT 1
      `;
      return NextResponse.json(rows[0] ?? null);
    }

    // ── List mode (results page) ─────────────────────────────────────────
    // owner + hr  → see ALL evaluations for the company
    // employee    → see only evaluations they personally submitted
    let rows: any[];
    if (session.role === "owner" || session.role === "hr") {
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
    // Serialize rows — convert any BigInt values from raw SQL to numbers
    const safe = rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])
      )
    );
    return NextResponse.json(safe);
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

    const body = await req.json();
    const {
      employee_id, period_month, period_year,
      score_accuracy, score_innovation, score_speed, score_development,
      score_quality_check, score_prioritization, score_independence,
      score_deadlines, score_teamwork, score_communication,
      score_knowledge_sharing, score_feedback, score_compliance,
      bonus_amount, recommendations,
    } = body;

    if (!employee_id || !period_month || !period_year) {
      throw new HttpError(400, "Missing required fields");
    }

    // Tree enforcement: a regular employee may only evaluate people they
    // supervise (per the Supervisor Assignment chart). Owner/HR may evaluate anyone.
    if (session.role === "employee") {
      const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
      const mode = settings?.systemMode ?? "daily";
      const me = session.employeeNumber
        ? await prisma.employee.findFirst({
            where: { companyId: session.companyId, systemMode: mode, employeeId: session.employeeNumber },
            select: { id: true },
          })
        : null;
      const target = await prisma.employee.findFirst({
        where: { companyId: session.companyId, systemMode: mode, employeeId: employee_id },
        select: { supervisorId: true, supervisorIds: true },
      });
      const supIds = target ? [...(target.supervisorIds || []), target.supervisorId].filter((x) => x != null) : [];
      if (!me || !supIds.includes(me.id)) {
        throw new HttpError(403, "You can only evaluate employees you supervise");
      }
    }

    const clamp = (v: any) => { const n = parseInt(v, 10); return n >= 1 && n <= 5 ? n : 3; };
    const bonusAmt = Math.max(0, parseInt(bonus_amount, 10) || 0);
    const bonusWorthy = bonusAmt > 0;

    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO evaluations (
        company_id, evaluator_id, employee_id, period_month, period_year,
        score_accuracy, score_innovation, score_speed, score_development,
        score_quality_check, score_prioritization, score_independence,
        score_deadlines, score_teamwork, score_communication,
        score_knowledge_sharing, score_feedback, score_compliance,
        bonus_worthy, bonus_amount, recommendations, updated_at
      ) VALUES (
        ${session.companyId}, ${session.id}, ${employee_id},
        ${period_month}, ${period_year},
        ${clamp(score_accuracy)}, ${clamp(score_innovation)}, ${clamp(score_speed)},
        ${clamp(score_development)}, ${clamp(score_quality_check)}, ${clamp(score_prioritization)},
        ${clamp(score_independence)}, ${clamp(score_deadlines)}, ${clamp(score_teamwork)},
        ${clamp(score_communication)}, ${clamp(score_knowledge_sharing)}, ${clamp(score_feedback)},
        ${clamp(score_compliance)},
        ${bonusWorthy}, ${bonusAmt}, ${recommendations ?? null}, NOW()
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
        bonus_worthy            = CASE WHEN evaluations.bonus_override THEN evaluations.bonus_worthy ELSE EXCLUDED.bonus_worthy END,
        bonus_amount            = CASE WHEN evaluations.bonus_override THEN evaluations.bonus_amount ELSE EXCLUDED.bonus_amount END,
        recommendations         = EXCLUDED.recommendations,
        updated_at              = NOW()
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * DELETE /api/evaluations?id=...
 * Removes an evaluation. Owner/HR can delete any in the company;
 * employees can delete only their own.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const id = parseInt(new URL(req.url).searchParams.get("id") || "0", 10);
    if (!id) throw new HttpError(400, "Missing evaluation id");

    let rows: any[];
    if (session.role === "owner" || session.role === "hr") {
      rows = await prisma.$queryRaw<any[]>`
        DELETE FROM evaluations
        WHERE id = ${id} AND company_id = ${session.companyId}
        RETURNING id
      `;
    } else {
      rows = await prisma.$queryRaw<any[]>`
        DELETE FROM evaluations
        WHERE id = ${id} AND company_id = ${session.companyId}
          AND evaluator_id = ${session.id}
        RETURNING id
      `;
    }
    if (rows.length === 0) throw new HttpError(404, "Evaluation not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
