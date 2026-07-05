import { spawnSync } from "node:child_process";
import fs from "node:fs";

const databaseUrl = process.env.RESTORE_DATABASE_URL || process.env.DATABASE_URL;
const backupFile = process.env.BACKUP_FILE;
const pgRestore = process.env.PG_RESTORE_PATH || "pg_restore";

if (process.env.PAYNEST_ALLOW_RESTORE !== "true") {
  console.error("Refusing to restore without PAYNEST_ALLOW_RESTORE=true.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Set RESTORE_DATABASE_URL or DATABASE_URL before restoring.");
  process.exit(1);
}

if (!backupFile || !fs.existsSync(backupFile)) {
  console.error("Set BACKUP_FILE to an existing .dump file.");
  process.exit(1);
}

const clearlySafe = /test|staging|localhost|127\.0\.0\.1/i.test(databaseUrl);
if (!clearlySafe && process.env.PAYNEST_ALLOW_PRODUCTION_RESTORE !== "true") {
  console.error("Refusing to restore to a production-looking URL without PAYNEST_ALLOW_PRODUCTION_RESTORE=true.");
  process.exit(1);
}

const result = spawnSync(pgRestore, ["--clean", "--if-exists", "--no-owner", "--dbname", databaseUrl, backupFile], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("Database restore failed. Confirm pg_restore is installed or set PG_RESTORE_PATH.");
  process.exit(result.status ?? 1);
}

console.log("Database restore completed.");
