"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  MessageSquareText,
  RefreshCw,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type AppointmentConsoleSection = "today" | "planning" | "operations" | "follow-up" | "intelligence" | "exceptions";

type LiveAppointment = {
  id: string;
  appointmentNumber: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
  confirmationStatus: string;
  attendanceStatus: string;
  executionStatus: string;
  owner: { name: string } | null;
  customer: { displayName: string; phoneNumber: string | null; email: string | null } | null;
  vehicles: Array<{ year: number | null; make: string | null; model: string | null; vehicleNumber: string; vin: string | null }>;
  taskLinks: Array<{ taskStatus: string; blocksAppointment: boolean }>;
  resourceReservations: Array<{ status: string }>;
};

type AppointmentApiResponse = {
  appointmentCount: number;
  appointments: LiveAppointment[];
  date: string;
  location: { id: string; name: string; timezone: string };
};

type AppointmentIdentityCustomer = {
  customerNumber?: string;
  displayName: string;
  email?: string | null;
  id: string;
  phoneNumber?: string | null;
};

type AppointmentIdentityVehicle = {
  color?: string | null;
  id: string;
  licensePlate?: string | null;
  make: string | null;
  model: string | null;
  stockNumber?: string | null;
  vehicleNumber: string;
  vin?: string | null;
  year: number | null;
};

type AppointmentIdentitySearchResponse = {
  customers: AppointmentIdentityCustomer[];
  vehicles: AppointmentIdentityVehicle[];
};

const defaultOrganizationId = "org-time-motor-sales";
const defaultLocationId = "loc-time-motor-sales-minneapolis";
const defaultTimezone = "America/Chicago";

const purposeOptions = [
  { value: "CUSTOMER_ISSUE", label: "Customer Issue / Resolution", duration: 60, category: "customer" },
  { value: "SERVICE_REPAIR", label: "Service / Repair Appointment", duration: 60, category: "service" },
  { value: "SALES_CONSULTATION", label: "Sales Consultation", duration: 60, category: "sales" },
  { value: "TEST_DRIVE", label: "Test Drive", duration: 45, category: "sales" },
  { value: "TITLE_DOCUMENTATION", label: "Title / Documentation Issue", duration: 45, category: "dmv" },
  { value: "FINANCE_PAPERWORK", label: "Finance Paperwork", duration: 60, category: "sales" },
  { value: "INSURANCE_VERIFICATION", label: "Insurance Verification", duration: 30, category: "customer" },
  { value: "DAILY_RENTAL", label: "Daily Rental / Loaner", duration: 30, category: "general" },
  { value: "PAYMENT_COLLECTION", label: "Payment / Collections", duration: 30, category: "collections" },
  { value: "VEHICLE_DELIVERY", label: "Vehicle Delivery / Selling Paperwork", duration: 60, category: "delivery" },
  { value: "PHOTO_MARKETING", label: "Photos / Marketing / Advertising", duration: 45, category: "marketing" },
  { value: "INVENTORY_OPERATION", label: "Inventory / Lot / Vehicle Operation", duration: 45, category: "inventory" },
  { value: "DMV_TITLE", label: "DMV / Title Follow-up", duration: 45, category: "dmv" },
  { value: "GENERAL_FOLLOW_UP", label: "General Follow-up", duration: 30, category: "general" }
] as const;

function todayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: defaultTimezone,
    year: "numeric"
  }).format(new Date());
}

function localDateTimeToIso(localDate: string, time: string, timezone = defaultTimezone) {
  const [yearText, monthText, dayText] = localDate.split("-");
  const [hourText, minuteText] = time.split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      numberingSystem: "latn",
      timeZone: timezone,
      year: "numeric"
    }).formatToParts(candidate);
    const actualYear = Number(parts.find((part) => part.type === "year")?.value);
    const actualMonth = Number(parts.find((part) => part.type === "month")?.value);
    const actualDay = Number(parts.find((part) => part.type === "day")?.value);
    const actualHourText = parts.find((part) => part.type === "hour")?.value ?? "0";
    const actualHour = actualHourText === "24" ? 0 : Number(actualHourText);
    const actualMinute = Number(parts.find((part) => part.type === "minute")?.value);
    const differenceMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) -
      Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute, 0, 0);

    if (differenceMs === 0) return candidate.toISOString();
    candidate = new Date(candidate.getTime() + differenceMs);
  }

  return candidate.toISOString();
}

function addMinutesToIso(isoValue: string, minutes: number) {
  return new Date(new Date(isoValue).getTime() + minutes * 60_000).toISOString();
}

function createAppointmentNumber() {
  return `APT-${Date.now().toString().slice(-8)}`;
}

function formatTime(value: string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: defaultTimezone
  }).format(new Date(value));
}

function vehicleLabel(appointment: LiveAppointment) {
  const vehicle = appointment.vehicles[0];
  if (!vehicle) return "No vehicle";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber || "Vehicle";
}

function identityVehicleLabel(vehicle: AppointmentIdentityVehicle) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
}

function needsConfirmation(appointment: LiveAppointment) {
  return appointment.confirmationStatus !== "CONFIRMED" && appointment.bookingStatus !== "CANCELLED";
}

function needsFollowUp(appointment: LiveAppointment) {
  return appointment.executionStatus === "FOLLOW_UP" ||
    appointment.attendanceStatus === "NO_SHOW" ||
    appointment.taskLinks.some((task) => task.blocksAppointment);
}

