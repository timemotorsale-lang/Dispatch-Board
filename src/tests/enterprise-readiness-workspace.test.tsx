import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnterpriseReadinessWorkspace } from "@/features/inventory/enterprise-readiness-workspace";
import { READINESS_GATES, SIGNOFF_DIMENSIONS } from "@/server/enterprise-readiness/domain";

describe("R12 enterprise readiness workspace", () => {
  it("renders a truthful fail-closed landing when no pilot exists", () => {
    const html = renderToStaticMarkup(<EnterpriseReadinessWorkspace model={{ contractVersion: "inventory-console-readiness/r12.0.0", generatedAt: "2026-07-18T00:00:00.000Z", activation: { enabled: false, posture: "BLOCKED_PENDING_NAMED_AUTHORITY", authority: null }, gates: READINESS_GATES, pilots: [], signoffDimensions: SIGNOFF_DIMENSIONS }} />);
    expect(html).toContain("Readiness &amp; controlled pilot");
    expect(html).toContain("Pilot activation is blocked");
    expect(html).toContain("No pilot has been authorized");
    expect(html).toContain("Evidence gates");
    expect(html).toContain("Pause &amp; rollback");
    expect(html).toContain("Sign-offs");
  });
});
