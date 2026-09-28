#!/usr/bin/env node
/**
 * Keyboard + screen-reader prerequisite checks (Puppeteer).
 *
 * Usage (server running):
 *   npm run a11y:keyboard
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, parseBaseArgs, waitForMain } from "./a11y-lib.mjs";

const DESKTOP = { width: 1280, height: 800 };

/** @typedef {{ id: string, name: string, path: string, mainId?: string, run: (ctx: { page: import('puppeteer').Page, fail: (msg: string) => void }) => Promise<void> }} Scenario */

/** @type {Scenario[]} */
const SCENARIOS = [
  {
    id: "home-skip-link",
    name: "Skip link focuses and moves to main (home)",
    path: "/",
    mainId: "site-main",
    async run({ page, fail }) {
      await page.keyboard.press("Tab");
      const skipOk = await page.evaluate(() => {
        const el = document.activeElement;
        if (el?.tagName !== "A") return false;
        const href = el.getAttribute("href") || "";
        return href.includes("site-main") || href.includes("club-hub-main");
      });
      if (!skipOk) fail("First Tab did not focus skip-to-main link");
      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 150));
      const ok = await page.evaluate(() => {
        const main =
          document.getElementById("site-main") || document.getElementById("club-hub-main");
        if (!main) return false;
        const active = document.activeElement;
        return active === main || main.contains(active);
      });
      if (!ok) fail("After activating skip link, focus is not inside main");
    },
  },
  {
    id: "login-form-keyboard",
    name: "Login form: email field reachable by keyboard",
    path: "/login",
    mainId: "site-main",
    async run({ page, fail }) {
      let found = false;
      for (let i = 0; i < 40; i++) {
        const onEmail = await page.evaluate(() => document.activeElement?.id === "email");
        if (onEmail) {
          found = true;
          break;
        }
        await page.keyboard.press("Tab");
      }
      if (!found) fail("Could not Tab to #email within 40 steps");
      const labeled = await page.evaluate(() => {
        const input = document.getElementById("email");
        const label = document.querySelector('label[for="email"]');
        return Boolean(input && label && label.textContent?.trim());
      });
      if (!labeled) fail("Email input missing associated label");
    },
  },
  {
    id: "login-password-toggle",
    name: "Login: password show/hide has accessible name",
    path: "/login",
    async run({ page, fail }) {
      const btn = await page.$('button[aria-label*="password" i]');
      if (!btn) fail("Password visibility toggle missing aria-label");
    },
  },
  {
    id: "club-hub-landmarks",
    name: "Club Hub: main landmark present",
    path: "/club-hub",
    mainId: "club-hub-main",
    async run({ page, fail }) {
      const count = await page.evaluate(
        () => document.querySelectorAll("main").length,
      );
      if (count !== 1) fail(`Expected 1 main landmark, found ${count}`);
    },
  },
  {
    id: "mathlab-history-main",
    name: "Math Lab history: main landmark (logged-out gate)",
    path: "/mathlab/history",
    mainId: "site-main",
    async run({ page, fail }) {
      const hasMain = await page.evaluate(() => Boolean(document.getElementById("site-main")));
      if (!hasMain) fail("Missing #site-main on Math Lab history");
      const h1 = await page.evaluate(() => Boolean(document.querySelector("main h1")));
      if (!h1) fail("Missing h1 inside main");
    },
  },
  {
    id: "services-single-main",
    name: "Services page: single main landmark",
    path: "/services",
    mainId: "site-main",
    async run({ page, fail }) {
      const count = await page.evaluate(
        () => document.querySelectorAll("main").length,
      );
      if (count !== 1) fail(`Expected 1 main, found ${count}`);
    },
  },
  {
    id: "nav-primary-label",
    name: "Primary nav has accessible name (desktop header)",
    path: "/",
    async run({ page, fail }) {
      const nav = await page.evaluate(() => {
        const el = document.querySelector('header nav[aria-label="Primary"]');
        return Boolean(el);
      });
      if (!nav) fail('Desktop header missing nav[aria-label="Primary"]');
    },
  },
  {
    id: "signup-form-labels",
    name: "Sign up: email field labeled and keyboard reachable",
    path: "/signup",
    mainId: "site-main",
    async run({ page, fail }) {
      let found = false;
      for (let i = 0; i < 45; i++) {
        const id = await page.evaluate(() => document.activeElement?.id);
        if (id === "email") {
          found = true;
          break;
        }
        await page.keyboard.press("Tab");
      }
      if (!found) fail("Could not Tab to signup #email");
      const labeled = await page.evaluate(() =>
        Boolean(document.querySelector('label[for="email"]')),
      );
      if (!labeled) fail("Signup email missing label[for=email]");
    },
  },
  {
    id: "club-hub-skip-link",
    name: "Club Hub skip link targets club-hub-main",
    path: "/club-hub",
    mainId: "club-hub-main",
    async run({ page, fail }) {
      await page.keyboard.press("Tab");
      const ok = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === "A" && (el.getAttribute("href") || "").includes("club-hub-main");
      });
      if (!ok) fail("First Tab did not focus Club Hub skip link");
    },
  },
  {
    id: "document-language-title",
    name: "Page language and title (WCAG 3.1.1 / 2.4.2)",
    path: "/about",
    async run({ page, fail }) {
      const { lang, title } = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        title: document.title?.trim(),
      }));
      if (!lang?.startsWith("en")) fail(`html lang expected en*, got "${lang}"`);
      if (!title || title.length < 3) fail("document.title missing or too short");
    },
  },
  {
    id: "static-name-audit",
    name: "No unlabeled icon-only buttons (sample pages)",
    path: "/",
    async run({ page, fail }) {
      const bad = await page.evaluate(() => {
        const issues = [];
        for (const btn of document.querySelectorAll("button")) {
          const label =
            btn.getAttribute("aria-label") ||
            btn.getAttribute("aria-labelledby") ||
            (btn.textContent || "").trim();
          if (!label) issues.push(btn.outerHTML.slice(0, 120));
        }
        for (const img of document.querySelectorAll("img:not([alt])")) {
          issues.push(`img missing alt: ${img.src?.slice(-40)}`);
        }
        return issues.slice(0, 5);
      });
      if (bad.length) fail(`Unlabeled controls or images: ${bad.join("; ")}`);
    },
  },
];

