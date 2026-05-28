import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const notifications = await prisma.notification.findMany({
      where: {
        companyId: session.companyId!,
        OR: [{ userId: null }, { userId: session.id }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        companyId: session.companyId!,
        read: false,
        OR: [{ userId: null }, { userId: session.id }],
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return errorResponse(err);
  }
}
