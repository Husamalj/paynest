import http from "k6/http";
import { check, sleep } from "k6";

// ── Smoke test ──────────────────────────────────────────────────────────────
// Tiny load, just confirms the site is up and responding correctly.
// Run:  k6 run loadtest/smoke.js
// Override target:  k6 run -e BASE_URL=https://paynest.app loadtest/smoke.js

const BASE_URL = __ENV.BASE_URL || "https://paynest.app";

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],   // <1% of requests may fail
    http_req_duration: ["p(95)<1500"], // 95% of requests under 1.5s
  },
};

export default function () {
  // Landing page
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    "home status is 200": (r) => r.status === 200,
    "home not empty": (r) => r.body && r.body.length > 0,
  });

  // Login page (public)
  res = http.get(`${BASE_URL}/login`);
  check(res, {
    "login page reachable": (r) => r.status === 200 || r.status === 304,
  });

  sleep(1);
}
