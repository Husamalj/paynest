import { describe, expect, it } from "vitest";
import { HttpError, requireRole, type SessionUser } from "@/lib/auth";
import { canViewProfile, canViewSensitive, roleRank } from "@/lib/hierarchy";

const user = (role: SessionUser["role"]): SessionUser => ({
  id: 1,
  name: "Test User",
  role,
  companyId: role === "super_admin" ? null : 1,
});

describe("requireRole", () => {
  it("allows users whose role is explicitly listed", () => {
    expect(() => requireRole(user("owner"), ["owner", "hr"])).not.toThrow();
    expect(() => requireRole(user("employee"), ["employee"])).not.toThrow();
  });

  it("rejects users whose role is not listed", () => {
    expect(() => requireRole(user("employee"), ["owner", "hr"])).toThrow(HttpError);
    try {
      requireRole(user("employee"), ["owner", "hr"]);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(403);
    }
  });
});

describe("role hierarchy permissions", () => {
  it("orders roles from employee to super admin", () => {
    expect(roleRank("employee")).toBeLessThan(roleRank("hr"));
    expect(roleRank("hr")).toBeLessThan(roleRank("owner"));
    expect(roleRank("owner")).toBeLessThan(roleRank("super_admin"));
  });

  it("allows higher roles to view lower profiles but not the reverse", () => {
    expect(canViewProfile("owner", "employee")).toBe(true);
    expect(canViewProfile("employee", "owner")).toBe(false);
  });

  it("limits sensitive profile data to HR or above", () => {
    expect(canViewSensitive("hr", "employee")).toBe(true);
    expect(canViewSensitive("employee", "employee")).toBe(false);
    expect(canViewSensitive("hr", "owner")).toBe(false);
  });
});
