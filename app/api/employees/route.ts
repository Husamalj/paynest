import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  const s = await prisma.companySettings.findFirst({ where: { companyId } });
  return s?.systemMode ?? "daily";
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const mode = await getSystemMode(session.companyId);

    // Only return employee-role records — exclude owner, HR, and super_admin accounts.
    // Two-step: resolve employeeNumbers from Users with role="employee", then filter.
    const empUsers = await prisma.user.findMany({
      where: { companyId: session.companyId, role: "employee" },
      select: { employeeNumber: true },
    });
    const empNums = empUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
        employeeId: { in: empNums },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(employees.map(toSnake));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const mode = await getSystemMode(session.companyId);
    const body = await req.json();
    const { employee_id, name, email, phone, base_salary, social_security, religion } = body;

    const employee = await prisma.employee.upsert({
      where: { employeeId_systemMode: { employeeId: employee_id, systemMode: mode } },
      create: {
        employeeId: employee_id,
        name,
        email: email ?? "",
        phone: phone ?? "",
        baseSalary: Number(base_salary) || 0,
        socialSecurity: !!social_security,
        religion: religion ?? "",
        systemMode: mode,
        companyId: session.companyId,
      },
      update: {
        name,
        email: email ?? "",
        phone: phone ?? "",
        baseSalary: Number(base_salary) || 0,
        socialSecurity: !!social_security,
        religion: religion ?? "",
        companyId: session.companyId,
      },
    });

    // Auto-create employee user account if email provided
    if (email) {
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (!existingUser) {
        const hash = await bcrypt.hash("123456", 10);
        await prisma.user.create({
          data: {
            name,
            email,
            password: hash,
            role: "employee",
            companyId: session.companyId,
            employeeNumber: employee_id,
            mustChangePassword: true,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { employeeNumber: employee_id, companyId: session.companyId, role: "employee" },
        });
      }
    }

    return NextResponse.json(toSnake(employee));
  } catch (err) {
    return errorResponse(err);
  }
}

function toSnake(e: any) {
  return {
    id: e.id,
    company_id: e.companyId,
    employee_id: e.employeeId,
    name: e.name,
    email: e.email,
    phone: e.phone,
    religion: e.religion,
    base_salary: e.baseSalary,
    social_security: e.socialSecurity,
    remote_days: e.remoteDays,
    system_mode: e.systemMode,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
