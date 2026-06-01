import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit, diff } from "@/lib/audit";
import { assertDeliverableEmail, assertValidPhone } from "@/lib/validate";

export const runtime = "nodejs";

function toSnake(e: any) {
  if (!e) return e;
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
    social_security: e.socialSecurity,
    remote_days: e.remoteDays,
    system_mode: e.systemMode,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

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

    // Validate contact info — email must be deliverable, phone must be valid.
    if (body.email) {
      try { await assertDeliverableEmail(body.email); }
      catch (e: any) { throw new HttpError(400, e.message); }
    }
    if (body.phone) {
      try { assertValidPhone(body.phone); }
      catch (e: any) { throw new HttpError(400, e.message); }
    }

    // Snapshot before for audit diff
    const before = await prisma.employee.findFirst({
      where: { employeeId: id, companyId: session.companyId, systemMode: mode },
    });

    const data: Record<string, unknown> = {};
    if (body.employee_id !== undefined) data.employeeId = body.employee_id;
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email ?? "";
    if (body.phone !== undefined) data.phone = body.phone ?? "";
    if (body.base_salary !== undefined) data.baseSalary = Number(body.base_salary) || 0;
    if (body.allowance !== undefined) data.allowance = Number(body.allowance) || 0;
    if (body.job_title !== undefined) data.jobTitle = body.job_title || null;
    if (body.nationality !== undefined) data.nationality = body.nationality || null;
    if (body.gender !== undefined) data.gender = body.gender || null;
    if (body.national_id !== undefined) data.nationalId = body.national_id || null;
    if (body.birth_date !== undefined) data.birthDate = body.birth_date ? new Date(body.birth_date) : null;
    if (body.photo_url !== undefined) data.photoUrl = body.photo_url || null;
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

    const newId = (body.employee_id as string | undefined) ?? id;

    // Sync user record — UPDATE if exists, CREATE if missing (and email provided)
    if (body.email !== undefined || body.name !== undefined || body.employee_id !== undefined) {
      // Look up existing user by employeeNumber OR by email
      const existingUser = await prisma.user.findFirst({
        where: {
          companyId: session.companyId,
          OR: [
            { employeeNumber: id },
            ...(body.email ? [{ email: body.email as string }] : []),
          ],
        },
      });

      if (existingUser) {
        // Update existing user — keep their role, just sync details
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: body.name ?? undefined,
            email: body.email || undefined,
            employeeNumber: newId,
          },
        });
      } else if (body.email) {
        // No user account yet — create one with default password (employee role)
        // Find the employee record to use its current name if not in body
        const empRec = await prisma.employee.findFirst({
          where: { employeeId: newId, companyId: session.companyId },
          select: { name: true },
        });
        const hash = await bcrypt.hash("123456", 10);
        await prisma.user.create({
          data: {
            name: body.name ?? empRec?.name ?? newId,
            email: body.email,
            password: hash,
            role: "employee",
            companyId: session.companyId,
            employeeNumber: newId,
            mustChangePassword: true,
          },
        });
      }
    }

    const updated = await prisma.employee.findFirst({
      where: { employeeId: newId, companyId: session.companyId },
    });
    await logAudit(session, "update", "employee", newId, diff(before, updated));
    return NextResponse.json(toSnake(updated));
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

    // Snapshot before delete for audit
    const before = await prisma.employee.findFirst({
      where: { employeeId: id, companyId: session.companyId, systemMode: mode },
      select: { name: true, email: true, baseSalary: true },
    });

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

    await logAudit(session, "delete", "employee", id, before ?? null);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
