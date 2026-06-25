import { NextRequest, NextResponse } from "next/server";
import { sendDemoRequest } from "@/lib/email";

export const runtime = "nodejs";

// POST /api/contact — public demo-request form (landing page). No auth.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const firstName = String(body?.firstName ?? "").trim();
    const email = String(body?.email ?? "").trim();
    // Honeypot: bots fill hidden fields; humans leave them empty.
    if (body?.website) return NextResponse.json({ ok: true });
    if (!firstName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Name and a valid work email are required." }, { status: 400 });
    }

    const to = process.env.CONTACT_EMAIL || process.env.FROM_EMAIL || "info@paynest.app";
    sendDemoRequest(to, {
      firstName,
      lastName: String(body?.lastName ?? "").trim(),
      email,
      company: String(body?.company ?? "").trim(),
      teamSize: String(body?.teamSize ?? "").trim(),
      message: String(body?.message ?? "").trim().slice(0, 2000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please email us directly." }, { status: 500 });
  }
}
