import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { employees: true } },
        users: { where: { role: "owner" }, select: { email: true }, take: 1 },
      },
    });

    return NextResponse.json(
      companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        is_active: c.isActive,
        isActive: c.isActive,
        createdAt: c.createdAt,
        created_at: c.createdAt,
        employee_count: c._count.employees,
        max_employees: c.maxEmployees,
        maxEmployees: c.maxEmployees,
        owner_email: c.users[0]?.email ?? null,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
