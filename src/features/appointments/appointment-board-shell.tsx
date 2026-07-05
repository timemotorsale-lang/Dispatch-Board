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
import { useMemo, useState } from "react";

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

type AppointmentStatus = "confirmed" | "checked-in" | "in-progress" | "no-show" | "follow-up";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

type Appointment = {
  id: string;
  title: string;
  customer: string;
  vehicle: string;
  category: AppointmentCategory;
  status: AppointmentStatus;
  staffId: string;
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

type ViewMode = "day" | "week" | "month" | "agenda";

const businessDate = "Monday, July 6, 2026";
const businessHours = "9:00 AM - 6:00 PM";
const dealershipAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
const dealershipPhone = "(612) 724-3631";

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

export function AppointmentBoardShell() {
  const [selectedId, setSelectedId] = useState(appointments[0].id);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AppointmentCategory | "all">("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [draftOpen, setDraftOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState("Preview shell ready. Live creation and persistence connect in the next implementation slice.");

  const filteredAppointments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const searchTarget = `${appointment.title} ${appointment.customer} ${appointment.vehicle} ${appointment.id} ${appointment.phone}`.toLowerCase();
      return (
        (!normalizedQuery || searchTarget.includes(normalizedQuery)) &&
        (categoryFilter === "all" || appointment.category === categoryFilter) &&
        (staffFilter === "all" || appointment.staffId === staffFilter) &&
        (statusFilter === "all" || appointment.status === statusFilter) &&
        (!conflictsOnly || appointment.conflict)
      );
    });
  }, [categoryFilter, conflictsOnly, query, staffFilter, statusFilter]);

  const selectedAppointment =
    appointments.find((appointment) => appointment.id === selectedId) ?? filteredAppointments[0] ?? appointments[0];

  const selectedStaff = staffMembers.find((staff) => staff.id === selectedAppointment.staffId) ?? staffMembers[0];

  const metrics = [
    { label: "Total Appointments", value: appointments.length, status: "all" as const, tone: "slate" },
    { label: "Confirmed", value: appointments.filter((appointment) => appointment.status === "confirmed").length, status: "confirmed" as const, tone: "green" },
    { label: "Checked In", value: appointments.filter((appointment) => appointment.status === "checked-in").length, status: "checked-in" as const, tone: "blue" },
    { label: "In Progress", value: appointments.filter((appointment) => appointment.status === "in-progress").length, status: "in-progress" as const, tone: "orange" },
    { label: "No Show", value: appointments.filter((appointment) => appointment.status === "no-show").length, status: "no-show" as const, tone: "red" },
    { label: "Needs Follow-Up", value: appointments.filter((appointment) => appointment.needsFollowUp || appointment.status === "follow-up").length, status: "follow-up" as const, tone: "purple" }
  ];

  function handlePreviewAction(label: string) {
    setActionNotice(`${label} captured in preview. Live version will require a documented reason and audit trail.`);
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
        <span>{actionNotice}</span>
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
                {staffMembers.map((staff) => (
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
                {staffMembers.map((staff) => (
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
                {staffMembers.map((staff) => (
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
            <button type="button" onClick={() => handlePreviewAction("Check in")}><Check size={16} aria-hidden="true" />Check In</button>
            <button type="button" onClick={() => handlePreviewAction("No show")}><X size={16} aria-hidden="true" />No Show</button>
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
            <p>This visible shell is ready for the day-one workflow: category, owner, customer, vehicle, reason, automation template, conflict rule, and audit reason.</p>
            <div className="appointment-modal-grid">
              <label>Category<select defaultValue="service"><option value="service">Service / Repair</option><option value="sales">Sales / Test Drive</option><option value="dmv">Documentation / DMV</option></select></label>
              <label>Owner<select defaultValue="brock">{staffMembers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label>
              <label>Customer<input placeholder="Customer name" /></label>
              <label>Vehicle<input placeholder="Vehicle / stock #" /></label>
              <label className="appointment-modal-span">Reason<textarea rows={3} placeholder="Every change or creation requires a documented reason." /></label>
            </div>
            <div className="appointment-detail-actions">
              <button type="button" onClick={() => { handlePreviewAction("Draft appointment"); setDraftOpen(false); }}><ClipboardCheck size={16} aria-hidden="true" />Capture Draft Preview</button>
              <button type="button" onClick={() => setDraftOpen(false)}><FileText size={16} aria-hidden="true" />Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
