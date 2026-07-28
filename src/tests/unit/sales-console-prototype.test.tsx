import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalesConsoleError from "@/app/(app)/sales/error";
import SalesConsoleLoading from "@/app/(app)/sales/loading";
import SalesPage from "@/app/(app)/sales/page";
import { salesConsoleMvpDefinition } from "@/features/sales/sales-console-mvp-definition";
import { salesConsoleMvpExecution } from "@/features/sales/sales-console-mvp-execution";
import { salesConsoleMvpLiveDataContract } from "@/features/sales/sales-console-mvp-live-data-contract";
import { salesConsolePilotReadiness } from "@/features/sales/sales-console-mvp-pilot-readiness";
import { salesConsoleReadAdapterPreview } from "@/features/sales/sales-console-mvp-read-adapters";
import { salesConsoleMvpRealDataWiring } from "@/features/sales/sales-console-mvp-real-data-wiring";
import { salesConsoleRoleViews } from "@/features/sales/sales-console-mvp-role-views";
import { SalesConsolePrototype } from "@/features/sales/sales-console-prototype";

describe("Sales Console prototype", () => {
  it("renders the /sales route shell for the MVP execution foundation", () => {
    const markup = renderToStaticMarkup(<SalesPage />);

    expect(markup).toContain("Enterprise Sales Console prototype");
    expect(markup).toContain("Read-only MVP pilot shell");
  });

  it("renders the first sales console slice with the required operating surfaces", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Enterprise Sales Console prototype");
    expect(markup).toContain("Salesperson Today");
    expect(markup).toContain("Deal Desk");
    expect(markup).toContain("Inventory Intelligence");
    expect(markup).toContain("Manager Command Center");
    expect(markup).toContain("Lead Operations");
  });

  it("keeps the first slice non-destructive and prototype-scoped", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Definition");
    expect(markup).toContain(salesConsoleMvpDefinition.operatingBoundary);
    expect(markup).toContain("Customer messaging automation");
    expect(markup).toContain("Quote submission");
    expect(markup).toContain("Vehicle holds or reservations");
    expect(markup).toContain("Finance decisions");
    expect(markup).toContain("Discount approvals");
  });

  it("renders the MVP principles that guide future expansion", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Principles");
    for (const principle of salesConsoleMvpDefinition.principles) {
      expect(markup).toContain(principle.name);
      expect(markup).toContain(principle.meaning);
    }
  });

  it("renders the MVP milestone roadmap for implementation planning", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Milestone Roadmap");
    expect(salesConsoleMvpDefinition.milestoneRoadmap).toHaveLength(13);
    for (const milestone of salesConsoleMvpDefinition.milestoneRoadmap) {
      expect(markup).toContain(milestone.id);
    }
    expect(markup).toContain("Approval and scope lock");
    expect(markup).toContain("Pilot review and stabilize");
  });

  it("renders what is included in the MVP for scope review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("What Is Included In The MVP");
    expect(salesConsoleMvpDefinition.includedInMvp).toHaveLength(8);
    for (const item of salesConsoleMvpDefinition.includedInMvp) {
      expect(markup).toContain(item.area);
      expect(markup).toContain(item.outcome);
    }
    expect(markup).toContain("Console shell and navigation");
    expect(markup).toContain("Enterprise guardrails");
  });

  it("renders the recommended MVP boundary for release control", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Recommended MVP Boundary");
    expect(markup).toContain(salesConsoleMvpDefinition.recommendedMvpBoundary.recommendation);
    expect(markup).toContain(salesConsoleMvpDefinition.recommendedMvpBoundary.releaseLine);
    expect(salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables) {
      expect(markup).toContain(item);
    }
  });

  it("renders the MVP execution shell health and role placeholders", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Sales Console MVP execution foundation");
    expect(markup).toContain("Read-only MVP pilot shell");
    expect(salesConsoleMvpExecution.shellChecks).toHaveLength(4);
    for (const check of salesConsoleMvpExecution.shellChecks) {
      expect(markup).toContain(check.check);
      expect(markup).toContain(check.proof);
    }
    for (const role of salesConsoleRoleViews) {
      expect(markup).toContain(role.label);
      expect(markup).toContain(role.defaultSurface);
    }
  });

  it("renders role-based console visibility without enabling excluded actions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Role-Based Console");
    expect(markup).toContain("Active pilot role: Sales Manager");
    expect(markup).toContain("Source records stay as the system of record");
    for (const role of salesConsoleRoleViews) {
      expect(markup).toContain(role.label);
      expect(markup).toContain(`Default: ${role.defaultSurface}`);
      expect(markup).toContain(role.placeholderBehavior);
      expect(markup).toContain(`${role.blockedActionCount} actions disabled/planned`);
      expect(role.futureActions.every((action) => action.enabled === false)).toBe(true);
    }
    expect(markup).toContain("Restricted: Manager Command Center");
    expect(markup).toContain("Restricted: None in read-only pilot");
  });

  it("renders read-only guardrails for every excluded risky MVP action", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read-Only Action Guardrails");
    expect(salesConsoleMvpExecution.readOnlyGuardrails).toHaveLength(5);
    for (const guardrail of salesConsoleMvpExecution.readOnlyGuardrails) {
      expect(markup).toContain(guardrail.action);
      expect(markup).toContain(guardrail.reason);
    }
    expect(salesConsoleMvpExecution.readOnlyGuardrails.every((guardrail) => guardrail.status !== "ready")).toBe(true);
  });

  it("renders typed data-contract placeholders with freshness labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Execution Data Contract");
    expect(salesConsoleMvpExecution.dataContractFields).toHaveLength(6);
    for (const field of salesConsoleMvpExecution.dataContractFields) {
      expect(markup).toContain(field.field);
      expect(markup).toContain(field.fallbackLabel);
    }
    expect(markup).toContain("verify-first");
    expect(markup).toContain("placeholder");
    expect(markup).toContain("stale");
  });

  it("renders the live data contract without enabling writes", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Live Data Contract");
    expect(markup).toContain(salesConsoleMvpLiveDataContract.boundary);
    expect(salesConsoleMvpLiveDataContract.liveSources).toHaveLength(6);
    for (const source of salesConsoleMvpLiveDataContract.liveSources) {
      expect(source.mode).toBe("read-only");
      expect(markup).toContain(source.name);
      expect(markup).toContain(source.fallback);
    }
  });

  it("renders real data wiring evidence with safe fallback labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Real Data Wiring");
    expect(markup).toContain(salesConsoleMvpRealDataWiring.boundary);
    for (const source of salesConsoleMvpRealDataWiring.connectedSources) {
      expect(markup).toContain(source.source);
      expect(markup).toContain(source.fallback);
    }
    expect(markup).toContain("Board/task read model");
    expect(markup).toContain("Customer lead read model");
    expect(markup).toContain("Vehicle registry read model");
    expect(markup).toContain("Appointment context remains fallback");
  });

  it("renders read model contracts for every MVP operating surface", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read Model Contracts");
    expect(salesConsoleMvpLiveDataContract.readModels).toHaveLength(6);
    for (const model of salesConsoleMvpLiveDataContract.readModels) {
      expect(markup).toContain(model.surface);
      expect(markup).toContain(model.recordKey);
      expect(model.requiredFields.length).toBeGreaterThan(4);
    }
    expect(markup).toContain("No quote submission is allowed from placeholder deal data.");
  });

  it("renders source link contracts with freshness and unavailable labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Source Link Contracts");
    expect(salesConsoleMvpLiveDataContract.sourceLinks).toHaveLength(5);
    for (const link of salesConsoleMvpLiveDataContract.sourceLinks) {
      expect(markup).toContain(link.label);
      expect(markup).toContain(link.routePattern);
      expect(markup).toContain(link.unavailableLabel);
    }
  });

  it("keeps adapter safety rules read-only and non-escalating", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Adapter Safety Rules");
    expect(salesConsoleMvpLiveDataContract.adapterRules).toHaveLength(4);
    for (const rule of salesConsoleMvpLiveDataContract.adapterRules) {
      expect(markup).toContain(rule.rule);
      expect(markup).toContain(rule.enforcement);
    }
    expect(markup).toContain("Data presence cannot enable messaging, quote submission, vehicle holds, finance decisions, or discount approvals in MVP.");
  });

  it("renders read adapter preview output without changing source records", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read Adapter Preview");
    expect(markup).toContain("Read-only adapter output from mock source-shaped records.");
    expect(salesConsoleReadAdapterPreview.readOnly).toBe(true);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.sellerQueue.length} normalized items`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.leadOperations.length} lead signals`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.inventoryMatches.length} vehicle matches`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.managerRisks.length} aggregated risks`);
  });

  it("uses the read adapter model for the visible operating UI", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain(`Showing ${salesConsoleReadAdapterPreview.sellerQueue.length} adapter-ranked work items`);
    expect(markup).toContain("Quote scenarios are visibility-only from the adapter.");
    expect(markup).toContain("Adapter Deals");
    expect(markup).toContain("Seller Items");
    expect(markup).toContain("Lead Risks");
    expect(markup).toContain("Verify Vehicles");
    for (const item of salesConsoleReadAdapterPreview.sellerQueue) {
      expect(markup).toContain(item.customer);
      expect(markup).toContain(item.nextAction);
      expect(markup).toContain(item.freshness);
      expect(markup).toContain(item.sourceLinks[0]?.unavailableLabel);
    }
    for (const deal of salesConsoleReadAdapterPreview.deals) {
      expect(markup).toContain(deal.dealId);
      expect(markup).toContain(deal.scenario);
    }
    for (const vehicle of salesConsoleReadAdapterPreview.inventoryMatches) {
      expect(markup).toContain(vehicle.vehicle);
      expect(markup).toContain(vehicle.status);
    }
    expect(markup).toContain("Adapter Source Links");
    expect(markup).toContain("Blocked:");
    expect(markup).toContain("Verify First");
  });

  it("renders pilot readiness smoke checks for safe review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Pilot Readiness Smoke");
    expect(salesConsoleMvpExecution.pilotReadinessChecks).toHaveLength(4);
    for (const check of salesConsoleMvpExecution.pilotReadinessChecks) {
      expect(markup).toContain(check.check);
      expect(markup).toContain(check.evidence);
    }
    expect(markup).toContain("Read-only guardrails");
  });

  it("renders pilot-ready MVP checks, priority brief, state verification, and fallback states", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Pilot-Ready MVP");
    expect(markup).toContain("30 seconds");
    expect(markup).toContain("Pilot State Verification");
    expect(markup).toContain("Pilot Acceptance Tracking");
    expect(markup).toContain("Pilot Empty &amp; Fallback States");
    for (const priority of salesConsolePilotReadiness.priorityBrief) {
      expect(markup).toContain(priority);
    }
    for (const state of salesConsolePilotReadiness.stateVerification) {
      expect(markup).toContain(state.label);
      expect(markup).toContain(state.meaning);
    }
    for (const fallback of salesConsolePilotReadiness.fallbackStates) {
      expect(markup).toContain(fallback.emptyLabel);
      expect(markup).toContain(fallback.fallbackAction);
    }
    expect(salesConsolePilotReadiness.pilotBlockers).toHaveLength(0);
  });

  it("renders MVP roles and permissions for pilot access review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Roles &amp; Permissions");
    expect(salesConsoleMvpDefinition.rolesAndPermissions).toHaveLength(4);
    for (const role of salesConsoleMvpDefinition.rolesAndPermissions) {
      expect(markup).toContain(role.role);
      expect(markup).toContain(role.mvpControl);
    }
    expect(markup).toContain("Sales Manager");
    expect(markup).toContain("BDC / Lead Coordinator");
  });

  it("renders the MVP data source map for data-trust review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Data Source Map");
    expect(salesConsoleMvpDefinition.dataSourceMap).toHaveLength(6);
    for (const source of salesConsoleMvpDefinition.dataSourceMap) {
      expect(markup).toContain(source.surface);
      expect(markup).toContain(source.fallback);
    }
    expect(markup).toContain("Inventory Intelligence");
    expect(markup).toContain("Customer and source links");
  });

  it("renders the MVP pilot acceptance checklist for release readiness", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Pilot Acceptance Checklist");
    expect(salesConsoleMvpDefinition.pilotAcceptanceChecklist).toHaveLength(7);
    for (const check of salesConsoleMvpDefinition.pilotAcceptanceChecklist) {
      expect(markup).toContain(check.item);
      expect(markup).toContain(check.owner);
    }
    expect(markup).toContain("No risky write actions are active");
  });

  it("renders MVP exclusions so the pilot scope stays controlled", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("What Is Excluded From The MVP");
    expect(salesConsoleMvpDefinition.excludedFromMvp).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.excludedFromMvp) {
      expect(markup).toContain(item.capability);
      expect(markup).toContain(item.reason);
    }
    expect(markup).toContain("Full CRM replacement");
  });

  it("renders the MVP build order for implementation sequencing", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Build Order");
    expect(salesConsoleMvpDefinition.buildOrder).toHaveLength(7);
    for (const item of salesConsoleMvpDefinition.buildOrder) {
      expect(markup).toContain(item.step);
      expect(markup).toContain(item.name);
    }
    expect(markup).toContain("Pilot, measure, and stabilize");
  });

  it("renders MVP decision gates for review checkpoints", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Decision Gates");
    expect(salesConsoleMvpDefinition.decisionGates).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.decisionGates) {
      expect(markup).toContain(item.gate);
      expect(markup).toContain(item.passSignal);
    }
    expect(markup).toContain("Gate 6: Expansion readiness");
  });

  it("uses sales-specific loading and error states for protected route failures", () => {
    const loadingMarkup = renderToStaticMarkup(<SalesConsoleLoading />);
    const errorMarkup = renderToStaticMarkup(
      <SalesConsoleError error={new Error("smoke failure")} reset={() => undefined} />
    );

    expect(loadingMarkup).toContain("Opening Sales Console");
    expect(errorMarkup).toContain("Couldn&#x27;t open Sales Console");
    expect(errorMarkup).toContain("Retry Sales Console");
    expect(errorMarkup).toContain("Open Dispatch Board");
  });
});
