import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET — people in my company I can chat with, with unread count + last message.
export async function GET(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    await requirePageAccess(s, "messages");
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const me = s.employeeNumber ?? "";

    const employees = await prisma.employee.findMany({
      where: { companyId: s.companyId, employeeId: { not: null } },
      distinct: ["employeeId"],
      select: { employeeId: true, name: true },
    });

    const msgs = me
      ? await prisma.message.findMany({
          where: { companyId: s.companyId, OR: [{ senderId: me }, { receiverId: me }] },
          orderBy: { createdAt: "desc" },
          take: 400,
          select: { senderId: true, receiverId: true, body: true, attachmentName: true, createdAt: true, read: true },
        })
      : [];

    const last: Record<string, { at: Date; body: string }> = {};
    const unread: Record<string, number> = {};
    for (const m of msgs) {
      const other = m.senderId === me ? m.receiverId : m.senderId;
      if (!last[other]) last[other] = { at: m.createdAt, body: m.body || (m.attachmentName ? "📎" : "") };
      if (m.receiverId === me && !m.read) unread[other] = (unread[other] || 0) + 1;
    }

    const list = employees
      .filter((e) => e.employeeId && e.employeeId !== me)
      .map((e) => ({
        employee_id: e.employeeId,
        name: e.name,
        unread: unread[e.employeeId!] || 0,
        last_body: last[e.employeeId!]?.body ?? null,
        last_at: last[e.employeeId!]?.at ?? null,
      }))
      .sort((a, b) => {
        if (a.last_at && b.last_at) return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        if (a.last_at) return -1;
        if (b.last_at) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

    return NextResponse.json(list);
  } catch (err) {
    return errorResponse(err);
  }
}
