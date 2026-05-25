import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const periodMonth = parseInt(url.searchParams.get("month") ?? "", 10);
    const periodYear = parseInt(url.searchParams.get("year") ?? "", 10);
    if (!periodMonth || !periodYear) throw new HttpError(400, "month and year are required");

    const companyId = session.companyId;
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";

    const [attRows, prRows] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          companyId,
          systemMode: mode,
          workDate: {
            gte: new Date(periodYear, periodMonth - 1, 1),
            lte: new Date(periodYear, periodMonth, 0),
          },
        },
        select: { employeeId: true },
        distinct: ["employeeId"],
      }),
      prisma.payrollRecord.findMany({
        where: {
          companyId,
          periodMonth,
          periodYear,
          systemMode: mode,
        },
        select: { employeeId: true },
        distinct: ["employeeId"],
      }),
    ]);

    const ids = new Set([
      ...attRows.map((r) => r.employeeId).filter(Boolean),
      ...prRows.map((r) => r.employeeId).filter(Boolean),
    ]);

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        employeeId: { in: [...ids] as string[] },
        systemMode: mode,
      },
      select: { employeeId: true, name: true },
    });

    return NextResponse.json(employees.filter((e) => e.employeeId));
  } catch (err) {
    return errorResponse(err);
  }
}
