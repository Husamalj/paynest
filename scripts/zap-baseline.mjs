#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const target = process.env.ZAP_TARGET || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const failOnWarn = process.env.ZAP_FAIL_ON_WARN === "true";

let hostname = "";
try {
  hostname = new URL(target).hostname.toLowerCase();
} catch {
  console.error(`ZAP_TARGET is not a valid URL: ${target}`);
  process.exit(1);
}

const productionHostnames = new Set(["paynest.app", "www.paynest.app"]);
const productionLikeTarget = productionHostnames.has(hostname);

if (productionLikeTarget && process.env.ZAP_ALLOW_PRODUCTION !== "true") {
  console.error(`Refusing to scan production target without ZAP_ALLOW_PRODUCTION=true: ${target}`);
  process.exit(1);
}

const args = [
  "run",
  "--rm",
  "-t",
  "ghcr.io/zaproxy/zaproxy:stable",
  "zap-baseline.py",
  "-t",
  target,
  "-r",
  "zap-report.html",
  failOnWarn ? "-W" : "-I",
];

console.log(`Running OWASP ZAP baseline scan against ${target}`);
const dockerCheck = spawnSync("docker", ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
if (dockerCheck.status !== 0) {
  console.error("Docker is required to run OWASP ZAP. Install Docker locally or run the Security ZAP GitHub workflow.");
  process.exit(1);
}

const result = spawnSync("docker", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
