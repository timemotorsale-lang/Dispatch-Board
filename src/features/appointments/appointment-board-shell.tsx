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
import Link from "next/link";
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

type OperationalCommand = "CHECK_IN" | "NO_SHOW" | "SCHEDULE" | "START" | "FINISH";

type AppointmentBoardDataSource = "preview" | "live";

type ResourceAuditAction = "warning-override" | "release" | "replace";

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

type ScheduleDraftForm = {
  localDate: string;
  startTime: string;
  durationMinutes: number;
  reasonNotes: string;
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
  bookingStatus?: string;
  attendanceStatus?: string;
  executionStatus?: string;
  outcomeCode?: string | null;
  outcomeNotes?: string | null;
  followUpDispositionCode?: string | null;
  followUpNotes?: string | null;
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
  linkedTasks?: Array<{
    id: string;
    taskId: string;
    title: string;
    status: string;
    dueAt: string;
    assignedUserName: string;
    linkType: string;
    linkTitle: string;
    explanation: string | null;
    isRequired: boolean;
    blocksAppointment: boolean;
    appointmentRequiredForTask: boolean;
  }>;
  governanceNotes: string[];
};

type AppointmentExceptionQueueKey =
  | "needs-scheduling"
  | "conflict-watch"
  | "no-show-recovery"
  | "follow-up-required";

type AppointmentExceptionQueue = {
  key: AppointmentExceptionQueueKey;
  title: string;
  description: string;
  emptyMessage: string;
  tone: "blue" | "amber" | "red" | "purple";
  items: Appointment[];
};

type AppointmentResolutionStateStatus =
  | "open"
  | "assigned"
  | "snoozed"
  | "escalated"
  | "resolved";

type AppointmentResolutionState = {
  status: AppointmentResolutionStateStatus;
  ownerId?: string;
  ownerName?: string;
  note?: string;
  snoozedUntilLabel?: string;
  updatedAtLabel?: string;
};

type AppointmentResolutionWorkbenchFilter =
  | "all"
  | "breached-sla"
  | "escalated"
  | AppointmentExceptionQueueKey;

type AppointmentResolutionWorkbenchSort = "priority" | "age" | "customer";

type AppointmentResolutionWorkbenchItem = {
  appointment: Appointment;
  queueKey: AppointmentExceptionQueueKey;
  queueLabel: string;
  priority: "Critical" | "High" | "Medium";
  priorityRank: number;
  ageHours: number;
  slaStatus: "on-track" | "at-risk" | "breached";
  recommendedAction: string;
  ownerName: string;
  resolutionStatus: AppointmentResolutionStateStatus;
  snoozedUntilLabel?: string;
  lastActionLabel: string;
};

type AppointmentAuditTimelineLane = "appointment" | "task" | "automation" | "manager";

type AppointmentAuditTimelineEvent = {
  id: string;
  appointmentId: string;
  lane: AppointmentAuditTimelineLane;
  tone: "slate" | "blue" | "amber" | "red" | "purple" | "green";
  title: string;
  detail: string;
  actor: string;
  occurredAtLabel: string;
};

type AppointmentAuditTimelineFilter = "all" | AppointmentAuditTimelineLane;

type AppointmentCommandCenterExportFormat = "summary" | "csv" | "audit-json";

type AppointmentCommandCenterReportRow = {
  appointmentId: string;
  customer: string;
  vehicle: string;
  queueLabel: string;
  priority: "Critical" | "High" | "Medium";
  slaStatus: "on-track" | "at-risk" | "breached";
  resolutionStatus: AppointmentResolutionStateStatus;
  ownerName: string;
  recommendedAction: string;
};

type AppointmentCommandCenterReport = {
  generatedForLabel: string;
  summary: {
    visibleExceptions: number;
    breachedSla: number;
    escalated: number;
    managerEvents: number;
  };
  rows: AppointmentCommandCenterReportRow[];
};

type AppointmentCommandCenterSearchPreset =
  | "all"
  | "breached-sla"
  | "escalated"
  | "snoozed"
  | "resolved"
  | "manager-activity";

type AppointmentCommandCenterSearchScope = "all" | "appointments" | "timeline";

type AppointmentCommandCenterSearchResult = {
  id: string;
  appointmentId: string;
  kind: "appointment" | "timeline";
  title: string;
  subtitle: string;
  detail: string;
  badge: string;
  tone: "slate" | "blue" | "amber" | "red" | "purple" | "green";
};

type AppointmentCommandCenterSavedViewConfig = {
  searchQuery: string;
  searchPreset: AppointmentCommandCenterSearchPreset;
  searchScope: AppointmentCommandCenterSearchScope;
  resolutionFilter: AppointmentResolutionWorkbenchFilter;
  reportQueueFilter: AppointmentResolutionWorkbenchFilter;
  reportOwnerFilter: string;
  auditTimelineFilter: AppointmentAuditTimelineFilter;
};

type AppointmentCommandCenterSavedView = {
  id: string;
  name: string;
  description: string;
  config: AppointmentCommandCenterSavedViewConfig;
};

type AppointmentCommandCenterSubscription = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  watchType:
    | "breached-sla"
    | "escalated"
    | "no-show-recovery"
    | "follow-up-backlog"
    | "manager-activity";
};

type AppointmentCommandCenterSubscriptionSummary = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  count: number;
  watchType: AppointmentCommandCenterSubscription["watchType"];
  tone: "slate" | "blue" | "amber" | "red" | "purple";
};

type AppointmentCommandCenterDigestChannel = "in-app" | "email-summary" | "shift-handoff";

type AppointmentCommandCenterDigestCadence = "hourly" | "shift-change" | "daily-close";

type AppointmentCommandCenterDigestPreference = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  watchType: AppointmentCommandCenterSubscription["watchType"] | "shift-handoff";
  channel: AppointmentCommandCenterDigestChannel;
  cadence: AppointmentCommandCenterDigestCadence;
  recipientLabel: string;
};

type AppointmentCommandCenterDigestSummary = AppointmentCommandCenterDigestPreference & {
  count: number;
  tone: "slate" | "blue" | "amber" | "red" | "purple";
  headline: string;
};

type AppointmentCommandCenterDigestHistoryEntry = {
  id: string;
  digestLabel: string;
  channel: AppointmentCommandCenterDigestChannel;
  recipientLabel: string;
  count: number;
  status: "previewed" | "sent";
  reason: string;
  generatedAtLabel: string;
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
    id: string;
    taskId: string;
    taskTitle?: string;
    taskStatus?: string;
    taskDueAt?: string;
    assignedUser?: {
      id: string;
      name: string;
      email?: string;
    };
    linkType: string;
    linkTitle?: string;
    explanation?: string | null;
    isRequired?: boolean;
    blocksAppointment: boolean;
    appointmentRequiredForTask: boolean;
  }>;
  visibility: {
    canMutate: boolean;
    relationship: string;
  };
  outcomeCode: string | null;
  outcomeNotes: string | null;
  followUpDispositionCode: string | null;
  followUpNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AppointmentReadApiResult = {
  date: string;
  appointmentCount: number;
  appointments: AppointmentReadModel[];
};

type AppointmentScheduleReadiness = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  status: "READY" | "WARNING" | "BLOCKED";
  canSubmitSchedule: boolean;
  hardBlocks: Array<{
    code: string;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  checks: Array<{
    code: string;
    label: string;
    status: "PASS" | "WARNING" | "BLOCKED";
    message: string;
  }>;
};

type AppointmentStaffConflictPreview = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  status: "READY" | "WARNING" | "BLOCKED";
  canProceedWithStaff: boolean;
  warningOverrideRequired: boolean;
  warningOverrideSatisfied: boolean;
  warningKey: string | null;
  staff: {
    userId: string;
    name: string;
    role: "OWNER" | "PARTICIPANT";
    roleCode: string;
    resourceId: string | null;
    resourceName: string | null;
  } | null;
  staffMembers?: Array<{
    userId: string;
    name: string;
    role: "OWNER" | "PARTICIPANT";
    roleCode: string;
    resourceId: string | null;
    resourceName: string | null;
    status: "READY" | "WARNING" | "BLOCKED";
    warningOverrideRequired: boolean;
    warningOverrideSatisfied: boolean;
    warningKey: string | null;
    reasons: string[];
  }>;
  checks: Array<{
    code: string;
    label: string;
    status: "PASS" | "WARNING" | "BLOCKED";
    message: string;
    staffUserId?: string;
    staffRole?: "OWNER" | "PARTICIPANT";
    staffRoleCode?: string;
    warningKey?: string | null;
    warningOverrideRequired?: boolean;
    warningOverrideSatisfied?: boolean;
  }>;
  reasons: string[];
};

type AppointmentResourcePlanning = {
  appointmentId: string;
  appointmentNumber: string;
  category: string;
  status:
    | "READY_TO_SELECT"
    | "REQUIREMENT_SELECTED"
    | "CONFIGURATION_NEEDED"
    | "NO_RECOMMENDATION";
  canManageResourcesForAppointment: boolean;
  recommendations: Array<{
    requirementCode: string;
    label: string;
    resourceTypeCode: string;
    requiredCapacity: number;
    isMandatory: boolean;
    hardBlockIfUnfulfilled: boolean;
    assignmentTiming: "AT_BOOKING" | "BEFORE_START" | "OPTIONAL";
    rationale: string;
    resourceTypeId: string | null;
    resourceTypeName: string | null;
    selectedRequirementId: string | null;
    selectedReservationCount: number;
    selectedReservation: {
      id: string;
      status: string;
      resourceId: string;
      resourceCode: string;
      resourceName: string;
    } | null;
    activeCandidateCount: number;
    status: "SELECTED" | "AVAILABLE" | "CONFIGURATION_NEEDED" | "RESOURCE_TYPE_MISSING";
    candidates: Array<{
      id: string;
      code: string;
      name: string;
      capacity: number;
      capacityMode: string;
      conflictPolicy: string;
    }>;
    message: string;
  }>;
};

type AppointmentResourceCandidateAvailability = {
  appointmentId: string;
  appointmentNumber: string;
  status: "READY" | "WARNING" | "BLOCKED" | "NO_PROPOSALS";
  canProceedToHold: boolean;
  proposals: Array<{
    reservationId: string;
    requirementId: string | null;
    requirementCode: string;
    resourceId: string;
    resourceCode: string;
    resourceName: string;
    status: "READY" | "WARNING" | "BLOCKED";
    canProceedToHold: boolean;
    warningOverrideRequired: boolean;
    warningOverrideSatisfied: boolean;
    warningKey: string | null;
    reasons: string[];
    availableCapacity: number;
    requiredCapacity: number;
    reservedCapacity: number;
    unavailableCapacity: number;
  }>;
};

type ViewMode = "day" | "week" | "month" | "agenda";

export type AppointmentBoardSettings = {
  organizationId: string;
  locationId: string;
  locationName: string;
  timezone: string;
  addressLine: string;
  phoneNumber: string;
  businessHoursLabel: string;
};

type AppointmentBoardShellProps = {
  boardSettings?: AppointmentBoardSettings | null;
};

const businessDate = "Monday, July 6, 2026";
const fallbackBusinessHours = "9:00 AM - 6:00 PM";
const fallbackDealershipAddress = "1101 E. Lake Street, Minneapolis, MN 55407";
const fallbackDealershipPhone = "(612) 724-3631";
const defaultBoardDate = "2026-07-06";
const defaultOrganizationId = "org-time-motor-sales";
const defaultLocationId = "loc-time-motor-sales-minneapolis";
const defaultTimezone = "America/Chicago";
const resolutionWorkbenchReferenceMinutes = 15 * 60 + 30;
const defaultResolutionOwnerId = "abdi";
const defaultSavedViewId = "ops-triage";

const initialSavedCommandCenterViews: AppointmentCommandCenterSavedView[] = [
  {
    id: "ops-triage",
    name: "Operations Triage",
    description: "All active queues with broad search and all timeline lanes visible.",
    config: {
      searchQuery: "",
      searchPreset: "all",
      searchScope: "all",
      resolutionFilter: "all",
      reportQueueFilter: "all",
      reportOwnerFilter: "all",
      auditTimelineFilter: "all"
    }
  },
  {
    id: "sla-breach-review",
    name: "SLA Breach Review",
    description: "Focus on breached items and escalation-ready manager cleanup.",
    config: {
      searchQuery: "",
      searchPreset: "breached-sla",
      searchScope: "appointments",
      resolutionFilter: "breached-sla",
      reportQueueFilter: "breached-sla",
      reportOwnerFilter: "all",
      auditTimelineFilter: "manager"
    }
  },
  {
    id: "manager-activity-lane",
    name: "Manager Activity Lane",
    description: "Resume directly into manager action history and escalation events.",
    config: {
      searchQuery: "",
      searchPreset: "manager-activity",
      searchScope: "timeline",
      resolutionFilter: "escalated",
      reportQueueFilter: "escalated",
      reportOwnerFilter: "all",
      auditTimelineFilter: "manager"
    }
  }
];

const initialCommandCenterSubscriptions: AppointmentCommandCenterSubscription[] = [
  {
    id: "watch-breached-sla",
    label: "Breached SLA",
    description: "Watch all exception items that have already crossed the SLA line.",
    enabled: true,
    watchType: "breached-sla"
  },
  {
    id: "watch-escalations",
    label: "Escalations",
    description: "Watch escalated appointment workbench items needing manager action.",
    enabled: true,
    watchType: "escalated"
  },
  {
    id: "watch-no-show-recovery",
    label: "No-Show Recovery",
    description: "Track open no-show recovery work and callback follow-up.",
    enabled: true,
    watchType: "no-show-recovery"
  },
  {
    id: "watch-follow-up-backlog",
    label: "Follow-Up Backlog",
    description: "Track follow-up queue buildup across the visible board scope.",
    enabled: false,
    watchType: "follow-up-backlog"
  },
  {
    id: "watch-manager-activity",
    label: "Manager Activity",
    description: "Watch manager-lane actions and decision history events.",
    enabled: true,
    watchType: "manager-activity"
  }
];

const initialCommandCenterDigests: AppointmentCommandCenterDigestPreference[] = [
  {
    id: "digest-breached-sla",
    label: "Breached SLA Digest",
    description: "Push urgent appointment exceptions that have already crossed the SLA line.",
    enabled: true,
    watchType: "breached-sla",
    channel: "in-app",
    cadence: "hourly",
    recipientLabel: "General Manager + Service Lead"
  },
  {
    id: "digest-escalations",
    label: "Escalation Digest",
    description: "Summarize escalated workbench items that still need a manager decision.",
    enabled: true,
    watchType: "escalated",
    channel: "email-summary",
    cadence: "hourly",
    recipientLabel: "General Manager"
  },
  {
    id: "digest-no-show-recovery",
    label: "No-Show Recovery Digest",
    description: "Keep missed arrivals and callback recovery visible during the day.",
    enabled: true,
    watchType: "no-show-recovery",
    channel: "in-app",
    cadence: "shift-change",
    recipientLabel: "Sales Desk"
  },
  {
    id: "digest-follow-up-backlog",
    label: "Follow-Up Backlog Digest",
    description: "Highlight follow-up buildup before it rolls into the next operating window.",
    enabled: false,
    watchType: "follow-up-backlog",
    channel: "email-summary",
    cadence: "daily-close",
    recipientLabel: "Managers"
  },
  {
    id: "digest-shift-handoff",
    label: "Shift Handoff Digest",
    description: "Package the command-center summary needed for opening and closing manager handoff.",
    enabled: true,
    watchType: "shift-handoff",
    channel: "shift-handoff",
    cadence: "shift-change",
    recipientLabel: "Opening + Closing Manager"
  }
];

const initialCommandCenterDigestHistory: AppointmentCommandCenterDigestHistoryEntry[] = [
  {
    id: "digest-history-1",
    digestLabel: "Escalation Digest",
    channel: "email-summary",
    recipientLabel: "General Manager",
    count: 2,
    status: "sent",
    reason: "Hourly escalation sweep before lunch.",
    generatedAtLabel: "Today 11:45 AM"
  },
  {
    id: "digest-history-2",
    digestLabel: "Shift Handoff Digest",
    channel: "shift-handoff",
    recipientLabel: "Opening + Closing Manager",
    count: 4,
    status: "previewed",
    reason: "Prepared for afternoon handoff.",
    generatedAtLabel: "Today 2:10 PM"
  }
];

const outcomeOptions = [
  { value: "COMPLETED", label: "Completed" },
  { value: "FOLLOW_UP_REQUIRED", label: "Needs follow-up" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "ESCALATED", label: "Escalated" }
];

