"use client";

import {
  Bell,
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  FileText,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AppointmentCategory =
  | "sales"
  | "service"
  | "delivery"
  | "customer"
  | "dmv"
  | "collections"
  | "inventory"
  | "marketing"
  | "general";

type AppointmentStatus =
  | "draft"
  | "confirmed"
  | "checked-in"
  | "in-progress"
  | "no-show"
  | "follow-up";

type OperationalCommand = "CHECK_IN" | "NO_SHOW" | "SCHEDULE";

type AppointmentBoardDataSource = "preview" | "live";

type DraftAppointmentForm = {
  category: AppointmentCategory;
  title: string;
  customer: string;
  vehicle: string;
  localDate: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

type Appointment = {
  id: string;
  recordId?: string;
  recordVersion?: number;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  schedulingTimezone?: string;
  dataSource?: AppointmentBoardDataSource;
  title: string;
  customer: string;
  vehicle: string;
  category: AppointmentCategory;
  status: AppointmentStatus;
  staffId: string;
  staffName?: string;
  staffRole?: string;
  startMinutes: number;
  durationMinutes: number;
  phone: string;
  complaint: string;
  location: string;
  confirmation: string;
  conflict?: boolean;
  needsFollowUp?: boolean;
  taskAutomation: string[];
  governanceNotes: string[];
};

type AppointmentReadModel = {
  id: string;
  appointmentNumber: string;
  title: string;
  sourceReference: string | null;
  schedulingTimezone: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
  confirmationStatus: string;
  attendanceStatus: string;
  executionStatus: string;
  version: number;
  owner: {
    id: string;
    name: string;
    email?: string;
  } | null;
  customer: {
    displayName: string;
    phoneNumber: string | null;
  } | null;
  vehicles: Array<{
    vehicleNumber: string;
    stockNumber: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    vin: string | null;
    roleCode: string;
    isPrimary: boolean;
  }>;
  taskLinks: Array<{
    taskId: string;
    linkType: string;
    blocksAppointment: boolean;
    appointmentRequiredForTask: boolean;
  }>;
  visibility: {
    canMutate: boolean;
    relationship: string;
  };
  followUpDispositionCode: string | null;
};

type AppointmentReadApiResult = {
  date: string;
  appointmentCount: number;
  appointments: AppointmentReadModel[];
};

type ViewMode = "day" | "week" | "month" | "agenda";

const businessDate = "Monday, July 6, 2026";
const businessHours = "9:00 AM - 6:00 PM";
const dealershipAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
const dealershipPhone = "(612) 724-3631";
const defaultBoardDate = "2026-07-06";
const defaultOrganizationId = "org-time-motor-sales";
const defaultLocationId = "loc-time-motor-sales-minneapolis";
const defaultTimezone = "America/Chicago";

const staffMembers: StaffMember[] = [
  { id: "abdi", name: "Abdi Farah", role: "General Manager", initials: "AF" },
  { id: "brock", name: "Brock Peterson", role: "Service Advisor", initials: "BP" },
  { id: "walter", name: "Walter James", role: "Sales Manager", initials: "WJ" },
  { id: "mohamed", name: "Mohamed Ali", role: "Salesperson", initials: "MA" },
  { id: "rayana", name: "Rayana Hassan", role: "Office / Admin", initials: "RH" }
];

const categoryMeta: Record<AppointmentCategory, { label: string; className: string }> = {
  sales: { label: "Sales / Test Drive", className: "appointment-kind-sales" },
  service: { label: "Service / Repair", className: "appointment-kind-service" },
  delivery: { label: "Vehicle Delivery", className: "appointment-kind-delivery" },
  customer: { label: "Customer Issue", className: "appointment-kind-customer" },
  dmv: { label: "Documentation / DMV", className: "appointment-kind-dmv" },
  collections: { label: "Collections / Payment", className: "appointment-kind-collections" },
  inventory: { label: "Inventory / Vendor", className: "appointment-kind-inventory" },
  marketing: { label: "Marketing / Listing", className: "appointment-kind-marketing" },
  general: { label: "Other / General", className: "appointment-kind-general" }
};

const appointments: Appointment[] = [
  {
    id: "APT-10245",
    title: "Service / Repair",
    customer: "Abdi Hussein",
    vehicle: "2014 Ford Taurus",
    category: "service",
    status: "confirmed",
    staffId: "brock",
    startMinutes: 540,
    durationMinutes: 75,
    phone: "(612) 555-0147",
    complaint: "Brake noise when stopping.",
    location: "Service counter",
    confirmation: "Confirmed by phone",
    taskAutomation: ["Intake & Inspection", "Diagnostics", "Estimate & Approval"],
    governanceNotes: ["Manager can override timing.", "Owner can update appointment notes."]
  },
  {
    id: "APT-10246",
    title: "Test Drive",
    customer: "Ahmed Ibrahim",
    vehicle: "2018 Toyota Camry",
    category: "sales",
    status: "confirmed",
    staffId: "abdi",
    startMinutes: 545,
    durationMinutes: 65,
    phone: "(612) 555-0102",
    complaint: "Wants financing options ready before arrival.",
    location: "Showroom",
    confirmation: "SMS confirmed",
    taskAutomation: ["Pull vehicle", "Prepare buyer profile", "Attach lead source"],
    governanceNotes: ["Conflict warning enabled.", "Customer data stays on board."]
  },
  {
    id: "APT-10247",
    title: "Title / Registration",
    customer: "Amina Said",
    vehicle: "Registration",
    category: "dmv",
    status: "follow-up",
    staffId: "rayana",
    startMinutes: 545,
    durationMinutes: 80,
    phone: "(612) 555-0191",
    complaint: "Needs title transfer paperwork reviewed.",
    location: "Office desk",
    confirmation: "Walk-in hold",
    needsFollowUp: true,
    taskAutomation: ["Document review", "Title checklist", "Customer signature"],
    governanceNotes: ["Reason required for document changes.", "Admin task template attached."]
  },
  {
    id: "APT-10248",
    title: "Test Drive",
    customer: "Mohamed Duale",
    vehicle: "2020 Honda Accord",
    category: "sales",
    status: "confirmed",
    staffId: "walter",
    startMinutes: 570,
    durationMinutes: 75,
    phone: "(612) 555-0173",
    complaint: "Compare Accord and Camry payments.",
    location: "Sales floor",
    confirmation: "Confirmed by staff",
    conflict: true,
    taskAutomation: ["Vehicle hold", "Trade appraisal prompt"],
    governanceNotes: ["Conflict warning: sales floor overlap.", "Manager review if moved."]
  },
  {
    id: "APT-10249",
    title: "Service / Repair",
    customer: "Khalid Mohamud",
    vehicle: "Brake Inspection",
    category: "service",
    status: "in-progress",
    staffId: "brock",
    startMinutes: 600,
    durationMinutes: 75,
    phone: "(612) 555-0115",
    complaint: "Soft brake pedal.",
    location: "Service counter",
    confirmation: "Checked in",
    taskAutomation: ["Open inspection", "Assign technician", "Estimate due"],
    governanceNotes: ["Status reason recorded.", "Linked to repair workflow."]
  },
  {
    id: "APT-10250",
    title: "Vehicle Delivery",
    customer: "Farah Abdi",
    vehicle: "2021 Toyota RAV4",
    category: "delivery",
    status: "checked-in",
    staffId: "mohamed",
    startMinutes: 630,
    durationMinutes: 75,
    phone: "(612) 555-0122",
    complaint: "Final paperwork and keys.",
    location: "Delivery bay",
    confirmation: "Customer arrived",
    taskAutomation: ["Detail & fuel", "Delivery checklist", "Warranty packet"],
    governanceNotes: ["Delivery checklist required.", "Owner/staff changes audited."]
  },
  {
    id: "APT-10251",
    title: "Title / DMV",
    customer: "Said Mohamed",
    vehicle: "Paperwork",
    category: "dmv",
    status: "follow-up",
    staffId: "abdi",
    startMinutes: 660,
    durationMinutes: 70,
    phone: "(612) 555-0150",
    complaint: "Needs missing buyer documents.",
    location: "Manager office",
    confirmation: "Needs follow-up",
    needsFollowUp: true,
    taskAutomation: ["Missing docs alert", "Customer call task"],
    governanceNotes: ["Follow-up reason required.", "Document status visible only on board."]
  },
  {
    id: "APT-10252",
    title: "DMV / Plates",
    customer: "Mustafa Ali",
    vehicle: "New Plates",
    category: "dmv",
    status: "confirmed",
    staffId: "rayana",
    startMinutes: 690,
    durationMinutes: 75,
    phone: "(612) 555-0180",
    complaint: "Plate pickup and registration copy.",
    location: "Office desk",
    confirmation: "Confirmed",
    taskAutomation: ["Plate release checklist", "Scan registration"],
    governanceNotes: ["Admin owns appointment.", "Changes require reason."]
  },
  {
    id: "APT-10253",
    title: "Sales Meeting",
    customer: "Team Meeting",
    vehicle: "Sales Floor",
    category: "sales",
    status: "confirmed",
    staffId: "walter",
    startMinutes: 720,
    durationMinutes: 65,
    phone: dealershipPhone,
    complaint: "Pipeline, test drives, and follow-ups.",
    location: "Sales floor",
    confirmation: "Internal",
    taskAutomation: ["Pipeline review", "Assign call blocks"],
    governanceNotes: ["Internal appointment allowed.", "Conflicts warn staff only."]
  },
  {
    id: "APT-10254",
    title: "Collections",
    customer: "Abdirahman Ali",
    vehicle: "Payment Plan",
    category: "collections",
    status: "confirmed",
    staffId: "abdi",
    startMinutes: 780,
    durationMinutes: 65,
    phone: "(612) 555-0166",
    complaint: "Review payment promise.",
    location: "Manager office",
    confirmation: "Confirmed",
    taskAutomation: ["Payment notes", "Promise follow-up"],
    governanceNotes: ["Reason required for outcome.", "Manager-only edits after close."]
  },
  {
    id: "APT-10255",
    title: "Service / Repair",
    customer: "Liban Ali",
    vehicle: "Oil Change",
    category: "service",
    status: "confirmed",
    staffId: "brock",
    startMinutes: 810,
    durationMinutes: 70,
    phone: "(612) 555-0144",
    complaint: "Oil change and quick check.",
    location: "Service counter",
    confirmation: "Confirmed",
    taskAutomation: ["Quick service ticket", "Parts check"],
    governanceNotes: ["Owner can update notes.", "Manager override audited."]
  },
  {
    id: "APT-10256",
    title: "Test Drive",
    customer: "Hassan Omar",
    vehicle: "2022 RAV4",
    category: "sales",
    status: "confirmed",
    staffId: "walter",
    startMinutes: 840,
    durationMinutes: 75,
    phone: "(612) 555-0133",
    complaint: "Buyer wants SUV comparison.",
    location: "Showroom",
    confirmation: "Confirmed",
    taskAutomation: ["Pull vehicle", "Insurance copy request"],
    governanceNotes: ["Conflict block if vehicle unavailable.", "Sales owner can update."]
  },
  {
    id: "APT-10257",
    title: "Vehicle Delivery",
    customer: "Yusuf Mohamed",
    vehicle: "2020 Camry",
    category: "delivery",
    status: "checked-in",
    staffId: "mohamed",
    startMinutes: 780,
    durationMinutes: 75,
    phone: "(612) 555-0118",
    complaint: "Final delivery walkthrough.",
    location: "Delivery bay",
    confirmation: "Customer arrived",
    taskAutomation: ["Delivery prep", "Detail confirmation", "Funding package"],
    governanceNotes: ["Delivery reason required if delayed.", "Task chain already linked."]
  },
  {
    id: "APT-10258",
    title: "Document Review",
    customer: "Customer File",
    vehicle: "Verification",
    category: "dmv",
    status: "no-show",
    staffId: "rayana",
    startMinutes: 870,
    durationMinutes: 75,
    phone: "(612) 555-0195",
    complaint: "Customer did not arrive for file verification.",
    location: "Office desk",
    confirmation: "No show documented",
    taskAutomation: ["No-show follow-up", "Document exception"],
    governanceNotes: ["No-show reason required.", "Follow-up task generated."]
  },
  {
    id: "APT-10259",
    title: "Service Follow-Up",
    customer: "Abdirizak Jama",
    vehicle: "Check on Parts",
    category: "service",
    status: "in-progress",
    staffId: "brock",
    startMinutes: 960,
    durationMinutes: 70,
    phone: "(612) 555-0178",
    complaint: "Confirm part availability.",
    location: "Service counter",
    confirmation: "In progress",
    taskAutomation: ["Parts ETA", "Customer callback"],
    governanceNotes: ["Follow-up reason captured.", "Linked to service work order."]
  }
];

const upcomingAppointments = [
  { time: "Tue, Jul 7 - 9:00 AM", title: "Test Drive", customer: "Ali Mohamed", vehicle: "2019 Nissan Altima", staff: "Walter James", category: "sales" as const },
  { time: "Tue, Jul 7 - 10:30 AM", title: "Service / Repair", customer: "Abdul Rahman", vehicle: "2016 Ford Escape", staff: "Brock Peterson", category: "service" as const },
  { time: "Tue, Jul 7 - 1:00 PM", title: "Vehicle Delivery", customer: "Sadia Hassan", vehicle: "2021 Toyota RAV4", staff: "Mohamed Ali", category: "delivery" as const },
  { time: "Tue, Jul 7 - 2:00 PM", title: "Documentation / DMV", customer: "Omar Duale", vehicle: "Title Transfer", staff: "Rayana Hassan", category: "dmv" as const }
];

const viewModes: ViewMode[] = ["day", "week", "month", "agenda"];
const hourLabels = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
const noShowReasonOptions = [
  { value: "CUSTOMER_NO_SHOW", label: "Customer did not arrive" },
  { value: "CUSTOMER_UNREACHABLE", label: "Customer unreachable" },
  { value: "DOCUMENTATION_MISSING", label: "Required documents missing" }
];
const followUpDispositionOptions = [
  { value: "CALLBACK_REQUIRED", label: "Callback required" },
  { value: "RESCHEDULE_REQUESTED", label: "Reschedule requested" },
  { value: "CALLBACK_NOT_REQUIRED", label: "No callback required" }
];

function formatTime(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function statusLabel(status: AppointmentStatus) {
  return status.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "??";
}

function getMinutesInTimezone(value: string | null, timezone: string) {
  if (!value) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return (hour === 24 ? 0 : hour) * 60 + minute;
}

function resolveStatus(appointment: AppointmentReadModel): AppointmentStatus {
  if (appointment.bookingStatus === "DRAFT" || appointment.bookingStatus === "PENDING_APPROVAL") {
    return "draft";
  }

  if (appointment.attendanceStatus === "NO_SHOW") {
    return "no-show";
  }

  if (appointment.executionStatus === "IN_PROGRESS" || appointment.executionStatus === "WAITING") {
    return "in-progress";
  }

  if (appointment.attendanceStatus === "CHECKED_IN") {
    return "checked-in";
  }

  if (appointment.followUpDispositionCode) {
    return "follow-up";
  }

  return "confirmed";
}

function resolveCategory(appointment: AppointmentReadModel): AppointmentCategory {
  const title = appointment.title.toLowerCase();

  if (title.includes("service") || title.includes("repair") || title.includes("oil")) {
    return "service";
  }

  if (title.includes("delivery")) {
    return "delivery";
  }

  if (title.includes("dmv") || title.includes("title") || title.includes("registration") || title.includes("document")) {
    return "dmv";
  }

  if (title.includes("collection") || title.includes("payment")) {
    return "collections";
  }

  if (title.includes("inventory") || title.includes("vendor")) {
    return "inventory";
  }

  if (title.includes("marketing") || title.includes("listing")) {
    return "marketing";
  }

  if (title.includes("issue") || title.includes("complaint")) {
    return "customer";
  }

  if (title.includes("test drive") || title.includes("sales")) {
    return "sales";
  }

  return "general";
}

function resolveVehicleLabel(appointment: AppointmentReadModel) {
  const primaryVehicle =
    appointment.vehicles.find((vehicle) => vehicle.isPrimary) ?? appointment.vehicles[0];

  if (!primaryVehicle) {
    return "No vehicle attached";
  }

  const yearMakeModel = [primaryVehicle.year, primaryVehicle.make, primaryVehicle.model]
    .filter(Boolean)
    .join(" ");

  return yearMakeModel || primaryVehicle.stockNumber || primaryVehicle.vehicleNumber;
}

function mapReadModelToAppointment(appointment: AppointmentReadModel): Appointment {
  const startsAt = getMinutesInTimezone(appointment.startsAt, appointment.schedulingTimezone);
  const endsAt = getMinutesInTimezone(appointment.endsAt, appointment.schedulingTimezone);
  const ownerName = appointment.owner?.name ?? "Unassigned";

  return {
    id: appointment.appointmentNumber,
    recordId: appointment.id,
    recordVersion: appointment.version,
    startsAtIso: appointment.startsAt,
    endsAtIso: appointment.endsAt,
    schedulingTimezone: appointment.schedulingTimezone,
    dataSource: "live",
    title: appointment.title,
    customer: appointment.customer?.displayName ?? "Internal / No customer",
    vehicle: resolveVehicleLabel(appointment),
    category: resolveCategory(appointment),
    status: resolveStatus(appointment),
    staffId: appointment.owner?.id ?? "unassigned-live",
    staffName: ownerName,
    staffRole: appointment.visibility.relationship === "MANAGER" ? "Manager-visible" : "Owner / participant",
    startMinutes: startsAt ?? 9 * 60,
    durationMinutes: startsAt !== null && endsAt !== null ? Math.max(30, endsAt - startsAt) : 60,
    phone: appointment.customer?.phoneNumber ?? dealershipPhone,
    complaint: appointment.sourceReference ?? "Live appointment record from the read model.",
    location: "Time Motor Sales",
    confirmation: appointment.confirmationStatus.replaceAll("_", " ").toLowerCase(),
    needsFollowUp: Boolean(appointment.followUpDispositionCode),
    taskAutomation:
      appointment.taskLinks.length > 0
        ? appointment.taskLinks.map((taskLink) => `${taskLink.linkType}: ${taskLink.taskId}`)
        : ["No linked tasks yet"],
    governanceNotes: [
      appointment.visibility.canMutate
        ? "You can update this appointment."
        : "Read-only for your current appointment permissions.",
      `Live record v${appointment.version}.`,
      "Changes use the command ledger and audit history."
    ]
  };
}

function commandLabel(commandType: OperationalCommand) {
  if (commandType === "CHECK_IN") {
    return "Check In";
  }

  if (commandType === "NO_SHOW") {
    return "No Show";
  }

  return "Schedule Draft";
}

function commandStatus(commandType: OperationalCommand): AppointmentStatus {
  if (commandType === "CHECK_IN") {
    return "checked-in";
  }

  if (commandType === "NO_SHOW") {
    return "no-show";
  }

  return "confirmed";
}

function createCommandIdentifier(commandType: OperationalCommand, appointmentId: string) {
  const randomSuffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `appointment-${commandType.toLowerCase()}-${appointmentId}-${randomSuffix}`;
}

function createDraftCommandIdentifier() {
  const randomSuffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `appointment-create-draft-${randomSuffix}`;
}

function createAppointmentNumber() {
  return `APT-${Date.now().toString().slice(-8)}`;
}

function localDateTimeToMinneapolisIso(localDate: string, time: string) {
  const [yearText, monthText, dayText] = localDate.split("-");
  const [hourText, minuteText] = time.split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    throw new Error("Appointment date and time must be valid.");
  }

  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      numberingSystem: "latn",
      timeZone: defaultTimezone,
      year: "numeric"
    }).formatToParts(candidate);
    const actualYear = Number(parts.find((part) => part.type === "year")?.value);
    const actualMonth = Number(parts.find((part) => part.type === "month")?.value);
    const actualDay = Number(parts.find((part) => part.type === "day")?.value);
    const actualHourText = parts.find((part) => part.type === "hour")?.value ?? "0";
    const actualHour = actualHourText === "24" ? 0 : Number(actualHourText);
    const actualMinute = Number(parts.find((part) => part.type === "minute")?.value);
    const actualUtcAsLocal = Date.UTC(
      actualYear,
      actualMonth - 1,
      actualDay,
      actualHour,
      actualMinute,
      0,
      0
    );
    const desiredUtcAsLocal = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const differenceMs = desiredUtcAsLocal - actualUtcAsLocal;

    if (differenceMs === 0) {
      return candidate.toISOString();
    }

    candidate = new Date(candidate.getTime() + differenceMs);
  }

  return candidate.toISOString();
}

