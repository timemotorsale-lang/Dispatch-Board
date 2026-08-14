import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import type {
  UnifiedCrmCustomerCursor,
  UnifiedCrmCustomerListOwner,
  UnifiedCrmCustomerListStatus
} from "@/server/unified-crm/customer-read-contract";

const customerListSelect = {
  id: true,
  customerNumber: true,
  displayName: true,
  phoneNumber: true,
  email: true,
  status: true,
  ownerUserId: true,
  preferredContactMethod: true,
  lastInteractionAt: true,
  nextActionAt: true,
  sourceCode: true,
  updatedAt: true,
  ownerUser: { select: { id: true, name: true } },
  contactPoints: {
    select: {
      id: true,
      type: true,
      value: true,
      normalizedValue: true,
      isPrimary: true,
      updatedAt: true
    },
    orderBy: [{ isPrimary: "desc" as const }, { updatedAt: "desc" as const }, { id: "asc" as const }]
  }
} satisfies Prisma.CustomerSelect;

export type UnifiedCrmCustomerListRecord = Prisma.CustomerGetPayload<{
  select: typeof customerListSelect;
}>;

export type UnifiedCrmCustomerRepositoryQuery = {
  cursor: UnifiedCrmCustomerCursor | null;
  limit: number;
  organizationId: string;
  owner: UnifiedCrmCustomerListOwner;
  q: string;
  recordScope: UnifiedCrmCustomerRecordScope;
  status: UnifiedCrmCustomerListStatus;
  viewerUserId: string;
};

export type UnifiedCrmCustomerReadRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  listCustomers(input: UnifiedCrmCustomerRepositoryQuery): Promise<UnifiedCrmCustomerListRecord[]>;
};

type UnifiedCrmCustomerReadDatabase = Pick<PrismaClient, "customer" | "userLocationAccess">;

function customerWhere(input: UnifiedCrmCustomerRepositoryQuery): Prisma.CustomerWhereInput {
  const requestedOwner: Prisma.CustomerWhereInput = input.owner === "mine"
    ? { ownerUserId: input.viewerUserId }
    : input.owner === "unassigned"
      ? { ownerUserId: null }
      : {};
  const recordOwner: Prisma.CustomerWhereInput = input.recordScope.kind === "OWNER"
    ? { ownerUserId: input.recordScope.ownerUserId }
    : {};
  const status: Prisma.CustomerWhereInput = input.status === "all"
    ? { status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] } }
    : { status: input.status.toUpperCase() as "ACTIVE" | "INACTIVE" };
  const search = input.q
    ? {
        OR: [
          { displayName: { contains: input.q, mode: "insensitive" as const } },
          { customerNumber: { contains: input.q, mode: "insensitive" as const } }
        ]
      }
    : {};
  const cursor = input.cursor
    ? {
        OR: [
          { updatedAt: { lt: input.cursor.updatedAt } },
          { updatedAt: input.cursor.updatedAt, id: { lt: input.cursor.id } }
        ]
      }
    : {};

  return {
    organizationId: input.organizationId,
    archivedAt: null,
    mergedIntoCustomerId: null,
    ...status,
    AND: [recordOwner, requestedOwner, search, cursor]
  };
}

export function createUnifiedCrmCustomerReadRepository(
  database: UnifiedCrmCustomerReadDatabase = prisma
): UnifiedCrmCustomerReadRepository {
  return {
    async listActiveOrganizationIds(userId, at) {
      const grants = await database.userLocationAccess.findMany({
        where: {
          userId,
          validFrom: { lte: at },
          OR: [{ validTo: null }, { validTo: { gte: at } }]
        },
        select: { location: { select: { organizationId: true } } }
      });
      return [...new Set(grants.map((grant) => grant.location.organizationId))].sort();
    },
    listCustomers(input) {
      return database.customer.findMany({
        where: customerWhere(input),
        select: customerListSelect,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit + 1
      });
    }
  };
}
