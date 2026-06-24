import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET — download a message attachment. Only the sender or receiver may fetch it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireAuth(req);
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const me = s.employeeNumber ?? "";
    const { id } = await params;

    const m = await prisma.message.findFirst({
      where: { id: Number(id), companyId: s.companyId },
    });
    if (!m || (m.senderId !== me && m.receiverId !== me)) throw new HttpError(404, "Not found");
    if (!m.attachment) throw new HttpError(404, "No attachment");

    const comma = m.attachment.indexOf(",");
    const meta = m.attachment.slice(0, comma);
    const b64 = m.attachment.slice(comma + 1);
    const type = /data:([^;]+)/.exec(meta)?.[1] || "application/octet-stream";
    const bytes = Buffer.from(b64, "base64");
    const name = m.attachmentName || `file-${m.id}`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
