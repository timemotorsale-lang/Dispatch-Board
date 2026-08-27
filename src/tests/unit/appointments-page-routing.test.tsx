import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AppointmentsPage from "@/app/(app)/appointments/page";
import type { AuthenticatedUser } from "@/server/auth/store";

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${href};307;` });
  })
}));

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

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) }))
}));

vi.mock("next/navigation", () => ({
  redirect: navigation.redirect
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

vi.mock("@/features/appointments/appointment-console-refinement", () => ({
  AppointmentConsoleNewAppointment: () => <section data-testid="new-appointment">New Appointment Calendar</section>,
  AppointmentConsoleTodayFlow: () => <section data-testid="appointment-console">Appointment Console Today Flow</section>
}));

describe("appointments page routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the service advisor workspace for operations coordinator advisor launch", async () => {
    await expect(AppointmentsPage({
      searchParams: Promise.resolve({ launch: "advisor" })
    })).rejects.toThrow("NEXT_REDIRECT");

    expect(navigation.redirect).toHaveBeenCalledWith("/vehicles/advisor?launch=advisor");
  });

  it("opens the appointment board for operations coordinator board mode", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ view: "board" })
    }));

    expect(html).toContain("Appointment Board");
    expect(html).not.toContain("Service Advisor Home");
  });

  it("opens the appointment console landing for operations coordinator default appointment route", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({})
    }));

    expect(html).toContain("Appointment Console Today Flow");
    expect(html).not.toContain("Appointment Board");
  });

  it("opens the calendar-first new appointment workspace from the appointment console action", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ action: "new" })
    }));

    expect(html).toContain("New Appointment Calendar");
    expect(html).not.toContain("Appointment Board");
  });
});
