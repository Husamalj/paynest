import http from "k6/http";
import { checkOk, BASE_URL } from "./lib.js";

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<1000"] },
};

export default function homepageSmoke() {
  checkOk(http.get(`${BASE_URL}/`), "homepage loads");
}
