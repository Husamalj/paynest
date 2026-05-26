import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { name, email, password, employee_number, phone, base_salary } = await req.json();
    if (!name || !email) throw new HttpError(400, "Name and email are required");

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) throw new HttpError(409, "Email already exists");

    const temporaryPassword = password || "123456";
    const hash = await bcrypt.hash(temporaryPassword, 10);

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const systemMode = settings?.systemMode ?? "daily";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: "hr",
        companyId: session.companyId,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const employeeId = employee_number || `HR-${user.id}`;

    await prisma.employee.upsert({
      where: { employeeId_systemMode: { employeeId, systemMode } },
      create: {
        employeeId,
        name,
        email,
        phone: phone || "",
        baseSalary: parseFloat(base_salary) || 0,
        socialSecurity: false,
        systemMode,
        companyId: session.companyId,
      },
      update: {
        name,
        email,
        companyId: session.companyId,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { employeeNumber: employeeId },
    });

    return NextResponse.json({ user: { ...user, employee_number: employeeId } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
