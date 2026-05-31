import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** Exclude only owner/super_admin from the org tree. HR can appear and be evaluated. */
async function getOwnerIds(companyId: number): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: ["owner", "super_admin"] } },
    select: { employeeNumber: true },
  });
  return users.map((u) => u.employeeNumber).filter(Boolean) as string[];
}

/** GET /api/supervisors - returns all non-owner employees with their multi-supervisor lists */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
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
        supervisorIds: true,
      },
      orderBy: { name: "asc" },
    });

    // Drop stale supervisor references that point to ids not present on this canvas
    // (other system mode, deleted, or excluded owner) so the chart renders cleanly.
    const validIds = new Set(employees.map((e) => e.id));
    const sanitized = employees.map((e) => {
      const ids = (e.supervisorIds || []).filter((x) => validIds.has(x));
      return { ...e, supervisorIds: ids, supervisorId: ids[0] ?? null };
    });

    return NextResponse.json({ employees: sanitized, systemMode: mode });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/supervisors — bulk update multi-supervisor relationships.
 * Body: { assignments: [{ id: number, supervisorIds: number[] }, ...] }
 *
 * Validates:
 *  1. All employees belong to the caller's company + same systemMode
 *  2. supervisorId !== id (no self-supervision)
 *  3. No cycles in the resulting graph (any supervisor path must not include the node itself)
 *
 * Also keeps legacy `supervisorId` in sync with supervisorIds[0] (primary supervisor).
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    // Accept both new (supervisorIds: number[]) and legacy (supervisorId: number|null) formats
    const assignments: Array<{ id: number; supervisorIds?: number[]; supervisorId?: number | null }> =
      Array.isArray(body?.assignments) ? body.assignments : [];

    if (assignments.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    const all = await prisma.employee.findMany({
      where: { companyId: session.companyId, systemMode: mode },
      select: { id: true, supervisorIds: true },
    });
    const byId = new Map(all.map((e) => [e.id, { id: e.id, supervisorIds: [...(e.supervisorIds || [])] }]));

    // Normalise each assignment to a supervisorIds array
    const normalised = assignments.map((a) => {
      let ids: number[];
      if (Array.isArray(a.supervisorIds)) ids = [...new Set(a.supervisorIds.filter((x) => typeof x === "number"))];
      else if (a.supervisorId === null || a.supervisorId === undefined) ids = [];
      else ids = [a.supervisorId];
      return { id: a.id, supervisorIds: ids };
    });

    // Apply into in-memory map for validation.
    // Stale supervisor references (ids that no longer exist in this company/system mode —
    // e.g. left over from the other payroll mode or a deleted employee) are silently
    // dropped instead of failing the whole save, so the org chart self-heals.
    for (const a of normalised) {
      if (typeof a.id !== "number") throw new HttpError(400, "Invalid assignment id");
      if (!byId.has(a.id)) throw new HttpError(400, `Employee ${a.id} not in your company / system mode`);
      a.supervisorIds = a.supervisorIds.filter((supId) => {
        if (supId === a.id) throw new HttpError(400, "An employee cannot supervise themselves");
        return byId.has(supId); // drop unknown/stale supervisor ids
      });
      byId.get(a.id)!.supervisorIds = a.supervisorIds;
    }

    // Cycle detection — walk ALL supervisor paths via DFS, must not revisit start node
    function hasCycleFrom(start: number): boolean {
      const stack: number[] = [start];
      const seen = new Set<number>();
      while (stack.length) {
        const cur = stack.pop()!;
        if (cur === start && seen.size > 0) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const sups = byId.get(cur)?.supervisorIds ?? [];
        for (const s of sups) {
          if (s === start) return true;
          stack.push(s);
        }
      }
      return false;
    }
    for (const node of byId.keys()) {
      if (hasCycleFrom(node)) throw new HttpError(400, "Cycle detected in supervisor chain");
    }

    // Persist atomically — write both new array and legacy primary-supervisor field
    await prisma.$transaction(
      normalised.map((a) =>
        prisma.employee.update({
          where: { id: a.id },
          data: {
            supervisorIds: a.supervisorIds,
            supervisorId: a.supervisorIds[0] ?? null,
          },
        })
      )
    );

    await logAudit(session, "update", "supervisor", null, { assignmentsCount: assignments.length, sample: normalised.slice(0, 5) });
    return NextResponse.json({ ok: true, updated: assignments.length });
  } catch (err) {
    return errorResponse(err);
  }
}
