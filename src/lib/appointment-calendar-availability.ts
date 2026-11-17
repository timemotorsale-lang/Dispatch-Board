type CalendarBooking = {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
};

export function visibleAppointmentOverlaps(appointments: CalendarBooking[], startsAt: string, endsAt: string, editingId?: string) {
  const start = Date.parse(startsAt), end = Date.parse(endsAt);
  if (!(end > start)) return false;
  return appointments.some(appointment =>
    appointment.id !== editingId &&
    ["PENDING_APPROVAL", "SCHEDULED"].includes(appointment.bookingStatus) &&
    Boolean(appointment.startsAt && appointment.endsAt) &&
    Date.parse(appointment.startsAt!) < end && Date.parse(appointment.endsAt!) > start
  );
}
