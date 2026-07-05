import { NextResponse, type NextRequest } from "next/server";
import { verifyJwtEdge } from "@/lib/edgeAuth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register-company",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/cron/",
  "/api/health",
];

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  if (!host) return false;

  try {
    return new URL(origin).origin === `${proto}://${host}`;
  } catch {
    return false;
  }
}

function csrfSafe(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return true;
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true;

  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  return sameOrigin(req);
}

function secure(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return secure(NextResponse.next());

  if (!csrfSafe(req)) {
    return secure(NextResponse.json({ error: "Invalid request origin" }, { status: 403 }));
  }

  if (req.method === "POST" && pathname === "/api/contact") return secure(NextResponse.next());
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return secure(NextResponse.next());

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.cookies.get("token")?.value || "");
  if (!token) return secure(NextResponse.json({ error: "Missing token" }, { status: 401 }));

  try {
    await verifyJwtEdge(token);
    return secure(NextResponse.next());
  } catch {
    return secure(NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }));
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
