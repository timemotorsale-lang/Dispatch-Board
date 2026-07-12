import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";

const customer360Include = {
  ownerUser: { select: { id: true, name: true, email: true } },
  contactPoints: { orderBy: [{ isPrimary: "desc" as const }, { type: "asc" as const }] },
  interactions: { take: 50, orderBy: [{ occurredAt: "desc" as const }, { id: "desc" as const }], include: { actorUser: { select: { id: true, name: true } } } },
  notes: { take: 30, orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], include: { authorUser: { select: { id: true, name: true } } } },
  leads: { take: 20, orderBy: [{ createdAt: "desc" as const }], include: { ownerUser: { select: { id: true, name: true } } } },
  concernCases: { take: 20, orderBy: [{ createdAt: "desc" as const }], include: { assignedOwner: { select: { id: true, name: true } }, customerPromises: { where: { status: "OPEN" }, orderBy: { dueAt: "asc" as const } } } },
  tasks: { take: 30, orderBy: [{ dueAt: "asc" as const }], include: { assignedUser: { select: { id: true, name: true } } } },
  appointmentParticipants: { take: 20, orderBy: [{ createdAt: "desc" as const }], include: { appointment: { select: { id: true, title: true, startsAt: true, bookingStatus: true, confirmationStatus: true, attendanceStatus: true } } } },
  vehicleRelationships: { take: 20, orderBy: [{ effectiveFrom: "desc" as const }], include: { vehicle: { select: { id: true, vehicleNumber: true, year: true, make: true, model: true, vin: true, stockNumber: true, status: true } } } },
  documentRequirements: { take: 30, orderBy: [{ dueAt: "asc" as const }, { createdAt: "desc" as const }] },
  crmDecisionRecords: { take: 10, orderBy: [{ decidedAt: "desc" as const }] }
} satisfies Prisma.CustomerInclude;

export type Customer360Record = Prisma.CustomerGetPayload<{ include: typeof customer360Include }>;
export type Customer360Repository = { findCustomer(organizationId: string, customerId?: string | null): Promise<Customer360Record | null> };

export function createCustomer360Repository(database: Pick<PrismaClient, "customer"> = prisma): Customer360Repository {
  return { findCustomer(organizationId, customerId) { return database.customer.findFirst({ where: { organizationId, mergedIntoCustomerId: null, archivedAt: null, ...(customerId ? { id: customerId } : {}) }, orderBy: customerId ? undefined : [{ updatedAt: "desc" }, { id: "asc" }], include: customer360Include }); } };
}
