export type HealthChecks = {
  database: string;
  jwt: string;
  email: string;
  cron: string;
  storage: string;
};

export type HealthStatus = "ok" | "degraded";

export function evaluateHealth(checks: HealthChecks): HealthStatus {
  return checks.database === "ok" && checks.jwt === "configured"
    ? "ok"
    : "degraded";
}
