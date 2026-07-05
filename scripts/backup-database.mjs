import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const databaseUrl = process.env.BACKUP_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const pgDump = process.env.PG_DUMP_PATH || "pg_dump";
const outputDir = process.env.BACKUP_DIR || "backups";

if (!databaseUrl) {
  console.error("Set BACKUP_DATABASE_URL, DIRECT_URL, or DATABASE_URL before running a backup.");
  process.exit(1);
}

if (/paynest\.app|production/i.test(databaseUrl) && process.env.PAYNEST_ALLOW_PROD_BACKUP !== "true") {
  console.error("Refusing to back up a production-looking URL without PAYNEST_ALLOW_PROD_BACKUP=true.");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(outputDir, `paynest-${stamp}.dump`);

const result = spawnSync(pgDump, ["--format=custom", "--no-owner", "--file", output, databaseUrl], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("Database backup failed. Confirm pg_dump is installed or set PG_DUMP_PATH.");
  process.exit(result.status ?? 1);
}

console.log(`Database backup created: ${output}`);
