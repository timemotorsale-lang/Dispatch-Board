import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

const duplicateCandidateSelect = {
  id: true,
  displayName: true,
  email: true,
  phoneNumber: true,
  contactPoints: {
    select: {
      normalizedValue: true,
      type: true,
      value: true
    }
  }
} satisfies Prisma.CustomerSelect;

export type UnifiedCrmCustomerDuplicateCandidateRecord = Prisma.CustomerGetPayload<{
  select: typeof duplicateCandidateSelect;
}>;

export type UnifiedCrmCustomerDuplicateCandidateRepository = {
  findDuplicateCandidates(input: {
    customerId: string;
    email: string | null;
    displayName: string | null;
    normalizedPhone: string | null;
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<UnifiedCrmCustomerDuplicateCandidateRecord[]>;
};

type DuplicateCandidateDatabase = Pick<PrismaClient, "customer">;

export function createUnifiedCrmCustomerDuplicateCandidateRepository(
  database: DuplicateCandidateDatabase = prisma
): UnifiedCrmCustomerDuplicateCandidateRepository {
  return {
    async findDuplicateCandidates(input) {
      const matchers: Prisma.CustomerWhereInput[] = [];
      if (input.email) {
        matchers.push(
          { email: { equals: input.email, mode: "insensitive" } },
          { contactPoints: { some: { normalizedValue: input.email, type: "EMAIL" } } }
        );
      }
      if (input.normalizedPhone) {
        matchers.push(
          { phoneNumber: { contains: input.normalizedPhone.replace(/^\+1?/, "") } },
          { contactPoints: { some: { normalizedValue: input.normalizedPhone, type: "PHONE" } } }
        );
      }
      if (input.displayName) {
        matchers.push({ displayName: { equals: input.displayName, mode: "insensitive" } });
      }
      if (!matchers.length) return [];

      return database.customer.findMany({
        where: {
          organizationId: input.organizationId,
          archivedAt: null,
          mergedIntoCustomerId: null,
          id: { not: input.customerId },
          ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {}),
          OR: matchers
        },
        select: duplicateCandidateSelect,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 10
      });
    }
  };
}
