import { describe, expect, it } from "vitest";

import { APPOINTMENT_TASK_LINK_TYPES } from "@/server/appointments/appointment-domain";
import {
  normalizeAppointmentTaskLink,
  type AppointmentTaskLinkInput
} from "@/server/validation/appointment-task-links";

const baseLink: AppointmentTaskLinkInput = {
  appointmentId: "appointment-1",
  taskId: "task-1",
  linkType: "PREPARATION",
  linkCode: "prep_vehicle_ready",
  title: "Vehicle readiness",
  explanation: "Confirm the vehicle is ready before the customer arrives.",
  isRequired: true,
  blocksAppointment: true,
  blocksTask: false,
  createdByUserId: "user-manager"
};

describe("appointment task link foundation", () => {
  it("keeps the approved link types explicit", () => {
    expect(APPOINTMENT_TASK_LINK_TYPES).toEqual([
      "SOURCE",
      "PREPARATION",
      "DEPENDENCY",
      "DURING_APPOINTMENT",
      "APPROVAL",
      "FOLLOW_UP",
      "OUTCOME",
      "REFERENCE"
    ]);
  });

  it("normalizes a required preparation link without changing either lifecycle", () => {
    expect(normalizeAppointmentTaskLink(baseLink)).toMatchObject({
      appointmentId: "appointment-1",
      taskId: "task-1",
      linkType: "PREPARATION",
      linkCode: "PREP_VEHICLE_READY",
      title: "Vehicle readiness",
      isRequired: true,
      blocksAppointment: true,
      blocksTask: false,
      createdByUserId: "user-manager"
    });
  });

  it("requires automated links to carry both rule code and template version", () => {
    expect(() =>
      normalizeAppointmentTaskLink({
        ...baseLink,
        automationRuleCode: "TEST_DRIVE_AUTOMATION"
      })
    ).toThrow(/template version/);

    expect(() =>
      normalizeAppointmentTaskLink({
        ...baseLink,
        templateVersion: 2
      })
    ).toThrow(/automation rule code/);

    expect(
      normalizeAppointmentTaskLink({
        ...baseLink,
        automationRuleCode: "test_drive_automation",
        templateVersion: 2
      })
    ).toMatchObject({
      automationRuleCode: "TEST_DRIVE_AUTOMATION",
      templateVersion: 2
    });
  });

  it("rejects invalid link types, codes, and stale-looking template versions", () => {
    expect(() =>
      normalizeAppointmentTaskLink({ ...baseLink, linkType: "BLOCKER" })
    ).toThrow(/link type/);

    expect(() =>
      normalizeAppointmentTaskLink({ ...baseLink, linkCode: "bad code" })
    ).toThrow(/single underscores/);

    expect(() =>
      normalizeAppointmentTaskLink({
        ...baseLink,
        automationRuleCode: "RULE_ONE",
        templateVersion: 0
      })
    ).toThrow(/positive integer/);
  });

  it("keeps reference and source links from silently blocking work", () => {
    expect(() =>
      normalizeAppointmentTaskLink({
        ...baseLink,
        linkType: "REFERENCE",
        blocksAppointment: true
      })
    ).toThrow(/Reference appointment task links cannot block/);

    expect(() =>
      normalizeAppointmentTaskLink({
        ...baseLink,
        linkType: "SOURCE",
        blocksTask: true
      })
    ).toThrow(/source appointment link cannot block/);
  });
});
