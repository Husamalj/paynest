import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDemoRequest } from "@/lib/email";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// POST /api/contact — public demo-request form (landing page). No auth.
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`contact:${getClientIp(req)}`, 5, 60 * 60_000);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const firstName = String(body?.firstName ?? "").trim();
    const email = String(body?.email ?? "").trim();
    // Honeypot: bots fill hidden fields; humans leave them empty.
    if (body?.website) return NextResponse.json({ ok: true });
    if (!firstName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Name and a valid work email are required." }, { status: 400 });
    }

    const data = {
      firstName,
      lastName: String(body?.lastName ?? "").trim() || null,
      email,
      company: String(body?.company ?? "").trim() || null,
      teamSize: String(body?.teamSize ?? "").trim() || null,
      message: String(body?.message ?? "").trim().slice(0, 2000) || null,
    };

    // Persist so it shows up in the super-admin inbox.
    await prisma.contactRequest.create({ data });

    // Also notify by email (best-effort).
    const to = process.env.CONTACT_EMAIL || process.env.FROM_EMAIL || "info@paynest.app";
    sendDemoRequest(to, {
      firstName, lastName: data.lastName ?? undefined, email,
      company: data.company ?? undefined, teamSize: data.teamSize ?? undefined, message: data.message ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please email us directly." }, { status: 500 });
  }
}

// GET /api/contact — super-admin inbox of demo requests.
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const rows = await prisma.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const unread = rows.filter((r) => !r.read).length;
    return NextResponse.json({ requests: rows, unread });
  } catch (err) {
    return errorResponse(err);
  }
}
