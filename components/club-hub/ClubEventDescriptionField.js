"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  descriptionHtmlToMarkdown,
  descriptionMarkdownToHtml,
  normalizeClubEventInfoLink,
} from "@/lib/club-hub/clubEventDescriptionFormat";

/**
 * @param {{
 *   id: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   disabled?: boolean,
 *   maxLength?: number,
 * }} props
 */
export default function ClubEventDescriptionField({
  id,
  value,
  onChange,
  disabled = false,
  maxLength = 500,
}) {
  const editorRef = useRef(null);
  const lastEmitted = useRef(value);
  const isFocused = useRef(false);

  const syncHtmlFromMarkdown = useCallback(
    (markdown) => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = descriptionMarkdownToHtml(markdown);
    },
    [],
  );

  const refreshEmptyState = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const empty = !descriptionHtmlToMarkdown(el).trim();
    el.dataset.empty = empty ? "true" : "false";
  }, []);

  useEffect(() => {
    lastEmitted.current = value;
    if (!isFocused.current) {
      syncHtmlFromMarkdown(value);
      requestAnimationFrame(refreshEmptyState);
    }
  }, [value, syncHtmlFromMarkdown, refreshEmptyState]);

  const emitMarkdown = () => {
    const el = editorRef.current;
    if (!el) return;
    const markdown = descriptionHtmlToMarkdown(el).slice(0, maxLength);
    refreshEmptyState();
    if (markdown === lastEmitted.current) return;
    lastEmitted.current = markdown;
    onChange(markdown);
  };

  const keepSelection = (e) => {
    e.preventDefault();
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const wrapBold = () => {
    focusEditor();
    document.execCommand("bold");
    emitMarkdown();
  };

  const insertBullet = () => {
    focusEditor();
    document.execCommand("insertUnorderedList");
    emitMarkdown();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (!url?.trim()) return;
    const label =
      window.prompt("Link text (optional)", "Sign up here")?.trim() || "Link";
    const href = normalizeClubEventInfoLink(url);
    if (!href) return;
    focusEditor();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${label.slice(0, 80).replace(/</g, "&lt;")}</a>`,
      );
    }
    emitMarkdown();
  };

  const toolBtn =
    "rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label id={`${id}-label`} htmlFor={id} className="block text-xs font-semibold text-neutral-700">
          Description (optional)
        </label>
        <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Description formatting">
          <button
            type="button"
            disabled={disabled}
            className={toolBtn}
            onMouseDown={keepSelection}
            onClick={wrapBold}
          >
            Bold
          </button>
          <button
            type="button"
            disabled={disabled}
            className={toolBtn}
            onMouseDown={keepSelection}
            onClick={insertBullet}
          >
            Bullet
          </button>
          <button
            type="button"
            disabled={disabled}
            className={toolBtn}
            onMouseDown={keepSelection}
            onClick={insertLink}
          >
            Link
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={`${id}-label`}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder="Agenda, reminders… use Bold, Bullet, or Link above."
        onFocus={() => {
          isFocused.current = true;
        }}
        onBlur={() => {
          isFocused.current = false;
          emitMarkdown();
        }}
        onInput={() => {
          const el = editorRef.current;
          if (!el) return;
          const markdown = descriptionHtmlToMarkdown(el);
          if (markdown.length > maxLength) {
            syncHtmlFromMarkdown(lastEmitted.current);
            return;
          }
          emitMarkdown();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emitMarkdown();
        }}
        className="club-event-desc-editor mt-1.5 min-h-[7rem] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-900 outline-none focus:border-[#5c1417] focus:ring-1 focus:ring-[#5c1417] disabled:bg-neutral-100 disabled:text-neutral-500 [&_a]:font-semibold [&_a]:text-[#5c1417] [&_a]:underline [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
      />
      <p className="mt-1 text-[11px] text-neutral-600">
        Formatting shows as it will on the event page. For a standing club link, use Resources on
        the club page editor.
      </p>
      <style jsx>{`
        .club-event-desc-editor[data-empty="true"]::before {
          content: attr(data-placeholder);
          color: #737373;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