function addMinutesToIso(isoValue: string, minutes: number) {
  return new Date(new Date(isoValue).getTime() + minutes * 60_000).toISOString();
}

export function AppointmentBoardShell() {
  const [selectedId, setSelectedId] = useState(appointments[0].id);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AppointmentCategory | "all">("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [draftOpen, setDraftOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [appointmentStatusOverrides, setAppointmentStatusOverrides] = useState<Record<string, AppointmentStatus>>({});
  const [noShowDraft, setNoShowDraft] = useState({
    reasonCode: "CUSTOMER_NO_SHOW",
    reasonNotes: "",
    followUpDispositionCode: "CALLBACK_REQUIRED"
  });
  const [draftAppointment, setDraftAppointment] = useState<DraftAppointmentForm>({
    category: "service",
    title: "Service / Repair",
    customer: "",
    vehicle: "",
    localDate: defaultBoardDate,
    startTime: "10:00",
    durationMinutes: 60,
    reason: ""
  });
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState("Operational command bridge ready. Persisted appointments can now use the live command API for check-in and no-show actions.");

  async function loadLiveAppointments() {
    setIsLiveLoading(true);

    try {
      const response = await fetch(`/api/appointments?date=${encodeURIComponent(defaultBoardDate)}`);
      const result = (await response.json().catch(() => null)) as AppointmentReadApiResult | { error?: string } | null;

      if (!response.ok) {
        throw new Error(result && "error" in result && result.error ? result.error : "Unable to load live appointments.");
      }

      const appointmentsFromReadModel =
        result && "appointments" in result
          ? result.appointments.map((appointment) => mapReadModelToAppointment(appointment))
          : [];

      setLiveAppointments(appointmentsFromReadModel);
      setActionNotice(
        appointmentsFromReadModel.length > 0
          ? `Loaded ${appointmentsFromReadModel.length} live appointment${appointmentsFromReadModel.length === 1 ? "" : "s"} from the read model.`
          : "Live read model is connected. No persisted appointments were found for this day, so the approved preview board remains visible."
      );
    } catch (error) {
      setLiveAppointments([]);
      setActionNotice(
        error instanceof Error
          ? `Live read model could not load: ${error.message}. Preview board remains visible.`
          : "Live read model could not load. Preview board remains visible."
      );
    } finally {
      setIsLiveLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadIfActive() {
      await loadLiveAppointments();
    }

    if (isActive) {
      void loadIfActive();
    }

    return () => {
      isActive = false;
    };
  }, []);

  const boardAppointments = useMemo(
    () =>
      (liveAppointments.length > 0 ? liveAppointments : appointments).map((appointment) => ({
        ...appointment,
        status: appointmentStatusOverrides[appointment.id] ?? appointment.status
      })),
    [appointmentStatusOverrides, liveAppointments]
  );

  const visibleStaffMembers = useMemo(
    () =>
      boardAppointments.reduce<StaffMember[]>((staffList, appointment) => {
        if (staffList.some((staff) => staff.id === appointment.staffId)) {
          return staffList;
        }

        staffList.push({
          id: appointment.staffId,
          name: appointment.staffName ?? "Unassigned",
          role: appointment.staffRole ?? "Appointment owner",
          initials: getInitials(appointment.staffName ?? "Unassigned")
        });

        return staffList;
      }, [...staffMembers]),
    [boardAppointments]
  );

  const filteredAppointments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return boardAppointments.filter((appointment) => {
      const searchTarget = `${appointment.title} ${appointment.customer} ${appointment.vehicle} ${appointment.id} ${appointment.phone}`.toLowerCase();
      return (
        (!normalizedQuery || searchTarget.includes(normalizedQuery)) &&
        (categoryFilter === "all" || appointment.category === categoryFilter) &&
        (staffFilter === "all" || appointment.staffId === staffFilter) &&
        (statusFilter === "all" || appointment.status === statusFilter) &&
        (!conflictsOnly || appointment.conflict)
      );
    });
  }, [boardAppointments, categoryFilter, conflictsOnly, query, staffFilter, statusFilter]);

  const selectedAppointment =
    boardAppointments.find((appointment) => appointment.id === selectedId) ?? filteredAppointments[0] ?? boardAppointments[0];

  const selectedStaff =
    visibleStaffMembers.find((staff) => staff.id === selectedAppointment.staffId) ?? visibleStaffMembers[0];

  const metrics = [
    { label: "Total Appointments", value: boardAppointments.length, status: "all" as const, tone: "slate" },
    { label: "Confirmed", value: boardAppointments.filter((appointment) => appointment.status === "confirmed").length, status: "confirmed" as const, tone: "green" },
    { label: "Checked In", value: boardAppointments.filter((appointment) => appointment.status === "checked-in").length, status: "checked-in" as const, tone: "blue" },
    { label: "In Progress", value: boardAppointments.filter((appointment) => appointment.status === "in-progress").length, status: "in-progress" as const, tone: "orange" },
    { label: "No Show", value: boardAppointments.filter((appointment) => appointment.status === "no-show").length, status: "no-show" as const, tone: "red" },
    { label: "Needs Follow-Up", value: boardAppointments.filter((appointment) => appointment.needsFollowUp || appointment.status === "follow-up").length, status: "follow-up" as const, tone: "purple" }
  ];

  function handlePreviewAction(label: string) {
    setActionNotice(`${label} captured in preview. Live version will require a documented reason and audit trail.`);
  }

  async function submitDraftAppointment() {
    if (!draftAppointment.title.trim()) {
      setActionNotice("Appointment title is required.");
      return;
    }

    if (!draftAppointment.reason.trim()) {
      setActionNotice("New appointments require a documented reason.");
      return;
    }

    setIsDraftSaving(true);

    try {
      const startsAt = localDateTimeToMinneapolisIso(
        draftAppointment.localDate,
        draftAppointment.startTime
      );
      const endsAt = addMinutesToIso(startsAt, draftAppointment.durationMinutes);
      const appointmentNumber = createAppointmentNumber();
      const idempotencyKey = createDraftCommandIdentifier();
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commandType: "CREATE_DRAFT",
          organizationId: defaultOrganizationId,
          locationId: defaultLocationId,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            appointmentNumber,
            title: draftAppointment.title.trim(),
            sourceType: "MANUAL",
            sourceReference: draftAppointment.reason.trim(),
            startsAt,
            endsAt,
            schedulingTimezone: defaultTimezone,
            purposeSnapshot: {
              category: draftAppointment.category,
              categoryLabel: categoryMeta[draftAppointment.category].label,
              reason: draftAppointment.reason.trim()
            },
            customerSnapshot: draftAppointment.customer.trim()
              ? {
                  displayName: draftAppointment.customer.trim()
                }
              : null,
            vehicleSnapshot: draftAppointment.vehicle.trim()
              ? {
                  displayName: draftAppointment.vehicle.trim(),
                  vehicleNumber: draftAppointment.vehicle.trim()
                }
              : null
          }
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(result?.error || "Unable to create the appointment.");
      }

      setDraftOpen(false);
      setSelectedId(appointmentNumber);
      setActionNotice(`Appointment ${appointmentNumber} was created. Reloading the live board...`);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Unable to create the appointment right now."
      );
    } finally {
      setIsDraftSaving(false);
    }
  }

  async function submitOperationalCommand(commandType: OperationalCommand) {
    const label = commandLabel(commandType);

    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice(
        `${label} is wired to the live command API, but ${selectedAppointment.id} is still preview data. The next data slice must provide a persisted appointment record ID and version before this can save.`
      );
      return;
    }

    if (commandType === "NO_SHOW" && !noShowDraft.reasonNotes.trim()) {
      setActionNotice("No Show requires reason notes before it can be submitted.");
      return;
    }

    if (commandType === "SCHEDULE" && (!selectedAppointment.startsAtIso || !selectedAppointment.endsAtIso)) {
      setActionNotice("Schedule Draft requires a saved start and end time.");
      return;
    }

    setIsCommandPending(true);

    try {
      const idempotencyKey = createCommandIdentifier(commandType, selectedAppointment.recordId);
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commandType,
          appointmentId: selectedAppointment.recordId,
          expectedAppointmentVersion: selectedAppointment.recordVersion,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            ...(commandType === "NO_SHOW"
              ? {
                  reasonCode: noShowDraft.reasonCode,
                  reasonNotes: noShowDraft.reasonNotes.trim(),
                  followUpDispositionCode: noShowDraft.followUpDispositionCode
                }
              : {}),
            ...(commandType === "SCHEDULE"
              ? {
                  startsAt: selectedAppointment.startsAtIso,
                  endsAt: selectedAppointment.endsAtIso,
                  schedulingTimezone: selectedAppointment.schedulingTimezone ?? defaultTimezone
                }
              : {})
          }
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(
          result?.error ||
            result?.execution?.rejectionReasons?.join(" ") ||
            `${label} could not be completed.`
        );
      }

      setAppointmentStatusOverrides((current) => ({
        ...current,
        [selectedAppointment.id]: commandStatus(commandType)
      }));
      setNoShowOpen(false);
      setActionNotice(`${label} saved for ${selectedAppointment.id}. History and command ledger were updated by the live command path.`);

      if (commandType === "SCHEDULE") {
        await loadLiveAppointments();
      }
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : `${label} could not be completed.`);
    } finally {
      setIsCommandPending(false);
    }
  }

  return (
    <section className="appointment-board-page" aria-labelledby="appointment-board-title">
      <div className="appointment-board-toolbar">
        <div>
          <p className="section-kicker">Enterprise appointment operations</p>
          <h1 id="appointment-board-title">Appointment Board</h1>
          <p>{dealershipAddress} · {dealershipPhone} · {businessHours}</p>
        </div>
        <div className="appointment-toolbar-actions">
          <label className="appointment-search">
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search appointments, customers, vehicles, or phone numbers"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search appointments, customers, vehicles..."
              type="search"
              value={query}
            />
          </label>
          <button className="appointment-primary-button" onClick={() => setDraftOpen(true)} type="button">
            <Plus size={17} aria-hidden="true" />
            New Appointment
          </button>
          <button className="appointment-icon-button" type="button" aria-label="Calendar settings" onClick={() => handlePreviewAction("Calendar settings")}>
            <CalendarDays size={18} aria-hidden="true" />
          </button>
          <button className="appointment-icon-button appointment-alert-button" type="button" aria-label="Board alerts" onClick={() => handlePreviewAction("Alerts")}>
            <Bell size={18} aria-hidden="true" />
            <span>3</span>
          </button>
          <button className="appointment-icon-button" type="button" aria-label="Appointment settings" onClick={() => handlePreviewAction("Board settings")}>
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="appointment-preview-banner" role="status">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>{isLiveLoading ? "Loading live appointment read model..." : actionNotice}</span>
      </div>

      <div className="appointment-date-row">
        <button type="button" className="appointment-date-button" onClick={() => handlePreviewAction("Today")}>
          Today
        </button>
        <button type="button" className="appointment-square-button" aria-label="Previous day" onClick={() => handlePreviewAction("Previous day")}>
          <ChevronLeft size={17} />
        </button>
        <button type="button" className="appointment-square-button" aria-label="Next day" onClick={() => handlePreviewAction("Next day")}>
          <ChevronRight size={17} />
        </button>
        <div className="appointment-date-display">
          <strong>{businessDate}</strong>
          <CalendarDays size={16} aria-hidden="true" />
        </div>
      </div>

      <div className="appointment-metric-grid" aria-label="Appointment metrics">
        {metrics.map((metric) => (
          <button
            className={statusFilter === metric.status ? `appointment-metric appointment-metric-${metric.tone} appointment-metric-active` : `appointment-metric appointment-metric-${metric.tone}`}
            key={metric.label}
            onClick={() => setStatusFilter(metric.status)}
            type="button"
          >
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </button>
        ))}
      </div>

      <div className="appointment-main-grid">
        <div className="appointment-board-card">
          <div className="appointment-board-controls">
            <div className="appointment-view-tabs" aria-label="Appointment view">
              {viewModes.map((mode) => (
                <button
                  className={viewMode === mode ? "appointment-view-tab appointment-view-tab-active" : "appointment-view-tab"}
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  type="button"
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <div className="appointment-filter-row">
              <select aria-label="Filter appointment category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AppointmentCategory | "all")}>
                <option value="all">All Categories</option>
                {Object.entries(categoryMeta).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
              <select aria-label="Filter appointment staff" value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
                <option value="all">All Staff</option>
                {visibleStaffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
              <button className={conflictsOnly ? "appointment-filter-toggle appointment-filter-toggle-active" : "appointment-filter-toggle"} type="button" onClick={() => setConflictsOnly((value) => !value)}>
                <Filter size={15} aria-hidden="true" />
                Conflicts Only
              </button>
            </div>
          </div>

          {viewMode === "day" ? (
            <div className="appointment-calendar-shell">
              <div className="appointment-calendar-header">
                <div className="appointment-all-day">All Day</div>
                {visibleStaffMembers.map((staff) => (
                  <div className="appointment-staff-header" key={staff.id}>
                    <span className="appointment-avatar">{staff.initials}</span>
                    <div>
                      <strong>{staff.name}</strong>
                      <small>{staff.role}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="appointment-calendar-body">
                <div className="appointment-time-column">
                  {hourLabels.map((hour, index) => (
                    <span key={hour} style={{ top: `${index * 66}px` }}>{hour}</span>
                  ))}
                </div>
                {visibleStaffMembers.map((staff) => (
                  <div className="appointment-staff-column" key={staff.id}>
                    {filteredAppointments.filter((appointment) => appointment.staffId === staff.id).map((appointment) => {
                      const meta = categoryMeta[appointment.category];
                      const top = Math.max(0, ((appointment.startMinutes - 540) / 60) * 66);
                      const height = Math.max(58, (appointment.durationMinutes / 60) * 66);
                      return (
                        <button
                          className={selectedAppointment.id === appointment.id ? `appointment-calendar-item ${meta.className} appointment-calendar-item-active` : `appointment-calendar-item ${meta.className}`}
                          key={appointment.id}
                          onClick={() => setSelectedId(appointment.id)}
                          style={{ top: `${top}px`, minHeight: `${height}px` }}
                          type="button"
                        >
                          <span>{formatTime(appointment.startMinutes)}</span>
                          <strong>{appointment.title}</strong>
                          <small>{appointment.customer}</small>
                          <small>{appointment.vehicle}</small>
                          {appointment.conflict ? <b>Conflict warning</b> : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="appointment-now-line" aria-hidden="true">
                  <span>10:15 AM</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="appointment-alt-view">
              <CalendarDays size={34} aria-hidden="true" />
              <strong>{viewMode[0].toUpperCase() + viewMode.slice(1)} view shell</strong>
              <p>The command surface is ready; live scheduling data will reuse the same enterprise controls, permissions, and audit rules.</p>
              <div className="appointment-alt-list">
                {filteredAppointments.slice(0, 5).map((appointment) => (
                  <button key={appointment.id} type="button" onClick={() => setSelectedId(appointment.id)}>
                    <span>{formatTime(appointment.startMinutes)}</span>
                    <strong>{appointment.title}</strong>
                    <small>{appointment.customer} · {categoryMeta[appointment.category].label}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="appointment-legend" aria-label="Appointment category legend">
            {Object.entries(categoryMeta).map(([key, meta]) => (
              <span key={key}><i className={meta.className} />{meta.label}</span>
            ))}
          </div>
        </div>

        <aside className="appointment-detail-panel" aria-label="Appointment details">
          <div className="appointment-detail-header">
            <div className={`appointment-detail-icon ${categoryMeta[selectedAppointment.category].className}`}>
              <Users size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>{selectedAppointment.title}</strong>
              <span>Appointment #{selectedAppointment.id}</span>
            </div>
            <span className={`appointment-status appointment-status-${selectedAppointment.status}`}>{statusLabel(selectedAppointment.status)}</span>
          </div>

          <div className="appointment-detail-list">
            <p><CalendarDays size={16} aria-hidden="true" />{businessDate}</p>
            <p><Clock3 size={16} aria-hidden="true" />{formatTime(selectedAppointment.startMinutes)} - {formatTime(selectedAppointment.startMinutes + selectedAppointment.durationMinutes)} ({selectedAppointment.durationMinutes} min)</p>
            <p><UserRound size={16} aria-hidden="true" />{selectedStaff.name} ({selectedStaff.role})</p>
            <p><Phone size={16} aria-hidden="true" />{selectedAppointment.phone}</p>
            <p><Car size={16} aria-hidden="true" />{selectedAppointment.vehicle}</p>
            <p><MapPin size={16} aria-hidden="true" />{selectedAppointment.location}</p>
            <p><MessageCircle size={16} aria-hidden="true" />{selectedAppointment.complaint}</p>
          </div>

          <div className="appointment-detail-section">
            <div className="appointment-section-heading">
              <strong>Linked Tasks ({selectedAppointment.taskAutomation.length})</strong>
              <button type="button" onClick={() => handlePreviewAction("New linked task")}>+ New Task</button>
            </div>
            <div className="appointment-task-stack">
              {selectedAppointment.taskAutomation.map((task, index) => (
                <div className="appointment-task-row" key={task}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{task}</strong>
                    <small>{index === 0 ? "In Progress" : "Not Started"}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="appointment-detail-section">
            <strong>Enterprise Controls</strong>
            <ul className="appointment-governance-list">
              {selectedAppointment.governanceNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="appointment-detail-section">
            <label className="appointment-outcome-label">
              Outcome
              <select onChange={(event) => event.target.value ? handlePreviewAction(`Outcome "${event.target.value}"`) : undefined} defaultValue="">
                <option value="" disabled>Select outcome</option>
                <option>Completed</option>
                <option>Rescheduled</option>
                <option>Needs follow-up</option>
                <option>No-show documented</option>
              </select>
            </label>
            <label className="appointment-outcome-label">
              Next Step / Follow-Up
              <textarea placeholder="Add next step..." rows={4} onBlur={(event) => event.currentTarget.value ? handlePreviewAction("Next step") : undefined} />
            </label>
          </div>

          <div className="appointment-detail-actions">
            {selectedAppointment.status === "draft" ? (
              <button
                disabled={isCommandPending || selectedAppointment.dataSource !== "live"}
                type="button"
                onClick={() => void submitOperationalCommand("SCHEDULE")}
              >
                <ClipboardCheck size={16} aria-hidden="true" />{isCommandPending ? "Scheduling..." : "Schedule Draft"}
              </button>
            ) : null}
            <button
              disabled={isCommandPending || selectedAppointment.status === "draft" || selectedAppointment.status === "checked-in"}
              type="button"
              onClick={() => void submitOperationalCommand("CHECK_IN")}
            >
              <Check size={16} aria-hidden="true" />{isCommandPending ? "Saving..." : "Check In"}
            </button>
            <button
              className="appointment-danger-outline"
              disabled={isCommandPending || selectedAppointment.status === "draft" || selectedAppointment.status === "no-show"}
              type="button"
              onClick={() => setNoShowOpen(true)}
            >
              <X size={16} aria-hidden="true" />No Show
            </button>
            <button type="button" onClick={() => handlePreviewAction("More actions")}>•••</button>
          </div>
        </aside>
      </div>

      <section className="appointment-upcoming-card" aria-labelledby="upcoming-appointments">
        <div className="appointment-section-heading">
          <strong id="upcoming-appointments">Upcoming Appointments</strong>
          <button type="button" onClick={() => handlePreviewAction("View all appointments")}>View all →</button>
        </div>
        <div className="appointment-upcoming-grid">
          {upcomingAppointments.map((appointment) => (
            <button
              className={`appointment-upcoming-item ${categoryMeta[appointment.category].className}`}
              key={`${appointment.time}-${appointment.customer}`}
              onClick={() => handlePreviewAction(`Upcoming appointment for ${appointment.customer}`)}
              type="button"
            >
              <span>{appointment.time}</span>
              <strong>{appointment.title}</strong>
              <small>{appointment.customer}</small>
              <small>{appointment.vehicle}</small>
              <em>{appointment.staff}</em>
            </button>
          ))}
        </div>
      </section>

      {draftOpen ? (
        <div className="appointment-modal-backdrop" role="presentation">
          <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="draft-appointment-title">
            <div className="appointment-section-heading">
              <strong id="draft-appointment-title">New Appointment Shell</strong>
              <button type="button" aria-label="Close new appointment shell" onClick={() => setDraftOpen(false)}>×</button>
            </div>
            <p>Create a persisted appointment draft for the selected Minneapolis board day. Scheduling approval, conflict checks, and resource reservations remain controlled by the later schedule command flow.</p>
            <div className="appointment-modal-grid">
              <label>
                Category
                <select
                  value={draftAppointment.category}
                  onChange={(event) => {
                    const category = event.target.value as AppointmentCategory;
                    setDraftAppointment((current) => ({
                      ...current,
                      category,
                      title: categoryMeta[category].label
                    }));
                  }}
                >
                  {Object.entries(categoryMeta).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select disabled value="current-user">
                  <option value="current-user">Signed-in user / manager</option>
                </select>
              </label>
              <label>
                Title
                <input
                  placeholder="Appointment title"
                  value={draftAppointment.title}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                Customer
                <input
                  placeholder="Customer name"
                  value={draftAppointment.customer}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, customer: event.target.value }))}
                />
              </label>
              <label>
                Vehicle
                <input
                  placeholder="Vehicle / stock #"
                  value={draftAppointment.vehicle}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, vehicle: event.target.value }))}
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={draftAppointment.localDate}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, localDate: event.target.value }))}
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={draftAppointment.startTime}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label>
                Duration
                <select
                  value={draftAppointment.durationMinutes}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={75}>1 hour 15 minutes</option>
                  <option value={90}>1 hour 30 minutes</option>
                </select>
              </label>
              <label className="appointment-modal-span">
                Reason
                <textarea
                  rows={3}
                  placeholder="Every creation requires a documented reason."
                  value={draftAppointment.reason}
                  onChange={(event) => setDraftAppointment((current) => ({ ...current, reason: event.target.value }))}
                />
              </label>
            </div>
            <div className="appointment-detail-actions">
              <button disabled={isDraftSaving} type="button" onClick={() => void submitDraftAppointment()}><ClipboardCheck size={16} aria-hidden="true" />{isDraftSaving ? "Creating..." : "Create Draft Appointment"}</button>
              <button disabled={isDraftSaving} type="button" onClick={() => setDraftOpen(false)}><FileText size={16} aria-hidden="true" />Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {noShowOpen ? (
        <div className="appointment-modal-backdrop" role="presentation">
          <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="no-show-appointment-title">
            <div className="appointment-section-heading">
              <strong id="no-show-appointment-title">Document No Show</strong>
              <button type="button" aria-label="Close no-show form" onClick={() => setNoShowOpen(false)}>Ã—</button>
            </div>
            <p>No-show actions require a reason, notes, follow-up disposition, and an audit event before capacity can be released.</p>
            <div className="appointment-modal-grid">
              <label>
                Reason
                <select
                  value={noShowDraft.reasonCode}
                  onChange={(event) => setNoShowDraft((current) => ({ ...current, reasonCode: event.target.value }))}
                >
                  {noShowReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Follow-up
                <select
                  value={noShowDraft.followUpDispositionCode}
                  onChange={(event) => setNoShowDraft((current) => ({ ...current, followUpDispositionCode: event.target.value }))}
                >
                  {followUpDispositionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="appointment-modal-span">
                Reason notes
                <textarea
                  rows={3}
                  placeholder="Example: Customer did not arrive by the grace period; called once and left voicemail."
                  value={noShowDraft.reasonNotes}
                  onChange={(event) => setNoShowDraft((current) => ({ ...current, reasonNotes: event.target.value }))}
                />
              </label>
            </div>
            <div className="appointment-detail-actions">
              <button className="appointment-danger-action" disabled={isCommandPending} type="button" onClick={() => void submitOperationalCommand("NO_SHOW")}>
                <X size={16} aria-hidden="true" />{isCommandPending ? "Saving..." : "Save No Show"}
              </button>
              <button disabled={isCommandPending} type="button" onClick={() => setNoShowOpen(false)}>
                <FileText size={16} aria-hidden="true" />Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
