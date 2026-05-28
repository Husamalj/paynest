import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendNewEmployeeCredentials } from "@/lib/email";

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

    // Exclude employee records that belong to owner/hr/super_admin accounts.
    // Show all employees EXCEPT those whose employeeId matches a non-employee user.
    const adminUsers = await prisma.user.findMany({
      where: { companyId: session.companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        systemMode: mode,
        ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}),
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
    const { employee_id, name, email, phone, base_salary, social_security, religion, allowance, job_title } = body;

    // Enforce employee quota — block new employees if company is at max
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { maxEmployees: true },
    });
    if (company?.maxEmployees != null) {
      // Check if this is a NEW employee (not updating existing)
      const existing = await prisma.employee.findUnique({
        where: { employeeId_systemMode_companyId: { employeeId: employee_id, systemMode: mode, companyId: session.companyId } },
        select: { id: true },
      });
      if (!existing) {
        // Count only non-admin employees (matches what HR/Owner see in Employees page)
        const adminUsers = await prisma.user.findMany({
          where: { companyId: session.companyId, role: { in: ["owner", "super_admin"] } },
          select: { employeeNumber: true },
        });
        const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];
        const currentCount = await prisma.employee.count({
          where: {
            companyId: session.companyId,
            systemMode: mode,
            ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}),
          },
        });
        if (currentCount >= company.maxEmployees) {
          throw new HttpError(
            403,
            `QUOTA_EXCEEDED: Your plan allows up to ${company.maxEmployees} employees. You currently have ${currentCount}. Please upgrade your plan to add more.`
          );
        }
      }
    }

    const employee = await prisma.employee.upsert({
      where: { employeeId_systemMode_companyId: { employeeId: employee_id, systemMode: mode, companyId: session.companyId } },
      create: {
        employeeId: employee_id,
        name,
        email: email ?? "",
        phone: phone ?? "",
        baseSalary: Number(base_salary) || 0,
        allowance: Number(allowance) || 0,
        jobTitle: job_title ?? null,
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
        allowance: Number(allowance) || 0,
        jobTitle: job_title ?? null,
        socialSecurity: !!social_security,
        religion: religion ?? "",
        companyId: session.companyId,
      },
    });

    // Auto-create employee user account if email provided
    if (email) {
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (!existingUser) {
        const tempPassword = "123456";
        const hash = await bcrypt.hash(tempPassword, 10);
        const newUser = await prisma.user.create({
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

        if (newUser.email && tempPassword) {
          sendNewEmployeeCredentials(
            newUser.email,
            name,
            tempPassword,
            `${process.env.NEXT_PUBLIC_APP_URL ?? "https://paynest.app"}/employee-login`
          );
        }
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { employeeNumber: employee_id, companyId: session.companyId, role: "employee" },
        });
      }
    }

    await logAudit(session, "update", "employee", employee.employeeId, {
      name, email, baseSalary: Number(base_salary) || 0, allowance: Number(allowance) || 0,
      jobTitle: job_title ?? null,
    });
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
    allowance: e.allowance,
    job_title: e.jobTitle,
    social_security: e.socialSecurity,
    remote_days: e.remoteDays,
    system_mode: e.systemMode,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
