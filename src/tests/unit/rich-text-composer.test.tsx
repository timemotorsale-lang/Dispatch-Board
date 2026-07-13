import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  applyRichTextCommand,
  RichTextComposer,
  RichTextContent
} from "@/components/ui/rich-text-composer";

describe("rich text composer", () => {
  it("wraps selected text with inline formatting markers", () => {
    expect(applyRichTextCommand("Priority update", "bold", 0, 8)).toEqual({
      value: "**Priority** update",
      selectionStart: 2,
      selectionEnd: 10
    });

    expect(applyRichTextCommand("Call customer", "underline", 5, 13).value).toBe(
      "Call ++customer++"
    );
  });

  it("formats multiple selected lines as an ordered list", () => {
    expect(applyRichTextCommand("Inspect\nDocument", "ordered-list", 0, 16).value).toBe(
      "1. Inspect\n2. Document"
    );
  });

  it("renders supported formatting without interpreting executable markup", () => {
    const markup = renderToStaticMarkup(
      <RichTextContent value={"**Ready**\n- Call @Walter\n[Open record](https://example.com)\n<script>alert(1)</script>"} />
    );

    expect(markup).toContain("<strong>Ready</strong>");
    expect(markup).toContain("<ul>");
    expect(markup).toContain("rich-text-mention");
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("exposes the full accessible formatting toolbar", () => {
    const markup = renderToStaticMarkup(
      <RichTextComposer ariaLabel="Team comment" onChange={vi.fn()} value="Update" />
    );

    expect(markup).toContain('aria-label="Comment formatting"');
    expect(markup).toContain('aria-label="Bold"');
    expect(markup).toContain('aria-label="Bulleted list"');
    expect(markup).toContain('aria-label="Add link"');
    expect(markup).toContain('aria-label="Mention someone"');
    expect(markup).toContain('aria-label="Add emoji"');
    expect(markup).toContain('aria-label="Preview comment"');
    expect(markup).toContain('aria-label="Expand comment editor"');
    expect(markup.indexOf('aria-label="Team comment"')).toBeLessThan(
      markup.indexOf('aria-label="Comment formatting"')
    );
  });
});
