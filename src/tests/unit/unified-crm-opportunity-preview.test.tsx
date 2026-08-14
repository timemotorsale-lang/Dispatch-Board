import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityPreview } from "@/features/unified-crm/unified-crm-opportunity-preview";

describe("Unified CRM opportunity preview", () => {
  it("stays honest about the held opportunity lifecycle", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmOpportunityPreview />);

    expect(markup).toContain("Foundation is ready. Lifecycle rules are intentionally held.");
    expect(markup).toContain("Stage policy");
    expect(markup).toContain("Owning-system bridges");
    expect(markup).toContain("No opportunity record is created in this preview.");
    expect(markup).toContain("Approve stage definitions and transition evidence to unlock operational opportunity slices.");
    expect(markup).not.toContain("Move to proposal");
    expect(markup).not.toContain("Won");
  });
});
