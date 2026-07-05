import { describe, expect, it } from "vitest";
import { passwordPolicyMessage } from "@/lib/passwordPolicy";

describe("passwordPolicyMessage", () => {
  it("rejects short passwords", () => {
    expect(passwordPolicyMessage("Aa1!short")).toBe("Password must be at least 10 characters");
  });

  it("rejects common weak passwords", () => {
    expect(passwordPolicyMessage("Password123")).toBe("Password is too common");
  });

  it("requires mixed character types", () => {
    expect(passwordPolicyMessage("lowercase123!")).toBe("Password must include an uppercase letter");
    expect(passwordPolicyMessage("UPPERCASE123!")).toBe("Password must include a lowercase letter");
    expect(passwordPolicyMessage("NoNumberHere!")).toBe("Password must include a number");
    expect(passwordPolicyMessage("NoSymbol1234")).toBe("Password must include a symbol");
  });

  it("accepts a strong password", () => {
    expect(passwordPolicyMessage("PayNest2026!")).toBeNull();
  });
});
