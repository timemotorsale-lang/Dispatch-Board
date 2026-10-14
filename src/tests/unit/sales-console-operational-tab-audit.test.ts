import { describe, expect, it } from "vitest";

import {
  salesConsoleM14AuditDemotesPlanningPanels,
  salesConsoleM14AuditIdentifiesPlaceholderHeavySurfaces,
  salesConsoleM14AuditKeepsWritesPlanned,
  salesConsoleM14OperationalTabAudit
} from "@/features/sales/sales-console-m14-operational-tab-audit";

describe("Sales Console M14 operational tab audit", () => {
  it("identifies placeholder-heavy surfaces", () => {
    expect(salesConsoleM14AuditIdentifiesPlaceholderHeavySurfaces()).toBe(true);
    expect(salesConsoleM14OperationalTabAudit).toHaveLength(8);
  });

  it("marks planning panels for demotion", () => {
    expect(salesConsoleM14AuditDemotesPlanningPanels()).toBe(true);
  });

  it("keeps future write actions planned", () => {
    expect(salesConsoleM14AuditKeepsWritesPlanned()).toBe(true);
  });
});
