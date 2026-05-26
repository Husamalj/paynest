import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) throw new HttpError(400, "Email and password required");

    let user: any;
    try {
      user = await prisma.user.findFirst({
        where: { email },
        include: { company: true },
      });
    } catch (dbErr: any) {
      console.error("DB error during login:", dbErr?.message ?? dbErr);
      throw new HttpError(500, `Database error: ${dbErr?.message ?? "unknown"}`);
    }
    if (!user) throw new HttpError(401, "Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    if (
      user.role !== "super_admin" &&
      user.companyId &&
      user.company?.isActive === false
    ) {
      throw new HttpError(403, "Company subscription is inactive");
    }

    if (
      user.role !== "super_admin" &&
      user.companyId &&
      user.company?.status === "pending"
    ) {
      throw new HttpError(403, "Company registration is pending administrator approval.");
    }

    const token = signJwt({
      id: user.id,
      role: user.role as any,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      employeeNumber: user.employeeNumber,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.companyId,
        companyId: user.companyId,
        employee_number: user.employeeNumber,
        employeeNumber: user.employeeNumber,
        must_change_password: user.mustChangePassword,
        mustChangePassword: user.mustChangePassword,
        company_name: user.company?.name ?? null,
        company_slug: user.company?.slug ?? null,
        is_active: user.company?.isActive ?? null,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
