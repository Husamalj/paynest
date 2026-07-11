import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse, HttpError } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";
import { assertDeliverableEmail, assertValidPhone } from "@/lib/validate";
import { passwordPolicyMessage } from "@/lib/passwordPolicy";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, slug, ownerName, email, phone, password, maxEmployees, additionalOwners } = body as {
      companyName?: string;
      slug?: string;
      ownerName?: string;
      email?: string;
      phone?: string;
      password?: string;
      maxEmployees?: number | string;
      additionalOwners?: { name?: string; email?: string }[];
    };
    if (!companyName || !slug || !ownerName || !email || !password) {
      throw new HttpError(400, "Missing required fields");
    }

    // Validate contact info — email must be a real deliverable address.
    try { await assertDeliverableEmail(email); }
    catch (e: any) { throw new HttpError(400, e.message); }
    // Phone is optional at signup, but if provided it must be valid.
    if (phone) {
      try { assertValidPhone(phone); }
      catch (e: any) { throw new HttpError(400, e.message); }
    }

    // Parse maxEmployees — null/empty means unlimited
    const parsedMaxEmp =
      maxEmployees === undefined || maxEmployees === null || maxEmployees === ""
        ? null
        : Math.max(0, parseInt(String(maxEmployees), 10) || 0);
    if (!SLUG_RE.test(slug)) throw new HttpError(400, "Slug must be lowercase letters, digits, and dashes");
    const passwordError = passwordPolicyMessage(password);
    if (passwordError) throw new HttpError(400, passwordError);

    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) throw new HttpError(409, "Company slug already exists");

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) throw new HttpError(409, "Email already exists");

    const hash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name: companyName, slug, status: "pending", isActive: false, maxEmployees: parsedMaxEmp },
    });

    const ownerUser = await prisma.user.create({
      data: {
        name: ownerName,
        email,
        password: hash,
        role: "owner",
        companyId: company.id,
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Auto-create an employee record for the owner so their hours & salary are tracked
    const ownerEmpId = `OWNER-${ownerUser.id}`;
    await prisma.employee.create({
      data: {
        employeeId: ownerEmpId,
        name: ownerName,
        email,
        baseSalary: 0,
        socialSecurity: false,
        systemMode: "daily",
        companyId: company.id,
      },
    });

    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { employeeNumber: ownerEmpId },
    });

    await prisma.companySettings.create({
      data: { companyId: company.id, companyName },
    });

    // Optional: additional co-owners for the same company.
    const extras = (additionalOwners || []).filter((o) => o && o.email && o.email.trim());
    for (const o of extras) {
      const oEmail = o.email!.trim().toLowerCase();
      if (oEmail === email.toLowerCase()) continue; // already the primary owner
      const dup = await prisma.user.findFirst({ where: { email: oEmail } });
      if (dup) continue; // skip emails that already exist
      const oUser = await prisma.user.create({
        data: {
          name: (o.name || "").trim() || oEmail,
          email: oEmail,
          password: hash,
          role: "owner",
          companyId: company.id,
          isActive: true,
          mustChangePassword: false,
        },
      });
      const oEmpId = `OWNER-${oUser.id}`;
      await prisma.employee.create({
        data: { employeeId: oEmpId, name: oUser.name, email: oEmail, baseSalary: 0, socialSecurity: false, systemMode: "daily", companyId: company.id },
      });
      await prisma.user.update({ where: { id: oUser.id }, data: { employeeNumber: oEmpId } });
    }

    // Send email verification
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await prisma.passwordResetToken.create({
        data: { userId: ownerUser.id, token: verifyToken, expiresAt },
      });
      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://paynest.app"}/verify-email?token=${verifyToken}`;
      await sendEmailVerification(email, verifyUrl);
    } catch (e) {
      console.error("[verify email]", e);
    }

    return NextResponse.json({
      pending: true,
      message: "Company registered. Awaiting administrator approval.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
