type CustodyBooking = {
  status: string;
  expectedReturnAt: Date;
  context: { draft: { pathway: string } };
  agreementJacket: { pathway: string } | null;
};

const chicagoTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"
});

export function describeVehicleUseCustody(bookings: CustodyBooking[], now = new Date()) {
  const hold = bookings.find(booking => booking.status === "RETURNED_REVIEW");
  const checkout = bookings.find(booking => booking.status === "CHECKED_OUT");
  const reservation = bookings.find(booking => booking.status === "RESERVED" && booking.expectedReturnAt > now);
  const booking = checkout ?? hold ?? reservation;
  if (!booking) return null;

  const pathway = booking.agreementJacket?.pathway ?? booking.context.draft.pathway;
  const due = chicagoTime.format(booking.expectedReturnAt);
  if (checkout) {
    const label = pathway === "daily-rental" ? "Rented Out" : pathway === "vehicle-loaner" ? "Loaner Active" : "Out on test drive";
    return { blocksTemporaryUse: true, label: `${label} · ${booking.expectedReturnAt < now ? "Overdue since" : "Due back"} ${due}` };
  }
  if (hold) return { blocksTemporaryUse: true, label: pathway === "test-drive" ? "Returned · exception review required" : "Returned · inspection or settlement pending" };
  return { blocksTemporaryUse: false, label: `Temporary use reserved · due back ${due}` };
}

export function describeVehicleCustodySelection(bookings: Array<CustodyBooking & { id: string; checkedOutAt: Date | null; events: { id: string }[] }>, now?: Date) {
  return describeVehicleUseCustody(bookings.map(booking => {
    const pending = booking.status === "RETURNED" && !booking.events.length && ["daily-rental", "vehicle-loaner"].includes(booking.agreementJacket?.pathway ?? "");
    return pending ? { ...booking, status: "RETURNED_REVIEW" } : booking;
  }), now);
}
