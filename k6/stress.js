import http from "k6/http";
import { sleep } from "k6";
import { assertNonProductionLoad, BASE_URL, checkOk } from "./lib.js";

export const options = {
  stages: [
    { duration: "2m", target: 20 },
    { duration: "2m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.10"], http_req_duration: ["p(95)<5000"] },
};

export function setup() {
  assertNonProductionLoad();
}

export default function stressLoad() {
  checkOk(http.get(`${BASE_URL}/`), "homepage");
  checkOk(http.get(`${BASE_URL}/login`), "login");
  sleep(0.5);
}
