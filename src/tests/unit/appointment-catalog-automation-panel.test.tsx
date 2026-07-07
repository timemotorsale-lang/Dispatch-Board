import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentCatalogAutomationPanel } from "@/features/settings/appointment-catalog-automation-panel";
import { getAppointmentCatalogAutomationAdminForManager } from "@/server/services/appointment-catalog-automation-admin";
import type { AppointmentCatalogUsageMetrics } from "@/server/services/appointment-catalog-automation-admin";
import { createMemoryAppointmentCatalogRepository } from "@/tests/support/appointment-catalog-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function usageMetrics(): AppointmentCatalogUsageMetrics {
  return {
    appointmentTotalCount: 14,
    activeAppointmentTotalCount: 4,
    completedAppointmentTotalCount: 9,
    purposeUsage: {
      "APT-TEST-DRIVE": {
        appointmentCount: 6,
        activeAppointmentCount: 2,
        completedAppointmentCount: 4,
        lastAppointmentAt: "2026-07-06T18:00:00.000Z"
      }
    },
    outcomeUsage: {
      "TEST_DRIVE_COMPLETED_FOLLOW_UP_REQUIRED": {
        appointmentCount: 5,
        activeAppointmentCount: 2,
        completedAppointmentCount: 3,
        lastUsedAt: "2026-07-06T18:00:00.000Z"
      }
    },
    followUpDispositionUsage: {},
    reasonUsage: {}
  };
}

describe("appointment catalog automation panel", () => {
  it("renders purpose catalog, approval governance, usage guidance, and rule hooks", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository({
      usageMetrics: usageMetrics()
    });
    const catalog = await getAppointmentCatalogAutomationAdminForManager(manager, repository);

    const markup = renderToStaticMarkup(
      <AppointmentCatalogAutomationPanel initialCatalog={catalog} />
    );

    expect(markup).toContain("Approved appointment purposes");
    expect(markup).toContain("Approval");
    expect(markup).toContain("Review action");
    expect(markup).toContain("Reference count");
    expect(markup).toContain("Delete risk");
    expect(markup).toContain("Live appointment usage");
    expect(markup).toContain("Highest-risk code");
    expect(markup).toContain("Appointment usage");
    expect(markup).toContain("Versioned editor");
    expect(markup).toContain("Purpose lifecycle");
    expect(markup).toContain("Structured code editors");
    expect(markup).toContain("Deprecate code");
    expect(markup).toContain("Reactivate code");
    expect(markup).toContain("Outcome, follow-up, and reason catalogs");
    expect(markup).toContain("Automation simulation");
    expect(markup).toContain("Enabled rule hooks");
    expect(markup).toContain("Test Drive");
    expect(markup).toContain("Any Task Requires Meeting");
  });
});
