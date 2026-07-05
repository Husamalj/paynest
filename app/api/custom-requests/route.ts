import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// GET — HR/owner see all company submissions; employees see their own.
export async function GET(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    await requirePageAccess(s, "customRequests");
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const where: any = { companyId: s.companyId };
    if (s.role === "employee") where.employeeId = s.employeeNumber ?? "__none__";
    const rows = await prisma.customRequest.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(rows);
  } catch (e) { return errorResponse(e); }
}

// POST — employee submits a custom request.
export async function POST(req: NextRequest) {
  try {
    const s = await requireAuth(req);
    requireRole(s, ["employee"]);
    await requirePageAccess(s, "customRequests");
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const { request_type_id, values } = await req.json();
    if (!request_type_id) throw new HttpError(400, "request_type_id is required");

    const type = await prisma.requestType.findFirst({
      where: { id: Number(request_type_id), companyId: s.companyId, active: true },
    });
    if (!type) throw new HttpError(404, "Request type not found");

    // Validate required fields are present.
    const fields = (type.fields as any[]) || [];
    const vals = (values && typeof values === "object") ? values : {};
    for (const f of fields) {
      if (f.required && (vals[f.key] == null || String(vals[f.key]).trim() === "")) {
        throw new HttpError(400, `Field "${f.label}" is required`);
      }
    }

    const emp = await prisma.employee.findFirst({
      where: { employeeId: s.employeeNumber ?? "", companyId: s.companyId },
      select: { name: true },
    });

    const row = await prisma.customRequest.create({
      data: {
        companyId: s.companyId,
        requestTypeId: type.id,
        typeName: type.name,
        employeeId: s.employeeNumber ?? null,
        employeeName: emp?.name ?? s.name,
        values: vals,
      },
    });
    return NextResponse.json(row);
  } catch (e) { return errorResponse(e); }
}
