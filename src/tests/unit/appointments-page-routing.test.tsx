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

vi.mock("@/server/services/task-read", () => ({
  getTaskReadModelById: vi.fn(async () => ({
    id: "task-1", title: "Follow up", description: "Discuss next visit",
    customerReference: "Customer 123", vehicleReference: "Vehicle 456",
  }))
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
  AppointmentConsoleNewAppointment: ({ initialFullCalendar, initialContext }: { initialFullCalendar?: boolean; initialContext?: unknown }) => (
    <section data-testid="new-appointment" data-context={JSON.stringify(initialContext)}>{initialFullCalendar ? "Full Calendar" : "New Appointment Calendar"}</section>
  ),
  AppointmentConsoleTodayFlow: () => <section data-testid="appointment-console">Appointment Console Today Flow</section>
}));

describe("appointments page routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the full calendar directly without taking the advisor shortcut", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ view: "calendar", launch: "advisor" })
    }));

    expect(html).toContain("Full Calendar");
    expect(navigation.redirect).not.toHaveBeenCalled();
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

    expect(html).toContain("Full Calendar");
    expect(html).not.toContain("Appointment Board");
  });

  it("opens the full calendar from a task link and keeps its scheduling context", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ sourceTask: "task-1", returnTo: "/manager-workspace?mode=coo", localDate: "2026-11-17", startTime: "09:30" })
    }));
    for (const value of ["Full Calendar", "task-1", "Discuss next visit", "Customer 123", "Vehicle 456", "/manager-workspace?mode=coo", "2026-11-17", "09:30"]) {
      expect(html).toContain(value);
    }
  });

  it("keeps explicit board links with task context on the board", async () => {
    const html = renderToStaticMarkup(await AppointmentsPage({
      searchParams: Promise.resolve({ view: "board", sourceTask: "task-1" })
    }));
    expect(html).toContain("Appointment Board");
  });
});
