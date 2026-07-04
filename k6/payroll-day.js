import http from "k6/http";
import { sleep } from "k6";
import { assertNonProductionLoad, BASE_URL, checkOk, login } from "./lib.js";

export const options = {
  vus: 3,
  duration: "2m",
  thresholds: { http_req_failed: ["rate<0.05"], http_req_duration: ["p(95)<3000"] },
};

export function setup() {
  assertNonProductionLoad();
  return { headers: login(__ENV.K6_OWNER_EMAIL, __ENV.K6_OWNER_PASSWORD) };
}

export default function payrollDay(data) {
  checkOk(http.get(`${BASE_URL}/api/payroll/latest`, { headers: data.headers }), "payroll latest");
  checkOk(http.get(`${BASE_URL}/api/payroll/history`, { headers: data.headers }), "payroll history");
  checkOk(http.get(`${BASE_URL}/api/payroll/period?month=6&year=2026`, { headers: data.headers }), "payroll period");
  sleep(1);
}
