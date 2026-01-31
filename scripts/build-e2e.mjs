/**
 * Build for E2E: loads .env.test so the built app uses the same Supabase
 * as E2E_USERNAME/E2E_PASSWORD. Run before playwright test.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envTestPath = resolve(root, ".env.test");

const loaded = config({ path: envTestPath });
if (loaded.error) {
  console.error("[build-e2e] Failed to load .env.test:", loaded.error.message);
  process.exit(1);
}
console.log("[build-e2e] Building with .env.test (SUPABASE_* from .env.test)...");

const result = spawnSync("npx", ["astro", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
  shell: true,
});

if (result.status !== 0) {
  console.error("[build-e2e] astro build exited with code", result.status);
  process.exit(result.status ?? 1);
}
console.log("[build-e2e] Build done.");
process.exit(0);
