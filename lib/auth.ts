import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

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

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
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

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

const encodedSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyJwtEdge(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, encodedSecret());
  return payload as unknown as SessionUser;
}
