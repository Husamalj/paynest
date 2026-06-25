// Company role hierarchy. Higher rank = more authority / more visibility.
//   super_admin (platform) > owner > hr > employee
// Used to decide who can view whose profile and sensitive details.

export type Role = "super_admin" | "owner" | "hr" | "employee" | string;

const RANK: Record<string, number> = {
  super_admin: 4,
  owner: 3,
  hr: 2,
  employee: 1,
};

export function roleRank(role: Role | null | undefined): number {
  return RANK[String(role || "employee")] ?? 1;
}

export function roleLabel(role: Role | null | undefined, ar = false): string {
  switch (String(role || "employee")) {
    case "super_admin": return ar ? "مدير النظام" : "Super Admin";
    case "owner": return ar ? "المالك" : "Owner";
    case "hr": return ar ? "موارد بشرية" : "HR";
    default: return ar ? "موظف" : "Employee";
  }
}

/**
 * Can a viewer see the target's profile/contact details?
 * Rule: you may view peers and anyone below you, never anyone above you.
 * (Viewing yourself is always allowed and handled by the caller.)
 */
export function canViewProfile(viewerRole: Role, targetRole: Role): boolean {
  return roleRank(viewerRole) >= roleRank(targetRole);
}

/**
 * Can a viewer see sensitive HR data (salary, social security, leave)?
 * Must be HR or above, AND at or above the target's rank.
 */
export function canViewSensitive(viewerRole: Role, targetRole: Role): boolean {
  return roleRank(viewerRole) >= roleRank("hr") && roleRank(viewerRole) >= roleRank(targetRole);
}
