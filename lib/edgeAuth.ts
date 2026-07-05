import { jwtVerify } from "jose";
import type { SessionUser } from "@/lib/auth";

const encodedSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyJwtEdge(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, encodedSecret());
  return payload as unknown as SessionUser;
}
