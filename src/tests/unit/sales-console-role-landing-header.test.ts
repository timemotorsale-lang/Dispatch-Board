import { describe, expect, it } from "vitest";

import {
  getSalesConsoleM12RoleLandingHeader,
  salesConsoleM12DefaultRoleLandingHeader,
  salesConsoleM12EveryLandingHeaderTargetsInternalSection,
  salesConsoleM12LandingHeaderStaysReadOnly
} from "@/features/sales/sales-console-m12-role-landing-header";
import { salesConsoleM12RoleLandingExperiences } from "@/features/sales/sales-console-m12-role-landing-model";

describe("Sales Console M12 role landing header", () => {
  it("creates a read-only default landing header", () => {
    expect(salesConsoleM12DefaultRoleLandingHeader.activeLanding.role).toBe("sales-manager");
    expect(salesConsoleM12LandingHeaderStaysReadOnly()).toBe(true);
  });

  it("targets internal /sales sections for every role", () => {
    expect(salesConsoleM12EveryLandingHeaderTargetsInternalSection()).toBe(true);
    for (const landing of salesConsoleM12RoleLandingExperiences) {
      expect(getSalesConsoleM12RoleLandingHeader(landing.role).sectionHref).toBe(`#${landing.defaultSectionId}`);
    }
  });
});
