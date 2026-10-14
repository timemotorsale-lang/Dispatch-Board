import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

const interactionSelect = {
  id: true,
  channel: true,
  direction: true,
  summary: true,
  outcome: true,
  nextStep: true,
  occurredAt: true,
  actorUser: { select: { id: true, name: true } }
} satisfies Prisma.CustomerInteractionSelect;

const activityEventSelect = {
  id: true,
  eventType: true,
  message: true,
  createdAt: true,
  actorUser: { select: { id: true, name: true } },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      assignedUserId: true
    }
  },
  concernCase: {
    select: {
      id: true,
      concernNumber: true,
      title: true,
      status: true,
      assignedOwnerId: true
    }
  }
} satisfies Prisma.ActivityEventSelect;

const appointmentHistoryEventSelect = {
  id: true,
  eventType: true,
  message: true,
  occurredAt: true,
  actorUser: { select: { id: true, name: true } },
  appointment: {
    select: {
      id: true,
      appointmentNumber: true,
      title: true,
      ownerUserId: true
    }
  }
} satisfies Prisma.AppointmentHistoryEventSelect;

const leadEventSelect = {
  id: true,
  leadNumber: true,
  stage: true,
  vehicleInterest: true,
  createdAt: true,
  ownerUserId: true,
  ownerUser: { select: { id: true, name: true } }
} satisfies Prisma.CustomerLeadSelect;

const caseEventSelect = {
  id: true,
  concernNumber: true,
  title: true,
  priority: true,
  status: true,
  createdAt: true,
  assignedOwnerId: true,
  assignedOwner: { select: { id: true, name: true } }
} satisfies Prisma.ConcernCaseSelect;

const promiseEventSelect = {
  id: true,
  promiseType: true,
  promisedAt: true,
  dueAt: true,
  status: true,
  fulfilledAt: true,
  ownerUserId: true,
  ownerUser: { select: { id: true, name: true } },
  fulfilledByUser: { select: { id: true, name: true } },
  concernCase: {
    select: {
      id: true,
      concernNumber: true,
      customerId: true,
      organizationId: true,
      assignedOwnerId: true
    }
  }
} satisfies Prisma.CustomerPromiseSelect;

const crmDomainEventSelect = {
  id: true,
  eventType: true,
  occurredAt: true,
  payload: true,
  command: {
    select: {
      actorUserId: true
    }
  }
} satisfies Prisma.EnterpriseDomainEventSelect;

export type UnifiedCrmCustomerInteractionRecord = Prisma.CustomerInteractionGetPayload<{
  select: typeof interactionSelect;
}>;

export type UnifiedCrmCustomerActivityEventRecord = Prisma.ActivityEventGetPayload<{
  select: typeof activityEventSelect;
}>;

export type UnifiedCrmCustomerAppointmentHistoryRecord = Prisma.AppointmentHistoryEventGetPayload<{
  select: typeof appointmentHistoryEventSelect;
}>;

export type UnifiedCrmCustomerLeadEventRecord = Prisma.CustomerLeadGetPayload<{
  select: typeof leadEventSelect;
}>;

export type UnifiedCrmCustomerCaseEventRecord = Prisma.ConcernCaseGetPayload<{
  select: typeof caseEventSelect;
}>;

export type UnifiedCrmCustomerPromiseEventRecord = Prisma.CustomerPromiseGetPayload<{
  select: typeof promiseEventSelect;
}>;

export type UnifiedCrmCustomerDomainEventRecord = Prisma.EnterpriseDomainEventGetPayload<{
  select: typeof crmDomainEventSelect;
}>;

export type UnifiedCrmCustomerTimelineRepositoryInput = {
  customerId: string;
  organizationId: string;
  limit: number;
  recordScope: UnifiedCrmCustomerRecordScope;
};

export type UnifiedCrmCustomerTimelineRecord = {
  interactions: UnifiedCrmCustomerInteractionRecord[];
  activityEvents: UnifiedCrmCustomerActivityEventRecord[];
  appointmentHistoryEvents: UnifiedCrmCustomerAppointmentHistoryRecord[];
  leadEvents: UnifiedCrmCustomerLeadEventRecord[];
  caseEvents: UnifiedCrmCustomerCaseEventRecord[];
  promiseEvents: UnifiedCrmCustomerPromiseEventRecord[];
  crmDomainEvents: UnifiedCrmCustomerDomainEventRecord[];
  page: {
    limit: number;
    hasMore: boolean;
  };
};