function hasException(appointment: LiveAppointment) {
  return appointment.bookingStatus === "DRAFT" ||
    appointment.attendanceStatus === "NO_SHOW" ||
    appointment.taskLinks.some((task) => task.blocksAppointment) ||
    appointment.resourceReservations.some((reservation) => reservation.status !== "COMMITTED");
}

function boardFocusHref(appointment: LiveAppointment, anchor = "") {
  return `/appointments?view=board&appointment=${encodeURIComponent(appointment.appointmentNumber)}${anchor}`;
}

function dateKeyFromDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: defaultTimezone,
    year: "numeric"
  }).format(date);
}

function noonDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function addDays(dateKey: string, days: number) {
  const date = noonDate(dateKey);
  date.setDate(date.getDate() + days);
  return dateKeyFromDate(date);
}

function addMonths(dateKey: string, months: number) {
  const date = noonDate(dateKey);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return dateKeyFromDate(date);
}

function monthLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: defaultTimezone,
    year: "numeric"
  }).format(noonDate(dateKey));
}

function buildMonthCells(selectedDateKey: string) {
  const selectedDate = noonDate(selectedDateKey);
  const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const dateKey = dateKeyFromDate(date);

    return {
      dateKey,
      day: String(date.getDate()),
      muted: date.getMonth() !== selectedDate.getMonth(),
      selected: dateKey === selectedDateKey
    };
  });
}

function weekStart(dateKey: string) {
  const date = noonDate(dateKey);
  date.setDate(date.getDate() - date.getDay());
  return dateKeyFromDate(date);
}

function monthStart(dateKey: string) {
  const date = noonDate(dateKey);
  return dateKeyFromDate(new Date(date.getFullYear(), date.getMonth(), 1, 12));
}

function appointmentTop(appointment: LiveAppointment) {
  if (!appointment.startsAt) return 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    numberingSystem: "latn",
    timeZone: defaultTimezone
  }).formatToParts(new Date(appointment.startsAt));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return Math.max(0, ((hour * 60 + minute) - 8 * 60) * (53 / 60));
}

function appointmentDateKey(appointment: LiveAppointment) {
  if (!appointment.startsAt) return null;
  return dateKeyFromDate(new Date(appointment.startsAt));
}

function AppointmentConsoleShell({ children }: { children: ReactNode }) {
  return (
    <section className="appointment-refinement-shell">
      {children}
    </section>
  );
}

const todayFlowGroups = [
  {
    label: "Arriving Soon",
    tone: "blue",
    count: 6,
    rows: [
      ["8:00 AM", "Michael Johnson", "Oil Change", "2021 Toyota RAV4", "Sarah Mitchell", "Check In"],
      ["8:30 AM", "Amanda Lee", "Brake Inspection", "2019 Honda CR-V", "David Ramirez", "Check In"],
      ["9:00 AM", "Robert Davis", "Tire Rotation", "2020 Ford F-150", "James Walker", "Check In"]
    ]
  },
  {
    label: "Waiting Confirmation",
    tone: "orange",
    count: 7,
    rows: [
      ["10:00 AM", "Jennifer Martinez", "A/C Performance", "2018 Chevrolet Equinox", "Sarah Mitchell", "Confirm"],
      ["11:30 AM", "William Clark", "Battery Replacement", "2017 Nissan Altima", "David Ramirez", "Confirm"],
      ["1:00 PM", "Lisa Anderson", "State Inspection", "2022 Toyota Camry", "James Walker", "Confirm"]
    ]
  },
  {
    label: "Follow-up Needed",
    tone: "purple",
    count: 5,
    rows: [
      ["2:00 PM", "Brian Thompson", "Estimate Review", "2016 Jeep Grand Cherokee", "Sarah Mitchell", "Reschedule"],
      ["3:30 PM", "Kevin White", "Transmission Concern", "2014 Ford Escape", "David Ramirez", "Reschedule"],
      ["4:00 PM", "Stephanie Brown", "Check Engine Light", "2015 Kia Soul", "James Walker", "Reschedule"]
    ]
  }
];

const kpis = [
  { icon: UserRound, label: "Arrivals Today", value: "18", detail: "Appts", tone: "blue" },
  { icon: Gauge, label: "Open Capacity", value: "3.5 hrs", detail: "Available", tone: "green" },
  { icon: MessageSquareText, label: "Waiting Confirmation", value: "7", detail: "Appts", tone: "orange" },
  { icon: RefreshCw, label: "Follow-ups", value: "5", detail: "Appts", tone: "purple" },
  { icon: AlertTriangle, label: "Exceptions", value: "2", detail: "Appts", tone: "red" }
];

