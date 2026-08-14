import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView, UNIFIED_CRM_REVIEW_NOTICE } from "@/features/unified-crm/unified-crm-shell-review-model";

describe("Unified CRM UX review shell", () => {
  it("leads with prioritized work and labels every scenario as synthetic review", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmShell activeView="home" userName="Alex Operator" />);

    expect(markup).toContain("Here’s what needs attention, Alex");
    expect(markup).toContain("Do this next");
    expect(markup).toContain("synthetic scenarios only");
    expect(markup).toContain(UNIFIED_CRM_REVIEW_NOTICE.replace("Experience review — ", ""));
    expect(markup).toContain("The CRM review does not write or send anything");
    expect(markup).toContain("/customers?returnTo=%2Fcrm");
    expect(markup).not.toContain("Send message");
    expect(markup).not.toContain("Save opportunity");
  });

  it("keeps manual conversations and pipeline movement visibly non-operational", () => {
    const conversations = renderToStaticMarkup(<UnifiedCrmShell activeView="conversations" userName="Alex Operator" />);
    const pipeline = renderToStaticMarkup(<UnifiedCrmShell activeView="pipeline" userName="Alex Operator" />);

    expect(conversations).toContain("No external messages are sent or synchronized");
    expect(pipeline).toContain("No stage changes are available in this experience review");
  });

  it("falls back safely for unknown views and renders an honest unavailable state", () => {
    expect(parseUnifiedCrmView("unknown")).toBe("home");
    expect(parseUnifiedCrmView(["work", "pipeline"])).toBe("work");

    const unavailable = renderToStaticMarkup(
      <UnifiedCrmUnavailable fallbackHref="/my-tasks" reason="The review is off." />
    );
    expect(unavailable).toContain("Experience review is not available");
    expect(unavailable).toContain('href="/my-tasks"');
    expect(unavailable).toContain("The review is off.");
  });
});
