import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { calculatePayrollRun } from "@/lib/payrollRunner";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "payroll");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id") || "0");
    const pagination = parsePagination(url, { limit: 20, max: 100 });
    const where = id
      ? { id, companyId: session.companyId }
      : { companyId: session.companyId };

    const jobs = await prisma.payrollJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(id ? { take: 1 } : pagination.enabled ? paginationQuery(pagination) : { take: pagination.limit }),
    });
    if (id) return NextResponse.json(jobs[0] ?? null);

    const total = pagination.enabled ? await prisma.payrollJob.count({ where }) : undefined;
    return withPaginationHeaders(jobs, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  let jobId: number | null = null;
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "payroll");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const now = new Date();
    const periodMonth = Number(body.month) || now.getMonth() + 1;
    const periodYear = Number(body.year) || now.getFullYear();

    const settings = await prisma.companySettings.findFirst({
      where: { companyId: session.companyId },
      select: { systemMode: true },
    });

    const job = await prisma.payrollJob.create({
      data: {
        companyId: session.companyId,
        requestedBy: session.id,
        periodMonth,
        periodYear,
        systemMode: settings?.systemMode ?? "daily",
        status: "running",
        startedAt: new Date(),
      },
    });
    jobId = job.id;

    const result = await calculatePayrollRun({
      companyId: session.companyId,
      requestedBy: session,
      periodMonth,
      periodYear,
      onProgress: async (processedRows, totalRows) => {
        await prisma.payrollJob.update({
          where: { id: job.id },
          data: { processedRows, totalRows },
        });
      },
    });

    const updated = await prisma.payrollJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        processedRows: result.summary.employee_count,
        totalRows: result.summary.employee_count,
        resultSummary: result.summary,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      job: updated,
      period_month: result.period_month,
      period_year: result.period_year,
      system_mode: result.system_mode,
      results: result.results,
    });
  } catch (err: any) {
    if (jobId != null) {
      await prisma.payrollJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : "Payroll job failed",
          finishedAt: new Date(),
        },
      }).catch(() => {});
    }
    return errorResponse(err);
  }
}
