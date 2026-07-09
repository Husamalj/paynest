import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePayrollRun } from "@/lib/payrollRunner";
import { errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function assertCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || header !== secret) throw new HttpError(401, "Unauthorized");
}

export async function POST(req: NextRequest) {
  try {
    assertCron(req);
    const job = await prisma.payrollJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return NextResponse.json({ processed: false, reason: "no queued jobs" });

    await prisma.payrollJob.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date(), error: null },
    });

    try {
      const result = await calculatePayrollRun({
        companyId: job.companyId,
        periodMonth: job.periodMonth,
        periodYear: job.periodYear,
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
      return NextResponse.json({ processed: true, job: updated });
    } catch (error: any) {
      const updated = await prisma.payrollJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Payroll job failed",
          finishedAt: new Date(),
        },
      });
      return NextResponse.json({ processed: true, job: updated }, { status: 500 });
    }
  } catch (err) {
    return errorResponse(err);
  }
}

export { POST as GET };
