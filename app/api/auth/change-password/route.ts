import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";
import { passwordPolicyMessage } from "@/lib/passwordPolicy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { currentPassword, newPassword } = await req.json();
    const passwordError = passwordPolicyMessage(newPassword);
    if (passwordError) throw new HttpError(400, passwordError);

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) throw new HttpError(404, "User not found");

    if (!user.mustChangePassword) {
      if (!currentPassword) throw new HttpError(400, "Current and new password are required");
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) throw new HttpError(400, "Current password is incorrect");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export { POST as PUT };
