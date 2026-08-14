import { describe, expect, it } from "vitest";

import {
  normalizeUnifiedCrmOpportunityAppointmentReference,
  normalizeUnifiedCrmOpportunityDispatchReference,
  normalizeUnifiedCrmOpportunityTaskReference
} from "@/server/validation/unified-crm-opportunity-link";

describe("Unified CRM opportunity link validation", () => {
  it("normalizes safe task, appointment, and dispatch target references", () => {
    expect(normalizeUnifiedCrmOpportunityTaskReference({
      domain: "TASKS",
      href: "/tasks/task-1",
      taskId: "task-1",
      taskNumber: "TASK-1001"
    })).toEqual({
      domain: "TASKS",
      href: "/tasks/task-1",
      taskId: "task-1",
      taskNumber: "TASK-1001"
    });

    expect(normalizeUnifiedCrmOpportunityAppointmentReference({
      appointmentId: "appt-1",
      appointmentNumber: "APT-1001",
      domain: "APPOINTMENTS",
      href: "/appointments?view=board&appointment=APT-1001",
      organizationId: "org-a",
      version: 2
    })).toEqual({
      appointmentId: "appt-1",
      appointmentNumber: "APT-1001",
      domain: "APPOINTMENTS",
      href: "/appointments?view=board&appointment=APT-1001",
      organizationId: "org-a",
      version: 2
    });

    expect(normalizeUnifiedCrmOpportunityDispatchReference({
      domain: "DISPATCH",
      href: "/vehicles/repair-workbench?repairOrderId=ro-1",
      repairJobId: null,
      repairJobNumber: null,
      repairOrderId: "ro-1",
      repairOrderNumber: "RO-1001",
      organizationId: "org-a",
      version: 3
    })).toEqual({
      domain: "DISPATCH",
      href: "/vehicles/repair-workbench?repairOrderId=ro-1",
      repairJobId: null,
      repairJobNumber: null,
      repairOrderId: "ro-1",
      repairOrderNumber: "RO-1001",
      organizationId: "org-a",
      version: 3
    });
  });

  it("rejects external or non-owning-domain hrefs", () => {
    expect(() => normalizeUnifiedCrmOpportunityTaskReference({
      domain: "TASKS",
      href: "https://evil.example/tasks/1",
      taskId: "task-1"
    })).toThrow("Href is invalid.");
    expect(() => normalizeUnifiedCrmOpportunityAppointmentReference({
      appointmentId: "appt-1",
      appointmentNumber: "APT-1001",
      domain: "APPOINTMENTS",
      href: "/tasks/task-1",
      organizationId: "org-a",
      version: 2
    })).toThrow("Href is invalid.");
    expect(() => normalizeUnifiedCrmOpportunityDispatchReference({
      domain: "DISPATCH",
      href: "/appointments",
      repairOrderId: "ro-1",
      repairOrderNumber: "RO-1001",
      organizationId: "org-a",
      version: 3
    })).toThrow("Href is invalid.");
  });
});
