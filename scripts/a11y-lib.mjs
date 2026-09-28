/** Shared helpers for accessibility audit scripts. */

export function parseBaseArgs(argv) {
  let base = process.env.A11Y_BASE_URL || "http://localhost:3000";
  let outDir = "a11y-report";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) {
      base = argv[++i].replace(/\/$/, "");
    } else if (argv[i] === "--out" && argv[i + 1]) {
      outDir = argv[++i];
    }
  }
  return { base, outDir };
}

export async function launchBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function waitForMain(page, timeout = 15_000) {
  await page.waitForSelector("main", { timeout }).catch(() => {});
}

export function describeElement(el) {
  if (!el || el === document.body) return { tag: "body" };
  const tag = el.tagName?.toLowerCase?.() || "?";
  return {
    tag,
    id: el.id || undefined,
    name: el.getAttribute?.("aria-label") || el.getAttribute?.("name") || undefined,
    text: (el.textContent || "").trim().slice(0, 80) || undefined,
    href: el.href || undefined,
    role: el.getAttribute?.("role") || undefined,
  };
}
