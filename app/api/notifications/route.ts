import { NextRequest } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 20, max: 50 });
    const where = {
      companyId: session.companyId!,
      OR: [{ userId: null }, { userId: session.id }],
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(pagination.enabled ? paginationQuery(pagination) : { take: pagination.limit }),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        companyId: session.companyId!,
        read: false,
        OR: [{ userId: null }, { userId: session.id }],
      },
    });

    const total = pagination.enabled ? await prisma.notification.count({ where }) : undefined;
    return withPaginationHeaders({ notifications, unreadCount }, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}
