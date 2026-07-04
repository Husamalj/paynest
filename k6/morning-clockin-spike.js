import http from "k6/http";
import { assertNonProductionLoad, BASE_URL, login } from "./lib.js";

export const options = {
  stages: [
    { duration: "20s", target: 25 },
    { duration: "40s", target: 25 },
    { duration: "20s", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.10"], http_req_duration: ["p(95)<2000"] },
};

export function setup() {
  assertNonProductionLoad();
  return { headers: login() };
}

export default function morningClockInSpike(data) {
  http.post(`${BASE_URL}/api/attendance/checkin`, JSON.stringify({ action: "in" }), { headers: data.headers });
}
