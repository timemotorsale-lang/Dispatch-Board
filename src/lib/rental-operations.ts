export type RentalBooking = {
  id: string; status: string; version: number; startsAt: string; expectedReturnAt: string;
  checkedOutAt: string | null; returnedAt: string | null; agreementJacketId: string | null;
  departureSnapshot: Record<string, unknown> | null; returnSnapshot: Record<string, unknown> | null;
};
export type RentalOperations = {
  bookings: RentalBooking[]; agreementHref: string | null;
  agreements?: Array<{ id: string }>;
  canManageExceptions?: boolean;
  events: Array<{ id: string; action: string; occurredAt: string; actorUserId: string; result?: unknown }>;
};
export const RENTAL_OPERATIONS_CHANGED = "rental-operations-changed";
export const RENTAL_STAGES = {
  DRAFT: "Draft", RESERVED: "Ready for Checkout", ACTIVE: "Out", OVERDUE: "Overdue",
  RETURNED_REVIEW: "Pending Inspection & Settlement", COMPLETE: "Completed", CANCELLED: "Cancelled", EVIDENCE_REVIEW: "Missing custody evidence",
} as const;
export type RentalStage = keyof typeof RENTAL_STAGES;
export const RENTAL_ACTIONS = {
  HANDOFF: "Checkout", RETURN: "Record Return", EXTEND: "Extend", COMPLETE: "Complete Rental", CANCEL: "Cancel Reservation",
} as const;
export type RentalAction = keyof typeof RENTAL_ACTIONS;
export type RentalWork = {
  stage: RentalStage; status: string; nextAction: string; actions: RentalAction[]; warnings: string[];
  dueBack: string | null; checkedOutAt: string | null; returnedAt: string | null; completedAt: string | null;
  occupancy: string;
};
type BookingEvidence = {
  status: string; startsAt: Date | string; expectedReturnAt: Date | string;
  checkedOutAt: Date | string | null; returnedAt: Date | string | null; agreementJacketId: string | null;
  departureSnapshot: unknown; returnSnapshot: unknown;
};
type ClosedReturn = { jacketId: string; finalizedAt?: Date | string };
const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const instant = (value: unknown) => {
  if (!(value instanceof Date) && (typeof value !== "string" || !value.trim())) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
export const isRentalPathway = (pathway?: string) => pathway === "daily-rental" || pathway === "vehicle-loaner";
export function rentalActionHref(draftId: string, action: RentalAction) {
  return `/crm-next/deals/start?${new URLSearchParams({ draftId, rentalAction: action })}#rental-checkout`;
}
export function rentalActionLabel(action: RentalAction, work: RentalWork, pathway: string) {
  if (action === "HANDOFF") return pathway === "vehicle-loaner" ? "Activate Loaner" : "Activate Rental";
  if (action === "CANCEL" && work.stage === "DRAFT") return pathway === "vehicle-loaner" ? "Cancel Loaner" : "Cancel Rental";
  if (action === "COMPLETE" && pathway === "vehicle-loaner") return "Complete Loaner";
  return RENTAL_ACTIONS[action];
}
export function rentalTime(value: string | null | undefined) {
  const date = instant(value);
  return date ? new Date(date).toLocaleString("en-US", { timeZone: "America/Chicago", timeZoneName: "short" }) : "Not recorded";
}

export function rentalOperationsSummary<Booking extends BookingEvidence>(bookings: Booking[], options: {
  pathway?: string; packetClosed?: boolean; closedReturns?: ClosedReturn[]; inactive?: boolean; cancelled?: boolean; now?: Date;
} = {}) {
  const { pathway = "daily-rental", packetClosed = false, closedReturns = [], inactive = false, cancelled = false, now = new Date() } = options;
  const kind = pathway === "vehicle-loaner" ? "Loaner" : "Rental";
  const ordered = [...bookings].sort((left, right) => (instant(right.startsAt) ?? "").localeCompare(instant(left.startsAt) ?? ""));
  const booking = ordered.find(row => row.status === "CHECKED_OUT")
    ?? ordered.find(row => row.status === "RETURNED_REVIEW")
    ?? ordered.find(row => row.status === "RETURNED" && !record(row.returnSnapshot).completion)
    ?? ordered.find(row => row.status === "RESERVED") ?? ordered[0];
  const checkedOutAt = instant(booking?.checkedOutAt), returnedAt = instant(booking?.returnedAt), dueBack = instant(booking?.expectedReturnAt);
  const active = booking?.status === "CHECKED_OUT";
  const returned = booking?.status === "RETURNED_REVIEW" || booking?.status === "RETURNED";
  const completion = record(booking?.returnSnapshot).completion;
  const closedReturn = closedReturns.some(document => document.jacketId === booking?.agreementJacketId);
  const closed = booking?.status === "RETURNED" && Boolean(checkedOutAt && returnedAt && completion);
  const overdue = active && Boolean(dueBack && new Date(dueBack) <= now);
  const dueSoon = active && !overdue && Boolean(dueBack && new Date(dueBack).getTime() - now.getTime() <= 86400000);
  const warnings: string[] = [], actions: RentalAction[] = [];
  let stage: RentalStage, status: string, nextAction: string, occupancy: string;
  if (active) {
    stage = !checkedOutAt ? "EVIDENCE_REVIEW" : overdue ? "OVERDUE" : "ACTIVE";
    status = !checkedOutAt ? "Handoff Evidence Needs Review" : overdue ? `${kind} Overdue` : kind === "Loaner" ? "Loaner Active" : "Rented Out";
    occupancy = checkedOutAt ? kind === "Loaner" ? "Out on Loaner" : "Out on Rental" : "Held · checkout evidence missing";
    nextAction = !checkedOutAt ? "Ask a manager to reconcile actual checkout evidence" : overdue ? "Contact the customer and record actual return or an approved extension" : "Record return or extend the due-back time";
    if (checkedOutAt) actions.push("RETURN", "EXTEND");
    if (!checkedOutAt) warnings.push("The booking holds the vehicle. Review the missing actual checkout time.");
    if (!dueBack) warnings.push("Due-back time is missing. Review the booking.");
    else if (overdue) warnings.push("Vehicle return is overdue.");
    else if (dueSoon) warnings.push("Due back within 24 hours. Confirm the return appointment.");
    const coverage = instant(record(booking.departureSnapshot).insuranceValidUntil);
    if (pathway === "daily-rental" || coverage) {
      if (!coverage) warnings.push("Verified insurance expiry is missing. Staff review is required.");
      else if (new Date(coverage) <= now) warnings.push("Recorded insurance has expired. Arrange immediate coverage review and safe return.");
      else if (dueBack && coverage < dueBack) warnings.push("Recorded insurance does not cover the due-back time.");
    }
    if (packetClosed) warnings.push("Paperwork is closed while custody remains active. Reconcile actual vehicle return.");
  } else if (returned) {
    stage = closed ? "COMPLETE" : checkedOutAt && returnedAt ? "RETURNED_REVIEW" : "EVIDENCE_REVIEW";
    status = closed ? `${kind} Completed` : !checkedOutAt ? "Handoff Evidence Needs Review" : !returnedAt ? "Return Evidence Needs Review" : "Returned · Pending Inspection & Settlement";
    occupancy = closed ? "Custody released · check current vehicle availability" : "Held · return review";
    nextAction = closed ? "Review completed records" : stage === "EVIDENCE_REVIEW" ? "Reconcile actual checkout and return evidence" : "Verify return inspection and settlement or an authorized exception";
    if (stage === "RETURNED_REVIEW") actions.push("COMPLETE");
    if (!checkedOutAt) warnings.push("Actual checkout time is missing.");
    if (!returnedAt) warnings.push("Actual return time is missing.");
    if (stage === "RETURNED_REVIEW" && !closedReturn) warnings.push("Finalize the linked return packet, then confirm inspection and settlement.");
  } else if (booking?.status === "CANCELLED" || cancelled) {
    stage = "CANCELLED"; status = `${kind} Cancelled`; nextAction = "Review cancellation history"; occupancy = "No active assignment";
  } else if (booking?.status === "RESERVED") {
    if (checkedOutAt || returnedAt) {
      stage = "EVIDENCE_REVIEW"; status = "Handoff Evidence Needs Review"; nextAction = "Reconcile the recorded custody times with the reservation";
      occupancy = "Held · conflicting custody evidence";
      warnings.push("The reservation already contains actual checkout or return evidence.");
    } else {
      stage = "RESERVED"; status = "Ready for Checkout"; nextAction = "Verify the signed agreement and record actual vehicle handoff"; occupancy = "Reserved";
      actions.push("HANDOFF", "CANCEL");
    }
  } else {
    stage = "DRAFT"; status = `${kind} Draft`; nextAction = "Confirm customer, vehicle, dates and required documents"; occupancy = "No recorded assignment";
    actions.push("HANDOFF", "CANCEL");
    if (packetClosed) warnings.push("Legacy paperwork is closed without recorded checkout or return. Reconcile custody history before treating this assignment as complete.");
  }
  const work: RentalWork = { stage, status, nextAction, actions: inactive ? [] : actions, warnings, dueBack, checkedOutAt, returnedAt,
    completedAt: closed ? instant(record(completion).recordedAt) : null, occupancy };
  return { ...work, work, booking, active, returned, closed, dueSoon, overdue, delivered: Boolean(checkedOutAt), steps: [
    { label: "Prepare rental", complete: Boolean(booking) },
    { label: "Record actual checkout", complete: Boolean(checkedOutAt) },
    { label: "Record actual return", complete: returned && Boolean(returnedAt) },
    { label: "Inspection, settlement & completion", complete: closed }
  ] };
}
