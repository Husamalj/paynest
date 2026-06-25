import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// Editable fields accepted from the client (everything except ids/timestamps).
export const JOB_OFFER_FIELDS = [
  "name", "nationality", "phone1", "phone2", "nationalId", "qualifications",
  "experience", "offerDate", "trainingTitle", "sector", "trainingHours",
  "trainingPeriod", "agreementDuration", "agreementType", "agreementConditions",
  "grantFirst", "grantSecond", "noteSecond", "offerValidity", "joiningDate",
  "signatureDate", "fullName",
] as const;

function pickFields(body: any): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of JOB_OFFER_FIELDS) {
    const v = body?.[f];
    out[f] = v == null || v === "" ? null : String(v);
  }
  return out;
}

/** GET /api/job-offers → list this company's saved offers (summary fields). */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const offers = await prisma.jobOffer.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, trainingTitle: true, offerDate: true, createdAt: true },
    });
    return NextResponse.json(offers);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/job-offers → create a new offer. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const offer = await prisma.jobOffer.create({
      data: {
        companyId: session.companyId,
        createdBy: session.id,
        ...pickFields(body),
        values: body?.values ?? undefined,
      },
    });
    return NextResponse.json(offer);
  } catch (err) {
    return errorResponse(err);
  }
}
