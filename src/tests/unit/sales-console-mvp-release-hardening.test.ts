import { describe, expect, it } from "vitest";

import {
  salesConsoleMvpAcceptanceChecklist,
  salesConsoleMvpReleaseGatePasses,
  salesConsoleMvpRiskyWorkflowsRemainBlocked,
  salesConsoleSourceHealthSummary
} from "@/features/sales/sales-console-mvp-release-hardening";

describe("Sales Console M48 MVP release hardening", () => {
  it("defines the final MVP acceptance checklist", () => {
    expect(salesConsoleMvpReleaseGatePasses()).toBe(true);
    expect(salesConsoleMvpAcceptanceChecklist).toContain("all tabs respond");
    expect(salesConsoleMvpAcceptanceChecklist).toContain("search responds");
    expect(salesConsoleMvpAcceptanceChecklist).toContain("risky workflows blocked");
  });

  it("keeps source health honest and risky workflows blocked", () => {
    expect(salesConsoleSourceHealthSummary.map((source) => source.source)).toContain("CRM");
    expect(salesConsoleSourceHealthSummary.map((source) => source.source)).toContain("Finance");
    expect(salesConsoleMvpRiskyWorkflowsRemainBlocked()).toBe(true);
  });
});
