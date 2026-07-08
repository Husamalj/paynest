import http from "k6/http";
import { check, fail } from "k6";

export const BASE_URL = __ENV.K6_BASE_URL || "http://127.0.0.1:3000";

export function assertNonProductionLoad() {
  let hostname = "";
  try {
    hostname = new URL(BASE_URL).hostname.toLowerCase();
  } catch {
    fail(`K6_BASE_URL is not a valid URL: ${BASE_URL}`);
  }

  const productionHostnames = new Set(["paynest.app", "www.paynest.app"]);
  const productionLikeTarget = productionHostnames.has(hostname);
  const allowedNonProduction = /staging|preview|localhost|127\.0\.0\.1|test/i.test(BASE_URL);

  if (productionLikeTarget && __ENV.K6_ALLOW_PRODUCTION !== "true") {
    fail(`Refusing to run load test against production without K6_ALLOW_PRODUCTION=true: ${BASE_URL}`);
  }

  if (!allowedNonProduction && !productionLikeTarget) {
    fail(`Refusing to run load test against non-staging target: ${BASE_URL}`);
  }
}

export function login(email = __ENV.K6_EMPLOYEE_EMAIL, password = __ENV.K6_EMPLOYEE_PASSWORD) {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(response, { "login ok": (res) => res.status === 200 });
  const token = response.json("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export function checkOk(response, name = "status is 2xx/3xx") {
  return check(response, { [name]: (res) => res.status >= 200 && res.status < 400 });
}
