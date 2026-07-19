import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GovernanceAdministrationWorkspace } from "@/features/inventory/governance-administration-workspace";
import { GovernanceDecisionWorkspace } from "@/features/inventory/governance-decision-workspace";
import { GovernedReportsWorkspace } from "@/features/inventory/governed-reports-workspace";

const queueItem = { id: "DISPOSITION:1", kind: "APPROVAL", domain: "DISPOSITION_WHOLESALE", type: "CHANNEL_PRICE_RESERVE", title: "Disposition approval · INV-1", subject: "Exact proposal", owner: "Manager", location: "Main", dueAt: "2026-07-19T00:00:00.000Z", ageHours: 2, overdue: false, version: 3, policyVersion: "DWH-P1", amountCents: 1_200_000, evidence: ["Exact proposal and policy version"], state: "APPROVAL/WAITING", actionLabel: "Open disposition decision", actionHref: "/vehicles/disposition-wholesale?caseId=1" };
const model = {
  contractVersion: "inventory-governance/r10.0.0", generatedAt: "2026-07-18T15:00:00.000Z", scope: { organizationId: "org", locationIds: ["loc"], global: true }, capabilities: { decisions: "CONTEXTUAL_DOMAIN_COMMANDS", exports: "PREVIEW_ONLY_NOT_ACTIVATED", policyPublication: "EXISTING_FOUR_EYES_DOMAIN_COMMANDS", providerOperations: "OBSERVE_ONLY" },
  totals: { reviews: 1, approvals: 1, overdue: 0, failedCommands: 0, outboxAttention: 0, retentionDue: 0 }, reviews: [{ ...queueItem, id: "REVIEW:1", kind: "REVIEW", title: "Evidence review" }], approvals: [queueItem],
  reports: { facts: [{ code: "GOV_PENDING_APPROVALS", label: "Pending approvals", value: 1, unit: "COUNT", definitionVersion: "GOV-KPI-002/v1", quality: "COMPLETE", drillHref: "/manager-review?view=approvals" }], inventoryStages: [{ code: "FRONTLINE_READY", count: 1 }], repairStates: [{ code: "REPAIR", count: 1 }], snapshot: { cutoffAt: "2026-07-18T15:00:00.000Z", timezone: "America/Chicago", restatement: "CURRENT_SNAPSHOT", cohort: "AUTHORIZED_LOCATION_SCOPE" } },
  administration: { roles: [{ id: "role", name: "General Manager", users: 1, duties: 2 }], users: [], locations: [], grants: [{ id: "grant", user: "Manager", capability: "INVENTORY_UNIT_MANAGE", effect: "ALLOW", location: "Main", constraints: {}, validFrom: "2026-01-01T00:00:00Z", validTo: null }], flags: [{ id: "flag", code: "RETAIL_INVENTORY", mode: "SHADOW", rolloutPercent: 0, version: 1, location: "Enterprise", updatedAt: "2026-07-18T00:00:00Z" }], policies: [{ id: "policy", code: "DWH", domain: "DISPOSITION", version: 1, status: "DRAFT", createdByUserId: "one", approvedByUserId: null, effectiveFrom: null, effectiveTo: null }], operations: { failedCommands24h: 0, outboxAttention: 0, retentionDue: 0, projections: [{ code: "CONTROL_TOWER", lagSeconds: 0, state: "HEALTHY", lastError: null }] }, audit: [{ id: "audit", domain: "INVENTORY", eventType: "APPROVED", subjectType: "CASE", subjectId: "1", actor: "Manager", location: "Main", reason: "Exact decision", correlationId: "correlation", occurredAt: "2026-07-18T00:00:00Z" }] }
};

describe("R10 inventory governance, reporting, and administration", () => {
  it("renders review and approval as distinct enterprise queues with exact decision context", () => {
    const reviews = renderToStaticMarkup(<GovernanceDecisionWorkspace model={model as never} view="reviews" scope="inventory" />), approvals = renderToStaticMarkup(<GovernanceDecisionWorkspace model={model as never} view="approvals" scope="inventory" />);
    expect(reviews).toContain("Evidence-ready review work");
    expect(approvals).toContain("Exact version");
    expect(approvals).toContain("DWH-P1");
    expect(approvals).toContain("authoritative domain workspace");
  });
  it("renders governed KPI definitions, cutoff, quality, and drill-through", () => {
    const markup = renderToStaticMarkup(<GovernedReportsWorkspace model={model as never} />);
    for (const token of ["GOV-KPI-002/v1", "Quality: COMPLETE", "CURRENT_SNAPSHOT", "Open governed drill-through", "Open controlled exports"]) expect(markup).toContain(token);
  });
  it("renders policy, access, audit, operations, and retention administration destinations", () => {
    const markup = renderToStaticMarkup(<GovernanceAdministrationWorkspace model={model as never} />);
    for (const token of ["Policies", "Access &amp; authority", "Audit", "Operations", "Retention", "OBSERVE / GOVERN"]) expect(markup).toContain(token);
  });
  it("composes existing authoritative models and avoids a generic approval mutation", () => {
    const source = readFileSync("src/server/inventory-governance/service.ts", "utf8"), api = readFileSync("src/app/api/inventory-governance/route.ts", "utf8");
    for (const token of ["inventoryAcquisitionCase", "inventoryFrontlineWorkflow", "inventoryRetailCompletion", "inventoryDispositionCase", "partPurchaseOrder", "enterpriseAuditEvent", "vehiclePolicyVersion", "vehicleCapabilityGrant"]) expect(source).toContain(token);
    expect(api).toContain("export async function GET");
    expect(api).not.toContain("export async function POST");
  });
});
