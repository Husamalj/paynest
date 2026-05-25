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

    const assignments = await prisma.remoteAssignment.findMany({
      where: { employeeId: id, companyId: session.companyId },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(assignments);
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
    const { start_date, end_date, note, label } = await req.json();

    const existing = await prisma.remoteAssignment.findFirst({
      where: {
        employeeId: id,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        companyId: session.companyId,
      },
    });
    if (existing) return NextResponse.json(existing);

    const assignment = await prisma.remoteAssignment.create({
      data: {
        employeeId: id,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        note: note ?? null,
        label: label ?? null,
        companyId: session.companyId,
      },
    });
    return NextResponse.json(assignment);
  } catch (err) {
    return errorResponse(err);
  }
}
