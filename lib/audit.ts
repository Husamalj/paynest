import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export type AuditAction = "create" | "update" | "delete" | "approve" | "reject" | "upload" | "calculate";
export type AuditEntity =
  | "employee"
  | "settings"
  | "bonus"
  | "leave"
  | "task"
  | "supervisor"
  | "evaluation"
  | "announcement"
  | "holiday"
  | "attendance"
  | "company"
  | "payroll"
  | "upload"
  | "user";

export function auditMetaFromRequest(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  return {
    ip,
    userAgent: userAgent.slice(0, 500),
  };
}

export function withAuditMeta(
  req: Request,
  changes?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    ...(changes ?? {}),
    _meta: auditMetaFromRequest(req),
  };
}

/**
 * Best-effort audit log writer. Never throws — audit failures should not
 * break the main API path. Caller is expected to await but tolerate undefined.
 */
export async function logAudit(
  session: SessionUser | null | undefined,
  action: AuditAction,
  entity: AuditEntity,
  entityId?: string | number | null,
  changes?: Record<string, unknown> | null,
): Promise<void> {
  try {
    if (!session?.companyId) return; // super_admin actions without companyId still skipped
    await prisma.auditLog.create({
      data: {
        companyId: session.companyId,
        userId: session.id,
        userName: session.name ?? null,
        userRole: session.role ?? null,
        action,
        entity,
        entityId: entityId == null ? null : String(entityId),
        changes: (changes ?? undefined) as any,
      },
    });
  } catch {
    // swallow - auditing must never block the user flow
  }
}

export async function logAuditForCompany(
  session: SessionUser | null | undefined,
  companyId: number | null | undefined,
  action: AuditAction,
  entity: AuditEntity,
  entityId?: string | number | null,
  changes?: Record<string, unknown> | null,
): Promise<void> {
  try {
    if (!session || !companyId) return;
    await prisma.auditLog.create({
      data: {
        companyId,
        userId: session.id,
        userName: session.name ?? null,
        userRole: session.role ?? null,
        action,
        entity,
        entityId: entityId == null ? null : String(entityId),
        changes: (changes ?? undefined) as any,
      },
    });
  } catch {
    // swallow — auditing must never block the user flow
  }
}

/** Compute the field-level diff between two objects. */
export function diff(before: any, after: any): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = { from: a, to: b };
    }
  }
  return out;
}
