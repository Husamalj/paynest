import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/events?month=&year= — company events for the month. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year = parseInt(url.searchParams.get("year") || "0", 10);
    if (!month || !year) throw new HttpError(400, "Missing month or year");

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const events = await prisma.companyEvent.findMany({
      where: { companyId: session.companyId, eventDate: { gte: start, lte: end } },
      orderBy: { eventDate: "asc" },
    });
    return NextResponse.json(events.map((e) => ({ id: e.id, date: e.eventDate?.toISOString().substring(0, 10), title: e.title })));
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/events { date, title } */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { date, title } = await req.json();
    if (!date || !title?.trim()) throw new HttpError(400, "Date and title are required");
    const eventDate = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(eventDate.getTime())) throw new HttpError(400, "Invalid date");

    const ev = await prisma.companyEvent.create({
      data: { companyId: session.companyId, eventDate, title: title.trim() },
    });
    return NextResponse.json({ id: ev.id, date, title: ev.title });
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/events?id= */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const id = parseInt(new URL(req.url).searchParams.get("id") || "0", 10);
    if (!id) throw new HttpError(400, "Missing id");
    const r = await prisma.companyEvent.deleteMany({ where: { id, companyId: session.companyId } });
    if (r.count === 0) throw new HttpError(404, "Event not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
