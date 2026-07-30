import { describe, expect, it } from "vitest";

import {
  getSalesConsoleAppointmentHref,
  getSalesConsoleCrossConsoleLinksForLane,
  getSalesConsoleCustomer360Href,
  getSalesConsoleTaskHref,
  getSalesConsoleVehicle360Href,
  salesConsoleCrossConsoleNavigationTargets,
  salesConsoleCrossConsoleTargetsRemainSafe,
  salesConsoleCrossConsoleWiringCoversCoreDestinations
} from "@/features/sales/sales-console-cross-console-integration";

describe("Sales Console cross-console integration wiring", () => {
  it("covers the core Dispatch Board destinations", () => {
    expect(salesConsoleCrossConsoleWiringCoversCoreDestinations()).toBe(true);
    expect(salesConsoleCrossConsoleNavigationTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "Customer 360", href: "/customers/customer-360" }),
        expect.objectContaining({ destination: "Appointments", href: "/appointments" }),
        expect.objectContaining({ destination: "Tasks", href: "/tasks" }),
        expect.objectContaining({ destination: "Inventory / Vehicle 360", href: "/vehicles/360" })
      ])
    );
  });

  it("returns lane-specific links with role visibility", () => {
    const managerLinks = getSalesConsoleCrossConsoleLinksForLane("Inventory BHPH Sale", "Sales Manager");
    const salespersonLinks = getSalesConsoleCrossConsoleLinksForLane("Inventory BHPH Sale", "Salesperson");

    expect(managerLinks.map((link) => link.destination)).toEqual(
      expect.arrayContaining(["Customer 360", "Inventory / Vehicle 360", "Finance Handoff", "Tasks"])
    );
    expect(salespersonLinks.map((link) => link.destination)).not.toContain("Finance Handoff");
  });

  it("builds concrete deep links for source records", () => {
    expect(getSalesConsoleVehicle360Href("TMS22145")).toBe("/vehicles/360/TMS22145");
    expect(getSalesConsoleTaskHref("TASK-1")).toBe("/tasks/TASK-1");
    expect(getSalesConsoleAppointmentHref("APT-1")).toBe("/appointments?appointmentId=APT-1");
    expect(getSalesConsoleCustomer360Href("John Smith")).toBe("/customers/customer-360?customer=John%20Smith");
  });

  it("keeps cross-console targets out of risky command routes", () => {
    expect(salesConsoleCrossConsoleTargetsRemainSafe()).toBe(true);
  });
});
