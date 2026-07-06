import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_EVENT_ACTOR_TYPES,
  APPOINTMENT_HISTORY_EVENT_TYPES
} from "@/server/appointments/appointment-domain";
import {
  normalizeAppointmentHistoryEvent,
  type AppointmentHistoryEventInput
} from "@/server/validation/appointment-history-events";

const baseEvent: AppointmentHistoryEventInput = {
  appointmentId: "appointment-1",
  actorType: "HUMAN",
  actorUserId: "user-manager",
  eventType: "CREATED",
  message: "Appointment created.",
  correlationId: "corr-appointment-1",
  metadata: {
    source: "manual"
  }
};

describe("appointment history event foundation", () => {
  it("keeps actor and event catalogs explicit", () => {
    expect(APPOINTMENT_EVENT_ACTOR_TYPES).toEqual(["HUMAN", "SYSTEM", "AUTOMATION", "IMPORT"]);
    expect(APPOINTMENT_HISTORY_EVENT_TYPES).toEqual([
      "CREATED",
      "DRAFT_UPDATED",
      "APPROVED",
      "SCHEDULED",
      "RESCHEDULED",
      "CANCELLED",
      "CONFIRMED",
      "DECLINED",
      "CHECKED_IN",
      "NO_SHOW_RECORDED",
      "STARTED",
      "WAITING",
      "FINISHED",
      "COMPLETED",
      "OUTCOME_RECORDED",
      "OWNER_CHANGED",
      "FIELD_UPDATED",
      "WARNING_OVERRIDDEN",
      "CONFLICT_DETECTED",
      "TASK_LINKED",
      "TASK_UNLINKED",
      "AUTOMATION_EVALUATED",
      "AUTOMATION_FAILED",
      "NOTIFICATION_QUEUED",
      "BULK_ACTION_PREVIEWED",
      "BULK_ACTION_APPLIED",
      "NOTE_ADDED"
    ]);
  });

  it("normalizes a human event with appointment scope and correlation", () => {
    expect(normalizeAppointmentHistoryEvent(baseEvent)).toMatchObject({
      appointmentId: "appointment-1",
      actorType: "HUMAN",
      actorUserId: "user-manager",
      eventType: "CREATED",
      message: "Appointment created.",
      correlationId: "corr-appointment-1",
      metadata: {
        source: "manual"
      }
    });
  });

  it("requires human actors and all events to carry correlation", () => {
    expect(() =>
      normalizeAppointmentHistoryEvent({ ...baseEvent, actorUserId: null })
    ).toThrow(/actor user/);

    expect(() =>
      normalizeAppointmentHistoryEvent({ ...baseEvent, correlationId: " " })
    ).toThrow(/correlation/);
  });

  it("requires reasons for exceptional or privileged events", () => {
    expect(() =>
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        eventType: "CANCELLED"
      })
    ).toThrow(/reason code/);

    expect(() =>
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        eventType: "WARNING_OVERRIDDEN",
        reasonCode: "manager_override",
        priorValue: { warning: "Owner overlap" },
        newValue: { warning: "Manager accepted" }
      })
    ).toThrow(/reason notes/);
  });

  it("requires prior and new values for state-changing history events", () => {
    expect(() =>
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        eventType: "RESCHEDULED",
        reasonCode: "CUSTOMER_REQUEST",
        reasonNotes: "Customer asked for a later slot."
      })
    ).toThrow(/prior and new values/);

    expect(
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        eventType: "OWNER_CHANGED",
        priorValue: { ownerUserId: "old-owner" },
        newValue: { ownerUserId: "new-owner" }
      })
    ).toMatchObject({
      eventType: "OWNER_CHANGED",
      priorValue: { ownerUserId: "old-owner" },
      newValue: { ownerUserId: "new-owner" }
    });
  });

  it("requires automation identity and notification intent where applicable", () => {
    expect(() =>
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        actorType: "AUTOMATION",
        actorUserId: null,
        eventType: "AUTOMATION_EVALUATED"
      })
    ).toThrow(/rule code and version/);

    expect(
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        actorType: "AUTOMATION",
        actorUserId: null,
        eventType: "AUTOMATION_EVALUATED",
        automationRuleCode: "task_requires_meeting",
        automationRuleVersion: 2
      })
    ).toMatchObject({
      actorType: "AUTOMATION",
      automationRuleCode: "TASK_REQUIRES_MEETING",
      automationRuleVersion: 2
    });

    expect(() =>
      normalizeAppointmentHistoryEvent({
        ...baseEvent,
        actorType: "SYSTEM",
        actorUserId: null,
        eventType: "NOTIFICATION_QUEUED"
      })
    ).toThrow(/notification intent/);
  });
});
