import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/employees/[id]/documents/[type]
 * Returns the actual stored file as a binary response — used by the UI
 * for download/preview. Stored as base64 data URL in fileData.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id, type } = await params;

    const doc = await prisma.employeeDocument.findFirst({
      where: { employeeId: id, companyId: session.companyId, documentType: type },
      select: { fileData: true, fileName: true },
    });
    if (!doc) throw new HttpError(404, "Document not found");

    // fileData is stored as "data:mime;base64,...."
    const data = doc.fileData ?? "";
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new HttpError(500, "Stored file is malformed");
    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const safeName = encodeURIComponent(doc.fileName ?? "document");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id, type } = await params;
    const result = await prisma.employeeDocument.deleteMany({
      where: { employeeId: id, companyId: session.companyId, documentType: type },
    });
    if (result.count === 0) throw new HttpError(404, "Document not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
