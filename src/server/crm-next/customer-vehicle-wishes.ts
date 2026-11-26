import type { VehicleWishValues } from "@/lib/customer-vehicle-wishes";
import { prisma } from "@/server/db/client";
import type { Prisma } from "@prisma/client";

const wishSelect = {
  id: true, version: true, year: true, make: true, model: true, color: true,
  maxPriceCents: true, monthlyPaymentCents: true
} as const;

export function readCustomerVehicleWishes(customer: Prisma.CustomerWhereInput) {
  return prisma.customerVehicleWish.findMany({
    where: { customer, archivedAt: null }, select: wishSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
}

type WishChange = { action: "add"; values: VehicleWishValues }
  | { action: "save"; version: number; values: VehicleWishValues }
  | { action: "archive"; version: number };

export async function changeCustomerVehicleWish(
  customer: Prisma.CustomerWhereInput, customerId: string, organizationId: string, actorUserId: string,
  id: string, change: WishChange
) {
  return prisma.$transaction(async (tx) => {
    if (!await tx.customer.findFirst({ where: customer, select: { id: true } })) return { status: "unavailable" } as const;

    async function audit(eventType: string, version: number) {
      await tx.enterpriseAuditEvent.create({ data: {
        organizationId, actorUserId, domain: "UNIFIED_CRM", subjectType: "CUSTOMER", subjectId: customerId,
        eventType, reason: "Customer wishlist updated by staff.", metadata: { wishId: id, version }, correlationId: id
      } });
    }

    if (change.action === "add") {
      const created = await tx.customerVehicleWish.createMany({
        data: { id, customerId, ...change.values }, skipDuplicates: true
      });
      const wish = await tx.customerVehicleWish.findFirst({ where: { id, customer, archivedAt: null }, select: wishSelect });
      if (!wish || (!created.count && (wish.version !== 1 || Object.entries(change.values).some(
        ([key, value]) => wish[key as keyof VehicleWishValues] !== value
      )))) return { status: "conflict" } as const;
      if (created.count) await audit("CUSTOMER_VEHICLE_WISH_ADDED", wish.version);
      return { status: "saved", wish } as const;
    }

    const outcome = await tx.customerVehicleWish.updateMany({
      where: { id, customer, version: change.version, archivedAt: null },
      data: { ...(change.action === "save" ? change.values : { archivedAt: new Date() }), version: { increment: 1 } }
    });
    if (!outcome.count) return { status: "conflict" } as const;

    if (change.action === "archive") {
      await audit("CUSTOMER_VEHICLE_WISH_ARCHIVED", change.version + 1);
      return { status: "archived" } as const;
    }
    const wish = await tx.customerVehicleWish.findUniqueOrThrow({ where: { id }, select: wishSelect });
    await audit("CUSTOMER_VEHICLE_WISH_EDITED", wish.version);
    return { status: "saved", wish } as const;
  });
}
