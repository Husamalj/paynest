import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { readStoredFile } from "@/lib/fileStorage";

export const runtime = "nodejs";

/**
 * GET /api/upload/[id]/download
 * Returns the original uploaded file so HR can recover a lost local copy.
 * New files live in external storage when configured; old files may still use
 * the legacy base64 database column.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "upload");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { id } = await params;
    const file = await prisma.uploadedFile.findFirst({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (!file) throw new HttpError(404, "File not found");
    const name = file.originalName || file.filename || `file-${file.id}.xlsx`;
    let bytes: Buffer;

    if (file.fileStorageKey || file.fileUrl) {
      const stored = await readStoredFile(file.fileStorageKey || file.fileUrl || "");
      if (!stored) throw new HttpError(502, "Stored file could not be fetched");
      bytes = stored.bytes;
    } else if (file.fileData) {
      bytes = Buffer.from(file.fileData, "base64");
    } else {
      throw new HttpError(410, "Original file was not stored for this upload");
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
