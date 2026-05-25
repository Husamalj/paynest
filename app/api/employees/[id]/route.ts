import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const mode = await getSystemMode(session.companyId);

    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: id,
        companyId: session.companyId,
        systemMode: mode,
      },
    });
    if (!employee) throw new HttpError(404, "Employee not found");
    return NextResponse.json(employee);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const mode = await getSystemMode(session.companyId);
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email ?? "";
    if (body.phone !== undefined) data.phone = body.phone ?? "";
    if (body.base_salary !== undefined) data.baseSalary = Number(body.base_salary) || 0;
    if (body.social_security !== undefined) data.socialSecurity = !!body.social_security;
    if (body.remote_days !== undefined) data.remoteDays = body.remote_days;
    if (body.religion !== undefined) data.religion = body.religion ?? "";
    data.companyId = session.companyId;

    const employee = await prisma.employee.updateMany({
      where: {
        employeeId: id,
        companyId: session.companyId,
        systemMode: mode,
      },
      data,
    });
    if (employee.count === 0) throw new HttpError(404, "Employee not found");

    // Sync user record if email updated
    if (body.email !== undefined) {
      await prisma.user.updateMany({
        where: { employeeNumber: id, companyId: session.companyId, role: "employee" },
        data: {
          name: body.name ?? undefined,
          email: body.email || undefined,
        },
      });
    }

    const updated = await prisma.employee.findFirst({
      where: { employeeId: id, companyId: session.companyId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export { PUT as PATCH };

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const mode = await getSystemMode(session.companyId);

    await prisma.user.deleteMany({
      where: { employeeNumber: id, companyId: session.companyId, role: "employee" },
    });
    await prisma.employee.deleteMany({
      where: {
        employeeId: id,
        companyId: session.companyId,
        systemMode: mode,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
