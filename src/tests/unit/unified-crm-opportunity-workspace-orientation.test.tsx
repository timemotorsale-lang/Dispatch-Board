import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnifiedCrmOpportunityWorkspaceOrientation } from "@/features/unified-crm/unified-crm-opportunity-workspace-orientation";
import {
  buildUnifiedCrmOpportunityReviewHref,
  createUnifiedCrmOpportunityWorkspaceOrientation
} from "@/server/unified-crm/opportunity-workspace-orientation";

function accessContext(scope: "organization" | "owned") {
  return {
    actorUserId: scope === "organization" ? "manager-1" : "seller-1",
    capabilities: {
      read: true,
      create: false,
      transition: false,
      linkTask: false,
      linkAppointment: false,
      linkDispatch: false
    },
    fallbackHref: scope === "organization" ? "/manager-workspace" : "/tasks?department=SALES",
    mode: "REVIEW" as const,
    organizationId: "org-a",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

describe("Unified CRM opportunity workspace orientation", () => {
  it.each([
    ["pipeline", "You are at the workspace entry point"],
    ["hub", "You are in the workspace map"],
    ["guided", "You are following the intended review path"]
  ] as const)("renders a semantic %s orientation with one current step", (current, title) => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmOpportunityWorkspaceOrientation
        current={current}
        visibilityLabel="Owned review"
      />
    );

    expect(markup).toContain('aria-label="Opportunity workspace orientation"');
    expect(markup).toContain(`<h2>${title}</h2>`);
    expect(markup).toContain("Owned review");
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    for (const label of ["Pipeline", "Hub", "Guided journey"]) expect(markup).toContain(label);
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("<button");
  });

  it("derives consistent source and visibility orientation", () => {
    expect(createUnifiedCrmOpportunityWorkspaceOrientation(accessContext("organization"), {
      generatedAt: "2026-08-15T02:00:00.000Z",
      sourceLabel: "Opportunity source"
    })).toEqual({
      source: {
        href: "/crm?view=pipeline",
        label: "Opportunity source",
        observedAt: "2026-08-15T02:00:00.000Z"
      },
      visibility: "organization",
      visibilityLabel: "organization review"
    });
    expect(createUnifiedCrmOpportunityWorkspaceOrientation(accessContext("owned"), {
      generatedAt: "2026-08-15T02:00:00.000Z",
      sourceLabel: "Opportunity source"
    })).toMatchObject({ visibility: "owned", visibilityLabel: "owned review" });
  });

  it("builds only internal review hrefs and encodes opaque route identifiers", () => {
    expect(buildUnifiedCrmOpportunityReviewHref("pipeline")).toBe("/crm?view=pipeline");
    expect(buildUnifiedCrmOpportunityReviewHref("queue")).toBe("/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    expect(buildUnifiedCrmOpportunityReviewHref("create")).toBe("/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline");
    const detail = buildUnifiedCrmOpportunityReviewHref("detail", "review/../../evil?next=//host");
    const transition = buildUnifiedCrmOpportunityReviewHref("transition", "review/../../evil?next=//host");
    expect(detail).toMatch(/^\/crm\/opportunities\/[^/]+\?crmReturnTo=/);
    expect(transition).toMatch(/^\/crm\/opportunities\/[^/]+\/transition\?crmReturnTo=/);
    expect(detail).not.toContain("//host");
    expect(transition).not.toContain("//host");
  });
});
