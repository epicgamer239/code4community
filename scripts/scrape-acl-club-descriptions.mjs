/**
 * Scrape club descriptions from the ACL Clubs LCPS page and merge into
 * lib/acl/aclClubDirectory.js as optional `description` fields.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIRECTORY_PATH = path.join(ROOT, "lib/acl/aclClubDirectory.js");
const PAGE_URL = "https://www.lcps.org/o/acl/page/acl-clubs";

function extractDescription(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length) lines.shift();
  const meta =
    /^(Sponsor|Sponsors|Sponser|Coaches|Email|Meeting Days|Meeting Location|Location|Meeting Day|Lead Advisor|Remind|Instagram|Schoology)\b/i;
  const kept = [];
  let pastMeta = false;
  for (const line of lines) {
    if (!pastMeta) {
      if (meta.test(line) || /@lcps\.org/i.test(line) || /^Email:/i.test(line)) continue;
      pastMeta = true;
    }
    kept.push(line);
  }
  let desc = kept.join("\n\n").trim();
  const missionIdx = kept.findIndex(
    (l) => /^Mission\b/i.test(l) || /^Our Mission\b/i.test(l),
  );
  if (missionIdx >= 0) {
    const missionLines = kept.slice(missionIdx);
    missionLines[0] = missionLines[0]
      .replace(/^Our Mission\s*/i, "")
      .replace(/^Mission\s*:?\s*/i, "")
      .trim();
    if (!missionLines[0]) missionLines.shift();
    desc = missionLines.join("\n\n").trim();
  }
  if (!desc) return "";
  if (
    /^(Sponser?|Sponsor|Email|Meeting Days|Location)\b/i.test(desc) &&
    desc.length < 120
  ) {
    return "";
  }
  // Collapse NBSP / odd spaces
  return desc.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

function formatDescriptionLiteral(desc) {
  // Prefer template literals for multi-line; escape backticks/$
  const escaped = desc.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  if (!desc.includes("\n")) {
    return JSON.stringify(desc);
  }
  return `\`${escaped}\``;
}

function mergeIntoDirectory(source, byName) {
  // Replace each club object: insert description after name when present
  return source.replace(
    /(\{\s*\n\s*name:\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')(,\s*\n)(\s*sponsors:)/g,
    (full, pre, nameLit, mid, sponsorsKey) => {
      let name;
      try {
        name = JSON.parse(nameLit.includes("'") && !nameLit.startsWith('"')
          ? JSON.stringify(nameLit.slice(1, -1))
          : nameLit);
      } catch {
        name = nameLit.slice(1, -1);
      }
      // nameLit is always double-quoted in our file
      try {
        name = JSON.parse(nameLit);
      } catch {
        return full;
      }
      const desc = byName.get(name);
      if (!desc) return full;
      const descLit = formatDescriptionLiteral(desc);
      return `${pre}${nameLit},\n    description: ${descLit}${mid}${sponsorsKey}`;
    },
  );
}

async function scrape() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector(".accordion-panel .panel-heading-button", {
      timeout: 60000,
    });

    // Panel body content is lazy-rendered until expanded.
    await page.evaluate(async () => {
      const buttons = [
        ...document.querySelectorAll(".accordion-panel .panel-heading-button"),
      ];
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].click();
        if (i % 10 === 9) await new Promise((r) => setTimeout(r, 200));
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    const clubs = await page.evaluate(() => {
      function cleanName(n) {
        return String(n || "")
          .replace(/\s+/g, " ")
          .trim();
      }
      return [...document.querySelectorAll(".accordion-panel")].map((panel) => ({
        name: cleanName(panel.querySelector(".panel-title")?.textContent),
        text: panel.innerText || "",
      }));
    });

    return clubs
      .filter((c) => c.name)
      .map((c) => ({ name: c.name, description: extractDescription(c.text) }))
      .filter((c) => c.description);
  } finally {
    await browser.close();
  }
}

const scraped = await scrape();
const byName = new Map(scraped.map((c) => [c.name, c.description]));

const outJson = path.join(ROOT, "tmp-acl-club-descriptions.json");
fs.writeFileSync(outJson, JSON.stringify(scraped, null, 2));
console.log(`Scraped ${scraped.length} clubs with descriptions → ${outJson}`);

let source = fs.readFileSync(DIRECTORY_PATH, "utf8");
// Strip any existing description fields so re-runs are idempotent
source = source.replace(/\n\s*description:\s*(?:`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'),?/g, "");

const updated = mergeIntoDirectory(source, byName);
if (updated === source) {
  console.warn("Warning: no club entries were updated — check name matching.");
}
fs.writeFileSync(DIRECTORY_PATH, updated);

// Update typedef
let finalSrc = fs.readFileSync(DIRECTORY_PATH, "utf8");
finalSrc = finalSrc.replace(
  /\/\*\* @typedef \{\{ name: string, sponsors: AclSponsor\[\] \}\} AclClub \*\//,
  "/** @typedef {{ name: string, description?: string, sponsors: AclSponsor[] }} AclClub */",
);
fs.writeFileSync(DIRECTORY_PATH, finalSrc);

console.log(`Updated ${DIRECTORY_PATH}`);
