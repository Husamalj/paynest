import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeHiddenPages, type HiddenPageKey } from "@/lib/pageRegistry";
import { createRequestId, logError } from "@/lib/logger";

const SECRET = process.env.JWT_SECRET!;

export type SessionUser = {
  id: number;
  role: "super_admin" | "owner" | "hr" | "employee";
  companyId: number | null;
  email?: string | null;
  name: string;
  employeeNumber?: string | null;
};

export function signJwt(payload: SessionUser): string {
  if (!SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyJwtNode(token: string): SessionUser {
  if (!SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, SECRET) as SessionUser;
}

// Name of the httpOnly auth cookie. Keeping the credential in an httpOnly
// cookie (instead of localStorage) makes it unreadable to injected JS (XSS).
export const AUTH_COOKIE = "token";

export function getTokenFromRequest(req: NextRequest): string {
  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.cookies.get(AUTH_COOKIE)?.value || "";
}

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const token = getTokenFromRequest(req);
  if (!token) throw new HttpError(401, "Missing token");
  try {
    return verifyJwtNode(token);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireRole(user: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden");
}

export async function requirePageAccess(user: SessionUser, pageKey: HiddenPageKey) {
  if (user.role === "super_admin" || user.companyId == null) return;

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { hiddenPages: true },
  });
  const hiddenPages = normalizeHiddenPages(company?.hiddenPages);
  if (hiddenPages.includes(pageKey)) {
    throw new HttpError(403, "This page is hidden for your company");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  const requestId = createRequestId();

  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, requestId }, {
      status: err.status,
      headers: { "x-request-id": requestId },
    });
  }
  if (err instanceof Error && err.message === "JWT_SECRET is not set") {
    logError("api.auth_configuration_error", err, { requestId });
    return NextResponse.json(
      { error: "Server auth configuration is missing JWT_SECRET", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
  logError("api.unhandled_error", err, { requestId });
  return NextResponse.json(
    { error: "Internal server error", requestId },
    { status: 500, headers: { "x-request-id": requestId } }
  );
}
