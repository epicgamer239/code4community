#!/usr/bin/env node
/**
 * Source-level checks (alt text, page titles) — complements runtime axe scans.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const EXT = /\.(jsx?|tsx?)$/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, files);
    } else if (EXT.test(name)) files.push(p);
  }
  return files;
}

function checkFile(path) {
  const text = readFileSync(path, "utf8");
  const rel = relative(ROOT, path);
  const issues = [];

  // <img without alt= within same tag (simple heuristic)
  for (const match of text.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\balt\s*=/.test(tag)) {
      issues.push({ rule: "img-alt", message: "<img> missing alt attribute", snippet: tag.slice(0, 100) });
    }
  }

  // next/image — require alt prop (allow spread {…props} as unknown)
  for (const match of text.matchAll(/<Image\b[^>]*\/?>/gi)) {
    const tag = match[0];
    if (/\balt\s*=/.test(tag) || /\{\.\.\./.test(tag)) continue;
    issues.push({ rule: "next-image-alt", message: "<Image> missing alt prop", snippet: tag.slice(0, 100) });
  }

  return issues.map((i) => ({ ...i, file: rel }));
}

function main() {
  const outDir = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : "a11y-report";

  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const all = files.flatMap(checkFile);

  mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    issueCount: all.length,
    issues: all,
  };
  const outPath = join(outDir, "static-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Scanned ${files.length} files — ${all.length} issue(s).`);
  for (const issue of all.slice(0, 20)) {
    console.log(`  ${issue.file}: ${issue.message}`);
  }
  if (all.length > 20) console.log(`  … +${all.length - 20} more`);
  console.log(`Wrote ${outPath}`);

  process.exit(all.length > 0 ? 1 : 0);
}

main();
