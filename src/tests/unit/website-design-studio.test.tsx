import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteConsole } from "@/features/website-console/website-console";
import { websiteConsoleNavigationItems, resolveWebsiteSection } from "@/features/website-console/navigation";
import review from "@/features/website-console/design-studio/homepage-review.json";

describe("Website Console Design Studio", () => {
  it("provides a permanent section and overview entry without a preview domain", () => {
    expect(resolveWebsiteSection("design-studio")).toBe("design-studio");
    expect(websiteConsoleNavigationItems.find(item => item.title === "Design Studio")?.href).toBe("/website-console?section=design-studio");
    const markup = renderToStaticMarkup(<WebsiteConsole section="overview" destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain("Review desktop and mobile homepage templates");
    expect(markup).not.toContain("<iframe");
    expect(markup).not.toContain("data-control");
  });

  it("renders the isolated saved review only in Design Studio", () => {
    const markup = renderToStaticMarkup(<WebsiteConsole section="design-studio" destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain("Homepage templates");
    expect(markup).toContain("The current customer homepage stays unchanged");
    expect(markup).toContain('sandbox="allow-scripts"');
    expect(markup).toContain('referrerPolicy="no-referrer"');
    expect(markup).toContain("srcDoc=");
    expect(markup).toContain("Expand / exit full screen");
    expect(markup).toContain('href="/website-console"');
    expect(markup.includes('aria-current="page" href="/website-console?section=design-studio">Design Studio')).toBe(true);
    expect(markup).not.toContain("allow-same-origin");
    expect(markup).not.toContain("allow-forms");
    expect(markup).not.toContain("allow-top-navigation");
  });

  it("keeps all concepts, states and scorecard self-contained and network-disabled", () => {
    expect(review.version).toBe("1.1");
    for (const concept of ["Search First", "Premium Showroom", "Guided Shopping", "Signature Showroom", "Simple Hybrid"]) {
      expect(review.document).toContain(`data-variant="${concept}"`);
    }
    for (const state of ["default", "open", "selected", "loading", "empty", "returning"]) {
      expect(review.document).toContain(`value="${state}"`);
    }
    expect(review.document).toContain('data-control="concept"');
    expect(review.document).toContain("Comparison scorecard");
    expect(review.document).toContain("Shared component system");
    expect(review.document).toContain("connect-src 'none'");
    expect(review.document).toContain("form-action 'none'");
    expect(review.document).toContain("img-src data:");
    expect(review.document).toContain("prefers-reduced-motion: reduce");
    expect(review.document).toContain("Illustrative concept vehicles · not dealership inventory");
    expect(review.document).not.toMatch(/window\.openai|globalThis\.Tweak|localhost|127\.0\.0\.1|fetch\(|localStorage|sessionStorage/);
    expect(review.document).not.toMatch(/<script[^>]+src=|<img[^>]+src="https?:/);
  });
});
