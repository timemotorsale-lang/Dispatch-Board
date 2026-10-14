import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DomainWorkflowOperations } from "@/features/inventory/domain-workflow-operations";
import { buildDomainWorkflowQueue, buildWholesaleRecommendationCalibration } from "@/server/domain-workflow-operations/domain";

const now = new Date("2026-07-18T15:00:00.000Z");

describe("Inventory Console gap closure Wave 3", () => {
  it("prioritizes governed domain exceptions deterministically", () => {
    const items = buildDomainWorkflowQueue([
      { domain: "PARTS", dueAt: new Date("2026-07-17T15:00:00.000Z"), href: "/parts", id: "po-1", label: "PO-1", location: "Main", nextAction: "Resolve discrepancy", operatingState: "BLOCKED", owner: "Alex", reason: "Short receipt", stage: "RECEIVING_DISCREPANCY" },
      { domain: "FRONTLINE", dueAt: new Date("2026-07-19T15:00:00.000Z"), href: "/frontline", id: "wf-1", label: "INV-1", location: "Main", nextAction: "Inspect", operatingState: "WAITING", owner: "Sam", reason: null, stage: "INSPECTION_AND_TRIAGE" },
    ], now);
    expect(items.map(item => item.workItemId)).toEqual(["PARTS:po-1:RECEIVING_DISCREPANCY", "FRONTLINE:wf-1:INSPECTION_AND_TRIAGE"]);
    expect(items[0]).toMatchObject({ overdue: true, priority: "CRITICAL" });
  });

  it("links wholesale expected net to acknowledged closed outcomes without executing", () => {
    expect(buildWholesaleRecommendationCalibration([
      { actualNetCents: 9_500, caseId: "1", expectedNetCents: 10_000, toleranceCents: 500 },
      { actualNetCents: 11_000, caseId: "2", expectedNetCents: 10_000, toleranceCents: 250 },
    ])).toMatchObject({ evidenceState: "INSUFFICIENT_SAMPLE", execution: "ADVISORY_NON_EXECUTING", meanAbsoluteVarianceCents: 750, observationCount: 2, signedVarianceCents: 250, withinToleranceRate: 50 });
  });

  it("renders a truthful intervention surface with authoritative workspace routing", () => {
    const markup = renderToStaticMarkup(<DomainWorkflowOperations initial={{ contractVersion: "domain-workflow-operations/wave-3.0.0", generatedAt: now.toISOString(), capability: { execution: "AUTHORITATIVE_WORKSPACES_ONLY", notifications: "OUTBOX_EVENTS_ONLY_NO_DELIVERY_PROVIDER", scheduling: "DETECTION_ONLY_NO_BACKGROUND_EXECUTION" }, totals: { critical: 1, high: 0, open: 1, overdue: 1 }, items: [{ domain: "WHOLESALE", dueAt: now.toISOString(), href: "/vehicles/disposition-wholesale?caseId=case-1", id: "case-1", label: "INV-1", location: "Main", nextAction: "Resolve settlement mismatch", operatingState: "BLOCKED", owner: "Alex", overdue: true, priority: "CRITICAL", reason: "Settlement variance", stage: "SETTLEMENT", workItemId: "WHOLESALE:case-1:SETTLEMENT" }], wholesaleCalibration: { evidenceState: "INSUFFICIENT_SAMPLE", execution: "ADVISORY_NON_EXECUTING", meanAbsoluteVarianceCents: null, observationCount: 0, signedVarianceCents: null, withinToleranceRate: null } }} />);
    expect(markup).toContain("Domain Workflow Operations");
    expect(markup).toContain("Detection only");
    expect(markup).toContain("AUTHORITATIVE_WORKSPACES_ONLY");
    expect(markup).toContain("Resolve settlement mismatch");
    expect(markup).toContain("Calibration is advisory");
  });
});
