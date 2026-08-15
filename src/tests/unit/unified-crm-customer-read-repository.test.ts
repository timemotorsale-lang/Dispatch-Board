import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";

describe("Unified CRM customer read repository", () => {
  it("keeps colliding customer identities isolated to the requested organization", async () => {
    const collisions = [
      {
        organizationId: "org-a",
        id: "org-a-customer",
        customerNumber: "CUS-COLLISION",
        displayName: "Shared Customer",
        phoneNumber: "+16125550100",
        email: "shared@example.test"
      },
      {
        organizationId: "org-b",
        id: "org-b-customer",
        customerNumber: "CUS-COLLISION",
        displayName: "Shared Customer",
        phoneNumber: "+16125550100",
        email: "shared@example.test"
      }
    ];
    const findMany = vi.fn(async ({ where }: { where: { organizationId: string } }) =>
      collisions.filter((customer) => customer.organizationId === where.organizationId)
    );
    const repository = createUnifiedCrmCustomerReadRepository({
      customer: { findMany },
      userLocationAccess: { findMany: vi.fn() }
    } as never);
    const query = {
      cursor: null,
      limit: 25,
      owner: "all" as const,
      q: "Shared Customer",
      recordScope: { kind: "ORGANIZATION" as const },
      status: "active" as const,
      viewerUserId: "manager-1"
    };

    const organizationA = await repository.listCustomers({ ...query, organizationId: "org-a" });
    const organizationB = await repository.listCustomers({ ...query, organizationId: "org-b" });

    expect(organizationA.map((customer) => customer.id)).toEqual(["org-a-customer"]);
    expect(organizationB.map((customer) => customer.id)).toEqual(["org-b-customer"]);
    expect(findMany.mock.calls[0][0].where).toMatchObject({ organizationId: "org-a" });
    expect(findMany.mock.calls[1][0].where).toMatchObject({ organizationId: "org-b" });
  });

  it("derives unique organizations only from grants active at the read time", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { location: { organizationId: "org-b" } },
      { location: { organizationId: "org-a" } },
      { location: { organizationId: "org-a" } }
    ]);
    const repository = createUnifiedCrmCustomerReadRepository({
      customer: { findMany: vi.fn() },
      userLocationAccess: { findMany }
    } as never);
    const at = new Date("2026-08-14T12:00:00.000Z");

    await expect(repository.listActiveOrganizationIds("viewer-1", at)).resolves.toEqual(["org-a", "org-b"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "viewer-1",
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gte: at } }]
      }
    }));
  });

  it("intersects Sales owner scope with requested filters and organization scope", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createUnifiedCrmCustomerReadRepository({
      customer: { findMany },
      userLocationAccess: { findMany: vi.fn() }
    } as never);

    await repository.listCustomers({
      cursor: null,
      limit: 25,
      organizationId: "org-a",
      owner: "unassigned",
      q: "",
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      status: "all",
      viewerUserId: "seller-1"
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 26,
      where: expect.objectContaining({
        organizationId: "org-a",
        archivedAt: null,
        mergedIntoCustomerId: null,
        status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] },
        AND: expect.arrayContaining([{ ownerUserId: "seller-1" }, { ownerUserId: null }])
      })
    }));
  });

  it("applies the stable cursor after organization and owner scope", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createUnifiedCrmCustomerReadRepository({
      customer: { findMany },
      userLocationAccess: { findMany: vi.fn() }
    } as never);
    const updatedAt = new Date("2026-08-14T12:00:00.000Z");

    await repository.listCustomers({
      cursor: { id: "customer-b", updatedAt },
      limit: 10,
      organizationId: "org-a",
      owner: "mine",
      q: "",
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      status: "active",
      viewerUserId: "seller-1"
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 11,
      where: expect.objectContaining({
        organizationId: "org-a",
        AND: expect.arrayContaining([
          { ownerUserId: "seller-1" },
          {
            OR: [
              { updatedAt: { lt: updatedAt } },
              { updatedAt, id: { lt: "customer-b" } }
            ]
          }
        ])
      })
    }));
  });
});
