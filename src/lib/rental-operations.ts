import { rentalLifecycle } from "./rental-lifecycle";

export type RentalBooking = {
  id: string; status: string; version: number; startsAt: string; expectedReturnAt: string;
  checkedOutAt: string | null; returnedAt: string | null; agreementJacketId: string | null;
  departureSnapshot: Record<string, unknown> | null; returnSnapshot: Record<string, unknown> | null;
};
export type RentalOperations = {
  bookings: RentalBooking[]; agreementHref: string | null;
  events: Array<{ id: string; action: string; occurredAt: string; actorUserId: string }>;
};
export function rentalOperationsSummary(bookings: RentalBooking[], packetClosed: boolean, now = new Date()) {
  const ordered = [...bookings].sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime());
  const booking = ordered.find(row => row.status === "CHECKED_OUT") ?? ordered.find(row => row.status === "RESERVED") ?? ordered[0];
  const active = booking?.status === "CHECKED_OUT", returned = booking?.status === "RETURNED";
  const closed = returned && packetClosed;
  const status = closed ? "Rental Closed" : rentalLifecycle(booking, now);
  const coverage = booking?.departureSnapshot?.insuranceValidUntil;
  const warnings: string[] = [];
  if (active && new Date(booking.expectedReturnAt) <= now) warnings.push("Return overdue. Contact the customer and record return or a covered extension.");
  else if (status === "Rental Due Soon") warnings.push("Due back within 24 hours. Confirm the return appointment.");
  if (active && (!coverage || !Number.isFinite(new Date(String(coverage)).getTime()))) warnings.push("Verified insurance expiry is missing. Staff review is required.");
  else if (active && new Date(String(coverage)) <= now) warnings.push("Recorded insurance has expired. Arrange immediate coverage review and safe return.");
  else if (active && new Date(String(coverage)) < new Date(booking.expectedReturnAt)) warnings.push("Recorded insurance does not cover the due-back time.");
  if (returned && !closed) warnings.push("Vehicle returned. Review condition, outstanding items and return paperwork before closing.");
  if (packetClosed && active) warnings.push("Paperwork is closed while custody remains active. Reconcile actual vehicle return.");
  if (packetClosed && !booking) warnings.push("Legacy paperwork is closed without recorded checkout or return. Reconcile custody history before treating this rental as closed.");
  const nextAction = closed ? "Review closed rental records" : active ? "Record return or extend rental" : returned ? "Review return and close rental paperwork" : booking?.status === "RESERVED" ? "Complete checkout and activate rental" : "Confirm customer, vehicle, rental dates and signed documents";
  return { booking, status, active, returned, closed, warnings, nextAction, delivered: Boolean(booking?.checkedOutAt), steps: [
    { label: "Prepare rental", complete: Boolean(booking) },
    { label: "Checkout & activation", complete: Boolean(booking?.checkedOutAt) },
    { label: "Active rental monitoring", complete: returned },
    { label: "Vehicle return & inspection", complete: returned },
    { label: "Review & close", complete: closed }
  ] };
}
