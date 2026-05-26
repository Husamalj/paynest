import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Exclude only owner and super_admin from the org tree.
 * HR CAN appear in the tree as subordinates and be evaluated.
 * Owner is never evaluated — they're the top of the hierarchy.
 */
async function getOwnerIds(companyId: number): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: ["owner", "super_admin"] } },
    select: { employeeNumber: true },
  });
  return users.map((u) => u.employeeNumber).filter(Boolean) as string[];
}

/**
 * GET /api/supervisors
 * Returns employees (role="employee" only) for the current company + system mode.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const settings = await prisma.companySettings.findFirst({
      where: { companyId: session.companyId },
    });
    const mode = settings?.systemMode ?? "daily";

    const ownerNums = await getOwnerIds(session.companyId);

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
        ...(ownerNums.length > 0 ? { NOT: { employeeId: { in: ownerNums } } } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        supervisorId: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ employees, systemMode: mode });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/supervisors
 * Bulk update supervisor relationships.
 * Body: { assignments: [{ id: number, supervisorId: number | null }, ...] }
 *
 * Validates:
 *  1. All employees belong to the caller's company + same systemMode + role="employee"
 *  2. supervisorId !== id (no self-supervision)
 *  3. No cycles in the resulting graph
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const assignments: Array<{ id: number; supervisorId: number | null }> =
      Array.isArray(body?.assignments) ? body.assignments : [];

    if (assignments.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const settings = await prisma.companySettings.findFirst({
      where: { companyId: session.companyId },
    });
    const mode = settings?.systemMode ?? "daily";

    // Validate by company + systemMode scope only — the role filter is a display
    // concern (GET), not a security concern. Any employee in the company can be
    // part of a supervisor chain regardless of whether their User record exists.
    const all = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
      },
      select: { id: true, supervisorId: true },
    });
    const byId = new Map(all.map((e) => [e.id, { ...e }]));

    // Apply pending assignments into the in-memory map for validation
    for (const a of assignments) {
      if (typeof a.id !== "number") throw new HttpError(400, "Invalid assignment id");
      if (!byId.has(a.id)) {
        throw new HttpError(400, `Employee ${a.id} not in your company / system mode`);
      }
      if (a.supervisorId != null) {
        if (a.supervisorId === a.id) {
          throw new HttpError(400, "An employee cannot supervise themselves");
        }
        if (!byId.has(a.supervisorId)) {
          throw new HttpError(400, `Supervisor ${a.supervisorId} not in your company / system mode`);
        }
      }
      byId.get(a.id)!.supervisorId = a.supervisorId;
    }

    // Cycle detection: walk supervisor chain from every node; if we revisit, reject
    for (const start of byId.values()) {
      const seen = new Set<number>();
      let cur: number | null = start.id;
      while (cur != null) {
        if (seen.has(cur)) {
          throw new HttpError(400, "Cycle detected in supervisor chain");
        }
        seen.add(cur);
        cur = byId.get(cur)?.supervisorId ?? null;
      }
    }

    // Persist atomically
    await prisma.$transaction(
      assignments.map((a) =>
        prisma.employee.update({
          where: { id: a.id },
          data: { supervisorId: a.supervisorId },
        })
      )
    );

    return NextResponse.json({ ok: true, updated: assignments.length });
  } catch (err) {
    return errorResponse(err);
  }
}
