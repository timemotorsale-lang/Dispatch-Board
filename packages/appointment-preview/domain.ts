export const exampleDays = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"] as const;
export const exampleTimes = ["09:00", "10:00", "11:00", "14:00"] as const;
export const demoStatusLabels = { REQUESTED: "Sample request", REVIEWING: "Sample staff review", CONFIRMED: "Sample confirmed", CANCELLED: "Sample cancelled" };
export type DemoStatus = keyof typeof demoStatusLabels;
export type DemoAppointment = { id: string; title: string; name: string; date: string; time: string; status: DemoStatus; history: string[] };
export type DemoAction = { kind: "REVIEW" | "CONFIRM" | "RESCHEDULE" | "CANCEL"; date?: string; time?: string; reason?: string };

export function createDemoAppointments(): DemoAppointment[] {
  return [
    { id: "sample-test-drive", title: "Test drive", name: "Sample shopper A", date: exampleDays[0], time: "09:00", status: "REQUESTED", history: ["Example request received — no real submission."] },
    { id: "sample-service", title: "Service visit", name: "Sample shopper B", date: exampleDays[0], time: "10:00", status: "CONFIRMED", history: ["Example confirmed visit — not a real appointment."] },
    { id: "sample-delivery", title: "Vehicle handoff", name: "Sample shopper C", date: exampleDays[1], time: "14:00", status: "REQUESTED", history: ["Example request received — no real submission."] }
  ];
}

export function applyDemoAction(appointments: DemoAppointment[], id: string, action: DemoAction): DemoAppointment[] {
  const current = appointments.find(appointment => appointment.id === id);
  if (!current || current.status === "CANCELLED") throw new Error("Choose an active sample appointment, or reset the demo.");
  const reason = action.reason?.trim() || "";
  if (reason.length > 200) throw new Error("Keep the sample reason within 200 characters.");
  if ((action.kind === "CANCEL" || action.kind === "RESCHEDULE") && reason.length < 5) throw new Error("Enter a sample reason of at least five characters.");
  let next: DemoAppointment;
  if (action.kind === "REVIEW") {
    if (current.status !== "REQUESTED") throw new Error("Only a sample request can enter staff review.");
    next = { ...current, status: "REVIEWING", history: [...current.history, "Sample staff review started."] };
  } else if (action.kind === "CANCEL") {
    next = { ...current, status: "CANCELLED", history: [...current.history, `Sample cancellation: ${reason}`] };
  } else {
    if (action.kind === "CONFIRM" && current.status !== "REVIEWING") throw new Error("Review the sample request before confirming it.");
    if (action.kind === "RESCHEDULE" && current.status !== "CONFIRMED") throw new Error("Only a sample confirmed appointment can be rescheduled.");
    if (action.kind !== "CONFIRM" && action.kind !== "RESCHEDULE") throw new Error("Choose a supported demo action.");
    if (!(exampleDays as readonly string[]).includes(action.date || "") || !(exampleTimes as readonly string[]).includes(action.time || "")) throw new Error("Choose a date and time from this example week.");
    if (appointments.some(appointment => appointment.id !== id && appointment.status === "CONFIRMED" && appointment.date === action.date && appointment.time === action.time)) throw new Error("Example conflict: that sample time is already occupied. Choose another time.");
    next = { ...current, status: "CONFIRMED", date: action.date!, time: action.time!, history: [...current.history, `Sample ${action.kind === "CONFIRM" ? "confirmation" : "reschedule"}: ${action.date} ${action.time}${reason ? ` — ${reason}` : ""}.`] };
  }
  return appointments.map(appointment => appointment.id === id ? next : appointment);
}

export function isCalendarDate(value: string) {
  if (!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function minnesotaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
