import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

const linkedCustomerSelect = {
  id: true,
  displayName: true,
  customerNumber: true,
  organizationId: true,
  ownerUserId: true,
  archivedAt: true,
  mergedIntoCustomerId: true
} satisfies Prisma.CustomerSelect;

const appointmentSelect = {
  id: true,
  appointmentNumber: true,
  title: true,
  startsAt: true,
  bookingStatus: true,
  confirmationStatus: true,
  attendanceStatus: true,
  executionStatus: true,
  updatedAt: true,
  ownerUser: { select: { id: true, name: true } },
  participants: {
    where: { customerId: { not: null } },
    orderBy: [{ isPrimary: "desc" as const }, { updatedAt: "desc" as const }, { id: "asc" as const }],
    take: 1,
    select: {
      displayNameSnapshot: true,
      customer: { select: linkedCustomerSelect }
    }
  }
} satisfies Prisma.AppointmentSelect;

const leadSelect = {
  id: true,
  leadNumber: true,
  stage: true,
  nextActionCode: true,
  nextActionAt: true,
  updatedAt: true,
  ownerUser: { select: { id: true, name: true } },
  customer: { select: linkedCustomerSelect }
} satisfies Prisma.CustomerLeadSelect;

const concernCaseSelect = {
  id: true,
  concernNumber: true,
  title: true,
  priority: true,
  status: true,
  managerVisible: true,
  dueAt: true,
  resolutionDueAt: true,
  slaStage: true,
  updatedAt: true,
  assignedOwner: { select: { id: true, name: true } },
  customer: { select: linkedCustomerSelect }
} satisfies Prisma.ConcernCaseSelect;

const customerNextActionSelect = {
  id: true,
  customerNumber: true,
  displayName: true,
  status: true,
  nextActionAt: true,
  updatedAt: true,
  ownerUser: { select: { id: true, name: true } }
} satisfies Prisma.CustomerSelect;

export type UnifiedCrmWorkAppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;
export type UnifiedCrmWorkLeadRecord = Prisma.CustomerLeadGetPayload<{ select: typeof leadSelect }>;
export type UnifiedCrmWorkConcernCaseRecord = Prisma.ConcernCaseGetPayload<{ select: typeof concernCaseSelect }>;
export type UnifiedCrmWorkCustomerRecord = Prisma.CustomerGetPayload<{ select: typeof customerNextActionSelect }>;

export type UnifiedCrmWorkQueueRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  listScheduleViewableOrganizationIds(userId: string, at: Date): Promise<string[]>;
  listAppointments(input: {
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
    viewerUserId: string;
    limit: number;
  }): Promise<UnifiedCrmWorkAppointmentRecord[]>;
  listLeads(input: {
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
    limit: number;
  }): Promise<UnifiedCrmWorkLeadRecord[]>;
  listConcernCases(input: {
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
    limit: number;
  }): Promise<UnifiedCrmWorkConcernCaseRecord[]>;
  listCustomersWithNextAction(input: {
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
    limit: number;
  }): Promise<UnifiedCrmWorkCustomerRecord[]>;
};

type UnifiedCrmWorkQueueDatabase = Pick<
  PrismaClient,
  "appointment" | "concernCase" | "customer" | "customerLead" | "userLocationAccess"
>;

export function createUnifiedCrmWorkQueueRepository(
  database: UnifiedCrmWorkQueueDatabase = prisma
): UnifiedCrmWorkQueueRepository {
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
    async listScheduleViewableOrganizationIds(userId, at) {
      const grants = await database.userLocationAccess.findMany({
        where: {
          userId,
          canViewSchedule: true,
          validFrom: { lte: at },
          OR: [{ validTo: null }, { validTo: { gte: at } }]
        },
        select: { location: { select: { organizationId: true } } }
      });
      return [...new Set(grants.map((grant) => grant.location.organizationId))].sort();
    },
    listAppointments(input) {
      return database.appointment.findMany({
        where: {
          organizationId: input.organizationId,
          bookingStatus: { notIn: ["CANCELLED", "COMPLETED"] },
          ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
        },
        select: appointmentSelect,
        orderBy: [{ startsAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        take: input.limit
      });
    },
    listLeads(input) {
      return database.customerLead.findMany({
        where: {
          organizationId: input.organizationId,
          stage: { notIn: ["WON", "LOST"] },
          ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
        },
        select: leadSelect,
        orderBy: [{ nextActionAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        take: input.limit
      });
    },
    listConcernCases(input) {
      return database.concernCase.findMany({
        where: {
          organizationId: input.organizationId,
          status: { not: "CLOSED" },
          ...(input.recordScope.kind === "OWNER" ? { assignedOwnerId: input.recordScope.ownerUserId } : {})
        },
        select: concernCaseSelect,
        orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        take: input.limit
      });
    },
    listCustomersWithNextAction(input) {
      return database.customer.findMany({
        where: {
          organizationId: input.organizationId,
          archivedAt: null,
          mergedIntoCustomerId: null,
          nextActionAt: { not: null },
          status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] },
          ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
        },
        select: customerNextActionSelect,
        orderBy: [{ nextActionAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        take: input.limit
      });
    }
  };
}