const followUpDispositionOptions = [
  { value: "NO_FOLLOW_UP_REQUIRED", label: "No follow-up required" },
  { value: "CALLBACK_REQUIRED", label: "Callback required" },
  { value: "FOLLOW_UP_APPOINTMENT_REQUIRED", label: "Follow-up appointment required" },
  { value: "TASK_CREATED", label: "Task created / assigned" },
  { value: "MANAGER_REVIEW_REQUIRED", label: "Manager review required" }
];

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
    phone: fallbackDealershipPhone,
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
const noShowFollowUpDispositionOptions = [
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

function formatTaskStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatWorkflowCodeLabel(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function resolutionStatusLabel(status: AppointmentResolutionStateStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

function formatTaskDueAt(value: string, timezone = defaultTimezone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(new Date(value));
}

export function isUnscheduledDraftAppointment(appointment: {
  status: string;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
}) {
  return appointment.status === "draft" && (!appointment.startsAtIso || !appointment.endsAtIso);
}

function sortAppointmentsForQueue(appointments: Appointment[]) {
  return [...appointments].sort((left, right) => {
    const leftIsUnscheduled = isUnscheduledDraftAppointment(left);
    const rightIsUnscheduled = isUnscheduledDraftAppointment(right);

    if (leftIsUnscheduled !== rightIsUnscheduled) {
      return leftIsUnscheduled ? -1 : 1;
    }

    if (left.startMinutes !== right.startMinutes) {
      return left.startMinutes - right.startMinutes;
    }

    return left.title.localeCompare(right.title);
  });
}

export function buildAppointmentExceptionQueues(appointments: Appointment[]): AppointmentExceptionQueue[] {
  return [
    {
      key: "needs-scheduling",
      title: "Needs Scheduling",
      description: "Drafts and generated follow-ups waiting for a real time window.",
      emptyMessage: "No drafts are waiting for schedule placement.",
      tone: "blue",
      items: sortAppointmentsForQueue(
        appointments.filter((appointment) => isUnscheduledDraftAppointment(appointment))
      )
    },
    {
      key: "conflict-watch",
      title: "Conflict Watch",
      description: "Appointments carrying a visible capacity, owner, or timing conflict.",
      emptyMessage: "No active conflicts are visible in the current board scope.",
      tone: "amber",
      items: sortAppointmentsForQueue(appointments.filter((appointment) => appointment.conflict))
    },
    {
      key: "no-show-recovery",
      title: "No-Show Recovery",
      description: "Appointments that require reason capture, callback handling, or recovery follow-up.",
      emptyMessage: "No no-show recovery work is open right now.",
      tone: "red",
      items: sortAppointmentsForQueue(
        appointments.filter(
          (appointment) =>
            appointment.status === "no-show" || appointment.attendanceStatus === "NO_SHOW"
        )
      )
    },
    {
      key: "follow-up-required",
      title: "Follow-Up Required",
      description: "Completed or interrupted appointments that still need next-step ownership.",
      emptyMessage: "No follow-up exceptions are waiting right now.",
      tone: "purple",
      items: sortAppointmentsForQueue(
        appointments.filter(
          (appointment) =>
            appointment.needsFollowUp ||
            appointment.status === "follow-up" ||
            (Boolean(appointment.followUpDispositionCode) &&
              appointment.followUpDispositionCode !== "NO_FOLLOW_UP_REQUIRED")
        )
      )
    }
  ];
}

function appointmentPrimaryExceptionQueue(
  appointment: Appointment
): AppointmentExceptionQueueKey | null {
  const queues = buildAppointmentExceptionQueues([appointment]).filter((queue) => queue.items.length > 0);
  return queues[0]?.key ?? null;
}

function appointmentResolutionPriority(
  queueKey: AppointmentExceptionQueueKey,
  appointment: Appointment,
  resolutionState?: AppointmentResolutionState
) {
  if (resolutionState?.status === "escalated" || queueKey === "no-show-recovery") {
    return { label: "Critical" as const, rank: 0 };
  }

  if (
    queueKey === "conflict-watch" ||
    (queueKey === "needs-scheduling" && appointment.needsFollowUp)
  ) {
    return { label: "High" as const, rank: 1 };
  }

  return { label: "Medium" as const, rank: 2 };
}

function appointmentResolutionAgeHours(
  appointment: Appointment,
  nowMinutes = resolutionWorkbenchReferenceMinutes
) {
  const baselineMinutes = isUnscheduledDraftAppointment(appointment)
    ? 9 * 60
    : appointment.startMinutes;

  return Math.max(0, Math.round(((nowMinutes - baselineMinutes) / 60) * 10) / 10);
}

function appointmentResolutionSlaStatus(
  priorityRank: number,
  ageHours: number
) {
  if (priorityRank === 0) {
    if (ageHours >= 1) {
      return "breached" as const;
    }

    if (ageHours >= 0.5) {
      return "at-risk" as const;
    }

    return "on-track" as const;
  }

  if (priorityRank === 1) {
    if (ageHours >= 2) {
      return "breached" as const;
    }

    if (ageHours >= 1) {
      return "at-risk" as const;
    }

    return "on-track" as const;
  }

  if (ageHours >= 4) {
    return "breached" as const;
  }

  if (ageHours >= 2) {
    return "at-risk" as const;
  }

  return "on-track" as const;
}

function appointmentResolutionRecommendation(
  queueKey: AppointmentExceptionQueueKey,
  resolutionState?: AppointmentResolutionState
) {
  if (resolutionState?.status === "escalated") {
    return "Manager escalation";
  }

  if (queueKey === "needs-scheduling") {
    return "Schedule slot";
  }

  if (queueKey === "conflict-watch") {
    return "Rebalance resources";
  }

  if (queueKey === "no-show-recovery") {
    return "Recover customer";
  }

  return "Assign next step";
}

function appointmentAuditTimestampLabel(
  appointment: Appointment,
  offsetMinutes = 0
) {
  if (isUnscheduledDraftAppointment(appointment)) {
    const hours = 9 + Math.floor(offsetMinutes / 60);
    const minutes = offsetMinutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;
    return `Today ${hour}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  return `Today ${formatTime(Math.min(appointment.startMinutes + offsetMinutes, 18 * 60))}`;
}

function appointmentAuditDetailForResolution(
  status: AppointmentResolutionStateStatus,
  appointment: Appointment,
  resolutionState?: AppointmentResolutionState
) {
  const ownerName = resolutionState?.ownerName ?? appointment.staffName ?? "Manager";
  const note = resolutionState?.note ? ` Reason: ${resolutionState.note}` : "";

  if (status === "assigned") {
    return `Assigned to ${ownerName} from the command-center workbench.${note}`;
  }

  if (status === "snoozed") {
    return `Snoozed until ${resolutionState?.snoozedUntilLabel ?? "the next work window"} for controlled follow-up.${note}`;
  }

  if (status === "escalated") {
    return `Escalated into the manager lane under ${ownerName}.${note}`;
  }

  if (status === "resolved") {
    return `Resolved from the command-center workbench with audited closure context.${note}`;
  }

  return "Waiting for manager action.";
}

export function buildAppointmentAuditTimeline(input: {
  appointment: Appointment;
  resolutionState?: AppointmentResolutionState;
  commandCenterEvents?: AppointmentAuditTimelineEvent[];
}): AppointmentAuditTimelineEvent[] {
  const { appointment, resolutionState } = input;
  const commandCenterEvents = (input.commandCenterEvents ?? []).filter(
    (event) => event.appointmentId === appointment.id
  );
  const events: AppointmentAuditTimelineEvent[] = [];

  events.push({
    id: `${appointment.id}-created`,
    appointmentId: appointment.id,
    lane: "appointment",
    tone: "slate",
    title: "Appointment visible on board",
    detail: `${appointment.title} for ${appointment.customer} entered the enterprise board with ${appointment.confirmation.toLowerCase()}.`,
    actor: appointment.staffName ?? "Board scheduler",
    occurredAtLabel: appointmentAuditTimestampLabel(appointment, -45)
  });

  if (appointment.taskAutomation.length > 0) {
    events.push({
      id: `${appointment.id}-automation`,
      appointmentId: appointment.id,
      lane: "automation",
      tone: "blue",
      title: "Automation bundle attached",
      detail: `Prepared ${appointment.taskAutomation.length} workflow item${appointment.taskAutomation.length === 1 ? "" : "s"}: ${appointment.taskAutomation.slice(0, 2).join(", ")}${appointment.taskAutomation.length > 2 ? ", and more." : "."}`,
      actor: "Automation runtime",
      occurredAtLabel: appointmentAuditTimestampLabel(appointment, -30)
    });
  }

  if (appointment.linkedTasks && appointment.linkedTasks.length > 0) {
    events.push({
      id: `${appointment.id}-task-link`,
      appointmentId: appointment.id,
      lane: "task",
      tone: "purple",
      title: "Linked tasks synchronized",
      detail: `${appointment.linkedTasks.length} linked task${appointment.linkedTasks.length === 1 ? "" : "s"} remain visible from the board detail rail.`,
      actor: appointment.linkedTasks[0]?.assignedUserName ?? "Task service",
      occurredAtLabel: appointmentAuditTimestampLabel(appointment, -18)
    });
  }

  const primaryQueue = appointmentPrimaryExceptionQueue(appointment);
  if (primaryQueue) {
    events.push({
      id: `${appointment.id}-queue`,
      appointmentId: appointment.id,
      lane: "appointment",
      tone:
        primaryQueue === "no-show-recovery"
          ? "red"
          : primaryQueue === "conflict-watch"
            ? "amber"
            : primaryQueue === "follow-up-required"
              ? "purple"
              : "blue",
      title: "Exception queue surfaced",
      detail: appointmentExceptionReason(primaryQueue, appointment),
      actor: "Command center",
      occurredAtLabel: appointmentAuditTimestampLabel(appointment, -5)
    });
  }

  if (resolutionState && resolutionState.status !== "open") {
    events.push({
      id: `${appointment.id}-resolution-${resolutionState.status}`,
      appointmentId: appointment.id,
      lane: "manager",
      tone:
        resolutionState.status === "resolved"
          ? "green"
          : resolutionState.status === "escalated"
            ? "purple"
            : resolutionState.status === "snoozed"
              ? "amber"
              : "blue",
      title: `${resolutionStatusLabel(resolutionState.status)} in workbench`,
      detail: appointmentAuditDetailForResolution(resolutionState.status, appointment, resolutionState),
      actor: resolutionState.ownerName ?? "General Manager",
      occurredAtLabel: resolutionState.updatedAtLabel ?? "Just now"
    });
  }

  events.push(...commandCenterEvents);

  return events.reverse();
}

export function buildAppointmentResolutionWorkbench(
  appointments: Appointment[],
  resolutionStateByAppointmentId: Record<string, AppointmentResolutionState> = {},
  options: {
    filter?: AppointmentResolutionWorkbenchFilter;
    includeDormant?: boolean;
    nowMinutes?: number;
    sort?: AppointmentResolutionWorkbenchSort;
  } = {}
): AppointmentResolutionWorkbenchItem[] {
  const filter = options.filter ?? "all";
  const includeDormant = options.includeDormant ?? false;
  const sort = options.sort ?? "priority";
  const nowMinutes = options.nowMinutes ?? resolutionWorkbenchReferenceMinutes;
  const items: AppointmentResolutionWorkbenchItem[] = [];

  for (const appointment of appointments) {
    const queueKey = appointmentPrimaryExceptionQueue(appointment);

    if (!queueKey) {
      continue;
    }

    const resolutionState = resolutionStateByAppointmentId[appointment.id];
    if (
      !includeDormant &&
      (resolutionState?.status === "resolved" || resolutionState?.status === "snoozed")
    ) {
      continue;
    }

    const priority = appointmentResolutionPriority(queueKey, appointment, resolutionState);
    const ageHours = appointmentResolutionAgeHours(appointment, nowMinutes);
    const ownerName =
      resolutionState?.ownerName ?? appointment.staffName ?? staffMembers.find((staff) => staff.id === appointment.staffId)?.name ?? "Unassigned";

    items.push({
      appointment,
      queueKey,
      queueLabel:
        buildAppointmentExceptionQueues([appointment]).find((queue) => queue.key === queueKey)?.title ??
        queueKey,
      priority: priority.label,
      priorityRank: priority.rank,
      ageHours,
      slaStatus: appointmentResolutionSlaStatus(priority.rank, ageHours),
      recommendedAction: appointmentResolutionRecommendation(queueKey, resolutionState),
      ownerName,
      resolutionStatus: resolutionState?.status ?? "open",
      snoozedUntilLabel: resolutionState?.snoozedUntilLabel,
      lastActionLabel: resolutionState?.updatedAtLabel ?? "Awaiting manager action"
    });
  }

  return items
    .filter((item) => {
      if (filter === "all") {
        return true;
      }

      if (filter === "breached-sla") {
        return item.slaStatus === "breached";
      }

      if (filter === "escalated") {
        return item.resolutionStatus === "escalated";
      }

      return item.queueKey === filter;
    })
    .sort((left, right) => {
    if (sort === "age") {
      if (left.ageHours !== right.ageHours) {
        return right.ageHours - left.ageHours;
      }
    } else if (sort === "customer") {
      return left.appointment.customer.localeCompare(right.appointment.customer);
    } else {
      if (left.priorityRank !== right.priorityRank) {
        return left.priorityRank - right.priorityRank;
      }

      if (left.slaStatus !== right.slaStatus) {
        const slaRank = { breached: 0, "at-risk": 1, "on-track": 2 } as const;
        return slaRank[left.slaStatus] - slaRank[right.slaStatus];
      }

      if (left.ageHours !== right.ageHours) {
        return right.ageHours - left.ageHours;
      }
    }

    return left.appointment.customer.localeCompare(right.appointment.customer);
  });
}

export function buildAppointmentCommandCenterReport(input: {
  generatedForLabel: string;
  workbenchItems: AppointmentResolutionWorkbenchItem[];
  auditTimelineEvents: AppointmentAuditTimelineEvent[];
}): AppointmentCommandCenterReport {
  const rows: AppointmentCommandCenterReportRow[] = input.workbenchItems.map((item) => ({
    appointmentId: item.appointment.id,
    customer: item.appointment.customer,
    vehicle: item.appointment.vehicle,
    queueLabel: item.queueLabel,
    priority: item.priority,
    slaStatus: item.slaStatus,
    resolutionStatus: item.resolutionStatus,
    ownerName: item.ownerName,
    recommendedAction: item.recommendedAction
  }));

  return {
    generatedForLabel: input.generatedForLabel,
    summary: {
      visibleExceptions: rows.length,
      breachedSla: rows.filter((row) => row.slaStatus === "breached").length,
      escalated: rows.filter((row) => row.resolutionStatus === "escalated").length,
      managerEvents: input.auditTimelineEvents.filter((event) => event.lane === "manager").length
    },
    rows
  };
}

export function buildAppointmentCommandCenterExport(input: {
  format: AppointmentCommandCenterExportFormat;
  report: AppointmentCommandCenterReport;
  auditTimelineEvents: AppointmentAuditTimelineEvent[];
}): string {
  if (input.format === "summary") {
    const summary = input.report.summary;
    const topRows = input.report.rows
      .slice(0, 5)
      .map(
        (row) =>
          `- ${row.appointmentId} | ${row.customer} | ${row.queueLabel} | ${row.priority} | ${row.slaStatus} | ${row.ownerName}`
      )
      .join("\n");

    return [
      `Appointment command center report - ${input.report.generatedForLabel}`,
      `Visible exceptions: ${summary.visibleExceptions}`,
      `Breached SLA: ${summary.breachedSla}`,
      `Escalated: ${summary.escalated}`,
      `Manager events in selected timeline: ${summary.managerEvents}`,
      "",
      "Visible queue items:",
      topRows || "- None"
    ].join("\n");
  }

  if (input.format === "csv") {
    const header = [
      "appointment_id",
      "customer",
      "vehicle",
      "queue",
      "priority",
      "sla_status",
      "resolution_status",
      "owner",
      "recommended_action"
    ];

    const rows = input.report.rows.map((row) =>
      [
        row.appointmentId,
        row.customer,
        row.vehicle,
        row.queueLabel,
        row.priority,
        row.slaStatus,
        row.resolutionStatus,
        row.ownerName,
        row.recommendedAction
      ]
        .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`)
        .join(",")
    );

    return [header.join(","), ...rows].join("\n");
  }

  return JSON.stringify(
    {
      report: input.report,
      auditTimelineEvents: input.auditTimelineEvents
    },
    null,
    2
  );
}

export function buildAppointmentCommandCenterSearchResults(input: {
  appointments: Appointment[];
  resolutionStateByAppointmentId?: Record<string, AppointmentResolutionState>;
  query: string;
  preset?: AppointmentCommandCenterSearchPreset;
  scope?: AppointmentCommandCenterSearchScope;
  commandCenterAuditEvents?: AppointmentAuditTimelineEvent[];
}): AppointmentCommandCenterSearchResult[] {
  const resolutionStateByAppointmentId = input.resolutionStateByAppointmentId ?? {};
  const preset = input.preset ?? "all";
  const scope = input.scope ?? "all";
  const normalizedQuery = input.query.trim().toLowerCase();
  const allTimelineEvents = input.appointments.flatMap((appointment) =>
    buildAppointmentAuditTimeline({
      appointment,
      resolutionState: resolutionStateByAppointmentId[appointment.id],
      commandCenterEvents: input.commandCenterAuditEvents ?? []
    })
  );

  const workbenchItems = buildAppointmentResolutionWorkbench(
    input.appointments,
    resolutionStateByAppointmentId,
    {
      includeDormant: true,
      sort: "priority"
    }
  );

  const appointmentResults =
    scope === "timeline"
      ? []
      : workbenchItems
          .filter((item) => {
            if (preset === "breached-sla") {
              return item.slaStatus === "breached";
            }

            if (preset === "escalated") {
              return item.resolutionStatus === "escalated";
            }

            if (preset === "snoozed") {
              return item.resolutionStatus === "snoozed";
            }

            if (preset === "resolved") {
              return item.resolutionStatus === "resolved";
            }

            if (preset === "manager-activity") {
              return false;
            }

            return true;
          })
          .filter((item) => {
            if (!normalizedQuery) {
              return true;
            }

            const searchTarget = [
              item.appointment.id,
              item.appointment.title,
              item.appointment.customer,
              item.appointment.vehicle,
              item.ownerName,
              item.queueLabel,
              item.recommendedAction,
              item.resolutionStatus,
              item.slaStatus
            ]
              .join(" ")
              .toLowerCase();

            return searchTarget.includes(normalizedQuery);
          })
          .map(
            (item) =>
              ({
                id: `appointment-${item.appointment.id}`,
                appointmentId: item.appointment.id,
                kind: "appointment",
                title: `${item.appointment.id} · ${item.appointment.customer}`,
                subtitle: `${item.appointment.title} · ${item.queueLabel}`,
                detail: `${item.ownerName} · ${item.priority} priority · ${item.slaStatus} SLA · ${item.recommendedAction}`,
                badge: resolutionStatusLabel(item.resolutionStatus),
                tone:
                  item.slaStatus === "breached"
                    ? "red"
                    : item.resolutionStatus === "escalated"
                      ? "purple"
                      : item.slaStatus === "at-risk"
                        ? "amber"
                        : "blue"
              }) satisfies AppointmentCommandCenterSearchResult
          );

  const timelineResults =
    scope === "appointments"
      ? []
      : allTimelineEvents
          .filter((event) => {
            if (preset === "manager-activity") {
              return event.lane === "manager";
            }

            if (preset === "escalated") {
              return event.title.toLowerCase().includes("escalat") || event.detail.toLowerCase().includes("escalat");
            }

            if (preset === "snoozed") {
              return event.title.toLowerCase().includes("snooz") || event.detail.toLowerCase().includes("snooz");
            }

            if (preset === "resolved") {
              return event.title.toLowerCase().includes("resolved") || event.detail.toLowerCase().includes("resolved");
            }

            if (preset === "breached-sla") {
              return false;
            }

            return true;
          })
          .filter((event) => {
            if (!normalizedQuery) {
              return true;
            }

            return [
              event.appointmentId,
              event.title,
              event.detail,
              event.actor,
              event.lane
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);
          })
          .map(
            (event) =>
              ({
                id: `timeline-${event.id}`,
                appointmentId: event.appointmentId,
                kind: "timeline",
                title: `${event.appointmentId} · ${event.title}`,
                subtitle: `${event.actor} · ${event.occurredAtLabel}`,
                detail: event.detail,
                badge: `${event.lane[0].toUpperCase() + event.lane.slice(1)} event`,
                tone: event.tone
              }) satisfies AppointmentCommandCenterSearchResult
          );

  return [...appointmentResults, ...timelineResults].sort((left, right) =>
    left.appointmentId.localeCompare(right.appointmentId) || left.title.localeCompare(right.title)
  );
}

export function buildAppointmentCommandCenterSavedViewDescription(
  config: AppointmentCommandCenterSavedViewConfig
) {
  const parts = [
    config.searchPreset === "all" ? "All active work" : `Preset: ${config.searchPreset.replaceAll("-", " ")}`,
    config.searchScope === "all" ? "appointments + timeline" : `${config.searchScope} only`,
    config.searchQuery ? `query "${config.searchQuery}"` : null,
    config.auditTimelineFilter === "all" ? "all timeline lanes" : `${config.auditTimelineFilter} lane`
  ].filter(Boolean);

  return parts.join(" · ");
}

export function buildAppointmentCommandCenterSubscriptionSummaries(input: {
  appointments: Appointment[];
  resolutionStateByAppointmentId?: Record<string, AppointmentResolutionState>;
  commandCenterAuditEvents?: AppointmentAuditTimelineEvent[];
  subscriptions: AppointmentCommandCenterSubscription[];
}): AppointmentCommandCenterSubscriptionSummary[] {
  const resolutionStateByAppointmentId = input.resolutionStateByAppointmentId ?? {};
  const activeQueues = buildAppointmentExceptionQueues(
    input.appointments.filter((appointment) => {
      const status = resolutionStateByAppointmentId[appointment.id]?.status;
      return status !== "resolved" && status !== "snoozed";
    })
  );
  const workbenchItems = buildAppointmentResolutionWorkbench(
    input.appointments,
    resolutionStateByAppointmentId,
    {
      includeDormant: false,
      sort: "priority"
    }
  );
  const managerEvents = input.appointments.flatMap((appointment) =>
    buildAppointmentAuditTimeline({
      appointment,
      resolutionState: resolutionStateByAppointmentId[appointment.id],
      commandCenterEvents: input.commandCenterAuditEvents ?? []
    }).filter((event) => event.lane === "manager")
  );

  return input.subscriptions.map((subscription) => {
    if (subscription.watchType === "breached-sla") {
      return {
        id: subscription.id,
        label: subscription.label,
        description: subscription.description,
        enabled: subscription.enabled,
        count: workbenchItems.filter((item) => item.slaStatus === "breached").length,
        watchType: subscription.watchType,
        tone: "red"
      };
    }

    if (subscription.watchType === "escalated") {
      return {
        id: subscription.id,
        label: subscription.label,
        description: subscription.description,
        enabled: subscription.enabled,
        count: workbenchItems.filter((item) => item.resolutionStatus === "escalated").length,
        watchType: subscription.watchType,
        tone: "purple"
      };
    }

    if (subscription.watchType === "no-show-recovery") {
      return {
        id: subscription.id,
        label: subscription.label,
        description: subscription.description,
        enabled: subscription.enabled,
        count: activeQueues.find((queue) => queue.key === "no-show-recovery")?.items.length ?? 0,
        watchType: subscription.watchType,
        tone: "red"
      };
    }

    if (subscription.watchType === "follow-up-backlog") {
      return {
        id: subscription.id,
        label: subscription.label,
        description: subscription.description,
        enabled: subscription.enabled,
        count: activeQueues.find((queue) => queue.key === "follow-up-required")?.items.length ?? 0,
        watchType: subscription.watchType,
        tone: "amber"
      };
    }

    return {
      id: subscription.id,
      label: subscription.label,
      description: subscription.description,
      enabled: subscription.enabled,
      count: managerEvents.length,
      watchType: subscription.watchType,
      tone: "blue"
    };
  });
}

function commandCenterDigestHeadline(
  watchType: AppointmentCommandCenterDigestPreference["watchType"],
  count: number,
  managerEventCount: number
) {
  if (watchType === "breached-sla") {
    return `${count} breached SLA item${count === 1 ? "" : "s"} need urgent manager attention.`;
  }

  if (watchType === "escalated") {
    return `${count} escalated appointment${count === 1 ? "" : "s"} still need ownership or resolution.`;
  }

  if (watchType === "no-show-recovery") {
    return `${count} no-show recovery case${count === 1 ? "" : "s"} are waiting on outreach.`;
  }

  if (watchType === "follow-up-backlog") {
    return `${count} follow-up backlog item${count === 1 ? "" : "s"} should be cleared before close.`;
  }

  if (watchType === "manager-activity") {
    return `${count} manager-lane event${count === 1 ? "" : "s"} are visible in the active board scope.`;
  }

  return `${count} live exception item${count === 1 ? "" : "s"} and ${managerEventCount} manager event${
    managerEventCount === 1 ? "" : "s"
  } are ready for shift handoff.`;
}

export function buildAppointmentCommandCenterDigestSummaries(input: {
  appointments: Appointment[];
  resolutionStateByAppointmentId?: Record<string, AppointmentResolutionState>;
  commandCenterAuditEvents?: AppointmentAuditTimelineEvent[];
  digests: AppointmentCommandCenterDigestPreference[];
}): AppointmentCommandCenterDigestSummary[] {
  const resolutionStateByAppointmentId = input.resolutionStateByAppointmentId ?? {};
  const activeQueues = buildAppointmentExceptionQueues(
    input.appointments.filter((appointment) => {
      const status = resolutionStateByAppointmentId[appointment.id]?.status;
      return status !== "resolved" && status !== "snoozed";
    })
  );
  const workbenchItems = buildAppointmentResolutionWorkbench(
    input.appointments,
    resolutionStateByAppointmentId,
    {
      includeDormant: false,
      sort: "priority"
    }
  );
  const managerEventCount = input.appointments.flatMap((appointment) =>
    buildAppointmentAuditTimeline({
      appointment,
      resolutionState: resolutionStateByAppointmentId[appointment.id],
      commandCenterEvents: input.commandCenterAuditEvents ?? []
    }).filter((event) => event.lane === "manager")
  ).length;

  return input.digests.map((digest) => {
    let count = 0;
    let tone: AppointmentCommandCenterDigestSummary["tone"] = "blue";

    if (digest.watchType === "breached-sla") {
      count = workbenchItems.filter((item) => item.slaStatus === "breached").length;
      tone = "red";
    } else if (digest.watchType === "escalated") {
      count = workbenchItems.filter((item) => item.resolutionStatus === "escalated").length;
      tone = "purple";
    } else if (digest.watchType === "no-show-recovery") {
      count = activeQueues.find((queue) => queue.key === "no-show-recovery")?.items.length ?? 0;
      tone = "red";
    } else if (digest.watchType === "follow-up-backlog") {
      count = activeQueues.find((queue) => queue.key === "follow-up-required")?.items.length ?? 0;
      tone = "amber";
    } else if (digest.watchType === "manager-activity") {
      count = managerEventCount;
      tone = "blue";
    } else {
      count = workbenchItems.length;
      tone = "blue";
    }

    return {
      ...digest,
      count,
      tone,
      headline: commandCenterDigestHeadline(digest.watchType, count, managerEventCount)
    };
  });
}

function commandCenterDigestChannelLabel(channel: AppointmentCommandCenterDigestChannel) {
  if (channel === "in-app") {
    return "In-app alert";
  }

  if (channel === "email-summary") {
    return "Email summary";
  }

  return "Shift handoff";
}

function commandCenterDigestCadenceLabel(cadence: AppointmentCommandCenterDigestCadence) {
  if (cadence === "hourly") {
    return "Hourly";
  }

  if (cadence === "shift-change") {
    return "Shift change";
  }

  return "Daily close";
}

export function buildAppointmentCommandCenterDigestPreview(input: {
  digest: AppointmentCommandCenterDigestSummary;
  report: AppointmentCommandCenterReport;
  focusedAppointment: Appointment;
  auditTimelineEvents: AppointmentAuditTimelineEvent[];
  businessDate: string;
}) {
  const topRows = input.report.rows.slice(0, 3);
  const lines = [
    `Appointment notification digest - ${input.digest.label}`,
    `Business date: ${input.businessDate}`,
    `Delivery: ${commandCenterDigestChannelLabel(input.digest.channel)} · ${commandCenterDigestCadenceLabel(
      input.digest.cadence
    )}`,
    `Recipients: ${input.digest.recipientLabel}`,
    `Headline: ${input.digest.headline}`,
    "",
    `Visible exceptions: ${input.report.summary.visibleExceptions}`,
    `Breached SLA: ${input.report.summary.breachedSla}`,
    `Escalated: ${input.report.summary.escalated}`,
    `Manager events: ${input.report.summary.managerEvents}`
  ];

  if (input.digest.watchType === "shift-handoff") {
    lines.push(
      "",
      `Shift handoff focus: ${input.focusedAppointment.id} · ${input.focusedAppointment.title}`,
      `Focused customer: ${input.focusedAppointment.customer}`,
      `Focused timeline events: ${input.auditTimelineEvents.length}`
    );
  }

  if (topRows.length > 0) {
    lines.push("", "Top queue items:");
    for (const row of topRows) {
      lines.push(
        `- ${row.appointmentId} | ${row.queueLabel} | ${row.priority} | ${row.ownerName} | ${row.recommendedAction}`
      );
    }
  } else {
    lines.push("", "No visible exception rows matched the current command-center scope.");
  }

  return lines.join("\n");
}

function appointmentTimeLabel(appointment: Appointment) {
  if (isUnscheduledDraftAppointment(appointment)) {
    return "Unscheduled";
  }

  return formatTime(appointment.startMinutes);
}

function appointmentTimeRangeLabel(appointment: Appointment) {
  if (isUnscheduledDraftAppointment(appointment)) {
    return "Unscheduled draft - choose a time to schedule";
  }

  return `${formatTime(appointment.startMinutes)} - ${formatTime(
    appointment.startMinutes + appointment.durationMinutes
  )} (${appointment.durationMinutes} min)`;
}

function appointmentExceptionReason(
  queueKey: AppointmentExceptionQueueKey,
  appointment: Appointment
) {
  if (queueKey === "needs-scheduling") {
    return "Draft is active, but the board still needs a committed schedule window.";
  }

  if (queueKey === "conflict-watch") {
    return appointment.confirmation || "Conflict flag is active and needs manager review.";
  }

  if (queueKey === "no-show-recovery") {
    const disposition = formatWorkflowCodeLabel(appointment.followUpDispositionCode);
    return disposition
      ? `Recovery path: ${disposition}. Document the reason and next step before closing.`
      : "No-show reason and recovery follow-up must be documented before closing.";
  }

  const disposition = formatWorkflowCodeLabel(appointment.followUpDispositionCode);
  return disposition
    ? `Next step required: ${disposition}.`
    : appointment.confirmation || "This appointment still needs a documented follow-up action.";
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

  if (
    appointment.followUpDispositionCode &&
    appointment.followUpDispositionCode !== "NO_FOLLOW_UP_REQUIRED"
  ) {
    return "follow-up";
  }

  if (appointment.attendanceStatus === "CHECKED_IN") {
    return "checked-in";
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
    bookingStatus: appointment.bookingStatus,
    attendanceStatus: appointment.attendanceStatus,
    executionStatus: appointment.executionStatus,
    outcomeCode: appointment.outcomeCode,
    outcomeNotes: appointment.outcomeNotes,
    followUpDispositionCode: appointment.followUpDispositionCode,
    followUpNotes: appointment.followUpNotes,
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
    phone: appointment.customer?.phoneNumber ?? fallbackDealershipPhone,
    complaint: appointment.sourceReference ?? "Live appointment record from the read model.",
    location: "Time Motor Sales",
    confirmation: appointment.confirmationStatus.replaceAll("_", " ").toLowerCase(),
    needsFollowUp: Boolean(
      appointment.followUpDispositionCode &&
        appointment.followUpDispositionCode !== "NO_FOLLOW_UP_REQUIRED"
    ),
    taskAutomation:
      appointment.taskLinks.length > 0
        ? appointment.taskLinks.map(
            (taskLink) => `${taskLink.linkTitle ?? taskLink.linkType}: ${taskLink.taskTitle ?? taskLink.taskId}`
          )
        : ["No linked tasks yet"],
    linkedTasks: appointment.taskLinks.map((taskLink) => ({
      id: taskLink.id,
      taskId: taskLink.taskId,
      title: taskLink.taskTitle ?? taskLink.taskId,
      status: taskLink.taskStatus ?? "UNKNOWN",
      dueAt: taskLink.taskDueAt ?? appointment.startsAt ?? appointment.createdAt ?? new Date().toISOString(),
      assignedUserName: taskLink.assignedUser?.name ?? "Unassigned",
      linkType: taskLink.linkType,
      linkTitle: taskLink.linkTitle ?? taskLink.linkType,
      explanation: taskLink.explanation ?? null,
      isRequired: taskLink.isRequired === true,
      blocksAppointment: taskLink.blocksAppointment,
      appointmentRequiredForTask: taskLink.appointmentRequiredForTask
    })),
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

  if (commandType === "START") {
    return "Start Work";
  }

  if (commandType === "FINISH") {
    return "Finish Work";
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

  if (commandType === "START") {
    return "in-progress";
  }

  if (commandType === "FINISH") {
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

function createAppointmentActionIdentifier(action: string, appointmentId: string) {
  const randomSuffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `appointment-${action.toLowerCase()}-${appointmentId}-${randomSuffix}`;
}

function labelForOption(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getExecutionResultSnapshot(result: unknown) {
  const resultObject =
    result && typeof result === "object" ? (result as Record<string, unknown>) : {};
  const execution =
    resultObject.execution && typeof resultObject.execution === "object"
      ? (resultObject.execution as Record<string, unknown>)
      : {};

  return execution.resultSnapshot && typeof execution.resultSnapshot === "object"
    ? (execution.resultSnapshot as Record<string, unknown>)
    : {};
}

function getGeneratedFollowUpAppointmentNumbers(result: unknown) {
  return getStringArray(getExecutionResultSnapshot(result).generatedFollowUpAppointmentNumbers);
}

export function buildOutcomeSuccessNotice(input: {
  appointmentId: string;
  result: unknown;
}) {
  const resultSnapshot = getExecutionResultSnapshot(input.result);
  const generatedFollowUpAppointmentNumbers = getStringArray(
    resultSnapshot.generatedFollowUpAppointmentNumbers
  );
  const automatedTaskCount = getNumberValue(resultSnapshot.automatedTaskCount);
  const automationMessages = [
    generatedFollowUpAppointmentNumbers.length > 0
      ? `Draft follow-up appointment created: ${generatedFollowUpAppointmentNumbers.join(", ")}.`
      : null,
    automatedTaskCount > 0
      ? `${automatedTaskCount} follow-up task${automatedTaskCount === 1 ? "" : "s"} created.`
      : null
  ].filter(Boolean);

  return [
    `Outcome saved for ${input.appointmentId}. Completion, outcome, follow-up, history, and command ledger were updated.`,
    ...automationMessages
  ].join(" ");
}

function createAppointmentNumber() {
  return `APT-${Date.now().toString().slice(-8)}`;
}

function localDateTimeToMinneapolisIso(localDate: string, time: string, timezone = defaultTimezone) {
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
      timeZone: timezone,
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

export function isProposedScheduleStartInPast(input: {
  localDate: string;
  startTime: string;
  now?: Date;
  timezone?: string;
}) {
  const startsAt = new Date(
    localDateTimeToMinneapolisIso(input.localDate, input.startTime, input.timezone)
  );
  const now = input.now ?? new Date();

  return startsAt < now;
}

function addMinutesToIso(isoValue: string, minutes: number) {
  return new Date(new Date(isoValue).getTime() + minutes * 60_000).toISOString();
}

function resourceAuditKey(action: ResourceAuditAction, reservationId: string) {
  return `${action}:${reservationId}`;
}

function buildResourceReasonNote(context: string, userReason: string) {
  return `${context} Reason documented by user: ${userReason.trim()}`;
}

export function AppointmentBoardShell({ boardSettings }: AppointmentBoardShellProps = {}) {
  const boardOrganizationId = boardSettings?.organizationId ?? defaultOrganizationId;
  const boardLocationId = boardSettings?.locationId ?? defaultLocationId;
  const boardTimezone = boardSettings?.timezone ?? defaultTimezone;
  const boardAddress = boardSettings?.addressLine || fallbackDealershipAddress;
  const boardPhone = boardSettings?.phoneNumber || fallbackDealershipPhone;
  const boardBusinessHours = boardSettings?.businessHoursLabel || fallbackBusinessHours;
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
  const [outcomeDraft, setOutcomeDraft] = useState({
    outcomeCode: "COMPLETED",
    outcomeNotes: "",
    followUpDispositionCode: "NO_FOLLOW_UP_REQUIRED",
    followUpNotes: "",
    reasonNotes: ""
  });
  const [isOutcomeSaving, setIsOutcomeSaving] = useState(false);
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
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraftForm>({
    localDate: defaultBoardDate,
    startTime: "10:00",
    durationMinutes: 60,
    reasonNotes: ""
  });
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [scheduleReadiness, setScheduleReadiness] = useState<AppointmentScheduleReadiness | null>(null);
  const [isReadinessLoading, setIsReadinessLoading] = useState(false);
  const [staffConflictPreview, setStaffConflictPreview] = useState<AppointmentStaffConflictPreview | null>(null);
  const [isStaffConflictLoading, setIsStaffConflictLoading] = useState(false);
  const [staffWarningOverrideSaving, setStaffWarningOverrideSaving] = useState(false);
  const [staffWarningReason, setStaffWarningReason] = useState("");
  const [overriddenStaffWarnings, setOverriddenStaffWarnings] = useState<Record<string, true>>({});
  const [resourcePlanning, setResourcePlanning] = useState<AppointmentResourcePlanning | null>(null);
  const [isResourcePlanningLoading, setIsResourcePlanningLoading] = useState(false);
  const [candidateAvailability, setCandidateAvailability] = useState<AppointmentResourceCandidateAvailability | null>(null);
  const [isCandidateAvailabilityLoading, setIsCandidateAvailabilityLoading] = useState(false);
  const [resourceRequirementSavingCode, setResourceRequirementSavingCode] = useState<string | null>(null);
  const [resourceCandidateSavingCode, setResourceCandidateSavingCode] = useState<string | null>(null);
  const [resourceHoldSavingReservationId, setResourceHoldSavingReservationId] = useState<string | null>(null);
  const [resourceReleaseSavingReservationId, setResourceReleaseSavingReservationId] = useState<string | null>(null);
  const [resourceReplacementSavingReservationId, setResourceReplacementSavingReservationId] = useState<string | null>(null);
  const [resourceWarningOverrideSavingReservationId, setResourceWarningOverrideSavingReservationId] = useState<string | null>(null);
  const [overriddenResourceWarnings, setOverriddenResourceWarnings] = useState<Record<string, true>>({});
  const [resourceActionReasonNotes, setResourceActionReasonNotes] = useState<Record<string, string>>({});
  const [selectedResourceCandidates, setSelectedResourceCandidates] = useState<Record<string, string>>({});
  const [ownerTransferUserId, setOwnerTransferUserId] = useState("");
  const [ownerTransferReason, setOwnerTransferReason] = useState("");
  const [isOwnerTransferSaving, setIsOwnerTransferSaving] = useState(false);
  const [resolutionFilter, setResolutionFilter] = useState<AppointmentResolutionWorkbenchFilter>("all");
  const [resolutionSort, setResolutionSort] = useState<AppointmentResolutionWorkbenchSort>("priority");
  const [showDormantWorkbenchItems, setShowDormantWorkbenchItems] = useState(false);
  const [resolutionOwnerId, setResolutionOwnerId] = useState(defaultResolutionOwnerId);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedResolutionIds, setSelectedResolutionIds] = useState<Record<string, true>>({});
  const [resolutionStateByAppointmentId, setResolutionStateByAppointmentId] = useState<Record<string, AppointmentResolutionState>>({});
  const [auditTimelineFilter, setAuditTimelineFilter] = useState<AppointmentAuditTimelineFilter>("all");
  const [commandCenterAuditEvents, setCommandCenterAuditEvents] = useState<AppointmentAuditTimelineEvent[]>([]);
  const [reportQueueFilter, setReportQueueFilter] = useState<AppointmentResolutionWorkbenchFilter>("all");
  const [reportOwnerFilter, setReportOwnerFilter] = useState("all");
  const [reportExportFormat, setReportExportFormat] = useState<AppointmentCommandCenterExportFormat>("summary");
  const [commandCenterSearchQuery, setCommandCenterSearchQuery] = useState("");
  const [commandCenterSearchPreset, setCommandCenterSearchPreset] =
    useState<AppointmentCommandCenterSearchPreset>("all");
  const [commandCenterSearchScope, setCommandCenterSearchScope] =
    useState<AppointmentCommandCenterSearchScope>("all");
  const [savedCommandCenterViews, setSavedCommandCenterViews] = useState(
    initialSavedCommandCenterViews
  );
  const [defaultCommandCenterViewId, setDefaultCommandCenterViewId] = useState(defaultSavedViewId);
  const [activeCommandCenterViewId, setActiveCommandCenterViewId] = useState(defaultSavedViewId);
  const [savedViewDraftName, setSavedViewDraftName] = useState("");
  const [commandCenterSubscriptions, setCommandCenterSubscriptions] = useState(
    initialCommandCenterSubscriptions
  );
  const [commandCenterDigests, setCommandCenterDigests] = useState(initialCommandCenterDigests);
  const [selectedCommandCenterDigestId, setSelectedCommandCenterDigestId] = useState(
    initialCommandCenterDigests[0]?.id ?? ""
  );
  const [commandCenterDigestReason, setCommandCenterDigestReason] = useState("");
  const [commandCenterDigestHistory, setCommandCenterDigestHistory] = useState(
    initialCommandCenterDigestHistory
  );
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [actionNotice, setActionNotice] = useState("Operational command bridge ready. Persisted appointments can now use the live command API for check-in and no-show actions.");

  async function loadLiveAppointments(options: { suppressSuccessNotice?: boolean } = {}) {
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
      if (!options.suppressSuccessNotice) {
        setActionNotice(
          appointmentsFromReadModel.length > 0
            ? `Loaded ${appointmentsFromReadModel.length} live appointment${appointmentsFromReadModel.length === 1 ? "" : "s"} from the read model.`
            : "Live read model is connected. No persisted appointments were found for this day, so the approved preview board remains visible."
        );
      }

      return appointmentsFromReadModel;
    } catch (error) {
      setLiveAppointments([]);
      setActionNotice(
        error instanceof Error
          ? `Live read model could not load: ${error.message}. Preview board remains visible.`
          : "Live read model could not load. Preview board remains visible."
      );

      return [];
    } finally {
      setIsLiveLoading(false);
    }
  }

  function getResourceActionReason(action: ResourceAuditAction, reservationId: string) {
    return resourceActionReasonNotes[resourceAuditKey(action, reservationId)]?.trim() ?? "";
  }

  function updateResourceActionReason(
    action: ResourceAuditAction,
    reservationId: string,
    value: string
  ) {
    setResourceActionReasonNotes((current) => ({
      ...current,
      [resourceAuditKey(action, reservationId)]: value
    }));
  }

  function clearResourceActionReason(action: ResourceAuditAction, reservationId: string) {
    setResourceActionReasonNotes((current) => {
      const next = { ...current };
      delete next[resourceAuditKey(action, reservationId)];

      return next;
    });
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

  const unscheduledDraftAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => isUnscheduledDraftAppointment(appointment)),
    [filteredAppointments]
  );

  const activeExceptionAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) => {
        const resolutionStatus = resolutionStateByAppointmentId[appointment.id]?.status;
        return resolutionStatus !== "resolved" && resolutionStatus !== "snoozed";
      }),
    [filteredAppointments, resolutionStateByAppointmentId]
  );

  const exceptionQueues = useMemo(
    () => buildAppointmentExceptionQueues(activeExceptionAppointments),
    [activeExceptionAppointments]
  );
  const activeExceptionQueueCount = exceptionQueues.filter((queue) => queue.items.length > 0).length;
  const resolutionWorkbenchItems = useMemo(
    () =>
      buildAppointmentResolutionWorkbench(filteredAppointments, resolutionStateByAppointmentId, {
        filter: resolutionFilter,
        includeDormant: showDormantWorkbenchItems,
        sort: resolutionSort
      }),
    [
      filteredAppointments,
      resolutionFilter,
      resolutionSort,
      resolutionStateByAppointmentId,
      showDormantWorkbenchItems
    ]
  );
  const selectedResolutionItemIds = useMemo(
    () =>
      resolutionWorkbenchItems
        .filter((item) => selectedResolutionIds[item.appointment.id])
        .map((item) => item.appointment.id),
    [resolutionWorkbenchItems, selectedResolutionIds]
  );
  const breachedResolutionCount = resolutionWorkbenchItems.filter((item) => item.slaStatus === "breached").length;
  const escalatedResolutionCount = resolutionWorkbenchItems.filter((item) => item.resolutionStatus === "escalated").length;
  const selectedAppointment =
    boardAppointments.find((appointment) => appointment.id === selectedId) ?? filteredAppointments[0] ?? boardAppointments[0];
  const selectedAppointmentAuditTimeline = useMemo(
    () =>
      buildAppointmentAuditTimeline({
        appointment: selectedAppointment,
        resolutionState: resolutionStateByAppointmentId[selectedAppointment.id],
        commandCenterEvents: commandCenterAuditEvents
      }).filter((event) => auditTimelineFilter === "all" || event.lane === auditTimelineFilter),
    [
      auditTimelineFilter,
      commandCenterAuditEvents,
      resolutionStateByAppointmentId,
      selectedAppointment
    ]
  );
  const auditTimelineCounts = useMemo(
    () => ({
      manager: selectedAppointmentAuditTimeline.filter((event) => event.lane === "manager").length,
      automation: selectedAppointmentAuditTimeline.filter((event) => event.lane === "automation").length,
      task: selectedAppointmentAuditTimeline.filter((event) => event.lane === "task").length
    }),
    [selectedAppointmentAuditTimeline]
  );
  const reportWorkbenchItems = useMemo(() => {
    const queueScopedItems = buildAppointmentResolutionWorkbench(
      filteredAppointments,
      resolutionStateByAppointmentId,
      {
        filter: reportQueueFilter,
        includeDormant: false,
        sort: "priority"
      }
    );

    if (reportOwnerFilter === "all") {
      return queueScopedItems;
    }

    return queueScopedItems.filter((item) => {
      const resolvedOwnerId =
        resolutionStateByAppointmentId[item.appointment.id]?.ownerId ?? item.appointment.staffId;
      return resolvedOwnerId === reportOwnerFilter;
    });
  }, [
    filteredAppointments,
    reportOwnerFilter,
    reportQueueFilter,
    resolutionStateByAppointmentId
  ]);
  const commandCenterReport = useMemo(
    () =>
      buildAppointmentCommandCenterReport({
        generatedForLabel: `${businessDate} · Focus ${selectedAppointment.id}`,
        workbenchItems: reportWorkbenchItems,
        auditTimelineEvents: selectedAppointmentAuditTimeline
      }),
    [reportWorkbenchItems, selectedAppointment.id, selectedAppointmentAuditTimeline]
  );
  const commandCenterExportPreview = useMemo(
    () =>
      buildAppointmentCommandCenterExport({
        format: reportExportFormat,
        report: commandCenterReport,
        auditTimelineEvents: selectedAppointmentAuditTimeline
      }),
    [commandCenterReport, reportExportFormat, selectedAppointmentAuditTimeline]
  );
  const allCommandCenterAuditTimelineEvents = useMemo(
    () =>
      boardAppointments.flatMap((appointment) =>
        buildAppointmentAuditTimeline({
          appointment,
          resolutionState: resolutionStateByAppointmentId[appointment.id],
          commandCenterEvents: commandCenterAuditEvents
        })
      ),
    [boardAppointments, commandCenterAuditEvents, resolutionStateByAppointmentId]
  );
  const commandCenterSearchResults = useMemo(
    () =>
      buildAppointmentCommandCenterSearchResults({
        appointments: boardAppointments,
        resolutionStateByAppointmentId,
        query: commandCenterSearchQuery,
        preset: commandCenterSearchPreset,
        scope: commandCenterSearchScope,
        commandCenterAuditEvents
      }),
    [
      boardAppointments,
      commandCenterAuditEvents,
      commandCenterSearchPreset,
      commandCenterSearchQuery,
      commandCenterSearchScope,
      resolutionStateByAppointmentId
    ]
  );
  const commandCenterSearchResultCountLabel = `${commandCenterSearchResults.length} result${
    commandCenterSearchResults.length === 1 ? "" : "s"
  }`;
  const currentCommandCenterViewConfig = useMemo(
    () => ({
      searchQuery: commandCenterSearchQuery,
      searchPreset: commandCenterSearchPreset,
      searchScope: commandCenterSearchScope,
      resolutionFilter,
      reportQueueFilter,
      reportOwnerFilter,
      auditTimelineFilter
    }),
    [
      auditTimelineFilter,
      commandCenterSearchPreset,
      commandCenterSearchQuery,
      commandCenterSearchScope,
      reportOwnerFilter,
      reportQueueFilter,
      resolutionFilter
    ]
  );
  const commandCenterSubscriptionSummaries = useMemo(
    () =>
      buildAppointmentCommandCenterSubscriptionSummaries({
        appointments: boardAppointments,
        resolutionStateByAppointmentId,
        commandCenterAuditEvents,
        subscriptions: commandCenterSubscriptions
      }),
    [
      boardAppointments,
      commandCenterAuditEvents,
      commandCenterSubscriptions,
      resolutionStateByAppointmentId
    ]
  );
  const enabledCommandCenterSubscriptionCount = commandCenterSubscriptionSummaries.filter(
    (subscription) => subscription.enabled
  ).length;
  const commandCenterDigestSummaries = useMemo(
    () =>
      buildAppointmentCommandCenterDigestSummaries({
        appointments: boardAppointments,
        resolutionStateByAppointmentId,
        commandCenterAuditEvents,
        digests: commandCenterDigests
      }),
    [
      boardAppointments,
      commandCenterAuditEvents,
      commandCenterDigests,
      resolutionStateByAppointmentId
    ]
  );
  const selectedCommandCenterDigestSummary =
    commandCenterDigestSummaries.find((digest) => digest.id === selectedCommandCenterDigestId) ??
    commandCenterDigestSummaries[0] ??
    null;
  const commandCenterDigestPreview = useMemo(
    () =>
      selectedCommandCenterDigestSummary
        ? buildAppointmentCommandCenterDigestPreview({
            digest: selectedCommandCenterDigestSummary,
            report: commandCenterReport,
            focusedAppointment: selectedAppointment,
            auditTimelineEvents: selectedAppointmentAuditTimeline,
            businessDate
          })
        : "",
    [
      commandCenterReport,
      selectedAppointment,
      selectedAppointmentAuditTimeline,
      selectedCommandCenterDigestSummary
    ]
  );
  const enabledCommandCenterDigestCount = commandCenterDigestSummaries.filter(
    (digest) => digest.enabled
  ).length;

  const scheduledFilteredAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => !isUnscheduledDraftAppointment(appointment)),
    [filteredAppointments]
  );
  const selectedAppointmentIsUnscheduledDraft =
    selectedAppointment.dataSource === "live" &&
    isUnscheduledDraftAppointment(selectedAppointment);
  const selectedUnscheduledDraftCanProceedWithStaff =
    !selectedAppointmentIsUnscheduledDraft || Boolean(staffConflictPreview?.canProceedWithStaff);
  const selectedUnscheduledDraftStartsInPast =
    selectedAppointmentIsUnscheduledDraft &&
    isProposedScheduleStartInPast({
      localDate: scheduleDraft.localDate,
      startTime: scheduleDraft.startTime,
      timezone: selectedAppointment.schedulingTimezone ?? boardTimezone
    });

  const selectedStaff =
    visibleStaffMembers.find((staff) => staff.id === selectedAppointment.staffId) ?? visibleStaffMembers[0];

  const ownerTransferCandidates = useMemo(() => {
    const candidates = new Map<string, StaffMember>();

    for (const appointment of boardAppointments) {
      if (appointment.dataSource !== "live" || appointment.staffId === "unassigned-live") {
        continue;
      }

      candidates.set(appointment.staffId, {
        id: appointment.staffId,
        name: appointment.staffName ?? appointment.staffId,
        role: appointment.staffRole ?? "Appointment owner",
        initials: getInitials(appointment.staffName ?? appointment.staffId)
      });
    }

    for (const staffMember of staffConflictPreview?.staffMembers ?? []) {
      candidates.set(staffMember.userId, {
        id: staffMember.userId,
        name: staffMember.name,
        role:
          staffMember.role === "OWNER"
            ? "Appointment owner"
            : `Participant · ${staffMember.roleCode.replaceAll("_", " ")}`,
        initials: getInitials(staffMember.name)
      });
    }

    return Array.from(candidates.values())
      .filter((staff) => staff.id !== selectedAppointment.staffId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [boardAppointments, selectedAppointment.staffId, staffConflictPreview?.staffMembers]);

  const resolvedOwnerTransferUserId = ownerTransferCandidates.some(
    (staff) => staff.id === ownerTransferUserId
  )
    ? ownerTransferUserId
    : ownerTransferCandidates[0]?.id ?? "";

  const outcomeFieldValues =
    selectedAppointment.bookingStatus === "COMPLETED"
      ? {
          outcomeCode: selectedAppointment.outcomeCode ?? "COMPLETED",
          outcomeNotes: selectedAppointment.outcomeNotes ?? "",
          followUpDispositionCode:
            selectedAppointment.followUpDispositionCode ?? "NO_FOLLOW_UP_REQUIRED",
          followUpNotes: selectedAppointment.followUpNotes ?? "",
          reasonNotes: ""
        }
      : outcomeDraft;

  function resetOutcomeDraftFromAppointment(appointment: Appointment | null = null) {
    setOutcomeDraft({
      outcomeCode: appointment?.outcomeCode ?? "COMPLETED",
      outcomeNotes: appointment?.outcomeNotes ?? "",
      followUpDispositionCode:
        appointment?.followUpDispositionCode ?? "NO_FOLLOW_UP_REQUIRED",
      followUpNotes: appointment?.followUpNotes ?? "",
      reasonNotes: ""
    });
  }

  function selectAppointmentForDetail(appointment: Appointment) {
    setSelectedId(appointment.id);
    resetOutcomeDraftFromAppointment(appointment);
    setScheduleDraft((current) => ({
      ...current,
      reasonNotes: ""
    }));
  }

  async function copyCommandCenterExportPreview() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setActionNotice("Export preview is ready. Copy is not available in this browser context.");
      return;
    }

    try {
      await navigator.clipboard.writeText(commandCenterExportPreview);
      setActionNotice(`Copied ${reportExportFormat.toUpperCase()} command-center export preview to clipboard.`);
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? `Could not copy export preview: ${error.message}`
          : "Could not copy export preview."
      );
    }
  }

  function applySavedCommandCenterView(view: AppointmentCommandCenterSavedView) {
    setCommandCenterSearchQuery(view.config.searchQuery);
    setCommandCenterSearchPreset(view.config.searchPreset);
    setCommandCenterSearchScope(view.config.searchScope);
    setResolutionFilter(view.config.resolutionFilter);
    setReportQueueFilter(view.config.reportQueueFilter);
    setReportOwnerFilter(view.config.reportOwnerFilter);
    setAuditTimelineFilter(view.config.auditTimelineFilter);
    setActiveCommandCenterViewId(view.id);
    setSavedViewDraftName(view.name);
    setActionNotice(`Loaded saved view "${view.name}" into the command center.`);
  }

  function saveCurrentCommandCenterView() {
    const trimmedName = savedViewDraftName.trim();
    const existingView = activeCommandCenterViewId
      ? savedCommandCenterViews.find((view) => view.id === activeCommandCenterViewId)
      : undefined;
    const fallbackName = trimmedName.length > 0 ? trimmedName : existingView?.name ?? "Working View";
    const nextId = existingView?.id ?? `saved-view-${savedCommandCenterViews.length + 1}`;
    const nextView: AppointmentCommandCenterSavedView = {
      id: nextId,
      name: fallbackName,
      description: buildAppointmentCommandCenterSavedViewDescription(currentCommandCenterViewConfig),
      config: currentCommandCenterViewConfig
    };

    setSavedCommandCenterViews((current) => {
      if (existingView) {
        return current.map((view) => (view.id === existingView.id ? nextView : view));
      }

      return [...current, nextView];
    });
    setActiveCommandCenterViewId(nextId);
    setSavedViewDraftName("");
    setActionNotice(`Saved command-center view "${nextView.name}" for quick resume.`);
  }

  function setSavedCommandCenterViewAsStartup(viewId: string) {
    setDefaultCommandCenterViewId(viewId);
    const view = savedCommandCenterViews.find((candidate) => candidate.id === viewId);
    setActionNotice(
      view
        ? `"${view.name}" will open as the startup command-center view next time.`
        : "Startup command-center view updated."
    );
  }

  function toggleCommandCenterSubscription(subscriptionId: string) {
    setCommandCenterSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId
          ? { ...subscription, enabled: !subscription.enabled }
          : subscription
      )
    );
    const subscription = commandCenterSubscriptions.find((candidate) => candidate.id === subscriptionId);
    if (subscription) {
      setActionNotice(
        `${subscription.enabled ? "Paused" : "Resumed"} watch "${subscription.label}" in the command center.`
      );
    }
  }

  function openCommandCenterSubscription(
    subscription: AppointmentCommandCenterSubscriptionSummary
  ) {
    setCommandCenterSearchQuery("");

    if (subscription.watchType === "breached-sla") {
      setCommandCenterSearchPreset("breached-sla");
      setCommandCenterSearchScope("appointments");
      setResolutionFilter("breached-sla");
      setReportQueueFilter("breached-sla");
      setAuditTimelineFilter("all");
    } else if (subscription.watchType === "escalated") {
      setCommandCenterSearchPreset("escalated");
      setCommandCenterSearchScope("all");
      setResolutionFilter("escalated");
      setReportQueueFilter("escalated");
      setAuditTimelineFilter("manager");
    } else if (subscription.watchType === "no-show-recovery") {
      setCommandCenterSearchPreset("all");
      setCommandCenterSearchScope("appointments");
      setResolutionFilter("no-show-recovery");
      setReportQueueFilter("no-show-recovery");
      setAuditTimelineFilter("all");
    } else if (subscription.watchType === "follow-up-backlog") {
      setCommandCenterSearchPreset("all");
      setCommandCenterSearchScope("appointments");
      setResolutionFilter("follow-up-required");
      setReportQueueFilter("follow-up-required");
      setAuditTimelineFilter("all");
    } else {
      setCommandCenterSearchPreset("manager-activity");
      setCommandCenterSearchScope("timeline");
      setResolutionFilter("escalated");
      setReportQueueFilter("escalated");
      setAuditTimelineFilter("manager");
    }

    setSavedViewDraftName("");
    setActiveCommandCenterViewId("");
    setActionNotice(`Opened watch "${subscription.label}" in the command center.`);
  }

  function updateCommandCenterDigestPreference(
    digestId: string,
    patch: Partial<
      Pick<AppointmentCommandCenterDigestPreference, "channel" | "cadence" | "recipientLabel" | "enabled">
    >
  ) {
    setCommandCenterDigests((current) =>
      current.map((digest) => (digest.id === digestId ? { ...digest, ...patch } : digest))
    );
  }

  function focusCommandCenterDigest(digest: AppointmentCommandCenterDigestSummary) {
    setSelectedCommandCenterDigestId(digest.id);
    setCommandCenterDigestReason("");

    if (digest.watchType === "shift-handoff") {
      setCommandCenterSearchPreset("manager-activity");
      setCommandCenterSearchScope("all");
      setResolutionFilter("all");
      setReportQueueFilter("all");
      setAuditTimelineFilter("manager");
      setReportOwnerFilter("all");
      setCommandCenterSearchQuery("");
      setActiveCommandCenterViewId("");
      setActionNotice(`Opened digest "${digest.label}" and loaded the shift-handoff command-center scope.`);
      return;
    }

    openCommandCenterSubscription({
      id: digest.id,
      label: digest.label,
      description: digest.description,
      enabled: digest.enabled,
      count: digest.count,
      watchType: digest.watchType,
      tone: digest.tone
    });
    setSelectedCommandCenterDigestId(digest.id);
  }

  async function copyCommandCenterDigestPreview() {
    if (!selectedCommandCenterDigestSummary) {
      setActionNotice("Choose a digest before copying its preview.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setActionNotice("Digest preview is ready. Copy is not available in this browser context.");
      return;
    }

    try {
      await navigator.clipboard.writeText(commandCenterDigestPreview);
      setActionNotice(`Copied "${selectedCommandCenterDigestSummary.label}" preview to clipboard.`);
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? `Could not copy digest preview: ${error.message}`
          : "Could not copy digest preview."
      );
    }
  }

  function recordCommandCenterDigest(status: "previewed" | "sent") {
    if (!selectedCommandCenterDigestSummary) {
      setActionNotice("Choose a digest before previewing or sending.");
      return;
    }

    const reason = commandCenterDigestReason.trim() || "No additional manager note was recorded.";
    const generatedAtLabel = status === "sent" ? "Just now" : "Previewed just now";

    setCommandCenterDigestHistory((current) => [
      {
        id: `${selectedCommandCenterDigestSummary.id}-${status}-${current.length + 1}`,
        digestLabel: selectedCommandCenterDigestSummary.label,
        channel: selectedCommandCenterDigestSummary.channel,
        recipientLabel: selectedCommandCenterDigestSummary.recipientLabel,
        count: selectedCommandCenterDigestSummary.count,
        status,
        reason,
        generatedAtLabel
      },
      ...current
    ]);

    if (status === "sent") {
      setCommandCenterAuditEvents((current) => [
        {
          id: `digest-sent-${selectedCommandCenterDigestSummary.id}-${current.length + 1}`,
          appointmentId: selectedAppointment.id,
          lane: "manager",
          tone: "blue",
          title: "Notification digest sent",
          detail: `${selectedCommandCenterDigestSummary.label} sent via ${commandCenterDigestChannelLabel(
            selectedCommandCenterDigestSummary.channel
          )} to ${selectedCommandCenterDigestSummary.recipientLabel}. Reason: ${reason}`,
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        },
        ...current
      ]);
      setActionNotice(
        `Sent "${selectedCommandCenterDigestSummary.label}" to ${selectedCommandCenterDigestSummary.recipientLabel}.`
      );
    } else {
      setActionNotice(`Prepared "${selectedCommandCenterDigestSummary.label}" preview for manager review.`);
    }
  }

  function applyCommandCenterSearchPreset(preset: AppointmentCommandCenterSearchPreset) {
    setCommandCenterSearchPreset(preset);
    if (preset === "manager-activity") {
      setCommandCenterSearchScope("timeline");
      setAuditTimelineFilter("manager");
    } else {
      setCommandCenterSearchScope("all");
      setAuditTimelineFilter("all");
    }
  }

  function focusCommandCenterSearchResult(result: AppointmentCommandCenterSearchResult) {
    const appointment =
      boardAppointments.find((candidate) => candidate.id === result.appointmentId) ?? selectedAppointment;

    selectAppointmentForDetail(appointment);
    if (result.kind === "timeline") {
      const eventMatch = allCommandCenterAuditTimelineEvents.find((event) => `timeline-${event.id}` === result.id);
      if (eventMatch) {
        setAuditTimelineFilter(eventMatch.lane);
      }
    } else {
      setAuditTimelineFilter("all");
    }

    setActionNotice(`Focused ${result.appointmentId} from cross-appointment command-center search.`);
  }

  function toggleResolutionSelection(appointmentId: string) {
    setSelectedResolutionIds((current) => {
      const next = { ...current };

      if (next[appointmentId]) {
        delete next[appointmentId];
        return next;
      }

      next[appointmentId] = true;
      return next;
    });
  }

  function toggleSelectAllResolutionItems() {
    if (selectedResolutionItemIds.length === resolutionWorkbenchItems.length) {
      setSelectedResolutionIds({});
      return;
    }

    setSelectedResolutionIds(
      Object.fromEntries(resolutionWorkbenchItems.map((item) => [item.appointment.id, true]))
    );
  }

  function applyResolutionWorkbenchAction(
    action: "assign" | "snooze" | "escalate" | "resolve",
    appointmentIds: string[]
  ) {
    if (appointmentIds.length === 0) {
      setActionNotice("Select at least one exception item before applying a workbench action.");
      return;
    }

    const assignee =
      visibleStaffMembers.find((staff) => staff.id === resolutionOwnerId) ??
      staffMembers.find((staff) => staff.id === resolutionOwnerId) ??
      staffMembers[0];
    const noteSuffix = resolutionNote.trim() ? ` Reason captured: ${resolutionNote.trim()}` : "";

    setResolutionStateByAppointmentId((current) => {
      const next = { ...current };

      for (const appointmentId of appointmentIds) {
        const previous = current[appointmentId];

        if (action === "assign") {
          next[appointmentId] = {
            ...previous,
            status: previous?.status === "escalated" ? "escalated" : "assigned",
            ownerId: assignee.id,
            ownerName: assignee.name,
            note: resolutionNote.trim() || previous?.note,
            updatedAtLabel: "Assigned just now"
          };
          continue;
        }

        if (action === "snooze") {
          next[appointmentId] = {
            ...previous,
            status: "snoozed",
            ownerId: previous?.ownerId ?? assignee.id,
            ownerName: previous?.ownerName ?? assignee.name,
            note: resolutionNote.trim() || previous?.note,
            snoozedUntilLabel: "Tomorrow 9:00 AM",
            updatedAtLabel: "Snoozed just now"
          };
          continue;
        }

        if (action === "escalate") {
          next[appointmentId] = {
            ...previous,
            status: "escalated",
            ownerId: assignee.id,
            ownerName: assignee.name,
            note: resolutionNote.trim() || previous?.note,
            updatedAtLabel: "Escalated just now"
          };
          continue;
        }

        next[appointmentId] = {
          ...previous,
          status: "resolved",
          ownerId: previous?.ownerId ?? assignee.id,
          ownerName: previous?.ownerName ?? assignee.name,
          note: resolutionNote.trim() || previous?.note,
          updatedAtLabel: "Resolved just now"
        };
      }

      return next;
    });

    setCommandCenterAuditEvents((current) => {
      const nextEvents: AppointmentAuditTimelineEvent[] = [];

      for (const appointmentId of appointmentIds) {
        const appointment = boardAppointments.find((candidate) => candidate.id === appointmentId);
        if (!appointment) {
          continue;
        }

        nextEvents.push({
          id: `${appointmentId}-${action}-${current.length + nextEvents.length + 1}`,
          appointmentId,
          lane: "manager",
          tone:
            action === "resolve"
              ? "green"
              : action === "escalate"
                ? "purple"
                : action === "snooze"
                  ? "amber"
                  : "blue",
          title:
            action === "assign"
              ? "Owner assigned from workbench"
              : action === "snooze"
                ? "Exception snoozed"
                : action === "escalate"
                  ? "Manager escalation recorded"
                  : "Exception resolved",
          detail: appointmentAuditDetailForResolution(
            action === "assign"
              ? "assigned"
              : action === "snooze"
                ? "snoozed"
                : action === "escalate"
                  ? "escalated"
                  : "resolved",
            appointment,
            {
              status:
                action === "assign"
                  ? "assigned"
                  : action === "snooze"
                    ? "snoozed"
                    : action === "escalate"
                      ? "escalated"
                      : "resolved",
              ownerId: assignee.id,
              ownerName: assignee.name,
              note: resolutionNote.trim() || undefined,
              snoozedUntilLabel: action === "snooze" ? "Tomorrow 9:00 AM" : undefined,
              updatedAtLabel: "Just now"
            }
          ),
          actor: assignee.name,
          occurredAtLabel: "Just now"
        });
      }

      return [...nextEvents, ...current];
    });

    setSelectedResolutionIds({});
    setResolutionNote("");

    const itemCountLabel = `${appointmentIds.length} exception item${appointmentIds.length === 1 ? "" : "s"}`;
    if (action === "assign") {
      setActionNotice(`Assigned ${itemCountLabel} to ${assignee.name}.${noteSuffix}`);
      return;
    }

    if (action === "snooze") {
      setActionNotice(`Snoozed ${itemCountLabel} until tomorrow 9:00 AM.${noteSuffix}`);
      return;
    }

    if (action === "escalate") {
      setActionNotice(`Escalated ${itemCountLabel} into the manager resolution lane.${noteSuffix}`);
      return;
    }

    setActionNotice(`Resolved ${itemCountLabel} from the command center workbench.${noteSuffix}`);
  }

  useEffect(() => {
    const visibleIds = new Set(resolutionWorkbenchItems.map((item) => item.appointment.id));

    setSelectedResolutionIds((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([appointmentId]) => visibleIds.has(appointmentId))
      ) as Record<string, true>
    );
  }, [resolutionWorkbenchItems]);

  useEffect(() => {
    let isActive = true;

    async function loadResourcePlanning() {
      if (!selectedAppointment.recordId) {
        setResourcePlanning(null);
        setIsResourcePlanningLoading(false);
        return;
      }

      setIsResourcePlanningLoading(true);

      try {
        const response = await fetch(
          `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-planning`
        );
        const result = (await response.json().catch(() => null)) as
          | { resourcePlanning?: AppointmentResourcePlanning; error?: string }
          | null;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result?.resourcePlanning) {
          throw new Error(result?.error || "Unable to load resource planning.");
        }

        setResourcePlanning(result.resourcePlanning);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setResourcePlanning(null);
        setActionNotice(
          error instanceof Error
            ? `Resource planning could not load: ${error.message}`
            : "Resource planning could not load."
        );
      } finally {
        if (isActive) {
          setIsResourcePlanningLoading(false);
        }
      }
    }

    void loadResourcePlanning();

    return () => {
      isActive = false;
    };
  }, [detailRefreshKey, selectedAppointment.recordId, selectedAppointment.status]);

  useEffect(() => {
    let isActive = true;

    async function loadCandidateAvailability() {
      if (selectedAppointment.status !== "draft" || !selectedAppointment.recordId) {
        setCandidateAvailability(null);
        setIsCandidateAvailabilityLoading(false);
        return;
      }

      setIsCandidateAvailabilityLoading(true);

      try {
        let candidateAvailabilityUrl = `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-candidate-availability`;

        if (selectedAppointmentIsUnscheduledDraft) {
          const startsAt = localDateTimeToMinneapolisIso(
            scheduleDraft.localDate,
            scheduleDraft.startTime,
            selectedAppointment.schedulingTimezone ?? boardTimezone
          );
          const endsAt = addMinutesToIso(startsAt, scheduleDraft.durationMinutes);
          const params = new URLSearchParams({
            proposedStartsAt: startsAt,
            proposedEndsAt: endsAt,
            proposedSchedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
          });

          candidateAvailabilityUrl = `${candidateAvailabilityUrl}?${params.toString()}`;
        }

        const response = await fetch(candidateAvailabilityUrl);
        const result = (await response.json().catch(() => null)) as
          | {
              resourceCandidateAvailability?: AppointmentResourceCandidateAvailability;
              error?: string;
            }
          | null;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result?.resourceCandidateAvailability) {
          throw new Error(result?.error || "Unable to load resource candidate availability.");
        }

        setCandidateAvailability(result.resourceCandidateAvailability);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCandidateAvailability(null);
        setActionNotice(
          error instanceof Error
            ? `Resource candidate availability could not load: ${error.message}`
            : "Resource candidate availability could not load."
        );
      } finally {
        if (isActive) {
          setIsCandidateAvailabilityLoading(false);
        }
      }
    }

    void loadCandidateAvailability();

    return () => {
      isActive = false;
    };
  }, [
    detailRefreshKey,
    scheduleDraft.durationMinutes,
    scheduleDraft.localDate,
    scheduleDraft.startTime,
    selectedAppointment.recordId,
    selectedAppointment.schedulingTimezone,
    selectedAppointment.status,
    selectedAppointmentIsUnscheduledDraft,
    boardTimezone
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadScheduleReadiness() {
      if (selectedAppointment.status !== "draft" || !selectedAppointment.recordId) {
        setScheduleReadiness(null);
        setIsReadinessLoading(false);
        return;
      }

      setIsReadinessLoading(true);

      try {
        let readinessUrl = `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/schedule-readiness`;

        if (selectedAppointmentIsUnscheduledDraft) {
          const startsAt = localDateTimeToMinneapolisIso(
            scheduleDraft.localDate,
            scheduleDraft.startTime,
            selectedAppointment.schedulingTimezone ?? boardTimezone
          );
          const endsAt = addMinutesToIso(startsAt, scheduleDraft.durationMinutes);
          const params = new URLSearchParams({
            proposedStartsAt: startsAt,
            proposedEndsAt: endsAt,
            proposedSchedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
          });

          readinessUrl = `${readinessUrl}?${params.toString()}`;
        }

        const response = await fetch(
          readinessUrl
        );
        const result = (await response.json().catch(() => null)) as
          | { readiness?: AppointmentScheduleReadiness; error?: string }
          | null;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result?.readiness) {
          throw new Error(result?.error || "Unable to load schedule readiness.");
        }

        setScheduleReadiness(result.readiness);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setScheduleReadiness(null);
        setActionNotice(
          error instanceof Error
            ? `Schedule readiness could not load: ${error.message}`
            : "Schedule readiness could not load."
        );
      } finally {
        if (isActive) {
          setIsReadinessLoading(false);
        }
      }
    }

    void loadScheduleReadiness();

    return () => {
      isActive = false;
    };
  }, [
    detailRefreshKey,
    scheduleDraft.durationMinutes,
    scheduleDraft.localDate,
    scheduleDraft.startTime,
    selectedAppointment.recordId,
    selectedAppointment.schedulingTimezone,
    selectedAppointment.status,
    selectedAppointmentIsUnscheduledDraft,
    boardTimezone
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadStaffConflictPreview() {
      if (selectedAppointment.status !== "draft" || !selectedAppointment.recordId) {
        setStaffConflictPreview(null);
        setIsStaffConflictLoading(false);
        return;
      }

      setIsStaffConflictLoading(true);

      try {
        let staffConflictsUrl = `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/staff-conflicts`;

        if (selectedAppointmentIsUnscheduledDraft) {
          const startsAt = localDateTimeToMinneapolisIso(
            scheduleDraft.localDate,
            scheduleDraft.startTime,
            selectedAppointment.schedulingTimezone ?? boardTimezone
          );
          const endsAt = addMinutesToIso(startsAt, scheduleDraft.durationMinutes);
          const params = new URLSearchParams({
            proposedStartsAt: startsAt,
            proposedEndsAt: endsAt,
            proposedSchedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
          });

          staffConflictsUrl = `${staffConflictsUrl}?${params.toString()}`;
        }

        const response = await fetch(staffConflictsUrl);
        const result = (await response.json().catch(() => null)) as
          | { staffConflicts?: AppointmentStaffConflictPreview; error?: string }
          | null;

        if (!isActive) {
          return;
        }

        if (!response.ok || !result?.staffConflicts) {
          throw new Error(result?.error || "Unable to load staff conflict preview.");
        }

        setStaffConflictPreview(result.staffConflicts);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStaffConflictPreview(null);
        setActionNotice(
          error instanceof Error
            ? `Staff conflict preview could not load: ${error.message}`
            : "Staff conflict preview could not load."
        );
      } finally {
        if (isActive) {
          setIsStaffConflictLoading(false);
        }
      }
    }

    void loadStaffConflictPreview();

    return () => {
      isActive = false;
    };
  }, [
    detailRefreshKey,
    scheduleDraft.durationMinutes,
    scheduleDraft.localDate,
    scheduleDraft.startTime,
    selectedAppointment.recordId,
    selectedAppointment.schedulingTimezone,
    selectedAppointment.status,
    selectedAppointmentIsUnscheduledDraft,
    boardTimezone
  ]);

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
        draftAppointment.startTime,
        boardTimezone
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
          organizationId: boardOrganizationId,
          locationId: boardLocationId,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            appointmentNumber,
            title: draftAppointment.title.trim(),
            sourceType: "MANUAL",
            sourceReference: draftAppointment.reason.trim(),
            startsAt,
            endsAt,
            schedulingTimezone: boardTimezone,
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
      resetOutcomeDraftFromAppointment();
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

  async function attachResourceRequirement(
    recommendation: AppointmentResourcePlanning["recommendations"][number]
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource requirements can only be attached to persisted live draft appointments.");
      return;
    }

    if (!recommendation.resourceTypeId) {
      setActionNotice(`${recommendation.resourceTypeCode} must be configured before this requirement can be attached.`);
      return;
    }

    if (recommendation.selectedRequirementId) {
      setActionNotice(`${recommendation.label} is already attached to this appointment.`);
      return;
    }

    setResourceRequirementSavingCode(recommendation.requirementCode);

    try {
      const correlationId = createAppointmentActionIdentifier(
        "resource-requirement",
        selectedAppointment.recordId
      );
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-requirements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requirementCode: recommendation.requirementCode,
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_REQUIREMENT_ADDED",
            reasonNotes: `Attached recommended ${recommendation.label} requirement from Appointment Board resource planning.`,
            correlationId
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            requirement?: {
              requirementCode: string;
              created: boolean;
              appointmentVersion: number;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.requirement) {
        throw new Error(result?.error || "Unable to attach the resource requirement.");
      }

      setActionNotice(
        result.requirement.created
          ? `${recommendation.label} requirement was attached. Schedule readiness and resource planning are refreshing.`
          : `${recommendation.label} requirement was already attached. Schedule readiness and resource planning are refreshing.`
      );
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to attach the resource requirement right now."
      );
    } finally {
      setResourceRequirementSavingCode(null);
    }
  }

  async function proposeResourceCandidate(
    recommendation: AppointmentResourcePlanning["recommendations"][number]
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource candidates can only be proposed for persisted live draft appointments.");
      return;
    }

    if (!recommendation.selectedRequirementId) {
      setActionNotice(`Attach the ${recommendation.label} requirement before proposing a resource candidate.`);
      return;
    }

    const selectedResourceId =
      selectedResourceCandidates[recommendation.requirementCode] ??
      recommendation.selectedReservation?.resourceId ??
      recommendation.candidates[0]?.id;

    if (!selectedResourceId) {
      setActionNotice(`No active ${recommendation.resourceTypeCode} candidate is available to propose.`);
      return;
    }

    setResourceCandidateSavingCode(recommendation.requirementCode);

    try {
      const selectedCandidate = recommendation.candidates.find(
        (candidate) => candidate.id === selectedResourceId
      );
      const correlationId = createAppointmentActionIdentifier(
        "resource-candidate",
        selectedAppointment.recordId
      );
      const proposedScheduleWindow = selectedAppointmentIsUnscheduledDraft
        ? (() => {
            const startsAt = localDateTimeToMinneapolisIso(
              scheduleDraft.localDate,
              scheduleDraft.startTime,
              selectedAppointment.schedulingTimezone ?? boardTimezone
            );

            return {
              proposedStartsAt: startsAt,
              proposedEndsAt: addMinutesToIso(startsAt, scheduleDraft.durationMinutes),
              proposedSchedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
            };
          })()
        : {};
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-requirements/${encodeURIComponent(recommendation.selectedRequirementId)}/candidate-proposals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            resourceId: selectedResourceId,
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: selectedAppointmentIsUnscheduledDraft
              ? `Proposed ${selectedCandidate?.name ?? "selected resource"} for ${recommendation.label} from Appointment Board resource planning for ${scheduleDraft.localDate} ${scheduleDraft.startTime}.`
              : `Proposed ${selectedCandidate?.name ?? "selected resource"} for ${recommendation.label} from Appointment Board resource planning.`,
            correlationId,
            ...proposedScheduleWindow
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            proposal?: {
              resourceName: string;
              created: boolean;
              appointmentVersion: number;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.proposal) {
        throw new Error(result?.error || "Unable to propose the resource candidate.");
      }

      setActionNotice(
        result.proposal.created
          ? `${result.proposal.resourceName} was proposed for ${recommendation.label}. Schedule readiness and resource planning are refreshing.`
          : `${result.proposal.resourceName} was already proposed for ${recommendation.label}. Schedule readiness and resource planning are refreshing.`
      );
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to propose the resource candidate right now."
      );
    } finally {
      setResourceCandidateSavingCode(null);
    }
  }

  async function holdResourceCandidate(
    recommendation: AppointmentResourcePlanning["recommendations"][number],
    availability: AppointmentResourceCandidateAvailability["proposals"][number] | undefined
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource candidates can only be held for persisted live draft appointments.");
      return;
    }

    if (!recommendation.selectedReservation) {
      setActionNotice(`Propose a ${recommendation.label} candidate before placing a hold.`);
      return;
    }

    if (availability && !availability.canProceedToHold) {
      setActionNotice(
        availability.warningOverrideRequired && !availability.warningOverrideSatisfied
          ? "Hold is blocked until a manager records the warning override."
          : `Hold is blocked: ${availability.reasons.length > 0 ? availability.reasons.join(" ") : "resource candidate is not available."}`
      );
      return;
    }

    setResourceHoldSavingReservationId(recommendation.selectedReservation.id);

    try {
      const correlationId = createAppointmentActionIdentifier(
        "resource-hold",
        selectedAppointment.recordId
      );
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-reservations/${encodeURIComponent(recommendation.selectedReservation.id)}/hold`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_CANDIDATE_HELD",
            reasonNotes: `Held ${recommendation.selectedReservation.resourceName} for ${recommendation.label} from Appointment Board resource planning.`,
            correlationId
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            reservation?: {
              resourceName: string;
              status: "HELD";
              appointmentVersion: number;
              availabilityStatus: "READY" | "WARNING";
              warningReasons: string[];
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.reservation) {
        throw new Error(result?.error || "Unable to hold the resource candidate.");
      }

      setActionNotice(
        result.reservation.availabilityStatus === "WARNING"
          ? `${result.reservation.resourceName} was held with a warning. ${result.reservation.warningReasons.join(" ")}`
          : `${result.reservation.resourceName} is now held for ${recommendation.label}. Schedule readiness and resource planning are refreshing.`
      );
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to hold the resource candidate right now."
      );
    } finally {
      setResourceHoldSavingReservationId(null);
    }
  }

  async function overrideResourceWarning(
    recommendation: AppointmentResourcePlanning["recommendations"][number],
    availability: AppointmentResourceCandidateAvailability["proposals"][number] | undefined
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource warnings can only be overridden for persisted live draft appointments.");
      return;
    }

    if (selectedAppointment.status !== "draft") {
      setActionNotice("Resource warning overrides are currently available before scheduling.");
      return;
    }

    if (!recommendation.selectedReservation || recommendation.selectedReservation.status !== "PROPOSED") {
      setActionNotice(`Propose a ${recommendation.label} candidate before overriding a warning.`);
      return;
    }

    if (availability?.status !== "WARNING") {
      setActionNotice("Only warning-level resource conflicts can be overridden. Hard blocks still require a different resource or time.");
      return;
    }

    const userReason = getResourceActionReason(
      "warning-override",
      recommendation.selectedReservation.id
    );

    if (!userReason) {
      setActionNotice("Add a manager reason before overriding this resource warning.");
      return;
    }

    setResourceWarningOverrideSavingReservationId(recommendation.selectedReservation.id);

    try {
      const correlationId = createAppointmentActionIdentifier(
        "resource-warning-override",
        selectedAppointment.recordId
      );
      const reasonText =
        availability.reasons.length > 0
          ? availability.reasons.join(" ")
          : "Manager accepted resource warning policy.";
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-reservations/${encodeURIComponent(recommendation.selectedReservation.id)}/warning-override`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
            reasonNotes: buildResourceReasonNote(
              `Manager accepted warning for ${recommendation.selectedReservation.resourceName} on ${recommendation.label}: ${reasonText}`,
              userReason
            ),
            correlationId
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            warningOverride?: {
              reservationId: string;
              resourceName: string;
              appointmentVersion: number;
              reasons: string[];
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.warningOverride) {
        throw new Error(result?.error || "Unable to override the resource warning.");
      }

      setOverriddenResourceWarnings((current) => ({
        ...current,
        [result.warningOverride!.reservationId]: true
      }));
      setActionNotice(
        `${result.warningOverride.resourceName} warning was overridden with a documented manager reason. You can now continue the resource planning workflow.`
      );
      clearResourceActionReason("warning-override", recommendation.selectedReservation.id);
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to override the resource warning right now."
      );
    } finally {
      setResourceWarningOverrideSavingReservationId(null);
    }
  }

  async function overrideStaffWarning() {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Staff warnings can only be overridden for persisted live draft appointments.");
      return;
    }

    if (selectedAppointment.status !== "draft") {
      setActionNotice("Staff warning overrides are currently available before scheduling.");
      return;
    }

    if (
      !staffConflictPreview ||
      staffConflictPreview.status !== "WARNING" ||
      !staffConflictPreview.warningOverrideRequired
    ) {
      setActionNotice("Only warning-level staff conflicts can be overridden.");
      return;
    }

    if (!staffWarningReason.trim()) {
      setActionNotice("Add a manager reason before overriding this staff warning.");
      return;
    }

    setStaffWarningOverrideSaving(true);

    try {
      const correlationId = createAppointmentActionIdentifier(
        "staff-warning-override",
        selectedAppointment.recordId
      );
      const reasonText =
        staffConflictPreview.reasons.length > 0
          ? staffConflictPreview.reasons.join(" ")
          : "Manager accepted staff warning policy.";
      const proposedScheduleWindow = selectedAppointmentIsUnscheduledDraft
        ? (() => {
            const startsAt = localDateTimeToMinneapolisIso(
              scheduleDraft.localDate,
              scheduleDraft.startTime,
              selectedAppointment.schedulingTimezone ?? boardTimezone
            );

            return {
              proposedStartsAt: startsAt,
              proposedEndsAt: addMinutesToIso(startsAt, scheduleDraft.durationMinutes),
              proposedSchedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
            };
          })()
        : {};
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/staff-conflicts/override`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "STAFF_WARNING_OVERRIDDEN",
            reasonNotes: buildResourceReasonNote(
              `Manager accepted staff warning for ${staffConflictPreview.staff?.name ?? "required staff"}${
                staffConflictPreview.staff?.roleCode
                  ? ` (${staffConflictPreview.staff.roleCode.replaceAll("_", " ")})`
                  : ""
              }${
                selectedAppointmentIsUnscheduledDraft
                  ? ` for proposed slot ${scheduleDraft.localDate} ${scheduleDraft.startTime}`
                  : ""
              }: ${reasonText}`,
              staffWarningReason
            ),
            correlationId,
            ...proposedScheduleWindow
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            staffWarningOverride?: {
              warningKey: string;
              staffName: string;
              staffRole?: "OWNER" | "PARTICIPANT";
              staffRoleCode?: string;
              appointmentVersion: number;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.staffWarningOverride) {
        throw new Error(result?.error || "Unable to override the staff warning.");
      }

      setOverriddenStaffWarnings((current) => ({
        ...current,
        [result.staffWarningOverride!.warningKey]: true
      }));
      setStaffWarningReason("");
      setActionNotice(
        `${result.staffWarningOverride.staffName}${
          result.staffWarningOverride.staffRoleCode
            ? ` (${result.staffWarningOverride.staffRoleCode.replaceAll("_", " ")})`
            : ""
        } staff warning was overridden with a documented manager reason.`
      );
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Unable to override the staff warning right now."
      );
    } finally {
      setStaffWarningOverrideSaving(false);
    }
  }

  async function releaseResourceReservation(
    recommendation: AppointmentResourcePlanning["recommendations"][number]
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource reservations can only be released for persisted live appointments.");
      return;
    }

    if (!recommendation.selectedReservation) {
      setActionNotice(`No ${recommendation.label} reservation is selected for release.`);
      return;
    }

    if (!["HELD", "COMMITTED"].includes(recommendation.selectedReservation.status)) {
      setActionNotice("Only held or committed reservations can be released from this control.");
      return;
    }

    const userReason = getResourceActionReason("release", recommendation.selectedReservation.id);

    if (!userReason) {
      setActionNotice("Add a release reason before releasing this resource reservation.");
      return;
    }

    setResourceReleaseSavingReservationId(recommendation.selectedReservation.id);

    try {
      const correlationId = createAppointmentActionIdentifier(
        "resource-release",
        selectedAppointment.recordId
      );
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-reservations/${encodeURIComponent(recommendation.selectedReservation.id)}/release`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_RESERVATION_RELEASED",
            reasonNotes: buildResourceReasonNote(
              `Released ${recommendation.selectedReservation.resourceName} from ${recommendation.label} in Appointment Board resource planning.`,
              userReason
            ),
            correlationId
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            reservation?: {
              resourceName: string;
              priorStatus: "HELD" | "COMMITTED";
              status: "RELEASED";
              appointmentVersion: number;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.reservation) {
        throw new Error(result?.error || "Unable to release the resource reservation.");
      }

      setActionNotice(
        `${result.reservation.resourceName} was released from ${result.reservation.priorStatus.toLowerCase()} reservation status. Schedule readiness and resource planning are refreshing.`
      );
      clearResourceActionReason("release", recommendation.selectedReservation.id);
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to release the resource reservation right now."
      );
    } finally {
      setResourceReleaseSavingReservationId(null);
    }
  }

  async function replaceResourceReservation(
    recommendation: AppointmentResourcePlanning["recommendations"][number]
  ) {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Resource reservations can only be replaced for persisted live appointments.");
      return;
    }

    if (
      !recommendation.selectedReservation ||
      !["HELD", "COMMITTED"].includes(recommendation.selectedReservation.status)
    ) {
      setActionNotice(`Hold or schedule a ${recommendation.label} reservation before replacing it.`);
      return;
    }

    const selectedResourceId =
      selectedResourceCandidates[recommendation.requirementCode] ??
      recommendation.candidates.find(
        (candidate) => candidate.id !== recommendation.selectedReservation?.resourceId
      )?.id;

    if (!selectedResourceId) {
      setActionNotice(`No replacement ${recommendation.resourceTypeCode} candidate is available.`);
      return;
    }

    if (selectedResourceId === recommendation.selectedReservation.resourceId) {
      setActionNotice("Choose a different resource before replacing the current reservation.");
      return;
    }

    const userReason = getResourceActionReason("replace", recommendation.selectedReservation.id);

    if (!userReason) {
      setActionNotice("Add a replacement reason before replacing this reservation.");
      return;
    }

    setResourceReplacementSavingReservationId(recommendation.selectedReservation.id);

    try {
      const selectedCandidate = recommendation.candidates.find(
        (candidate) => candidate.id === selectedResourceId
      );
      const correlationId = createAppointmentActionIdentifier(
        "resource-replacement",
        selectedAppointment.recordId
      );
      const response = await fetch(
        `/api/appointments/${encodeURIComponent(selectedAppointment.recordId)}/resource-reservations/${encodeURIComponent(recommendation.selectedReservation.id)}/replace`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            resourceId: selectedResourceId,
            expectedAppointmentVersion: selectedAppointment.recordVersion,
            reasonCode: "RESOURCE_RESERVATION_REPLACED",
            reasonNotes: buildResourceReasonNote(
              `Replaced ${recommendation.selectedReservation.resourceName} with ${selectedCandidate?.name ?? "selected resource"} for ${recommendation.label} from Appointment Board resource planning.`,
              userReason
            ),
            correlationId
          })
        }
      );
      const result = (await response.json().catch(() => null)) as
        | {
            replacement?: {
              resourceName: string;
              releasedResourceName: string;
              status: "PROPOSED" | "COMMITTED";
              availabilityStatus?: "READY" | "WARNING";
              warningReasons?: string[];
              releasedPriorStatus: "HELD" | "COMMITTED";
              appointmentVersion: number;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.replacement) {
        throw new Error(result?.error || "Unable to replace the resource reservation.");
      }

      setActionNotice(
        result.replacement.status === "COMMITTED"
          ? `${result.replacement.releasedResourceName} was released and ${result.replacement.resourceName} is now committed as the replacement.${
              result.replacement.availabilityStatus === "WARNING"
                ? ` Manager warning accepted: ${(result.replacement.warningReasons ?? []).join(" ")}`
                : ""
            }`
          : `${result.replacement.releasedResourceName} was released and ${result.replacement.resourceName} was proposed as the replacement. Review availability, then hold the new candidate.`
      );
      clearResourceActionReason("replace", recommendation.selectedReservation.id);
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Unable to replace the resource reservation right now."
      );
    } finally {
      setResourceReplacementSavingReservationId(null);
    }
  }

  async function transferAppointmentOwner() {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice("Owner reassignment can only be submitted for persisted live appointments.");
      return;
    }

    if (!resolvedOwnerTransferUserId) {
      setActionNotice("Choose a new accountable owner before submitting the reassignment.");
      return;
    }

    if (resolvedOwnerTransferUserId === selectedAppointment.staffId) {
      setActionNotice("Choose a different owner before submitting the reassignment.");
      return;
    }

    if (!ownerTransferReason.trim()) {
      setActionNotice("Owner reassignment requires a documented manager reason.");
      return;
    }

    const selectedOwner = ownerTransferCandidates.find(
      (candidate) => candidate.id === resolvedOwnerTransferUserId
    );

    setIsOwnerTransferSaving(true);

    try {
      const idempotencyKey = createAppointmentActionIdentifier(
        "transfer-owner",
        selectedAppointment.recordId
      );
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commandType: "TRANSFER_OWNER",
          appointmentId: selectedAppointment.recordId,
          expectedAppointmentVersion: selectedAppointment.recordVersion,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            ownerUserId: resolvedOwnerTransferUserId,
            reasonCode: "APPOINTMENT_OWNER_TRANSFERRED",
            reasonNotes: buildResourceReasonNote(
              `Transferred accountable owner from ${selectedAppointment.staffName ?? selectedAppointment.staffId} to ${selectedOwner?.name ?? resolvedOwnerTransferUserId} from Appointment Board owner controls.`,
              ownerTransferReason
            )
          }
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(
          result?.error ||
            result?.execution?.rejectionReasons?.join(" ") ||
            "Owner reassignment could not be completed."
        );
      }

      setOwnerTransferReason("");
      setActionNotice(
        `Owner reassignment saved for ${selectedAppointment.id}: ${selectedOwner?.name ?? resolvedOwnerTransferUserId} is now accountable. History and command ledger were updated.`
      );
      setDetailRefreshKey((value) => value + 1);
      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Owner reassignment could not be completed."
      );
    } finally {
      setIsOwnerTransferSaving(false);
    }
  }

  async function submitUnscheduledDraftSchedule() {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice(
        `Schedule Draft is wired to the live command API, but ${selectedAppointment.id} is still preview data.`
      );
      return;
    }

    if (!selectedAppointmentIsUnscheduledDraft) {
      setActionNotice("This scheduling form is only for unscheduled live draft appointments.");
      return;
    }

    if (!scheduleDraft.reasonNotes.trim()) {
      setActionNotice("Scheduling an unscheduled draft requires a documented reason.");
      return;
    }

    if (selectedUnscheduledDraftStartsInPast) {
      setActionNotice("Schedule Draft is blocked: choose a current or future time.");
      return;
    }

    if (scheduleReadiness && !scheduleReadiness.canSubmitSchedule) {
      setActionNotice(
        `Schedule Draft is blocked: ${scheduleReadiness.hardBlocks.map((block) => block.message).join(" ")}`
      );
      return;
    }

    if (!selectedUnscheduledDraftCanProceedWithStaff) {
      setActionNotice(
        staffConflictPreview?.reasons.length
          ? `Schedule Draft is blocked by staff availability: ${staffConflictPreview.reasons.join(" ")}`
          : "Schedule Draft is waiting for staff conflict preview to clear."
      );
      return;
    }

    setIsCommandPending(true);

    try {
      const startsAt = localDateTimeToMinneapolisIso(
        scheduleDraft.localDate,
        scheduleDraft.startTime,
        selectedAppointment.schedulingTimezone ?? boardTimezone
      );
      const endsAt = addMinutesToIso(startsAt, scheduleDraft.durationMinutes);
      const idempotencyKey = createCommandIdentifier("SCHEDULE", selectedAppointment.recordId);
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commandType: "SCHEDULE",
          appointmentId: selectedAppointment.recordId,
          expectedAppointmentVersion: selectedAppointment.recordVersion,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            startsAt,
            endsAt,
            schedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone,
            reasonCode: "UNSCHEDULED_DRAFT_SCHEDULED",
            reasonNotes: buildResourceReasonNote(
              `Scheduled unscheduled draft ${selectedAppointment.id} from Appointment Board draft lane for ${scheduleDraft.localDate} at ${scheduleDraft.startTime}.`,
              scheduleDraft.reasonNotes
            )
          }
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(
          result?.error ||
            result?.execution?.rejectionReasons?.join(" ") ||
            "Unscheduled draft could not be scheduled."
        );
      }

      setAppointmentStatusOverrides((current) => ({
        ...current,
        [selectedAppointment.id]: "confirmed"
      }));
      setScheduleDraft((current) => ({
        ...current,
        reasonNotes: ""
      }));
      setActionNotice(
        `Scheduled ${selectedAppointment.id}. It now has a real time window and was moved onto the appointment calendar.`
      );

      const refreshedAppointments = await loadLiveAppointments({
        suppressSuccessNotice: true
      });
      const refreshedAppointment = refreshedAppointments.find(
        (appointment) => appointment.id === selectedAppointment.id
      );

      if (refreshedAppointment) {
        selectAppointmentForDetail(refreshedAppointment);
      }
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Unscheduled draft could not be scheduled."
      );
    } finally {
      setIsCommandPending(false);
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

    if (commandType === "SCHEDULE" && selectedAppointmentIsUnscheduledDraft) {
      setActionNotice("Use the unscheduled draft scheduling form to choose a date, time, and reason.");
      return;
    }

    if (commandType === "SCHEDULE" && (!selectedAppointment.startsAtIso || !selectedAppointment.endsAtIso)) {
      setActionNotice("Schedule Draft requires a saved start and end time.");
      return;
    }

    if (commandType === "SCHEDULE" && scheduleReadiness && !scheduleReadiness.canSubmitSchedule) {
      setActionNotice(
        `Schedule Draft is blocked: ${scheduleReadiness.hardBlocks.map((block) => block.message).join(" ")}`
      );
      return;
    }

    if (
      commandType === "START" &&
      selectedAppointment.executionStatus !== "NOT_STARTED"
    ) {
      setActionNotice("Start Work requires an appointment that has not started yet.");
      return;
    }

    if (
      commandType === "FINISH" &&
      selectedAppointment.executionStatus !== "IN_PROGRESS" &&
      selectedAppointment.executionStatus !== "WAITING"
    ) {
      setActionNotice("Finish Work requires an appointment that is currently in progress or waiting.");
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
                  schedulingTimezone: selectedAppointment.schedulingTimezone ?? boardTimezone
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

      await loadLiveAppointments();
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : `${label} could not be completed.`);
    } finally {
      setIsCommandPending(false);
    }
  }

  async function submitOutcomeCompletion() {
    if (!selectedAppointment.recordId || !selectedAppointment.recordVersion) {
      setActionNotice(
        `Save Outcome is wired to the live command API, but ${selectedAppointment.id} is still preview data.`
      );
      return;
    }

    if (selectedAppointment.bookingStatus === "COMPLETED") {
      setActionNotice(`${selectedAppointment.id} already has a completed outcome.`);
      return;
    }

    if (selectedAppointment.status === "draft") {
      setActionNotice("Save Outcome requires a scheduled appointment.");
      return;
    }

    if (selectedAppointment.attendanceStatus === "NO_SHOW") {
      setActionNotice("No-show appointments must use the no-show follow-up workflow.");
      return;
    }

    if (selectedAppointment.executionStatus !== "FINISHED") {
      setActionNotice("Finish Work before saving the final outcome.");
      return;
    }

    if (!outcomeDraft.reasonNotes.trim()) {
      setActionNotice("Save Outcome requires a documented reason.");
      return;
    }

    if (
      outcomeDraft.followUpDispositionCode !== "NO_FOLLOW_UP_REQUIRED" &&
      !outcomeDraft.followUpNotes.trim()
    ) {
      setActionNotice("Follow-up disposition requires a next step note.");
      return;
    }

    setIsOutcomeSaving(true);

    try {
      const idempotencyKey = createAppointmentActionIdentifier(
        "complete-outcome",
        selectedAppointment.recordId
      );
      const outcomeLabel = labelForOption(outcomeOptions, outcomeDraft.outcomeCode);
      const followUpLabel = labelForOption(
        followUpDispositionOptions,
        outcomeDraft.followUpDispositionCode
      );
      const response = await fetch("/api/appointments/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commandType: "COMPLETE",
          appointmentId: selectedAppointment.recordId,
          expectedAppointmentVersion: selectedAppointment.recordVersion,
          idempotencyKey,
          correlationId: idempotencyKey,
          payload: {
            outcomeCode: outcomeDraft.outcomeCode,
            outcomeNotes: outcomeDraft.outcomeNotes.trim() || null,
            followUpDispositionCode: outcomeDraft.followUpDispositionCode,
            followUpNotes: outcomeDraft.followUpNotes.trim() || null,
            customerReference: selectedAppointment.customer,
            vehicleReference: selectedAppointment.vehicle,
            reasonCode: "OUTCOME_RECORDED",
            reasonNotes: buildResourceReasonNote(
              `Recorded ${outcomeLabel} outcome with ${followUpLabel.toLowerCase()} follow-up disposition from Appointment Board.`,
              outcomeDraft.reasonNotes
            )
          }
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(
          result?.error ||
            result?.execution?.rejectionReasons?.join(" ") ||
            "Outcome could not be saved."
        );
      }

      const generatedFollowUpAppointmentNumbers = getGeneratedFollowUpAppointmentNumbers(result);
      let successNotice = buildOutcomeSuccessNotice({
        appointmentId: selectedAppointment.id,
        result
      });
      setOutcomeDraft((current) => ({
        ...current,
        reasonNotes: ""
      }));
      setAppointmentStatusOverrides((current) => ({
        ...current,
        [selectedAppointment.id]:
          outcomeDraft.followUpDispositionCode === "NO_FOLLOW_UP_REQUIRED"
            ? "confirmed"
            : "follow-up"
      }));
      setDetailRefreshKey((value) => value + 1);
      const refreshedAppointments = await loadLiveAppointments({
        suppressSuccessNotice: true
      });
      const generatedAppointment = refreshedAppointments.find((appointment) =>
        generatedFollowUpAppointmentNumbers.includes(appointment.id)
      );

      if (generatedAppointment) {
        selectAppointmentForDetail(generatedAppointment);
        successNotice = `${successNotice} Selected ${generatedAppointment.id} so it can be scheduled.`;
      }

      setActionNotice(successNotice);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "Outcome could not be saved.");
    } finally {
      setIsOutcomeSaving(false);
    }
  }

  return (
    <section className="appointment-board-page" aria-labelledby="appointment-board-title">
      <div className="appointment-board-toolbar">
        <div>
          <p className="section-kicker">Enterprise appointment operations</p>
          <h1 id="appointment-board-title">Appointment Board</h1>
          <p>{boardAddress} · {boardPhone} · {boardBusinessHours}</p>
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
          {unscheduledDraftAppointments.length > 0 ? (
            <section className="appointment-unscheduled-card" aria-labelledby="unscheduled-draft-appointments">
              <div className="appointment-section-heading">
                <div>
                  <strong id="unscheduled-draft-appointments">Unscheduled / Drafts</strong>
                  <p>Generated follow-ups and live drafts waiting for a real appointment time.</p>
                </div>
                <span>{unscheduledDraftAppointments.length} needs scheduling</span>
              </div>
              <div className="appointment-unscheduled-list">
                {unscheduledDraftAppointments.map((appointment) => {
                  const meta = categoryMeta[appointment.category];

                  return (
                    <button
                      className={
                        selectedAppointment.id === appointment.id
                          ? `appointment-unscheduled-item ${meta.className} appointment-unscheduled-item-active`
                          : `appointment-unscheduled-item ${meta.className}`
                      }
                      key={appointment.id}
                      onClick={() => selectAppointmentForDetail(appointment)}
                      type="button"
                    >
                      <span>{appointment.id}</span>
                      <strong>{appointment.title}</strong>
                      <small>{appointment.customer} · {appointment.vehicle}</small>
                      <em>{appointment.staffName ?? "Unassigned"} · {categoryMeta[appointment.category].label}</em>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="appointment-exception-card" aria-labelledby="appointment-exception-queues">
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-exception-queues">Command Center Exception Queues</strong>
                <p>Manager-first queues for scheduling gaps, live conflicts, no-show recovery, and follow-up ownership.</p>
              </div>
              <span>
                {activeExceptionQueueCount} active queue{activeExceptionQueueCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="appointment-exception-grid">
              {exceptionQueues.map((queue) => {
                const visibleItems = queue.items.slice(0, 4);
                const overflowCount = queue.items.length - visibleItems.length;

                return (
                  <section
                    className={`appointment-exception-queue appointment-exception-queue-${queue.tone}`}
                    key={queue.key}
                    aria-label={queue.title}
                  >
                    <div className="appointment-exception-queue-header">
                      <div>
                        <strong>{queue.title}</strong>
                        <p>{queue.description}</p>
                      </div>
                      <b>{queue.items.length}</b>
                    </div>

                    {visibleItems.length > 0 ? (
                      <div className="appointment-exception-list">
                        {visibleItems.map((appointment) => (
                          <button
                            className={
                              selectedAppointment.id === appointment.id
                                ? "appointment-exception-item appointment-exception-item-active"
                                : "appointment-exception-item"
                            }
                            key={`${queue.key}-${appointment.id}`}
                            onClick={() => selectAppointmentForDetail(appointment)}
                            type="button"
                          >
                            <div className="appointment-exception-item-top">
                              <strong>{appointment.title}</strong>
                              <span>{appointment.id}</span>
                            </div>
                            <p>{appointmentExceptionReason(queue.key, appointment)}</p>
                            <div className="appointment-exception-item-meta">
                              <small>{appointment.customer} · {appointment.vehicle}</small>
                              <em>
                                {appointmentTimeLabel(appointment)} · {appointment.staffName ?? "Unassigned"}
                              </em>
                            </div>
                          </button>
                        ))}
                        {overflowCount > 0 ? (
                          <p className="appointment-exception-overflow">
                            {overflowCount} more item{overflowCount === 1 ? "" : "s"} remain in this queue.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="appointment-exception-empty">
                        <strong>Queue clear</strong>
                        <p>{queue.emptyMessage}</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>

          <section className="appointment-resolution-workbench" aria-labelledby="appointment-resolution-workbench">
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-resolution-workbench">Resolution Workbench</strong>
                <p>Prioritize aging exceptions, capture manager-safe reasons, and clear operational bottlenecks without leaving the board.</p>
              </div>
              <span>
                {resolutionWorkbenchItems.length} live item{resolutionWorkbenchItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="appointment-resolution-toolbar">
              <div className="appointment-resolution-toolbar-group">
                <label>
                  Queue focus
                  <select
                    aria-label="Filter resolution workbench items"
                    value={resolutionFilter}
                    onChange={(event) =>
                      setResolutionFilter(event.target.value as AppointmentResolutionWorkbenchFilter)
                    }
                  >
                    <option value="all">All active queues</option>
                    <option value="needs-scheduling">Needs scheduling</option>
                    <option value="conflict-watch">Conflict watch</option>
                    <option value="no-show-recovery">No-show recovery</option>
                    <option value="follow-up-required">Follow-up required</option>
                    <option value="breached-sla">Breached SLA</option>
                    <option value="escalated">Escalated only</option>
                  </select>
                </label>

                <label>
                  Sort by
                  <select
                    aria-label="Sort resolution workbench items"
                    value={resolutionSort}
                    onChange={(event) =>
                      setResolutionSort(event.target.value as AppointmentResolutionWorkbenchSort)
                    }
                  >
                    <option value="priority">Priority + SLA</option>
                    <option value="age">Oldest first</option>
                    <option value="customer">Customer name</option>
                  </select>
                </label>
              </div>

              <div className="appointment-resolution-toolbar-group appointment-resolution-toolbar-group-inline">
                <button type="button" onClick={toggleSelectAllResolutionItems}>
                  {selectedResolutionItemIds.length === resolutionWorkbenchItems.length &&
                  resolutionWorkbenchItems.length > 0
                    ? "Clear selection"
                    : "Select visible"}
                </button>
                <label className="appointment-resolution-toggle">
                  <input
                    checked={showDormantWorkbenchItems}
                    onChange={(event) => setShowDormantWorkbenchItems(event.target.checked)}
                    type="checkbox"
                  />
                  Show snoozed / resolved
                </label>
              </div>
            </div>

            <div className="appointment-resolution-summary">
              <span>{breachedResolutionCount} breached SLA</span>
              <span>{escalatedResolutionCount} escalated</span>
              <span>{selectedResolutionItemIds.length} selected</span>
            </div>

            {selectedResolutionItemIds.length > 0 ? (
              <div className="appointment-resolution-bulk-bar">
                <div className="appointment-resolution-bulk-fields">
                  <label>
                    Assign owner
                    <select
                      aria-label="Assign selected exception items"
                      value={resolutionOwnerId}
                      onChange={(event) => setResolutionOwnerId(event.target.value)}
                    >
                      {visibleStaffMembers.map((staff) => (
                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="appointment-resolution-note-field">
                    Manager note
                    <input
                      aria-label="Resolution note"
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder="Capture the reason for the action."
                      type="text"
                      value={resolutionNote}
                    />
                  </label>
                </div>
                <div className="appointment-resolution-bulk-actions">
                  <button type="button" onClick={() => applyResolutionWorkbenchAction("assign", selectedResolutionItemIds)}>
                    Assign selected
                  </button>
                  <button type="button" onClick={() => applyResolutionWorkbenchAction("snooze", selectedResolutionItemIds)}>
                    Snooze
                  </button>
                  <button type="button" onClick={() => applyResolutionWorkbenchAction("escalate", selectedResolutionItemIds)}>
                    Escalate
                  </button>
                  <button type="button" onClick={() => applyResolutionWorkbenchAction("resolve", selectedResolutionItemIds)}>
                    Resolve
                  </button>
                </div>
              </div>
            ) : null}

            {resolutionWorkbenchItems.length > 0 ? (
              <div className="appointment-resolution-list">
                {resolutionWorkbenchItems.map((item) => (
                  <article className="appointment-resolution-item" key={`${item.queueKey}-${item.appointment.id}`}>
                    <div className="appointment-resolution-item-top">
                      <label className="appointment-resolution-item-checkbox">
                        <input
                          checked={Boolean(selectedResolutionIds[item.appointment.id])}
                          onChange={() => toggleResolutionSelection(item.appointment.id)}
                          type="checkbox"
                        />
                        <span>Select</span>
                      </label>
                      <div className="appointment-resolution-item-heading">
                        <strong>{item.appointment.title}</strong>
                        <span>{item.appointment.id} · {item.appointment.customer}</span>
                      </div>
                      <div className="appointment-resolution-chip-stack">
                        <b className={`appointment-resolution-chip appointment-resolution-chip-priority-${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </b>
                        <b className={`appointment-resolution-chip appointment-resolution-chip-sla-${item.slaStatus}`}>
                          {item.slaStatus === "breached"
                            ? "SLA breached"
                            : item.slaStatus === "at-risk"
                              ? "At risk"
                              : "On track"}
                        </b>
                        <b className={`appointment-resolution-chip appointment-resolution-chip-status-${item.resolutionStatus}`}>
                          {resolutionStatusLabel(item.resolutionStatus)}
                        </b>
                      </div>
                    </div>

                    <div className="appointment-resolution-item-grid">
                      <div>
                        <span>Queue</span>
                        <strong>{item.queueLabel}</strong>
                      </div>
                      <div>
                        <span>Age</span>
                        <strong>{item.ageHours.toFixed(1)}h</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{item.ownerName}</strong>
                      </div>
                      <div>
                        <span>Recommended</span>
                        <strong>{item.recommendedAction}</strong>
                      </div>
                    </div>

                    <p className="appointment-resolution-item-copy">
                      {appointmentExceptionReason(item.queueKey, item.appointment)}
                    </p>
                    <div className="appointment-resolution-item-meta">
                      <small>{item.appointment.vehicle} · {appointmentTimeRangeLabel(item.appointment)}</small>
                      <em>
                        {item.lastActionLabel}
                        {item.snoozedUntilLabel ? ` · Until ${item.snoozedUntilLabel}` : ""}
                      </em>
                    </div>

                    <div className="appointment-resolution-item-actions">
                      <button type="button" onClick={() => selectAppointmentForDetail(item.appointment)}>
                        Focus appointment
                      </button>
                      <button type="button" onClick={() => applyResolutionWorkbenchAction("assign", [item.appointment.id])}>
                        Assign
                      </button>
                      <button type="button" onClick={() => applyResolutionWorkbenchAction("snooze", [item.appointment.id])}>
                        Snooze
                      </button>
                      <button type="button" onClick={() => applyResolutionWorkbenchAction("escalate", [item.appointment.id])}>
                        Escalate
                      </button>
                      <button type="button" onClick={() => applyResolutionWorkbenchAction("resolve", [item.appointment.id])}>
                        Resolve
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="appointment-resolution-empty">
                <strong>Workbench clear</strong>
                <p>No exception items match the current queue focus and visibility settings.</p>
              </div>
            )}
          </section>

          <section
            className="appointment-command-center-views-card"
            aria-labelledby="appointment-command-center-views"
          >
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-command-center-views">Saved Views &amp; Subscriptions</strong>
                <p>
                  Save manager workspaces, reopen them in one click, and keep watched queues ready for
                  shift handoffs and exception monitoring.
                </p>
              </div>
              <span>
                {savedCommandCenterViews.length} saved Â· {enabledCommandCenterSubscriptionCount} watched
              </span>
            </div>

            <div className="appointment-command-center-views-grid">
              <section className="appointment-command-center-panel" aria-labelledby="appointment-saved-views">
                <div className="appointment-command-center-panel-heading">
                  <div>
                    <strong id="appointment-saved-views">Saved Views</strong>
                    <p>Capture the current queue, search, timeline, and reporting focus for repeat manager workflows.</p>
                  </div>
                  <span>{savedCommandCenterViews.length} saved</span>
                </div>

                <div className="appointment-command-center-save-row">
                  <label>
                    View name
                    <input
                      aria-label="Saved command center view name"
                      onChange={(event) => setSavedViewDraftName(event.target.value)}
                      placeholder="Name this manager view"
                      type="text"
                      value={savedViewDraftName}
                    />
                  </label>
                  <button type="button" onClick={saveCurrentCommandCenterView}>
                    Save current view
                  </button>
                </div>

                <div className="appointment-command-center-saved-list">
                  {savedCommandCenterViews.map((view) => {
                    const isStartup = view.id === defaultCommandCenterViewId;
                    const isActive = view.id === activeCommandCenterViewId;

                    return (
                      <article
                        className={
                          isActive
                            ? "appointment-command-center-saved-item appointment-command-center-saved-item-active"
                            : "appointment-command-center-saved-item"
                        }
                        key={view.id}
                      >
                        <div className="appointment-command-center-saved-item-top">
                          <div>
                            <strong>{view.name}</strong>
                            <p>{view.description}</p>
                          </div>
                          <div className="appointment-command-center-badge-stack">
                            {isStartup ? (
                              <span className="appointment-command-center-tag appointment-command-center-tag-blue">
                                Startup
                              </span>
                            ) : null}
                            {isActive ? (
                              <span className="appointment-command-center-tag appointment-command-center-tag-green">
                                Active
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="appointment-command-center-item-actions">
                          <button type="button" onClick={() => applySavedCommandCenterView(view)}>
                            Open view
                          </button>
                          <button type="button" onClick={() => setSavedCommandCenterViewAsStartup(view.id)}>
                            {isStartup ? "Startup view" : "Make startup"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section
                className="appointment-command-center-panel"
                aria-labelledby="appointment-command-center-subscriptions"
              >
                <div className="appointment-command-center-panel-heading">
                  <div>
                    <strong id="appointment-command-center-subscriptions">My Watched Queues</strong>
                    <p>Keep high-risk exception lanes visible even when the board focus changes across the day.</p>
                  </div>
                  <span>
                    {enabledCommandCenterSubscriptionCount} enabled / {commandCenterSubscriptionSummaries.length}
                  </span>
                </div>

                <div className="appointment-command-center-subscription-list">
                  {commandCenterSubscriptionSummaries.map((subscription) => (
                    <article
                      className={`appointment-command-center-subscription appointment-command-center-subscription-${subscription.tone}`}
                      key={subscription.id}
                    >
                      <div className="appointment-command-center-subscription-top">
                        <div>
                          <strong>{subscription.label}</strong>
                          <p>{subscription.description}</p>
                        </div>
                        <div className="appointment-command-center-subscription-summary">
                          <b>{subscription.count}</b>
                          <span
                            className={
                              subscription.enabled
                                ? "appointment-command-center-tag appointment-command-center-tag-green"
                                : "appointment-command-center-tag"
                            }
                          >
                            {subscription.enabled ? "Watching" : "Paused"}
                          </span>
                        </div>
                      </div>

                      <div className="appointment-command-center-item-actions">
                        <button type="button" onClick={() => openCommandCenterSubscription(subscription)}>
                          Open watch
                        </button>
                        <button type="button" onClick={() => toggleCommandCenterSubscription(subscription.id)}>
                          {subscription.enabled ? "Pause watch" : "Resume watch"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <section
            className="appointment-command-center-digests-card"
            aria-labelledby="appointment-command-center-digests"
          >
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-command-center-digests">Notification Digests</strong>
                <p>
                  Deliver manager-safe command-center summaries with delivery preferences, shift handoff
                  packaging, and an audit-friendly history of what was prepared or sent.
                </p>
              </div>
              <span>
                {enabledCommandCenterDigestCount} enabled / {commandCenterDigestSummaries.length}
              </span>
            </div>

            <div className="appointment-command-center-digests-grid">
              <section className="appointment-command-center-panel" aria-labelledby="appointment-digest-rules">
                <div className="appointment-command-center-panel-heading">
                  <div>
                    <strong id="appointment-digest-rules">Digest Rules</strong>
                    <p>Each digest can target a different queue, audience, delivery channel, and operating rhythm.</p>
                  </div>
                  <span>{enabledCommandCenterDigestCount} live</span>
                </div>

                <div className="appointment-command-center-digest-rule-list">
                  {commandCenterDigestSummaries.map((digest) => {
                    const isSelected = digest.id === selectedCommandCenterDigestSummary?.id;

                    return (
                      <article
                        className={
                          isSelected
                            ? `appointment-command-center-digest-rule appointment-command-center-digest-rule-${digest.tone} appointment-command-center-digest-rule-active`
                            : `appointment-command-center-digest-rule appointment-command-center-digest-rule-${digest.tone}`
                        }
                        key={digest.id}
                      >
                        <div className="appointment-command-center-digest-rule-top">
                          <div>
                            <strong>{digest.label}</strong>
                            <p>{digest.description}</p>
                          </div>
                          <div className="appointment-command-center-digest-rule-summary">
                            <b>{digest.count}</b>
                            <span
                              className={
                                digest.enabled
                                  ? "appointment-command-center-tag appointment-command-center-tag-green"
                                  : "appointment-command-center-tag"
                              }
                            >
                              {digest.enabled ? "Enabled" : "Paused"}
                            </span>
                          </div>
                        </div>

                        <p className="appointment-command-center-digest-headline">{digest.headline}</p>

                        <div className="appointment-command-center-digest-preferences">
                          <label>
                            Channel
                            <select
                              aria-label={`Channel for ${digest.label}`}
                              onChange={(event) =>
                                updateCommandCenterDigestPreference(digest.id, {
                                  channel: event.target.value as AppointmentCommandCenterDigestChannel
                                })
                              }
                              value={digest.channel}
                            >
                              <option value="in-app">In-app alert</option>
                              <option value="email-summary">Email summary</option>
                              <option value="shift-handoff">Shift handoff</option>
                            </select>
                          </label>
                          <label>
                            Cadence
                            <select
                              aria-label={`Cadence for ${digest.label}`}
                              onChange={(event) =>
                                updateCommandCenterDigestPreference(digest.id, {
                                  cadence: event.target.value as AppointmentCommandCenterDigestCadence
                                })
                              }
                              value={digest.cadence}
                            >
                              <option value="hourly">Hourly</option>
                              <option value="shift-change">Shift change</option>
                              <option value="daily-close">Daily close</option>
                            </select>
                          </label>
                          <label className="appointment-command-center-digest-recipient-field">
                            Recipients
                            <input
                              aria-label={`Recipients for ${digest.label}`}
                              onChange={(event) =>
                                updateCommandCenterDigestPreference(digest.id, {
                                  recipientLabel: event.target.value
                                })
                              }
                              type="text"
                              value={digest.recipientLabel}
                            />
                          </label>
                        </div>

                        <div className="appointment-command-center-item-actions">
                          <button type="button" onClick={() => focusCommandCenterDigest(digest)}>
                            Preview digest
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCommandCenterDigestPreference(digest.id, {
                                enabled: !digest.enabled
                              })
                            }
                          >
                            {digest.enabled ? "Pause digest" : "Resume digest"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="appointment-command-center-panel" aria-labelledby="appointment-digest-preview">
                <div className="appointment-command-center-panel-heading">
                  <div>
                    <strong id="appointment-digest-preview">Digest Preview &amp; Delivery</strong>
                    <p>
                      Review the outbound summary, add a manager note, and document exactly what was
                      previewed or sent.
                    </p>
                  </div>
                  <span>{selectedCommandCenterDigestSummary?.label ?? "No digest selected"}</span>
                </div>

                <div className="appointment-command-center-digest-preview-summary">
                  <span>{selectedCommandCenterDigestSummary?.count ?? 0} items in scope</span>
                  <span>
                    {selectedCommandCenterDigestSummary
                      ? commandCenterDigestChannelLabel(selectedCommandCenterDigestSummary.channel)
                      : "No channel"}
                  </span>
                  <span>
                    {selectedCommandCenterDigestSummary
                      ? commandCenterDigestCadenceLabel(selectedCommandCenterDigestSummary.cadence)
                      : "No cadence"}
                  </span>
                </div>

                <div className="appointment-command-center-shift-handoff-card">
                  <div className="appointment-command-center-shift-handoff-heading">
                    <strong>Shift Handoff Summary</strong>
                    <span>{selectedAppointment.id}</span>
                  </div>
                  <div className="appointment-command-center-shift-handoff-grid">
                    <article>
                      <span>Visible Exceptions</span>
                      <strong>{commandCenterReport.summary.visibleExceptions}</strong>
                    </article>
                    <article>
                      <span>Breached SLA</span>
                      <strong>{commandCenterReport.summary.breachedSla}</strong>
                    </article>
                    <article>
                      <span>Escalated</span>
                      <strong>{commandCenterReport.summary.escalated}</strong>
                    </article>
                    <article>
                      <span>Manager Events</span>
                      <strong>{commandCenterReport.summary.managerEvents}</strong>
                    </article>
                  </div>
                  <p className="appointment-command-center-digest-headline">
                    Focused appointment: {selectedAppointment.title} for {selectedAppointment.customer} ·{" "}
                    {appointmentTimeRangeLabel(selectedAppointment)}
                  </p>
                </div>

                <label className="appointment-command-center-digest-note-field">
                  Manager note / digest reason
                  <input
                    aria-label="Manager note for notification digest"
                    onChange={(event) => setCommandCenterDigestReason(event.target.value)}
                    placeholder="Why is this digest being prepared or sent right now?"
                    type="text"
                    value={commandCenterDigestReason}
                  />
                </label>

                <div className="appointment-command-center-digest-preview">
                  <div className="appointment-command-center-digest-preview-heading">
                    <strong>Outbound preview</strong>
                    <span>{selectedCommandCenterDigestSummary?.recipientLabel ?? "No recipients selected"}</span>
                  </div>
                  <textarea
                    aria-label="Notification digest preview"
                    readOnly
                    rows={12}
                    value={commandCenterDigestPreview}
                  />
                </div>

                <div className="appointment-command-center-digest-actions">
                  <button type="button" onClick={() => recordCommandCenterDigest("previewed")}>
                    Preview digest
                  </button>
                  <button type="button" onClick={() => void copyCommandCenterDigestPreview()}>
                    Copy preview
                  </button>
                  <button type="button" onClick={() => recordCommandCenterDigest("sent")}>
                    Send now
                  </button>
                </div>

                <div className="appointment-command-center-digest-history">
                  <div className="appointment-command-center-digest-preview-heading">
                    <strong>Digest history</strong>
                    <span>{commandCenterDigestHistory.length} recorded</span>
                  </div>
                  <div className="appointment-command-center-digest-history-list">
                    {commandCenterDigestHistory.slice(0, 5).map((entry) => (
                      <article className="appointment-command-center-digest-history-item" key={entry.id}>
                        <div className="appointment-command-center-digest-history-top">
                          <div>
                            <strong>{entry.digestLabel}</strong>
                            <p>{entry.reason}</p>
                          </div>
                          <div className="appointment-command-center-badge-stack">
                            <span className="appointment-command-center-tag">
                              {entry.status === "sent" ? "Sent" : "Previewed"}
                            </span>
                            <span className="appointment-command-center-tag appointment-command-center-tag-blue">
                              {entry.count} items
                            </span>
                          </div>
                        </div>
                        <small>
                          {commandCenterDigestChannelLabel(entry.channel)} · {entry.recipientLabel} · {entry.generatedAtLabel}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section className="appointment-command-search-card" aria-labelledby="appointment-command-search">
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-command-search">Cross-Appointment Search</strong>
                <p>
                  Search queue items, manager actions, and timeline history across the full visible
                  command-center scope.
                </p>
              </div>
              <span>{commandCenterSearchResultCountLabel}</span>
            </div>

            <div className="appointment-command-search-presets" aria-label="Saved search presets">
              <button
                className={commandCenterSearchPreset === "all" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("all")}
              >
                All
              </button>
              <button
                className={commandCenterSearchPreset === "breached-sla" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("breached-sla")}
              >
                Breached SLA
              </button>
              <button
                className={commandCenterSearchPreset === "escalated" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("escalated")}
              >
                Escalated
              </button>
              <button
                className={commandCenterSearchPreset === "snoozed" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("snoozed")}
              >
                Snoozed
              </button>
              <button
                className={commandCenterSearchPreset === "resolved" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("resolved")}
              >
                Resolved
              </button>
              <button
                className={commandCenterSearchPreset === "manager-activity" ? "appointment-command-search-preset appointment-command-search-preset-active" : "appointment-command-search-preset"}
                type="button"
                onClick={() => applyCommandCenterSearchPreset("manager-activity")}
              >
                Manager activity
              </button>
            </div>

            <div className="appointment-command-search-toolbar">
              <label className="appointment-command-search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Search command center items"
                  placeholder="Search appointment ID, customer, vehicle, owner, queue, or timeline event..."
                  type="search"
                  value={commandCenterSearchQuery}
                  onChange={(event) => setCommandCenterSearchQuery(event.target.value)}
                />
              </label>
              <label>
                Search scope
                <select
                  aria-label="Filter search scope"
                  value={commandCenterSearchScope}
                  onChange={(event) =>
                    setCommandCenterSearchScope(event.target.value as AppointmentCommandCenterSearchScope)
                  }
                >
                  <option value="all">Appointments + timeline</option>
                  <option value="appointments">Appointments only</option>
                  <option value="timeline">Timeline only</option>
                </select>
              </label>
            </div>

            <div className="appointment-command-search-summary">
              <span>{resolutionWorkbenchItems.length} indexed queue items</span>
              <span>{allCommandCenterAuditTimelineEvents.length} indexed timeline events</span>
              <span>{selectedAppointment.id} currently focused</span>
            </div>

            {commandCenterSearchResults.length > 0 ? (
              <div className="appointment-command-search-results">
                {commandCenterSearchResults.slice(0, 12).map((result) => (
                  <article className={`appointment-command-search-result appointment-command-search-result-${result.tone}`} key={result.id}>
                    <div className="appointment-command-search-result-top">
                      <div>
                        <strong>{result.title}</strong>
                        <span>{result.subtitle}</span>
                      </div>
                      <b>{result.badge}</b>
                    </div>
                    <p>{result.detail}</p>
                    <div className="appointment-command-search-result-actions">
                      <button type="button" onClick={() => focusCommandCenterSearchResult(result)}>
                        Open appointment
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="appointment-command-search-empty">
                <strong>No matching command-center results</strong>
                <p>Try another preset, widen the scope, or search by appointment ID, customer, owner, or timeline wording.</p>
              </div>
            )}
          </section>

          <section className="appointment-audit-timeline-card" aria-labelledby="appointment-audit-timeline">
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-audit-timeline">Command Center Audit Timeline</strong>
                <p>
                  Focused history for {selectedAppointment.id}, including appointment state, linked work,
                  automation context, and manager decisions.
                </p>
              </div>
              <span>{selectedAppointmentAuditTimeline.length} event{selectedAppointmentAuditTimeline.length === 1 ? "" : "s"}</span>
            </div>

            <div className="appointment-audit-timeline-toolbar">
              <div className="appointment-audit-timeline-summary">
                <span>{auditTimelineCounts.manager} manager</span>
                <span>{auditTimelineCounts.automation} automation</span>
                <span>{auditTimelineCounts.task} task</span>
              </div>
              <label>
                Timeline focus
                <select
                  aria-label="Filter audit timeline events"
                  value={auditTimelineFilter}
                  onChange={(event) =>
                    setAuditTimelineFilter(event.target.value as AppointmentAuditTimelineFilter)
                  }
                >
                  <option value="all">All events</option>
                  <option value="appointment">Appointment</option>
                  <option value="task">Task</option>
                  <option value="automation">Automation</option>
                  <option value="manager">Manager</option>
                </select>
              </label>
            </div>

            {selectedAppointmentAuditTimeline.length > 0 ? (
              <div className="appointment-audit-timeline-list">
                {selectedAppointmentAuditTimeline.map((event) => (
                  <article className={`appointment-audit-timeline-item appointment-audit-timeline-item-${event.tone}`} key={event.id}>
                    <div className="appointment-audit-timeline-dot" aria-hidden="true" />
                    <div className="appointment-audit-timeline-content">
                      <div className="appointment-audit-timeline-top">
                        <strong>{event.title}</strong>
                        <span>{event.occurredAtLabel}</span>
                      </div>
                      <p>{event.detail}</p>
                      <small>{event.actor} · {event.lane[0].toUpperCase() + event.lane.slice(1)} lane</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="appointment-audit-timeline-empty">
                <strong>No matching events</strong>
                <p>The current timeline focus hides all visible history for this appointment.</p>
              </div>
            )}
          </section>

          <section className="appointment-reporting-card" aria-labelledby="appointment-reporting-exports">
            <div className="appointment-section-heading">
              <div>
                <strong id="appointment-reporting-exports">Reporting & Exports</strong>
                <p>
                  Generate manager-ready summaries and exportable command-center snapshots from the
                  current visible board scope.
                </p>
              </div>
              <span>{commandCenterReport.rows.length} row{commandCenterReport.rows.length === 1 ? "" : "s"}</span>
            </div>

            <div className="appointment-reporting-summary">
              <article>
                <span>Visible Exceptions</span>
                <strong>{commandCenterReport.summary.visibleExceptions}</strong>
              </article>
              <article>
                <span>Breached SLA</span>
                <strong>{commandCenterReport.summary.breachedSla}</strong>
              </article>
              <article>
                <span>Escalated</span>
                <strong>{commandCenterReport.summary.escalated}</strong>
              </article>
              <article>
                <span>Manager Events</span>
                <strong>{commandCenterReport.summary.managerEvents}</strong>
              </article>
            </div>

            <div className="appointment-reporting-toolbar">
              <div className="appointment-reporting-toolbar-group">
                <label>
                  Queue scope
                  <select
                    aria-label="Filter reporting queue scope"
                    value={reportQueueFilter}
                    onChange={(event) =>
                      setReportQueueFilter(event.target.value as AppointmentResolutionWorkbenchFilter)
                    }
                  >
                    <option value="all">All active queues</option>
                    <option value="needs-scheduling">Needs scheduling</option>
                    <option value="conflict-watch">Conflict watch</option>
                    <option value="no-show-recovery">No-show recovery</option>
                    <option value="follow-up-required">Follow-up required</option>
                    <option value="breached-sla">Breached SLA</option>
                    <option value="escalated">Escalated only</option>
                  </select>
                </label>
                <label>
                  Owner scope
                  <select
                    aria-label="Filter reporting owner scope"
                    value={reportOwnerFilter}
                    onChange={(event) => setReportOwnerFilter(event.target.value)}
                  >
                    <option value="all">All owners</option>
                    {visibleStaffMembers.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Export format
                  <select
                    aria-label="Select export format"
                    value={reportExportFormat}
                    onChange={(event) =>
                      setReportExportFormat(event.target.value as AppointmentCommandCenterExportFormat)
                    }
                  >
                    <option value="summary">Manager summary</option>
                    <option value="csv">CSV rows</option>
                    <option value="audit-json">Audit JSON</option>
                  </select>
                </label>
              </div>

              <div className="appointment-reporting-toolbar-actions">
                <button type="button" onClick={() => setActionNotice(`Prepared ${reportExportFormat.toUpperCase()} reporting snapshot for ${selectedAppointment.id}.`)}>
                  Refresh snapshot
                </button>
                <button type="button" onClick={() => void copyCommandCenterExportPreview()}>
                  Copy export
                </button>
              </div>
            </div>

            <div className="appointment-reporting-preview">
              <div className="appointment-reporting-preview-heading">
                <strong>Export preview</strong>
                <span>{commandCenterReport.generatedForLabel}</span>
              </div>
              <textarea
                aria-label="Command center export preview"
                readOnly
                rows={12}
                value={commandCenterExportPreview}
              />
            </div>
          </section>

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
                    {scheduledFilteredAppointments.filter((appointment) => appointment.staffId === staff.id).map((appointment) => {
                      const meta = categoryMeta[appointment.category];
                      const top = Math.max(0, ((appointment.startMinutes - 540) / 60) * 66);
                      const height = Math.max(58, (appointment.durationMinutes / 60) * 66);
                      return (
                        <button
                          className={selectedAppointment.id === appointment.id ? `appointment-calendar-item ${meta.className} appointment-calendar-item-active` : `appointment-calendar-item ${meta.className}`}
                          key={appointment.id}
                          onClick={() => selectAppointmentForDetail(appointment)}
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
                {scheduledFilteredAppointments.slice(0, 5).map((appointment) => (
                  <button key={appointment.id} type="button" onClick={() => selectAppointmentForDetail(appointment)}>
                    <span>{appointmentTimeLabel(appointment)}</span>
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
            <p><Clock3 size={16} aria-hidden="true" />{appointmentTimeRangeLabel(selectedAppointment)}</p>
            <p><UserRound size={16} aria-hidden="true" />{selectedStaff.name} ({selectedStaff.role})</p>
            <p><Phone size={16} aria-hidden="true" />{selectedAppointment.phone}</p>
            <p><Car size={16} aria-hidden="true" />{selectedAppointment.vehicle}</p>
            <p><MapPin size={16} aria-hidden="true" />{selectedAppointment.location}</p>
            <p><MessageCircle size={16} aria-hidden="true" />{selectedAppointment.complaint}</p>
          </div>

          <div className="appointment-detail-section">
            <div className="appointment-section-heading">
              <strong>
                Linked Tasks ({selectedAppointment.linkedTasks?.length ?? selectedAppointment.taskAutomation.length})
              </strong>
              <button type="button" onClick={() => handlePreviewAction("New linked task")}>+ New Task</button>
            </div>
            <div className="appointment-task-stack">
              {selectedAppointment.linkedTasks && selectedAppointment.linkedTasks.length > 0
                ? selectedAppointment.linkedTasks.map((task, index) => (
                    <div className="appointment-task-row" key={task.id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{task.title}</strong>
                        <small>
                          {formatTaskStatus(task.status)} · Due {formatTaskDueAt(task.dueAt, selectedAppointment.schedulingTimezone)} · {task.assignedUserName}
                        </small>
                        <small>
                          {task.linkTitle}
                          {task.isRequired ? " · Required" : ""}
                          {task.blocksAppointment ? " · Blocks appointment" : ""}
                          {task.appointmentRequiredForTask ? " · Appointment required for task" : ""}
                        </small>
                        {task.explanation ? <small>{task.explanation}</small> : null}
                        <Link className="appointment-task-link" href={`/tasks/${task.taskId}`}>
                          Open Task
                        </Link>
                      </div>
                    </div>
                  ))
                : selectedAppointment.taskAutomation.map((task, index) => (
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

          {selectedAppointment.dataSource === "live" ? (
            <div className="appointment-detail-section">
              <div className="appointment-section-heading">
                <strong>Schedule Readiness</strong>
                <span className={`appointment-readiness-chip appointment-readiness-${scheduleReadiness?.status.toLowerCase() ?? "loading"}`}>
                  {isReadinessLoading ? "Loading" : scheduleReadiness?.status ?? "Unavailable"}
                </span>
              </div>
              {scheduleReadiness ? (
                <div className="appointment-readiness-stack">
                  {scheduleReadiness.checks.map((check) => (
                    <div className={`appointment-readiness-row appointment-readiness-row-${check.status.toLowerCase()}`} key={check.code}>
                      <strong>{check.label}</strong>
                      <span>{check.status}</span>
                      <small>{check.message}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="appointment-readiness-copy">
                  {isReadinessLoading ? "Checking schedule readiness..." : "Schedule readiness is not available for this appointment yet."}
                </p>
              )}
            </div>
          ) : null}

          {selectedAppointmentIsUnscheduledDraft ? (
            <div className="appointment-detail-section">
              <div className="appointment-section-heading">
                <strong>Schedule Unscheduled Draft</strong>
                <span className="appointment-resource-chip appointment-resource-ready-to-select">
                  Command audited
                </span>
              </div>
              <label className="appointment-outcome-label">
                Appointment date
                <input
                  disabled={isCommandPending}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      localDate: event.target.value
                    }))
                  }
                  type="date"
                  value={scheduleDraft.localDate}
                />
              </label>
              <label className="appointment-outcome-label">
                Start time
                <input
                  disabled={isCommandPending}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      startTime: event.target.value
                    }))
                  }
                  type="time"
                  value={scheduleDraft.startTime}
                />
              </label>
              <label className="appointment-outcome-label">
                Duration
                <select
                  disabled={isCommandPending}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value)
                    }))
                  }
                  value={scheduleDraft.durationMinutes}
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hr</option>
                  <option value={75}>1 hr 15 min</option>
                  <option value={90}>1 hr 30 min</option>
                  <option value={120}>2 hr</option>
                </select>
              </label>
              <label className="appointment-outcome-label">
                Scheduling reason
                <textarea
                  disabled={isCommandPending}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      reasonNotes: event.target.value
                    }))
                  }
                  placeholder="Document why this draft is being scheduled for this slot."
                  rows={3}
                  value={scheduleDraft.reasonNotes}
                />
              </label>
              <p className="appointment-resource-copy">
                This submits the existing SCHEDULE command with the selected Minneapolis time window, expected version, idempotency key, staff-conflict validation, and history reason.
              </p>
              {selectedUnscheduledDraftStartsInPast ? (
                <p className="appointment-resource-copy appointment-resource-warning">
                  Choose a current or future time before scheduling this draft.
                </p>
              ) : null}
              <button
                className="appointment-resource-action"
                disabled={
                  isCommandPending ||
                  isReadinessLoading ||
                  isStaffConflictLoading ||
                  selectedUnscheduledDraftStartsInPast ||
                  !scheduleDraft.reasonNotes.trim() ||
                  (scheduleReadiness ? !scheduleReadiness.canSubmitSchedule : false) ||
                  !selectedUnscheduledDraftCanProceedWithStaff
                }
                onClick={() => void submitUnscheduledDraftSchedule()}
                type="button"
              >
                {isCommandPending ? "Scheduling..." : "Schedule This Draft"}
              </button>
            </div>
          ) : null}

          {selectedAppointment.dataSource === "live" && selectedAppointment.status === "draft" ? (
            <div className="appointment-detail-section">
              <div className="appointment-section-heading">
                <strong>Staff Conflict Preview</strong>
                <span className={`appointment-readiness-chip appointment-readiness-${staffConflictPreview?.status.toLowerCase() ?? "loading"}`}>
                  {isStaffConflictLoading ? "Loading" : staffConflictPreview?.status ?? "Unavailable"}
                </span>
              </div>
              {staffConflictPreview ? (
                <div className="appointment-readiness-stack">
                  <div className={`appointment-readiness-row appointment-readiness-row-${staffConflictPreview.status === "READY" ? "pass" : staffConflictPreview.status.toLowerCase()}`}>
                    <strong>
                      {staffConflictPreview.staffMembers?.length
                        ? `${staffConflictPreview.staffMembers.length} required staff checked`
                        : staffConflictPreview.staff
                          ? `${staffConflictPreview.staff.name} (${staffConflictPreview.staff.role})`
                          : "Required staff"}
                    </strong>
                    <span>{staffConflictPreview.status}</span>
                    <small>
                      {staffConflictPreview.reasons.length > 0
                        ? staffConflictPreview.reasons.join(" ")
                        : staffConflictPreview.staffMembers?.length
                          ? "All required staff are available for this appointment window."
                          : staffConflictPreview.staff?.resourceName
                            ? `${staffConflictPreview.staff.resourceName} is available for this appointment window.`
                            : "Staff availability is ready for this appointment window."}
                    </small>
                  </div>
                  {staffConflictPreview.status === "WARNING" &&
                  staffConflictPreview.warningOverrideRequired ? (() => {
                    const staffWarningAlreadyOverridden = Boolean(
                      staffConflictPreview.warningOverrideSatisfied ||
                        (staffConflictPreview.warningKey &&
                          overriddenStaffWarnings[staffConflictPreview.warningKey])
                    );

                    return (
                      <div className="appointment-staff-warning-control">
                        {!staffWarningAlreadyOverridden ? (
                          <label className="appointment-resource-reason-field">
                            Manager staff warning reason
                            <textarea
                              disabled={staffWarningOverrideSaving}
                              onChange={(event) => setStaffWarningReason(event.target.value)}
                              placeholder="Explain why this staff conflict is acceptable."
                              rows={2}
                              value={staffWarningReason}
                            />
                          </label>
                        ) : null}
                        <button
                          className="appointment-resource-action appointment-resource-warning-action"
                          disabled={
                            staffWarningOverrideSaving ||
                            staffWarningAlreadyOverridden ||
                            !staffWarningReason.trim()
                          }
                          onClick={() => void overrideStaffWarning()}
                          type="button"
                        >
                          {staffWarningOverrideSaving
                            ? "Overriding..."
                            : staffWarningAlreadyOverridden
                              ? "Staff Warning Overridden"
                              : "Override Staff Warning"}
                        </button>
                      </div>
                    );
                  })() : null}
                  {staffConflictPreview.checks.map((check) => (
                    <div className={`appointment-readiness-row appointment-readiness-row-${check.status.toLowerCase()}`} key={check.code}>
                      <strong>{check.label}</strong>
                      <span>{check.status}</span>
                      <small>{check.message}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="appointment-readiness-copy">
                  {isStaffConflictLoading
                    ? "Checking required staff availability..."
                    : "Staff conflict preview is not available for this appointment yet."}
                </p>
              )}
            </div>
          ) : null}

          <div className="appointment-detail-section">
              <div className="appointment-section-heading">
                <strong>Owner Reassignment</strong>
                <span className="appointment-resource-chip appointment-resource-requirement-selected">
                  Manager audited
                </span>
              </div>
              <div className="appointment-owner-transfer-card">
                <div className="appointment-owner-transfer-current">
                  <span className="appointment-avatar">{selectedStaff.initials}</span>
                  <div>
                    <strong>{selectedAppointment.staffName ?? selectedStaff.name}</strong>
                    <small>
                      {selectedAppointment.dataSource === "live" && selectedAppointment.recordVersion
                        ? `Current accountable owner · live record v${selectedAppointment.recordVersion}`
                        : "Current preview owner · save requires a live appointment record"}
                    </small>
                  </div>
                </div>
                <label className="appointment-resource-reason-field">
                  New accountable owner
                  <select
                    disabled={
                      selectedAppointment.dataSource !== "live" ||
                      isOwnerTransferSaving ||
                      ownerTransferCandidates.length === 0
                    }
                    onChange={(event) => setOwnerTransferUserId(event.target.value)}
                    value={resolvedOwnerTransferUserId}
                  >
                    {ownerTransferCandidates.length === 0 ? (
                      <option value="">No alternate live staff available</option>
                    ) : null}
                    {ownerTransferCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {candidate.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="appointment-resource-reason-field">
                  Reassignment reason
                  <textarea
                    disabled={
                      selectedAppointment.dataSource !== "live" ||
                      isOwnerTransferSaving ||
                      ownerTransferCandidates.length === 0
                    }
                    onChange={(event) => setOwnerTransferReason(event.target.value)}
                    placeholder="Document why accountability is moving to this staff member."
                    rows={2}
                    value={ownerTransferReason}
                  />
                </label>
                <button
                  className="appointment-resource-action"
                  disabled={
                    isOwnerTransferSaving ||
                    selectedAppointment.dataSource !== "live" ||
                    !selectedAppointment.recordId ||
                    !selectedAppointment.recordVersion ||
                    ownerTransferCandidates.length === 0 ||
                    !resolvedOwnerTransferUserId ||
                    !ownerTransferReason.trim()
                  }
                  onClick={() => void transferAppointmentOwner()}
                  type="button"
                >
                  {isOwnerTransferSaving ? "Transferring..." : "Transfer Owner"}
                </button>
                <p className="appointment-resource-copy">
                  {selectedAppointment.dataSource === "live"
                    ? "Only authorized managers can complete this command. The backend records the prior owner, new owner, version, correlation id, and reason."
                    : "Preview appointments show the enterprise owner-transfer control, but saving is enabled only after the appointment exists as a live record."}
                </p>
              </div>
            </div>

          {selectedAppointment.dataSource === "live" && selectedAppointment.recordId ? (
            <div className="appointment-detail-section">
              <div className="appointment-section-heading">
                <strong>Resource Planning</strong>
                <span className={`appointment-resource-chip appointment-resource-${resourcePlanning?.status.toLowerCase().replaceAll("_", "-") ?? "loading"}`}>
                  {isResourcePlanningLoading
                    ? "Loading"
                    : resourcePlanning?.status.replaceAll("_", " ") ?? "Unavailable"}
                </span>
              </div>
              {resourcePlanning ? (
                <div className="appointment-resource-stack">
                  {resourcePlanning.recommendations.map((recommendation) => (
                    <div
                      className={`appointment-resource-row appointment-resource-row-${recommendation.status.toLowerCase().replaceAll("_", "-")}`}
                      key={recommendation.requirementCode}
                    >
                      <div>
                        <strong>{recommendation.label}</strong>
                        <small>{recommendation.rationale}</small>
                      </div>
                      <span>{recommendation.resourceTypeCode}</span>
                      <p>{recommendation.message}</p>
                      <em>
                        {recommendation.selectedRequirementId
                          ? `${recommendation.selectedReservationCount} reservation${recommendation.selectedReservationCount === 1 ? "" : "s"} attached`
                          : `${recommendation.activeCandidateCount} active candidate${recommendation.activeCandidateCount === 1 ? "" : "s"}`}
                      </em>
                      {!recommendation.selectedRequirementId ? (
                        <button
                          className="appointment-resource-action"
                          disabled={
                            resourceRequirementSavingCode === recommendation.requirementCode ||
                            selectedAppointment.status !== "draft" ||
                            selectedAppointment.dataSource !== "live" ||
                            !recommendation.resourceTypeId ||
                            !resourcePlanning.canManageResourcesForAppointment
                          }
                          onClick={() => void attachResourceRequirement(recommendation)}
                          type="button"
                        >
                          {resourceRequirementSavingCode === recommendation.requirementCode
                            ? "Attaching..."
                            : "Attach Requirement"}
                        </button>
                      ) : null}
                      {recommendation.selectedRequirementId ? (
                        <div className="appointment-resource-candidate-form">
                          {recommendation.selectedReservation ? (
                            <small>
                              Selected: {recommendation.selectedReservation.resourceName} ({recommendation.selectedReservation.status})
                            </small>
                          ) : (
                            <small>No resource candidate proposed yet.</small>
                          )}
                          {recommendation.selectedReservation ? (() => {
                            const availability = candidateAvailability?.proposals.find(
                              (proposal) => proposal.reservationId === recommendation.selectedReservation?.id
                            );
                            const warningAlreadyOverridden = Boolean(
                              recommendation.selectedReservation &&
                                (overriddenResourceWarnings[recommendation.selectedReservation.id] ||
                                  availability?.warningOverrideSatisfied)
                            );

                            return (
                              <>
                                <div className={`appointment-resource-availability appointment-resource-availability-${availability?.status.toLowerCase() ?? "loading"}`}>
                                  <strong>
                                    {recommendation.selectedReservation?.status === "PROPOSED"
                                      ? `Availability: ${isCandidateAvailabilityLoading ? "Checking" : availability?.status ?? "Unavailable"}`
                                      : `Reservation: ${recommendation.selectedReservation?.status}`}
                                  </strong>
                                  {recommendation.selectedReservation?.status !== "PROPOSED" ? (
                                    <span>
                                      {recommendation.selectedReservation?.status === "COMMITTED"
                                        ? "This resource is committed through the schedule command and consumes capacity."
                                        : "This resource is held and consumes capacity until scheduled or released."}
                                    </span>
                                  ) : availability ? (
                                    <span>
                                      {availability.reasons.length > 0
                                        ? `${availability.reasons.join(" ")}${
                                            availability.warningOverrideSatisfied
                                              ? " Warning override recorded."
                                              : ""
                                          }`
                                        : `Capacity available: ${availability.availableCapacity}/${availability.requiredCapacity}`}
                                    </span>
                                  ) : (
                                    <span>
                                      {isCandidateAvailabilityLoading
                                        ? "Checking proposed resource against current reservations and outages."
                                        : "No availability result is available for this proposal yet."}
                                    </span>
                                  )}
                                </div>
                                {recommendation.selectedReservation?.status === "PROPOSED" &&
                                availability?.status === "WARNING" &&
                                !warningAlreadyOverridden ? (
                                  <label className="appointment-resource-reason-field">
                                    Manager warning reason
                                    <textarea
                                      disabled={
                                        resourceWarningOverrideSavingReservationId === recommendation.selectedReservation.id ||
                                        selectedAppointment.status !== "draft" ||
                                        selectedAppointment.dataSource !== "live" ||
                                        !resourcePlanning.canManageResourcesForAppointment
                                      }
                                      onChange={(event) =>
                                        updateResourceActionReason(
                                          "warning-override",
                                          recommendation.selectedReservation!.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Explain why this warning is acceptable."
                                      rows={2}
                                      value={getResourceActionReason(
                                        "warning-override",
                                        recommendation.selectedReservation.id
                                      )}
                                    />
                                  </label>
                                ) : null}
                                {recommendation.selectedReservation?.status === "PROPOSED" ? (
                                  <button
                                    className="appointment-resource-action appointment-resource-hold-action"
                                    disabled={
                                      resourceHoldSavingReservationId === recommendation.selectedReservation.id ||
                                      selectedAppointment.status !== "draft" ||
                                      selectedAppointment.dataSource !== "live" ||
                                      !resourcePlanning.canManageResourcesForAppointment ||
                                      isCandidateAvailabilityLoading ||
                                      availability?.canProceedToHold === false
                                    }
                                    onClick={() => void holdResourceCandidate(recommendation, availability)}
                                    type="button"
                                  >
                                    {resourceHoldSavingReservationId === recommendation.selectedReservation.id
                                      ? "Holding..."
                                      : "Hold Candidate"}
                                  </button>
                                ) : null}
                                {recommendation.selectedReservation?.status === "PROPOSED" &&
                                availability?.status === "WARNING" ? (
                                  <button
                                    className="appointment-resource-action appointment-resource-warning-action"
                                    disabled={
                                      resourceWarningOverrideSavingReservationId === recommendation.selectedReservation.id ||
                                      warningAlreadyOverridden ||
                                      selectedAppointment.status !== "draft" ||
                                      selectedAppointment.dataSource !== "live" ||
                                      !resourcePlanning.canManageResourcesForAppointment ||
                                      isCandidateAvailabilityLoading ||
                                      !getResourceActionReason(
                                        "warning-override",
                                        recommendation.selectedReservation.id
                                      )
                                    }
                                    onClick={() => void overrideResourceWarning(recommendation, availability)}
                                    type="button"
                                  >
                                    {resourceWarningOverrideSavingReservationId === recommendation.selectedReservation.id
                                      ? "Overriding..."
                                      : warningAlreadyOverridden
                                        ? "Warning Overridden"
                                        : "Override Warning"}
                                  </button>
                                ) : null}
                                {["HELD", "COMMITTED"].includes(recommendation.selectedReservation?.status ?? "") ? (
                                  <label className="appointment-resource-reason-field">
                                    Release reason
                                    <textarea
                                      disabled={
                                        resourceReleaseSavingReservationId === recommendation.selectedReservation.id ||
                                        selectedAppointment.dataSource !== "live" ||
                                        !resourcePlanning.canManageResourcesForAppointment
                                      }
                                      onChange={(event) =>
                                        updateResourceActionReason(
                                          "release",
                                          recommendation.selectedReservation!.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Explain why this resource is being released."
                                      rows={2}
                                      value={getResourceActionReason(
                                        "release",
                                        recommendation.selectedReservation.id
                                      )}
                                    />
                                  </label>
                                ) : null}
                                {["HELD", "COMMITTED"].includes(recommendation.selectedReservation?.status ?? "") ? (
                                  <button
                                    className="appointment-resource-action appointment-resource-release-action"
                                    disabled={
                                      resourceReleaseSavingReservationId === recommendation.selectedReservation.id ||
                                      selectedAppointment.dataSource !== "live" ||
                                      !resourcePlanning.canManageResourcesForAppointment ||
                                      !getResourceActionReason(
                                        "release",
                                        recommendation.selectedReservation.id
                                      )
                                    }
                                    onClick={() => void releaseResourceReservation(recommendation)}
                                    type="button"
                                  >
                                    {resourceReleaseSavingReservationId === recommendation.selectedReservation.id
                                      ? "Releasing..."
                                      : "Release Reservation"}
                                  </button>
                                ) : null}
                                {["HELD", "COMMITTED"].includes(recommendation.selectedReservation?.status ?? "") ? (
                                  <label className="appointment-resource-reason-field">
                                    Replacement reason
                                    <textarea
                                      disabled={
                                        resourceReplacementSavingReservationId === recommendation.selectedReservation.id ||
                                        selectedAppointment.dataSource !== "live" ||
                                        !resourcePlanning.canManageResourcesForAppointment
                                      }
                                      onChange={(event) =>
                                        updateResourceActionReason(
                                          "replace",
                                          recommendation.selectedReservation!.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Explain why this resource is being replaced."
                                      rows={2}
                                      value={getResourceActionReason(
                                        "replace",
                                        recommendation.selectedReservation.id
                                      )}
                                    />
                                  </label>
                                ) : null}
                                {["HELD", "COMMITTED"].includes(recommendation.selectedReservation?.status ?? "") ? (
                                  <button
                                    className="appointment-resource-action appointment-resource-replace-action"
                                    disabled={
                                      resourceReplacementSavingReservationId === recommendation.selectedReservation.id ||
                                      selectedAppointment.dataSource !== "live" ||
                                      !resourcePlanning.canManageResourcesForAppointment ||
                                      recommendation.candidates.filter(
                                        (candidate) => candidate.id !== recommendation.selectedReservation?.resourceId
                                      ).length === 0 ||
                                      !getResourceActionReason(
                                        "replace",
                                        recommendation.selectedReservation.id
                                      )
                                    }
                                    onClick={() => void replaceResourceReservation(recommendation)}
                                    type="button"
                                  >
                                    {resourceReplacementSavingReservationId === recommendation.selectedReservation.id
                                      ? "Replacing..."
                                      : "Replace Reservation"}
                                  </button>
                                ) : null}
                              </>
                            );
                          })() : null}
                          <select
                            aria-label={`Select ${recommendation.label} candidate`}
                            disabled={
                              resourceCandidateSavingCode === recommendation.requirementCode ||
                              (selectedAppointment.status !== "draft" &&
                                !["HELD", "COMMITTED"].includes(
                                  recommendation.selectedReservation?.status ?? ""
                                )) ||
                              recommendation.candidates.length === 0 ||
                              selectedAppointment.dataSource !== "live" ||
                              !resourcePlanning.canManageResourcesForAppointment
                            }
                            onChange={(event) =>
                              setSelectedResourceCandidates((current) => ({
                                ...current,
                                [recommendation.requirementCode]: event.target.value
                              }))
                            }
                            value={
                              selectedResourceCandidates[recommendation.requirementCode] ??
                              recommendation.selectedReservation?.resourceId ??
                              recommendation.candidates[0]?.id ??
                              ""
                            }
                          >
                            {recommendation.candidates.length === 0 ? (
                              <option value="">No active candidates</option>
                            ) : null}
                            {recommendation.candidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} · {candidate.capacityMode} · {candidate.conflictPolicy}
                              </option>
                            ))}
                          </select>
                          <button
                            className="appointment-resource-action"
                            disabled={
                              resourceCandidateSavingCode === recommendation.requirementCode ||
                              selectedAppointment.status !== "draft" ||
                              ["HELD", "COMMITTED"].includes(recommendation.selectedReservation?.status ?? "") ||
                              recommendation.candidates.length === 0 ||
                              selectedAppointment.dataSource !== "live" ||
                              !resourcePlanning.canManageResourcesForAppointment
                            }
                            onClick={() => void proposeResourceCandidate(recommendation)}
                            type="button"
                          >
                            {resourceCandidateSavingCode === recommendation.requirementCode
                              ? "Proposing..."
                              : "Propose Candidate"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="appointment-resource-copy">
                  {isResourcePlanningLoading
                    ? "Checking resource requirements and configured resources..."
                    : "Resource planning is not available for this appointment yet."}
                </p>
              )}
            </div>
          ) : null}

          <div className="appointment-detail-section">
            <label className="appointment-outcome-label">
              Outcome
              <select
                disabled={isOutcomeSaving || selectedAppointment.bookingStatus === "COMPLETED"}
                onChange={(event) =>
                  setOutcomeDraft((current) => ({
                    ...current,
                    outcomeCode: event.target.value
                  }))
                }
                value={outcomeFieldValues.outcomeCode}
              >
                {outcomeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="appointment-outcome-label">
              Follow-Up Disposition
              <select
                disabled={isOutcomeSaving || selectedAppointment.bookingStatus === "COMPLETED"}
                onChange={(event) =>
                  setOutcomeDraft((current) => ({
                    ...current,
                    followUpDispositionCode: event.target.value
                  }))
                }
                value={outcomeFieldValues.followUpDispositionCode}
              >
                {followUpDispositionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="appointment-outcome-label">
              Outcome Notes
              <textarea
                disabled={isOutcomeSaving || selectedAppointment.bookingStatus === "COMPLETED"}
                onChange={(event) =>
                  setOutcomeDraft((current) => ({
                    ...current,
                    outcomeNotes: event.target.value
                  }))
                }
                placeholder="Document what happened during this appointment..."
                rows={3}
                value={outcomeFieldValues.outcomeNotes}
              />
            </label>
            <label className="appointment-outcome-label">
              Next Step / Follow-Up
              <textarea
                disabled={isOutcomeSaving || selectedAppointment.bookingStatus === "COMPLETED"}
                onChange={(event) =>
                  setOutcomeDraft((current) => ({
                    ...current,
                    followUpNotes: event.target.value
                  }))
                }
                placeholder={
                  outcomeFieldValues.followUpDispositionCode === "NO_FOLLOW_UP_REQUIRED"
                    ? "Optional: add final handoff notes..."
                    : "Required: document the exact next step..."
                }
                rows={4}
                value={outcomeFieldValues.followUpNotes}
              />
            </label>
            <label className="appointment-outcome-label">
              Completion Reason
              <textarea
                disabled={isOutcomeSaving || selectedAppointment.bookingStatus === "COMPLETED"}
                onChange={(event) =>
                  setOutcomeDraft((current) => ({
                    ...current,
                    reasonNotes: event.target.value
                  }))
                }
                placeholder="Required audit reason for closing this appointment..."
                rows={3}
                value={outcomeFieldValues.reasonNotes}
              />
            </label>
            <p className="appointment-resource-copy">
              {selectedAppointment.bookingStatus === "COMPLETED"
                ? "Final outcome is recorded on this appointment."
                : selectedAppointment.executionStatus === "FINISHED"
                  ? "Ready to save final outcome through the command ledger."
                  : "Finish Work first, then record the final outcome and follow-up."}
            </p>
            <button
              className="appointment-resource-action"
              disabled={
                isOutcomeSaving ||
                selectedAppointment.dataSource !== "live" ||
                selectedAppointment.bookingStatus === "COMPLETED" ||
                selectedAppointment.executionStatus !== "FINISHED" ||
                !outcomeDraft.reasonNotes.trim() ||
                (outcomeDraft.followUpDispositionCode !== "NO_FOLLOW_UP_REQUIRED" &&
                  !outcomeDraft.followUpNotes.trim())
              }
              onClick={() => void submitOutcomeCompletion()}
              type="button"
            >
              {isOutcomeSaving ? "Saving Outcome..." : "Save Outcome"}
            </button>
          </div>

          <div className="appointment-detail-actions">
            {selectedAppointment.status === "draft" ? (
              <button
                disabled={
                  isCommandPending ||
                  selectedAppointment.dataSource !== "live" ||
                  selectedAppointmentIsUnscheduledDraft
                }
                type="button"
                onClick={() => void submitOperationalCommand("SCHEDULE")}
              >
                <ClipboardCheck size={16} aria-hidden="true" />{isCommandPending ? "Scheduling..." : "Schedule Draft"}
              </button>
            ) : null}
            <button
              disabled={
                isCommandPending ||
                selectedAppointment.status === "draft" ||
                selectedAppointment.status === "checked-in" ||
                selectedAppointment.status === "in-progress" ||
                selectedAppointment.status === "no-show" ||
                selectedAppointment.bookingStatus === "COMPLETED" ||
                selectedAppointment.dataSource !== "live"
              }
              type="button"
              onClick={() => void submitOperationalCommand("CHECK_IN")}
            >
              <Check size={16} aria-hidden="true" />{isCommandPending ? "Saving..." : "Check In"}
            </button>
            <button
              disabled={
                isCommandPending ||
                selectedAppointment.dataSource !== "live" ||
                selectedAppointment.status === "draft" ||
                selectedAppointment.status === "no-show" ||
                selectedAppointment.bookingStatus === "COMPLETED" ||
                selectedAppointment.attendanceStatus !== "CHECKED_IN" ||
                selectedAppointment.executionStatus !== "NOT_STARTED"
              }
              type="button"
              onClick={() => void submitOperationalCommand("START")}
            >
              <Clock3 size={16} aria-hidden="true" />{isCommandPending ? "Saving..." : "Start Work"}
            </button>
            <button
              disabled={
                isCommandPending ||
                selectedAppointment.dataSource !== "live" ||
                selectedAppointment.bookingStatus === "COMPLETED" ||
                (selectedAppointment.executionStatus !== "IN_PROGRESS" &&
                  selectedAppointment.executionStatus !== "WAITING")
              }
              type="button"
              onClick={() => void submitOperationalCommand("FINISH")}
            >
              <ClipboardCheck size={16} aria-hidden="true" />{isCommandPending ? "Saving..." : "Finish Work"}
            </button>
            <button
              className="appointment-danger-outline"
              disabled={
                isCommandPending ||
                selectedAppointment.status === "draft" ||
                selectedAppointment.status === "no-show" ||
                selectedAppointment.bookingStatus === "COMPLETED" ||
                selectedAppointment.dataSource !== "live"
              }
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
                  {noShowFollowUpDispositionOptions.map((option) => (
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
