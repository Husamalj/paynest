import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendNewEmployeeCredentials } from "@/lib/email";
import { assertDeliverableEmail, assertValidPhone } from "@/lib/validate";
import { getCompanySystemMode } from "@/lib/companyContext";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

async function getSystemMode(companyId: number) {
  return getCompanySystemMode(companyId);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    // Exclude employee records that belong to owner/hr/super_admin accounts.
    // Show all employees EXCEPT those whose employeeId matches a non-employee user.
    const adminUsers = await prisma.user.findMany({
      where: { companyId: session.companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];
    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const search = url.searchParams.get("search")?.trim();
    const department = url.searchParams.get("department")?.trim();

    const where: any = {
      companyId: session.companyId,
      ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}),
      ...(department ? { department } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { employeeId: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { name: "asc" },
        ...paginationQuery(pagination),
      }),
      pagination.enabled ? prisma.employee.count({ where }) : Promise.resolve(undefined),
    ]);
    return withPaginationHeaders(employees.map(toSnake), pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const mode = await getSystemMode(session.companyId);
    const body = await req.json();
    const { employee_id, name, email, phone, base_salary, social_security, religion, allowance, job_title, nationality, gender, national_id, birth_date, work_type, workdays, req_hours } = body;

    // Validate contact info — email must be a real deliverable address, phone must be valid.
    if (email) {
      try { await assertDeliverableEmail(email); }
      catch (e: any) { throw new HttpError(400, e.message); }
    }
    if (phone) {
      try { assertValidPhone(phone); }
      catch (e: any) { throw new HttpError(400, e.message); }
    }

    // Enforce employee quota — block new employees if company is at max
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { maxEmployees: true },
    });
    if (company?.maxEmployees != null) {
      // Check if this is a NEW employee (not updating existing)
      const existing = await prisma.employee.findUnique({
        where: { employeeId_companyId: { employeeId: employee_id, companyId: session.companyId } },
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
      where: { employeeId_companyId: { employeeId: employee_id, companyId: session.companyId } },
      create: {
        employeeId: employee_id,
        name,
        email: email ?? "",
        phone: phone ?? "",
        baseSalary: Number(base_salary) || 0,
        allowance: Number(allowance) || 0,
        jobTitle: job_title ?? null,
        nationality: nationality ?? null,
        gender: gender ?? null,
        nationalId: national_id ?? null,
        birthDate: birth_date ? new Date(birth_date) : null,
        socialSecurity: !!social_security,
        religion: religion ?? "",
        workType: work_type || "standard",
        workdays: workdays || null,
        reqHours: req_hours != null && req_hours !== "" ? Number(req_hours) : null,
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
        nationality: nationality ?? null,
        gender: gender ?? null,
        nationalId: national_id ?? null,
        birthDate: birth_date ? new Date(birth_date) : null,
        socialSecurity: !!social_security,
        religion: religion ?? "",
        workType: work_type || "standard",
        workdays: workdays || null,
        reqHours: req_hours != null && req_hours !== "" ? Number(req_hours) : null,
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
            session.companyId,
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
    nationality: e.nationality,
    gender: e.gender,
    national_id: e.nationalId,
    birth_date: e.birthDate,
    photo_url: e.photoUrl,
    department: e.department,
    join_date: e.joinDate,
    contract_end_date: e.contractEndDate,
    social_security: e.socialSecurity,
    work_type: e.workType,
    workdays: e.workdays,
    req_hours: e.reqHours != null ? Number(e.reqHours) : null,
    remote_days: e.remoteDays,
    system_mode: e.systemMode,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
