import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentAutomationOperationsConsolePanel } from "@/features/settings/appointment-automation-operations-console-panel";
import { getAppointmentAutomationOperationsConsoleForManager } from "@/server/services/appointment-automation-operations-console";
import { createMemoryAppointmentAutomationOperationsRepository } from "@/tests/support/appointment-automation-console-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment automation operations console panel", () => {
  it("renders rule lifecycle, failure queue, and audit sections", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();
    const consoleModel = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    const markup = renderToStaticMarkup(
      <AppointmentAutomationOperationsConsolePanel initialConsole={consoleModel} />
    );

    expect(markup).toContain("Rule lifecycle control");
    expect(markup).toContain("Catalog governance");
    expect(markup).toContain("Activation readiness");
    expect(markup).toContain("Simulation evidence");
    expect(markup).toContain("Failure queue");
    expect(markup).toContain("Runtime execution activity");
    expect(markup).toContain("Recent automation events");
    expect(markup).toContain("Catalog candidate");
    expect(markup).toContain("Any Task Requires Meeting");
  });
});
