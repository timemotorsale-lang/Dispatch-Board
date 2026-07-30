import { describe, expect, it } from "vitest";

import {
  mapSalesAppointment,
  salesAppointmentIntegration,
  salesAppointmentMappingPreservesSourceOwnership
} from "@/features/sales/sales-console-m51-appointment-calendar-integration";

describe("Sales Console M51 appointment calendar integration", () => {
  it("maps appointment source records into sales appointment context", () => {
    const appointment = mapSalesAppointment(
      {
        appointmentId: "APT-1",
        customerId: "CUST-1",
        customerName: "John Smith",
        scheduledStart: "2026-07-30T15:00:00.000Z",
        confirmationStatus: "confirmed",
        arrivalState: "not-arrived",
        sourceRoute: "/appointments/APT-1",
        opportunityId: "REV-1001",
        revenueLane: "Inventory Cash Sale",
        updatedAt: "2026-07-30T14:30:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(appointment.label).toBe("John Smith appointment");
    expect(appointment.opportunityContext).toBe("Inventory Cash Sale · REV-1001");
    expect(appointment.customerLink).toBe("/customers/customer-360?customerId=CUST-1&returnTo=%2Fsales");
    expect(appointment.sourceLink).toBe("/appointments/APT-1?returnTo=%2Fsales");
    expect(appointment.freshness).toBe("current");
    expect(appointment.readinessScore).toBeGreaterThan(80);
    expect(appointment.showNoShowRisk).toBe("low");
    expect(appointment.preparationChecklist).toContain("review Inventory Cash Sale lane");
  });

  it("keeps scheduling writes governed by the appointment source system", () => {
    const appointment = mapSalesAppointment(
      {
        appointmentId: "APT-2",
        customerId: "CUST-2",
        customerName: "Maria Garcia",
        scheduledStart: "2026-07-30T15:00:00.000Z",
        confirmationStatus: "needs-confirmation",
        arrivalState: "not-arrived",
        sourceRoute: "/appointments/APT-2",
        updatedAt: "2026-07-30T08:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(salesAppointmentMappingPreservesSourceOwnership(appointment)).toBe(true);
    expect(salesAppointmentIntegration.governedWrites).toContain("reschedule appointment");
  });

  it("flags no-show and unconfirmed appointments for execution recovery", () => {
    const appointment = mapSalesAppointment(
      {
        appointmentId: "APT-3",
        customerId: "CUST-3",
        customerName: "Maya Patel",
        scheduledStart: "2026-07-30T12:00:00.000Z",
        confirmationStatus: "needs-confirmation",
        arrivalState: "no-show",
        sourceRoute: "/appointments/APT-3",
        updatedAt: "2026-07-30T11:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(appointment.showNoShowRisk).toBe("high");
    expect(appointment.followUpTrigger).toContain("no-show recovery");
    expect(appointment.appointmentTaskCorrelation).toContain("needs");
    expect(appointment.schedulingWriteEnabled).toBe(false);
  });
});
