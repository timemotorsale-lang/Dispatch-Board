import type { Prisma } from "@prisma/client";

export const legacyRentalReturnWithoutCompletion = {
  status: "RETURNED",
  agreementJacket: { is: { pathway: { in: ["daily-rental", "vehicle-loaner"] } } },
  events: { none: { action: "COMPLETE" } }
} satisfies Prisma.VehicleUseBookingWhereInput;

export function vehicleCustodySelection(organizationId: string) {
  return {
    where: { organizationId, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW", "RETURNED"] } },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true, status: true, expectedReturnAt: true, checkedOutAt: true,
      context: { select: { draft: { select: { pathway: true } } } },
      agreementJacket: { select: { pathway: true } },
      events: { where: { action: "COMPLETE" }, select: { id: true }, take: 1 }
    }
  } satisfies Prisma.Vehicle$vehicleUseBookingsArgs;
}
