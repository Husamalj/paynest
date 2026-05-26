import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: id, companyId: session.companyId },
      select: { id: true, documentType: true, fileName: true, uploadedAt: true },
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
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file || !documentType) throw new HttpError(400, "file and documentType are required");

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const fileData = `data:${file.type};base64,${base64}`;

    // Upsert — one document per type per employee
    const existing = await prisma.employeeDocument.findFirst({
      where: { employeeId: id, companyId: session.companyId, documentType },
    });

    let doc;
    if (existing) {
      doc = await prisma.employeeDocument.update({
        where: { id: existing.id },
        data: { fileName: file.name, fileData, uploadedAt: new Date() },
      });
    } else {
      doc = await prisma.employeeDocument.create({
        data: {
          companyId: session.companyId,
          employeeId: id,
          documentType,
          fileName: file.name,
          fileData,
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
    await prisma.employeeDocument.deleteMany({
      where: { employeeId: id, companyId: session.companyId, documentType },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
