import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    if (!session.employeeNumber) throw new HttpError(404, "Employee number not found");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: session.employeeNumber,
        companyId: session.companyId,
        systemMode: mode,
      },
    });
    if (!employee) throw new HttpError(404, "Employee not found");

    // Combine legacy supervisorId with new supervisorIds array
    const allSupervisorIds = Array.from(new Set([
      ...(employee.supervisorIds || []),
      ...(employee.supervisorId != null ? [employee.supervisorId] : []),
    ]));

    // Fetch all supervisor records
    const supervisors = allSupervisorIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: allSupervisorIds }, companyId: session.companyId, systemMode: mode },
          select: { id: true, employeeId: true, name: true, email: true, phone: true },
          orderBy: { name: "asc" },
        })
      : [];

    // Fetch subordinates — anyone where my id is in their supervisorIds OR supervisorId
    const subordinates = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
        OR: [
          { supervisorIds: { has: employee.id } },
          { supervisorId: employee.id },
        ],
      },
      select: { id: true, employeeId: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ...employee,
      supervisor: supervisors[0] ?? null, // backward compat (primary)
      supervisors,                         // full array (new)
      subordinates,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
