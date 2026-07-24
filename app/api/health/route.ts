import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateHealth, type HealthChecks } from "@/lib/health";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const checks: HealthChecks = {
    database: "unknown",
    jwt: process.env.JWT_SECRET ? "configured" : "missing",
    email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "disabled",
    cron: process.env.CRON_SECRET ? "configured" : "disabled",
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "database-fallback",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const strict = req.nextUrl.searchParams.get("strict") === "1";
  const status = evaluateHealth(checks);

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
