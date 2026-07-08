#!/usr/bin/env node
/**
 * Tenant-isolation guardrail.
 *
 * Scans API routes and Prisma schema. Tenant routes must scope database access
 * by companyId, and tenant-owned unique keys must include companyId so common
 * values like employee numbers or holiday dates cannot collide across companies.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API_DIR = join(process.cwd(), "app", "api");
const SCHEMA_FILE = join(process.cwd(), "prisma", "schema.prisma");

// Route path prefixes (relative to app/api) that may query without companyId.
// Each entry documents WHY it is exempt.
const ALLOW_PREFIXES = [
  "auth/",      // auth/token/user lookup and public company registration
  "companies/", // super-admin platform company management
  "health",     // liveness probe, no tenant data
  "cron/",      // scheduled jobs run across companies by design
  "contact",    // platform-level demo requests
];

const TENANT_UNIQUE_MODELS = new Set([
  "Announcement",
  "AttendanceRecord",
  "AuditLog",
  "BonusDeduction",
  "BonusTier",
  "CompanyEvent",
  "CompanySettings",
  "CustomRequest",
  "Employee",
  "EmployeeDocument",
  "Evaluation",
  "JobOffer",
  "JobOfferTemplate",
  "LeaveBalance",
  "LeaveRequest",
  "Message",
  "MonthlySalary",
  "Notification",
  "OfficialHoliday",
  "PayrollRecord",
  "RemoteAssignment",
  "RequestType",
  "Task",
  "UploadedFile",
]);

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
  return ALLOW_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function scanApiRoutes() {
  const routeProblems = [];

  for (const file of walk(API_DIR)) {
    const rel = relative(API_DIR, file).replace(/\\/g, "/");
    const src = readFileSync(file, "utf8");
    const usesDb = /\bprisma\.|\$queryRaw|\$executeRaw/.test(src);
    if (!usesDb || isAllowed(rel)) continue;

    const problems = [];
    if (!/session\.companyId|\bs\.companyId|\bcompanyId\b/.test(src)) {
      problems.push("no companyId scope");
    }
    if (/\$queryRaw/.test(src) && !/company_id\s*=|companyId/.test(src)) {
      problems.push("raw query without company_id");
    }
    const unsafeFindUnique = src
      .split(/\r?\n/)
      .some((line) =>
        /findUnique\s*\(\s*\{\s*where:\s*\{\s*id:/.test(line) &&
        !/prisma\.company\.findUnique/.test(line) &&
        !/session\.companyId|\bcompanyId\b/.test(line),
      );
    if (unsafeFindUnique) {
      problems.push("findUnique(id) on a tenant route; use a company-scoped read");
    }
    if (/\b(employeeId_year|employeeId_startDate_endDate)\b/.test(src)) {
      problems.push("legacy tenant-unsafe compound unique selector");
    }

    if (problems.length) routeProblems.push({ rel, problems });
  }

  return routeProblems;
}

function scanSchemaUniqueKeys() {
  const schema = readFileSync(SCHEMA_FILE, "utf8");
  const modelPattern = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  const schemaProblems = [];

  for (const match of schema.matchAll(modelPattern)) {
    const [, modelName, body] = match;
    if (!TENANT_UNIQUE_MODELS.has(modelName)) continue;

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;

      if (line.includes("@@unique") && !line.includes("companyId")) {
        schemaProblems.push(`${modelName}: ${line}`);
      }

      const isFieldUnique = line.includes("@unique") && !line.includes("@@unique");
      if (isFieldUnique && !line.startsWith("id ") && !line.startsWith("companyId ")) {
        schemaProblems.push(`${modelName}: ${line}`);
      }
    }
  }

  return schemaProblems;
}

const routeProblems = scanApiRoutes();
const schemaProblems = scanSchemaUniqueKeys();

if (routeProblems.length || schemaProblems.length) {
  console.error("\n✗ Tenant-isolation check FAILED\n");

  if (routeProblems.length) {
    console.error("API routes that need stronger company scoping:\n");
    for (const route of routeProblems) {
      console.error(`   - app/api/${route.rel} (${route.problems.join(", ")})`);
    }
    console.error("");
  }

  if (schemaProblems.length) {
    console.error("Tenant tables with unique keys that are not company-scoped:\n");
    for (const problem of schemaProblems) console.error(`   - ${problem}`);
    console.error("");
  }

  console.error("Fix: scope tenant queries and unique keys by companyId, or add a documented allow-list entry.\n");
  process.exit(1);
}

console.log("✓ Tenant-isolation check passed: API routes and tenant unique keys are company-scoped.");
