import http from "k6/http";
import { sleep } from "k6";
import { assertNonProductionLoad, BASE_URL, checkOk } from "./lib.js";

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 10 },
    { duration: "1m", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.02"], http_req_duration: ["p(95)<1500"] },
};

export function setup() {
  assertNonProductionLoad();
}

export default function normalDayLoad() {
  checkOk(http.get(`${BASE_URL}/`), "homepage");
  checkOk(http.get(`${BASE_URL}/pricing`), "pricing");
  checkOk(http.get(`${BASE_URL}/contact`), "contact");
  sleep(1);
}
