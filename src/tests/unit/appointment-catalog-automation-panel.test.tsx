import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentCatalogAutomationPanel } from "@/features/settings/appointment-catalog-automation-panel";
import { getAppointmentCatalogAutomationAdminForManager } from "@/server/services/appointment-catalog-automation-admin";
import { createMemoryAppointmentCatalogRepository } from "@/tests/support/appointment-catalog-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment catalog automation panel", () => {
  it("renders purpose catalog, approval governance, usage guidance, and rule hooks", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();
    const catalog = await getAppointmentCatalogAutomationAdminForManager(manager, repository);

    const markup = renderToStaticMarkup(
      <AppointmentCatalogAutomationPanel initialCatalog={catalog} />
    );

    expect(markup).toContain("Approved appointment purposes");
    expect(markup).toContain("Approval");
    expect(markup).toContain("Review action");
    expect(markup).toContain("Reference count");
    expect(markup).toContain("Delete risk");
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
