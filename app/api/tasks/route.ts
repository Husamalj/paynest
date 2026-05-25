import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const where: any = { companyId: session.companyId };
    if (session.role === "employee") {
      where.employeeId = session.employeeNumber;
    }

    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(tasks);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { task_name, employee_id, deadline, status } = await req.json();
    if (!task_name || !employee_id) throw new HttpError(400, "Task name and employee are required");

    const task = await prisma.task.create({
      data: {
        companyId: session.companyId,
        taskName: task_name,
        employeeId: employee_id,
        deadline: deadline ? new Date(deadline) : null,
        status: status ?? "pending",
      },
    });
    return NextResponse.json(task);
  } catch (err) {
    return errorResponse(err);
  }
}
