import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TechnicianShiftControl } from "@/features/technician/technician-shift-control";
import type { TimeAttendanceCaptureState } from "@/server/time-attendance/capture-state";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

function state(overrides: Partial<TimeAttendanceCaptureState> = {}): TimeAttendanceCaptureState {
  return {
    allowedActions: ["CLOCK_IN"],
    expectedVersion: 0,
    locationId: "location-1",
    nextPrimaryAction: "CLOCK_IN",
    session: null,
    staffUserId: "tech-1",
    state: "NONE",
    statusLabel: "Ready to clock in",
    timezone: "America/Chicago",
    ...overrides
  };
}

describe("TechnicianShiftControl", () => {
  it("gates off-clock technicians before My Work", () => {
    const markup = renderToStaticMarkup(
      <TechnicianShiftControl hasRunningRepair={false} initialState={state()} />
    );

    expect(markup).toContain("Start your shift");
    expect(markup).toContain("Clock In &amp; Open My Work");
    expect(markup).toContain("Shift time is separate from repair labor");
  });

  it("blocks clock out while repair labor is running", () => {
    const markup = renderToStaticMarkup(
      <TechnicianShiftControl
        hasRunningRepair
        initialState={state({
          allowedActions: ["START_MEAL", "CLOCK_OUT"],
          expectedVersion: 2,
          nextPrimaryAction: "START_MEAL",
          session: {
            id: "session-1",
            openedAt: "2026-07-25T13:00:00.000Z",
            state: "OPEN",
            version: 2
          },
          state: "OPEN",
          statusLabel: "Clocked in"
        })}
      />
    );

    expect(markup).toContain("Clocked in");
    expect(markup).toContain("Pause or finish the active repair labor clock");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>.*Clock Out/s);
  });

  it("preserves work when attendance capture is unavailable", () => {
    const markup = renderToStaticMarkup(
      <TechnicianShiftControl
        hasRunningRepair={false}
        initialState={state({ unavailableReason: "table unavailable" })}
      />
    );

    expect(markup).toContain("Shift clock is temporarily unavailable");
    expect(markup).toContain("My Work remains available");
  });
});
