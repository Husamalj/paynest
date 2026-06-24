import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/messages?with=<employeeId> — the thread between me and that person.
// Privacy: only messages where I am the sender or the receiver are ever returned.
export async function GET(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const me = s.employeeNumber ?? "";
    if (!me) throw new HttpError(400, "No employee identity");
    const other = new URL(req.url).searchParams.get("with") || "";
    if (!other) throw new HttpError(400, "with is required");

    const msgs = await prisma.message.findMany({
      where: {
        companyId: s.companyId,
        OR: [
          { senderId: me, receiverId: other },
          { senderId: other, receiverId: me },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: { id: true, senderId: true, receiverId: true, body: true, attachmentName: true, createdAt: true, read: true },
    });

    // Mark the other person's messages to me as read.
    await prisma.message.updateMany({
      where: { companyId: s.companyId, senderId: other, receiverId: me, read: false },
      data: { read: true },
    });

    return NextResponse.json(
      msgs.map((m) => ({
        id: m.id,
        sender_id: m.senderId,
        receiver_id: m.receiverId,
        body: m.body,
        attachment_name: m.attachmentName,
        has_attachment: !!m.attachmentName,
        mine: m.senderId === me,
        created_at: m.createdAt,
      })),
    );
  } catch (err) {
    return errorResponse(err);
  }
}

// POST — send a message (text and/or attachment) to a company colleague.
export async function POST(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const me = s.employeeNumber ?? "";
    if (!me) throw new HttpError(400, "No employee identity");

    const { to, body, attachment, attachment_name } = await req.json();
    if (!to) throw new HttpError(400, "Recipient is required");
    if (!String(body || "").trim() && !attachment) throw new HttpError(400, "Empty message");

    // Recipient must be a real employee in the same company.
    const recipient = await prisma.employee.findFirst({
      where: { companyId: s.companyId, employeeId: String(to) },
      select: { id: true },
    });
    if (!recipient) throw new HttpError(404, "Recipient not found");

    const msg = await prisma.message.create({
      data: {
        companyId: s.companyId,
        senderId: me,
        receiverId: String(to),
        body: String(body || "").trim() || null,
        attachment: attachment || null,
        attachmentName: attachment_name || null,
      },
      select: { id: true, senderId: true, receiverId: true, body: true, attachmentName: true, createdAt: true },
    });

    return NextResponse.json({
      id: msg.id,
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      body: msg.body,
      attachment_name: msg.attachmentName,
      has_attachment: !!msg.attachmentName,
      mine: true,
      created_at: msg.createdAt,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
