import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VehicleOperationsFoundationPanel } from "@/features/settings/vehicle-operations-foundation-panel";

describe("vehicle operations rollout settings", () => {
  it("shows the persisted rollout target alongside the active Diagnostics mode", () => {
    const html = renderToStaticMarkup(<VehicleOperationsFoundationPanel initialModel={{
      evaluatedAt: "2026-07-22T12:00:00.000Z",
      state: "HEALTHY",
      health: { commands24h: 0, failedCommands24h: 0, pendingOutbox: 0, deadLetters: 0, oldestPendingAt: null, oldestPendingAgeSeconds: 0, projectionFailures: 0, maxProjectionLagSeconds: 0 },
      flags: [{ id: "diag-flag-cases", organizationId: "org-time-motor-sales", locationId: null, code: "DIAGNOSTIC_CASES", mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [], targetAt: "2026-07-22T12:00:00.000Z", version: 2, updatedAt: "2026-07-22T12:00:00.000Z" }],
    }} />);

    expect(html).toContain("DIAGNOSTIC_CASES");
    expect(html).toContain("GENERAL");
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-07-22"');
    expect(html).toContain("Save target");
  });
});
