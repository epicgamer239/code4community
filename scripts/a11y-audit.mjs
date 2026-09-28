#!/usr/bin/env node
/**
 * Batch WCAG scan (axe-core) for all public routes + auth/marketing extras.
 *
 * Usage (with app running):
 *   npm run preview:local   # or: npm run dev
 *   npm run a11y:audit
 *
 * Options:
 *   --base http://localhost:3000   (default)
 *   --quick                        skip per-club directory pages (faster)
 *   --out a11y-report              output directory
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const EXTRA_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/welcome",
  "/verify-email",
  "/auth/verify-email",
  "/writing-center",
  "/library-pass",
  "/office-hours/scheduler",
  "/settings",
  "/admin",
  "/club-hub/admin",
  "/club-hub/sponsor",
  "/mathlab/admin",
  "/mathlab/scheduler",
  "/student-groups",
  "/seating-chart",
  "/grade-calculator",
  "/yearbook-formatting",
];

function parseArgs(argv) {
  let base = process.env.A11Y_BASE_URL || "http://localhost:3000";
  let quick = false;
  let outDir = "a11y-report";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) {
      base = argv[++i].replace(/\/$/, "");
    } else if (argv[i] === "--quick") {
      quick = true;
    } else if (argv[i] === "--out" && argv[i + 1]) {
      outDir = argv[++i];
    }
  }
  return { base, quick, outDir };
}

async function fetchSitemapPaths(base) {
  const res = await fetch(`${base}/sitemap.xml`, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Could not fetch sitemap (${res.status}). Is the server running at ${base}?`);
  }
  const xml = await res.text();
  const paths = [];
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      const url = new URL(match[1]);
      // Sitemap may use production host while we audit localhost — use path only.
      paths.push(url.pathname || "/");
    } catch {
      // ignore bad loc
    }
  }
  return paths;
}

function uniquePaths(paths) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    const norm = p === "" ? "/" : p.startsWith("/") ? p : `/${p}`;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function filterQuick(paths) {
  return paths.filter((p) => {
    if (p.startsWith("/club-hub/directory/") && p !== "/club-hub/directory") return false;
    return true;
  });
}

function summarize(pages) {
  const byRule = new Map();
  let totalViolations = 0;
  let pagesWithViolations = 0;
  for (const page of pages) {
    const count = page.violations.length;
    totalViolations += count;
    if (count > 0) pagesWithViolations += 1;
    for (const v of page.violations) {
      const prev = byRule.get(v.id) || { id: v.id, impact: v.impact, help: v.help, count: 0, urls: [] };
      prev.count += v.nodes.length;
      if (prev.urls.length < 8 && !prev.urls.includes(page.path)) prev.urls.push(page.path);
      byRule.set(v.id, prev);
    }
  }
  return {
    totalPages: pages.length,
    pagesWithViolations,
    totalViolationInstances: totalViolations,
    byRule: [...byRule.values()].sort((a, b) => b.count - a.count),
  };
}

function toMarkdown(report) {
  const lines = [
    `# Accessibility audit (${report.wcagTags.join(", ")})`,
    "",
    `- Base URL: ${report.baseUrl}`,
    `- Generated: ${report.generatedAt}`,
    `- Pages scanned: ${report.summary.totalPages}`,
    `- Pages with violations: ${report.summary.pagesWithViolations}`,
    `- Violation instances: ${report.summary.totalViolationInstances}`,
    "",
    "## Top rules",
    "",
  ];
  for (const rule of report.summary.byRule.slice(0, 30)) {
    lines.push(
      `### ${rule.id} (${rule.impact}) — ${rule.count} instance(s)`,
      "",
      rule.help,
      "",
      `Example paths: ${rule.urls.join(", ")}`,
      "",
    );
  }
  lines.push("## All pages", "");
  for (const page of report.pages) {
    if (page.violations.length === 0) continue;
    lines.push(`### ${page.path}`, "");
    for (const v of page.violations) {
      lines.push(`- **${v.id}** (${v.impact}): ${v.description}`);
      for (const node of v.nodes.slice(0, 3)) {
        lines.push(`  - \`${node.target.join(" ")}\`${node.failureSummary ? ` — ${node.failureSummary}` : ""}`);
      }
      if (v.nodes.length > 3) lines.push(`  - … +${v.nodes.length - 3} more nodes`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function scanPage(page, url, path) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.waitForSelector("main", { timeout: 15_000 }).catch(() => {});
  const results = await new AxePuppeteer(page)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  return {
    path,
    url,
    violationCount: results.violations.length,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: n.html?.slice(0, 200),
        failureSummary: n.failureSummary,
      })),
    })),
  };
}

async function main() {
  const { base, quick, outDir } = parseArgs(process.argv);
  const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

  console.log(`Fetching sitemap from ${base}…`);
  let paths = uniquePaths([...(await fetchSitemapPaths(base)), ...EXTRA_PATHS]);
  if (quick) {
    paths = filterQuick(paths);
    console.log(`--quick: skipping individual club pages (${paths.length} URLs)`);
  } else {
    console.log(`Full scan: ${paths.length} URLs`);
  }

  mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const pages = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const url = `${base}${path === "/" ? "" : path}`;
    process.stdout.write(`[${i + 1}/${paths.length}] ${path} … `);
    try {
      const result = await scanPage(page, url, path);
      pages.push(result);
      console.log(result.violationCount === 0 ? "ok" : `${result.violationCount} issue(s)`);
    } catch (err) {
      if (String(err.message).includes("not ready") && path === "/") {
        try {
          const result = await scanPage(page, url, path);
          pages.push(result);
          console.log(result.violationCount === 0 ? "ok (retry)" : `${result.violationCount} issue(s)`);
          continue;
        } catch (retryErr) {
          console.log(`ERROR: ${retryErr.message}`);
          pages.push({ path, url, error: retryErr.message, violations: [] });
          continue;
        }
      }
      console.log(`ERROR: ${err.message}`);
      pages.push({ path, url, error: err.message, violations: [] });
    }
  }

  await browser.close();

  const summary = summarize(pages);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    quick,
    wcagTags,
    paths,
    summary,
    pages,
  };

  const jsonPath = join(outDir, "report.json");
  const mdPath = join(outDir, "summary.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, toMarkdown(report));

  console.log("");
  console.log(`Done. ${summary.pagesWithViolations}/${summary.totalPages} pages with violations.`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log("");
  console.log("Share a11y-report/summary.md (or report.json) in chat to batch-fix issues.");

  process.exit(summary.pagesWithViolations > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
