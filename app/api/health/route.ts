import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const checks = {
    database: "unknown",
    jwt: process.env.JWT_SECRET ? "configured" : "missing",
    email: process.env.RESEND_API_KEY && process.env.FROM_EMAIL ? "configured" : "missing",
    cron: process.env.CRON_SECRET ? "configured" : "missing",
  };

  let status = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    status = "degraded";
  }

  if (checks.jwt === "missing") status = "degraded";

  const strict = req.nextUrl.searchParams.get("strict") === "1";

  return NextResponse.json({
    status,
    checks,
    uptimeSec: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }, {
    status: strict && status !== "ok" ? 503 : 200,
  });
}
