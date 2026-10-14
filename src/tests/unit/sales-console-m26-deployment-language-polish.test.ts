import { describe, expect, it } from "vitest";

import {
  salesConsoleM26ArchivesPlanningEvidence,
  salesConsoleM26DeploymentLanguagePolish,
  salesConsoleM26NamesOnlyLiveSubmitWorkflow,
  salesConsoleM26StaffPostureIsDeployableMvp
} from "@/features/sales/sales-console-m26-deployment-language-polish";

describe("Sales Console M26 deployment language polish", () => {
  it("sets the staff-facing posture to deployable MVP", () => {
    expect(salesConsoleM26StaffPostureIsDeployableMvp()).toBe(true);
  });

  it("archives planning-era evidence from daily staff flow", () => {
    expect(salesConsoleM26ArchivesPlanningEvidence()).toBe(true);
    expect(salesConsoleM26DeploymentLanguagePolish.archivedEvidencePanels).toContain("M16 disabled manager review request preview");
  });

  it("names Manager Review Request as the only live submit workflow", () => {
    expect(salesConsoleM26NamesOnlyLiveSubmitWorkflow()).toBe(true);
  });
});
