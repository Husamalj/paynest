import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: true }); // don't reveal if email exists

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true },
    });

    if (user) {
      // Invalidate old tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://paynest.app"}/reset-password?token=${token}`;
      sendPasswordReset(email, resetUrl);
    }

    // Always return ok — don't leak whether email exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
