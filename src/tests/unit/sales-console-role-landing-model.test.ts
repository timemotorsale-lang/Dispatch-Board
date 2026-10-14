import { describe, expect, it } from "vitest";

import {
  salesConsoleM12EveryRoleHasLandingExperience,
  salesConsoleM12RoleLandingsHaveStartGuidance,
  salesConsoleM12RoleLandingsStayInsideSales,
  salesConsoleM12RoleLandingExperiences
} from "@/features/sales/sales-console-m12-role-landing-model";

describe("Sales Console M12 role landing model", () => {
  it("defines a landing experience for each dogfood role", () => {
    expect(salesConsoleM12EveryRoleHasLandingExperience()).toBe(true);
    expect(salesConsoleM12RoleLandingExperiences).toHaveLength(7);
  });

  it("keeps role landing experiences inside /sales", () => {
    expect(salesConsoleM12RoleLandingsStayInsideSales()).toBe(true);
  });

  it("provides start guidance for each role", () => {
    expect(salesConsoleM12RoleLandingsHaveStartGuidance()).toBe(true);
  });
});
