import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const FIELD_TYPES = ["text", "textarea", "number", "date", "file"];

// GET — company's custom request types. Employees see only active ones.
export async function GET(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const where: any = { companyId: s.companyId };
    if (s.role === "employee") where.active = true;
    const types = await prisma.requestType.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(types);
  } catch (e) { return errorResponse(e); }
}

// POST — HR/owner defines a new request type with custom fields.
export async function POST(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    requireRole(s, ["owner", "hr", "super_admin"]);
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const { name, fields } = await req.json();
    if (!name || !String(name).trim()) throw new HttpError(400, "Name is required");
    const cleanFields = (Array.isArray(fields) ? fields : [])
      .filter((f: any) => f && f.label && String(f.label).trim())
      .map((f: any, i: number) => ({
        key: String(f.key || `f${i + 1}`),
        label: String(f.label).trim(),
        type: FIELD_TYPES.includes(f.type) ? f.type : "text",
        required: !!f.required,
      }));
    const t = await prisma.requestType.create({
      data: { companyId: s.companyId, name: String(name).trim(), fields: cleanFields },
    });
    return NextResponse.json(t);
  } catch (e) { return errorResponse(e); }
}
