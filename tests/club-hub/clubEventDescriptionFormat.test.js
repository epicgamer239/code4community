import { describe, expect, it } from "vitest";
import {
  applyBoldMarkdown,
  descriptionMarkdownToHtml,
  normalizeClubEventInfoLink,
  parseDescriptionLine,
  parseInlineDescriptionParts,
} from "@/lib/club-hub/clubEventDescriptionFormat";

describe("clubEventDescriptionFormat", () => {
  it("normalizes http(s) links", () => {
    expect(normalizeClubEventInfoLink("forms.google.com/foo")).toBe("https://forms.google.com/foo");
    expect(normalizeClubEventInfoLink("javascript:alert(1)")).toBe("");
  });

  it("parses bullets and bold", () => {
    expect(parseDescriptionLine("- Bring laptop")).toEqual({
      type: "bullet",
      content: "Bring laptop",
    });
    const parts = parseInlineDescriptionParts("Hello **world**");
    expect(parts).toEqual([
      { kind: "text", value: "Hello " },
      { kind: "bold", value: "world" },
    ]);
  });

  it("wraps, inserts, and unwraps bold markdown", () => {
    expect(applyBoldMarkdown("hello world", 6, 11)).toEqual({
      text: "hello **world**",
      selectionStart: 8,
      selectionEnd: 13,
    });
    expect(applyBoldMarkdown("hi", 2, 2)).toEqual({
      text: "hi****",
      selectionStart: 4,
      selectionEnd: 4,
    });
    expect(applyBoldMarkdown("hello **world**", 8, 13)).toEqual({
      text: "hello world",
      selectionStart: 6,
      selectionEnd: 11,
    });
  });

  it("builds rich-editor HTML from markdown", () => {
    const md = "Hello **team**\n- Bring laptop";
    const html = descriptionMarkdownToHtml(md);
    expect(html).toContain("<strong>team</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });

  it("parses markdown links", () => {
    const parts = parseInlineDescriptionParts("See [form](https://example.com/x)");
    const link = parts.find((p) => p.kind === "link");
    expect(link?.kind).toBe("link");
    if (link?.kind === "link") {
      expect(link.href).toBe("https://example.com/x");
    }
  });
});
