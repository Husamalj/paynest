import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    if (!session.employeeNumber) throw new HttpError(404, "Employee number not found");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const mode = settings?.systemMode ?? "daily";

    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: session.employeeNumber,
        companyId: session.companyId,
        systemMode: mode,
      },
    });
    if (!employee) throw new HttpError(404, "Employee not found");

    return NextResponse.json(employee);
  } catch (err) {
    return errorResponse(err);
  }
}
