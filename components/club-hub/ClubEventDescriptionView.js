"use client";

import {
  parseDescriptionLine,
  parseInlineDescriptionParts,
} from "@/lib/club-hub/clubEventDescriptionFormat";

/**
 * @param {{ description?: string, className?: string }} props
 */
export default function ClubEventDescriptionView({
  description = "",
  className = "mt-2 text-[15px] text-neutral-800",
}) {
  const text = description?.trim() || "";
  if (!text) return null;

  /** @param {string} line */
  const renderInline = (line) =>
    parseInlineDescriptionParts(line).map((part, i) => {
      if (part.kind === "bold") {
        return (
          <strong key={i} className="font-semibold text-neutral-900">
            {part.value}
          </strong>
        );
      }
      if (part.kind === "link") {
        return (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#5c1417] underline hover:text-[#4a1012]"
          >
            {part.label}
          </a>
        );
      }
      return <span key={i}>{part.value}</span>;
    });

  /** @type {import("react").ReactNode[]} */
  const blocks = [];
  /** @type {import("react").ReactNode[]} */
  let pendingBullets = [];

  const flushBullets = () => {
    if (!pendingBullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {pendingBullets}
      </ul>,
    );
    pendingBullets = [];
  };

  for (const line of text.split("\n")) {
    const parsed = parseDescriptionLine(line);
    if (parsed.type === "bullet") {
      pendingBullets.push(
        <li key={`b-${pendingBullets.length}`} className="leading-relaxed">
          {renderInline(parsed.content)}
        </li>,
      );
      continue;
    }
    flushBullets();
    if (!parsed.content.trim()) {
      if (line === "") blocks.push(<div key={`sp-${blocks.length}`} className="h-2" aria-hidden />);
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-relaxed">
        {renderInline(parsed.content)}
      </p>,
    );
  }
  flushBullets();

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
}
