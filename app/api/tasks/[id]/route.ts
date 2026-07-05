import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "tasks");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();

    if (session.role === "employee") {
      // An employee may update their own task OR a direct subordinate's task (progress/status)
      const me = await prisma.employee.findFirst({
        where: { employeeId: session.employeeNumber ?? "", companyId: session.companyId },
        select: { id: true },
      });
      const allowedIds = new Set<string>([session.employeeNumber ?? ""]);
      if (me) {
        const subs = await prisma.employee.findMany({
          where: {
            companyId: session.companyId,
            OR: [{ supervisorId: me.id }, { supervisorIds: { has: me.id } }],
          },
          select: { employeeId: true },
        });
        subs.forEach((s) => s.employeeId && allowedIds.add(s.employeeId));
      }
      const target = await prisma.task.findFirst({ where: { id: Number(id), companyId: session.companyId } });
      if (!target || !target.employeeId || !allowedIds.has(target.employeeId)) throw new HttpError(404, "Task not found");

      const empData: Record<string, unknown> = {};
      if (body.current_value !== undefined) empData.currentValue = Number(body.current_value) || 0;
      if (body.status !== undefined) empData.status = body.status;
      if (body.attachment !== undefined) { empData.attachment = body.attachment || null; empData.attachmentName = body.attachment_name || null; }
      if (body.report !== undefined) { empData.report = body.report || null; empData.reportAt = body.report ? new Date() : null; }
      if (Object.keys(empData).length === 0) empData.status = "completed";
      await prisma.task.update({ where: { id: Number(id) }, data: empData });
      return NextResponse.json(await prisma.task.findUnique({ where: { id: Number(id) } }));
    }

    const data: Record<string, unknown> = {};
    if (body.task_name !== undefined) data.taskName = body.task_name;
    if (body.employee_id !== undefined) data.employeeId = body.employee_id;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.target_value !== undefined) data.targetValue = body.target_value != null && body.target_value !== "" ? Number(body.target_value) : null;
    if (body.current_value !== undefined) data.currentValue = Number(body.current_value) || 0;
    if (body.unit !== undefined) data.unit = body.unit?.trim() || null;
    if (body.attachment !== undefined) { data.attachment = body.attachment || null; data.attachmentName = body.attachment_name || null; }

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
    await requirePageAccess(session, "tasks");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    await prisma.task.deleteMany({ where: { id: Number(id), companyId: session.companyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
