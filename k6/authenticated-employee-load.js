import http from "k6/http";
import { sleep } from "k6";
import { assertNonProductionLoad, BASE_URL, checkOk, login } from "./lib.js";

export const options = {
  vus: 5,
  duration: "3m",
  thresholds: { http_req_failed: ["rate<0.02"], http_req_duration: ["p(95)<1500"] },
};

export function setup() {
  assertNonProductionLoad();
  return { headers: login() };
}

export default function authenticatedEmployeeLoad(data) {
  checkOk(http.get(`${BASE_URL}/api/auth/me`, { headers: data.headers }), "auth/me");
  checkOk(http.get(`${BASE_URL}/api/payroll/my`, { headers: data.headers }), "payroll/my");
  checkOk(http.get(`${BASE_URL}/api/leaves`, { headers: data.headers }), "leaves");
  sleep(1);
}
