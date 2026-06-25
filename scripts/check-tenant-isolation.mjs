#!/usr/bin/env node
/**
 * Tenant-isolation guardrail.
 *
 * Scans every API route. Any route that touches the database (`prisma.`) MUST
 * scope its queries by `companyId`, otherwise it could leak data across tenants.
 * Routes that are legitimately NOT single-tenant (authentication, company
 * management by super-admin, health checks, cron) are allow-listed by prefix.
 *
 * Run:  node scripts/check-tenant-isolation.mjs
 * Exits non-zero (and prints offenders) when a route is missing companyId.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API_DIR = join(process.cwd(), "app", "api");

// Route path prefixes (relative to app/api) that may query without companyId.
// Each entry documents WHY it is exempt.
const ALLOW_PREFIXES = [
  "auth/",        // operate on the authenticated user / token, not a tenant table
  "companies/",   // super-admin company management + per-company self status
  "health",       // liveness probe, no tenant data
  "cron/",        // scheduled jobs run across all companies (no user session)
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function isAllowed(rel) {
  return ALLOW_PREFIXES.some((p) => rel.startsWith(p));
}

const offenders = [];
for (const file of walk(API_DIR)) {
  const rel = relative(API_DIR, file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");
  const usesDb = /\bprisma\./.test(src);
  if (!usesDb) continue;
  if (isAllowed(rel)) continue;
  if (!/companyId/.test(src)) offenders.push(rel);
}

if (offenders.length) {
  console.error("\n✗ Tenant-isolation check FAILED — these routes hit the DB without companyId scoping:\n");
  for (const o of offenders) console.error("   • app/api/" + o);
  console.error("\nFix: scope every query by session.companyId, or add the route to ALLOW_PREFIXES with a reason.\n");
  process.exit(1);
}

console.log("✓ Tenant-isolation check passed — every DB route is company-scoped.");
