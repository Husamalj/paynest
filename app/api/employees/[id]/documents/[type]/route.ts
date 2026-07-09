import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { deleteStoredFile, readStoredFile } from "@/lib/fileStorage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id, type } = await params;

    const doc = await prisma.employeeDocument.findFirst({
      where: { employeeId: id, companyId: session.companyId, documentType: type },
      select: { fileData: true, fileName: true, fileUrl: true, fileStorageKey: true, mimeType: true },
    });
    if (!doc) throw new HttpError(404, "Document not found");

    let mime = doc.mimeType || "application/octet-stream";
    let buffer: Buffer;
    if (doc.fileStorageKey || doc.fileUrl) {
      const stored = await readStoredFile(doc.fileStorageKey || doc.fileUrl || "");
      if (!stored) throw new HttpError(502, "Stored file could not be fetched");
      buffer = stored.bytes;
      mime = stored.contentType || mime;
    } else {
      const match = (doc.fileData ?? "").match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new HttpError(500, "Stored file is malformed");
      mime = match[1];
      buffer = Buffer.from(match[2], "base64");
    }

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
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id, type } = await params;

    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: id, companyId: session.companyId, documentType: type },
      select: { fileStorageKey: true },
    });
    const result = await prisma.employeeDocument.deleteMany({
      where: { employeeId: id, companyId: session.companyId, documentType: type },
    });
    if (result.count === 0) throw new HttpError(404, "Document not found");
    await Promise.all(docs.map((doc) => deleteStoredFile(doc.fileStorageKey)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
