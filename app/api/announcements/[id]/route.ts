import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "announcements");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.message !== undefined) data.message = body.message;
    if (body.published !== undefined) data.published = body.published;
    if (body.visible_to_employees !== undefined) data.visibleToEmployees = body.visible_to_employees;

    if (Object.keys(data).length === 0) throw new HttpError(400, "No fields to update");

    const result = await prisma.announcement.updateMany({
      where: { id: Number(id), companyId: session.companyId },
      data,
    });
    if (result.count === 0) throw new HttpError(404, "Announcement not found");
    return NextResponse.json(await prisma.announcement.findUnique({ where: { id: Number(id) } }));
  } catch (err) {
    return errorResponse(err);
  }
}

export { PUT as PATCH };

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "announcements");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    await prisma.announcement.deleteMany({ where: { id: Number(id), companyId: session.companyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
