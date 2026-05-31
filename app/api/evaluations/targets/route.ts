import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/evaluations/targets
 * Returns every employee in the company (current system mode) that CAN be
 * evaluated — i.e. everyone except the owner / super admin, and except the
 * caller themselves. Available to owner, hr AND employee so anyone can
 * evaluate anyone (except the owner).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    // employeeNumbers belonging to owner/super_admin accounts — excluded as targets
    const owners = await prisma.user.findMany({
      where: { companyId: session.companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const ownerNums = owners.map((u) => u.employeeNumber).filter(Boolean) as string[];
    const exclude = new Set(ownerNums);
    if (session.employeeNumber) exclude.add(session.employeeNumber); // can't evaluate yourself

    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId, systemMode: mode },
      select: { id: true, employeeId: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const targets = employees
      .filter((e) => e.employeeId && !exclude.has(e.employeeId))
      .map((e) => ({ id: e.id, employee_id: e.employeeId, employeeId: e.employeeId, name: e.name, email: e.email }));

    return NextResponse.json(targets);
  } catch (err) {
    return errorResponse(err);
  }
}
