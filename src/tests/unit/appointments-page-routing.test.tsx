import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AppointmentsPage from "@/app/(app)/appointments/page";
import type { AuthenticatedUser } from "@/server/auth/store";

const coordinator: AuthenticatedUser = {
  id: "ancilla",
  name: "Ancilla Ops",
  email: "avery.ops@local.test",
  isActive: true,
  roles: ["Operations Coordinator", "Office Manager", "Marketing/Advertisement Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => coordinator)
}));

vi.mock("@/server/services/appointment-admin-settings", () => ({
  getAppointmentBoardSettings: vi.fn(async () => null)
}));

vi.mock("@/server/advisor-workspace/service", () => ({
  getServiceAdvisorWorkspace: vi.fn(async () => ({
    advisor: { id: "ancilla", name: "Ancilla Ops" },
    appointments: [],
    counts: { activeRepairOrders: 0, handoffs: 0, todaysArrivals: 0, waitingCheckIn: 0 },
    actionQueue: [],
    repairOrders: []
  }))
}));

vi.mock("@/features/advisor/service-advisor-home", () => ({
  ServiceAdvisorHome: () => <section data-testid="advisor-home">Service Advisor Home</section>
}));

vi.mock("@/features/appointments/appointment-board-loader", () => ({
  AppointmentBoardLoader: () => <section data-testid="appointment-board">Appointment Board</section>
}));

describe("appointments page routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the service advisor workspace for operations coordinator advisor mode", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ workspace: "advisor" })
    }));

    expect(html).toContain("Service Advisor Home");
    expect(html).not.toContain("Appointment Board");
  });

  it("opens the appointment board for operations coordinator board mode", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ view: "board" })
    }));

    expect(html).toContain("Appointment Board");
    expect(html).not.toContain("Service Advisor Home");
  });
});
