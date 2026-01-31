#!/usr/bin/env node
/**
 * Reads Vitest/Istanbul coverage-final.json and prints lines coverage % to stdout.
 * Used by pull-request workflow to pass coverage to status-comment job.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// From .github/scripts/ → coverage at repo root (Vitest default)
const coveragePath = join(__dirname, "..", "..", "coverage", "coverage-final.json");

if (!existsSync(coveragePath)) {
  console.log("0");
  process.exit(0);
}

const cov = JSON.parse(readFileSync(coveragePath, "utf8"));
let total = 0;
let covered = 0;

for (const file of Object.values(cov)) {
  if (file.s) {
    const keys = Object.keys(file.s);
    total += keys.length;
    covered += keys.filter((id) => file.s[id] > 0).length;
  }
}

const pct = total ? ((100 * covered) / total).toFixed(1) : "0";
console.log(pct);
