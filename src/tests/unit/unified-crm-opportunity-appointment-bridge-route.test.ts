import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUnifiedCrmOpportunityAppointmentBridge: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-appointment-bridge-service", () => ({
  createUnifiedCrmOpportunityAppointmentBridge: mocks.createUnifiedCrmOpportunityAppointmentBridge
}));

import { POST } from "@/app/api/crm/v1/opportunities/[opportunityId]/appointments/route";

describe("Unified CRM opportunity appointment bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new governed appointment bridge and 200 for duplicate replay", async () => {
    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockResolvedValueOnce({
      appointment: {
        appointmentNumber: "APT-1001",
        href: "/appointments?appointment=APT-1001",
        id: "appointment-1",
        version: 1
      },
      contractVersion: "ucrm.opportunity-appointment-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456"
    });
    const created = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Appointment" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(created.status).toBe(201);

    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockResolvedValueOnce({
      appointment: {
        appointmentNumber: "APT-1001",
        href: "/appointments?appointment=APT-1001",
        id: "appointment-1",
        version: 1
      },
      contractVersion: "ucrm.opportunity-appointment-bridge/v1",
      duplicate: true,
      opportunityId: "opp_123456"
    });
    const duplicate = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Appointment" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(duplicate.status).toBe(200);
  });

  it("maps validation, stale version, subject hiding, and unavailable failures safely", async () => {
    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockRejectedValueOnce(
      Object.assign(new Error("Appointment start and end must be provided together."), { code: "INVALID_APPOINTMENT_BRIDGE_COMMAND" })
    );
    const invalid = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(invalid.status).toBe(400);

    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockRejectedValueOnce(
      Object.assign(new Error("Opportunity changed before the appointment could be linked."), { code: "OPPORTUNITY_VERSION_CONFLICT" })
    );
    const stale = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(stale.status).toBe(409);

    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockRejectedValueOnce(
      Object.assign(new Error("Opportunity is not available."), { code: "OPPORTUNITY_NOT_AVAILABLE" })
    );
    const hidden = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(hidden.status).toBe(404);

    mocks.createUnifiedCrmOpportunityAppointmentBridge.mockRejectedValueOnce(
      new Error("private appointment source detail")
    );
    const fallback = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    const payload = await fallback.json();
    expect(fallback.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("private appointment source detail");
    expect(payload).toMatchObject({ error: "CRM opportunity appointment bridge could not be completed safely." });
  });
});
