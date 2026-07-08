import fs from "node:fs";
import path from "node:path";

const envFiles = [".env.local", ".env"];
const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "FROM_EMAIL",
  "CONTACT_EMAIL",
  "CRON_SECRET",
];

function loadEnvFile(file) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

for (const file of envFiles) {
  loadEnvFile(file);
}

const errors = [];
const warnings = [];
const forbiddenProductionKeys = [
  "PAYNEST_ALLOW_TEST_DB",
  "PAYNEST_TEST_DB_READY",
  "TEST_DATABASE_URL",
  "TEST_DIRECT_URL",
  "PLAYWRIGHT_BASE_URL",
  "K6_EMPLOYEE_EMAIL",
  "K6_EMPLOYEE_PASSWORD",
  "K6_OWNER_EMAIL",
  "K6_OWNER_PASSWORD",
];

function valueOf(key) {
  return process.env[key]?.trim() ?? "";
}

function requirePresent(key) {
  if (!valueOf(key)) {
    errors.push(`${key} is missing.`);
  }
}

function requireUrl(key, options = {}) {
  const value = valueOf(key);
  if (!value) return;

  try {
    const parsed = new URL(value);
    if (options.protocols && !options.protocols.includes(parsed.protocol)) {
      errors.push(`${key} must use one of: ${options.protocols.join(", ")}.`);
    }
    if (options.noLocalhost && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      errors.push(`${key} must not point to localhost for production.`);
    }
  } catch {
    errors.push(`${key} is not a valid URL.`);
  }
}

function requireEmail(key) {
  const value = valueOf(key);
  if (!value) return;
  const displayNameMatch = value.match(/^[^<>]+<([^<>]+)>$/);
  const email = displayNameMatch ? displayNameMatch[1].trim() : value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${key} must be a valid email address.`);
  }
}

function requireStrongSecret(key, minLength = 32) {
  const value = valueOf(key);
  if (!value) return;

  const weakMarkers = [
    "change-me",
    "change_in_prod",
    "change-in-prod",
    "secret",
    "test",
    "example",
    "password",
  ];

  if (value.length < minLength) {
    errors.push(`${key} must be at least ${minLength} characters.`);
  }

  if (weakMarkers.some((marker) => value.toLowerCase().includes(marker))) {
    errors.push(`${key} looks like a placeholder or weak test secret.`);
  }
}

for (const key of required) {
  requirePresent(key);
}

for (const key of forbiddenProductionKeys) {
  if (valueOf(key)) {
    errors.push(`${key} must not be set in production.`);
  }
}

for (const key of Object.keys(process.env)) {
  if (key.startsWith("PAYNEST_TEST_") && !forbiddenProductionKeys.includes(key)) {
    errors.push(`${key} must not be set in production.`);
  }
}

requireUrl("DATABASE_URL", { protocols: ["postgresql:", "postgres:"], noLocalhost: true });
requireUrl("DIRECT_URL", { protocols: ["postgresql:", "postgres:"], noLocalhost: true });
requireUrl("NEXT_PUBLIC_APP_URL", { protocols: ["https:"] });
requireEmail("FROM_EMAIL");
requireEmail("CONTACT_EMAIL");
requireStrongSecret("JWT_SECRET", 48);
requireStrongSecret("CRON_SECRET", 32);

if (valueOf("DATABASE_URL").includes("pgbouncer=true") && !valueOf("DIRECT_URL")) {
  errors.push("DIRECT_URL is required when DATABASE_URL uses pgbouncer.");
}

if (valueOf("DIRECT_URL").includes("pgbouncer=true")) {
  warnings.push("DIRECT_URL should usually be a direct non-pgbouncer PostgreSQL connection.");
}

if (valueOf("RESEND_API_KEY").toLowerCase().includes("test")) {
  errors.push("RESEND_API_KEY looks like a test value.");
}

if (valueOf("NEXT_PUBLIC_APP_URL").startsWith("http://")) {
  errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for production.");
}

if (errors.length > 0 || warnings.length > 0) {
  console.log("PayNest production environment check");
  console.log("");
}

for (const warning of warnings) {
  console.log(`WARN: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.log(`ERROR: ${error}`);
  }
  console.log("");
  console.log("Fix the environment variables in Vercel Project Settings > Environment Variables.");
  process.exit(1);
}

console.log("PayNest production environment check passed.");
