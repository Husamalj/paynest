import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    await requirePageAccess(session, "hrTeam");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { id } = await params;
    const hr = await prisma.user.findFirst({
      where: { id: Number(id), companyId: session.companyId, role: "hr" },
    });
    if (!hr) throw new HttpError(404, "HR user not found");

    const { name, email, phone, base_salary } = await req.json();

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { ...(name && { name }), ...(email && { email }) },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, employeeNumber: true, mustChangePassword: true, createdAt: true,
      },
    });

    // Update employee record too
    if (hr.employeeNumber) {
      await prisma.employee.updateMany({
        where: { employeeId: hr.employeeNumber, companyId: session.companyId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
          ...(base_salary !== undefined && { baseSalary: parseFloat(base_salary) || 0 }),
        },
      });
    }

    const emp = hr.employeeNumber
      ? await prisma.employee.findFirst({
          where: { employeeId: hr.employeeNumber, companyId: session.companyId! },
          select: { baseSalary: true, phone: true },
        })
      : null;

    return NextResponse.json({
      ...updated,
      base_salary: emp ? Number(emp.baseSalary) : 0,
      phone: emp?.phone ?? "",
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    await requirePageAccess(session, "hrTeam");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { id } = await params;
    const hr = await prisma.user.findFirst({
      where: { id: Number(id), companyId: session.companyId, role: "hr" },
    });
    if (!hr) throw new HttpError(404, "HR user not found");

    if (hr.employeeNumber) {
      await prisma.employee.deleteMany({
        where: { employeeId: hr.employeeNumber, companyId: session.companyId },
      });
    }

    await prisma.user.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true, deleted: hr });
  } catch (err) {
    return errorResponse(err);
  }
}
