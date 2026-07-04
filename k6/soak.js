import http from "k6/http";
import { sleep } from "k6";
import { assertNonProductionLoad, BASE_URL, checkOk, login } from "./lib.js";

export const options = {
  vus: 10,
  duration: "30m",
  thresholds: { http_req_failed: ["rate<0.03"], http_req_duration: ["p(95)<2000"] },
};

export function setup() {
  assertNonProductionLoad();
  return { headers: login() };
}

export default function soakLoad(data) {
  checkOk(http.get(`${BASE_URL}/api/auth/me`, { headers: data.headers }), "auth/me");
  checkOk(http.get(`${BASE_URL}/api/announcements`, { headers: data.headers }), "announcements");
  checkOk(http.get(`${BASE_URL}/api/tasks`, { headers: data.headers }), "tasks");
  sleep(5);
}
