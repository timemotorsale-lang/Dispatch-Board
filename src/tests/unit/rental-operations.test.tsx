import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { rentalOperationsSummary, type RentalBooking } from "@/lib/rental-operations";
import { RentalOperationsDetails } from "@/features/crm-next/rental-operations-panel";

const now = new Date("2026-11-04T15:00:00Z");
const booking: RentalBooking = { id: "booking", status: "CHECKED_OUT", version: 2, startsAt: "2026-11-01T15:00:00Z", checkedOutAt: "2026-11-01T15:30:00Z", expectedReturnAt: "2026-11-05T15:00:00Z", returnedAt: null, agreementJacketId: "agreement", departureSnapshot: { odometer: 120000, fuel: "Full", insuranceValidUntil: "2026-12-01T15:00:00Z", keysVerified: true }, returnSnapshot: null };
describe("rental operations lifecycle", () => {
  it("does not infer activation or closure from finalized paperwork alone", () => {
    expect(rentalOperationsSummary([], true, now)).toMatchObject({ status: "Rental Draft", delivered: false, closed: false });
    expect(rentalOperationsSummary([booking], true, now)).toMatchObject({ active: true, closed: false });
    expect(rentalOperationsSummary([booking], true, now).warnings.join()).toContain("custody remains active");
  });
  it("distinguishes due soon, overdue, returned review and closed rental", () => {
    expect(rentalOperationsSummary([booking], false, now).status).toBe("Rental Due Soon");
    expect(rentalOperationsSummary([booking], false, new Date(booking.expectedReturnAt)).status).toBe("Rental Overdue");
    const returned = { ...booking, status: "RETURNED", returnedAt: now.toISOString() };
    expect(rentalOperationsSummary([returned], false, now)).toMatchObject({ status: "Rental Returned", closed: false });
    expect(rentalOperationsSummary([returned], true, now)).toMatchObject({ status: "Rental Closed", closed: true });
  });
  it("keeps active custody authoritative even when a newer reservation is present", () => {
    const newer = { ...booking, id: "new", startsAt: "2026-11-08T15:00:00Z", status: "RESERVED" };
    expect(rentalOperationsSummary([newer, booking], false, now).booking?.id).toBe("booking");
  });
  it("flags missing and expired insurance independently of the due date", () => {
    expect(rentalOperationsSummary([{ ...booking, departureSnapshot: null }], false, now).warnings.join()).toContain("expiry is missing");
    expect(rentalOperationsSummary([{ ...booking, departureSnapshot: { insuranceValidUntil: "2026-11-02T00:00:00Z" } }], false, now).warnings.join()).toContain("has expired");
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
});
