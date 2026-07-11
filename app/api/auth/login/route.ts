import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt, errorResponse, HttpError } from "@/lib/auth";
import { clearFailedLogin, getClientIp, loginLockout, rateLimit, recordFailedLogin } from "@/lib/rateLimit";
import { hiddenPageAliases } from "@/lib/responseShape";
import { isCompanySubscriptionBlocked, subscriptionBlockReason } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) throw new HttpError(400, "Email and password required");

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = getClientIp(req);
    const attemptKey = `login:${clientIp}:${normalizedEmail}`;
    const failureKey = `login-fail:${normalizedEmail}`;

    // Throttle brute-force by source and account. Failed attempts also lock the
    // account key briefly, so rotating IPs does not get unlimited guesses.
    const limited = rateLimit(attemptKey, 8, 15 * 60_000) || loginLockout(failureKey);
    if (limited) return limited;

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            isActive: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            subscriptionEndsAt: true,
            hiddenPages: true,
          },
        },
      },
    });
    if (!user) {
      recordFailedLogin(failureKey);
      throw new HttpError(401, "Invalid credentials");
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      recordFailedLogin(failureKey);
      throw new HttpError(401, "Invalid credentials");
    }
    clearFailedLogin(failureKey);

    if (
      user.role !== "super_admin" &&
      user.companyId &&
      user.company?.status === "pending"
    ) {
      throw new HttpError(403, "Company registration is pending administrator approval.");
    }

    if (
      user.role !== "super_admin" &&
      user.companyId &&
      user.company &&
      isCompanySubscriptionBlocked(user.company)
    ) {
      throw new HttpError(403, subscriptionBlockReason(user.company));
    }

    const token = signJwt({
      id: user.id,
      role: user.role as any,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      employeeNumber: user.employeeNumber,
    });

    const res = NextResponse.json({
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
        subscription_status: user.company?.subscriptionStatus ?? null,
        subscriptionStatus: user.company?.subscriptionStatus ?? null,
        ...hiddenPageAliases(user.company),
      },
    });

    // Store the credential in an httpOnly cookie so it is never exposed to JS
    // (XSS-safe). SameSite=Lax blocks cross-site CSRF on the auth cookie.
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days, matches JWT expiry
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
