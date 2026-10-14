import { describe, expect, it } from "vitest";

import {
  salesConsoleM13PilotGuideCoversStaffAndManagers,
  salesConsoleM13PilotGuideExplainsWhatItIsAndIsNot,
  salesConsoleM13StaffPilotGuide
} from "@/features/sales/sales-console-m13-staff-pilot-guide";

describe("Sales Console M13 staff pilot guide", () => {
  it("explains what the console is and is not", () => {
    expect(salesConsoleM13PilotGuideExplainsWhatItIsAndIsNot()).toBe(true);
    expect(salesConsoleM13StaffPilotGuide.whatItIsNot).toContain("not a CRM replacement");
  });

  it("covers all staff, salespeople, and managers", () => {
    expect(salesConsoleM13PilotGuideCoversStaffAndManagers()).toBe(true);
  });
});
