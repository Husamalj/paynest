import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { passwordPolicyMessage } from "@/lib/passwordPolicy";

export const runtime = "nodejs";

function generateTemporaryPassword() {
  return `PayNest-${crypto.randomBytes(6).toString("base64url")}1!`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    await requirePageAccess(session, "hrTeam");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { name, email, password, employee_number, phone, base_salary } = await req.json();
    if (!name || !email) throw new HttpError(400, "Name and email are required");

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) throw new HttpError(409, "Email already exists");

    const generatedPassword = !password;
    const temporaryPassword = password || generateTemporaryPassword();
    const passwordError = passwordPolicyMessage(temporaryPassword);
    if (passwordError) throw new HttpError(400, passwordError);
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
      where: { employeeId_companyId: { employeeId, companyId: session.companyId } },
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

    return NextResponse.json({
      user: { ...user, employee_number: employeeId },
      ...(generatedPassword ? { temporaryPassword } : {}),
    }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
