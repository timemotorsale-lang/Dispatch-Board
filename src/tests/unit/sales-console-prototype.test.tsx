import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalesConsoleError from "@/app/(app)/sales/error";
import SalesConsoleLoading from "@/app/(app)/sales/loading";
import { salesConsoleMvpDefinition } from "@/features/sales/sales-console-mvp-definition";
import { SalesConsolePrototype } from "@/features/sales/sales-console-prototype";

describe("Sales Console prototype", () => {
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
