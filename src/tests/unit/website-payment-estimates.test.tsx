import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteConsole } from "@/features/website-console/website-console";
import { resolveWebsiteSection, websiteConsoleNavigationItems } from "@/features/website-console/navigation";

describe("Payment Estimates setup and private review", () => {
  it("has a permanent console location without inventing a published calculator", () => {
    expect(resolveWebsiteSection("payment-estimates")).toBe("payment-estimates");
    expect(websiteConsoleNavigationItems.find(item => item.title === "Payment Estimates")?.href).toBe("/website-console?section=payment-estimates");
    const markup = renderToStaticMarkup(<WebsiteConsole section="payment-estimates" destinations={{ publicUrl: null, previewUrl: null }} />);
    expect(markup).toContain("Public activation blocked");
    expect(markup).toContain("Both the owner and designated finance manager");
    expect(markup).toContain("does not record approvals");
    expect(markup).toContain("66 months");
    expect(markup).toContain("Blank means unknown, not zero.");
    expect(markup).not.toContain(">Approve<");
    expect(markup).not.toContain(">Publish<");
    expect(markup).not.toContain("localStorage");
  });
  it("links to the actual private preview only when a destination exists", () => {
    const markup = renderToStaticMarkup(<WebsiteConsole section="payment-estimates" destinations={{ publicUrl: null, previewUrl: "/website-review" }} />);
    expect(markup).toContain('href="/website-review/budget"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
