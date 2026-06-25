import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { roleRank, roleLabel, canViewProfile, canViewSensitive } from "@/lib/hierarchy";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

/**
 * GET /api/employees/[id]/card
 * Role-aware colleague profile for the chat panel, governed by the company
 * hierarchy (super_admin > owner > hr > employee):
 *  - You may view the profile of peers and anyone BELOW you — never anyone above.
 *    (So HR/employees cannot see the Owner's details.)
 *  - Sensitive data (salary, social security, leave) needs HR+ AND rank >= target.
 *  - Viewing your own card is always allowed.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const mode = await getSystemMode(session.companyId);

    const e = await prisma.employee.findFirst({
      where: { employeeId: id, companyId: session.companyId, systemMode: mode },
    });
    if (!e) throw new HttpError(404, "Employee not found");

    // Resolve the target's role from the users table (employeeNumber == employeeId).
    const targetUser = await prisma.user.findFirst({
      where: { companyId: session.companyId, employeeNumber: id },
      select: { role: true },
    });
    const targetRole = targetUser?.role ?? "employee";
    const isSelf = (session.employeeNumber ?? "") === id;

    const viewProfile = isSelf || canViewProfile(session.role, targetRole);
    const viewSensitive = isSelf ? roleRank(session.role) >= roleRank("hr") : canViewSensitive(session.role, targetRole);

    // Minimal card when the viewer is below the target (e.g. HR opening the Owner).
    if (!viewProfile) {
      return NextResponse.json({
        employee_id: e.employeeId,
        name: e.name,
        role: targetRole,
        role_label: roleLabel(targetRole),
        restricted: true,
        can_see_sensitive: false,
      });
    }

    const card: any = {
      employee_id: e.employeeId,
      name: e.name,
      role: targetRole,
      role_label: roleLabel(targetRole),
      restricted: false,
      job_title: e.jobTitle ?? null,
      department: e.department ?? null,
      email: e.email || null,
      phone: e.phone || null,
      photo_url: e.photoUrl ?? null,
      can_see_sensitive: viewSensitive,
    };

    if (viewSensitive) {
      card.base_salary = e.baseSalary != null ? Number(e.baseSalary) : null;
      card.social_security = !!e.socialSecurity;
      card.join_date = e.joinDate ?? null;
      card.contract_end_date = e.contractEndDate ?? null;

      const year = new Date().getFullYear();
      const balances = await prisma.leaveBalance.findMany({
        where: { companyId: session.companyId, employeeId: e.employeeId ?? undefined, year },
      });
      let annualTotal = 14, annualUsed = 0, sickTotal = 14, sickUsed = 0;
      if (balances.length) {
        annualTotal = balances[0].annualTotal;
        sickTotal = balances[0].sickTotal;
        for (const b of balances) { annualUsed += b.annualUsed; sickUsed += b.sickUsed; }
      }
      card.annual_remaining = annualTotal - annualUsed;
      card.sick_remaining = sickTotal - sickUsed;
    }

    return NextResponse.json(card);
  } catch (err) {
    return errorResponse(err);
  }
}
