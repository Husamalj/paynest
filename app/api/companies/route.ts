import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { hiddenPageAliases } from "@/lib/responseShape";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);

    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const search = url.searchParams.get("search")?.trim();
    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          users: { select: { role: true, employeeNumber: true, email: true } },
        },
        ...paginationQuery(pagination),
      }),
      pagination.enabled ? prisma.company.count({ where }) : Promise.resolve(undefined),
    ]);

    // For each company: count employees excluding only owner/super_admin (HR counts)
    const companyIds = companies.map((c) => c.id);
    const employeeCounts = companyIds.length > 0
      ? await prisma.employee.groupBy({
          by: ["companyId"],
          where: { companyId: { in: companyIds } },
          _count: { _all: true },
        })
      : [];
    const countMap = new Map(employeeCounts.map((row) => [row.companyId, row._count._all]));
    const adminPairs = companies.flatMap((c: any) =>
      c.users
        .filter((u: any) => u.role === "owner" || u.role === "super_admin")
        .map((u: any) => u.employeeNumber)
        .filter(Boolean)
        .map((employeeNumber: string) => ({ companyId: c.id, employeeNumber }))
    );
    const adminEmployees = adminPairs.length > 0
      ? await prisma.employee.findMany({
          where: {
            OR: adminPairs.map((pair) => ({ companyId: pair.companyId, employeeId: pair.employeeNumber })),
          },
          select: { companyId: true, employeeId: true },
        })
      : [];
    const adminCountMap = new Map<number, number>();
    for (const employee of adminEmployees) {
      adminCountMap.set(employee.companyId, (adminCountMap.get(employee.companyId) ?? 0) + 1);
    }

    const results = companies.map((c: any) => {
      const owner_email = c.users.find((u: any) => u.role === "owner")?.email ?? null;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        is_active: c.isActive,
        isActive: c.isActive,
        createdAt: c.createdAt,
        created_at: c.createdAt,
        employee_count: (countMap.get(c.id) ?? 0) - (adminCountMap.get(c.id) ?? 0),
        max_employees: c.maxEmployees,
        maxEmployees: c.maxEmployees,
        subscription_plan: c.subscriptionPlan,
        subscriptionPlan: c.subscriptionPlan,
        subscription_status: c.subscriptionStatus,
        subscriptionStatus: c.subscriptionStatus,
        trial_ends_at: c.trialEndsAt,
        trialEndsAt: c.trialEndsAt,
        subscription_ends_at: c.subscriptionEndsAt,
        subscriptionEndsAt: c.subscriptionEndsAt,
        billing_email: c.billingEmail,
        billingEmail: c.billingEmail,
        billing_notes: c.billingNotes,
        billingNotes: c.billingNotes,
        ...hiddenPageAliases(c),
        owner_email,
      };
    });

    return withPaginationHeaders(results, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}
