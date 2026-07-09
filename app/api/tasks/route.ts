import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "tasks");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const status = url.searchParams.get("status");
    const where: any = { companyId: session.companyId };
    if (status) where.status = status;
    if (session.role === "employee") {
      // Own tasks + tasks of direct subordinates (so a supervisor sees & tracks team targets)
      const me = await prisma.employee.findFirst({
        where: { employeeId: session.employeeNumber ?? "", companyId: session.companyId },
        select: { id: true },
      });
      const subEmpIds = me
        ? (
            await prisma.employee.findMany({
              where: {
                companyId: session.companyId,
                OR: [{ supervisorId: me.id }, { supervisorIds: { has: me.id } }],
              },
              select: { employeeId: true },
            })
          )
            .map((e) => e.employeeId)
            .filter(Boolean)
        : [];
      where.employeeId = { in: [session.employeeNumber, ...subEmpIds].filter(Boolean) as string[] };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, ...paginationQuery(pagination) }),
      pagination.enabled ? prisma.task.count({ where }) : Promise.resolve(undefined),
    ]);
    return withPaginationHeaders(tasks, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "tasks");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { task_name, employee_id, start_date, deadline, status, target_value, unit, attachment, attachment_name, priority } = await req.json();
    if (!task_name || !employee_id) throw new HttpError(400, "Task name and employee are required");
    const pri = ["urgent", "high", "medium", "low"].includes(priority) ? priority : "medium";

    // Employees can only assign tasks to their direct subordinates
    if (session.role === "employee") {
      const supervisor = await prisma.employee.findFirst({
        where: { employeeId: session.employeeNumber ?? "", companyId: session.companyId },
        select: { id: true },
      });
      if (!supervisor) throw new HttpError(403, "Supervisor record not found");

      const subordinate = await prisma.employee.findFirst({
        where: {
          employeeId: employee_id,
          companyId: session.companyId,
          OR: [
            { supervisorId: supervisor.id },
            { supervisorIds: { has: supervisor.id } },
          ],
        },
      });
      if (!subordinate) throw new HttpError(403, "You can only assign tasks to your direct subordinates");
    }

    const task = await prisma.task.create({
      data: {
        companyId: session.companyId,
        taskName: task_name,
        employeeId: employee_id,
        startDate: start_date ? new Date(start_date) : null,
        deadline: deadline ? new Date(deadline) : null,
        status: status ?? "pending",
        priority: pri,
        targetValue: target_value != null && target_value !== "" ? Number(target_value) : null,
        unit: unit?.trim() || null,
        attachment: attachment || null,
        attachmentName: attachment_name || null,
      },
    });
    return NextResponse.json(task);
  } catch (err) {
    return errorResponse(err);
  }
}
