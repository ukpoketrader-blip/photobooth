/**
 * Run Prisma CLI against packages/db using DATABASE_URL from repo root .env.
 * Usage: node --env-file=.env scripts/prisma-run.mjs db push
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is missing. Set it in the repo root .env (your Neon URL with ?sslmode=require)."
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
  cwd: resolve(root, "packages/db"),
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
