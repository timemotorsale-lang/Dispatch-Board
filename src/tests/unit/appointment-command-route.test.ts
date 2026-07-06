import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  submitAndExecuteAppointmentCommand: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-command-execution-service", () => ({
  submitAndExecuteAppointmentCommand: mocks.submitAndExecuteAppointmentCommand
}));

import { POST } from "@/app/api/appointments/commands/route";

const managerUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

describe("appointment command route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("accepts a command into the appointment command boundary", async () => {
    mocks.submitAndExecuteAppointmentCommand.mockResolvedValue({
      accepted: true,
      duplicate: false,
      conflict: null,
      execution: null,
      command: {
        id: "cmd-1",
        commandType: "RESCHEDULE",
        status: "PENDING"
      }
    });

    const payload = {
      commandType: "RESCHEDULE",
      appointmentId: "appointment-1",
      expectedAppointmentVersion: 3,
      idempotencyKey: "reschedule-api-1"
    };
    const response = await POST(
      new Request("http://localhost/api/appointments/commands", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      accepted: true,
      duplicate: false,
      conflict: null,
      execution: null,
      command: {
        id: "cmd-1",
        commandType: "RESCHEDULE",
        status: "PENDING"
      }
    });
    expect(mocks.submitAndExecuteAppointmentCommand).toHaveBeenCalledWith(managerUser, payload);
  });

  it("returns duplicate idempotency requests as safe 200 responses", async () => {
    mocks.submitAndExecuteAppointmentCommand.mockResolvedValue({
      accepted: true,
      duplicate: true,
      conflict: null,
      execution: null,
      command: {
        id: "cmd-existing",
        commandType: "RESCHEDULE",
        status: "PENDING"
      }
    });

    const response = await POST(
      new Request("http://localhost/api/appointments/commands", {
        method: "POST",
        body: JSON.stringify({
          commandType: "RESCHEDULE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "reschedule-api-duplicate"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      duplicate: true,
      command: {
        id: "cmd-existing"
      }
    });
  });

  it("returns stale-version conflicts as 409 responses", async () => {
    mocks.submitAndExecuteAppointmentCommand.mockResolvedValue({
      accepted: false,
      duplicate: false,
      execution: null,
      conflict: {
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 3
      },
      command: {
        id: "cmd-conflict",
        commandType: "RESCHEDULE",
        status: "CONFLICT"
      }
    });

    const response = await POST(
      new Request("http://localhost/api/appointments/commands", {
        method: "POST",
        body: JSON.stringify({
          commandType: "RESCHEDULE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 2,
          idempotencyKey: "reschedule-api-stale"
        })
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      accepted: false,
      conflict: {
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 3
      }
    });
  });

  it("maps authorization failures to 403", async () => {
    mocks.submitAndExecuteAppointmentCommand.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/commands", {
        method: "POST",
        body: JSON.stringify({
          commandType: "CANCEL",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "cancel-api-denied"
        })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment command is not authorized."
    });
  });

  it("maps authentication failures to 401", async () => {
    mocks.submitAndExecuteAppointmentCommand.mockRejectedValue(new Error("Authentication required."));

    const response = await POST(
      new Request("http://localhost/api/appointments/commands", {
        method: "POST",
        body: JSON.stringify({
          commandType: "CANCEL",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "cancel-api-unauthenticated"
        })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });
});
