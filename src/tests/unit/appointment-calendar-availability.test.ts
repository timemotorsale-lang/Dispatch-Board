import { describe, expect, it } from "vitest";
import { visibleAppointmentOverlaps } from "@/lib/appointment-calendar-availability";

const booking = { id: "existing", bookingStatus: "SCHEDULED", startsAt: "2026-11-09T15:00:00Z", endsAt: "2026-11-09T16:00:00Z" };

describe("visible appointment overlaps", () => {
  it("compares dates, not only times of day, and allows back-to-back appointments", () => {
    expect(visibleAppointmentOverlaps([booking], "2026-11-09T15:30:00Z", "2026-11-09T16:30:00Z")).toBe(true);
    expect(visibleAppointmentOverlaps([booking], "2026-11-10T15:30:00Z", "2026-11-10T16:30:00Z")).toBe(false);
    expect(visibleAppointmentOverlaps([booking], "2026-11-09T16:00:00Z", "2026-11-09T17:00:00Z")).toBe(false);
  });
  it("ignores the appointment being edited and appointments that do not block availability", () => {
    expect(visibleAppointmentOverlaps([booking], booking.startsAt, booking.endsAt, booking.id)).toBe(false);
    for (const bookingStatus of ["DRAFT", "CANCELLED", "COMPLETED"]) {
      expect(visibleAppointmentOverlaps([{ ...booking, bookingStatus }], booking.startsAt, booking.endsAt)).toBe(false);
    }
  });
  it("detects an appointment spanning midnight when it is present in the schedule", () => {
    const overnight = { ...booking, startsAt: "2026-11-09T23:30:00-06:00", endsAt: "2026-11-10T00:30:00-06:00" };
    expect(visibleAppointmentOverlaps([overnight], "2026-11-10T00:00:00-06:00", "2026-11-10T01:00:00-06:00")).toBe(true);
  });
});
