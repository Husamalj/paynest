#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const target = process.env.ZAP_TARGET || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const failOnWarn = process.env.ZAP_FAIL_ON_WARN === "true";

if (/paynest\.app$/i.test(target) && process.env.ZAP_ALLOW_PRODUCTION !== "true") {
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
const result = spawnSync("docker", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);

