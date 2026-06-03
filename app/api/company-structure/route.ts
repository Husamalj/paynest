import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/company-structure
 * Read-only org structure for the whole company — available to EVERYONE
 * (including employees) so anyone can view the company hierarchy.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    const owners = await prisma.user.findMany({
      where: { companyId: session.companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true, role: true },
    });
    const superNums = owners.filter((u) => u.role === "super_admin").map((u) => u.employeeNumber).filter(Boolean) as string[];
    const ownerNums = new Set(owners.filter((u) => u.role === "owner").map((u) => u.employeeNumber).filter(Boolean) as string[]);

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
        ...(superNums.length > 0 ? { NOT: { employeeId: { in: superNums } } } : {}),
      },
      select: { id: true, employeeId: true, name: true, jobTitle: true, photoUrl: true, supervisorId: true, supervisorIds: true },
      orderBy: { name: "asc" },
    });

    const validIds = new Set(employees.map((e) => e.id));
    const out = employees.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      name: e.name,
      jobTitle: e.jobTitle,
      photoUrl: e.photoUrl,
      supervisorId: e.supervisorId != null && validIds.has(e.supervisorId) ? e.supervisorId : null,
      supervisorIds: (e.supervisorIds || []).filter((x) => validIds.has(x)),
      isOwner: e.employeeId ? ownerNums.has(e.employeeId) : false,
    }));

    return NextResponse.json(out);
  } catch (err) {
    return errorResponse(err);
  }
}
