import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, slug, ownerName, email, password } = body as {
      companyName?: string;
      slug?: string;
      ownerName?: string;
      email?: string;
      password?: string;
    };
    if (!companyName || !slug || !ownerName || !email || !password) {
      throw new HttpError(400, "Missing required fields");
    }
    if (!SLUG_RE.test(slug)) throw new HttpError(400, "Slug must be lowercase letters, digits, and dashes");
    if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");

    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) throw new HttpError(409, "Company slug already exists");

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) throw new HttpError(409, "Email already exists");

    const hash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name: companyName, slug, status: "pending", isActive: false },
    });

    await prisma.user.create({
      data: {
        name: ownerName,
        email,
        password: hash,
        role: "owner",
        companyId: company.id,
        isActive: true,
        mustChangePassword: password === "123456",
      },
    });

    await prisma.companySettings.create({
      data: { companyId: company.id, companyName },
    });

    return NextResponse.json({
      pending: true,
      message: "Company registered. Awaiting administrator approval.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
