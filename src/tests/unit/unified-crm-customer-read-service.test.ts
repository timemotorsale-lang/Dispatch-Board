import { CustomerStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  UnifiedCrmCustomerListRecord,
  UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  getUnifiedCrmCustomerList,
  resolveUnifiedCrmCustomerReadMode
} from "@/server/services/unified-crm-customer-read-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function record(overrides: Partial<UnifiedCrmCustomerListRecord> = {}): UnifiedCrmCustomerListRecord {
  return {
    id: "customer-a",
    customerNumber: "CUS-001",
    displayName: "Maria Santos",
    phoneNumber: "+16125550000",
    email: "legacy@example.test",
    status: CustomerStatus.ACTIVE,
    ownerUserId: manager.id,
    preferredContactMethod: "PHONE",
    lastInteractionAt: new Date("2026-08-13T12:00:00.000Z"),
    nextActionAt: new Date("2026-08-15T12:00:00.000Z"),
    sourceCode: "CUSTOMERS",
    updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    ownerUser: { id: manager.id, name: manager.name },
    contactPoints: [
      {
        id: "phone-primary",
        type: "PHONE",
        value: "+16125551234",
        normalizedValue: "+16125551234",
        isPrimary: true,
        updatedAt: new Date("2026-08-14T11:00:00.000Z")
      },
      {
        id: "email-primary",
        type: "EMAIL",
        value: "maria@example.com",
        normalizedValue: "maria@example.com",
        isPrimary: true,
        updatedAt: new Date("2026-08-14T11:00:00.000Z")
      }
    ],
    ...overrides
  };
}

function repository(
  organizations: string[],
  records: UnifiedCrmCustomerListRecord[] = []
): UnifiedCrmCustomerReadRepository & { received: unknown[] } {
  const received: unknown[] = [];
  return {
    received,
    async listActiveOrganizationIds(userId, at) {
      received.push({ type: "organizations", userId, at });
      return organizations;
    },
    async listCustomers(input) {
      received.push({ type: "customers", input });
      return records;
    }
  };
}

const now = new Date("2026-08-14T13:00:00.000Z");

