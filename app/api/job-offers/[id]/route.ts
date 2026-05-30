import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { JOB_OFFER_FIELDS } from "../route";

export const runtime = "nodejs";

function pickFields(body: any): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of JOB_OFFER_FIELDS) {
    const v = body?.[f];
    out[f] = v == null || v === "" ? null : String(v);
  }
  return out;
}

/** GET /api/job-offers/[id] → fetch a single offer (company-scoped). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const offer = await prisma.jobOffer.findFirst({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (!offer) throw new HttpError(404, "Offer not found");
    return NextResponse.json(offer);
  } catch (err) {
    return errorResponse(err);
  }
}

/** PUT /api/job-offers/[id] → update an offer. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const existing = await prisma.jobOffer.findFirst({
      where: { id: Number(id), companyId: session.companyId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Offer not found");

    const body = await req.json();
    const offer = await prisma.jobOffer.update({
      where: { id: Number(id) },
      data: pickFields(body),
    });
    return NextResponse.json(offer);
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/job-offers/[id] → delete an offer. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const result = await prisma.jobOffer.deleteMany({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (result.count === 0) throw new HttpError(404, "Offer not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
