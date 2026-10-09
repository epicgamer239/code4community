/** @param {string} url */
export function normalizeClubEventInfoLink(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const href = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href.slice(0, 500);
  } catch {
    return "";
  }
}

/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {string} insert
 */
export function spliceText(text, start, end, insert) {
  return text.slice(0, start) + insert + text.slice(end);
}

/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @returns {{ text: string, selectionStart: number, selectionEnd: number }}
 */
export function applyBoldMarkdown(text, start, end) {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  const selected = text.slice(safeStart, safeEnd);

  if (safeStart === safeEnd) {
    const insert = "****";
    const next = spliceText(text, safeStart, safeEnd, insert);
    const cursor = safeStart + 2;
    return { text: next, selectionStart: cursor, selectionEnd: cursor };
  }

  const before = text.slice(Math.max(0, safeStart - 2), safeStart);
  const after = text.slice(safeEnd, safeEnd + 2);
  if (before === "**" && after === "**") {
    const next = text.slice(0, safeStart - 2) + selected + text.slice(safeEnd + 2);
    return {
      text: next,
      selectionStart: safeStart - 2,
      selectionEnd: safeEnd - 2,
    };
  }

  const wrapped = `**${selected}**`;
  return {
    text: spliceText(text, safeStart, safeEnd, wrapped),
    selectionStart: safeStart + 2,
    selectionEnd: safeEnd + 2,
  };
}

/**
 * @param {string} line
 * @returns {{ type: "bullet", content: string } | { type: "paragraph", content: string }}
 */
export function parseDescriptionLine(line) {
  const bullet = line.match(/^\s*[-*]\s+(.*)$/);
  if (bullet) return { type: "bullet", content: bullet[1] };
  return { type: "paragraph", content: line };
}

/**
 * @typedef {{ kind: "text", value: string } | { kind: "bold", value: string } | { kind: "link", label: string, href: string }} InlinePart
 */

/** @param {string} line @returns {InlinePart[]} */
export function parseInlineDescriptionParts(line) {
  /** @type {InlinePart[]} */
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", value: line.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push({ kind: "bold", value: token.slice(2, -2) });
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = normalizeClubEventInfoLink(linkMatch[2]);
        if (href) {
          parts.push({ kind: "link", label: linkMatch[1].slice(0, 80), href });
        } else {
          parts.push({ kind: "text", value: token });
        }
      } else {
        parts.push({ kind: "text", value: token });
      }
    }
    last = match.index + token.length;
  }
  if (last < line.length) {
    parts.push({ kind: "text", value: line.slice(last) });
  }
  return parts.length ? parts : [{ kind: "text", value: line }];
}

/** @param {string} raw */
function escapeDescriptionHtml(raw) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {InlinePart[]} parts */
function inlinePartsToHtml(parts) {
  return parts
    .map((part) => {
      if (part.kind === "bold") {
        return `<strong>${escapeDescriptionHtml(part.value)}</strong>`;
      }
      if (part.kind === "link") {
        return `<a href="${escapeDescriptionHtml(part.href)}" target="_blank" rel="noopener noreferrer">${escapeDescriptionHtml(part.label)}</a>`;
      }
      return escapeDescriptionHtml(part.value);
    })
    .join("");
}

/**
 * Markdown stored on events → HTML for the rich description editor.
 * @param {string} markdown
 */
export function descriptionMarkdownToHtml(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    return '<div data-c4c-desc-block="1"><br></div>';
  }

  /** @type {string[]} */
  const chunks = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      chunks.push("</ul>");
      inList = false;
    }
  };

  for (const line of markdown.split("\n")) {
    const parsed = parseDescriptionLine(line);
    if (parsed.type === "bullet") {
      if (!inList) {
        closeList();
        chunks.push('<ul data-c4c-desc-list="1">');
        inList = true;
      }
      chunks.push(
        `<li data-c4c-desc-block="1">${inlinePartsToHtml(parseInlineDescriptionParts(parsed.content))}</li>`,
      );
      continue;
    }

    closeList();
    if (!line.trim()) {
      chunks.push('<div data-c4c-desc-block="1"><br></div>');
      continue;
    }
    chunks.push(
      `<p data-c4c-desc-block="1">${inlinePartsToHtml(parseInlineDescriptionParts(parsed.content))}</p>`,
    );
  }
  closeList();
  return chunks.join("") || '<div data-c4c-desc-block="1"><br></div>';
}

/**
 * @param {Node} node
 * @returns {string}
 */
function serializeInlineNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = /** @type {HTMLElement} */ (node);
  const tag = el.tagName;
  if (tag === "BR") return "\n";
  if (tag === "STRONG" || tag === "B") {
    const inner = serializeInlineChildren(el);
    return inner ? `**${inner}**` : "";
  }
  if (tag === "A") {
    const href = normalizeClubEventInfoLink(el.getAttribute("href") || "");
    const label = serializeInlineChildren(el).trim() || href;
    if (!href) return label;
    return `[${label.slice(0, 80)}](${href})`;
  }
  return serializeInlineChildren(el);
}

/** @param {ParentNode} parent */
function serializeInlineChildren(parent) {
  let out = "";
  parent.childNodes.forEach((child) => {
    out += serializeInlineNode(child);
  });
  return out;
}

/**
 * @param {HTMLElement} block
 * @returns {string[]}
 */
function serializeBlockLines(block) {
  const tag = block.tagName;
  if (tag === "UL" || tag === "OL") {
    return Array.from(block.children)
      .filter((child) => child.tagName === "LI")
      .map((li) => {
        const text = serializeInlineChildren(li).replace(/\n/g, " ").trim();
        return text ? `- ${text}` : "- ";
      });
  }

  if (tag === "LI") {
    const text = serializeInlineChildren(block).replace(/\n/g, " ").trim();
    return [text ? `- ${text}` : "- "];
  }

  const inline = serializeInlineChildren(block).replace(/\u00a0/g, " ");
  const trimmed = inline.trim();
  if (!trimmed && block.querySelector("br")) return [""];
  if (!trimmed) return [""];
  return [inline.replace(/\n+/g, " ").trimEnd()];
}

/**
 * Rich editor HTML → markdown for Firestore / public event view.
 * @param {HTMLElement} root
 */
export function descriptionHtmlToMarkdown(root) {
  /** @type {string[]} */
  const lines = [];

  const pushBlocks = (container) => {
    container.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || "").trim();
        if (text) lines.push(text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = /** @type {HTMLElement} */ (node);
      if (el.tagName === "UL" || el.tagName === "OL") {
        lines.push(...serializeBlockLines(el));
        return;
      }
      if (el.tagName === "BR") {
        lines.push("");
        return;
      }
      if (el.tagName === "DIV" || el.tagName === "P") {
        lines.push(...serializeBlockLines(el));
      }
    });
  };

  pushBlocks(root);

  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}
