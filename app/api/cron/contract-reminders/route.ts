import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily scan: for every company, find employees whose contract ends within the
 * next 30 days and create a deduplicated "contract_expiry" notification for HR.
 *
 * Triggered by the Vercel cron defined in vercel.json. Protected by CRON_SECRET
 * when that env var is set (Vercel sends it as the Authorization header).
 */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);

    const employees = await prisma.employee.findMany({
      where: { contractEndDate: { gte: today, lte: horizon } },
      select: { id: true, companyId: true, name: true, employeeId: true, contractEndDate: true },
    });

    let created = 0;
    for (const emp of employees) {
      if (!emp.contractEndDate) continue;
      const endStr = emp.contractEndDate.toISOString().substring(0, 10);
      const days = Math.ceil((emp.contractEndDate.getTime() - today.getTime()) / 86400000);

      // Dedup: one notification per employee per contract-end date.
      const existing = await prisma.notification.findFirst({
        where: {
          companyId: emp.companyId,
          type: "contract_expiry",
          message: { contains: `#${emp.employeeId ?? emp.id}|${endStr}` },
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          companyId: emp.companyId,
          type: "contract_expiry",
          message: `Contract for ${emp.name} ends in ${days} day(s) on ${endStr}. #${emp.employeeId ?? emp.id}|${endStr}`,
          link: "/employees",
        },
      });
      created++;
    }

    return NextResponse.json({ scanned: employees.length, created });
  } catch (err: any) {
    console.error("[contract-reminders]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
