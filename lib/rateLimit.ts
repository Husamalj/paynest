import { NextResponse } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in the process memory, so on a multi-instance / serverless
 * deployment (e.g. Vercel) each instance counts independently. It still raises
 * the cost of brute-force meaningfully; for hard guarantees back it with Redis
 * (Upstash) keyed the same way.
 */
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns null when the request is allowed, or a 429 NextResponse when the
 * caller has exceeded `limit` requests within `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  hit.count += 1;
  if (hit.count > limit) {
    const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

// Opportunistically drop expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000).unref?.();
