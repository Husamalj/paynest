import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "true";

    let where: any = { companyId: session.companyId };
    if (session.role === "employee") {
      where = { ...where, published: true, visibleToEmployees: true };
    } else if (!all) {
      where = { ...where, published: true };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(announcements);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { title, message, published, visible_to_employees } = await req.json();
    if (!title || !message) throw new HttpError(400, "Title and message are required");

    const announcement = await prisma.announcement.create({
      data: {
        companyId: session.companyId,
        title,
        message,
        published: published ?? false,
        visibleToEmployees: visible_to_employees !== false,
      },
    });
    return NextResponse.json(announcement);
  } catch (err) {
    return errorResponse(err);
  }
}
