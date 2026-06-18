import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Clears the httpOnly auth cookie. This is the practical "revoke on logout":
// the credential is removed from the browser immediately.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
