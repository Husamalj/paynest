import { describe, expect, it } from "vitest";
import { evaluateHealth, type HealthChecks } from "@/lib/health";

const optionalIntegrationsDisabled: HealthChecks = {
  database: "ok",
  jwt: "configured",
  email: "disabled",
  cron: "disabled",
  storage: "database-fallback",
};

describe("evaluateHealth", () => {
  it("keeps core health OK when optional integrations are unavailable", () => {
    expect(evaluateHealth(optionalIntegrationsDisabled)).toBe("ok");
  });

  it("degrades health when the database check fails", () => {
    expect(evaluateHealth({ ...optionalIntegrationsDisabled, database: "error" })).toBe("degraded");
  });

  it("degrades health when JWT configuration is missing", () => {
    expect(evaluateHealth({ ...optionalIntegrationsDisabled, jwt: "missing" })).toBe("degraded");
  });

  it("keeps configured optional integrations visible without changing core health", () => {
    expect(evaluateHealth({
      ...optionalIntegrationsDisabled,
      email: "configured",
      cron: "configured",
      storage: "configured",
    })).toBe("ok");
  });
});
