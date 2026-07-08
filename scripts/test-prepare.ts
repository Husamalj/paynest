import { spawn } from "node:child_process";
import { assertTestDatabase } from "./test-db-guard";
import { loadEnvFile } from "../tests/fixtures/env";

loadEnvFile(".env.test");

if (!process.env.NODE_ENV) {
  Object.assign(process.env, { NODE_ENV: "test" });
}

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

if (!process.env.DIRECT_URL && process.env.TEST_DIRECT_URL) {
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL;
}

assertTestDatabase();

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("Preparing PayNest test database...");
  await run("npx", ["prisma", "db", "push", "--accept-data-loss"]);
  await run("npx", ["tsx", "scripts/test-seed.ts"]);
  console.log("Test database is ready. Set PAYNEST_TEST_DB_READY=true before auth/API/RBAC E2E tests.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
