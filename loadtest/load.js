import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";

// ── Load / stress test ──────────────────────────────────────────────────────
// Ramps virtual users up and down to confirm the site does NOT drop or hang
// under sustained concurrent traffic.
//
// Run (public pages only):
//   k6 run loadtest/load.js
//
// Run with an authenticated login flow (recommended — exercises the DB):
//   k6 run -e BASE_URL=https://paynest.app \
//          -e EMAIL=you@example.com -e PASSWORD=yourpass \
//          loadtest/load.js
//
// Tune intensity with -e PEAK_VUS=50 (default 20).

const BASE_URL  = __ENV.BASE_URL  || "https://paynest.app";
const EMAIL     = __ENV.EMAIL     || "";
const PASSWORD  = __ENV.PASSWORD  || "";
const PEAK_VUS  = parseInt(__ENV.PEAK_VUS || "20", 10);

const loginErrors = new Rate("login_errors");

export const options = {
  // Ramp: warm up → hold at peak → cool down. Watching for drops/hangs.
  stages: [
    { duration: "30s", target: Math.ceil(PEAK_VUS / 2) }, // warm up
    { duration: "1m",  target: PEAK_VUS },                 // ramp to peak
    { duration: "2m",  target: PEAK_VUS },                 // hold (soak)
    { duration: "30s", target: 0 },                        // cool down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.02"],   // <2% failures overall
    http_req_duration: ["p(95)<2500"],  // 95% under 2.5s
    login_errors:      ["rate<0.05"],   // <5% login failures
    checks:            ["rate>0.95"],   // >95% of checks pass
  },
};

export default function () {
  group("public pages", function () {
    const res = http.get(`${BASE_URL}/`, { tags: { name: "home" } });
    check(res, { "home 200": (r) => r.status === 200 });
    sleep(1);
  });

  if (EMAIL && PASSWORD) {
    group("auth flow", function () {
      const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: EMAIL, password: PASSWORD }),
        { headers: { "Content-Type": "application/json" }, tags: { name: "login" } }
      );
      const ok = check(res, {
        "login 200": (r) => r.status === 200,
        "got token": (r) => {
          try { return !!r.json("token"); } catch { return false; }
        },
      });
      loginErrors.add(!ok);

      // If logged in, hit an authenticated endpoint to load the DB path.
      if (ok) {
        let token;
        try { token = res.json("token"); } catch { token = null; }
        if (token) {
          const auth = { headers: { Authorization: `Bearer ${token}` }, tags: { name: "me" } };
          const me = http.get(`${BASE_URL}/api/auth/me`, auth);
          check(me, { "me reachable": (r) => r.status === 200 });
        }
      }
      sleep(1);
    });
  }
}
