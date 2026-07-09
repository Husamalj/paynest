import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { deleteStoredFile, storeFile } from "@/lib/fileStorage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: id, companyId: session.companyId },
      select: { id: true, documentType: true, fileName: true, uploadedAt: true, fileUrl: true },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "employeeManagement");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file || !documentType) throw new HttpError(400, "file and documentType are required");

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile({
      companyId: session.companyId,
      area: `employees/${encodeURIComponent(id)}/documents`,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });
    const fileData = stored.base64
      ? `data:${file.type || "application/octet-stream"};base64,${stored.base64}`
      : null;

    // Upsert — one document per type per employee
    const existing = await prisma.employeeDocument.findFirst({
      where: { employeeId: id, companyId: session.companyId, documentType },
    });

    let doc;
    if (existing) {
      if (existing.fileStorageKey && existing.fileStorageKey !== stored.key) {
        await deleteStoredFile(existing.fileStorageKey);
      }
      doc = await prisma.employeeDocument.update({
        where: { id: existing.id },
        data: {
          fileName: file.name,
          fileData,
          fileUrl: stored.url,
          fileStorageKey: stored.key,
          mimeType: file.type || "application/octet-stream",
          uploadedAt: new Date(),
        },
      });
    } else {
      doc = await prisma.employeeDocument.create({
        data: {
          companyId: session.companyId,
          employeeId: id,
          documentType,
          fileName: file.name,
          fileData,
          fileUrl: stored.url,
          fileStorageKey: stored.key,
          mimeType: file.type || "application/octet-stream",
        },
      });
    }

    return NextResponse.json({ id: doc.id, documentType: doc.documentType, fileName: doc.fileName, uploadedAt: doc.uploadedAt });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const { documentType } = await req.json();
    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: id, companyId: session.companyId, documentType },
      select: { fileStorageKey: true },
    });
    await prisma.employeeDocument.deleteMany({
      where: { employeeId: id, companyId: session.companyId, documentType },
    });
    await Promise.all(docs.map((doc) => deleteStoredFile(doc.fileStorageKey)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
