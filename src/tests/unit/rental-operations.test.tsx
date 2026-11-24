import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { rentalOperationsSummary, rentalTime, type RentalBooking } from "@/lib/rental-operations";
import { RentalOperationsDetails } from "@/features/crm-next/rental-operations-panel";
import { DealRowActions, DealRowStatus, type DealLibraryRow } from "@/features/crm-next/deal-row-controls";

const now = new Date("2026-11-04T15:00:00Z");
const booking: RentalBooking = { id: "booking", status: "CHECKED_OUT", version: 2, startsAt: "2026-11-01T15:00:00Z", checkedOutAt: "2026-11-01T15:30:00Z", expectedReturnAt: "2026-11-05T15:00:00Z", returnedAt: null, agreementJacketId: "agreement", departureSnapshot: { odometer: 120000, fuel: "Full", insuranceValidUntil: "2026-12-01T15:00:00Z", keysVerified: true }, returnSnapshot: null };
describe("rental operations lifecycle", () => {
  it("does not infer activation or closure from finalized paperwork alone", () => {
    expect(rentalOperationsSummary([], { packetClosed: true, now })).toMatchObject({ status: "Rental Draft", delivered: false, closed: false });
    expect(rentalOperationsSummary([booking], { packetClosed: true, now })).toMatchObject({ active: true, closed: false });
    expect(rentalOperationsSummary([booking], { packetClosed: true, now }).warnings.join()).toContain("custody remains active");
  });
  it("distinguishes due soon, overdue, returned review and closed rental", () => {
    expect(rentalOperationsSummary([booking], { now })).toMatchObject({ status: "Rented Out", dueSoon: true });
    expect(rentalOperationsSummary([booking], { now: new Date(booking.expectedReturnAt) }).status).toBe("Rental Overdue");
    const returned = { ...booking, status: "RETURNED", returnedAt: now.toISOString() };
    const closedReturns = [{ jacketId: "agreement" }];
    expect(rentalOperationsSummary([returned], { packetClosed: true, now })).toMatchObject({ stage: "RETURNED_REVIEW", closed: false });
    expect(rentalOperationsSummary([returned], { closedReturns: [{ jacketId: "different" }], now }).closed).toBe(false);
    expect(rentalOperationsSummary([returned], { closedReturns, now })).toMatchObject({ status: "Returned · Pending Inspection & Settlement", closed: false, actions: ["COMPLETE"] });
    expect(rentalOperationsSummary([{ ...returned, status: "RETURNED_REVIEW" }], { closedReturns, now })).toMatchObject({ status: "Returned · Pending Inspection & Settlement", closed: false, actions: ["COMPLETE"] });
    expect(rentalOperationsSummary([{ ...returned, returnSnapshot: { completion: { recordedAt: now.toISOString() } } }], { now })).toMatchObject({ status: "Rental Completed", closed: true, completedAt: now.toISOString(), actions: [] });
    expect(rentalOperationsSummary([{ ...returned, returnedAt: null }], { closedReturns, now })).toMatchObject({ status: "Return Evidence Needs Review", closed: false, actions: [] });
  });
  it("keeps active custody authoritative even when a newer reservation is present", () => {
    const newer = { ...booking, id: "new", startsAt: "2026-11-08T15:00:00Z", status: "RESERVED" };
    expect(rentalOperationsSummary([newer, booking], { now }).booking?.id).toBe("booking");
  });
  it("flags missing and expired insurance independently of the due date", () => {
    expect(rentalOperationsSummary([{ ...booking, departureSnapshot: null }], { now }).warnings.join()).toContain("expiry is missing");
    expect(rentalOperationsSummary([{ ...booking, departureSnapshot: { insuranceValidUntil: "2026-11-02T00:00:00Z" } }], { now }).warnings.join()).toContain("has expired");
  });
  it("provides direct return and extension links to the original rental", () => {
    const html = renderToStaticMarkup(<RentalOperationsDetails model={{ bookings: [booking], events: [], agreementHref: "/sales-documents?jacketId=agreement" }} draftId="original-rental" packetClosed={false} />);
    expect(html).toContain("draftId=original-rental&amp;rentalAction=RETURN#rental-checkout");
    expect(html).toContain("rentalAction=EXTEND#rental-checkout");
    expect(html).toContain("Out on Rental");
    expect(html).toContain("Checkout evidence");
    expect(html).not.toContain("Funding:");
  });
  it("retains evidence access while suppressing operational links for inactive rentals", () => {
    const html = renderToStaticMarkup(<RentalOperationsDetails model={{ bookings: [booking], events: [], agreementHref: null }} draftId="original" packetClosed={false} inactive />);
    expect(html).not.toContain("rentalAction=");
    expect(html).toContain("Checkout evidence");
  });
  it("renders the same actions on dashboard rows and drawers for rentals and loaners", () => {
    const noop = () => {};
    for (const pathway of ["daily-rental", "vehicle-loaner"]) {
      const cases: Array<{ bookings: RentalBooking[]; actions: string[] }> = [
        { bookings: [], actions: ["HANDOFF", "CANCEL"] },
        { bookings: [{ ...booking, status: "RESERVED", checkedOutAt: null }], actions: ["HANDOFF", "CANCEL"] },
        { bookings: [booking], actions: ["RETURN", "EXTEND"] },
        { bookings: [{ ...booking, status: "RETURNED_REVIEW", returnedAt: now.toISOString() }], actions: ["COMPLETE"] },
        { bookings: [{ ...booking, status: "CANCELLED", checkedOutAt: null }], actions: [] },
      ];
      for (const { bookings, actions } of cases) {
        const summary = rentalOperationsSummary(bookings, { pathway });
        const deal: DealLibraryRow = { id: "original", draftId: "original", customerName: "Customer", vehicleReference: "123", status: "IN_PROGRESS", pathway, updatedAt: now.toISOString(), rental: summary.work };
        const row = renderToStaticMarkup(<><DealRowStatus deal={deal} onDetails={noop} /><DealRowActions deal={deal} canManage={false} disabled={false} archiveBusy={false} onOpen={noop} onDetails={noop} onLifecycle={noop} onArchive={noop} /></>);
        const drawer = renderToStaticMarkup(<RentalOperationsDetails model={{ bookings, events: [], agreementHref: null }} draftId="original" pathway={pathway} packetClosed={false} />);
        for (const html of [row, drawer]) {
          expect(Array.from(html.matchAll(/draftId=original&amp;rentalAction=(\w+)#rental-checkout/g), match => match[1])).toEqual(actions);
          expect(html).toContain(summary.status.replaceAll("&", "&amp;"));
          expect(html).not.toContain("Mark sold");
        }
      }
    }
  });
  it("shows missing evidence and displays Chicago time across the fall clock change", () => {
    expect(rentalOperationsSummary([{ ...booking, checkedOutAt: null }], { now })).toMatchObject({ status: "Handoff Evidence Needs Review", active: true, delivered: false });
    expect(rentalTime("2026-11-01T06:30:00Z")).toContain("1:30:00 AM CDT");
    expect(rentalTime("2026-11-01T07:30:00Z")).toContain("1:30:00 AM CST");
    expect(rentalTime("2026-11-01T08:30:00Z")).toContain("2:30:00 AM CST");
    expect(rentalTime(" ")).toBe("Not recorded");
  });
});