describe("Unified CRM canonical customer read service", () => {
  it("defaults production OFF, nonproduction REVIEW, and invalid explicit values OFF", () => {
    expect(resolveUnifiedCrmCustomerReadMode({ nodeEnv: "production" })).toBe("OFF");
    expect(resolveUnifiedCrmCustomerReadMode({ nodeEnv: "test" })).toBe("REVIEW");
    expect(resolveUnifiedCrmCustomerReadMode({ nodeEnv: "production", readMode: "REVIEW" })).toBe("REVIEW");
    expect(resolveUnifiedCrmCustomerReadMode({ nodeEnv: "test", readMode: "OFF" })).toBe("OFF");
    expect(resolveUnifiedCrmCustomerReadMode({ nodeEnv: "test", readMode: "enabled" })).toBe("OFF");
  });

  it("derives one organization and returns masked canonical contact points", async () => {
    const source = repository(["org-a"], [record()]);
    const result = await getUnifiedCrmCustomerList(manager, {}, {
      now: () => now,
      readMode: "REVIEW",
      repository: source
    });

    expect(source.received[1]).toMatchObject({
      input: { organizationId: "org-a", recordScope: { kind: "ORGANIZATION" }, status: "active" }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-list/v1",
      state: "READY",
      visibility: "organization",
      generatedAt: now.toISOString(),
      source: {
        authority: "CUSTOMERS",
        readMode: "LIVE_CANONICAL",
        observedAt: now.toISOString()
      },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        newestRecordUpdatedAt: "2026-08-14T12:00:00.000Z"
      },
      items: [{ maskedPhone: "••••1234", maskedEmail: "m•••@e•••.com" }]
    });
    expect(JSON.stringify(result)).not.toContain("+16125551234");
    expect(JSON.stringify(result)).not.toContain("maria@example.com");
    expect(JSON.stringify(result)).not.toContain("legacy@example.test");
    expect(JSON.stringify(result)).not.toContain("phone-primary");
    expect(JSON.stringify(result)).not.toContain("normalizedValue");
  });

  it("uses legacy contact fields only when canonical contact points are absent", async () => {
    const source = repository(["org-a"], [record({ contactPoints: [] })]);
    const result = await getUnifiedCrmCustomerList(manager, {}, {
      now: () => now,
      readMode: "REVIEW",
      repository: source
    });
    expect(result.items[0]).toMatchObject({ maskedPhone: "••••0000", maskedEmail: "l•••@e•••.test" });
  });

  it.each([
    [[], "ORGANIZATION_SCOPE_UNAVAILABLE"],
    [["org-a", "org-b"], "ORGANIZATION_SCOPE_AMBIGUOUS"]
  ])("fails closed for organization scope %j", async (organizations, code) => {
    await expect(getUnifiedCrmCustomerList(manager, {}, {
      readMode: "REVIEW",
      repository: repository(organizations)
    })).rejects.toMatchObject({ code });
  });

  it("does not call the repository when read mode is OFF", async () => {
    const source = repository(["org-a"], [record()]);
    await expect(getUnifiedCrmCustomerList(manager, {}, {
      readMode: "OFF",
      repository: source
    })).rejects.toMatchObject({ code: "CUSTOMER_READ_OFF" });
    expect(source.received).toEqual([]);
  });

  it("passes an owner-only record scope for Sales", async () => {
    const seller = { ...manager, id: "seller-1", roles: ["Salesperson"] };
    const source = repository(["org-a"]);
    const result = await getUnifiedCrmCustomerList(seller, { owner: "all" }, {
      readMode: "REVIEW",
      repository: source
    });
    expect(result.visibility).toBe("owned");
    expect(source.received[1]).toMatchObject({
      input: { organizationId: "org-a", recordScope: { kind: "OWNER", ownerUserId: "seller-1" } }
    });
  });

  it("reports an empty direct read as current without inventing a stale state", async () => {
    const result = await getUnifiedCrmCustomerList(manager, {}, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository(["org-a"])
    });
    expect(result).toMatchObject({
      state: "EMPTY",
      visibility: "organization",
      generatedAt: now.toISOString(),
      source: { observedAt: now.toISOString() },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        newestRecordUpdatedAt: null
      }
    });
  });

  it("keeps every seller owner filter intersected with the seller record scope", async () => {
    const seller = { ...manager, id: "seller-1", roles: ["Salesperson"] };

    for (const owner of ["all", "mine", "unassigned"] as const) {
      const source = repository(["org-a"]);
      await getUnifiedCrmCustomerList(seller, { owner }, {
        readMode: "REVIEW",
        repository: source
      });
      expect(source.received[1]).toMatchObject({
        input: {
          owner,
          organizationId: "org-a",
          recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
          viewerUserId: "seller-1"
        }
      });
    }
  });

  it("keeps the Management mine filter bound to the viewer", async () => {
    const source = repository(["org-a"]);
    await getUnifiedCrmCustomerList(manager, { owner: "mine" }, {
      readMode: "REVIEW",
      repository: source
    });
    expect(source.received[1]).toMatchObject({
      input: {
        owner: "mine",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        viewerUserId: manager.id
      }
    });
  });

  it("treats an expired-grant organization result as unavailable", async () => {
    await expect(getUnifiedCrmCustomerList(manager, {}, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository([])
    })).rejects.toMatchObject({ code: "ORGANIZATION_SCOPE_UNAVAILABLE" });
  });

  it("uses limit-plus-one pagination and emits a stable next cursor", async () => {
    const source = repository(["org-a"], [
      record({ id: "customer-b", updatedAt: new Date("2026-08-14T12:00:00.000Z") }),
      record({ id: "customer-a", updatedAt: new Date("2026-08-14T11:00:00.000Z") })
    ]);
    const result = await getUnifiedCrmCustomerList(manager, { limit: 1 }, {
      readMode: "REVIEW",
      repository: source
    });
    expect(result.items).toHaveLength(1);
    expect(result.page).toMatchObject({ limit: 1, hasMore: true });
    expect(result.page.nextCursor).toEqual(expect.any(String));
  });

  it("wraps unknown repository failures without exposing their text", async () => {
    const source = repository(["org-a"]);
    source.listCustomers = async () => { throw new Error("postgres secret connection string"); };
    await expect(getUnifiedCrmCustomerList(manager, {}, {
      readMode: "REVIEW",
      repository: source
    })).rejects.toMatchObject({
      code: "CUSTOMER_SOURCE_UNAVAILABLE",
      message: "Customer records are temporarily unavailable."
    });
  });
});