export type UnifiedCrmCustomerTimelineRepository = {
  listTimeline(input: UnifiedCrmCustomerTimelineRepositoryInput): Promise<UnifiedCrmCustomerTimelineRecord>;
};

type UnifiedCrmCustomerTimelineDatabase = Pick<
  PrismaClient,
  "activityEvent" | "appointmentHistoryEvent" | "concernCase" | "customerInteraction" | "customerLead" | "customerPromise" | "enterpriseDomainEvent"
>;

export function createUnifiedCrmCustomerTimelineRepository(
  database: UnifiedCrmCustomerTimelineDatabase = prisma
): UnifiedCrmCustomerTimelineRepository {
  return {
    async listTimeline(input) {
      const ownerUserId = input.recordScope.kind === "OWNER" ? input.recordScope.ownerUserId : undefined;
      const fetchLimit = input.limit + 1;
      const [interactions, activityEvents, appointmentHistoryEvents, leadEvents, caseEvents, promiseEvents, crmDomainEvents] = await Promise.all([
        database.customerInteraction.findMany({
          where: {
            customerId: input.customerId,
            customer: {
              organizationId: input.organizationId
            }
          },
          select: interactionSelect,
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.activityEvent.findMany({
          where: {
            OR: [
              {
                task: {
                  customerId: input.customerId,
                  customer: {
                    organizationId: input.organizationId
                  },
                  ...(ownerUserId ? { assignedUserId: ownerUserId } : {})
                }
              },
              {
                concernCase: {
                  customerId: input.customerId,
                  organizationId: input.organizationId,
                  ...(ownerUserId ? { assignedOwnerId: ownerUserId } : {})
                }
              }
            ]
          },
          select: activityEventSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.appointmentHistoryEvent.findMany({
          where: {
            appointment: {
              organizationId: input.organizationId,
              participants: { some: { customerId: input.customerId } },
              ...(ownerUserId ? { ownerUserId } : {})
            }
          },
          select: appointmentHistoryEventSelect,
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.customerLead.findMany({
          where: {
            customerId: input.customerId,
            organizationId: input.organizationId,
            ...(ownerUserId ? { ownerUserId } : {})
          },
          select: leadEventSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.concernCase.findMany({
          where: {
            customerId: input.customerId,
            organizationId: input.organizationId,
            ...(ownerUserId ? { assignedOwnerId: ownerUserId } : {})
          },
          select: caseEventSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.customerPromise.findMany({
          where: {
            concernCase: {
              customerId: input.customerId,
              organizationId: input.organizationId,
              ...(ownerUserId ? { assignedOwnerId: ownerUserId } : {})
            },
            ...(ownerUserId ? { ownerUserId } : {})
          },
          select: promiseEventSelect,
          orderBy: [{ promisedAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        }),
        database.enterpriseDomainEvent.findMany({
          where: {
            organizationId: input.organizationId,
            domain: "UNIFIED_CRM",
            aggregateType: "CUSTOMER",
            aggregateId: input.customerId,
            eventType: {
              in: [
                "CRM_CUSTOMER_NEXT_ACTION_SET",
                "CRM_CUSTOMER_NEXT_ACTION_RESCHEDULED",
                "CRM_CUSTOMER_NEXT_ACTION_COMPLETED"
              ]
            }
          },
          select: crmDomainEventSelect,
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          take: fetchLimit
        })
      ]);

      const sourceBuckets = [
        interactions,
        activityEvents,
        appointmentHistoryEvents,
        leadEvents,
        caseEvents,
        promiseEvents,
        crmDomainEvents
      ];
      const boundedCounts = sourceBuckets.reduce((total, records) => total + Math.min(records.length, input.limit), 0);
      const hasMore = sourceBuckets.some((records) => records.length > input.limit) || boundedCounts > input.limit;

      return {
        interactions: interactions.slice(0, input.limit),
        activityEvents: activityEvents.slice(0, input.limit),
        appointmentHistoryEvents: appointmentHistoryEvents.slice(0, input.limit),
        leadEvents: leadEvents.slice(0, input.limit),
        caseEvents: caseEvents.slice(0, input.limit),
        promiseEvents: promiseEvents.slice(0, input.limit),
        crmDomainEvents: crmDomainEvents.slice(0, input.limit),
        page: {
          limit: input.limit,
          hasMore
        }
      };
    }
  };
}
