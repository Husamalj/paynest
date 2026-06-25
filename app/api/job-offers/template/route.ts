import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/job-offers/template → this company's offer template (or null).
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const tpl = await prisma.jobOfferTemplate.findUnique({
      where: { companyId: session.companyId },
    });
    return NextResponse.json(tpl ?? null);
  } catch (err) {
    return errorResponse(err);
  }
}

// PUT /api/job-offers/template → create or replace the company template.
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    // `image` column stores the uploaded Word (.docx) template as a data URI.
    const image = typeof body?.image === "string" ? body.image : "";
    const fields = Array.isArray(body?.fields) ? body.fields : [];
    if (!image.startsWith("data:")) throw new HttpError(400, "Template file required");

    const tpl = await prisma.jobOfferTemplate.upsert({
      where: { companyId: session.companyId },
      create: { companyId: session.companyId, image, fields },
      update: { image, fields },
    });
    return NextResponse.json(tpl);
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/job-offers/template → remove the company template.
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    await prisma.jobOfferTemplate.deleteMany({ where: { companyId: session.companyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
