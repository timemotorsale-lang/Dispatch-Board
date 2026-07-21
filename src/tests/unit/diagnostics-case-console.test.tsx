import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { DiagnosticCaseWorkspace } from "@/features/diagnostics/diagnostic-case-workspace";
import { DiagnosticsCommandCenter } from "@/features/diagnostics/diagnostics-command-center";
import type { DiagnosticCaseWorkspaceModel, DiagnosticsCommandCenterModel } from "@/server/diagnostics/service";

const diagnosticCase = {
  id: "dgc_case_1", version: 2, status: "TRIAGE", resumeStatus: null, stage: "CONCERN", riskTier: "R3", concernKey: "PRIMARY",
  concern: "Intermittent no-start after hot soak", concernSource: "REPAIR_ORDER_CONCERN", operatingConditions: {}, concernVersion: 1,
  assignedUser: { id: "tech-1", name: "Walter Mechanic" }, createdByUser: { id: "manager-1", name: "Manager" },
  location: { id: "loc-1", code: "MAIN", name: "Main Shop" }, repairOrder: { id: "ro-1", repairOrderNumber: "RO-1042" },
  vehicle: { id: "vehicle-1", vehicleNumber: "V-10", vin: "VIN10", year: 2020, make: "Ford", model: "F-150", label: "2020 Ford F-150" },
  openedAt: "2026-07-20T12:00:00.000Z", updatedAt: "2026-07-20T13:00:00.000Z", closedAt: null, ageHours: 2,
  nextAction: "Continue the current diagnostic stage", blocker: null, confidence: "NOT_ASSESSED",
  timeline: [{ id: "event-1", version: 2, eventType: "STATUS_CHANGED", fromStatus: "DRAFT", toStatus: "TRIAGE", reasonCode: "CASE_TRIAGE_STARTED", reason: "Technician began safety and operability triage.", actorUserId: "tech-1", occurredAt: "2026-07-20T13:00:00.000Z" }]
};

describe("diagnostics case console", () => {
  it("renders the permission-filtered command queue with operational signals", () => {
    const model = { state: "COMPLETE", freshness: "CURRENT", restricted: false, generatedAt: "2026-07-20T14:00:00.000Z", viewer: { id: "tech-1", name: "Walter Mechanic" }, rollout: { executable: false, reason: "DIAGNOSTICS_MASTER_OFF" }, summary: { mine: 1, waiting: 0, escalated: 0, unassigned: 0 }, items: [diagnosticCase] } as unknown as DiagnosticsCommandCenterModel;
    const html = renderToStaticMarkup(<DiagnosticsCommandCenter model={model} />);
    expect(html).toContain("Diagnostics Command Center");
    expect(html).toContain("Intermittent no-start after hot soak");
    expect(html).toContain("2020 Ford F-150");
    expect(html).toContain("Read-only foundation");
    expect(html).toContain("Confidence Not assessed");
  });

  it("renders the five-stage technician workspace without inventing evidence", () => {
    const model = { state: "COMPLETE", generatedAt: "2026-07-20T14:00:00.000Z", viewer: { id: "tech-1", name: "Walter Mechanic" }, rollout: { executable: true, reason: "GENERAL" }, permissions: { canAssign: false, canTransition: true }, assignableUsers: [], diagnosticCase } as unknown as DiagnosticCaseWorkspaceModel;
    const html = renderToStaticMarkup(<DiagnosticCaseWorkspace model={model} />);
    for (const stage of ["Concern", "Evidence", "Test", "Cause", "Verify"]) expect(html).toContain(stage);
    expect(html).toContain("No observations, measurements, or attachments are available yet.");
    expect(html).toContain("No candidate causes have been proposed.");
    expect(html).not.toMatch(/\b\d{1,3}%\b/);
  });
});
