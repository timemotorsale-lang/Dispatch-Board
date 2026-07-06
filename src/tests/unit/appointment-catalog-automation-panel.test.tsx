import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentCatalogAutomationPanel } from "@/features/settings/appointment-catalog-automation-panel";
import { getAppointmentCatalogAutomationAdminForManager } from "@/server/services/appointment-catalog-automation-admin";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment catalog automation panel", () => {
  it("renders purpose catalog, automation simulation, and rule hooks", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const catalog = await getAppointmentCatalogAutomationAdminForManager(manager);

    const markup = renderToStaticMarkup(
      <AppointmentCatalogAutomationPanel initialCatalog={catalog} />
    );

    expect(markup).toContain("Approved appointment purposes");
    expect(markup).toContain("Automation simulation");
    expect(markup).toContain("Enabled rule hooks");
    expect(markup).toContain("Test Drive");
    expect(markup).toContain("Any Task Requires Meeting");
  });
});
