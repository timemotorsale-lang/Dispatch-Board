import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/service-intake/customers/route";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeServiceIntakePhoneNumber } from "@/server/service-intake/customer-service";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  grants: vi.fn(),
  duplicate: vi.fn(),
  create: vi.fn(),
  contact: vi.fn(),
  audit: vi.fn(),
  note: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants })
}));
vi.mock("@/server/db/client", () => {
  const tx = {
    location: { findFirst: vi.fn().mockResolvedValue({ id: "intake-location" }) },
    customer: { findFirst: mocks.duplicate, create: mocks.create },
    customerContactPoint: { create: mocks.contact },
    customerNote: { create: mocks.note },
    enterpriseAuditEvent: { create: mocks.audit },
    $executeRaw: vi.fn()
  };
  return { prisma: { $transaction: (operation: (transaction: typeof tx) => unknown) => operation(tx) } };
});

const coordinator: AuthenticatedUser = {
  id: "intake-coordinator",
  name: "Test Coordinator",
  email: "coordinator@example.test",
  isActive: true,
  roles: ["Operations Coordinator", "Office Manager", "Marketing/Advertisement Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const customer = {
  id: "customer-intake",
  customerNumber: "CUS-TEST",
  displayName: "Test Customer",
  email: "customer@example.test",
  phoneNumber: null
};

function submitIntake() {
  return POST(new Request("http://localhost/api/service-intake/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: customer.displayName, email: customer.email, locationId: "intake-location", ownerUserId: "other-user" })
  }));
}

describe("service intake customer service", () => {
  it("saves business representatives in an internal note and excludes individual identity data", async () => {
    const response = await POST(new Request("http://localhost/api/service-intake/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerType: "Business", displayName: "Example Fleet LLC", email: "fleet@example.test", locationId: "intake-location",
        ssn: "123456789", dateOfBirth: "2000-01-01", businessIntake: { principalName: "Example Principal", ownershipPercent: "50", taxIdLast4: "4321" } })
    }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ displayName: "Example Fleet LLC", ssnLast4: null, dateOfBirth: null }) }));
    expect(mocks.note).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibility: "INTERNAL", authorUserId: coordinator.id, body: expect.stringContaining("Principal name: Example Principal") }) }));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(coordinator);
    mocks.grants.mockResolvedValue([]);
    mocks.duplicate.mockResolvedValue(null);
    mocks.create.mockResolvedValue(customer);
  });

  it("normalizes common US phone formatting to the customer database format", () => {
    expect(normalizeServiceIntakePhoneNumber("612 342 5656")).toBe("+16123425656");
    expect(normalizeServiceIntakePhoneNumber("(612) 342-5656")).toBe("+16123425656");
    expect(normalizeServiceIntakePhoneNumber("1-612-342-5656")).toBe("+16123425656");
  });

  it("rejects unusable phone numbers before they reach the database", () => {
    expect(() => normalizeServiceIntakePhoneNumber("123")).toThrow("valid mobile number");
  });

  it("assigns an owner-scoped coordinator's new customer to the authenticated creator", async () => {
    const response = await submitIntake();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ customer, duplicate: false });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ownerUserId: coordinator.id })
    }));
  });

  it.each([null, "another-owner"])("blocks inaccessible matches without disclosing or duplicating them (owner %s)", async (ownerUserId) => {
    mocks.duplicate.mockResolvedValue({ ...customer, ownerUserId });
    const response = await submitIntake();
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/Ask a manager.*No duplicate was created/);
    expect(body).not.toHaveProperty("customer");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns an existing customer when the coordinator owns it", async () => {
    mocks.duplicate.mockResolvedValue({ ...customer, ownerUserId: coordinator.id });
    const response = await submitIntake();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ customer, duplicate: true });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("preserves management access to unassigned duplicates", async () => {
    mocks.actor.mockResolvedValue({ ...coordinator, roles: ["General Manager"] });
    mocks.duplicate.mockResolvedValue({ ...customer, ownerUserId: null });
    const response = await submitIntake();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ customer, duplicate: true });
  });
});