async function runScenario(page, base, scenario) {
  const url = `${base}${scenario.path === "/" ? "" : scenario.path}`;
  const failures = [];
  const fail = (msg) => failures.push(msg);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
  await waitForMain(page);
  if (scenario.mainId) {
    await page.waitForSelector(`#${scenario.mainId}`, { timeout: 10_000 }).catch(() => {});
  }

  try {
    await scenario.run({ page, fail });
  } catch (err) {
    failures.push(err.message || String(err));
  }

  return {
    id: scenario.id,
    name: scenario.name,
    path: scenario.path,
    url,
    passed: failures.length === 0,
    failures,
  };
}

function toMarkdown(report) {
  const lines = [
    "# Keyboard & assistive-tech prerequisite checks",
    "",
    `- Base URL: ${report.baseUrl}`,
    `- Generated: ${report.generatedAt}`,
    `- Scenarios: ${report.results.length}`,
    `- Passed: ${report.passedCount}`,
    `- Failed: ${report.failedCount}`,
    "",
  ];
  for (const r of report.results) {
    lines.push(`## ${r.passed ? "PASS" : "FAIL"} — ${r.name}`, "");
    lines.push(`- Path: \`${r.path}\``);
    if (r.failures.length) {
      for (const f of r.failures) lines.push(`- ${f}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const { base, outDir } = parseBaseArgs(process.argv);
  mkdirSync(outDir, { recursive: true });

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);

  const results = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`${scenario.id} … `);
    const result = await runScenario(page, base, scenario);
    results.push(result);
    console.log(result.passed ? "ok" : "FAIL");
    await page.goto("about:blank");
  }

  await browser.close();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    passedCount,
    failedCount,
    results,
  };

  const jsonPath = join(outDir, "keyboard-report.json");
  const mdPath = join(outDir, "keyboard-summary.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, toMarkdown(report));

  console.log("");
  console.log(`Done. ${passedCount}/${results.length} scenarios passed.`);
  console.log(`Wrote ${jsonPath}`);

  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
