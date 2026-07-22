import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { DiagnosticIntake, type DiagnosticIntakeOptions } from "@/features/diagnostics/diagnostic-intake";

const options: DiagnosticIntakeOptions = {
  customers: [{ displayName: "Jordan Ellis", id: "customer-1" }],
  locations: [{ code: "MAIN", id: "location-1", name: "Main Service" }],
  repairOrders: [{
    customer: { displayName: "Jordan Ellis", id: "customer-1" },
    id: "ro-1",
    location: { code: "MAIN", id: "location-1", name: "Main Service" },
    operatingState: "ACTIVE",
    ownerUser: { id: "tech-1", name: "Walter Mechanic" },
    repairOrderNumber: "RO-3411",
    serviceVisit: { concernSummary: "Intermittent hot no-start", transportMode: "DROP_OFF" },
    stage: "INTAKE",
    vehicle: { id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-1", vin: "1FTFW1E84KFC12345", year: 2019 },
  }],
  users: [{ id: "tech-1", name: "Walter Mechanic" }],
  vehicles: [{ id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-1", vin: "1FTFW1E84KFC12345", year: 2019 }],
};

describe("diagnostic intake", () => {
  it("renders the approved vehicle, concern, service-context, and readiness workflow", () => {
    const html = renderToStaticMarkup(<DiagnosticIntake options={options} permissions={{ canAssign: true, canCreate: true }} rollout={{ executable: false, reason: "MASTER_DISABLED" }} viewer={{ id: "tech-1", name: "Walter Mechanic" }} />);

    expect(html).toContain("New Diagnostic Case");
    for (const step of ["Vehicle &amp; Visit", "Concern &amp; Conditions", "Safety &amp; Authorization", "Triage &amp; Assignment", "Review &amp; Create"]) expect(html).toContain(step);
    expect(html).toContain("Scan VIN");
    expect(html).toContain("Add Vehicle");
    expect(html).toContain("Primary Concern / Issue to Diagnose");
    expect(html).toContain("Diagnostic Report — Problem &amp; Concern Summary");
    expect(html).toContain("Current diagnostic assessment");
    expect(html).toContain("Open Complete Diagnostic Report");
    expect(html).toContain("Customer concern in their own words");
    expect(html).toContain("Staff clarification");
    expect(html).toContain("Add Evidence");
    expect(html).toContain("Service Visit Context");
    expect(html).toContain("Intake Readiness");
    expect(html).toContain("Enterprise safeguards");
    expect(html).toContain("Save Draft");
    expect(html).toContain("Continue to Concern &amp; Conditions");
    expect(html).not.toContain("Repair Workbench");
  });
});
