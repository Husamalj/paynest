import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();

    if (session.role === "employee") {
      const task = await prisma.task.updateMany({
        where: { id: Number(id), companyId: session.companyId, employeeId: session.employeeNumber },
        data: { status: body.status ?? "completed" },
      });
      if (task.count === 0) throw new HttpError(404, "Task not found");
      return NextResponse.json(await prisma.task.findUnique({ where: { id: Number(id) } }));
    }

    const data: Record<string, unknown> = {};
    if (body.task_name !== undefined) data.taskName = body.task_name;
    if (body.employee_id !== undefined) data.employeeId = body.employee_id;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.status !== undefined) data.status = body.status;

    if (Object.keys(data).length === 0) throw new HttpError(400, "No fields to update");

    const task = await prisma.task.updateMany({
      where: { id: Number(id), companyId: session.companyId },
      data,
    });
    if (task.count === 0) throw new HttpError(404, "Task not found");
    return NextResponse.json(await prisma.task.findUnique({ where: { id: Number(id) } }));
  } catch (err) {
    return errorResponse(err);
  }
}

export { PUT as PATCH };

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    await prisma.task.deleteMany({ where: { id: Number(id), companyId: session.companyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