function useAppointmentConsoleData() {
  const [data, setData] = useState<AppointmentApiResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/appointments?date=${encodeURIComponent(todayDateKey())}`);
        const result = await response.json().catch(() => null) as AppointmentApiResponse | { error?: string } | null;

        if (!response.ok || !result || !("appointments" in result)) {
          throw new Error("Unable to load live appointments.");
        }

        if (!cancelled) {
          setData(result);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, status };
}

function useAppointmentWindow(dateKey: string, view: "day" | "week" | "month") {
  const [data, setData] = useState<AppointmentApiResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");

      try {
        const query = new URLSearchParams();

        if (view === "day") {
          query.set("date", dateKey);
        } else {
          const startDate = view === "week" ? weekStart(dateKey) : monthStart(dateKey);
          const endDate = view === "week" ? addDays(startDate, 7) : addMonths(startDate, 1);
          query.set("windowStart", localDateTimeToIso(startDate, "00:00"));
          query.set("windowEnd", localDateTimeToIso(endDate, "00:00"));
          query.set("date", dateKey);
        }

        const response = await fetch(`/api/appointments?${query.toString()}`);
        const result = await response.json().catch(() => null) as AppointmentApiResponse | { error?: string } | null;

        if (!response.ok || !result || !("appointments" in result)) {
          throw new Error("Unable to load appointment window.");
        }

        if (!cancelled) {
          setData(result);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setData(null);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [dateKey, view]);

  return { data, status };
}

function AppointmentSectionPanel({
  appointments,
  section
}: {
  appointments: LiveAppointment[];
  section: AppointmentConsoleSection;
}) {
  const sectionConfig = {
    planning: {
      title: "Capacity Planning",
      description: "Live appointment demand, open drafts, resource holds, and schedule readiness signals.",
      action: "Open Schedule Board",
      href: "/appointments?view=board#resources"
    },
    operations: {
      title: "Appointment Operations",
      description: "Day-of movement, arrivals, check-in handoffs, and appointments ready for action.",
      action: "Open Operations Board",
      href: "/appointments?view=board#operations"
    },
    "follow-up": {
      title: "Follow-up Queue",
      description: "Appointments needing confirmation, reschedule, callback, no-show recovery, or customer contact.",
      action: "Open Follow-up Board",
      href: "/appointments?view=board#follow-up"
    },
    intelligence: {
      title: "Appointment Intelligence",
      description: "Readable operating signals pulled from appointment status, blocked work, and resource reservations.",
      action: "Open Reports",
      href: "/appointments?view=board#reports"
    },
    exceptions: {
      title: "Exceptions",
      description: "Drafts, no-shows, blocked appointments, and resource issues that need manager or advisor attention.",
      action: "Open Exception Board",
      href: "/appointments?view=board#exceptions"
    }
  } satisfies Record<Exclude<AppointmentConsoleSection, "today">, { title: string; description: string; action: string; href: string }>;

  if (section === "today") return null;

  const config = sectionConfig[section];
  const filtered = appointments.filter((appointment) => {
    if (section === "follow-up") return needsConfirmation(appointment) || needsFollowUp(appointment);
    if (section === "exceptions") return hasException(appointment);
    if (section === "operations") return appointment.attendanceStatus !== "COMPLETED";
    if (section === "planning") return appointment.bookingStatus === "DRAFT" || appointment.resourceReservations.length > 0;
    return true;
  });

  return (
    <section className="appointment-panel appointment-live-section">
      <header>
        <div>
          <strong>{config.title}</strong>
          <p>{config.description}</p>
        </div>
        <Link href={config.href}>{config.action}</Link>
      </header>
      {filtered.length > 0 ? (
        <div className="appointment-live-section-list">
          {filtered.slice(0, 8).map((appointment) => (
            <article key={appointment.id}>
              <span>{formatTime(appointment.startsAt)}</span>
              <div>
                <strong>{appointment.customer?.displayName ?? appointment.title}</strong>
                <small>{appointment.title} · {vehicleLabel(appointment)}</small>
              </div>
              <Link href={boardFocusHref(appointment)}>Open</Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="appointment-section-empty">No live appointment records need attention in this section right now.</p>
      )}
    </section>
  );
}

export function AppointmentConsoleTodayFlow({ section = "today" }: { section?: string }) {
  const normalizedSection = ["planning", "operations", "follow-up", "intelligence", "exceptions"].includes(section)
    ? section as AppointmentConsoleSection
    : "today";
  const { data, status } = useAppointmentConsoleData();
  const liveAppointments = data?.appointments ?? [];
  const arrivalCount = liveAppointments.length || kpis[0].value;
  const waitingConfirmation = liveAppointments.filter(needsConfirmation).length;
  const followUpCount = liveAppointments.filter(needsFollowUp).length;
  const exceptionCount = liveAppointments.filter(hasException).length;
  const liveKpis = [
    { ...kpis[0], value: String(arrivalCount), detail: status === "ready" ? "Live" : kpis[0].detail },
    kpis[1],
    { ...kpis[2], value: String(status === "ready" ? waitingConfirmation : kpis[2].value), detail: status === "ready" ? "Live" : kpis[2].detail },
    { ...kpis[3], value: String(status === "ready" ? followUpCount : kpis[3].value), detail: status === "ready" ? "Live" : kpis[3].detail },
    { ...kpis[4], value: String(status === "ready" ? exceptionCount : kpis[4].value), detail: status === "ready" ? "Live" : kpis[4].detail }
  ];

  return (
    <AppointmentConsoleShell>
      <main className="appointment-console-home">
        <header className="appointment-console-hero">
          <div>
            <h1>Appointment Console</h1>
            <p>Know who is coming, whether we can take them, and what needs action next.</p>
          </div>
          <nav aria-label="Appointment console primary actions">
            <Link className="primary" href="/appointments?action=new">+ New Appointment</Link>
            <Link href="/appointments?section=planning">Check Capacity</Link>
            <Link href="/customers">Find Customer</Link>
          </nav>
        </header>

        <div className="appointment-console-tabs">
          <Link className={normalizedSection === "today" ? "active" : ""} href="/appointments">Today Flow</Link>
          <Link href="/appointments?view=board">Schedule Board</Link>
          <Link className={normalizedSection === "planning" ? "active" : ""} href="/appointments?section=planning">Capacity</Link>
          <Link className={normalizedSection === "follow-up" ? "active" : ""} href="/appointments?section=follow-up">Follow-ups</Link>
          <Link className={normalizedSection === "exceptions" ? "active" : ""} href="/appointments?section=exceptions">Exceptions</Link>
          <Link href="/appointments?view=board#advanced">Advanced</Link>
        </div>

        <section className="appointment-console-kpis" aria-label="Appointment snapshot">
          {liveKpis.map(({ detail, icon: Icon, label, tone, value }) => (
            <article className={tone} key={label}>
              <Icon />
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>

        {normalizedSection !== "today" ? <AppointmentSectionPanel appointments={liveAppointments} section={normalizedSection} /> : null}

        <div className="appointment-console-grid">
          <section className="appointment-panel appointment-today-flow">
            <header>
              <strong>Today Flow</strong>
              <Link href="/appointments?section=operations">View all</Link>
            </header>
            {status === "ready" && liveAppointments.length > 0 ? (
              <div className="appointment-flow-group blue">
                <h3>Live Appointments <b>{liveAppointments.length}</b></h3>
                <table>
                  <thead><tr><th>Time</th><th>Customer</th><th>Purpose</th><th>Vehicle</th><th>Owner</th><th>Action</th></tr></thead>
                  <tbody>
                    {liveAppointments.slice(0, 9).map((appointment) => (
                      <tr key={appointment.id}>
                        <td>{formatTime(appointment.startsAt)}</td>
                        <td>{appointment.customer?.displayName ?? "No customer"}</td>
                        <td>{appointment.title}</td>
                        <td>{vehicleLabel(appointment)}</td>
                        <td>{appointment.owner?.name ?? "Unassigned"}</td>
                        <td><Link href={boardFocusHref(appointment)}>{needsConfirmation(appointment) ? "Confirm" : appointment.attendanceStatus === "CHECKED_IN" ? "Open" : "Review"}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : todayFlowGroups.map((group) => (
              <div className={`appointment-flow-group ${group.tone}`} key={group.label}>
                <h3>{group.label} <b>{group.count}</b></h3>
                <table>
                  <thead><tr><th>Time</th><th>Customer</th><th>Purpose</th><th>Vehicle</th><th>Advisor</th><th>Action</th></tr></thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={`${group.label}-${row[0]}-${row[1]}`}>
                        {row.slice(0, 5).map((cell) => <td key={cell}>{cell}</td>)}
                        <td><Link href={row[5] === "Check In" ? "/vehicles/repair-orders?intakeSource=APPOINTMENT" : "/appointments?section=follow-up"}>{row[5]}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>

          <aside className="appointment-panel appointment-capacity-confidence">
            <header>
              <strong>Capacity Confidence</strong>
              <small>Updated just now</small>
            </header>
            <b className="capacity-pill">Accept with constraints</b>
            <p>We can take more appointments with some planning.</p>
            <div className="capacity-donut"><strong>68%</strong><span>Promise Confidence</span></div>
            <dl>
              <div><dt>Bay Availability</dt><dd>3.5 hrs <span>Good</span></dd></div>
              <div><dt>Staff Coverage</dt><dd>92% <span>Good</span></dd></div>
              <div><dt>Shop Load</dt><dd>78% <em>Moderate</em></dd></div>
              <div><dt>Promise Confidence</dt><dd>68% <em>Accept with constraints</em></dd></div>
            </dl>
            <footer>
              <span><strong>Recommended Next Action</strong>Accept up to 3.0 additional hours today.</span>
              <Link href="/appointments?section=planning">Check Capacity</Link>
            </footer>
          </aside>
        </div>

        <section className="appointment-console-lower">
          {[
            ["Confirmation Queue", "7", "Jennifer Martinez", "A/C Performance", "Confirm All"],
            ["Follow-up Scheduling", "5", "Brian Thompson", "Estimate Review", "Schedule Follow-ups"],
            ["Exceptions / Manager Review", "2", "Overbooked Appointment", "Staffing Gap", "Review Exceptions"]
          ].map(([title, count, first, second, action]) => (
            <article className="appointment-panel" key={title}>
              <header><strong>{title} <b>{count}</b></strong><Link href="/appointments?view=board">View all</Link></header>
              <p><span>{first}</span><small>{second}</small></p>
              <Link className="panel-action" href="/appointments?view=board">{action}</Link>
            </article>
          ))}
        </section>
      </main>
    </AppointmentConsoleShell>
  );
}

const calendarRows = [
  { top: 65, height: 58, label: "9:00 AM – 10:00 AM", title: "Oil Change", tone: "blue", owner: "Mike R." },
  { top: 158, height: 58, label: "10:30 AM – 11:30 AM", title: "Customer Issue", tone: "purple", owner: "Sarah J." },
  { top: 348, height: 58, label: "1:00 PM – 2:00 PM", title: "Test Drive", tone: "green", owner: "Alex P." }
];

function LegacyAppointmentConsoleNewAppointment() {
  return (
    <AppointmentConsoleShell>
      <main className="appointment-new-calendar">
        <header className="appointment-new-header">
          <div>
            <h1>New Appointment</h1>
            <p>Choose a date and time, then add customer, vehicle, and purpose.</p>
          </div>
          <Link href="/appointments">Back to Appointment Console</Link>
        </header>

        <div className="appointment-new-layout">
          <aside className="appointment-booking-rail">
            <section className="mini-calendar">
              <header><ChevronLeft /><strong>May 2025</strong><ChevronRight /></header>
              <div className="weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="days">{["27","28","29","30","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"].map((day, index) => <button className={day === "14" ? "selected" : index < 4 ? "muted" : ""} key={`${day}-${index}`}>{day}</button>)}</div>
            </section>
            <section className="appointment-setup">
              <h2>Appointment Setup</h2>
              {[
                ["Customer / Vehicle", "Search by name, phone, or VIN"],
                ["Purpose", "Service / Repair"],
                ["Duration", "60 min"],
                ["Advisor / Owner", "Any Advisor"],
                ["Transportation", "Customer Drive"],
                ["Status", "Confirmed"]
              ].map(([label, value]) => (
                <label key={label}>
                  <span>{label}</span>
                  <input readOnly value={value} />
                </label>
              ))}
              <div className="setup-capacity">
                <strong>Capacity: Good</strong>
                <p><span>Service Bays</span><b>6 available</b></p>
                <p><span>Staff</span><b>7 available</b></p>
                <p><span>Shop Load</span><b>62%</b></p>
              </div>
            </section>
          </aside>

          <section className="appointment-calendar-surface">
            <header>
              <div><button className="active">Day</button><button>Week</button><button>Month</button></div>
              <nav><button>Today</button><button>‹</button><button>›</button></nav>
              <strong>Wednesday, May 14, 2025</strong>
            </header>
            <div className="calendar-stage">
              {["8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM","4 PM","5 PM","6 PM"].map((hour) => <span className="time-label" key={hour}>{hour}</span>)}
              <div className="availability good top" />
              <div className="availability constrained mid" />
              <div className="availability good lower" />
              <div className="availability constrained bottom" />
              {calendarRows.map((event) => (
                <article className={`calendar-event ${event.tone}`} key={event.label} style={{ top: event.top, height: event.height }}>
                  <span>{event.label}</span>
                  <strong>{event.title}</strong>
                  <small>{event.owner}</small>
                </article>
              ))}
              <button className="selected-slot">2:30 PM – 3:30 PM</button>
            </div>
          </section>

          <aside className="appointment-summary">
            <section className="appointment-panel">
              <header><strong>Appointment Summary</strong><b>Recommended</b></header>
              <dl>
                <div><dt>Date & Time</dt><dd>Wed, May 14, 2025<br /><strong>2:30 PM – 3:30 PM</strong></dd></div>
                <div><dt>Purpose</dt><dd>Service / Repair</dd></div>
                <div><dt>Duration</dt><dd>60 min</dd></div>
                <div><dt>Customer / Vehicle</dt><dd>No customer selected</dd></div>
                <div><dt>Advisor / Owner</dt><dd>Any Advisor</dd></div>
                <div><dt>Transportation</dt><dd>Customer Drive</dd></div>
              </dl>
              <h3>Readiness Checklist</h3>
              {["Advisor available", "Service bay available", "No staff conflicts", "Within operating hours"].map((item) => <p className="ready" key={item}>✓ {item}</p>)}
              <footer><button>Save Draft</button><button className="primary">Create Appointment</button></footer>
            </section>
            <section className="appointment-panel advanced-links">
              <strong>Advanced</strong>
              <Link href="/appointments?section=planning">Check more capacity</Link>
              <Link href="/appointments?view=board#conflicts">Staff conflicts</Link>
              <Link href="/appointments?view=board#resources">Resource details</Link>
              <Link href="/manager-review?scope=appointments">Manager review</Link>
            </section>
          </aside>
        </div>
      </main>
    </AppointmentConsoleShell>
  );
}

export function AppointmentConsoleNewAppointment() {
  const [selectedPurposeCode, setSelectedPurposeCode] = useState<(typeof purposeOptions)[number]["value"]>("CUSTOMER_ISSUE");
  const selectedPurpose = purposeOptions.find((purpose) => purpose.value === selectedPurposeCode) ?? purposeOptions[0];
  const [form, setForm] = useState({
    customer: "",
    vehicle: "",
    localDate: todayDateKey(),
    startTime: "14:30",
    durationMinutes: selectedPurpose.duration,
    advisor: "Any Advisor",
    transportation: "Customer Drive",
    reason: ""
  });
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day");
  const [notice, setNotice] = useState("Ready to create an audited appointment draft.");
  const [isSaving, setIsSaving] = useState(false);
  const [createdAppointmentNumber, setCreatedAppointmentNumber] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [identityResults, setIdentityResults] = useState<AppointmentIdentitySearchResponse>({ customers: [], vehicles: [] });
  const [identityStatus, setIdentityStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [selectedCustomer, setSelectedCustomer] = useState<AppointmentIdentityCustomer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<AppointmentIdentityVehicle | null>(null);
  const appointmentWindow = useAppointmentWindow(form.localDate, calendarView);
  const startsAtIso = useMemo(() => localDateTimeToIso(form.localDate, form.startTime), [form.localDate, form.startTime]);
  const endsAtIso = useMemo(() => addMinutesToIso(startsAtIso, form.durationMinutes), [startsAtIso, form.durationMinutes]);
  const monthCells = useMemo(() => buildMonthCells(form.localDate), [form.localDate]);
  const visibleAppointments = appointmentWindow.data?.appointments ?? [];
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart(form.localDate), index)), [form.localDate]);
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, LiveAppointment[]>();

    for (const appointment of visibleAppointments) {
      const dateKey = appointmentDateKey(appointment);
      if (!dateKey) continue;
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), appointment]);
    }

    return grouped;
  }, [visibleAppointments]);
  const appointmentDateLabel = useMemo(() => new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: defaultTimezone
  }).format(new Date(`${form.localDate}T12:00:00`)), [form.localDate]);

  function updateField(field: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    const query = (customerQuery || vehicleQuery).trim();

    if (query.length < 2) {
      setIdentityResults({ customers: [], vehicles: [] });
      setIdentityStatus("idle");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      async function searchIdentities() {
        setIdentityStatus("loading");

        try {
          const response = await fetch(`/api/appointments/identity-search?query=${encodeURIComponent(query)}`);
          const result = await response.json().catch(() => null) as AppointmentIdentitySearchResponse | { error?: string } | null;

          if (!response.ok || !result || !("customers" in result)) {
            throw new Error("Identity search unavailable.");
          }

          if (!cancelled) {
            setIdentityResults(result);
            setIdentityStatus("ready");
          }
        } catch {
          if (!cancelled) {
            setIdentityResults({ customers: [], vehicles: [] });
            setIdentityStatus("unavailable");
          }
        }
      }

      void searchIdentities();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [customerQuery, vehicleQuery]);

  function chooseCustomer(customer: AppointmentIdentityCustomer) {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.displayName);
    updateField("customer", customer.displayName);
    setNotice(`Selected canonical customer ${customer.displayName}.`);
  }

  function chooseVehicle(vehicle: AppointmentIdentityVehicle) {
    const label = identityVehicleLabel(vehicle);
    setSelectedVehicle(vehicle);
    setVehicleQuery(label);
    updateField("vehicle", label);
    setNotice(`Selected canonical vehicle ${label}.`);
  }

  function changePurpose(value: string) {
    const purpose = purposeOptions.find((option) => option.value === value) ?? purposeOptions[0];
    setSelectedPurposeCode(purpose.value);
    setForm((current) => ({
      ...current,
      durationMinutes: purpose.duration,
      reason: current.reason || purpose.label
    }));
  }

  function goToToday() {
    setCalendarView("day");
    updateField("localDate", todayDateKey());
    setNotice("Showing today's live appointment window.");
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.reason.trim()) {
      setNotice("Please document the appointment reason before creating it.");
      return;
    }

    setIsSaving(true);
    setNotice("Creating appointment through the appointment command ledger...");

    try {
      const appointmentNumber = createAppointmentNumber();
      const idempotencyKey = `appointment-console-draft-${appointmentNumber}`;
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commandType: "CREATE_DRAFT",
          organizationId: defaultOrganizationId,
          locationId: defaultLocationId,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            appointmentNumber,
            title: selectedPurpose.label,
            sourceType: "MANUAL",
            sourceReference: form.reason.trim(),
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            schedulingTimezone: defaultTimezone,
            purposeSnapshot: {
              code: selectedPurpose.value,
              category: selectedPurpose.category,
              categoryLabel: selectedPurpose.label,
              reason: form.reason.trim(),
              transportation: form.transportation
            },
            customerSnapshot: form.customer.trim()
              ? {
                  customerId: selectedCustomer?.id ?? null,
                  customerNumber: selectedCustomer?.customerNumber ?? null,
                  displayName: form.customer.trim(),
                  email: selectedCustomer?.email ?? null,
                  phoneNumber: selectedCustomer?.phoneNumber ?? null
                }
              : null,
            vehicleSnapshot: form.vehicle.trim()
              ? {
                  vehicleId: selectedVehicle?.id ?? null,
                  displayName: form.vehicle.trim(),
                  vehicleNumber: selectedVehicle?.vehicleNumber ?? form.vehicle.trim(),
                  vin: selectedVehicle?.vin ?? null,
                  stockNumber: selectedVehicle?.stockNumber ?? null,
                  licensePlate: selectedVehicle?.licensePlate ?? null
                }
              : null
          }
        })
      });
      const result = await response.json().catch(() => null) as { accepted?: boolean; error?: string } | null;

      if (!response.ok || !result?.accepted) {
        throw new Error(result?.error ?? "Unable to create the appointment.");
      }

      setCreatedAppointmentNumber(appointmentNumber);
      setNotice(`Appointment ${appointmentNumber} was created. Open it in the Schedule Board to review, schedule, or adjust resources.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create the appointment right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppointmentConsoleShell>
      <form className="appointment-new-calendar" onSubmit={(event) => void createAppointment(event)}>
        <header className="appointment-new-header">
          <div>
            <h1>New Appointment</h1>
            <p>Choose a date and time, then add customer, vehicle, and purpose.</p>
          </div>
          <Link href="/appointments">Back to Appointment Console</Link>
        </header>

        <div className="appointment-new-layout">
          <aside className="appointment-booking-rail">
            <section className="mini-calendar">
              <header>
                <button aria-label="Previous month" onClick={() => updateField("localDate", addMonths(form.localDate, -1))} type="button"><ChevronLeft /></button>
                <strong>{monthLabel(form.localDate)}</strong>
                <button aria-label="Next month" onClick={() => updateField("localDate", addMonths(form.localDate, 1))} type="button"><ChevronRight /></button>
              </header>
              <div className="weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="days">{monthCells.map((cell) => <button className={[cell.selected ? "selected" : "", cell.muted ? "muted" : ""].filter(Boolean).join(" ")} key={cell.dateKey} onClick={() => updateField("localDate", cell.dateKey)} type="button">{cell.day}</button>)}</div>
            </section>
            <section className="appointment-setup">
              <h2>Appointment Setup</h2>
              <label>
                <span>Customer search</span>
                <input onChange={(event) => { setSelectedCustomer(null); setCustomerQuery(event.target.value); updateField("customer", event.target.value); }} placeholder="Search name, phone, email, or customer #" value={customerQuery} />
              </label>
              {customerQuery.trim().length >= 2 ? (
                <div className="appointment-identity-results">
                  {identityResults.customers.length > 0 ? identityResults.customers.map((customer) => (
                    <button className={selectedCustomer?.id === customer.id ? "selected" : ""} key={customer.id} onClick={() => chooseCustomer(customer)} type="button">
                      <UserRound />
                      <span><strong>{customer.displayName}</strong><small>{customer.phoneNumber ?? customer.email ?? customer.customerNumber ?? "Canonical customer"}</small></span>
                    </button>
                  )) : <p>{identityStatus === "loading" ? "Searching customers..." : "No matching customer found. Typed customer name will be preserved as draft context."}</p>}
                </div>
              ) : null}
              <label>
                <span>Vehicle search</span>
                <input onChange={(event) => { setSelectedVehicle(null); setVehicleQuery(event.target.value); updateField("vehicle", event.target.value); }} placeholder="VIN, stock #, plate, or vehicle" value={vehicleQuery} />
              </label>
              {vehicleQuery.trim().length >= 2 ? (
                <div className="appointment-identity-results">
                  {identityResults.vehicles.length > 0 ? identityResults.vehicles.map((vehicle) => (
                    <button className={selectedVehicle?.id === vehicle.id ? "selected" : ""} key={vehicle.id} onClick={() => chooseVehicle(vehicle)} type="button">
                      <CalendarDays />
                      <span><strong>{identityVehicleLabel(vehicle)}</strong><small>{vehicle.vin ?? vehicle.licensePlate ?? vehicle.stockNumber ?? vehicle.vehicleNumber}</small></span>
                    </button>
                  )) : <p>{identityStatus === "loading" ? "Searching vehicles..." : "No matching vehicle found. Typed vehicle details will be preserved as draft context."}</p>}
                </div>
              ) : null}
              <label>
                <span>Purpose</span>
                <select onChange={(event) => changePurpose(event.target.value)} value={selectedPurposeCode}>
                  {purposeOptions.map((purpose) => <option key={purpose.value} value={purpose.value}>{purpose.label}</option>)}
                </select>
              </label>
              <label>
                <span>Date</span>
                <input onChange={(event) => updateField("localDate", event.target.value)} type="date" value={form.localDate} />
              </label>
              <label>
                <span>Start time</span>
                <input onChange={(event) => updateField("startTime", event.target.value)} type="time" value={form.startTime} />
              </label>
              <label>
                <span>Duration</span>
                <select onChange={(event) => updateField("durationMinutes", Number(event.target.value))} value={form.durationMinutes}>
                  {[30, 45, 60, 75, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} min</option>)}
                </select>
              </label>
              <label>
                <span>Reason / notes</span>
                <textarea onChange={(event) => updateField("reason", event.target.value)} placeholder="Example: customer called about title paperwork, daily rental, repair status, sales visit, payment, or another issue." value={form.reason} />
              </label>
              <div className="setup-capacity">
                <strong>Capacity: check before committing</strong>
                <p><span>Purpose type</span><b>{selectedPurpose.category}</b></p>
                <p><span>Duration</span><b>{form.durationMinutes} min</b></p>
                <p><span>Deep check</span><b>Board ready</b></p>
              </div>
            </section>
          </aside>

          <section className="appointment-calendar-surface">
            <header>
              <div>{(["day", "week", "month"] as const).map((view) => <button className={calendarView === view ? "active" : ""} key={view} onClick={() => setCalendarView(view)} type="button">{view[0].toUpperCase() + view.slice(1)}</button>)}</div>
              <nav>
                <button onClick={goToToday} type="button">Today</button>
                <button onClick={() => updateField("localDate", calendarView === "month" ? addMonths(form.localDate, -1) : addDays(form.localDate, calendarView === "week" ? -7 : -1))} type="button">‹</button>
                <button onClick={() => updateField("localDate", calendarView === "month" ? addMonths(form.localDate, 1) : addDays(form.localDate, calendarView === "week" ? 7 : 1))} type="button">›</button>
              </nav>
              <strong>{calendarView === "month" ? monthLabel(form.localDate) : calendarView === "week" ? `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: defaultTimezone }).format(noonDate(weekStart(form.localDate)))}` : appointmentDateLabel}</strong>
            </header>
            {calendarView === "day" ? (
              <div className="calendar-stage">
                {["8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM","4 PM","5 PM","6 PM"].map((hour) => <span className="time-label" key={hour}>{hour}</span>)}
                <div className="availability good top" />
                <div className="availability constrained mid" />
                <div className="availability good lower" />
                <div className="availability constrained bottom" />
                {visibleAppointments.map((appointment) => (
                  <Link className="calendar-event blue" href={boardFocusHref(appointment)} key={appointment.id} style={{ top: appointmentTop(appointment), height: 58 }}>
                    <span>{formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}</span>
                    <strong>{appointment.title}</strong>
                    <small>{appointment.customer?.displayName ?? appointment.owner?.name ?? "Unassigned"}</small>
                  </Link>
                ))}
                <button className="selected-slot" type="button">{formatTime(startsAtIso)} - {formatTime(endsAtIso)}</button>
              </div>
            ) : calendarView === "week" ? (
              <div className="appointment-week-view">
                {weekDays.map((dateKey) => {
                  const dayAppointments = appointmentsByDate.get(dateKey) ?? [];

                  return (
                    <section className={dateKey === form.localDate ? "active" : ""} key={dateKey}>
                      <button onClick={() => updateField("localDate", dateKey)} type="button">
                        <span>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: defaultTimezone }).format(noonDate(dateKey))}</span>
                        <strong>{new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: defaultTimezone }).format(noonDate(dateKey))}</strong>
                      </button>
                      {dayAppointments.length > 0 ? dayAppointments.slice(0, 4).map((appointment) => (
                        <Link href={boardFocusHref(appointment)} key={appointment.id}>
                          <span>{formatTime(appointment.startsAt)}</span>
                          <strong>{appointment.title}</strong>
                          <small>{appointment.customer?.displayName ?? "No customer"}</small>
                        </Link>
                      )) : <p>No appointments</p>}
                    </section>
                  );
                })}
              </div>
            ) : calendarView === "month" ? (
              <div className="appointment-month-view">
                {monthCells.map((cell) => {
                  const dayAppointments = appointmentsByDate.get(cell.dateKey) ?? [];

                  return (
                    <button className={[cell.selected ? "selected" : "", cell.muted ? "muted" : ""].filter(Boolean).join(" ")} key={cell.dateKey} onClick={() => updateField("localDate", cell.dateKey)} type="button">
                      <span>{cell.day}</span>
                      {dayAppointments.length > 0 ? <strong>{dayAppointments.length}</strong> : null}
                      {dayAppointments.slice(0, 2).map((appointment) => <small key={appointment.id}>{appointment.title}</small>)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="appointment-window-list">
                <header><strong>{appointmentWindow.status === "loading" ? "Loading live schedule..." : `${visibleAppointments.length} appointment${visibleAppointments.length === 1 ? "" : "s"} in this ${calendarView}`}</strong><span>Powered by appointment read model</span></header>
                {visibleAppointments.length > 0 ? visibleAppointments.slice(0, 12).map((appointment) => (
                  <Link href={boardFocusHref(appointment)} key={appointment.id}>
                    <span>{formatTime(appointment.startsAt)}</span>
                    <strong>{appointment.title}</strong>
                    <small>{appointment.customer?.displayName ?? "No customer"} · {vehicleLabel(appointment)}</small>
                  </Link>
                )) : <p>{appointmentWindow.status === "unavailable" ? "Appointment schedule is unavailable right now." : "No appointments found in this window."}</p>}
              </div>
            )}
          </section>

          <aside className="appointment-summary">
            <section className="appointment-panel">
              <header><strong>Appointment Summary</strong><b>Recommended</b></header>
              <dl>
                <div><dt>Date & Time</dt><dd>{appointmentDateLabel}<br /><strong>{formatTime(startsAtIso)} - {formatTime(endsAtIso)}</strong></dd></div>
                <div><dt>Purpose</dt><dd>{selectedPurpose.label}</dd></div>
                <div><dt>Duration</dt><dd>{form.durationMinutes} min</dd></div>
                <div><dt>Customer / Vehicle</dt><dd>{form.customer || "No customer selected"}<br />{form.vehicle || "No vehicle selected"}</dd></div>
                <div><dt>Advisor / Owner</dt><dd>{form.advisor}</dd></div>
                <div><dt>Transportation</dt><dd>{form.transportation}</dd></div>
              </dl>
              <h3>Readiness Checklist</h3>
              {["Purpose selected", "Time window selected", "Reason documented", "Canonical command will create the appointment draft"].map((item) => <p className="ready" key={item}>✓ {item}</p>)}
              <p className="appointment-command-notice">{notice}</p>
              <footer>
                {createdAppointmentNumber ? <Link href={`/appointments?view=board&appointment=${encodeURIComponent(createdAppointmentNumber)}`}>Open in Board</Link> : <button type="button">Save Draft</button>}
                <button className="primary" disabled={isSaving} type="submit">{isSaving ? "Creating..." : "Create Appointment"}</button>
              </footer>
            </section>
            <section className="appointment-panel advanced-links">
              <strong>Advanced</strong>
              <Link href="/appointments?section=planning">Check more capacity</Link>
              <Link href="/appointments?view=board#conflicts">Staff conflicts</Link>
              <Link href="/appointments?view=board#resources">Resource details</Link>
              <Link href="/manager-review?scope=appointments">Manager review</Link>
            </section>
          </aside>
        </div>
      </form>
    </AppointmentConsoleShell>
  );
}
