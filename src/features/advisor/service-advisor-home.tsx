"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Camera,
  CarFront,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  Gauge,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Save,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { buildCrmWorkbookPlan } from "@/lib/workday-workbook-crm-integration";
import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";
import receiptLogo from "../../../public/brand/time-motor-sales-horizontal.png";
import { ChecklistReminderField } from "./checklist-reminder-field";
import { ExpandableFocusDetails } from "./expandable-focus-details";
import { WorkbookAppointmentFlow } from "./workbook-appointment-flow";
import { QuickUpdateEditor } from "./quick-update-editor";
import { QuickUpdateContext } from "./quick-update-context";
import { CrmContactImport } from "./crm-contact-import";

type Action = ServiceAdvisorWorkspaceModel["actionQueue"][number];
type InboxItem = ServiceAdvisorWorkspaceModel["inbox"][number];
export type AdvisorQueueFilter = "ATTENTION" | "ALL" | Action["actionKind"] | "WAITING";
type AdvisorViewMode = "CALM" | "HIGH_VOLUME";
type AdvisorWorkspaceSection = "COO_WORKBOOK" | "INBOX" | "WORK";
type WorkbookViewMode = "COO" | "MY";
type InboxFilter = "ALL" | InboxItem["audience"] | "NEEDS_RESPONSE";
type FocusCompassVisualMode = "LIST" | "TIMELINE" | "CALENDAR";
type FocusCompassCalendarView = "DAY" | "WEEK" | "MONTH";
type FocusCalendarSlotType = "FOCUS_BLOCK" | "TASK" | "REMINDER" | "APPOINTMENT" | "FOLLOW_UP";
type FocusCalendarSlot = { focusKey: string; id: string; notes: string; time: string; title: string; type: FocusCalendarSlotType };
type CloseWorkFilter = "ALL" | "CUSTOMER" | "FINANCIAL" | "VEHICLES" | "DOCUMENTS";
type DailySummaryAudience = "HANDOFF" | "MANAGER" | "REPORT";
type EnterpriseCloseRow = {
  checklistId?: string;
  detail: string;
  due: string;
  filter: CloseWorkFilter;
  focusId?: string;
  href: string;
  id: string;
  kind: "checklist" | "focus" | "linked";
  owner: string;
  risk: "High" | "Medium" | "Low" | "Overdue";
  source: string;
  status: string;
  title: string;
};

type WorkbookScopeSearchParams = {
  get(name: string): string | null;
  toString(): string;
};

function currentWorkbookSearchParams(): WorkbookScopeSearchParams {
  return typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}

function automaticWorkbookView(canUseManagementWorkbook: boolean, searchParams: WorkbookScopeSearchParams): WorkbookViewMode {
  if (!canUseManagementWorkbook) return "MY";
  const workbookScope = searchParams.get("workbookScope")?.toUpperCase();
  if (workbookScope === "MY") return "MY";
  if (workbookScope === "COO") return "COO";

  const managerMode = searchParams.get("managerMode")?.toUpperCase();

  return managerMode === "WORK" ? "MY" : "COO";
}

function workbookScopeHref(href: string, workbookView: WorkbookViewMode, returnTo?: string | null) {
  const [hrefWithoutHash, hash] = href.split("#");
  const [pathname, query = ""] = hrefWithoutHash.split("?");
  const params = new URLSearchParams(query);

  if (workbookView === "MY") params.set("workbookScope", "MY");
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//") && !params.has("returnTo")) params.set("returnTo", returnTo);

  const nextQuery = params.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in";
}

function clampFocusScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function focusProofItemsFor(item: FocusCompassMustWin, horizon: FocusCompassHorizon): FocusCompassProofItem[] {
  if (horizon === "TODAY") {
    return [
      { id: "owner", label: "Owner confirmed", weight: 4 },
      { id: "next-action", label: "Next action scheduled", weight: 5 },
      { id: "blocker", label: item.status.toLocaleLowerCase().includes("risk") ? "Risk named" : "Blocker checked", weight: 3 },
      { id: "close-condition", label: "Close condition clear", weight: 4 }
    ];
  }

  if (horizon === "WEEK") {
    return [
      { id: "owner", label: "Owner and due window set", weight: 4 },
      { id: "milestone", label: "Weekly milestone defined", weight: 5 },
      { id: "risk", label: "Promise or deadline risk reviewed", weight: 4 }
    ];
  }

  return [
    { id: "owner", label: "Accountable role named", weight: 4 },
    { id: "measure", label: "Progress measure selected", weight: 5 },
    { id: "review", label: "Review rhythm set", weight: 4 }
  ];
}

function focusProofKey(horizon: FocusCompassHorizon, item: FocusCompassMustWin, proof: FocusCompassProofItem) {
  return `${horizon}:${item.owner}:${item.title}:${proof.id}`;
}

function focusMustWinKey(horizon: FocusCompassHorizon, item: FocusCompassMustWin) {
  return `${horizon}:${item.owner}:${item.title}`;
}

function focusCalendarTone(item: FocusCompassMustWin) {
  const status = item.status.toLocaleLowerCase();
  const impact = item.impact.toLocaleLowerCase();
  if (status.includes("done") || status.includes("complete") || status.includes("on track")) return "done";
  if (status.includes("carry")) return "carryover";
  if (status.includes("risk") || status.includes("block") || status.includes("watch") || impact.includes("critical") || impact.includes("high")) return "risk";
  return "active";
}

function focusCalendarBucketIndex(item: FocusCompassMustWin, index: number, bucketCount: number) {
  if (bucketCount <= 1) return 0;
  const status = item.status.toLocaleLowerCase();
  if (status.includes("carry")) return 0;
  if (status.includes("done") || status.includes("complete")) return bucketCount - 1;
  return Math.min(bucketCount - 1, Math.max(0, index % bucketCount));
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function parseBoardDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(value.getDate() + days);
  return next;
}

function startOfWeek(value: Date) {
  const next = new Date(value);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
}

function calendarDayLabel(value: Date) {
  return value.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function calendarMonthLabel(value: Date) {
  return value.toLocaleDateString([], { month: "long", year: "numeric" });
}

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function actionTone(kind: Action["actionKind"]) {
  if (kind === "AUTHORIZATION") return "urgent";
  if (kind === "PROMISE_RISK") return "risk";
  if (kind === "PARTS_DELAY") return "parts";
  if (kind === "HANDOFF") return "handoff";
  if (kind === "FOLLOW_UP_SCHEDULED") return "scheduled";
  if (kind === "TECHNICIAN_CLARIFICATION") return "tech";
  return "update";
}

function actionButton(kind: Action["actionKind"]) {
  if (kind === "AUTHORIZATION") return "Record decision";
  if (kind === "PROMISE_RISK") return "Review promise";
  if (kind === "PARTS_DELAY") return "Check ETA";
  if (kind === "HANDOFF") return "Prepare handoff";
  if (kind === "FOLLOW_UP_SCHEDULED") return "Review follow-up";
  if (kind === "TECHNICIAN_CLARIFICATION") return "Review clarification";
  return "Update customer";
}

function matchesFilter(item: Action, filter: AdvisorQueueFilter) {
  if (filter === "ALL") return true;
  if (filter === "ATTENTION") return ["AUTHORIZATION", "PROMISE_RISK", "HANDOFF", "CUSTOMER_UPDATE"].includes(item.actionKind);
  if (filter === "WAITING") return ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(item.actionKind);
  return item.actionKind === filter;
}

const filters: Array<{ id: AdvisorQueueFilter; label: string }> = [
  { id: "ATTENTION", label: "My next actions" },
  { id: "ALL", label: "All" },
  { id: "AUTHORIZATION", label: "Approval" },
  { id: "PROMISE_RISK", label: "Promise risk" },
  { id: "TECHNICIAN_CLARIFICATION", label: "Technician" },
  { id: "PARTS_DELAY", label: "Parts" },
  { id: "HANDOFF", label: "Handoff" },
];

const inboxFilters: Array<{ id: InboxFilter; label: string }> = [
  { id: "NEEDS_RESPONSE", label: "Needs response" },
  { id: "ALL", label: "All conversations" },
  { id: "CUSTOMER", label: "Customers" },
  { id: "TEAM", label: "Internal team" },
  { id: "MANAGEMENT", label: "Management" },
];

function inboxAudienceLabel(audience: InboxItem["audience"]) {
  if (audience === "MANAGEMENT") return "Management";
  if (audience === "TEAM") return "Internal team";
  return "Customer";
}

function inboxActionLabel(item: InboxItem) {
  if (item.audience === "MANAGEMENT") return "Review escalation";
  if (item.audience === "TEAM") return "Respond in RO";
  return item.direction === "INBOUND" ? "Respond to customer" : "Open contact record";
}

function inboxComposeHref(item: InboxItem) {
  const compose = item.audience === "MANAGEMENT" ? "management" : item.audience === "TEAM" ? "team" : "customer";
  return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}&compose=${compose}#advisor-response`;
}

function actionQueueCount(items: Action[], kind: Action["actionKind"]) {
  return items.filter((item) => item.actionKind === kind).length;
}

function repairOrderWorkbookHref(repairOrderId: string, returnTo = "/vehicles/coo-workbook", returnLabel = "Daily Workbook") {
  return `/vehicles/repair-workbench?${new URLSearchParams({
    repairOrderId,
    returnLabel,
    returnTo
  }).toString()}`;
}

const advisorWorkspaceReturnTo = "/vehicles/advisor";

function withAdvisorWorkspaceReturn(href: string, returnTo = advisorWorkspaceReturnTo) {
  const [hrefWithoutHash, hash] = href.split("#");
  const [pathname, query = ""] = hrefWithoutHash.split("?");
  if (!pathname.startsWith("/") || pathname === returnTo) return href;
  const params = new URLSearchParams(query);
  if (!params.has("returnTo")) params.set("returnTo", returnTo);

  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

function taskDateParts(value?: string) {
  const due = value ? new Date(value) : new Date();
  const safeDue = Number.isNaN(due.getTime()) ? new Date() : due;
  const pad = (part: number) => part.toString().padStart(2, "0");
  return {
    date: `${safeDue.getFullYear()}-${pad(safeDue.getMonth() + 1)}-${pad(safeDue.getDate())}`,
    time: `${pad(safeDue.getHours())}:${pad(safeDue.getMinutes())}`
  };
}

function cooTaskIntakeHref(input: { brief?: string; dueAt?: string; expectedOutcome: string; returnTo?: string; sourceTitle?: string; title: string; vehicleReference?: string }) {
  const due = taskDateParts(input.dueAt);
  const params = new URLSearchParams({
    dueDate: due.date,
    dueTime: due.time,
    expectedOutcome: input.expectedOutcome,
    intakeType: "Manager Decision",
    returnTo: input.returnTo ?? "/vehicles/coo-workbook",
    title: input.title,
    workflowArea: "GENERAL_MANAGER"
  });
  if (input.brief) params.set("brief", input.brief);
  if (input.sourceTitle) params.set("sourceTitle", input.sourceTitle);
  if (input.vehicleReference) params.set("vehicleReference", input.vehicleReference);
  return `/tasks/intake?${params.toString()}`;
}

function dailyFocusTaskDetails(item: DailyFocusItem, workbookLabel: string) {
  return [
    `Source: ${workbookLabel} Daily Focus`,
    `Source item: ${item.outcome}`,
    item.progressUpdate ? `Progress already recorded: ${item.progressUpdate}` : "",
    item.supportNeeded ? `Support needed: ${item.supportNeeded}` : "",
    item.riskNote ? `Risk or blocker: ${item.riskNote}` : "",
    "",
    "Staff plan:",
    "- Confirm the current status of this source item.",
    "- Record what changed, what is next, who owns it, and when it is due.",
    "- Close it, carry it over, or keep it active with a clear next update."
  ].filter((line) => line || line === "").join("\n").trim();
}

function inferWorkflowAreaFromText(value: string): WorkbookSearchResume["workflowArea"] {
  const text = value.toLocaleLowerCase();
  if (/brake|body|repair|recon|qc|diagnos|mechanic|transmission|tire|detail|shop/.test(text)) return "SHOP";
  if (/stock|inventory|vin|parts|title|vehicle|photo|key/.test(text)) return "INVENTORY";
  if (/lead|sale|prospect|customer wants|buy|sold|delivery/.test(text)) return "SALES";
  if (/payment|balance|past due|collection|promise/.test(text)) return "COLLECTIONS";
  if (/ad|signage|marketing|campaign|facebook|google/.test(text)) return "MARKETING";
  return "GENERAL_MANAGER";
}

type WorkdayWorkbookModel = ServiceAdvisorWorkspaceModel["workbook"];
type StaffWorkbookSummary = ServiceAdvisorWorkspaceModel["staffWorkbookSummaries"][number];
type MorningPrioritySource = ServiceAdvisorWorkspaceModel["morningPrioritySources"][number];
type DailyChecklistItem = WorkdayWorkbookModel["checklistItems"][number];
type QuickUpdateItem = WorkdayWorkbookModel["quickUpdates"][number];
type ReportSeedItem = WorkdayWorkbookModel["reportSeeds"][number];
type CarryoverItem = WorkdayWorkbookModel["carryovers"][number];
type SupportActionItem = WorkdayWorkbookModel["supportActions"][number];
type BringForwardCandidate = WorkdayWorkbookModel["bringForwardCandidates"][number];
type DailyChecklistStatus = DailyChecklistItem["status"];
type QuickUpdateCategory = QuickUpdateItem["category"];
type ReportCadence = "DAILY" | "WEEKLY" | "MONTHLY";
type ManualReportCategory = "COMPLETED" | "UPDATE" | "BLOCKER" | "MANAGEMENT" | "CARRYOVER";
type ManualReportItemDraft = { category: ManualReportCategory; detail: string; id: string; relatedContext: string; title: string };
type MoneyReceivedDraft = {
  amount: string;
  method: "ACH" | "CARD" | "CASH" | "CHECK" | "OTHER" | "WIRE";
  notes: string;
  purpose: "CUSTOMER_PAYMENT" | "DEPOSIT" | "DOWN_PAYMENT" | "OTHER" | "SERVICE_PAYMENT" | "VEHICLE_SALE";
  receivedDate: string;
  receivedFrom: string;
  receivedTime: string;
  reference: string;
  relatedRecord: string;
  verified: boolean;
};
type MoneyReceivedReceipt = {
  activeWorkbookLabel: string;
  amount: string;
  businessDate: string;
  id: string;
  method: string;
  notes: string;
  purpose: string;
  receivedAt: string;
  receivedFrom: string;
  recordedAt: string;
  recordedBy: string;
  reference: string;
  relatedRecord: string;
};
type CloseoutOutcomeKind = "DELIVERY" | "DROPOFF" | "FOLLOW_UP" | "REPAIR" | "SALE";
type CloseoutOutcomeDraft = {
  amount: string;
  assignedTo: string;
  channel: "CALL" | "EMAIL" | "IN_PERSON" | "SMS";
  customer: string;
  details: string;
  eventDate: string;
  eventTime: string;
  flag: boolean;
  nextAction: string;
  notes: string;
  reference: string;
  vehicle: string;
};
type QuickUpdateCategoryOption = { group: string; label: string; value: QuickUpdateCategory };
type DailyFocusItem = WorkdayWorkbookModel["dailyFocusItems"][number];
type DailyFocusPriority = DailyFocusItem["priority"];
type DailyFocusRisk = DailyFocusItem["riskLevel"];
type StartDayCapacity = "ON_TRACK" | "AT_RISK" | "SUPPORT_NEEDED";
type DailyFocusSuggestion = {
  detail: string;
  href: string;
  mustCloseToday: boolean;
  outcome: string;
  priority: DailyFocusPriority;
  rank: number;
  reason: string;
  riskLevel: DailyFocusRisk;
  roleFit: "DIRECT" | "MANAGEMENT" | "SUPPORTING";
  sourceLabel: string;
  sourceId: string;
};
type CommandCardView = "CLOSE" | "ATTENTION" | "WORK" | "REPORT";
type MoreToolCard = { description: string; href: string; icon: typeof ClipboardCheck; outcome: string; title: string; whenToUse: string };
type WorkflowPhaseKey = "START" | "WORK" | "END";
type WorkflowPhaseAction = { detail: string; href: string; icon: typeof ClipboardCheck; key: WorkflowPhaseKey; onSelect?: never; title: string } | { detail: string; href?: never; icon: typeof ClipboardCheck; key: WorkflowPhaseKey; onSelect: () => void; title: string };
type ContextRecommendation = { description: string; href: string; onSelect?: never; phase: WorkflowPhaseKey; title: string } | { description: string; href?: never; onSelect: () => void; phase: WorkflowPhaseKey; title: string };
type StaffExecutionCard = { action: string; detail: string; href: string; icon: typeof ClipboardCheck; title: string; tone: "blue" | "green" | "red" | "yellow" };
type WorkbookResumeSource = "checklist" | "quick" | "focus" | "reportSeed";
type ReviewActionPlanStatus = "DRAFT" | "ACTIVE" | "REVIEW" | "DONE";
type ReviewActionStep = {
  children: ReviewActionStep[];
  comments: string[];
  done: boolean;
  id: string;
  lastUpdatedAt?: string;
  title: string;
};
type ReviewActionPlan = {
  comments: string[];
  dueWindow?: string;
  implementedAt?: string;
  id: string;
  lastSavedAt: string;
  outcome: string;
  owner: string;
  planDate: string;
  priority: DailyFocusPriority;
  status: ReviewActionPlanStatus;
  steps: ReviewActionStep[];
  title: string;
};
type WorkbookSearchResume = {
  boardDate?: string;
  description: string;
  id: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: WorkbookResumeSource;
  title: string;
  workflowArea: "ADMIN" | "COLLECTIONS" | "GENERAL_MANAGER" | "INVENTORY" | "MARKETING" | "SALES" | "SERVICE_ADVISOR" | "SHOP";
};
type SearchableWorkItem = {
  action: string;
  context: string;
  description: string;
  href: string;
  id: string;
  kind: string;
  resume?: WorkbookSearchResume;
  searchText: string;
  source?: {
    boardDate?: string;
    href?: string;
    id: string;
    type: string;
  };
  title: string;
  tone: string;
};
export type CooWorkbookTool = "CHECKLIST" | "TO_DO_LIST" | "QUICK_UPDATE" | "ACTION_PLAN" | "CARRYOVER" | "REPORT_SEEDS" | "STAFF_SUPPORT" | "DRAFTS" | "BRING_FORWARD" | "PURCHASE_APPRAISAL_CAPTURE" | "FOCUS_COMPASS" | "CLOSE_MY_DAY" | "MORE_TOOLS";
type FocusCompassHorizon = "TODAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
type FocusCompassMustWin = { calendarDate?: string; calendarReason?: string; impact: string; owner: string; status: string; title: string };
type FocusCompassProofItem = { id: string; label: string; weight: number };
type FocusCompassExecutionItem = { done: boolean; id: string; label: string };

const quickUpdateCategories: QuickUpdateCategoryOption[] = [
  { group: "People", label: "Customer", value: "CUSTOMER" },
  { group: "People", label: "Vendor", value: "VENDOR" },
  { group: "People", label: "Staff", value: "STAFF" },
  { group: "People", label: "Management", value: "MANAGEMENT" },
  { group: "People", label: "Customer Issue", value: "CUSTOMER_ISSUE" },
  { group: "Operations", label: "Service / Repair", value: "SERVICE_REPAIR" },
  { group: "Operations", label: "Inventory / Parts", value: "INVENTORY_PARTS" },
  { group: "Operations", label: "Purchase / Appraisal", value: "PURCHASE_APPRAISAL" },
  { group: "Operations", label: "Delivery", value: "DELIVERY" },
  { group: "Operations", label: "Towing", value: "TOWING" },
  { group: "Operations", label: "Appointment", value: "APPOINTMENT" },
  { group: "Commitments", label: "Promise / Commitment", value: "PROMISE_COMMITMENT" },
  { group: "Commitments", label: "Blocker / Risk", value: "BLOCKER_RISK" },
  { group: "Business", label: "Sales / Opportunity", value: "SALES_OPPORTUNITY" },
  { group: "Business", label: "Finance", value: "FINANCE" },
  { group: "Business", label: "Insurance", value: "INSURANCE" },
  { group: "Business", label: "Title / Registration", value: "TITLE_REGISTRATION" },
  { group: "Business", label: "Warranty", value: "WARRANTY" },
  { group: "Business", label: "Licensing", value: "LICENSING" },
  { group: "Business", label: "Permit", value: "PERMIT" },
  { group: "Business", label: "Compliance", value: "COMPLIANCE" },
  { group: "Business", label: "Marketing", value: "MARKETING" },
  { group: "Administration", label: "Administration", value: "ADMINISTRATION" },
  { group: "Administration", label: "Documentation", value: "DOCUMENTATION" },
  { group: "Workplace", label: "Facility", value: "FACILITY" },
  { group: "Workplace", label: "Safety", value: "SAFETY" },
  { group: "Learning", label: "Training", value: "TRAINING" },
  { group: "Learning", label: "Process Improvement", value: "PROCESS_IMPROVEMENT" },
  { group: "Other", label: "Other", value: "OTHER" }
];

const quickUpdateCategoryGroups = Array.from(new Set(quickUpdateCategories.map((item) => item.group)));

const moneyMethodLabels: Record<MoneyReceivedDraft["method"], string> = { ACH: "ACH", CARD: "Card", CASH: "Cash", CHECK: "Check", OTHER: "Other", WIRE: "Wire" };
const moneyPurposeLabels: Record<MoneyReceivedDraft["purpose"], string> = { CUSTOMER_PAYMENT: "Customer payment", DEPOSIT: "Deposit", DOWN_PAYMENT: "Down payment", OTHER: "Other", SERVICE_PAYMENT: "Service payment", VEHICLE_SALE: "Vehicle sale" };

function escapeReceiptHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const focusPriorities: Array<{ label: string; value: DailyFocusPriority }> = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" }
];

const genericAdvisorFocusOutcomes = new Set(["authorization needed", "promise risk"]);

function isGenericAdvisorFocusItem(item: DailyFocusItem) {
  return genericAdvisorFocusOutcomes.has(item.outcome.trim().toLocaleLowerCase()) &&
    !item.progressUpdate.trim() &&
    !item.supportNeeded.trim();
}

function checklistStatusLabel(item: DailyChecklistItem) {
  if (item.done) return "Done";
  if (item.status === "RED") return "Blocked";
  if (item.status === "YELLOW") return "Needs update";
  return "On track";
}

function checklistUpdateHistory(item: DailyChecklistItem) {
  return item.update
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [maybeAt, ...textParts] = line.split("|");
      const text = textParts.join("|").trim();
      return text ? { at: maybeAt, text } : { at: item.updatedAt, text: line };
    });
}

function latestChecklistUpdateText(item: DailyChecklistItem) {
  const updates = checklistUpdateHistory(item);
  return updates[updates.length - 1]?.text ?? "";
}

function quickUpdateCategoryLabel(value: QuickUpdateCategory) {
  return quickUpdateCategories.find((item) => item.value === value)?.label ?? "Other";
}

function closeReadinessLabel(tone: WorkdayWorkbookModel["closeReadiness"]["tone"]) {
  if (tone === "READY") return "Ready";
  if (tone === "SUPPORT") return "Needs support";
  return "Needs review";
}

function reportSeedStatusLabel(status: ReportSeedItem["status"]) {
  if (status === "INCLUDED") return "Included";
  if (status === "EXCLUDED") return "Excluded";
  if (status === "CARRIED_OVER") return "Carryover";
  return "Candidate";
}

function reportSeedSourceLabel(seed: ReportSeedItem) {
  if (seed.sourceType === "CHECKLIST_ITEM") return "Daily Checklist";
  if (seed.sourceType === "QUICK_UPDATE") return "Quick Update";
  return "Operations";
}

function bringForwardSourceLabel(sourceType: BringForwardCandidate["sourceType"]) {
  if (sourceType === "DAILY_FOCUS") return "Daily Focus";
  if (sourceType === "CHECKLIST_ITEM") return "Checklist";
  if (sourceType === "QUICK_UPDATE") return "Quick Update";
  return "Carryover";
}

function reportSeedRecordHref(seed: ReportSeedItem) {
  return seed.sourceHref || `/vehicles/coo-workbook/report-seeds#report-seed-${encodeURIComponent(seed.id)}`;
}

function dailyReportDraftText(draft: WorkdayWorkbookModel["reportDrafts"][number]) {
  const sections = draft.sections.map((section) => [
    section.title,
    ...section.items.map((item) => `- ${item.title}: ${item.detail}${item.reviewNote ? ` (${item.reviewNote})` : ""}`)
  ].join("\n")).join("\n\n");
  return `${draft.title}\n${draft.summary}\n\n${sections}`;
}

function dailyFocusRiskFromChecklist(item: DailyChecklistItem): DailyFocusRisk {
  if (item.riskLevel !== "NONE") return item.riskLevel;
  if (item.status === "RED") return "BLOCKED";
  if (item.status === "YELLOW") return "WATCH";
  return "NONE";
}

function buildDailyFocusSuggestions(workbook: WorkdayWorkbookModel, morningPrioritySources: MorningPrioritySource[]): DailyFocusSuggestion[] {
  const existingOutcomes = new Set(workbook.dailyFocusItems.map((item) => item.outcome.trim().toLocaleLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  const suggestions: DailyFocusSuggestion[] = [];
  const addSuggestion = (suggestion: DailyFocusSuggestion) => {
    const key = suggestion.outcome.trim().toLocaleLowerCase();
    if (!key || existingOutcomes.has(key) || seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  workbook.checklistItems
    .filter((item) => !item.done)
    .sort((left, right) => Number(right.status === "RED") - Number(left.status === "RED") || Number(right.carryoverReady) - Number(left.carryoverReady))
    .forEach((item) => addSuggestion({
      detail: latestChecklistUpdateText(item) || checklistStatusLabel(item),
      href: `/vehicles/coo-workbook/checklist#checklist-${encodeURIComponent(item.id)}`,
      mustCloseToday: item.status === "RED" || item.carryoverReady,
      outcome: item.text,
      priority: item.priority,
      rank: (item.status === "RED" ? 95 : item.status === "YELLOW" ? 72 : 42) + (item.carryoverReady ? 12 : 0),
      reason: item.carryoverReady ? "Suggested from unfinished workbook checklist work already marked for carryover." : "Suggested from an unfinished workbook checklist item.",
      riskLevel: dailyFocusRiskFromChecklist(item),
      roleFit: "DIRECT",
      sourceLabel: "Workbook checklist",
      sourceId: `checklist-${item.id}`
    }));

  workbook.carryovers
    .filter((item) => item.status === "OPEN" || item.status === "CONFIRMED")
    .forEach((item) => addSuggestion({
      detail: item.detail || "Carryover work needs ownership.",
      href: item.sourceHref || `/vehicles/coo-workbook/carryover#carryover-${encodeURIComponent(item.id)}`,
      mustCloseToday: item.status === "CONFIRMED",
      outcome: item.title,
      priority: "HIGH",
      rank: item.status === "OPEN" ? 82 : 68,
      reason: item.status === "OPEN" ? "Suggested from open carryover that still needs ownership." : "Suggested from confirmed carryover planned for today.",
      riskLevel: item.status === "OPEN" ? "WATCH" : "NONE",
      roleFit: "DIRECT",
      sourceLabel: "Workbook carryover",
      sourceId: `carryover-${item.id}`
    }));

  workbook.quickUpdates
    .filter((item) => item.followUpNeeded || item.carryoverReady)
    .forEach((item) => addSuggestion({
      detail: [item.person, item.phoneNumber, item.company, item.dueWindow].filter(Boolean).join(" · ") || quickUpdateCategoryLabel(item.category),
      href: `/vehicles/coo-workbook/quick-update#quick-${encodeURIComponent(item.id)}`,
      mustCloseToday: item.followUpNeeded && !item.dueWindow.trim(),
      outcome: item.text,
      priority: item.followUpNeeded ? "HIGH" : "MEDIUM",
      rank: item.followUpNeeded ? item.dueWindow.trim() ? 70 : 86 : 48,
      reason: item.followUpNeeded ? "Suggested from a Quick Update that needs follow-up." : "Suggested from a Quick Update marked for carryover.",
      riskLevel: item.followUpNeeded && !item.dueWindow.trim() ? "WATCH" : "NONE",
      roleFit: "DIRECT",
      sourceLabel: "Workbook quick update",
      sourceId: `quick-${item.id}`
    }));

  morningPrioritySources.forEach((item) => addSuggestion({
    detail: item.detail || (item.dueAt ? `Due ${dateLabel(item.dueAt)}` : item.sourceType === "DUTY" ? "Assigned staff duty" : "Assigned staff task"),
    href: item.href,
    mustCloseToday: item.priority === "CRITICAL" || item.riskLevel === "BLOCKED",
    outcome: item.title,
    priority: item.priority,
    rank: item.rank,
    reason: item.reason,
    riskLevel: item.riskLevel,
    roleFit: item.roleFit,
    sourceLabel: `${item.sourceLabel} · ${item.roleFit === "DIRECT" ? "role match" : item.roleFit === "MANAGEMENT" ? "team oversight" : "supporting"}`,
    sourceId: `${item.sourceType.toLocaleLowerCase()}-${item.sourceId}`
  }));

  return suggestions.sort((left, right) => right.rank - left.rank || left.outcome.localeCompare(right.outcome)).slice(0, 12);
}

function normalizeTaskSourceTitle(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/^(review|confirm|complete|update|resolve|follow up on|follow up)\s+/, "").trim();
}

function matchesTaskSourceTitle(sourceTitle: string, outcome: string) {
  const normalizedSourceTitle = normalizeTaskSourceTitle(sourceTitle);
  const normalizedOutcome = normalizeTaskSourceTitle(outcome);
  return normalizedSourceTitle === normalizedOutcome
    || Math.min(normalizedSourceTitle.length, normalizedOutcome.length) > 12
      && (normalizedSourceTitle.includes(normalizedOutcome) || normalizedOutcome.includes(normalizedSourceTitle));
}

function dailyFocusSuggestionTone(suggestion: DailyFocusSuggestion) {
  if (suggestion.riskLevel === "BLOCKED" || suggestion.priority === "CRITICAL") return "red";
  if (suggestion.riskLevel === "WATCH" || suggestion.priority === "HIGH" || suggestion.mustCloseToday) return "yellow";
  return "blue";
}

function makeReviewActionId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function newReviewActionStep(title: string): ReviewActionStep {
  return { children: [], comments: [], done: false, id: makeReviewActionId("step"), title };
}

function countReviewActionSteps(steps: ReviewActionStep[]): { done: number; total: number } {
  return steps.reduce((summary, step) => {
    const childSummary = countReviewActionSteps(step.children);
    return {
      done: summary.done + (step.done ? 1 : 0) + childSummary.done,
      total: summary.total + 1 + childSummary.total
    };
  }, { done: 0, total: 0 });
}

function updateReviewActionStepTree(steps: ReviewActionStep[], stepId: string, updater: (step: ReviewActionStep) => ReviewActionStep): ReviewActionStep[] {
  return steps.map((step) => {
    if (step.id === stepId) return updater(step);
    return { ...step, children: updateReviewActionStepTree(step.children, stepId, updater) };
  });
}

function removeReviewActionStep(steps: ReviewActionStep[], stepId: string): ReviewActionStep[] {
  return steps
    .filter((step) => step.id !== stepId)
    .map((step) => ({ ...step, children: removeReviewActionStep(step.children, stepId) }));
}

function reviewActionPlanDate(plan: ReviewActionPlan, fallbackDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(plan.planDate) ? plan.planDate : fallbackDate;
}

function normalizeReviewActionStep(step: Partial<ReviewActionStep>): ReviewActionStep {
  return {
    children: Array.isArray(step.children) ? step.children.map((child) => normalizeReviewActionStep(child)) : [],
    comments: Array.isArray(step.comments) ? step.comments.filter((comment): comment is string => typeof comment === "string") : [],
    done: Boolean(step.done),
    id: typeof step.id === "string" ? step.id : makeReviewActionId("step"),
    lastUpdatedAt: typeof step.lastUpdatedAt === "string" ? step.lastUpdatedAt : undefined,
    title: typeof step.title === "string" ? step.title : ""
  };
}

function normalizeReviewActionPlan(plan: Partial<ReviewActionPlan>, fallbackDate: string): ReviewActionPlan {
  return {
    comments: Array.isArray(plan.comments) ? plan.comments.filter((comment): comment is string => typeof comment === "string") : [],
    dueWindow: typeof plan.dueWindow === "string" ? plan.dueWindow : undefined,
    implementedAt: typeof plan.implementedAt === "string" ? plan.implementedAt : undefined,
    id: typeof plan.id === "string" ? plan.id : makeReviewActionId("plan"),
    lastSavedAt: typeof plan.lastSavedAt === "string" ? plan.lastSavedAt : new Date().toISOString(),
    outcome: typeof plan.outcome === "string" ? plan.outcome : "",
    owner: typeof plan.owner === "string" ? plan.owner : "",
    planDate: typeof plan.planDate === "string" ? plan.planDate : fallbackDate,
    priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(plan.priority)) ? plan.priority as DailyFocusPriority : "HIGH",
    status: ["DRAFT", "ACTIVE", "REVIEW", "DONE"].includes(String(plan.status)) ? plan.status as ReviewActionPlanStatus : "DRAFT",
    steps: Array.isArray(plan.steps) ? plan.steps.map((step) => normalizeReviewActionStep(step)) : [],
    title: typeof plan.title === "string" ? plan.title : ""
  };
}

export function CooDailyWorkbook({ compact = false, closedRepairOrderId = null, initialTool = null, model }: { compact?: boolean; closedRepairOrderId?: string | null; initialTool?: CooWorkbookTool | null; model: ServiceAdvisorWorkspaceModel }) {
  const router = useRouter();
  const searchParams = currentWorkbookSearchParams();
  const [workbook, setWorkbook] = useState<WorkdayWorkbookModel>(model.workbook);
  const [staffWorkbook, setStaffWorkbook] = useState<WorkdayWorkbookModel>(model.staffWorkbook);
  const [staffWorkbookSummaries, setStaffWorkbookSummaries] = useState(model.staffWorkbookSummaries);
  const [checklistText, setChecklistText] = useState("");
  const [checklistTextDrafts, setChecklistTextDrafts] = useState<Record<string, string>>({});
  const [checklistUpdateDrafts, setChecklistUpdateDrafts] = useState<Record<string, string>>({});
  const [quickUpdateText, setQuickUpdateText] = useState("");
  const [quickUpdateCategory, setQuickUpdateCategory] = useState<QuickUpdateCategory>("OTHER");
  const [quickUpdatePerson, setQuickUpdatePerson] = useState("");
  const [quickUpdatePhone, setQuickUpdatePhone] = useState("");
  const [quickUpdateCompany, setQuickUpdateCompany] = useState("");
  const [quickUpdateCustomerId, setQuickUpdateCustomerId] = useState<string | null>(null);
  const [quickUpdateFollowUp, setQuickUpdateFollowUp] = useState(false);
  const [quickUpdateDueWindow, setQuickUpdateDueWindow] = useState("");
  const [quickUpdateSaveNotice, setQuickUpdateSaveNotice] = useState("");
  const [focusCompassHorizon, setFocusCompassHorizon] = useState<FocusCompassHorizon>("TODAY");
  const [focusCompassRole, setFocusCompassRole] = useState("All Roles");
  const [focusCompassVisualMode, setFocusCompassVisualMode] = useState<FocusCompassVisualMode>("LIST");
  const [focusCompassCalendarView, setFocusCompassCalendarView] = useState<FocusCompassCalendarView>("WEEK");
  const [selectedFocusCalendarDate, setSelectedFocusCalendarDate] = useState(model.boardDate);
  const [focusCalendarSlots, setFocusCalendarSlots] = useState<Record<string, FocusCalendarSlot[]>>({});
  const [focusSlotDraft, setFocusSlotDraft] = useState({ focusKey: "", notes: "", time: "09:00", title: "", type: "FOCUS_BLOCK" as FocusCalendarSlotType });
  const [activeFocusProofDrawerKey, setActiveFocusProofDrawerKey] = useState<string | null>(null);
  const [focusProofChecked, setFocusProofChecked] = useState<Record<string, boolean>>({});
  const [focusExecutionDrafts, setFocusExecutionDrafts] = useState<Record<string, string>>({});
  const [focusExecutionItems, setFocusExecutionItems] = useState<Record<string, FocusCompassExecutionItem[]>>({});
  const [focusBlockers, setFocusBlockers] = useState<Record<string, string>>({});
  const [focusDistractionChecked, setFocusDistractionChecked] = useState<Record<string, boolean>>({
    "deep-dives": false,
    "decisionless-meetings": false,
    "low-priority": true,
    "unfocused-work": true
  });
  const [supportNote, setSupportNote] = useState("");
  const [supportUpdateRequested, setSupportUpdateRequested] = useState(true);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [commandView, setCommandView] = useState<CommandCardView | null>(null);
  const [closeStepNotice, setCloseStepNotice] = useState<string | null>(null);
  const [closeStepInProgress, setCloseStepInProgress] = useState<"carryover" | "draft" | null>(null);
  const [reviewingEndDay, setReviewingEndDay] = useState(false);
  const endDayReviewRef = useRef<HTMLElement | null>(null);
  const [closeDraftExpanded, setCloseDraftExpanded] = useState(false);
  const [closeWorkFilter, setCloseWorkFilter] = useState<CloseWorkFilter>("ALL");
  const [dailySummary, setDailySummary] = useState("");
  const [dailySummaryAudience, setDailySummaryAudience] = useState<DailySummaryAudience>("REPORT");
  const [moneyDrawerOpen, setMoneyDrawerOpen] = useState(false);
  const [moneyReceivedDraft, setMoneyReceivedDraft] = useState<MoneyReceivedDraft>({
    amount: "",
    method: "CASH",
    notes: "",
    purpose: "CUSTOMER_PAYMENT",
    receivedDate: model.boardDate,
    receivedFrom: "",
    receivedTime: "",
    reference: "",
    relatedRecord: "",
    verified: false
  });
  const [printMoneyReceiptAfterSave, setPrintMoneyReceiptAfterSave] = useState(false);
  const [moneyReceiptToPrint, setMoneyReceiptToPrint] = useState<MoneyReceivedReceipt | null>(null);
  const [closeoutOutcomeKind, setCloseoutOutcomeKind] = useState<CloseoutOutcomeKind | null>(null);
  const [closeoutOutcomeDraft, setCloseoutOutcomeDraft] = useState<CloseoutOutcomeDraft>({
    amount: "",
    assignedTo: "",
    channel: "CALL",
    customer: "",
    details: "",
    eventDate: model.boardDate,
    eventTime: "",
    flag: false,
    nextAction: "",
    notes: "",
    reference: "",
    vehicle: ""
  });
  const [manualReportEditorOpen, setManualReportEditorOpen] = useState(false);
  const [manualReportItems, setManualReportItems] = useState<ManualReportItemDraft[]>([{ category: "UPDATE", detail: "", id: "manual-1", relatedContext: "", title: "" }]);
  const [expandedManualReportItemId, setExpandedManualReportItemId] = useState<string | null>(null);
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [searchActionId, setSearchActionId] = useState<string | null>(null);
  const [bringForwardSearch, setBringForwardSearch] = useState("");
  const [bringForwardType, setBringForwardType] = useState<BringForwardCandidate["sourceType"] | "ALL">("ALL");
  const [saving, setSaving] = useState(false);
  const [purchaseCaptureType, setPurchaseCaptureType] = useState("TRADE_IN");
  const [reviewActionPlans, setReviewActionPlans] = useState<ReviewActionPlan[]>([]);
  const [reviewPlannerLoadedKey, setReviewPlannerLoadedKey] = useState("");
  const [actionPlanTitle, setActionPlanTitle] = useState("");
  const [actionPlanOutcome, setActionPlanOutcome] = useState("");
  const [actionPlanOwner, setActionPlanOwner] = useState("");
  const [actionPlanDate, setActionPlanDate] = useState(model.boardDate);
  const [actionPlanPriority, setActionPlanPriority] = useState<DailyFocusPriority>("HIGH");
  const [firstActionStep, setFirstActionStep] = useState("");
  const [actionStepDrafts, setActionStepDrafts] = useState<Record<string, string>>({});
  const [actionCommentDrafts, setActionCommentDrafts] = useState<Record<string, string>>({});
  const [expandedReviewPlanIds, setExpandedReviewPlanIds] = useState<Record<string, boolean>>({});
  const [reviewPlanFeedback, setReviewPlanFeedback] = useState<Record<string, { at: string; message: string; tone: "active" | "done" | "saved" }>>({});
  function openEndDayReview() {
    if (!reviewingEndDay) {
      setReviewingEndDay(true);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        endDayReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        endDayReviewRef.current?.focus({ preventScroll: true });
      }));
      return;
    }
    endDayReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    endDayReviewRef.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!manualReportEditorOpen && !expandedManualReportItemId && !moneyDrawerOpen && !closeoutOutcomeKind) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (expandedManualReportItemId) setExpandedManualReportItemId(null);
      else setManualReportEditorOpen(false);
      if (moneyDrawerOpen) setMoneyDrawerOpen(false);
      if (closeoutOutcomeKind) setCloseoutOutcomeKind(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeoutOutcomeKind, expandedManualReportItemId, manualReportEditorOpen, moneyDrawerOpen]);
  useEffect(() => {
    if (!moneyDrawerOpen && !closeoutOutcomeKind) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [closeoutOutcomeKind, moneyDrawerOpen]);
  useEffect(() => {
    if (!moneyReceiptToPrint) return;
    const clearReceiptPrint = () => {
      setMoneyReceiptToPrint(null);
    };
    window.addEventListener("afterprint", clearReceiptPrint);
    return () => window.removeEventListener("afterprint", clearReceiptPrint);
  }, [moneyReceiptToPrint]);
  const actionQueue = closedRepairOrderId
    ? model.actionQueue.filter((item) => item.id !== closedRepairOrderId)
    : model.actionQueue;
  const approvalCount = actionQueueCount(actionQueue, "AUTHORIZATION");
  const reportExceptions = actionQueue.filter((item) => matchesFilter(item, "ATTENTION") || matchesFilter(item, "WAITING")).length;
  const staffWorkbookLabel = model.workspace.staffWorkbookLabel;
  const managementWorkbookLabel = model.workspace.managementWorkbookLabel;
  const canUseManagementWorkbook = model.workspace.canUseManagementWorkbook;
  const effectiveWorkbookView = automaticWorkbookView(canUseManagementWorkbook, searchParams);
  const activeWorkbook = effectiveWorkbookView === "MY" ? staffWorkbook : workbook;
  const activeWorkbookLabel = effectiveWorkbookView === "MY" ? staffWorkbookLabel : managementWorkbookLabel;
  const activeWorkbookOwner = effectiveWorkbookView === "MY" ? model.advisor.name.split(" ")[0] ?? "Staff" : "Manager";
  const reviewPlannerStorageKey = `coo-review-action-planner:${activeWorkbook.id}:${model.boardDate}:v1`;
  const sourceReturnTo = searchParams.get("returnTo");
  const scopedWorkbookHref = (href: string) => href.startsWith("/vehicles/coo-workbook") ? workbookScopeHref(href, effectiveWorkbookView, sourceReturnTo) : href;
  const printMoneyReceipt = (receipt: MoneyReceivedReceipt) => {
    const receiptWindow = window.open("", "_blank", "popup,width=720,height=900");
    if (!receiptWindow) {
      setCloseStepNotice("Receipt is ready, but the print window was blocked. Allow pop-ups for this site, then choose Print receipt again.");
      window.print();
      return;
    }

    const rows = [
      ["Received from", receipt.receivedFrom],
      ["Payment method", receipt.method],
      ["Applied to", receipt.purpose],
      ["Received", receipt.receivedAt],
      ["Reference", receipt.reference || "Not provided"],
      ["Related record", receipt.relatedRecord || "Not provided"],
      ["Business date", receipt.businessDate],
      ["Workbook", receipt.activeWorkbookLabel],
      ["Recorded by", receipt.recordedBy],
      ["Recorded at", receipt.recordedAt]
    ];
    const notesMarkup = receipt.notes
      ? `<section><h2>Notes</h2><p>${escapeReceiptHtml(receipt.notes)}</p></section>`
      : "";
    const receiptRows = rows.map(([label, value]) => `<div><dt>${escapeReceiptHtml(label)}</dt><dd>${escapeReceiptHtml(value)}</dd></div>`).join("");

    receiptWindow.document.open();
    receiptWindow.document.write(`<!doctype html>
<html>
<head>
  <title>Money Received Receipt - ${escapeReceiptHtml(receipt.receivedFrom)}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f5f8; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    main { display: grid; align-content: start; gap: 18px; width: min(760px, 100%); min-height: 100vh; margin: 0 auto; padding: 34px 42px; background: #fff; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 18px; }
    img { width: 230px; height: auto; }
    header div { display: grid; gap: 4px; text-align: right; }
    header strong { font-size: 18px; }
    header span { font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .amount { display: grid; gap: 6px; border: 1px solid #111827; padding: 16px; }
    .amount span { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .amount strong { font-size: 34px; }
    dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border: 1px solid #c7ced8; border-bottom: 0; margin: 0; }
    dl div { display: grid; gap: 5px; border-bottom: 1px solid #c7ced8; padding: 10px 12px; }
    dt { color: #4b5563; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    dd { margin: 0; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
    section { display: grid; gap: 6px; border: 1px solid #c7ced8; padding: 12px; }
    h2 { margin: 0; font-size: 12px; text-transform: uppercase; }
    p { margin: 0; font-size: 12px; line-height: 1.5; }
    footer { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #c7ced8; padding-top: 12px; color: #4b5563; font-size: 11px; }
    .screen-actions { display: flex; gap: 8px; justify-content: flex-end; }
    button { min-height: 38px; border: 1px solid #315bdc; border-radius: 7px; padding: 0 13px; background: #315bdc; color: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    @media print {
      body { background: #fff; }
      main { width: 100%; min-height: auto; margin: 0; padding: 0; }
      .screen-actions { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <header><img alt="Time Motor Sales" src="${escapeReceiptHtml(receiptLogo.src)}" /><div><strong>Time Motor Sales</strong><span>Money Received Receipt</span></div></header>
    <div class="amount"><span>Amount received</span><strong>${escapeReceiptHtml(receipt.amount)}</strong></div>
    <dl>${receiptRows}</dl>
    ${notesMarkup}
    <footer><span>Customer copy</span><span>Receipt ID: ${escapeReceiptHtml(receipt.id)}</span></footer>
    <div class="screen-actions"><button type="button" onclick="window.print()">Print receipt</button></div>
  </main>
  <script>
    window.addEventListener("load", () => {
      window.focus();
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`);
    receiptWindow.document.close();
  };
  const changeCloseoutScope = (scope: "MY" | "TEAM") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("workbookScope", scope === "MY" ? "MY" : "COO");
    if (!params.has("date")) params.set("date", model.boardDate);
    router.push(`/vehicles/coo-workbook/close-my-day?${params.toString()}`);
  };
  const workbookExitHref = sourceReturnTo?.startsWith("/") && !sourceReturnTo.startsWith("//") ? sourceReturnTo : scopedWorkbookHref("/vehicles/coo-workbook");
  const repairOrderHref = (repairOrderId: string) => repairOrderWorkbookHref(repairOrderId, workbookExitHref, sourceReturnTo ? "My Workspace" : activeWorkbookLabel);
  const taskIntakeReturnHref = scopedWorkbookHref("/vehicles/coo-workbook");
  const dailyPursePendingWork = actionQueue.map((item) => ({
    detail: `${item.repairOrderNumber} · ${item.vehicleLabel} · ${item.actionReason}`,
    href: repairOrderHref(item.id),
    id: `${item.actionKind}-${item.id}`,
    title: item.actionLabel
  }));
  const checklistItems = activeWorkbook.checklistItems;
  const quickUpdates = activeWorkbook.quickUpdates;
  const reportSeeds = activeWorkbook.reportSeeds;
  const latestReportDraft = activeWorkbook.reportDrafts[0] ?? null;
  const carryovers = activeWorkbook.carryovers;
  const supportActions = activeWorkbook.supportActions;
  const isClosed = activeWorkbook.status === "CLOSED";
  const protectedCarryoverCount = carryovers.filter((item) => item.status !== "DISMISSED").length;
  const closeReadiness = activeWorkbook.closeReadiness;
  const checklistRollup = {
    carryover: checklistItems.filter((item) => item.carryoverReady).length,
    done: checklistItems.filter((item) => item.done).length,
    open: checklistItems.filter((item) => !item.done).length,
    support: checklistItems.filter((item) => !item.done && (item.status === "YELLOW" || item.status === "RED")).length
  };
  const dailyFocusRollup = {
    done: activeWorkbook.dailyFocusItems.filter((item) => item.status === "DONE").length,
    open: activeWorkbook.dailyFocusItems.filter((item) => item.status !== "DONE").length,
    total: activeWorkbook.dailyFocusItems.length
  };
  const todayWorkRollup = {
    done: dailyFocusRollup.done + checklistRollup.done,
    total: dailyFocusRollup.total + checklistItems.length
  };
  const quickUpdateRollup = {
    carryover: quickUpdates.filter((item) => item.carryoverReady).length,
    followUp: quickUpdates.filter((item) => item.followUpNeeded).length,
    total: quickUpdates.length
  };
  const bringForwardCandidates = activeWorkbook.bringForwardCandidates ?? [];
  const normalizedBringForwardSearch = bringForwardSearch.trim().toLocaleLowerCase();
  const filteredBringForwardCandidates = bringForwardCandidates.filter((item) => {
    if (bringForwardType !== "ALL" && item.sourceType !== bringForwardType) return false;
    if (!normalizedBringForwardSearch) return true;
    return [item.title, item.detail, item.sourceBoardDate, item.sourceType].join(" ").toLocaleLowerCase().includes(normalizedBringForwardSearch);
  });
  const quickUpdateIntelligence = activeWorkbook.quickUpdateIntelligence ?? {
    highImpactCount: 0,
    reportWorthyCount: 0,
    staffGuidance: quickUpdates.length ? "Quick Updates are ready for close review." : "No Quick Updates captured yet."
  };
  const reportSeedRollup = {
    active: reportSeeds.filter((seed) => seed.status !== "EXCLUDED").length,
    candidate: reportSeeds.filter((seed) => seed.status === "CANDIDATE").length,
    carryover: reportSeeds.filter((seed) => seed.status === "CARRIED_OVER").length,
    excluded: reportSeeds.filter((seed) => seed.status === "EXCLUDED").length,
    included: reportSeeds.filter((seed) => seed.status === "INCLUDED").length,
    reviewed: reportSeeds.filter((seed) => seed.status !== "CANDIDATE").length,
    total: reportSeeds.length
  };
  const staffTodayRollup = {
    ready: staffWorkbookSummaries.filter((item) => item.closeReadinessTone === "READY").length,
    review: staffWorkbookSummaries.filter((item) => item.closeReadinessTone === "REVIEW").length,
    support: staffWorkbookSummaries.filter((item) => item.closeReadinessTone === "SUPPORT").length,
    total: staffWorkbookSummaries.length
  };
  const reviewActionPlanRollup = reviewActionPlans.reduce((summary, plan) => {
    const stepSummary = countReviewActionSteps(plan.steps);
    return {
      done: summary.done + stepSummary.done,
      plans: summary.plans + 1,
      steps: summary.steps + stepSummary.total
    };
  }, { done: 0, plans: 0, steps: 0 });
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(reviewPlannerStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ReviewActionPlan[];
          setReviewActionPlans(Array.isArray(parsed) ? parsed.map((plan) => normalizeReviewActionPlan(plan, model.boardDate)) : []);
        } else {
          setReviewActionPlans([]);
        }
      } catch {
        setReviewActionPlans([]);
      }
      setReviewPlannerLoadedKey(reviewPlannerStorageKey);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [model.boardDate, reviewPlannerStorageKey]);
  useEffect(() => {
    if (reviewPlannerLoadedKey !== reviewPlannerStorageKey) return;
    window.localStorage.setItem(reviewPlannerStorageKey, JSON.stringify(reviewActionPlans));
  }, [reviewActionPlans, reviewPlannerLoadedKey, reviewPlannerStorageKey]);
  const planTaskHref = cooTaskIntakeHref({
    brief: `Create the ${activeWorkbookLabel} daily action plan from ${actionQueue.length} active repair order signal(s), ${approvalCount} approval review item(s), and ${reportExceptions} unresolved risk/carryover item(s).`,
    dueAt: model.generatedAt,
    expectedOutcome: "The COO daily action plan is reviewed, prioritized, assigned, and ready to support the end-of-day operations report.",
    returnTo: taskIntakeReturnHref,
    title: `Create ${activeWorkbookLabel} daily action plan`
  });
  const supportSignals = closeReadiness.checklistNeedsSupport + closeReadiness.quickFollowUps + reportExceptions;
  const buildSearchText = (...parts: Array<string | number | null | undefined | string[]>) => parts.flatMap((part) => Array.isArray(part) ? part : [part]).filter((part): part is string | number => part !== null && part !== undefined && String(part).trim().length > 0).join(" ").toLocaleLowerCase();
  const crmWorkbookPlan = buildCrmWorkbookPlan([
    ...quickUpdates.filter((item) => item.followUpNeeded).map((item) => ({
      detail: [item.person, item.phoneNumber, item.company, item.dueWindow, item.text].filter(Boolean).join(" · "),
      href: "/vehicles/coo-workbook/quick-update",
      id: `crm-quick-${item.id}`,
      itemType: item.dueWindow.trim() ? "FOLLOW_UP_DUE_TODAY" as const : "OVERDUE_FOLLOW_UP" as const,
      priority: item.dueWindow.trim() ? "HIGH" as const : "CRITICAL" as const,
      riskLevel: item.dueWindow.trim() ? "WATCH" as const : "BLOCKED" as const,
      sourceId: item.id,
      sourceType: "QUICK_UPDATE",
      title: item.person ? `Follow up with ${item.person}` : item.text.slice(0, 90)
    })),
    ...model.appointments.map((item) => ({
      customerName: item.customerName,
      detail: `${item.title} · ${item.vehicleLabel} · ${item.startsAt ? dateLabel(item.startsAt) : "Time not set"}`,
      dueAt: item.startsAt,
      href: "/appointments?view=board",
      id: `crm-appointment-${item.id}`,
      itemType: "APPOINTMENT_TODAY" as const,
      priority: "MEDIUM" as const,
      riskLevel: "NONE" as const,
      sourceId: item.id,
      sourceType: "APPOINTMENT",
      title: item.customerName ? `Appointment: ${item.customerName}` : item.title
    })),
    ...reportSeeds.filter((seed) => seed.status !== "EXCLUDED").map((seed) => ({
      detail: seed.detail,
      href: reportSeedRecordHref(seed),
      id: `crm-seed-${seed.id}`,
      itemType: seed.sourceType === "OPERATING_EXCEPTION" ? "OPEN_CUSTOMER_ISSUE" as const : "DEAL_NEEDS_ACTION" as const,
      priority: seed.tone === "RED" ? "CRITICAL" as const : seed.tone === "YELLOW" ? "HIGH" as const : "MEDIUM" as const,
      riskLevel: seed.tone === "RED" ? "BLOCKED" as const : seed.tone === "YELLOW" ? "WATCH" as const : "NONE" as const,
      sourceId: seed.id,
      sourceType: "REPORT_SEED",
      title: seed.title
    })),
    ...model.collaboratingTasks.map((item) => ({
      customerName: item.customerReference,
      detail: [item.description, item.customerReference, item.vehicleReference, item.capacityRequested, `Due ${dateLabel(item.dueAt)}`].filter(Boolean).join(" · "),
      dueAt: item.dueAt,
      href: item.href,
      id: `crm-task-${item.id}`,
      itemType: "MANAGER_ASSIGNED_CUSTOMER_TASK" as const,
      ownerUserId: model.advisor.id,
      priority: item.priority,
      riskLevel: item.status === "BLOCKED" ? "BLOCKED" as const : ["WAITING_ON_APPROVAL", "WAITING_ON_PARTS", "READY_FOR_REVIEW"].includes(item.status) ? "WATCH" as const : "NONE" as const,
      sourceId: item.id,
      sourceType: "TASK",
      title: item.title
    }))
  ], {
    existingFocusItems: activeWorkbook.dailyFocusItems,
    limit: 10
  });
  const attentionItems = [
    ...actionQueue.slice(0, 4).map((item) => ({
      action: actionButton(item.actionKind),
      context: `${item.customerName} · ${item.repairOrderNumber} · ${item.vehicleLabel}`,
      description: item.actionReason,
      href: repairOrderHref(item.id),
      id: `action-${item.id}`,
      meta: item.nextAction !== "Next action not recorded" ? `Next: ${item.nextAction}` : `${stageLabel(item.stage)} · ${stageLabel(item.operatingState)}`,
      searchText: buildSearchText(item.actionLabel, item.actionReason, item.customerName, item.repairOrderNumber, item.vehicleLabel, item.vehicleIdentifiers ?? [], item.nextAction, item.stage, item.operatingState),
      title: item.actionLabel,
      tone: item.actionKind === "AUTHORIZATION" || item.overdue ? "red" : item.actionKind === "PARTS_DELAY" || item.actionKind === "TECHNICIAN_CLARIFICATION" || item.actionKind === "PROMISE_RISK" ? "yellow" : "blue"
    })),
    ...quickUpdates.filter((item) => item.followUpNeeded || item.carryoverReady).slice(0, 2).map((item) => ({
      action: item.followUpNeeded ? "Follow up" : "Review",
      context: [item.person, item.phoneNumber, item.company, item.dueWindow].filter(Boolean).join(" · ") || "Quick Update",
      description: item.text,
      href: "/vehicles/coo-workbook/quick-update",
      id: `quick-${item.id}`,
      meta: quickUpdateCategoryLabel(item.category),
      searchText: buildSearchText(item.text, item.person, item.phoneNumber, item.company, item.dueWindow, quickUpdateCategoryLabel(item.category)),
      title: "Quick update needs follow-up",
      tone: item.followUpNeeded ? "yellow" : "blue"
    })),
    ...checklistItems.filter((item) => !item.done && (item.status === "RED" || item.status === "YELLOW" || item.carryoverReady)).slice(0, 2).map((item) => ({
      action: item.status === "RED" ? "Resolve" : "Update",
      context: latestChecklistUpdateText(item) || "Daily Checklist",
      description: item.text,
      href: "/vehicles/coo-workbook/checklist",
      id: `checklist-${item.id}`,
      meta: checklistStatusLabel(item),
      searchText: buildSearchText(item.text, latestChecklistUpdateText(item), checklistStatusLabel(item)),
      title: "Checklist item needs attention",
      tone: item.status === "RED" ? "red" : "yellow"
    }))
  ].slice(0, 4);
  const searchableWorkItems: SearchableWorkItem[] = [
    ...attentionItems.map((item) => ({
      action: item.action,
      context: item.context,
      description: item.description,
      href: item.href,
      id: item.id,
      kind: "Attention",
      searchText: item.searchText,
      title: item.title,
      tone: item.tone
    })),
    ...model.repairOrders.filter((item) => item.id !== closedRepairOrderId).map((item) => ({
      action: "Open RO",
      context: `${item.customerName} · ${item.vehicleLabel}`,
      description: `${item.repairOrderNumber} · ${stageLabel(item.stage)} · ${stageLabel(item.operatingState)} · Next: ${item.nextAction}`,
      href: repairOrderHref(item.id),
      id: `repair-${item.id}`,
      kind: "Repair Order",
      searchText: buildSearchText(item.customerName, item.repairOrderNumber, item.vehicleLabel, item.vehicleIdentifiers ?? [], item.stage, item.operatingState, item.nextAction),
      title: item.repairOrderNumber,
      tone: item.age.overdue ? "red" : "blue"
    })),
    ...model.appointments.map((item) => ({
      action: "Open schedule",
      context: `${item.customerName} · ${item.vehicleLabel}`,
      description: `${item.title} · ${item.startsAt ? dateLabel(item.startsAt) : "Time not set"}`,
      href: "/appointments?view=board",
      id: `appointment-${item.id}`,
      kind: "Appointment",
      searchText: buildSearchText(item.appointmentNumber, item.customerName, item.email, item.phoneNumber, item.title, item.vehicleLabel, item.vehicleIdentifiers ?? [], item.startsAt),
      title: item.appointmentNumber,
      tone: "blue"
    })),
    ...model.collaboratingTasks.map((item) => ({
      action: "Work task",
      context: [
        `Owner: ${item.assignedUserName}`,
        item.status.replaceAll("_", " ").toLocaleLowerCase(),
        item.priority.toLocaleLowerCase(),
        item.capacityRequested
      ].filter(Boolean).join(" · "),
      description: [
        item.description,
        item.collaborationScope ? `Help needed: ${item.collaborationScope}` : "",
        item.vehicleReference,
        item.customerReference,
        `Due ${dateLabel(item.dueAt)}`
      ].filter(Boolean).join(" · "),
      href: item.href,
      id: `collaborating-task-${item.id}`,
      kind: "Collaborating Task",
      searchText: item.searchText,
      source: {
        boardDate: item.boardDate,
        href: item.href,
        id: item.id,
        type: "TASK"
      },
      title: item.title,
      tone: item.status === "BLOCKED" ? "red" : ["WAITING_ON_APPROVAL", "WAITING_ON_PARTS", "READY_FOR_REVIEW"].includes(item.status) || item.priority === "HIGH" || item.priority === "CRITICAL" ? "yellow" : "blue"
    })),
    ...crmWorkbookPlan.map((item) => ({
      action: item.alreadyInTodayFocus ? "In focus" : item.nextBestAction.label,
      context: [item.customerName, item.itemType.replaceAll("_", " ").toLocaleLowerCase(), item.dueAt ? dateLabel(item.dueAt) : ""].filter(Boolean).join(" · "),
      description: item.detail,
      href: item.href,
      id: `crm-workbook-${item.id}`,
      kind: "CRM Work",
      searchText: buildSearchText(item.title, item.detail, item.customerName, item.itemType, item.sourceType),
      source: {
        href: item.href,
        id: item.sourceId,
        type: item.sourceType
      },
      title: item.title,
      tone: item.riskLevel === "BLOCKED" ? "red" : item.riskLevel === "WATCH" || item.priority === "HIGH" || item.priority === "CRITICAL" ? "yellow" : "blue"
    })),
    ...checklistItems.map((item) => ({
      action: item.convertedTaskId ? "Open task" : item.done ? "Review" : "Update",
      context: checklistStatusLabel(item),
      description: latestChecklistUpdateText(item) || item.text,
      href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : "/vehicles/coo-workbook/checklist",
      id: `search-checklist-${item.id}`,
      kind: "Checklist",
      ...(item.convertedTaskId ? {} : {
        resume: {
          boardDate: model.boardDate,
          description: `Converted from ${activeWorkbookLabel} Daily Checklist. Update: ${latestChecklistUpdateText(item) || "No update added yet."}`,
          id: item.id,
          priority: item.status === "RED" ? "HIGH" as const : item.status === "YELLOW" ? "MEDIUM" as const : "LOW" as const,
          source: "checklist" as const,
          title: item.text,
          workflowArea: inferWorkflowAreaFromText(`${item.text} ${latestChecklistUpdateText(item)} ${item.riskNote}`)
        }
      }),
      searchText: buildSearchText(item.text, latestChecklistUpdateText(item), checklistStatusLabel(item)),
      title: item.text,
      tone: item.status === "RED" ? "red" : item.status === "YELLOW" ? "yellow" : "blue"
    })),
    ...quickUpdates.map((item) => ({
      action: item.convertedTaskId ? "Open task" : item.followUpNeeded ? "Follow up" : "Review",
      context: [quickUpdateCategoryLabel(item.category), item.person, item.phoneNumber, item.company, item.dueWindow].filter(Boolean).join(" · "),
      description: item.text,
      href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : "/vehicles/coo-workbook/quick-update",
      id: `search-quick-${item.id}`,
      kind: "Quick Update",
      ...(item.convertedTaskId ? {} : {
        resume: {
          boardDate: model.boardDate,
          description: `Converted from ${activeWorkbookLabel} Quick Update. Category: ${quickUpdateCategoryLabel(item.category)}. ${item.person ? `Person: ${item.person}. ` : ""}${item.phoneNumber ? `Phone: ${item.phoneNumber}. ` : ""}${item.company ? `Company: ${item.company}. ` : ""}${item.text}`,
          id: item.id,
          priority: item.followUpNeeded ? "HIGH" as const : "MEDIUM" as const,
          source: "quick" as const,
          title: item.followUpNeeded ? `Follow up: ${item.text.slice(0, 72)}` : item.text,
          workflowArea: inferWorkflowAreaFromText(`${item.text} ${item.category} ${item.company}`)
        }
      }),
      searchText: buildSearchText(item.text, item.person, item.phoneNumber, item.company, item.dueWindow, quickUpdateCategoryLabel(item.category)),
      title: item.text,
      tone: item.followUpNeeded ? "yellow" : "blue"
    })),
    ...reportSeeds.map((item) => ({
      action: item.sourceHref ? "Open source" : "Open seed",
      context: reportSeedSourceLabel(item),
      description: item.detail,
      href: reportSeedRecordHref(item),
      id: `search-seed-${item.id}`,
      kind: "Report Seed",
      resume: {
        boardDate: model.boardDate,
        description: `Converted from ${activeWorkbookLabel} Report Seed. ${item.detail}`,
        id: item.id,
        priority: item.status === "CARRIED_OVER" ? "HIGH" as const : "MEDIUM" as const,
        source: "reportSeed" as const,
        title: item.title,
        workflowArea: inferWorkflowAreaFromText(`${item.title} ${item.detail}`)
      },
      searchText: buildSearchText(item.title, item.detail, reportSeedSourceLabel(item), reportSeedStatusLabel(item.status)),
      title: item.title,
      tone: item.status === "CARRIED_OVER" ? "yellow" : "blue"
    })),
    ...(model.workbookSearchHistory ?? [])
  ];
  const normalizedWorkSearch = workSearchQuery.trim().toLocaleLowerCase();
  const workSearchResults = normalizedWorkSearch
    ? searchableWorkItems.filter((item) => item.searchText.includes(normalizedWorkSearch)).slice(0, 8)
    : [];
  const workSearchTaskHref = workSearchQuery.trim()
    ? cooTaskIntakeHref({
      brief: `Review and create the right follow-up for: ${workSearchQuery.trim()}`,
      dueAt: model.generatedAt,
      expectedOutcome: "The searched customer, vehicle, repair order, or work reference is reviewed and routed to the right next action.",
      returnTo: taskIntakeReturnHref,
      title: `Review ${workSearchQuery.trim().slice(0, 70)}`,
      vehicleReference: workSearchQuery.trim()
    })
    : "";
  const commandCards = [
    {
      icon: CheckCircle2,
      key: "CLOSE" as const,
      label: "Daily Close",
      meta: isClosed && activeWorkbook.closedAt ? `Saved ${dateLabel(activeWorkbook.closedAt)}` : closeReadinessLabel(closeReadiness.tone),
      stat: isClosed ? "Closed" : `${closeReadiness.score}/100`,
      tone: isClosed || closeReadiness.tone === "READY" ? "green" : closeReadiness.tone === "SUPPORT" ? "yellow" : "blue"
    },
    {
      icon: AlertTriangle,
      key: "ATTENTION" as const,
      label: isClosed ? "Attention at Close" : "Needs Attention",
      meta: isClosed ? supportSignals ? "Carried or reported" : "Clear" : supportSignals ? "Review now" : "Clear",
      stat: supportSignals,
      tone: isClosed ? supportSignals ? "yellow" : "green" : supportSignals ? "red" : "green"
    },
    {
      icon: ListChecks,
      key: "WORK" as const,
      label: isClosed ? "Day’s Work" : "Today’s Work",
      meta: `${todayWorkRollup.done} ${isClosed ? "completed" : "done"}`,
      stat: `${todayWorkRollup.total} items`,
      tone: "blue"
    },
    {
      icon: FileText,
      key: "REPORT" as const,
      label: isClosed ? "Daily Report" : "Report Ready",
      meta: isClosed ? "Ready to review" : latestReportDraft ? `Draft v${latestReportDraft.version}` : "Draft ready",
      stat: isClosed && latestReportDraft ? `Draft v${latestReportDraft.version}` : `${reportSeedRollup.active} seeds`,
      tone: latestReportDraft ? "green" : "blue"
    }
  ];
  const activeCommandView = commandView ?? "CLOSE";
  const commandDetailItems = activeCommandView === "CLOSE"
    ? isClosed
      ? [{ action: "Open report", detail: `${protectedCarryoverCount} carryover item(s) protected for tomorrow.`, href: "/vehicles/coo-workbook/drafts", id: "closed-report", title: "Today is closed and the daily report is ready." }]
      : closeReadiness.prompts.slice(0, 5).map((prompt, index) => ({ action: index === 0 ? "Open close" : "Review", detail: closeReadinessLabel(closeReadiness.tone), href: "#close-report", id: `close-${index}`, title: prompt }))
    : activeCommandView === "ATTENTION"
      ? attentionItems.map((item) => ({ action: item.action, detail: item.context, href: item.href, id: item.id, title: item.title }))
      : activeCommandView === "WORK"
        ? [
          ...activeWorkbook.dailyFocusItems.slice(0, 3).map((item) => ({ action: item.status === "DONE" ? "Done" : "Update", detail: item.progressUpdate || item.supportNeeded || item.riskNote || `${item.priority.toLocaleLowerCase()} priority`, href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day", id: `work-focus-${item.id}`, title: item.outcome })),
          ...checklistItems.slice(0, 4).map((item) => ({ action: item.done ? "Done" : "Update", detail: latestChecklistUpdateText(item) || checklistStatusLabel(item), href: "/vehicles/coo-workbook/checklist", id: `work-checklist-${item.id}`, title: item.text })),
          ...quickUpdates.slice(0, 2).map((item) => ({ action: item.followUpNeeded ? "Follow up" : "Review", detail: quickUpdateCategoryLabel(item.category), href: "/vehicles/coo-workbook/quick-update", id: `work-quick-${item.id}`, title: item.text })),
          ...bringForwardCandidates.slice(0, 3).map((item) => ({ action: "Bring forward", detail: `${bringForwardSourceLabel(item.sourceType)} · ${item.sourceBoardDate}`, href: "/vehicles/coo-workbook/bring-forward", id: `work-bring-${item.id}`, title: item.title }))
        ].slice(0, 6)
        : latestReportDraft
          ? latestReportDraft.sections.flatMap((section) => section.items.map((item) => ({ action: "Open draft", detail: section.title, href: "/vehicles/coo-workbook/drafts", id: `draft-${section.title}-${item.sourceId}-${item.title}`, title: item.title }))).slice(0, 5)
          : reportSeeds.filter((seed) => seed.status !== "EXCLUDED").slice(0, 5).map((seed) => ({ action: reportSeedStatusLabel(seed.status), detail: reportSeedSourceLabel(seed), href: "/vehicles/coo-workbook/report-seeds", id: `seed-${seed.id}`, title: seed.title }));
  const commandDetailTitle = commandCards.find((card) => card.key === activeCommandView)?.label ?? "Daily Close";
  const commandDetailHelp = activeCommandView === "CLOSE"
    ? isClosed ? "The day is complete. Review the saved report or confirm tomorrow’s protected work." : "Review what must be cleaned up before the day is closed."
    : activeCommandView === "ATTENTION"
      ? "Work these items first because they can block customers, staff, or reporting."
      : activeCommandView === "WORK"
        ? "Update the work list so progress and report signals stay current."
        : "Review the source-backed items that can become the manager-ready report.";
  const carryoverPreview = [
    ...checklistItems.filter((item) => item.carryoverReady).map((item) => ({ detail: latestChecklistUpdateText(item) || checklistStatusLabel(item), id: `checklist-${item.id}`, kind: "Checklist", title: item.text })),
    ...quickUpdates.filter((item) => item.carryoverReady).map((item) => ({ detail: [item.person, item.phoneNumber, item.company, item.dueWindow].filter(Boolean).join(" · ") || item.text, id: `quick-${item.id}`, kind: "Quick Update", title: item.text })),
    ...reportSeeds.filter((seed) => seed.status === "CARRIED_OVER").map((seed) => ({ detail: seed.detail, id: `seed-${seed.id}`, kind: reportSeedSourceLabel(seed), title: seed.title })),
    ...carryovers.filter((item) => item.status !== "DISMISSED").map((item) => ({ detail: item.detail, id: `carryover-${item.id}`, kind: `Carryover · ${item.status.toLocaleLowerCase()}`, title: item.title }))
  ].slice(0, 6);
  const activeDailyFocusItems = activeWorkbook.dailyFocusItems.filter((item) => !isGenericAdvisorFocusItem(item));
  const activeCarryovers = carryovers.filter((item) => item.status !== "DISMISSED");
  const carryoverSourceIds = new Set(activeCarryovers.map((item) => item.sourceId));
  const normalizeSourceTitle = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const dailyFocusSource = (item: DailyFocusItem) => {
    if (item.convertedTaskId) return { href: `/tasks/${encodeURIComponent(item.convertedTaskId)}`, toolLabel: "Open task" };
    if (item.sourceHref) {
      const sourceHref = item.sourceHref;
      return {
        href: sourceHref,
        toolLabel: sourceHref.startsWith("/tasks/")
          ? "Open task"
          : sourceHref.includes("repair-workbench")
            ? "Open RO"
            : sourceHref.includes("checklist")
              ? "Open checklist"
              : sourceHref.includes("quick-update")
                ? "Open update"
                : sourceHref.includes("carryover")
                  ? "Open carryover"
                  : "Open source"
      };
    }
    if (item.sourceType === "CHECKLIST_ITEM" && item.sourceId) return { href: `/vehicles/coo-workbook/checklist#checklist-${encodeURIComponent(item.sourceId)}`, toolLabel: "Open checklist" };
    if (item.sourceType === "QUICK_UPDATE" && item.sourceId) return { href: `/vehicles/coo-workbook/quick-update#quick-${encodeURIComponent(item.sourceId)}`, toolLabel: "Open update" };
    if (item.sourceType === "CARRYOVER" && item.sourceId) return { href: `/vehicles/coo-workbook/carryover#carryover-${encodeURIComponent(item.sourceId)}`, toolLabel: "Open carryover" };
    const normalizedOutcome = normalizeSourceTitle(item.outcome);
    const repairOrderNumber = item.outcome.match(/\bRO-[A-Z0-9]+\b/i)?.[0]?.toLocaleUpperCase();
    const repairOrder = repairOrderNumber
      ? model.repairOrders.find((order) => order.repairOrderNumber.toLocaleUpperCase() === repairOrderNumber)
      : null;
    if (repairOrder) return { href: repairOrderHref(repairOrder.id), toolLabel: "Open RO" };
    const repairOrderAction = repairOrderNumber
      ? model.actionQueue.find((action) => action.repairOrderNumber.toLocaleUpperCase() === repairOrderNumber)
      : null;
    if (repairOrderAction) return { href: repairOrderHref(repairOrderAction.id), toolLabel: "Open RO" };
    const prioritySource = [
      ...model.morningPrioritySources.filter((source) => source.staffUserId === model.advisor.id),
      ...model.morningPrioritySources
    ].find((source) => source.sourceType === "TASK" ? matchesTaskSourceTitle(source.title, item.outcome) : normalizeSourceTitle(source.title) === normalizedOutcome);
    if (prioritySource) return {
      href: prioritySource.href,
      toolLabel: prioritySource.sourceType === "TASK" ? "Open task" : prioritySource.sourceType === "REPAIR_ORDER" ? "Open RO" : prioritySource.sourceType === "APPOINTMENT" ? "Open schedule" : "Open duty"
    };
    const carryoverSource = activeCarryovers.find((carryover) => normalizeSourceTitle(carryover.title) === normalizedOutcome && carryover.sourceHref);
    if (carryoverSource?.sourceHref) return {
      href: carryoverSource.sourceHref,
      toolLabel: carryoverSource.sourceHref.startsWith("/tasks/") ? "Open task" : carryoverSource.sourceHref.includes("repair-workbench") ? "Open RO" : "Open source"
    };
    const checklistSource = activeWorkbook.checklistItems.find((candidate) => normalizeSourceTitle(candidate.text) === normalizedOutcome);
    if (checklistSource) return { href: `/vehicles/coo-workbook/checklist#checklist-${encodeURIComponent(checklistSource.id)}`, toolLabel: "Open checklist" };
    const quickUpdateSource = activeWorkbook.quickUpdates.find((candidate) => normalizeSourceTitle(candidate.text) === normalizedOutcome);
    if (quickUpdateSource) return { href: `/vehicles/coo-workbook/quick-update#quick-${encodeURIComponent(quickUpdateSource.id)}`, toolLabel: "Open update" };
    const carryoverFallback = activeCarryovers.find((carryover) => normalizeSourceTitle(carryover.title) === normalizedOutcome);
    if (carryoverFallback) return { href: carryoverFallback.sourceHref ?? "/vehicles/coo-workbook/carryover", toolLabel: carryoverFallback.sourceHref?.startsWith("/tasks/") ? "Open task" : "Open source" };
    return { href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day", toolLabel: "Review source" };
  };
  const attentionMatchesFocus = (attention: (typeof attentionItems)[number], focus: DailyFocusItem) => {
    const attentionText = normalizeSourceTitle([attention.title, attention.context, attention.description, attention.meta].filter(Boolean).join(" "));
    const blockedTerms = new Set(["today", "work", "risk", "promise", "review", "customer", "vehicle", "focus", "complete", "resolve", "update"]);
    const focusTokens = normalizeSourceTitle(focus.outcome).split(" ").filter((token) => token.length >= 4 && !blockedTerms.has(token));
    if (!focusTokens.length) return false;
    return focusTokens.filter((token) => attentionText.includes(token)).length >= Math.min(2, focusTokens.length);
  };
  const executionFocusItems = [...activeDailyFocusItems].sort((left, right) =>
    Number(right.mustCloseToday) - Number(left.mustCloseToday)
      || ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(left.priority) - ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(right.priority)
      || left.sortOrder - right.sortOrder
  );
  const focusAttentionLinks = executionFocusItems.map((focus) => ({
    attention: attentionItems.filter((attention) => attentionMatchesFocus(attention, focus)).slice(0, 2),
    focus
  }));
  const attachedAttentionIds = new Set(focusAttentionLinks.flatMap((item) => item.attention.map((attention) => attention.id)));
  const otherAttentionItems = attentionItems.filter((item) => !attachedAttentionIds.has(item.id));
  const executionPanelCount = executionFocusItems.length ? `${dailyFocusRollup.done}/${executionFocusItems.length} focus` : attentionItems.length ? `${attentionItems.length} priority` : "Clear";
  const isCloseWindow = new Date(model.generatedAt).getHours() >= 16;
  const executionFocusTone = (focus: DailyFocusItem) => {
    if (focus.status === "DONE") return "done";
    if (focus.status === "CARRY_OVER") return "carryover";
    if (focus.progressUpdate.trim() || focus.lastProgressAt) return "updated";
    if (isCloseWindow) return "red";
    if (focus.riskLevel === "BLOCKED") return "red";
    if (focus.riskLevel === "WATCH" || focus.priority === "HIGH" || focus.priority === "CRITICAL") return "yellow";
    return "blue";
  };
  const closeReviewItems = [
    ...activeDailyFocusItems.map((item) => {
      const source = dailyFocusSource(item);
      return {
        detail: item.progressUpdate || item.supportNeeded || item.riskNote || (item.status === "DONE" ? "Completed today." : "Needs update or close decision."),
        href: source?.href ?? cooTaskIntakeHref({
          dueAt: model.generatedAt,
          expectedOutcome: `${item.outcome} has a clear owner, status, next action, and close decision.`,
          returnTo: taskIntakeReturnHref,
          sourceTitle: item.outcome,
          title: item.outcome
        }),
        id: `focus-${item.id}`,
        focusId: item.id,
        kind: "focus" as const,
        status: item.status === "DONE" ? "Done" : item.status === "CARRY_OVER" ? "Carry over" : "Not done",
        title: item.outcome,
        toolLabel: source.toolLabel
      };
    }),
    ...checklistItems.map((item) => ({
      detail: latestChecklistUpdateText(item) || checklistStatusLabel(item),
      href: "/vehicles/coo-workbook/checklist",
      id: `checklist-${item.id}`,
      checklistId: item.id,
      kind: "checklist" as const,
      status: item.done ? "Done" : item.carryoverReady ? "Carry over" : "Not done",
      title: item.text,
      toolLabel: "Open checklist"
    }))
  ];
  const tomorrowItems = [
    ...activeDailyFocusItems.filter((item) => (item.status === "CARRY_OVER" || item.mustCloseToday && item.status !== "DONE") && !carryoverSourceIds.has(`daily-focus:${item.id}`)).map((item) => ({
      action: "prepare" as const,
      detail: item.supportNeeded || item.riskNote || "Needs tomorrow ownership.",
      href: "/vehicles/coo-workbook/action-plan",
      id: `focus-${item.id}`,
      status: "Candidate",
      title: item.outcome,
      toolLabel: "Open source"
    })),
    ...checklistItems.filter((item) => item.carryoverReady && !carryoverSourceIds.has(item.id)).map((item) => ({
      action: "prepare" as const,
      detail: latestChecklistUpdateText(item) || "Checklist item needs tomorrow ownership.",
      href: "/vehicles/coo-workbook/checklist",
      id: `checklist-${item.id}`,
      status: "Candidate",
      title: item.text,
      toolLabel: "Open checklist"
    })),
    ...activeCarryovers.map((item) => ({
      action: "open" as const,
      detail: item.detail,
      href: item.sourceHref ?? "/vehicles/coo-workbook/carryover",
      id: `carryover-${item.id}`,
      status: item.status === "CONFIRMED" ? "Confirmed" : item.status === "CONVERTED" ? "Task created" : "Carryover",
      title: item.title,
      toolLabel: item.sourceHref ? "Open source" : "Open carryover"
    }))
  ];
  const unresolvedEndDayCount = activeDailyFocusItems.filter((item) => item.status !== "DONE" && item.status !== "CARRY_OVER").length
    + checklistItems.filter((item) => !item.done && !item.carryoverReady).length;
  const hasUnsavedManualReportItems = manualReportItems.some((item) => item.title.trim() || item.detail.trim() || item.relatedContext.trim());
  const endDayReadyForApproval = unresolvedEndDayCount === 0 && Boolean(latestReportDraft) && !hasUnsavedManualReportItems;
  const latestReportDraftItemCount = latestReportDraft?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0;
  const staffSupportQueue = [...staffWorkbookSummaries]
    .filter((item) => item.closeReadinessTone !== "READY" || item.redYellowItemCount > 0 || item.followUpNeededCount > 0 || item.carryoverCount > 0)
    .sort((left, right) => {
      const leftSupport = left.redYellowItemCount + left.followUpNeededCount + left.carryoverCount;
      const rightSupport = right.redYellowItemCount + right.followUpNeededCount + right.carryoverCount;
      return rightSupport - leftSupport || left.closeReadinessScore - right.closeReadinessScore || left.staffName.localeCompare(right.staffName);
    })
    .slice(0, 5);
  const focusCompassHorizons: Array<{ label: string; value: FocusCompassHorizon }> = [
    { label: "Today", value: "TODAY" },
    { label: "Week", value: "WEEK" },
    { label: "Month", value: "MONTH" },
    { label: "Quarter", value: "QUARTER" },
    { label: "Year", value: "YEAR" }
  ];
  const focusCompassRoles = ["All Roles", "CEO", "Manager", "Sales", "Service", "Office", "Collections"];
  const focusScoreBase = Math.round((activeWorkbook.planning.score + activeWorkbook.execution.score + activeWorkbook.risk.score) / 3);
  const focusScoreByHorizon: Record<FocusCompassHorizon, number> = {
    TODAY: Math.max(0, Math.min(100, activeWorkbook.effectiveness.overallScore || focusScoreBase)),
    WEEK: Math.max(0, Math.min(100, focusScoreBase + 6)),
    MONTH: Math.max(0, Math.min(100, focusScoreBase + 10)),
    QUARTER: Math.max(0, Math.min(100, focusScoreBase + 4)),
    YEAR: Math.max(0, Math.min(100, focusScoreBase + 8))
  };
  const focusCompassPrimary = activeDailyFocusItems.find((item) => item.status !== "DONE" && item.status !== "CARRY_OVER") ?? activeDailyFocusItems[0] ?? null;
  const focusCompassContent: Record<FocusCompassHorizon, {
    alignment: Array<{ label: string; value: string }>;
    carryover: Array<{ label: string; value: string }>;
    focus: { badge: string; detail: string; title: string; why: string };
    mustWins: FocusCompassMustWin[];
    radar: Array<{ detail: string; severity: "High" | "Med" | "Low"; title: string }>;
    scoreLabel: string;
    timeline: string[];
    title: string;
  }> = {
    TODAY: {
      alignment: [
        { label: "Customer promises", value: `${activeWorkbook.risk.watchCount} watch` },
        { label: "Daily execution", value: `${todayWorkRollup.done}/${todayWorkRollup.total} done` },
        { label: "Close readiness", value: `${closeReadiness.score}/100` }
      ],
      carryover: [
        { label: "Ready for reset", value: `${protectedCarryoverCount} carryover` },
        { label: "Unresolved", value: `${unresolvedEndDayCount} item(s)` }
      ],
      focus: {
        badge: "Recommended now",
        detail: focusCompassPrimary?.progressUpdate || focusCompassPrimary?.supportNeeded || focusCompassPrimary?.riskNote || "Start with the highest-value item that protects a promise, revenue, or close readiness.",
        title: focusCompassPrimary?.outcome ?? activeWorkbook.planning.suggestedFirstAction ?? "Choose the next highest-impact action",
        why: "Today’s view keeps staff on one next action, the must-wins, and the risks that can block a clean close."
      },
      mustWins: [
        ...activeDailyFocusItems.slice(0, 3).map((item) => ({ calendarDate: item.sourceBoardDate ?? model.boardDate, calendarReason: item.sourceBoardDate && item.sourceBoardDate !== model.boardDate ? "Carried from prior focus" : item.mustCloseToday ? "Must close today" : "Active today", impact: item.priority, owner: activeWorkbookOwner, status: item.status.replaceAll("_", " "), title: item.outcome })),
        ...checklistItems.filter((item) => !item.done).slice(0, 2).map((item) => ({ calendarDate: model.boardDate, calendarReason: item.carryoverReady ? "Carryover candidate" : "Open checklist item", impact: item.priority, owner: activeWorkbookOwner, status: checklistStatusLabel(item), title: item.text }))
      ].slice(0, 5),
      radar: [
        { detail: `${activeWorkbook.risk.watchCount} watch signal(s)`, severity: activeWorkbook.risk.watchCount ? "Med" : "Low", title: "Watch items" },
        { detail: `${quickUpdateRollup.followUp} follow-up update(s)`, severity: quickUpdateRollup.followUp ? "High" : "Low", title: "Follow-up drift" },
        { detail: `${protectedCarryoverCount} item(s)`, severity: protectedCarryoverCount ? "Med" : "Low", title: "Carryover pressure" }
      ],
      scoreLabel: "Focus score",
      timeline: ["Now", "Next", "Close"],
      title: "Now Focus"
    },
    WEEK: {
      alignment: [
        { label: "Customer promises", value: `${supportSignals} need attention` },
        { label: "Revenue blockers", value: `${reportExceptions} exception(s)` },
        { label: "Key processes", value: closeReadiness.tone === "READY" ? "On track" : "Needs focus" }
      ],
      carryover: [
        { label: "From last week", value: `${protectedCarryoverCount} item(s)` },
        { label: "Weekly report inputs", value: `${activeWorkbook.reporting.weeklyRollupInputs.length} source(s)` }
      ],
      focus: {
        badge: "Recommended this week",
        detail: "Keep the most important customer, revenue, and process outcomes visible before the week gets noisy.",
        title: "Protect weekly outcomes and close the highest-risk promises",
        why: "Weekly focus turns daily work into an operating rhythm: owners, deadlines, blockers, and carryover all stay visible."
      },
      mustWins: [
        { impact: "Customer", owner: "Service", status: "In progress", title: "Close customer promise risks" },
        { impact: "Revenue", owner: "Sales", status: "In progress", title: "Move pending sales blockers" },
        { impact: "Process", owner: "Office", status: "Needs focus", title: "Review report seeds before weekly rollup" },
        { impact: "People", owner: "Manager", status: "Open", title: "Support staff with blocked workbook items" }
      ],
      radar: [
        { detail: `${supportSignals} signal(s) from workbook`, severity: supportSignals ? "High" : "Low", title: "Customer promises" },
        { detail: `${reportExceptions} report exception(s)`, severity: reportExceptions ? "Med" : "Low", title: "Revenue blockers" },
        { detail: `${activeWorkbook.reporting.weeklyRollupInputs.length} weekly input(s)`, severity: "Med", title: "Upcoming deadlines" }
      ],
      scoreLabel: "Weekly focus score",
      timeline: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      title: "Week Focus"
    },
    MONTH: {
      alignment: [
        { label: "Revenue pace", value: "Protect" },
        { label: "Collection pace", value: "Watch" },
        { label: "Inventory readiness", value: "Improve" }
      ],
      carryover: [
        { label: "Monthly carryover", value: `${protectedCarryoverCount} active` },
        { label: "Monthly report inputs", value: `${activeWorkbook.reporting.monthlyRollupInputs.length} source(s)` }
      ],
      focus: {
        badge: "Recommended this month",
        detail: "Finish the month with clear revenue, collection, inventory, and customer-experience priorities.",
        title: "Protect monthly goals",
        why: "Monthly focus keeps pace and gap visible so staff can act before the month-end scramble."
      },
      mustWins: [
        { impact: "Sales", owner: "Sales", status: "At risk", title: "Protect retail unit pace" },
        { impact: "Cash", owner: "Collections", status: "Watch", title: "Reduce past-due receivables" },
        { impact: "Inventory", owner: "Service", status: "In progress", title: "Improve inventory readiness" },
        { impact: "Office", owner: "Office", status: "On track", title: "Keep document packets current" }
      ],
      radar: [
        { detail: "Gap to monthly target", severity: "High", title: "Revenue pace" },
        { detail: "A/R and promise follow-up", severity: "Med", title: "Collection pace" },
        { detail: "Aging units and photo/document gaps", severity: "Med", title: "Inventory readiness" }
      ],
      scoreLabel: "Monthly focus score",
      timeline: ["Week 1", "Week 2", "Week 3", "Week 4"],
      title: "Month Focus"
    },
    QUARTER: {
      alignment: [
        { label: "Growth", value: "Active" },
        { label: "Process discipline", value: "Build" },
        { label: "Team capability", value: "Coach" }
      ],
      carryover: [
        { label: "Quarter carryover", value: "Review" },
        { label: "Milestone reset", value: "Monthly" }
      ],
      focus: {
        badge: "Recommended this quarter",
        detail: "Translate the quarterly plan into monthly milestones and weekly execution habits.",
        title: "Convert strategy into visible milestones",
        why: "Quarter focus gives leadership a clean bridge between the annual plan and month-by-month execution."
      },
      mustWins: [
        { impact: "Growth", owner: "CEO", status: "In progress", title: "Increase profitable sales consistency" },
        { impact: "Process", owner: "Manager", status: "Open", title: "Standardize workflow adoption" },
        { impact: "People", owner: "Manager", status: "Watch", title: "Coach recurring execution gaps" },
        { impact: "Cash", owner: "Office", status: "In progress", title: "Strengthen cash-flow discipline" }
      ],
      radar: [
        { detail: "Ideas not tied to milestones", severity: "Med", title: "Scope drift" },
        { detail: "Repeated blockers across workbooks", severity: "High", title: "Execution drag" },
        { detail: "Staff support patterns", severity: "Med", title: "Training need" }
      ],
      scoreLabel: "Quarter focus score",
      timeline: ["Month 1", "Month 2", "Month 3"],
      title: "Quarter Focus"
    },
    YEAR: {
      alignment: [
        { label: "Growth", value: "Profitable" },
        { label: "Cash flow", value: "Resilient" },
        { label: "Customer experience", value: "Trusted" },
        { label: "Operational discipline", value: "Consistent" }
      ],
      carryover: [
        { label: "Annual carryover", value: "Separate noise" },
        { label: "Not pursuing", value: "Protect focus" }
      ],
      focus: {
        badge: "Recommended this year",
        detail: "Stay disciplined on the few priorities that make the dealership stronger in profit, people, process, and customer trust.",
        title: "Protect the annual plan",
        why: "Year focus keeps the big picture visible without making staff manage a second strategic system."
      },
      mustWins: [
        { impact: "Growth", owner: "CEO", status: "On track", title: "Grow profitable sales" },
        { impact: "Cash flow", owner: "Office", status: "Watch", title: "Improve collection and expense discipline" },
        { impact: "Experience", owner: "Manager", status: "On track", title: "Raise customer promise reliability" },
        { impact: "Discipline", owner: "All roles", status: "In progress", title: "Make the workbook operating rhythm stick" }
      ],
      radar: [
        { detail: "Market, pricing, and inventory pressure", severity: "High", title: "Economic conditions" },
        { detail: "Hiring, retention, training", severity: "Med", title: "Talent and capability" },
        { detail: "Process drift across departments", severity: "Med", title: "Operational discipline" }
      ],
      scoreLabel: "Annual focus score",
      timeline: ["Q1", "Q2", "Q3", "Q4"],
      title: "Year Focus"
    }
  };
  const activeFocusCompass = focusCompassContent[focusCompassHorizon];
  const roleFilteredFocusMustWins = focusCompassRole === "All Roles"
    ? activeFocusCompass.mustWins
    : activeFocusCompass.mustWins.filter((item) => {
      const role = focusCompassRole.toLocaleLowerCase();
      return item.owner.toLocaleLowerCase().includes(role) || item.impact.toLocaleLowerCase().includes(role) || item.title.toLocaleLowerCase().includes(role);
    });
  const activeFocusMustWins = roleFilteredFocusMustWins.length ? roleFilteredFocusMustWins : activeFocusCompass.mustWins;
  const activeFocusProofEntries = activeFocusMustWins.flatMap((item) => focusProofItemsFor(item, focusCompassHorizon).map((proof) => ({ item, key: focusProofKey(focusCompassHorizon, item, proof), proof })));
  const focusProofEarned = activeFocusProofEntries.reduce((total, entry) => total + (focusProofChecked[entry.key] ? entry.proof.weight : 0), 0);
  const focusProofPossible = activeFocusProofEntries.reduce((total, entry) => total + entry.proof.weight, 0);
  const focusExecutionDone = activeFocusMustWins.reduce((total, item) => total + (focusExecutionItems[focusMustWinKey(focusCompassHorizon, item)] ?? []).filter((step) => step.done).length, 0);
  const focusExecutionScoreLift = Math.min(6, focusExecutionDone);
  const focusNoiseCleared = Object.values(focusDistractionChecked).filter(Boolean).length;
  const activeFocusBaseScore = focusScoreByHorizon[focusCompassHorizon];
  const activeFocusScore = clampFocusScore(activeFocusBaseScore + focusProofEarned + focusExecutionScoreLift + focusNoiseCleared);
  const activeFocusProgressText = activeFocusScore === activeFocusBaseScore ? `0/${focusProofPossible} proof points captured` : `Up ${activeFocusScore - activeFocusBaseScore}; ${focusProofEarned}/${focusProofPossible} proof points captured`;
  const nextFocusProof = activeFocusProofEntries.find((entry) => !focusProofChecked[entry.key]);
  const nextBestFocusMove = nextFocusProof
    ? `${nextFocusProof.proof.label} for ${nextFocusProof.item.title}`
    : activeFocusMustWins.length
      ? "All visible proof checks are complete. Prepare carryover or closeout evidence."
      : "Add a must-win item before scoring execution proof.";
  const focusScoreBreakdown = [
    { label: "Clarity", value: clampFocusScore(activeWorkbook.planning.score + Math.min(12, focusProofEarned)) },
    { label: "Ownership", value: clampFocusScore(55 + activeFocusMustWins.filter((item) => item.owner !== "All roles").length * 8 + Math.min(12, focusProofEarned)) },
    { label: "Momentum", value: clampFocusScore(activeWorkbook.execution.score + Math.min(10, focusProofEarned) + focusExecutionScoreLift) },
    { label: "Risk control", value: clampFocusScore(activeWorkbook.risk.score + Math.min(10, focusProofEarned)) },
    { label: "Noise", value: clampFocusScore(45 + focusNoiseCleared * 10) }
  ];
  const focusCompassVisualModes: Array<{ icon: typeof ListChecks; label: string; value: FocusCompassVisualMode }> = [
    { icon: ListChecks, label: "List", value: "LIST" },
    { icon: Clock3, label: "Timeline", value: "TIMELINE" },
    { icon: CalendarDays, label: "Calendar", value: "CALENDAR" }
  ];
  const focusVisualItems = activeFocusMustWins.map((item, index) => {
    const drawerKey = focusMustWinKey(focusCompassHorizon, item);
    const proofItems = focusProofItemsFor(item, focusCompassHorizon);
    const executionItems = focusExecutionItems[drawerKey] ?? [];

    return {
      bucketIndex: focusCalendarBucketIndex(item, index, activeFocusCompass.timeline.length),
      calendarDate: item.calendarDate ?? model.boardDate,
      calendarReason: item.calendarReason ?? "Focus item",
      drawerKey,
      executionDone: executionItems.filter((step) => step.done).length,
      executionTotal: executionItems.length,
      index,
      item,
      proofDone: proofItems.filter((proof) => focusProofChecked[focusProofKey(focusCompassHorizon, item, proof)]).length,
      proofTotal: proofItems.length,
      tone: focusCalendarTone(item)
    };
  });
  const focusCalendarAnchor = parseBoardDate(model.boardDate);
  const selectedFocusCalendarAnchor = parseBoardDate(selectedFocusCalendarDate);
  const focusCalendarMonthStart = new Date(focusCalendarAnchor.getFullYear(), focusCalendarAnchor.getMonth(), 1);
  const focusCalendarMonthGridStart = startOfWeek(focusCalendarMonthStart);
  const focusCalendarDays = focusCompassCalendarView === "DAY"
    ? [selectedFocusCalendarAnchor]
    : focusCompassCalendarView === "WEEK"
      ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(focusCalendarAnchor), index))
      : Array.from({ length: 42 }, (_, index) => addDays(focusCalendarMonthGridStart, index));
  const focusCalendarDayItems = focusCalendarDays.map((day) => {
    const dateKey = isoDate(day);
    return {
      dateKey,
      day,
      items: focusVisualItems.filter((item) => item.calendarDate === dateKey),
      outsideMonth: focusCompassCalendarView === "MONTH" && day.getMonth() !== focusCalendarAnchor.getMonth()
    };
  });
  const focusCalendarUndatedItems = focusVisualItems.filter((item) => !item.calendarDate);
  const selectedFocusCalendarDay = focusCalendarDayItems.find((item) => item.dateKey === selectedFocusCalendarDate) ?? {
    dateKey: selectedFocusCalendarDate,
    day: parseBoardDate(selectedFocusCalendarDate),
    items: focusVisualItems.filter((item) => item.calendarDate === selectedFocusCalendarDate),
    outsideMonth: false
  };
  const selectedFocusCalendarSlots = [...(focusCalendarSlots[selectedFocusCalendarDate] ?? [])].sort((left, right) => left.time.localeCompare(right.time));
  const focusSlotTypeLabels: Record<FocusCalendarSlotType, string> = {
    APPOINTMENT: "Appointment",
    FOCUS_BLOCK: "Focus block",
    FOLLOW_UP: "Follow-up",
    REMINDER: "Reminder",
    TASK: "Task"
  };
  const focusBlockerChoices = ["No owner", "Waiting on customer", "Waiting on vendor", "Missing info", "Decision needed", "Too many priorities"];
  const toolCards = [
    { description: "Stay focused across today, week, month, quarter, and year", href: "/vehicles/coo-workbook/focus-compass", icon: Gauge, title: "Focus Compass" },
    { description: `${checklistRollup.open} open · ${checklistRollup.done} done`, href: "/vehicles/coo-workbook/checklist", icon: CheckSquare, title: "Daily Checklist" },
    { description: "Light list that can become tasks", href: "/vehicles/coo-workbook/to-do-list", icon: ClipboardList, title: "To-Do List" },
    { description: `${quickUpdateRollup.total} captured today`, href: "/vehicles/coo-workbook/quick-update", icon: MessageSquareText, title: "Quick Update" },
    { description: "Create or assign today’s priorities", href: "/vehicles/coo-workbook/action-plan", icon: ClipboardCheck, title: "Daily Action Plan" },
    { description: `${activeWorkbook.bringForwardCandidates.length} unfinished item(s) available`, href: "/vehicles/coo-workbook/bring-forward", icon: ClipboardList, title: "Bring Forward Work" },
    { description: `${unresolvedEndDayCount} decisions · ${closeReadiness.score}/100 ready`, href: "/vehicles/coo-workbook/close-my-day", icon: PackageCheck, title: "Close My Day" },
    { description: `${closeReadiness.carryoverItems} tomorrow-facing item(s)`, href: "/vehicles/coo-workbook/carryover", icon: CalendarClock, title: "Carryover" },
    { description: `${reportSeedRollup.reviewed}/${reportSeedRollup.total} reviewed`, href: "/vehicles/coo-workbook/report-seeds", icon: FileText, title: "Report Seeds" },
    { description: `${staffTodayRollup.support} need support · ${staffTodayRollup.ready} ready`, href: "/vehicles/coo-workbook/staff-support", icon: UsersRound, title: "Staff Support" },
    { description: "Phone evidence for purchase, appraisal, or trade-in review", href: "/vehicles/coo-workbook/purchase-appraisal-capture", icon: Camera, title: "Purchase / Appraisal Capture" },
    { description: latestReportDraft ? `Saved ${dateLabel(latestReportDraft.generatedAt)}` : "No draft saved yet", href: "/vehicles/coo-workbook/drafts", icon: Clock3, title: "Drafts" }
  ];
  const moreToolCards: MoreToolCard[] = [
    { description: "Prepare upfront lease tax and review monthly state/local tax lines.", href: "/compliance", icon: ShieldCheck, outcome: "One saved contract record, lease-only worksheet and external filing/payment evidence.", title: "Compliance · Lease tax", whenToUse: "Authorized managers preparing monthly lease-tax reporting; confirm contract eligibility and local rates first." },
    { description: "Record spending and receipts, account for issued funds, and review company-card transactions.", href: "/money-resources", icon: FileText, outcome: "One saved money record with a responsible person, evidence and next action.", title: "Money & Resources", whenToUse: "Whenever staff spend company money, need funds, return a balance, or management needs a daily journal." },
    { description: "One simple compass for Now, Next, Risk, Reset, and Alignment across today, week, month, quarter, and year.", href: "/vehicles/coo-workbook/focus-compass", icon: Gauge, outcome: "Staff see what matters most without learning five different tools.", title: "Focus Compass", whenToUse: "Use at the start of the day, weekly planning, month review, or when the team is scattered." },
    { description: "Search prior unfinished work and restore the right item to today’s focus, checklist, or action plan without duplicating it.", href: "/vehicles/coo-workbook/bring-forward", icon: ClipboardList, outcome: "Older work keeps its source trail while becoming visible in Today’s Work again.", title: "Bring Forward Work", whenToUse: "Use during Start The Day or anytime an older customer, vehicle, or task resurfaces." },
    { description: "Capture VIN, mileage, condition, seller, price, and document proof before TAI makes a purchase or appraisal recommendation.", href: "/vehicles/coo-workbook/purchase-appraisal-capture", icon: CarFront, outcome: "TAI receives a clean review packet without changing inventory, customer, quote, invoice, or appraisal records.", title: "Purchase / Appraisal Capture", whenToUse: "Use before auction bids, outside purchases, trade-in appraisals, wholesale reviews, or manager buy decisions." },
    { description: "Rank urgent promises, blockers, and follow-ups before the day gets crowded.", href: "/vehicles/coo-workbook/action-plan", icon: AlertTriangle, outcome: "A short ordered action list for the work that matters most.", title: "Priority Triage", whenToUse: "Use when several issues are competing for attention." },
    { description: "Review Quick Updates and follow-up dates so nothing important drifts.", href: "/vehicles/coo-workbook/quick-update", icon: CalendarClock, outcome: "Follow-ups have a person, note, and date window.", title: "Follow-Up Center", whenToUse: "Use after customer, vendor, parts, or facility updates." },
    { description: "Escalate blocked work and connect it to support before close.", href: "/vehicles/coo-workbook/staff-support", icon: AlertTriangle, outcome: "Manager support is requested with context instead of a vague blocker.", title: "Blocker Escalation", whenToUse: "Use when work is red, blocked, or waiting on a decision." },
    { description: "Review promises and customer commitments that may need protection.", href: "/vehicles/coo-workbook/action-plan", icon: ShieldCheck, outcome: "Promise risks become visible before they become missed commitments.", title: "Promise Tracker", whenToUse: "Use when promised or target times need review." },
    { description: "Ask for or record manager help without turning the day into paperwork.", href: "/vehicles/coo-workbook/staff-support", icon: UsersRound, outcome: "Support requests are captured for accountability and coaching.", title: "Manager Help Request", whenToUse: "Use when staff need help, clarity, approval, or removal of a blocker." },
    { description: "Capture a coaching opportunity, process gap, or training need from the day.", href: "/vehicles/coo-workbook/quick-update", icon: MessageSquareText, outcome: "Training moments become useful context for staff development.", title: "Training Moment Capture", whenToUse: "Use when repeated confusion or a learning opportunity appears." },
    { description: "Record a win, lesson, or useful improvement that should not be lost.", href: "/vehicles/coo-workbook/quick-update", icon: CheckCircle2, outcome: "Good habits and useful lessons show up in reports and coaching.", title: "Daily Win / Learning", whenToUse: "Use when someone solved a problem or learned something worth repeating." },
    { description: "Prepare unfinished work for tomorrow with clear ownership and context.", href: "/vehicles/coo-workbook/carryover", icon: CalendarClock, outcome: "Tomorrow starts with cleaner carryover instead of rediscovery.", title: "Smart Carryover Builder", whenToUse: "Use when work cannot be completed today." },
    { description: "Review source-backed items that may belong in the report.", href: "/vehicles/coo-workbook/report-seeds", icon: FileText, outcome: "The report is built from reviewed signals, not noisy raw logs.", title: "Report Seeds", whenToUse: "Use before generating daily, weekly, or monthly summaries." },
    { description: "Close the day through work review, carryover, and report preparation. My work submits the same daily report managers review.", href: "/vehicles/coo-workbook/close-my-day", icon: PackageCheck, outcome: "The day ends cleanly with a manager-ready draft and tomorrow setup.", title: "Close My Day", whenToUse: "Use near close or when the daily report is ready to finalize." }
  ];
  const hasReportDraftBlocker = activeWorkbook.governance.closeBlockers.some((prompt) => prompt.toLocaleLowerCase().includes("report draft"));
  const hasOpenCarryoverBlocker = (activeWorkbook.governance.dispositionCounts?.unconfirmedCarryovers ?? 0) > 0;
  const needsAttentionRecommendation = "Review needs-attention work before ending the day.";
  const endTheDayDisplayScore = Math.min(activeWorkbook.governance.endTheDayEligibilityScore ?? closeReadiness.score, closeReadiness.score);
  const contextRecommendation: ContextRecommendation = isClosed
    ? { description: `Today is closed. Review the saved report; ${protectedCarryoverCount} carryover item${protectedCarryoverCount === 1 ? " is" : "s are"} protected for tomorrow.`, href: "/vehicles/coo-workbook/drafts", phase: "END" as const, title: "Day Closed — Review Report" }
    : activeWorkbook.governance.currentPhase === "START"
      ? { description: activeWorkbook.governance.nextRecommendedAction, href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day", phase: "START" as const, title: "Start The Day" }
    : activeWorkbook.governance.currentPhase === "END"
      ? hasReportDraftBlocker
        ? { description: activeWorkbook.governance.closeBlockers[0] ?? activeWorkbook.governance.nextRecommendedAction, href: "/vehicles/coo-workbook/drafts", phase: "END" as const, title: "Generate Report Draft" }
        : hasOpenCarryoverBlocker
          ? { description: activeWorkbook.governance.closeBlockers.find((prompt) => prompt.toLocaleLowerCase().includes("carryover")) ?? activeWorkbook.governance.nextRecommendedAction, href: "/vehicles/coo-workbook/carryover", phase: "END" as const, title: "Confirm Carryover" }
          : { description: activeWorkbook.governance.nextRecommendedAction, href: "#close-report", phase: "END" as const, title: "End The Day" }
      : supportSignals
        ? { description: needsAttentionRecommendation, onSelect: () => setCommandView("ATTENTION"), phase: "WORK" as const, title: "Review Needs Attention" }
        : quickUpdateRollup.followUp
          ? { description: "Follow-ups exist. Confirm dates, owners, and next action before they drift.", href: "/vehicles/coo-workbook/quick-update", phase: "WORK" as const, title: "Open Follow-Up Center" }
          : { description: activeWorkbook.governance.nextRecommendedAction, onSelect: () => setCommandView("WORK"), phase: "WORK" as const, title: "Work The Day" };
  const workflowPhases: WorkflowPhaseAction[] = [
    {
      detail: `${dailyFocusRollup.total}/3 focus · ${dailyFocusRollup.done} done`,
      href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
      icon: ClipboardCheck,
      key: "START" as const,
      title: "Start The Day"
    },
    {
      detail: `${todayWorkRollup.total} planned · ${supportSignals} attention`,
      icon: ListChecks,
      key: "WORK" as const,
      onSelect: () => setCommandView(supportSignals ? "ATTENTION" : "WORK"),
      title: "Work The Day"
    },
    {
      detail: isClosed ? `Closed · ${protectedCarryoverCount} protected for tomorrow` : `${endTheDayDisplayScore}/100 ready · ${closeReadiness.carryoverItems} carryover`,
      href: "#close-report",
      icon: FileText,
      key: "END" as const,
      title: isClosed ? "Day Closed" : "End The Day"
    }
  ];
  const primaryExecutionFocus = executionFocusItems.find((item) => item.status !== "DONE" && item.status !== "CARRY_OVER") ?? executionFocusItems[0] ?? null;
  const primaryExecutionSource = primaryExecutionFocus ? dailyFocusSource(primaryExecutionFocus) : null;
  const primaryExecutionTone = primaryExecutionFocus
    ? primaryExecutionFocus.status === "DONE"
      ? "green"
      : primaryExecutionFocus.riskLevel === "BLOCKED" || isCloseWindow
        ? "red"
        : primaryExecutionFocus.status === "CARRY_OVER" || primaryExecutionFocus.riskLevel === "WATCH" || primaryExecutionFocus.priority === "HIGH" || primaryExecutionFocus.priority === "CRITICAL"
          ? "yellow"
          : "blue"
    : "blue";
  const staffExecutionHomeCards: StaffExecutionCard[] = [
    primaryExecutionFocus
      ? {
        action: "Open work",
        detail: primaryExecutionFocus.progressUpdate || primaryExecutionFocus.supportNeeded || primaryExecutionFocus.riskNote || `${primaryExecutionFocus.priority.toLocaleLowerCase()} priority · ${primaryExecutionFocus.mustCloseToday ? "must close today" : "flexible"}`,
        href: primaryExecutionSource?.href ?? "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
        icon: ClipboardCheck,
        title: primaryExecutionFocus.outcome,
        tone: primaryExecutionTone
      }
      : {
        action: "Plan today",
        detail: "Pick the work that must be handled today before the day gets busy.",
        href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
        icon: ClipboardCheck,
        title: "Choose today’s focus",
        tone: "blue"
      },
    {
      action: quickUpdateRollup.followUp ? "Set follow-up" : "Open work list",
      detail: quickUpdateRollup.followUp ? `${quickUpdateRollup.followUp} follow-up item(s) need owner/date clarity.` : `${todayWorkRollup.total} planned item(s), ${todayWorkRollup.done} done.`,
      href: quickUpdateRollup.followUp ? "/vehicles/coo-workbook/quick-update" : "/vehicles/coo-workbook/action-plan",
      icon: CalendarClock,
      title: "Due Next",
      tone: quickUpdateRollup.followUp ? "yellow" : "blue"
    },
    {
      action: supportSignals ? "Ask for help" : "Open support",
      detail: supportSignals ? `${supportSignals} blocker, risk, or follow-up signal(s) may slow the day down.` : "No active support request is blocking the current workbook.",
      href: "/vehicles/coo-workbook/staff-support",
      icon: AlertTriangle,
      title: "Needs Help",
      tone: supportSignals ? "red" : "green"
    },
    {
      action: "Add update",
      detail: quickUpdates[0]?.text ?? "Capture what changed, what happened, and what should happen next.",
      href: "/vehicles/coo-workbook/quick-update",
      icon: MessageSquareText,
      title: "Recently Updated",
      tone: quickUpdates.length ? "blue" : "green"
    },
    {
      action: isClosed ? "Review report" : "Close day",
      detail: isClosed ? `${protectedCarryoverCount} carryover item(s) protected for tomorrow.` : `${unresolvedEndDayCount} item(s) need a Done or Carry decision.`,
      href: isClosed ? "/vehicles/coo-workbook/drafts" : "#close-report",
      icon: FileText,
      title: "End The Day",
      tone: isClosed || endDayReadyForApproval ? "green" : unresolvedEndDayCount ? "yellow" : "blue"
    }
  ];

  function openWorkbookTool(toolPath: string) {
    if (typeof window === "undefined") return;
    router.push(`${toolPath}${window.location.search}`);
  }

  async function refreshWorkbook() {
    const response = await fetch(`/api/coo-workbook?date=${encodeURIComponent(model.boardDate)}`);
    const payload = await response.json().catch(() => null) as { workbook?: WorkdayWorkbookModel; error?: string } | null;
    if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? "Unable to refresh the workbook.");
    setWorkbook(payload.workbook);
  }

  async function refreshStaffWorkbook() {
    const response = await fetch(`/api/coo-workbook/staff?date=${encodeURIComponent(model.boardDate)}`);
    const payload = await response.json().catch(() => null) as { staffWorkbookSummaries?: StaffWorkbookSummary[]; workbook?: WorkdayWorkbookModel; error?: string } | null;
    if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? `Unable to refresh ${staffWorkbookLabel}.`);
    setStaffWorkbook(payload.workbook);
    setStaffWorkbookSummaries(payload.staffWorkbookSummaries ?? []);
  }

  async function refreshActiveWorkbook() {
    if (effectiveWorkbookView === "MY") {
      await refreshStaffWorkbook();
      return;
    }
    await refreshWorkbook();
  }

  function updateActiveWorkbook(updater: (current: WorkdayWorkbookModel) => WorkdayWorkbookModel) {
    if (effectiveWorkbookView === "MY") {
      setStaffWorkbook(updater);
      return;
    }
    setWorkbook(updater);
  }

  async function addChecklistItem() {
    const text = checklistText.trim();
    if (!text) return;
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before adding checklist items.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/checklist" : "checklist"}?date=${encodeURIComponent(model.boardDate)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save checklist item.");
      setChecklistText("");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`${activeWorkbookLabel} checklist item saved.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to save checklist item.");
    } finally {
      setSaving(false);
    }
  }

  function updateChecklistItem(id: string, patch: Partial<DailyChecklistItem>) {
    updateActiveWorkbook((current) => ({ ...current, checklistItems: current.checklistItems.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function updateChecklistDraft(id: string, value: string) {
    setChecklistUpdateDrafts((current) => ({ ...current, [id]: value }));
  }

  function updateChecklistTextDraft(id: string, value: string) {
    setChecklistTextDrafts((current) => ({ ...current, [id]: value }));
  }

  async function saveChecklistText(item: DailyChecklistItem) {
    const text = (checklistTextDrafts[item.id] ?? item.text).trim();
    if (!text || text === item.text) return;
    await persistChecklistItem(item.id, { text });
    setChecklistTextDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setWorkspaceNotice(`${activeWorkbookLabel} checklist item updated.`);
  }

  async function saveChecklistUpdate(item: DailyChecklistItem) {
    const update = (checklistUpdateDrafts[item.id] ?? "").trim();
    if (!update) return;
    const updateEntry = `${new Date().toISOString()}|${update}`;
    const updateHistory = item.update.trim() ? `${item.update.trim()}\n${updateEntry}` : updateEntry;
    await persistChecklistItem(item.id, { update: updateHistory });
    setChecklistUpdateDrafts((current) => ({ ...current, [item.id]: "" }));
    setWorkspaceNotice(`${activeWorkbookLabel} checklist update saved.`);
  }

  async function persistChecklistItem(id: string, patch: Partial<DailyChecklistItem>) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before updating checklist items.");
      return;
    }
    setReviewingEndDay(false);
    // Keep the last saved reminder date visible if the request fails.
    if (!("reminderDate" in patch)) updateChecklistItem(id, patch);
    try {
      const response = await fetch(`/api/coo-workbook/checklist/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update checklist item.");
      await refreshActiveWorkbook();
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update checklist item.");
      await refreshActiveWorkbook().catch(() => undefined);
    }
  }

  async function addQuickUpdate() {
    const text = quickUpdateText.trim();
    if (!text) return;
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before saving Quick Updates.");
      setQuickUpdateSaveNotice("This workbook day is closed. Reopen it before saving Quick Updates.");
      return;
    }
    setSaving(true);
    setQuickUpdateSaveNotice("Saving Quick Update...");
    try {
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/quick-updates" : "quick-updates"}?date=${encodeURIComponent(model.boardDate)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: quickUpdateCategory, company: quickUpdateCompany, dueWindow: quickUpdateDueWindow, followUpNeeded: quickUpdateFollowUp, person: quickUpdatePerson, phoneNumber: quickUpdatePhone, relatedCustomerId: quickUpdateCustomerId, text })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save Quick Update.");
      setQuickUpdateText("");
      setQuickUpdateCategory("OTHER");
      setQuickUpdatePerson("");
      setQuickUpdatePhone("");
      setQuickUpdateCompany("");
      setQuickUpdateCustomerId(null);
      setQuickUpdateFollowUp(false);
      setQuickUpdateDueWindow("");
      await refreshActiveWorkbook();
      const notice = `Quick Update saved to ${activeWorkbookLabel}.`;
      setQuickUpdateSaveNotice(notice);
      setWorkspaceNotice(notice);
    } catch (error) {
      const notice = error instanceof Error ? error.message : "Unable to save Quick Update.";
      setQuickUpdateSaveNotice(notice);
      setWorkspaceNotice(notice);
    } finally {
      setSaving(false);
    }
  }

  function updateQuickUpdateItem(id: string, patch: Partial<QuickUpdateItem>) {
    updateActiveWorkbook((current) => ({ ...current, quickUpdates: current.quickUpdates.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  async function persistQuickUpdate(id: string, patch: Partial<QuickUpdateItem>) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before updating Quick Updates.");
      return;
    }
    updateQuickUpdateItem(id, patch);
    try {
      const response = await fetch(`/api/coo-workbook/quick-updates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update Quick Update.");
      await refreshActiveWorkbook();
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update Quick Update.");
    }
  }

  function updateReportSeed(id: string, patch: Partial<ReportSeedItem>) {
    updateActiveWorkbook((current) => ({ ...current, reportSeeds: current.reportSeeds.map((seed) => seed.id === id ? { ...seed, ...patch } : seed) }));
  }

  async function persistReportSeed(id: string, patch: Partial<ReportSeedItem>) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before updating Report Seeds.");
      return;
    }
    updateReportSeed(id, patch);
    try {
      const response = await fetch(`/api/coo-workbook/report-seeds/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update Report Seed.");
      await refreshActiveWorkbook();
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update Report Seed.");
    }
  }

  async function generateReportDraft(cadence: ReportCadence = "DAILY", options: { openDrafts?: boolean } = {}) {
    if (isClosed) {
      openWorkbookTool("/vehicles/coo-workbook/drafts");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=${cadence}`, {
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to generate Report Draft.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`${activeWorkbookLabel} ${cadence.toLocaleLowerCase()} Report Draft generated.`);
      if (options.openDrafts) openWorkbookTool("/vehicles/coo-workbook/drafts");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to generate Report Draft.");
    } finally {
      setSaving(false);
    }
  }

  async function copyReportDraft(draft = latestReportDraft) {
    if (!draft || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(dailyReportDraftText(draft));
      setWorkspaceNotice("Report Draft copied.");
    } catch {
      setWorkspaceNotice("Unable to copy the draft from this browser.");
    }
  }

  async function convertToTask(source: "checklist" | "quick", item: DailyChecklistItem | QuickUpdateItem) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before converting items to tasks.");
      return;
    }
    setConvertingId(item.id);
    setWorkspaceNotice(null);
    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setHours(17, 0, 0, 0);
    if (dueAt < now) dueAt.setDate(dueAt.getDate() + 1);
    const isChecklist = source === "checklist";
    const title = isChecklist ? (item as DailyChecklistItem).text : `Follow up: ${(item as QuickUpdateItem).text.slice(0, 72)}`;
    const description = isChecklist
      ? `Converted from ${activeWorkbookLabel} Daily Checklist. Update: ${latestChecklistUpdateText(item as DailyChecklistItem) || "No update added yet."}`
      : `Converted from ${activeWorkbookLabel} Quick Update. Category: ${quickUpdateCategoryLabel((item as QuickUpdateItem).category)}. ${(item as QuickUpdateItem).person ? `Person: ${(item as QuickUpdateItem).person}. ` : ""}${(item as QuickUpdateItem).phoneNumber ? `Phone: ${(item as QuickUpdateItem).phoneNumber}. ` : ""}${(item as QuickUpdateItem).company ? `Company: ${(item as QuickUpdateItem).company}. ` : ""}${(item as QuickUpdateItem).text}`;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: model.advisor.id,
          boardDate: model.boardDate,
          description,
          dueAt: dueAt.toISOString(),
          conversionContext: {
            category: isChecklist ? "DAILY_CHECKLIST" : (item as QuickUpdateItem).category,
            company: isChecklist ? "" : (item as QuickUpdateItem).company,
            originText: isChecklist ? (item as DailyChecklistItem).text : (item as QuickUpdateItem).text,
            person: isChecklist ? "" : (item as QuickUpdateItem).person,
            sourceId: item.id,
            sourceKind: isChecklist ? "COO_WORKBOOK_DAILY_CHECKLIST" : "COO_WORKBOOK_QUICK_UPDATE"
          },
          intakeMetadata: {
            channel: activeWorkbookLabel,
            expectedOutcome: "The converted workbook item has a clear owner, next update, and completion result for the daily report trail.",
            intakeType: "Quick Task",
            requiredUpdates: ["Record the outcome or blocker before end of day."]
          },
          priority: isChecklist && (item as DailyChecklistItem).status === "RED" ? "HIGH" : "MEDIUM",
          requiresManagerApproval: false,
          status: "NOT_STARTED",
          title,
          workflowArea: "GENERAL_MANAGER"
        })
      });
      const payload = await response.json().catch(() => null) as { task?: { id: string; title: string }; error?: string } | null;
      if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "Unable to convert this item right now.");
      if (isChecklist) {
        await persistChecklistItem(item.id, { convertedTaskId: payload.task.id });
      } else {
        await persistQuickUpdate(item.id, { convertedTaskId: payload.task.id });
      }
      setWorkspaceNotice(`Task created: ${payload.task.title}`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to convert this item right now.");
    } finally {
      setConvertingId(null);
    }
  }

  async function convertCarryoverToTask(item: CarryoverItem) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before converting carryover items to tasks.");
      return;
    }
    setConvertingId(item.id);
    setWorkspaceNotice(null);
    const dueAt = new Date(`${item.targetBoardDate}T17:00:00.000`);
    if (Number.isNaN(dueAt.getTime())) dueAt.setHours(17, 0, 0, 0);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: model.advisor.id,
          boardDate: item.targetBoardDate,
          description: `Converted from ${activeWorkbookLabel} carryover. ${item.detail}`,
          dueAt: dueAt.toISOString(),
          conversionContext: {
            category: "CARRYOVER",
            originText: `${item.title}. ${item.detail}`,
            sourceId: item.id,
            sourceKind: "COO_WORKBOOK_CARRYOVER"
          },
          intakeMetadata: {
            channel: activeWorkbookLabel,
            expectedOutcome: "The carryover has a clear owner, timing, and completion result.",
            intakeType: "Carryover Task",
            requiredUpdates: ["Record the outcome or blocker before the next close."]
          },
          priority: "HIGH",
          requiresManagerApproval: false,
          status: "NOT_STARTED",
          title: `Carryover: ${item.title}`,
          workflowArea: "GENERAL_MANAGER"
        })
      });
      const payload = await response.json().catch(() => null) as { task?: { id: string; title: string }; error?: string } | null;
      if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "Unable to convert this carryover right now.");
      await persistCarryover(item.id, { convertedTaskId: payload.task.id, status: "CONVERTED" });
      setWorkspaceNotice(`Task created: ${payload.task.title}`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to convert this carryover right now.");
    } finally {
      setConvertingId(null);
    }
  }

  async function markResumeSourceConverted(resume: WorkbookSearchResume, taskId: string) {
    const sourcePatch =
      resume.source === "checklist"
        ? { endpoint: `/api/coo-workbook/checklist/${encodeURIComponent(resume.id)}`, body: { convertedTaskId: taskId } }
        : resume.source === "quick"
          ? { endpoint: `/api/coo-workbook/quick-updates/${encodeURIComponent(resume.id)}`, body: { convertedTaskId: taskId } }
          : resume.source === "focus"
            ? { endpoint: `/api/coo-workbook/daily-focus/${encodeURIComponent(resume.id)}`, body: { convertedTaskId: taskId } }
            : { endpoint: `/api/coo-workbook/report-seeds/${encodeURIComponent(resume.id)}`, body: { status: "CARRIED_OVER", reviewNote: "Resumed as an active task." } };

    await fetch(sourcePatch.endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sourcePatch.body)
    }).catch(() => undefined);
  }

  function searchResultPriority(item: SearchableWorkItem): DailyFocusPriority {
    if (item.resume?.priority) return item.resume.priority;
    if (item.tone === "red") return "HIGH";
    if (item.tone === "yellow") return "MEDIUM";
    return "LOW";
  }

  function searchResultRiskLevel(item: SearchableWorkItem): DailyFocusRisk {
    if (item.tone === "red" || item.resume?.priority === "CRITICAL") return "BLOCKED";
    if (item.tone === "yellow" || item.resume?.priority === "HIGH") return "WATCH";
    return "NONE";
  }

  function searchResultLineage(item: SearchableWorkItem) {
    const resumeSourceType: Record<WorkbookResumeSource, string> = {
      checklist: "CHECKLIST_ITEM",
      focus: "DAILY_FOCUS",
      quick: "QUICK_UPDATE",
      reportSeed: "REPORT_SEED"
    };
    const sourceType = item.source?.type ?? (item.resume ? resumeSourceType[item.resume.source] : item.kind.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));

    return {
      sourceBoardDate: item.source?.boardDate ?? item.resume?.boardDate ?? model.boardDate,
      sourceHref: scopedWorkbookHref(item.source?.href ?? item.href),
      sourceId: item.source?.id ?? item.resume?.id ?? item.id,
      sourceType
    };
  }

  function searchResultDetail(item: SearchableWorkItem) {
    return [item.context, item.description].filter(Boolean).join(" · ").slice(0, 500);
  }

  function findExistingSearchFocus(item: SearchableWorkItem) {
    const lineage = searchResultLineage(item);
    const normalizedTitle = normalizeSourceTitle(item.resume?.title ?? item.title);
    return activeWorkbook.dailyFocusItems.find((focus) => focus.sourceType === lineage.sourceType && focus.sourceId === lineage.sourceId)
      ?? activeWorkbook.dailyFocusItems.find((focus) => normalizeSourceTitle(focus.outcome) === normalizedTitle)
      ?? null;
  }

  async function addSearchResultToWorkbook(item: SearchableWorkItem, target: "FOCUS" | "CHECKLIST") {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before adding work to today.");
      return;
    }

    setSearchActionId(`${target}:${item.id}`);
    setWorkspaceNotice(null);

    const priority = searchResultPriority(item);
    const riskLevel = searchResultRiskLevel(item);
    const detail = searchResultDetail(item);
    const lineage = searchResultLineage(item);

    try {
      const existingFocus = target === "FOCUS" ? findExistingSearchFocus(item) : null;
      if (existingFocus) {
        setWorkspaceNotice("This item is already in Today’s Focus.");
        return;
      }
      const endpoint = target === "FOCUS" ? "daily-focus" : "checklist";
      const body = target === "FOCUS"
        ? {
            mustCloseToday: priority === "HIGH" || priority === "CRITICAL" || riskLevel === "BLOCKED",
            outcome: item.resume?.title ?? item.title,
            priority,
            riskLevel,
            riskNote: riskLevel === "NONE" ? "" : detail,
            sortOrder: activeWorkbook.dailyFocusItems.length,
            supportNeeded: riskLevel === "BLOCKED" ? detail : "",
            ...lineage
          }
        : {
            priority,
            riskLevel,
            riskNote: riskLevel === "NONE" ? "" : detail,
            text: item.resume?.title ?? item.title,
            ...lineage
          };
      const response = await fetch(`/api/coo-workbook/${endpoint}?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add this search result right now.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(payload?.duplicate ? "This item is already in Today’s Focus." : `${item.resume?.title ?? item.title} added to ${target === "FOCUS" ? "Today’s Focus" : "today’s checklist"}.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to add this search result right now.");
    } finally {
      setSearchActionId(null);
    }
  }

  async function carrySearchResultForward(item: SearchableWorkItem) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before marking carryover.");
      return;
    }

    setSearchActionId(`CARRY:${item.id}`);
    setWorkspaceNotice(null);

    try {
      if (item.resume?.source === "checklist") {
        await persistChecklistItem(item.resume.id, { carryoverReady: true });
      } else if (item.resume?.source === "quick") {
        await persistQuickUpdate(item.resume.id, { carryoverReady: true, followUpNeeded: true });
      } else if (item.resume?.source === "focus") {
        await setEndDayFocusStatus(item.resume.id, "CARRY_OVER");
      } else if (item.resume?.source === "reportSeed") {
        await persistReportSeed(item.resume.id, { reviewNote: "Marked for carryover from workbook search.", status: "CARRIED_OVER" });
      } else {
        const response = await fetch(`/api/coo-workbook/checklist?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carryoverReady: true,
            priority: searchResultPriority(item),
            riskLevel: searchResultRiskLevel(item) === "NONE" ? "WATCH" : searchResultRiskLevel(item),
            riskNote: `Marked for carryover from search. ${searchResultDetail(item)}`.slice(0, 500),
            text: item.title,
            ...searchResultLineage(item)
          })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to mark this item for carryover.");
        await refreshActiveWorkbook();
      }

      setWorkspaceNotice(`${item.resume?.title ?? item.title} marked for carryover.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to mark this item for carryover right now.");
    } finally {
      setSearchActionId(null);
    }
  }

  async function resumeSearchResultAsTask(item: SearchableWorkItem) {
    if (!item.resume) return;

    setConvertingId(item.id);
    setWorkspaceNotice(null);

    const now = new Date();
    const dueAt = new Date(now);
    dueAt.setHours(17, 0, 0, 0);
    if (dueAt < now) dueAt.setDate(dueAt.getDate() + 1);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: model.advisor.id,
          boardDate: model.boardDate,
          description: item.resume.description,
          dueAt: dueAt.toISOString(),
          conversionContext: {
            category: item.kind,
            originText: item.description || item.title,
            sourceId: item.resume.id,
            sourceKind: `COO_WORKBOOK_${item.resume.source.toUpperCase()}`
          },
          intakeMetadata: {
            channel: item.context,
            expectedOutcome: "The resumed workbook item has an active owner, progress updates, and a completion result.",
            intakeType: "Resume Workbook Item",
            requiredUpdates: ["Record what changed, what is next, or why the work is blocked."]
          },
          priority: item.resume.priority,
          requiresManagerApproval: false,
          status: "NOT_STARTED",
          title: item.resume.title,
          vehicleReference: item.title,
          workflowArea: item.resume.workflowArea
        })
      });
      const payload = await response.json().catch(() => null) as { task?: { id: string; title: string }; error?: string } | null;

      if (!response.ok || !payload?.task) {
        throw new Error(payload?.error ?? "Unable to resume this item as a task right now.");
      }

      await markResumeSourceConverted(item.resume, payload.task.id);
      await refreshActiveWorkbook().catch(() => undefined);
      setWorkspaceNotice(`Task resumed: ${payload.task.title}`);

      if (typeof window !== "undefined") {
        router.push(`/tasks/${encodeURIComponent(payload.task.id)}?view=simple&returnTo=${encodeURIComponent("/vehicles/coo-workbook")}`);
      }
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to resume this item as a task right now.");
    } finally {
      setConvertingId(null);
    }
  }

  async function prepareCarryovers() {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before preparing carryover.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/carryovers?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { count?: number; targetBoardDate?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to prepare carryover.");
      await refreshActiveWorkbook();
      const message = `${payload?.count ?? 0} carryover item(s) prepared for ${payload?.targetBoardDate ?? "tomorrow"}.`;
      setReviewingEndDay(false);
      setCloseStepNotice(message);
      setWorkspaceNotice(message);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to prepare carryover.");
    } finally {
      setSaving(false);
    }
  }

  async function persistCarryover(id: string, patch: Partial<CarryoverItem>) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before updating carryover.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/carryovers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update carryover.");
      await refreshActiveWorkbook();
      setWorkspaceNotice("Carryover updated.");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update carryover.");
    } finally {
      setSaving(false);
    }
  }

  async function closeOrReopenDay() {
    setSaving(true);
    try {
      const response = isClosed
        ? await fetch("/api/coo-workbook/reopen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workbookId: activeWorkbook.id })
        })
        : await fetch(`/api/coo-workbook/close?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewedDay: true })
        });
      const payload = await response.json().catch(() => null) as { carryoverCount?: number; dailyReport?: { version: number } | null; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update workbook close status.");
      await refreshActiveWorkbook();
      setReviewingEndDay(false);
      const reportNotice = payload?.dailyReport ? ` Daily report version ${payload.dailyReport.version} was submitted.` : "";
      setWorkspaceNotice(isClosed ? "Workbook day reopened." : `Workbook day closed with ${payload?.carryoverCount ?? 0} carryover item(s).${reportNotice}`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update workbook close status.");
    } finally {
      setSaving(false);
    }
  }

  async function runCloseStep(step: "carryover" | "draft") {
    setCloseStepInProgress(step);
    setCloseStepNotice(null);
    try {
      if (step === "carryover") {
        await prepareCarryovers();
        return;
      }
      setSaving(true);
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, {
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to generate Report Draft.");
      await refreshActiveWorkbook();
      setReviewingEndDay(false);
      setCloseStepNotice("Daily report draft generated and saved.");
      setWorkspaceNotice("Daily report draft generated and saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete close step.";
      setCloseStepNotice(message);
      setWorkspaceNotice(message);
    } finally {
      setCloseStepInProgress(null);
      setSaving(false);
    }
  }

  async function setEndDayFocusStatus(id: string, status: DailyFocusItem["status"]) {
    if (isClosed) return;
    setSaving(true);
    setReviewingEndDay(false);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save the close decision.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(status === "DONE" ? "Outcome marked done." : "Outcome marked to carry into tomorrow.");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to save the close decision.");
    } finally {
      setSaving(false);
    }
  }

  function updateManualReportItem(id: string, patch: Partial<ManualReportItemDraft>) {
    setManualReportItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setReviewingEndDay(false);
  }

  function addManualReportRow() {
    const sequence = manualReportItems.reduce((maximum, item) => Math.max(maximum, Number(item.id.replace("manual-", "")) || 0), 0) + 1;
    setManualReportItems((current) => [...current, { category: "UPDATE", detail: "", id: `manual-${sequence}`, relatedContext: "", title: "" }]);
  }

  function discardManualReportItems() {
    setManualReportItems([{ category: "UPDATE", detail: "", id: "manual-1", relatedContext: "", title: "" }]);
    setManualReportEditorOpen(false);
    setExpandedManualReportItemId(null);
    setReviewingEndDay(false);
  }

  async function saveManualReportItems() {
    const items = manualReportItems.filter((item) => item.title.trim()).map(({ category, detail, relatedContext, title }) => ({ category, detail: detail.trim(), relatedContext: relatedContext.trim(), title: title.trim() }));
    if (!items.length || isClosed) return;
    setSaving(true);
    setReviewingEndDay(false);
    setCloseStepNotice(null);
    try {
      const query = `date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`;
      const response = await fetch(`/api/coo-workbook/report-seeds/manual?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const payload = await response.json().catch(() => null) as { count?: number; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add the missing report items.");
      const draftResponse = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, { method: "POST" });
      const draftPayload = await draftResponse.json().catch(() => null) as { error?: string } | null;
      if (!draftResponse.ok) throw new Error(draftPayload?.error ?? "The items were saved, but the daily draft could not be refreshed.");
      await refreshActiveWorkbook();
      setManualReportItems([{ category: "UPDATE", detail: "", id: "manual-1", relatedContext: "", title: "" }]);
      setManualReportEditorOpen(false);
      setExpandedManualReportItemId(null);
      setCloseDraftExpanded(true);
      const message = `${payload?.count ?? items.length} staff-added report item(s) saved and the daily draft was refreshed.`;
      setCloseStepNotice(message);
      setWorkspaceNotice(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add the missing report items.";
      setCloseStepNotice(message);
      setWorkspaceNotice(message);
    } finally {
      setSaving(false);
    }
  }

  async function addStaffSupportAction(workbookId: string) {
    const note = supportNote.trim();
    if (!note) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/staff-support?workbookId=${encodeURIComponent(workbookId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, requestedUpdate: supportUpdateRequested })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add staff support.");
      setSupportNote("");
      await refreshStaffWorkbook();
      setWorkspaceNotice("Staff support action saved.");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to add staff support.");
    } finally {
      setSaving(false);
    }
  }

  async function persistSupportAction(id: string, patch: Partial<SupportActionItem>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/staff-support/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update staff support.");
      await refreshActiveWorkbook();
      setWorkspaceNotice("Staff support updated.");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to update staff support.");
    } finally {
      setSaving(false);
    }
  }

  async function bringForwardItem(candidate: BringForwardCandidate, target: "FOCUS" | "CHECKLIST" | "ACTION_PLAN") {
    setSaving(true);
    setWorkspaceNotice(null);
    try {
      const response = await fetch(`/api/coo-workbook/bring-forward?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, target })
      });
      const payload = await response.json().catch(() => null) as { error?: string; title?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to bring prior work forward.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`${payload?.title ?? candidate.title} added to today’s ${target === "CHECKLIST" ? "checklist" : target === "ACTION_PLAN" ? "action plan" : "focus"}.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to bring prior work forward.");
    } finally {
      setSaving(false);
    }
  }

  function addReviewActionPlan() {
    const title = actionPlanTitle.trim();
    if (!title) return;
    const firstStep = firstActionStep.trim();
    const planDate = /^\d{4}-\d{2}-\d{2}$/.test(actionPlanDate) ? actionPlanDate : model.boardDate;
    const plan: ReviewActionPlan = {
      comments: [],
      id: makeReviewActionId("plan"),
      lastSavedAt: new Date().toISOString(),
      outcome: actionPlanOutcome.trim(),
      owner: actionPlanOwner.trim(),
      planDate,
      priority: actionPlanPriority,
      status: "DRAFT",
      steps: firstStep ? [newReviewActionStep(firstStep)] : [],
      title
    };
    setReviewActionPlans((items) => [plan, ...items]);
    setExpandedReviewPlanIds((items) => ({ ...items, [plan.id]: false }));
    setActionPlanTitle("");
    setActionPlanOutcome("");
    setActionPlanOwner("");
    setActionPlanDate(model.boardDate);
    setActionPlanPriority("HIGH");
    setFirstActionStep("");
    setWorkspaceNotice(`Draft action plan saved for ${planDate}.`);
  }

  function updateReviewActionPlan(planId: string, patch: Partial<ReviewActionPlan>) {
    setReviewActionPlans((items) => items.map((item) => item.id === planId ? { ...item, ...patch } : item));
  }

  function showReviewPlanFeedback(planId: string, message: string, tone: "active" | "done" | "saved" = "saved") {
    setReviewPlanFeedback((items) => ({ ...items, [planId]: { at: new Date().toISOString(), message, tone } }));
  }

  function deleteReviewActionPlan(planId: string) {
    setReviewActionPlans((items) => items.filter((item) => item.id !== planId));
    setExpandedReviewPlanIds((items) => {
      const next = { ...items };
      delete next[planId];
      return next;
    });
    setWorkspaceNotice("Draft action plan removed.");
  }

  function saveReviewActionPlanDraft(planId: string) {
    const savedAt = new Date().toISOString();
    updateReviewActionPlan(planId, { lastSavedAt: savedAt, status: "DRAFT" });
    showReviewPlanFeedback(planId, "Saved", "saved");
    setWorkspaceNotice(`Draft saved inside Daily Action Plan at ${timeLabel(savedAt)}.`);
  }

  function workReviewActionPlan(planId: string) {
    const savedAt = new Date().toISOString();
    updateReviewActionPlan(planId, { lastSavedAt: savedAt, status: "ACTIVE" });
    showReviewPlanFeedback(planId, "Working", "active");
    setWorkspaceNotice(`Action plan is ready to work from this space as of ${timeLabel(savedAt)}.`);
  }

  function markReviewActionPlanImplemented(planId: string, implemented: boolean) {
    const savedAt = new Date().toISOString();
    updateReviewActionPlan(planId, {
      implementedAt: implemented ? savedAt : undefined,
      lastSavedAt: savedAt,
      status: implemented ? "DONE" : "ACTIVE"
    });
    showReviewPlanFeedback(planId, implemented ? "Implemented" : "Working", implemented ? "done" : "active");
    setWorkspaceNotice(implemented ? `Action plan marked implemented at ${timeLabel(savedAt)}.` : `Action plan moved back to working at ${timeLabel(savedAt)}.`);
  }

  function addReviewActionPlanComment(planId: string) {
    const draftKey = `plan:${planId}`;
    const comment = (actionCommentDrafts[draftKey] ?? "").trim();
    if (!comment) return;
    const timestampedComment = `${dateLabel(new Date().toISOString())}: ${comment}`;
    setReviewActionPlans((items) => items.map((plan) => plan.id === planId ? {
      ...plan,
      comments: [...plan.comments, timestampedComment],
      lastSavedAt: new Date().toISOString()
    } : plan));
    setActionCommentDrafts((drafts) => ({ ...drafts, [draftKey]: "" }));
    showReviewPlanFeedback(planId, "Update saved", "saved");
    setWorkspaceNotice(`Action plan update saved at ${timeLabel(new Date().toISOString())}.`);
  }

  function addReviewActionStepComment(planId: string, stepId: string) {
    const draftKey = `step:${stepId}`;
    const comment = (actionCommentDrafts[draftKey] ?? "").trim();
    if (!comment) return;
    const timestampedComment = `${dateLabel(new Date().toISOString())}: ${comment}`;
    setReviewActionPlans((items) => items.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        lastSavedAt: new Date().toISOString(),
        steps: updateReviewActionStepTree(plan.steps, stepId, (step) => ({
          ...step,
          comments: [...step.comments, timestampedComment],
          lastUpdatedAt: new Date().toISOString()
        }))
      };
    }));
    setActionCommentDrafts((drafts) => ({ ...drafts, [draftKey]: "" }));
    showReviewPlanFeedback(planId, "Subtask update saved", "saved");
  }

  function addReviewActionStep(planId: string, parentStepId: string | null = null) {
    const draftKey = `${planId}:${parentStepId ?? "root"}`;
    const title = (actionStepDrafts[draftKey] ?? "").trim();
    if (!title) return;
    const step = newReviewActionStep(title);
    setReviewActionPlans((items) => items.map((plan) => {
      if (plan.id !== planId) return plan;
      if (!parentStepId) return { ...plan, steps: [...plan.steps, step] };
      return {
        ...plan,
        steps: updateReviewActionStepTree(plan.steps, parentStepId, (item) => ({ ...item, children: [...item.children, step] }))
      };
    }));
    setActionStepDrafts((drafts) => ({ ...drafts, [draftKey]: "" }));
    showReviewPlanFeedback(planId, parentStepId ? "Nested subtask added" : "Subtask added", "saved");
  }

  function updateReviewActionStep(planId: string, stepId: string, patch: Partial<ReviewActionStep>) {
    setReviewActionPlans((items) => items.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        lastSavedAt: new Date().toISOString(),
        steps: updateReviewActionStepTree(plan.steps, stepId, (step) => ({ ...step, ...patch, lastUpdatedAt: new Date().toISOString() }))
      };
    }));
  }

  function deleteReviewActionStep(planId: string, stepId: string) {
    setReviewActionPlans((items) => items.map((plan) => plan.id === planId ? { ...plan, steps: removeReviewActionStep(plan.steps, stepId) } : plan));
  }

  async function promoteReviewActionPlan(plan: ReviewActionPlan) {
    const summary = countReviewActionSteps(plan.steps);
    const planDate = reviewActionPlanDate(plan, model.boardDate);
    setSaving(true);
    setWorkspaceNotice(null);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mustCloseToday: planDate === model.boardDate,
          outcome: plan.outcome || plan.title,
          priority: plan.priority,
          riskLevel: "NONE",
          sortOrder: activeWorkbook.dailyFocusItems.length,
          supportNeeded: "",
          riskNote: summary.total ? `${summary.total} draft subtask${summary.total === 1 ? "" : "s"} reviewed in the action planner for ${planDate}.` : `Planned for ${planDate}.`
        })
      });
      const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to promote this action plan.");
      await refreshActiveWorkbook();
      updateReviewActionPlan(plan.id, { status: "ACTIVE" });
      setWorkspaceNotice(payload?.duplicate ? "This action plan is already in Today’s Focus." : "Action plan promoted to Today’s Focus for adoption review.");
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to promote this action plan.");
    } finally {
      setSaving(false);
    }
  }

  function renderReviewActionStep(planId: string, step: ReviewActionStep, depth = 0) {
    const draftKey = `${planId}:${step.id}`;
    const commentDraftKey = `step:${step.id}`;
    return <div className="advisor-action-step" key={step.id} style={{ "--step-depth": depth } as CSSProperties}>
      <div className="advisor-action-step-main">
        <button aria-label={`Mark ${step.title} ${step.done ? "not done" : "done"}`} className={step.done ? "complete" : ""} onClick={() => updateReviewActionStep(planId, step.id, { done: !step.done })} type="button"><CheckSquare /></button>
        <input aria-label={`Subtask ${step.title}`} onChange={(event) => updateReviewActionStep(planId, step.id, { title: event.target.value })} value={step.title} />
        <button aria-label={`Remove ${step.title}`} onClick={() => deleteReviewActionStep(planId, step.id)} type="button"><X /></button>
      </div>
      <div className="advisor-action-comments">
        {step.comments.length ? <div className="advisor-action-comment-list">{step.comments.map((comment, index) => <small key={`${step.id}-comment-${index}`}>{comment}</small>)}</div> : null}
        <div className="advisor-action-comment-entry">
          <input aria-label={`Update for subtask ${step.title}`} onChange={(event) => setActionCommentDrafts((drafts) => ({ ...drafts, [commentDraftKey]: event.target.value }))} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addReviewActionStepComment(planId, step.id);
            }
          }} placeholder="Add update/comment..." value={actionCommentDrafts[commentDraftKey] ?? ""} />
          <button disabled={!(actionCommentDrafts[commentDraftKey] ?? "").trim()} onClick={() => addReviewActionStepComment(planId, step.id)} type="button"><MessageSquareText /> Save update</button>
        </div>
      </div>
      <div className="advisor-action-step-add">
        <input aria-label={`Add subtask under ${step.title}`} onChange={(event) => setActionStepDrafts((drafts) => ({ ...drafts, [draftKey]: event.target.value }))} onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addReviewActionStep(planId, step.id);
          }
        }} placeholder="Add nested subtask..." value={actionStepDrafts[draftKey] ?? ""} />
        <button disabled={!(actionStepDrafts[draftKey] ?? "").trim()} onClick={() => addReviewActionStep(planId, step.id)} type="button"><Plus /> Subtask</button>
      </div>
      {step.children.length ? <div className="advisor-action-step-children">{step.children.map((child) => renderReviewActionStep(planId, child, depth + 1))}</div> : null}
    </div>;
  }

  if (initialTool === "CLOSE_MY_DAY") {
    const evidenceText = (pattern: RegExp) => reportSeeds.filter((seed) => pattern.test(`${seed.title} ${seed.detail}`));
    const moneyEvidence = evidenceText(/payment|money received|deposit|cash received|paid in full/i);
    const moneyReceivedTotal = moneyEvidence.reduce((total, seed) => {
      const amount = `${seed.title} ${seed.detail}`.match(/\$([\d,]+(?:\.\d{1,2})?)/)?.[1];
      return total + (amount ? Number(amount.replaceAll(",", "")) : 0);
    }, 0);
    const moneyReceivedValue = moneyReceivedTotal > 0
      ? new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(moneyReceivedTotal)
      : moneyEvidence.length ? `${moneyEvidence.length} record${moneyEvidence.length === 1 ? "" : "s"}` : "Not recorded";
    const salesEvidence = evidenceText(/vehicle sold|retail sale|sale completed|sold today/i);
    const repairEvidence = evidenceText(/repair completed|repair completion|work completed/i);
    const deliveryEvidence = evidenceText(/vehicle delivered|customer delivery|delivery completed/i);
    const dropOffEvidence = evidenceText(/vehicle drop.?off|customer drop.?off|vehicle arrived/i);
    const followUpEvidence = evidenceText(/customer follow.?up|follow.?up completed|customer contacted/i);
    const documentEvidence = evidenceText(/document|title|authorization|signed|packet/i);
    const inventoryEvidence = evidenceText(/inventory|stock|vehicle|unit|recon/i);
    const repairCompletionCount = actionQueue.filter((item) => item.actionKind === "HANDOFF" || item.stage === "HANDOFF").length + repairEvidence.length;
    const closeExceptions = actionQueue.filter((item) => item.overdue || ["AUTHORIZATION", "PROMISE_RISK", "PARTS_DELAY"].includes(item.actionKind)).slice(0, 4);
    const customerFollowUps = model.inbox.filter((item) => item.audience === "CUSTOMER");
    const customerResponsesNeeded = customerFollowUps.filter((item) => item.needsResponse).length;
    const customerFollowUpsCompleted = Math.max(0, customerFollowUps.length - customerResponsesNeeded) + followUpEvidence.length;
    const customerFollowUpTotal = customerFollowUps.length + followUpEvidence.length;
    const vehicleDropOffCount = model.counts.todaysArrivals + dropOffEvidence.length;
    const closeoutOutcomeConfigs = {
      DELIVERY: { action: "Add delivery", icon: CheckCircle2, label: "Vehicle delivered", sourceHref: "/vehicles", title: "Record vehicle delivered" },
      DROPOFF: { action: "Add drop-off", icon: CalendarClock, label: "Vehicle drop-off", sourceHref: "/vehicles", title: "Record vehicle drop-off" },
      FOLLOW_UP: { action: "Add follow-up", icon: UsersRound, label: "Customer follow-up", sourceHref: "/crm-next", title: "Record customer follow-up" },
      REPAIR: { action: "Add repair", icon: PackageCheck, label: "Repair completed", sourceHref: "/vehicles", title: "Record completed repair" },
      SALE: { action: "Add sale", icon: CarFront, label: "Vehicle sold", sourceHref: "/sales", title: "Record vehicle sold" }
    } satisfies Record<CloseoutOutcomeKind, { action: string; icon: typeof FileText; label: string; sourceHref: string; title: string }>;
    const openCloseoutOutcome = (kind: CloseoutOutcomeKind) => {
      setCloseoutOutcomeDraft({ amount: "", assignedTo: "", channel: "CALL", customer: "", details: "", eventDate: model.boardDate, eventTime: "", flag: false, nextAction: "", notes: "", reference: "", vehicle: "" });
      setCloseoutOutcomeKind(kind);
    };
    const closeoutOutcomeReady = closeoutOutcomeKind === "SALE" ? Boolean(closeoutOutcomeDraft.customer.trim() && closeoutOutcomeDraft.vehicle.trim())
      : closeoutOutcomeKind === "REPAIR" ? Boolean(closeoutOutcomeDraft.vehicle.trim() && closeoutOutcomeDraft.details.trim())
        : closeoutOutcomeKind === "DELIVERY" ? Boolean(closeoutOutcomeDraft.customer.trim() && closeoutOutcomeDraft.vehicle.trim())
          : closeoutOutcomeKind === "DROPOFF" ? Boolean(closeoutOutcomeDraft.vehicle.trim() && closeoutOutcomeDraft.details.trim())
            : closeoutOutcomeKind === "FOLLOW_UP" ? Boolean(closeoutOutcomeDraft.customer.trim() && closeoutOutcomeDraft.details.trim())
              : false;
    const outcomeCards = [
      { action: "Record payment", detail: moneyEvidence.length ? `${moneyEvidence.length} detailed receipt record(s)` : "Add receipt details and verification", icon: FileText, label: "Money received", onClick: () => setMoneyDrawerOpen(true), value: moneyReceivedValue },
      { action: closeoutOutcomeConfigs.SALE.action, detail: salesEvidence.length ? "From reviewed report evidence" : "No completed sales recorded", icon: CarFront, label: "Vehicles sold", onClick: () => openCloseoutOutcome("SALE"), value: String(salesEvidence.length) },
      { action: closeoutOutcomeConfigs.REPAIR.action, detail: repairCompletionCount ? `${repairCompletionCount} completion record(s)` : "No repair completions recorded", icon: PackageCheck, label: "Repairs completed", onClick: () => openCloseoutOutcome("REPAIR"), value: String(repairCompletionCount) },
      { action: closeoutOutcomeConfigs.DELIVERY.action, detail: deliveryEvidence.length ? "From reviewed report evidence" : "No delivery evidence recorded", icon: CheckCircle2, label: "Vehicles delivered", onClick: () => openCloseoutOutcome("DELIVERY"), value: String(deliveryEvidence.length) },
      { action: closeoutOutcomeConfigs.DROPOFF.action, detail: `${model.counts.waitingCheckIn} still need check-in review`, icon: CalendarClock, label: "Vehicle drop-offs", onClick: () => openCloseoutOutcome("DROPOFF"), value: String(vehicleDropOffCount) },
      { action: closeoutOutcomeConfigs.FOLLOW_UP.action, detail: `${customerResponsesNeeded} still need a response`, icon: UsersRound, label: "Customer follow-ups", onClick: () => openCloseoutOutcome("FOLLOW_UP"), value: `${customerFollowUpsCompleted}/${customerFollowUpTotal}` }
    ];
    const sourceCoverage = [
      { count: model.collaboratingTasks.length, label: "Tasks" },
      { count: model.inbox.length, label: "CRM" },
      { count: salesEvidence.length, label: "Sales" },
      { count: model.repairOrders.length, label: "Service" },
      { count: inventoryEvidence.length, label: "Inventory" },
      { count: model.appointments.length, label: "Appointments" },
      { count: moneyEvidence.length, label: "Payments" },
      { count: documentEvidence.length, label: "Documents" },
      { count: model.inbox.filter((item) => item.audience === "TEAM" || item.audience === "MANAGEMENT").length, label: "Team communications" }
    ];
    const enterpriseCloseRows: EnterpriseCloseRow[] = [
      ...closeReviewItems.map((item): EnterpriseCloseRow => ({
        checklistId: item.kind === "checklist" ? item.checklistId : undefined,
        detail: item.detail,
        due: "Today",
        filter: /customer|call|follow.?up|promise/i.test(`${item.title} ${item.detail}`) ? "CUSTOMER" : "ALL",
        focusId: item.kind === "focus" ? item.focusId : undefined,
        href: item.href,
        id: `workbook-${item.id}`,
        kind: item.kind,
        owner: activeWorkbookOwner,
        risk: item.status === "Not done" ? "Medium" : "Low",
        source: item.kind === "focus" ? "Task" : "Workbook",
        status: item.status,
        title: item.title
      })),
      ...model.collaboratingTasks.filter((item) => !/complete|closed|done/i.test(item.status)).map((item): EnterpriseCloseRow => ({
        detail: item.description || item.vehicleReference || item.customerReference || "Application task",
        due: dateLabel(item.dueAt),
        filter: item.customerReference ? "CUSTOMER" : item.vehicleReference ? "VEHICLES" : "ALL",
        href: item.href,
        id: `task-${item.id}`,
        kind: "linked",
        owner: item.assignedUserName,
        risk: item.priority === "CRITICAL" ? "High" : item.priority === "HIGH" ? "Medium" : "Low",
        source: "Task",
        status: item.status,
        title: item.title
      })),
      ...actionQueue.filter((item) => item.overdue || ["AUTHORIZATION", "PROMISE_RISK", "PARTS_DELAY", "HANDOFF"].includes(item.actionKind)).map((item): EnterpriseCloseRow => ({
        detail: `${item.repairOrderNumber} · ${item.vehicleLabel} · ${item.nextAction}`,
        due: dateLabel(item.targetAt),
        filter: item.actionKind === "AUTHORIZATION" ? "DOCUMENTS" : "VEHICLES",
        href: repairOrderHref(item.id),
        id: `service-${item.id}`,
        kind: "linked",
        owner: activeWorkbookOwner,
        risk: item.overdue ? "Overdue" : item.actionKind === "PROMISE_RISK" ? "High" : "Medium",
        source: "Service",
        status: item.actionLabel,
        title: item.actionLabel
      })),
      ...model.inbox.filter((item) => item.needsResponse).map((item): EnterpriseCloseRow => ({
        detail: `${item.customerName} · ${item.preview}`,
        due: item.dueAt ? dateLabel(item.dueAt) : "Response needed",
        filter: "CUSTOMER",
        href: repairOrderHref(item.repairOrderId),
        id: `crm-${item.id}`,
        kind: "linked",
        owner: item.authorName,
        risk: item.audience === "MANAGEMENT" ? "High" : "Medium",
        source: item.audience === "CUSTOMER" ? "CRM" : "Team",
        status: "Needs response",
        title: item.subject
      })),
      ...reportSeeds.filter((seed) => seed.status !== "EXCLUDED" && /payment|deposit|money|document|title|signed|funding|sale/i.test(`${seed.title} ${seed.detail}`)).map((seed): EnterpriseCloseRow => ({
        detail: seed.detail,
        due: "Before close",
        filter: /payment|deposit|money|funding/i.test(`${seed.title} ${seed.detail}`) ? "FINANCIAL" : "DOCUMENTS",
        href: "/vehicles/coo-workbook/report-seeds",
        id: `evidence-${seed.id}`,
        kind: "linked",
        owner: activeWorkbookOwner,
        risk: seed.status === "CARRIED_OVER" ? "High" : "Medium",
        source: /payment|deposit|money/i.test(`${seed.title} ${seed.detail}`) ? "Payment" : "Document",
        status: reportSeedStatusLabel(seed.status),
        title: seed.title
      }))
    ].filter((item, index, items) => items.findIndex((candidate) => candidate.source === item.source && candidate.title.trim().toLocaleLowerCase() === item.title.trim().toLocaleLowerCase()) === index);
    const visibleEnterpriseRows = enterpriseCloseRows.filter((item) => closeWorkFilter === "ALL" || item.filter === closeWorkFilter).slice(0, 8);
    const closeWorkTabs: Array<{ label: string; value: CloseWorkFilter }> = [
      { label: "All open work", value: "ALL" },
      { label: "Customer promises", value: "CUSTOMER" },
      { label: "Financial", value: "FINANCIAL" },
      { label: "Vehicles", value: "VEHICLES" },
      { label: "Documents", value: "DOCUMENTS" }
    ];
    const closeSteps = [
      { done: sourceCoverage.every((source) => source.count >= 0), label: "Review coverage" },
      { done: moneyEvidence.length > 0 || salesEvidence.length > 0 || deliveryEvidence.length > 0, label: "Reconcile outcomes" },
      { done: unresolvedEndDayCount === 0, label: "Decide open work" },
      { done: tomorrowItems.length === 0 || protectedCarryoverCount > 0, label: "Prepare handoff" },
      { done: endDayReadyForApproval || isClosed, label: "Approve & submit" }
    ];
    const activeStepIndex = Math.max(0, closeSteps.findIndex((step) => !step.done));
    const suggestedDailySummary = [
      `Completed ${todayWorkRollup.done} of ${todayWorkRollup.total} planned workbook item(s).`,
      `${repairCompletionCount} repair completion(s) are at customer handoff and ${model.counts.todaysArrivals} vehicle arrival(s) were recorded.`,
      customerResponsesNeeded ? `${customerResponsesNeeded} customer follow-up(s) still need a response.` : "No customer follow-ups are waiting for a response.",
      closeExceptions.length ? `${closeExceptions.length} operating exception(s) need review.` : "No operating exceptions remain for review.",
      tomorrowItems.length ? `${tomorrowItems.length} item(s) are identified for tomorrow's handoff.` : "No work is currently identified for tomorrow's handoff."
    ].join(" ");

    async function saveDailySummarySupplement() {
      const detail = dailySummary.trim();
      if (!detail || isClosed) return;
      setSaving(true);
      setReviewingEndDay(false);
      setCloseStepNotice(null);
      try {
        const category: ManualReportCategory = dailySummaryAudience === "MANAGER" ? "MANAGEMENT" : dailySummaryAudience === "HANDOFF" ? "CARRYOVER" : "UPDATE";
        const audienceLabel = dailySummaryAudience === "MANAGER" ? "Manager summary" : dailySummaryAudience === "HANDOFF" ? "Team handoff summary" : "Staff daily summary";
        const query = `date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`;
        const response = await fetch(`/api/coo-workbook/report-seeds/manual?${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ category, detail, relatedContext: `${activeWorkbookLabel} · ${model.boardDate}`, title: audienceLabel }] })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to save the daily summary.");
        const draftResponse = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, { method: "POST" });
        const draftPayload = await draftResponse.json().catch(() => null) as { error?: string } | null;
        if (!draftResponse.ok) throw new Error(draftPayload?.error ?? "The summary was saved, but the daily report could not be refreshed.");
        await refreshActiveWorkbook();
        setDailySummary("");
        setCloseDraftExpanded(true);
        setCloseStepNotice(`${audienceLabel} saved as supplemental report evidence.`);
      } catch (error) {
        setCloseStepNotice(error instanceof Error ? error.message : "Unable to save the daily summary.");
      } finally {
        setSaving(false);
      }
    }

    async function saveMoneyReceived() {
      const amount = Number(moneyReceivedDraft.amount);
      const receivedFrom = moneyReceivedDraft.receivedFrom.trim();
      if (!Number.isFinite(amount) || amount <= 0 || !receivedFrom || !moneyReceivedDraft.verified || isClosed) return;
      const formattedAmount = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(amount);
      const receivedAt = [moneyReceivedDraft.receivedDate, moneyReceivedDraft.receivedTime].filter(Boolean).join(" at ");
      const receiptRecord: MoneyReceivedReceipt = {
        activeWorkbookLabel,
        amount: formattedAmount,
        businessDate: parseBoardDate(model.boardDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        id: `money-receipt-${Date.now()}`,
        method: moneyMethodLabels[moneyReceivedDraft.method],
        notes: moneyReceivedDraft.notes.trim(),
        purpose: moneyPurposeLabels[moneyReceivedDraft.purpose],
        receivedAt,
        receivedFrom,
        recordedAt: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
        recordedBy: model.advisor.name,
        reference: moneyReceivedDraft.reference.trim(),
        relatedRecord: moneyReceivedDraft.relatedRecord.trim()
      };
      const detail = [
        `Amount: ${formattedAmount}`,
        `Received from: ${receivedFrom}`,
        `Payment method: ${moneyMethodLabels[moneyReceivedDraft.method]}`,
        `Purpose: ${moneyPurposeLabels[moneyReceivedDraft.purpose]}`,
        `Received: ${receivedAt}`,
        moneyReceivedDraft.reference.trim() ? `Receipt / reference: ${moneyReceivedDraft.reference.trim()}` : null,
        moneyReceivedDraft.relatedRecord.trim() ? `Related vehicle, deal, RO, or account: ${moneyReceivedDraft.relatedRecord.trim()}` : null,
        moneyReceivedDraft.notes.trim() ? `Notes: ${moneyReceivedDraft.notes.trim()}` : null,
        `Verified by: ${model.advisor.name}`
      ].filter((item): item is string => Boolean(item)).join("\n");
      setSaving(true);
      setReviewingEndDay(false);
      setCloseStepNotice(null);
      try {
        const query = `date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`;
        const response = await fetch(`/api/coo-workbook/report-seeds/manual?${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ category: "COMPLETED", detail, relatedContext: `${activeWorkbookLabel} · ${moneyPurposeLabels[moneyReceivedDraft.purpose]}`, title: `Money received - ${formattedAmount} - ${receivedFrom}` }] })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to record the payment.");
        const draftResponse = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, { method: "POST" });
        const draftPayload = await draftResponse.json().catch(() => null) as { error?: string } | null;
        if (!draftResponse.ok) throw new Error(draftPayload?.error ?? "The payment was recorded, but the daily report could not be refreshed.");
        await refreshActiveWorkbook();
        setMoneyReceiptToPrint(receiptRecord);
        setMoneyReceivedDraft({ amount: "", method: "CASH", notes: "", purpose: "CUSTOMER_PAYMENT", receivedDate: model.boardDate, receivedFrom: "", receivedTime: "", reference: "", relatedRecord: "", verified: false });
        setPrintMoneyReceiptAfterSave(false);
        setMoneyDrawerOpen(false);
        setCloseDraftExpanded(true);
        setCloseStepNotice(`${formattedAmount} received from ${receivedFrom} was recorded and added to the daily report.${printMoneyReceiptAfterSave ? " Receipt is ready to print." : ""}`);
      } catch (error) {
        setCloseStepNotice(error instanceof Error ? error.message : "Unable to record the payment.");
      } finally {
        setSaving(false);
      }
    }

    async function saveCloseoutOutcome() {
      if (!closeoutOutcomeKind || !closeoutOutcomeReady || isClosed) return;
      const config = closeoutOutcomeConfigs[closeoutOutcomeKind];
      const occurredAt = [closeoutOutcomeDraft.eventDate, closeoutOutcomeDraft.eventTime].filter(Boolean).join(" at ");
      const channelLabels: Record<CloseoutOutcomeDraft["channel"], string> = { CALL: "Phone call", EMAIL: "Email", IN_PERSON: "In person", SMS: "Text message" };
      const detailLines = closeoutOutcomeKind === "SALE" ? [
        `Customer: ${closeoutOutcomeDraft.customer.trim()}`,
        `Vehicle: ${closeoutOutcomeDraft.vehicle.trim()}`,
        closeoutOutcomeDraft.amount ? `Sale amount: ${new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(Number(closeoutOutcomeDraft.amount))}` : null,
        closeoutOutcomeDraft.reference.trim() ? `Deal / reference: ${closeoutOutcomeDraft.reference.trim()}` : null,
        closeoutOutcomeDraft.assignedTo.trim() ? `Salesperson: ${closeoutOutcomeDraft.assignedTo.trim()}` : null,
        `Sold: ${occurredAt}`
      ] : closeoutOutcomeKind === "REPAIR" ? [
        `Vehicle / repair order: ${closeoutOutcomeDraft.vehicle.trim()}`,
        `Work completed: ${closeoutOutcomeDraft.details.trim()}`,
        closeoutOutcomeDraft.assignedTo.trim() ? `Technician / vendor: ${closeoutOutcomeDraft.assignedTo.trim()}` : null,
        closeoutOutcomeDraft.reference.trim() ? `Invoice / reference: ${closeoutOutcomeDraft.reference.trim()}` : null,
        `Completed: ${occurredAt}`,
        `Quality check: ${closeoutOutcomeDraft.flag ? "Confirmed" : "Not confirmed"}`
      ] : closeoutOutcomeKind === "DELIVERY" ? [
        `Customer / recipient: ${closeoutOutcomeDraft.customer.trim()}`,
        `Vehicle: ${closeoutOutcomeDraft.vehicle.trim()}`,
        closeoutOutcomeDraft.reference.trim() ? `Odometer / delivery reference: ${closeoutOutcomeDraft.reference.trim()}` : null,
        closeoutOutcomeDraft.assignedTo.trim() ? `Delivered by: ${closeoutOutcomeDraft.assignedTo.trim()}` : null,
        `Delivered: ${occurredAt}`,
        `Keys and documents confirmed: ${closeoutOutcomeDraft.flag ? "Yes" : "No"}`
      ] : closeoutOutcomeKind === "DROPOFF" ? [
        closeoutOutcomeDraft.customer.trim() ? `Customer / source: ${closeoutOutcomeDraft.customer.trim()}` : null,
        `Vehicle: ${closeoutOutcomeDraft.vehicle.trim()}`,
        `Drop-off reason: ${closeoutOutcomeDraft.details.trim()}`,
        closeoutOutcomeDraft.reference.trim() ? `Condition / reference: ${closeoutOutcomeDraft.reference.trim()}` : null,
        closeoutOutcomeDraft.assignedTo.trim() ? `Assigned to: ${closeoutOutcomeDraft.assignedTo.trim()}` : null,
        `Arrived: ${occurredAt}`
      ] : [
        `Customer: ${closeoutOutcomeDraft.customer.trim()}`,
        `Contact method: ${channelLabels[closeoutOutcomeDraft.channel]}`,
        `Outcome: ${closeoutOutcomeDraft.details.trim()}`,
        closeoutOutcomeDraft.nextAction.trim() ? `Next action: ${closeoutOutcomeDraft.nextAction.trim()}` : null,
        closeoutOutcomeDraft.reference.trim() ? `Related record: ${closeoutOutcomeDraft.reference.trim()}` : null,
        `Completed: ${occurredAt}`,
        `Response still needed: ${closeoutOutcomeDraft.flag ? "Yes" : "No"}`
      ];
      if (closeoutOutcomeDraft.notes.trim()) detailLines.push(`Notes: ${closeoutOutcomeDraft.notes.trim()}`);
      const subject = closeoutOutcomeDraft.vehicle.trim() || closeoutOutcomeDraft.customer.trim();
      const title = `${config.label} - ${subject}`;
      setSaving(true);
      setReviewingEndDay(false);
      setCloseStepNotice(null);
      try {
        const query = `date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`;
        const response = await fetch(`/api/coo-workbook/report-seeds/manual?${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ category: closeoutOutcomeKind === "DROPOFF" ? "UPDATE" : "COMPLETED", detail: detailLines.filter((item): item is string => Boolean(item)).join("\n"), relatedContext: `${activeWorkbookLabel} · ${config.label}`, title }] })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? `Unable to save the ${config.label.toLocaleLowerCase()}.`);
        const draftResponse = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, { method: "POST" });
        const draftPayload = await draftResponse.json().catch(() => null) as { error?: string } | null;
        if (!draftResponse.ok) throw new Error(draftPayload?.error ?? "The outcome was saved, but the daily report could not be refreshed.");
        await refreshActiveWorkbook();
        setCloseoutOutcomeKind(null);
        setCloseDraftExpanded(true);
        setCloseStepNotice(`${config.label} saved and added to the daily report.`);
      } catch (error) {
        setCloseStepNotice(error instanceof Error ? error.message : `Unable to save the ${config.label.toLocaleLowerCase()}.`);
      } finally {
        setSaving(false);
      }
    }

    const activeCloseoutOutcomeConfig = closeoutOutcomeKind ? closeoutOutcomeConfigs[closeoutOutcomeKind] : null;
    const ActiveCloseoutOutcomeIcon = activeCloseoutOutcomeConfig?.icon ?? FileText;

    return <section className="advisor-close-day" aria-label="Close My Day tool">
      <header className="advisor-close-day-titlebar">
        <div>
          <Link href={scopedWorkbookHref("/vehicles/coo-workbook")}>← {activeWorkbookLabel}</Link>
          <h1>Close My Day</h1>
          <p>Enterprise closeout across every connected workspace. My work submits the same daily report managers review.</p>
        </div>
        <div className="advisor-close-day-controls">
          <label><span>Business date</span><strong>{parseBoardDate(model.boardDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong></label>
          <label><span>Shift</span><select aria-label="Closeout shift" defaultValue="FULL"><option value="FULL">Full day</option><option value="AM">Morning</option><option value="PM">Evening</option></select></label>
          <label><span>Scope</span><select aria-label="Closeout scope" onChange={(event) => changeCloseoutScope(event.target.value as "MY" | "TEAM")} value={effectiveWorkbookView === "MY" ? "MY" : "TEAM"}><option value="MY">My work</option><option value="TEAM">Team work</option></select></label>
          <button disabled={saving || isClosed} onClick={() => void runCloseStep("draft")} type="button"><Save /> {closeStepInProgress === "draft" ? "Saving…" : "Save draft"}</button>
        </div>
      </header>

      <nav className="advisor-close-day-steps" aria-label="Closeout progress">
        {closeSteps.map((step, index) => <span className={step.done ? "done" : index === activeStepIndex ? "active" : ""} key={step.label}><b>{step.done ? <CheckCircle2 /> : index + 1}</b><small>{step.label}</small></span>)}
      </nav>

      <section className="advisor-close-day-coverage" aria-label="Application coverage">
        <header><div><h2>Application coverage</h2><p>Connected sources are included in today’s closeout.</p></div><span><CheckCircle2 /> 9/9 connected</span><small>Last synced {new Date(model.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></header>
        <div>{sourceCoverage.map((source) => <span key={source.label} title={`${source.count} closeout record(s) found`}><CheckCircle2 /> {source.label}<b>{source.count}</b></span>)}</div>
      </section>

      <section className="advisor-close-day-outcomes" aria-labelledby="close-day-outcomes-title">
        <header><div><h2 id="close-day-outcomes-title">Today’s outcomes</h2><p>Live closeout totals from connected workbook and operating records.</p></div><Link href={scopedWorkbookHref("/vehicles/coo-workbook/report-seeds")}>Review evidence</Link></header>
        <div>{outcomeCards.map((card) => {
          const Icon = card.icon;
          const content = <><Icon /><span><small>{card.label}</small><strong>{card.value}</strong><em>{card.detail}</em><b><Pencil /> {card.action}</b></span></>;
          return <button aria-label={`${card.action}: ${card.label}`} className="advisor-close-day-outcome-action" disabled={saving || isClosed} key={card.label} onClick={card.onClick} type="button">{content}</button>;
        })}</div>
      </section>

      <div className="advisor-close-day-layout">
        <main>
          <section className="advisor-close-day-work">
            <nav className="advisor-close-day-tabs" aria-label="Closeout work filters">{closeWorkTabs.map((tab) => <button aria-pressed={closeWorkFilter === tab.value} key={tab.value} onClick={() => setCloseWorkFilter(tab.value)} type="button">{tab.label}</button>)}</nav>
            <header><div><h2>Open work requiring a decision</h2><p>Every item remains linked to its source record.</p></div><span>{visibleEnterpriseRows.length} items</span></header>
            <div className="advisor-close-day-table" role="table" aria-label="Unfinished work decisions">
              <div className="advisor-close-day-table-head" role="row"><span>Source</span><span>Work item</span><span>Owner</span><span>Due / promise</span><span>Risk</span><span>Decision</span></div>
              {visibleEnterpriseRows.length ? visibleEnterpriseRows.map((item) => <article className={item.status === "Done" ? "done" : item.status === "Carry over" ? "carry" : "open"} key={item.id} role="row">
                <b className={`source ${item.source.toLocaleLowerCase()}`}><FileText /> {item.source}</b>
                <div><strong>{item.title}</strong><small>{item.detail}</small><Link href={scopedWorkbookHref(item.href)}>Open source</Link></div>
                <span>{item.owner}</span>
                <span>{item.due}</span>
                <em className={item.risk.toLocaleLowerCase()}>{item.risk}</em>
                <div className="advisor-close-day-decisions">
                  {item.kind === "linked" ? <Link href={scopedWorkbookHref(item.href)}><CalendarClock /> Carry</Link> : <button aria-pressed={item.status === "Carry over"} disabled={saving || isClosed} onClick={() => item.kind === "focus" && item.focusId ? void setEndDayFocusStatus(item.focusId, "CARRY_OVER") : item.checklistId ? void persistChecklistItem(item.checklistId, { done: false, carryoverReady: true }) : undefined} type="button"><CalendarClock /> Carry</button>}
                  <Link href={scopedWorkbookHref("/vehicles/coo-workbook/action-plan")}>Reassign</Link>
                  <Link href={scopedWorkbookHref("/vehicles/coo-workbook/staff-support")}>Escalate</Link>
                  {item.kind === "linked" ? <Link className="complete" href={scopedWorkbookHref(item.href)}><CheckCircle2 /> Complete</Link> : <button aria-pressed={item.status === "Done"} disabled={saving || isClosed} onClick={() => item.kind === "focus" && item.focusId ? void setEndDayFocusStatus(item.focusId, "DONE") : item.checklistId ? void persistChecklistItem(item.checklistId, { done: true, carryoverReady: false, status: "GREEN" }) : undefined} type="button"><CheckCircle2 /> Complete</button>}
                </div>
              </article>) : <p className="advisor-close-day-empty"><CheckCircle2 /> No open work matches this view.</p>}
            </div>
          </section>

          <section className="advisor-close-day-report">
            <header><div><h2>Automatic daily report</h2><p>Compiled from connected source records.</p></div><button disabled={saving || isClosed} onClick={() => void runCloseStep("draft")} type="button"><FileText /> {latestReportDraft ? "Refresh report" : "Generate report"}</button></header>
            <div><article><FileText /><span><small>Financial outcomes</small><strong>{moneyEvidence.length} receipt record(s)</strong><em>{moneyEvidence.length ? "Evidence captured" : "Needs reconciliation"}</em></span></article><article><CarFront /><span><small>Vehicle movement</small><strong>{salesEvidence.length} sold · {deliveryEvidence.length} delivered</strong><em>{model.counts.todaysArrivals} drop-offs</em></span></article><article><UsersRound /><span><small>Customer commitments</small><strong>{customerFollowUpsCompleted}/{customerFollowUps.length} completed</strong><em>{customerResponsesNeeded} overdue</em></span></article><article><CheckCircle2 /><span><small>Completed work</small><strong>{todayWorkRollup.done} items</strong><em>Across workbook sources</em></span></article><article><AlertTriangle /><span><small>Exceptions</small><strong>{closeExceptions.length} items</strong><em>Require attention</em></span></article><article><ListChecks /><span><small>Tomorrow’s priorities</small><strong>{tomorrowItems.length} items</strong><em>Prepared for handoff</em></span></article></div>
          </section>

          <section className="advisor-close-day-summary">
            <header><div><h2>Staff daily summary</h2><p>Supplement the source-backed report with context only you can provide.</p></div><span>Optional supplement</span></header>
            <div className="advisor-close-day-summary-prompt"><MessageSquareText /><span><strong>Useful context to include</strong><small>Accomplishments, customer or vehicle updates, decisions, blockers, support needed, and tomorrow’s priorities.</small></span><button disabled={saving || isClosed} onClick={() => setDailySummary((current) => current.trim() ? `${current.trim()}\n\n${suggestedDailySummary}` : suggestedDailySummary)} type="button">Draft from today’s activity</button></div>
            <label><span>Daily summary</span><textarea aria-label="Staff daily summary" disabled={isClosed} onChange={(event) => setDailySummary(event.target.value)} placeholder="Add the context the connected records do not fully explain…" rows={6} value={dailySummary} /></label>
            <footer><div><label><span>Include as</span><select aria-label="Daily summary audience" disabled={isClosed} onChange={(event) => setDailySummaryAudience(event.target.value as DailySummaryAudience)} value={dailySummaryAudience}><option value="REPORT">Daily report supplement</option><option value="MANAGER">Manager review</option><option value="HANDOFF">Team handoff</option></select></label><small><ShieldCheck /> This adds report evidence only. It does not change source records.</small></div><button disabled={saving || isClosed || !dailySummary.trim()} onClick={() => void saveDailySummarySupplement()} type="button"><Save /> {saving ? "Saving…" : "Save summary"}</button></footer>
          </section>
        </main>

        <aside>
          <section className="advisor-close-day-readiness">
            <header><span><ShieldCheck /></span><div><small>Enterprise readiness</small><strong>{closeReadiness.score}%</strong></div></header>
            <div><i style={{ width: `${closeReadiness.score}%` }} /></div>
            <p>{isClosed ? "This workbook day is closed." : endDayReadyForApproval ? "Everything required for final review is ready." : closeReadiness.prompts[0] ?? "Continue reviewing the open items."}</p>
            <ul><li className="done"><CheckCircle2 /> Source coverage <b>9/9</b></li><li className={moneyEvidence.length ? "done" : "open"}><FileText /> Financial reconciliation <b>{moneyEvidence.length ? "Reviewed" : "Open"}</b></li><li className={unresolvedEndDayCount ? "open" : "done"}><CheckCircle2 /> Work decisions <b>{unresolvedEndDayCount ? `${unresolvedEndDayCount} open` : "Ready"}</b></li><li className={tomorrowItems.length && !protectedCarryoverCount ? "open" : "done"}><CalendarClock /> Handoff <b>{protectedCarryoverCount}/{tomorrowItems.length}</b></li><li className={latestReportDraft ? "done" : "open"}><FileText /> Report evidence <b>{latestReportDraft ? "Ready" : "Needed"}</b></li></ul>
          </section>

          <section className="advisor-close-day-exceptions"><header><div><h2>Needs review</h2><p>Exceptions that can affect promises or tomorrow’s start.</p></div><span>{closeExceptions.length}</span></header>{closeExceptions.length ? closeExceptions.map((item) => <Link href={repairOrderHref(item.id)} key={item.id}><AlertTriangle /><span><strong>{item.actionLabel}</strong><small>{item.repairOrderNumber} · {item.vehicleLabel}</small></span></Link>) : <p><CheckCircle2 /> No operating exceptions remain.</p>}</section>

          <section className="advisor-close-day-tomorrow"><header><h2>Tomorrow starts here</h2><Link href={scopedWorkbookHref("/vehicles/coo-workbook/action-plan")}>Edit plan</Link></header>{tomorrowItems.length ? tomorrowItems.slice(0, 3).map((item, index) => <p key={item.id}><b>{index + 1}</b><span><strong>{item.title}</strong><small>{item.status}</small></span></p>) : <p className="empty"><CheckCircle2 /> Clear start</p>}</section>

          <section className="advisor-close-day-signoff"><header><div><h2>Closeout record</h2><p>Audit note</p></div><span>{isClosed ? "Approved" : "Not yet approved"}</span></header><p><FileText /><span>{isClosed ? "The closeout is approved and preserved in the workbook history." : effectiveWorkbookView === "MY" ? "Closeout will submit the staff daily report and update the manager reporting view." : "Closeout will be submitted with a record of all decisions and source links."}</span></p></section>
        </aside>
      </div>

      {reviewingEndDay && !isClosed ? <section className="advisor-end-day-final-review advisor-close-day-final" ref={endDayReviewRef} tabIndex={-1}>
        <header><div><span><ShieldCheck /></span><div><h2>Final closeout review</h2><p>{effectiveWorkbookView === "MY" ? "Approval submits your staff daily report, closes your day, and preserves the handoff evidence." : "Approval preserves today’s decisions, handoff, and report evidence."}</p></div></div><small>{endDayReadyForApproval ? "Ready to approve" : "Needs attention"}</small></header>
        <div><p className={unresolvedEndDayCount ? "blocker" : "ready"}><CheckCircle2 /><span><strong>Work decisions</strong><small>{unresolvedEndDayCount ? `${unresolvedEndDayCount} still open` : "All decided"}</small></span></p><p className={latestReportDraft ? "ready" : "blocker"}><FileText /><span><strong>Daily report</strong><small>{latestReportDraft ? `${latestReportDraftItemCount} items reviewed` : "Generate draft"}</small></span></p><p className={hasUnsavedManualReportItems ? "blocker" : "ready"}><Plus /><span><strong>Staff additions</strong><small>{hasUnsavedManualReportItems ? "Save or discard" : "No unsaved additions"}</small></span></p></div>
        <footer><button className="secondary" onClick={() => setReviewingEndDay(false)} type="button">Back to edit</button><button disabled={saving || !endDayReadyForApproval} onClick={() => void closeOrReopenDay()} type="button">{saving ? "Closing…" : "Approve & Close Day"}</button></footer>
      </section> : null}

      {moneyDrawerOpen ? <div className="advisor-close-day-drawer-backdrop">
        <aside aria-labelledby="money-received-drawer-title" aria-modal="true" className="advisor-close-day-drawer" role="dialog">
          <header>
            <div><span><FileText /></span><div><small>Financial outcome</small><h2 id="money-received-drawer-title">Record money received</h2><p>Capture the full receipt trail for today’s closeout and daily report.</p></div></div>
            <button aria-label="Close money received drawer" onClick={() => setMoneyDrawerOpen(false)} type="button"><X /></button>
          </header>
          <form onSubmit={(event) => { event.preventDefault(); void saveMoneyReceived(); }}>
            <section className="advisor-close-day-drawer-summary">
              <div><small>Business date</small><strong>{parseBoardDate(model.boardDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong></div>
              <div><small>Workbook</small><strong>{activeWorkbookLabel}</strong></div>
              <div><small>Recorded by</small><strong>{model.advisor.name}</strong></div>
            </section>
            <fieldset>
              <legend>Payment details</legend>
              <div className="advisor-close-day-money-fields">
                <label className="amount"><span>Amount received *</span><div><b>$</b><input aria-label="Amount received" autoFocus inputMode="decimal" min="0.01" onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" required step="0.01" type="number" value={moneyReceivedDraft.amount} /></div></label>
                <label><span>Received from *</span><input aria-label="Received from" maxLength={120} onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, receivedFrom: event.target.value }))} placeholder="Customer, vendor, or source" required value={moneyReceivedDraft.receivedFrom} /></label>
                <label><span>Payment method *</span><select aria-label="Payment method" onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, method: event.target.value as MoneyReceivedDraft["method"] }))} value={moneyReceivedDraft.method}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="CHECK">Check</option><option value="ACH">ACH</option><option value="WIRE">Wire</option><option value="OTHER">Other</option></select></label>
                <label><span>Applied to *</span><select aria-label="Payment purpose" onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, purpose: event.target.value as MoneyReceivedDraft["purpose"] }))} value={moneyReceivedDraft.purpose}><option value="CUSTOMER_PAYMENT">Customer payment</option><option value="DOWN_PAYMENT">Down payment</option><option value="DEPOSIT">Deposit</option><option value="VEHICLE_SALE">Vehicle sale</option><option value="SERVICE_PAYMENT">Service payment</option><option value="OTHER">Other</option></select></label>
                <label><span>Date received *</span><input aria-label="Date received" onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, receivedDate: event.target.value }))} required type="date" value={moneyReceivedDraft.receivedDate} /></label>
                <label><span>Time received</span><input aria-label="Time received" onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, receivedTime: event.target.value }))} type="time" value={moneyReceivedDraft.receivedTime} /></label>
                <label><span>Receipt / reference number</span><input aria-label="Receipt or reference number" maxLength={100} onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Receipt, check, or transaction ID" value={moneyReceivedDraft.reference} /></label>
                <label><span>Related record</span><input aria-label="Related vehicle deal repair order or account" maxLength={140} onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, relatedRecord: event.target.value }))} placeholder="Stock #, VIN, deal #, RO, or account" value={moneyReceivedDraft.relatedRecord} /></label>
              </div>
              <label className="notes"><span>Notes</span><textarea aria-label="Money received notes" maxLength={800} onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Add allocation details, exceptions, or anything management should know." rows={4} value={moneyReceivedDraft.notes} /></label>
            </fieldset>
            <label className="advisor-close-day-money-verification"><input checked={moneyReceivedDraft.verified} onChange={(event) => setMoneyReceivedDraft((current) => ({ ...current, verified: event.target.checked }))} required type="checkbox" /><span><strong>I verified this receipt against the source record.</strong><small>The entry will be attributed to {model.advisor.name} and included in today’s audit trail.</small></span></label>
            <label className="advisor-close-day-receipt-option"><input checked={printMoneyReceiptAfterSave} onChange={(event) => setPrintMoneyReceiptAfterSave(event.target.checked)} type="checkbox" /><span><strong><Printer /> Prepare receipt after recording</strong><small>After the entry is saved to the daily report, use the receipt-ready print button to open a Time Motor Sales receipt.</small></span></label>
            {moneyEvidence.length ? <section className="advisor-close-day-money-history"><header><div><strong>Recorded today</strong><small>{moneyEvidence.length} receipt record(s)</small></div><b>{moneyReceivedValue}</b></header>{moneyEvidence.slice(0, 3).map((seed) => <article key={seed.id}><CheckCircle2 /><span><strong>{seed.title}</strong><small>{seed.detail.split("\n").slice(0, 3).join(" · ")}</small></span></article>)}</section> : null}
            <footer><button className="secondary" onClick={() => setMoneyDrawerOpen(false)} type="button">Cancel</button><button disabled={saving || !moneyReceivedDraft.verified || !moneyReceivedDraft.receivedFrom.trim() || Number(moneyReceivedDraft.amount) <= 0} type="submit"><Save /> {saving ? "Recording…" : "Record money received"}</button></footer>
          </form>
        </aside>
      </div> : null}

      {moneyReceiptToPrint ? <section aria-label="Printable money received receipt" className="advisor-money-receipt-print">
        <header>
          <TimeMotorSalesLogo className="advisor-money-receipt-logo" priority variant="horizontal" />
          <div>
            <strong>Time Motor Sales</strong>
            <span>Money Received Receipt</span>
          </div>
        </header>
        <div className="advisor-money-receipt-hero">
          <span>Amount received</span>
          <strong>{moneyReceiptToPrint.amount}</strong>
        </div>
        <dl>
          <div><dt>Received from</dt><dd>{moneyReceiptToPrint.receivedFrom}</dd></div>
          <div><dt>Payment method</dt><dd>{moneyReceiptToPrint.method}</dd></div>
          <div><dt>Applied to</dt><dd>{moneyReceiptToPrint.purpose}</dd></div>
          <div><dt>Received</dt><dd>{moneyReceiptToPrint.receivedAt}</dd></div>
          <div><dt>Reference</dt><dd>{moneyReceiptToPrint.reference || "Not provided"}</dd></div>
          <div><dt>Related record</dt><dd>{moneyReceiptToPrint.relatedRecord || "Not provided"}</dd></div>
          <div><dt>Business date</dt><dd>{moneyReceiptToPrint.businessDate}</dd></div>
          <div><dt>Workbook</dt><dd>{moneyReceiptToPrint.activeWorkbookLabel}</dd></div>
          <div><dt>Recorded by</dt><dd>{moneyReceiptToPrint.recordedBy}</dd></div>
          <div><dt>Recorded at</dt><dd>{moneyReceiptToPrint.recordedAt}</dd></div>
        </dl>
        {moneyReceiptToPrint.notes ? <section><h2>Notes</h2><p>{moneyReceiptToPrint.notes}</p></section> : null}
        <footer>
          <span>Customer copy</span>
          <span>Receipt ID: {moneyReceiptToPrint.id}</span>
        </footer>
      </section> : null}

      {closeoutOutcomeKind && activeCloseoutOutcomeConfig ? <div className="advisor-close-day-drawer-backdrop">
        <aside aria-labelledby="closeout-outcome-drawer-title" aria-modal="true" className="advisor-close-day-drawer advisor-close-day-outcome-drawer" role="dialog">
          <header>
            <div><span><ActiveCloseoutOutcomeIcon /></span><div><small>Today’s outcome</small><h2 id="closeout-outcome-drawer-title">{activeCloseoutOutcomeConfig.title}</h2><p>Add the essential details without leaving Close My Day.</p></div></div>
            <button aria-label={`Close ${activeCloseoutOutcomeConfig.label.toLocaleLowerCase()} form`} onClick={() => setCloseoutOutcomeKind(null)} type="button"><X /></button>
          </header>
          <form onSubmit={(event) => { event.preventDefault(); void saveCloseoutOutcome(); }}>
            <section className="advisor-close-day-drawer-summary">
              <div><small>Business date</small><strong>{parseBoardDate(model.boardDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong></div>
              <div><small>Workbook</small><strong>{activeWorkbookLabel}</strong></div>
              <div><small>Source workspace</small><Link href={scopedWorkbookHref(activeCloseoutOutcomeConfig.sourceHref)}>Open source</Link></div>
            </section>
            <fieldset>
              <legend>{activeCloseoutOutcomeConfig.label} details</legend>
              <div className="advisor-close-day-money-fields">
                {closeoutOutcomeKind === "SALE" ? <>
                  <label><span>Customer *</span><input aria-label="Sale customer" autoFocus maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Customer name" required value={closeoutOutcomeDraft.customer} /></label>
                  <label><span>Vehicle *</span><input aria-label="Sold vehicle" maxLength={140} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, vehicle: event.target.value }))} placeholder="Year, make, model, stock #, or VIN" required value={closeoutOutcomeDraft.vehicle} /></label>
                  <label className="amount"><span>Sale amount</span><div><b>$</b><input aria-label="Sale amount" inputMode="decimal" min="0" onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" step="0.01" type="number" value={closeoutOutcomeDraft.amount} /></div></label>
                  <label><span>Deal number</span><input aria-label="Sale deal number" maxLength={100} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Deal or reference number" value={closeoutOutcomeDraft.reference} /></label>
                  <label><span>Salesperson</span><input aria-label="Salesperson" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Staff member" value={closeoutOutcomeDraft.assignedTo} /></label>
                </> : null}
                {closeoutOutcomeKind === "REPAIR" ? <>
                  <label><span>Vehicle / repair order *</span><input aria-label="Repair vehicle or repair order" autoFocus maxLength={140} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, vehicle: event.target.value }))} placeholder="Vehicle, stock #, VIN, or RO" required value={closeoutOutcomeDraft.vehicle} /></label>
                  <label><span>Technician / vendor</span><input aria-label="Repair technician or vendor" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Who completed the work" value={closeoutOutcomeDraft.assignedTo} /></label>
                  <label className="wide"><span>Work completed *</span><textarea aria-label="Repair work completed" maxLength={500} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, details: event.target.value }))} placeholder="Briefly describe the completed repair." required rows={3} value={closeoutOutcomeDraft.details} /></label>
                  <label><span>Invoice / reference</span><input aria-label="Repair invoice or reference" maxLength={100} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Invoice or reference number" value={closeoutOutcomeDraft.reference} /></label>
                </> : null}
                {closeoutOutcomeKind === "DELIVERY" ? <>
                  <label><span>Customer / recipient *</span><input aria-label="Delivery customer or recipient" autoFocus maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Recipient name" required value={closeoutOutcomeDraft.customer} /></label>
                  <label><span>Vehicle *</span><input aria-label="Delivered vehicle" maxLength={140} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, vehicle: event.target.value }))} placeholder="Year, make, model, stock #, or VIN" required value={closeoutOutcomeDraft.vehicle} /></label>
                  <label><span>Odometer / reference</span><input aria-label="Delivery odometer or reference" maxLength={100} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Odometer, deal, or delivery reference" value={closeoutOutcomeDraft.reference} /></label>
                  <label><span>Delivered by</span><input aria-label="Delivered by" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Staff member" value={closeoutOutcomeDraft.assignedTo} /></label>
                </> : null}
                {closeoutOutcomeKind === "DROPOFF" ? <>
                  <label><span>Customer / source</span><input aria-label="Drop-off customer or source" autoFocus maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Customer, auction, transporter, or vendor" value={closeoutOutcomeDraft.customer} /></label>
                  <label><span>Vehicle *</span><input aria-label="Dropped off vehicle" maxLength={140} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, vehicle: event.target.value }))} placeholder="Year, make, model, stock #, or VIN" required value={closeoutOutcomeDraft.vehicle} /></label>
                  <label className="wide"><span>Drop-off reason *</span><textarea aria-label="Drop-off reason" maxLength={400} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, details: event.target.value }))} placeholder="Why the vehicle arrived and what should happen next." required rows={3} value={closeoutOutcomeDraft.details} /></label>
                  <label><span>Condition / reference</span><input aria-label="Drop-off condition or reference" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Condition, transporter, or intake reference" value={closeoutOutcomeDraft.reference} /></label>
                  <label><span>Assigned to</span><input aria-label="Drop-off assigned to" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Staff owner" value={closeoutOutcomeDraft.assignedTo} /></label>
                </> : null}
                {closeoutOutcomeKind === "FOLLOW_UP" ? <>
                  <label><span>Customer *</span><input aria-label="Follow-up customer" autoFocus maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Customer name" required value={closeoutOutcomeDraft.customer} /></label>
                  <label><span>Contact method *</span><select aria-label="Follow-up contact method" onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, channel: event.target.value as CloseoutOutcomeDraft["channel"] }))} value={closeoutOutcomeDraft.channel}><option value="CALL">Phone call</option><option value="SMS">Text message</option><option value="EMAIL">Email</option><option value="IN_PERSON">In person</option></select></label>
                  <label className="wide"><span>Outcome *</span><textarea aria-label="Follow-up outcome" maxLength={500} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, details: event.target.value }))} placeholder="What was discussed or resolved?" required rows={3} value={closeoutOutcomeDraft.details} /></label>
                  <label><span>Next action</span><input aria-label="Follow-up next action" maxLength={180} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, nextAction: event.target.value }))} placeholder="Next commitment or follow-up" value={closeoutOutcomeDraft.nextAction} /></label>
                  <label><span>Related record</span><input aria-label="Follow-up related record" maxLength={120} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Vehicle, deal, RO, or account" value={closeoutOutcomeDraft.reference} /></label>
                </> : null}
                <label><span>Date *</span><input aria-label="Outcome date" onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, eventDate: event.target.value }))} required type="date" value={closeoutOutcomeDraft.eventDate} /></label>
                <label><span>Time</span><input aria-label="Outcome time" onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, eventTime: event.target.value }))} type="time" value={closeoutOutcomeDraft.eventTime} /></label>
              </div>
              {closeoutOutcomeKind === "REPAIR" ? <label className="advisor-close-day-outcome-check"><input checked={closeoutOutcomeDraft.flag} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, flag: event.target.checked }))} type="checkbox" /><span>Final quality check completed</span></label> : null}
              {closeoutOutcomeKind === "DELIVERY" ? <label className="advisor-close-day-outcome-check"><input checked={closeoutOutcomeDraft.flag} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, flag: event.target.checked }))} type="checkbox" /><span>Keys and required documents confirmed</span></label> : null}
              {closeoutOutcomeKind === "FOLLOW_UP" ? <label className="advisor-close-day-outcome-check"><input checked={closeoutOutcomeDraft.flag} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, flag: event.target.checked }))} type="checkbox" /><span>Customer response or another follow-up is still required</span></label> : null}
              <label className="notes"><span>Notes</span><textarea aria-label="Outcome notes" maxLength={800} onChange={(event) => setCloseoutOutcomeDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for management and the daily report." rows={3} value={closeoutOutcomeDraft.notes} /></label>
            </fieldset>
            <footer><button className="secondary" onClick={() => setCloseoutOutcomeKind(null)} type="button">Cancel</button><button disabled={saving || !closeoutOutcomeReady} type="submit"><Save /> {saving ? "Saving…" : `Save ${activeCloseoutOutcomeConfig.label.toLocaleLowerCase()}`}</button></footer>
          </form>
        </aside>
      </div> : null}

      {closeStepNotice || workspaceNotice ? <p className="advisor-coo-close-step-notice" role="status">{closeStepNotice ?? workspaceNotice}</p> : null}
      {moneyReceiptToPrint ? <section className="advisor-close-day-receipt-ready" aria-live="polite">
        <span><Printer /><strong>Receipt ready</strong><small>{moneyReceiptToPrint.amount} from {moneyReceiptToPrint.receivedFrom}</small></span>
        <div><button onClick={() => printMoneyReceipt(moneyReceiptToPrint)} type="button"><Printer /> Print receipt</button><button className="secondary" onClick={() => setMoneyReceiptToPrint(null)} type="button">Dismiss</button></div>
      </section> : null}
      <footer className="advisor-close-day-actions"><Link href={scopedWorkbookHref("/vehicles/coo-workbook")}>Finish later</Link>{isClosed ? <button disabled={saving} onClick={() => void closeOrReopenDay()} type="button">{saving ? "Reopening…" : "Reopen day"}</button> : <button disabled={saving} onClick={openEndDayReview} type="button"><ShieldCheck /> Review final report</button>}</footer>
    </section>;
  }

  if (initialTool) {
    const toolLabels: Record<CooWorkbookTool, string> = {
      ACTION_PLAN: "Daily Action Plan",
      CARRYOVER: "Carryover",
      CHECKLIST: "Daily Checklist",
      DRAFTS: "Report Drafts",
      QUICK_UPDATE: "Quick Update",
      REPORT_SEEDS: "Report Seeds",
      STAFF_SUPPORT: "Staff Support",
      TO_DO_LIST: "To-Do List",
      BRING_FORWARD: "Bring Forward Work",
      CLOSE_MY_DAY: "Close My Day",
      PURCHASE_APPRAISAL_CAPTURE: "Purchase / Appraisal Capture",
      FOCUS_COMPASS: "Focus Compass",
      MORE_TOOLS: "More Tools"
    };

    return <section className={`advisor-panel advisor-coo-workbook advisor-coo-tool-page ${compact ? "compact" : "full"}`} id="coo-workbook-tool">
      <header className="advisor-coo-tool-page-header">
        <div>
          <Link href={scopedWorkbookHref("/vehicles/coo-workbook")}>← {activeWorkbookLabel}</Link>
          <strong>{toolLabels[initialTool]}</strong>
          <span>{activeWorkbookLabel} focused workspace. Finish the action here, then return to the landing page.</span>
        </div>
      </header>

      <WorkbookAppointmentFlow date={model.boardDate} workbook={activeWorkbook} pendingWork={dailyPursePendingWork} generating={saving} onGenerateReport={() => generateReportDraft("DAILY")} />
      {initialTool === "CHECKLIST" ? <section className="advisor-coo-daily-checklist advisor-coo-focused-tool" aria-label="Daily Checklist tool">
        <header><div><strong>{activeWorkbookLabel} Daily Checklist</strong><small>Track hot leads, prospects, customer follow-ups, and same-day operating work. Convert any item that needs formal tracking.</small></div><span>{checklistRollup.done}/{checklistItems.length} done</span></header>
        <div className="advisor-coo-inline-form">
          <input aria-label="Add Daily Checklist item" onChange={(event) => setChecklistText(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addChecklistItem();
            }
          }} placeholder="Add something to do today..." value={checklistText} />
          <button disabled={saving || isClosed || !checklistText.trim()} onClick={() => void addChecklistItem()} type="button"><Plus /> Add</button>
        </div>
        <div className="advisor-coo-checklist-items">
          {checklistItems.length ? checklistItems.map((item) => <div className={`advisor-coo-checklist-item ${item.status.toLocaleLowerCase()} ${item.done ? "done" : ""}`} id={`source-${item.id}`} key={item.id}>
            <CrmContactImport disabled={isClosed} sourceId={item.id} sourceKind="Daily Checklist" sourceText={[item.text,item.update].filter(Boolean).join(". ")} followUpDate={item.reminderDate ?? ""} />
            <button aria-label={`Mark ${item.text} ${item.done ? "not done" : "done"}`} className="advisor-coo-check" disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { done: !item.done, status: !item.done ? "GREEN" : item.status })} type="button"><CheckSquare /></button>
            <div>
              <div className="advisor-coo-checklist-title-row">
                <input aria-label={`Checklist item for ${item.text}`} disabled={isClosed} onChange={(event) => updateChecklistTextDraft(item.id, event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveChecklistText(item);
                  }
                }} value={checklistTextDrafts[item.id] ?? item.text} />
                <button disabled={isClosed || !(checklistTextDrafts[item.id] ?? item.text).trim() || (checklistTextDrafts[item.id] ?? item.text).trim() === item.text} onClick={() => void saveChecklistText(item)} type="button">Save item</button>
              </div>
              <small>{checklistStatusLabel(item)} · Added {dateLabel(item.createdAt)}</small>
              {checklistUpdateHistory(item).length ? <div className="advisor-coo-checklist-update-history" aria-label={`Saved updates for ${item.text}`}>
                {checklistUpdateHistory(item).slice().reverse().map((update, index) => <small key={`${item.id}-update-${index}`}>
                  <span>{update.at ? dateLabel(update.at) : "Saved update"}</span>
                  {update.text}
                </small>)}
              </div> : null}
              <div className="advisor-coo-checklist-update-row">
                <input aria-label={`Update for ${item.text}`} disabled={isClosed} onChange={(event) => updateChecklistDraft(item.id, event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveChecklistUpdate(item);
                  }
                }} placeholder={item.update ? "Add another update..." : "Add update..."} value={checklistUpdateDrafts[item.id] ?? ""} />
                <button disabled={isClosed || !(checklistUpdateDrafts[item.id] ?? "").trim()} onClick={() => void saveChecklistUpdate(item)} type="button">Save update</button>
              </div>
            </div>
            <select aria-label={`Status for ${item.text}`} className={`advisor-coo-checklist-status ${item.status.toLocaleLowerCase()}`} disabled={isClosed} onChange={(event) => void persistChecklistItem(item.id, { status: event.target.value as DailyChecklistStatus, done: event.target.value === "GREEN" ? item.done : false })} value={item.status}>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("checklist", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert"}</button>}
            <ChecklistReminderField key={`${item.id}:${item.reminderDate ?? ""}`} value={item.reminderDate ?? ""} disabled={isClosed} title={item.text} onSave={date => persistChecklistItem(item.id, { reminderDate: date })} />
          </div>) : <p><ListChecks /> Add a quick list of what needs to get done today.</p>}
        </div>
      </section> : null}

      {initialTool === "TO_DO_LIST" ? <section className="advisor-coo-focused-tool advisor-coo-todo-list" aria-label="To-Do List tool">
        <header><div><strong>{activeWorkbookLabel} To-Do List</strong><small>Use the checklist for hot leads, prospects, customer follow-ups, and light same-day work. Convert only the items that need formal ownership, due dates, and tracking.</small></div><span>{checklistRollup.open} open</span></header>
        <div className="advisor-coo-inline-form">
          <input aria-label="Add To-Do item" onChange={(event) => setChecklistText(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addChecklistItem();
            }
          }} placeholder="Add a light to-do for today..." value={checklistText} />
          <button disabled={saving || isClosed || !checklistText.trim()} onClick={() => void addChecklistItem()} type="button"><Plus /> Add To-Do</button>
        </div>
        <div className="advisor-coo-checklist-items">
          {checklistItems.length ? checklistItems.map((item) => <div className={`advisor-coo-checklist-item ${item.status.toLocaleLowerCase()} ${item.done ? "done" : ""}`} id={`source-${item.id}`} key={item.id}>
            <CrmContactImport disabled={isClosed} sourceId={item.id} sourceKind="Daily Checklist" sourceText={[item.text,item.update].filter(Boolean).join(". ")} followUpDate={item.reminderDate ?? ""} />
            <button aria-label={`Mark ${item.text} ${item.done ? "not done" : "done"}`} className="advisor-coo-check" disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { done: !item.done, status: !item.done ? "GREEN" : item.status })} type="button"><CheckSquare /></button>
            <div>
              <div className="advisor-coo-checklist-title-row">
                <input aria-label={`To-Do item for ${item.text}`} disabled={isClosed} onChange={(event) => updateChecklistTextDraft(item.id, event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveChecklistText(item);
                  }
                }} value={checklistTextDrafts[item.id] ?? item.text} />
                <button disabled={isClosed || !(checklistTextDrafts[item.id] ?? item.text).trim() || (checklistTextDrafts[item.id] ?? item.text).trim() === item.text} onClick={() => void saveChecklistText(item)} type="button">Save item</button>
              </div>
              <small>{checklistStatusLabel(item)} · Checklist-powered to-do</small>
              {checklistUpdateHistory(item).length ? <div className="advisor-coo-checklist-update-history" aria-label={`Saved updates for ${item.text}`}>
                {checklistUpdateHistory(item).slice().reverse().map((update, index) => <small key={`${item.id}-todo-update-${index}`}>
                  <span>{update.at ? dateLabel(update.at) : "Saved update"}</span>
                  {update.text}
                </small>)}
              </div> : null}
              <div className="advisor-coo-checklist-update-row">
                <input aria-label={`To-Do update for ${item.text}`} disabled={isClosed} onChange={(event) => updateChecklistDraft(item.id, event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveChecklistUpdate(item);
                  }
                }} placeholder={item.update ? "Add another update..." : "Add update..."} value={checklistUpdateDrafts[item.id] ?? ""} />
                <button disabled={isClosed || !(checklistUpdateDrafts[item.id] ?? "").trim()} onClick={() => void saveChecklistUpdate(item)} type="button">Save update</button>
              </div>
            </div>
            <select aria-label={`To-Do status for ${item.text}`} className={`advisor-coo-checklist-status ${item.status.toLocaleLowerCase()}`} disabled={isClosed} onChange={(event) => void persistChecklistItem(item.id, { status: event.target.value as DailyChecklistStatus, done: event.target.value === "GREEN" ? item.done : false })} value={item.status}>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("checklist", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert"}</button>}
            <ChecklistReminderField key={`${item.id}:${item.reminderDate ?? ""}`} value={item.reminderDate ?? ""} disabled={isClosed} title={item.text} onSave={date => persistChecklistItem(item.id, { reminderDate: date })} />
          </div>) : <p><ListChecks /> Add a quick list of what needs to get done today.</p>}
        </div>
        <div className="advisor-coo-close-flow">
          <span><ListChecks /><strong>Simple list</strong><small>Add light daily work in Daily Checklist</small></span>
          <span><CheckSquare /><strong>Mark progress</strong><small>Done, green, yellow, red, or carryover</small></span>
          <span><ClipboardList /><strong>Formal task</strong><small>Create a tracked task only when needed</small></span>
        </div>
        <div className="advisor-coo-action-plan">
          <article>
            <h2>Light To-Do</h2>
            <p>Open the checklist tool to add quick same-day items without turning everything into paperwork.</p>
            <Link href={scopedWorkbookHref("/vehicles/coo-workbook/checklist")}>Open Daily Checklist</Link>
          </article>
          <article>
            <h2>Formal Task</h2>
            <p>Use this when the item needs an assignee, due date, approval trail, or manager follow-up.</p>
            <Link href="/tasks?returnTo=/vehicles/coo-workbook">Open Tasks</Link>
          </article>
        </div>
      </section> : null}

      {initialTool === "QUICK_UPDATE" ? <section className="advisor-coo-quick-update advisor-coo-focused-tool" aria-label="Quick Update tool">
        <header><div><strong>{activeWorkbookLabel} Quick Update</strong><small>Capture unplanned events, visitors, facility issues, or anything worth remembering.</small></div><span>{quickUpdateIntelligence.highImpactCount} high impact · {quickUpdateIntelligence.reportWorthyCount} report-worthy</span></header>
        <p className="advisor-coo-close-step-notice">{quickUpdateIntelligence.staffGuidance}</p>
        <textarea aria-label="Quick Update details" disabled={isClosed} onChange={(event) => setQuickUpdateText(event.target.value)} placeholder="Example: AJ checked the roof today and may fix it in the next few weeks." value={quickUpdateText} />
        <div className="advisor-coo-quick-fields">
          <select aria-label="Quick Update category" disabled={isClosed} onChange={(event) => setQuickUpdateCategory(event.target.value as QuickUpdateCategory)} value={quickUpdateCategory}>
            {quickUpdateCategoryGroups.map((group) => <optgroup key={group} label={group}>
              {quickUpdateCategories.filter((option) => option.group === group).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>)}
          </select>
          <input aria-label="Person involved" disabled={isClosed} onChange={(event) => { setQuickUpdatePerson(event.target.value); setQuickUpdateCustomerId(null); }} placeholder="Person" value={quickUpdatePerson} />
          <input aria-label="Phone number" disabled={isClosed} inputMode="tel" onChange={(event) => { setQuickUpdatePhone(event.target.value); setQuickUpdateCustomerId(null); }} placeholder="Phone number" value={quickUpdatePhone} />
          <input aria-label="Company or outside party" disabled={isClosed} onChange={(event) => { setQuickUpdateCompany(event.target.value); setQuickUpdateCustomerId(null); }} placeholder="Company / outside party" value={quickUpdateCompany} />
          <QuickUpdateContext company={quickUpdateCompany} disabled={isClosed} onCustomerSelected={setQuickUpdateCustomerId} person={quickUpdatePerson} phoneNumber={quickUpdatePhone} relatedCustomerId={quickUpdateCustomerId} text={quickUpdateText} />
        </div>
        <div className="advisor-coo-followup-row">
          <label><input checked={quickUpdateFollowUp} disabled={isClosed} onChange={(event) => setQuickUpdateFollowUp(event.target.checked)} type="checkbox" /> Follow-up needed</label>
          <input aria-label="Follow-up date" disabled={isClosed || !quickUpdateFollowUp} min={model.boardDate} onChange={(event) => setQuickUpdateDueWindow(event.target.value)} type="date" value={quickUpdateDueWindow} />
          <button disabled={saving || isClosed || !quickUpdateText.trim()} onClick={() => void addQuickUpdate()} type="button"><Save /> {saving ? "Saving..." : "Save update"}</button>
        </div>
        {quickUpdateSaveNotice ? <p className="advisor-coo-workspace-notice" role="status">{quickUpdateSaveNotice}</p> : null}
        <div className="advisor-coo-update-list">
          {quickUpdates.length ? quickUpdates.map((item) => <article id={`source-${item.id}`} key={item.id}>
            <span><strong>{quickUpdateCategoryLabel(item.category)}</strong>{" · "}<small>{dateLabel(item.createdAt)}</small></span>
            <QuickUpdateEditor item={item} categories={quickUpdateCategories} disabled={isClosed} onSaved={refreshActiveWorkbook} />
            <QuickUpdateContext company={item.company} disabled={isClosed} onLinked={refreshActiveWorkbook} person={item.person} phoneNumber={item.phoneNumber} relatedCustomerId={item.relatedCustomerId} text={item.text} updateId={item.id} />
            <CrmContactImport disabled={isClosed} sourceId={item.id} sourceKind="Quick Update" sourceText={item.text} person={item.person} phoneNumber={item.phoneNumber} company={item.company} followUpDate={item.followUpNeeded ? item.dueWindow : ""} />
            <p>{item.text}</p>
            <Link className="advisor-coo-capture-link" href={`/capture?destination=QUICK_UPDATE&kind=PHOTO&ownerId=${encodeURIComponent(item.id)}&reference=${encodeURIComponent(`Quick Update ${item.id}`)}&returnTo=%2Fvehicles%2Fcoo-workbook%2Fquick-update`} rel="noopener noreferrer" target="_blank"><Camera /> Scan / photo</Link>
            <Link className="advisor-coo-capture-link" href={`/documents?ownerId=${encodeURIComponent(item.id)}#smart-intake`} rel="noopener noreferrer" target="_blank"><FileText /> View scans</Link>
            {item.intelligence ? <small>{item.intelligence.signalLabel} · impact {item.intelligence.impactScore}/100 · {item.intelligence.confidence.toLocaleLowerCase()} confidence · {item.intelligence.recommendedAction}</small> : null}
            <small>{[item.person, item.phoneNumber, item.company, item.followUpNeeded ? `Follow-up: ${item.dueWindow || "needed"}` : "", item.carryoverReady ? "Carryover ready" : ""].filter(Boolean).join(" · ") || "No extra details"}</small>
            {item.followUpNeeded && /^\d{4}-\d{2}-\d{2}$/.test(item.dueWindow) ? <Link href={`/appointments?section=today&localDate=${encodeURIComponent(item.dueWindow)}`}>Open daily schedule · {item.dueWindow}</Link> : null}
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistQuickUpdate(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("quick", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert to task"}</button>}
          </article>) : <p><MessageSquareText /> No Quick Updates captured yet.</p>}
        </div>
      </section> : null}

      {initialTool === "ACTION_PLAN" ? <section className="advisor-coo-focused-tool advisor-coo-action-plan" aria-label="Daily Action Plan tool">
        <header>
          <div><strong>Daily Action Plan Review</strong><small>Design and save draft action plans for today or a future day. Staff can work from this space before deciding whether anything becomes a formal task.</small></div>
          <span>{reviewActionPlanRollup.plans} plans · {reviewActionPlanRollup.done}/{reviewActionPlanRollup.steps} steps</span>
        </header>
        <div className="advisor-action-planner-shell">
          <section className="advisor-action-plan-composer" aria-label="Add review action plan">
            <input aria-label="Action plan title" onChange={(event) => setActionPlanTitle(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && actionPlanTitle.trim()) {
                event.preventDefault();
                addReviewActionPlan();
              }
            }} placeholder="Action plan name..." value={actionPlanTitle} />
            <input aria-label="Action plan outcome" onChange={(event) => setActionPlanOutcome(event.target.value)} placeholder="Target outcome..." value={actionPlanOutcome} />
            <input aria-label="Action plan owner" onChange={(event) => setActionPlanOwner(event.target.value)} placeholder="Owner..." value={actionPlanOwner} />
            <input aria-label="Action plan date" onChange={(event) => setActionPlanDate(event.target.value)} type="date" value={actionPlanDate} />
            <select aria-label="Action plan priority" onChange={(event) => setActionPlanPriority(event.target.value as DailyFocusPriority)} value={actionPlanPriority}>{focusPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <input aria-label="First action plan subtask" onChange={(event) => setFirstActionStep(event.target.value)} placeholder="First subtask..." value={firstActionStep} />
            <button disabled={!actionPlanTitle.trim()} onClick={addReviewActionPlan} type="button"><Save /> Save Draft</button>
          </section>

          <section className="advisor-action-plan-review-grid" aria-label="Draft action plans for review">
            {reviewActionPlans.length ? reviewActionPlans.map((plan) => {
              const summary = countReviewActionSteps(plan.steps);
              const rootDraftKey = `${plan.id}:root`;
              const planCommentDraftKey = `plan:${plan.id}`;
              const planDate = reviewActionPlanDate(plan, model.boardDate);
              const isFuturePlan = planDate !== model.boardDate;
              const expanded = Boolean(expandedReviewPlanIds[plan.id]);
              const feedback = reviewPlanFeedback[plan.id];
              return <article className={`advisor-action-plan-review-card ${plan.status.toLocaleLowerCase()} ${expanded ? "expanded" : "collapsed"}`} key={plan.id}>
                <div className="advisor-action-plan-summary">
                  <button aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${plan.title}`} onClick={() => setExpandedReviewPlanIds((items) => ({ ...items, [plan.id]: !expanded }))} type="button"><ChevronDown /></button>
                  <span>
                    <strong>{plan.title || "Untitled action plan"}</strong>
                    <small>{planDate} · {plan.status.toLocaleLowerCase()} · {summary.done}/{summary.total} steps · {plan.owner || "No owner"}{plan.comments.length ? ` · ${plan.comments.length} update${plan.comments.length === 1 ? "" : "s"}` : ""}</small>
                  </span>
                  <em>{plan.implementedAt ? "Implemented" : plan.priority.toLocaleLowerCase()}</em>
                  {feedback ? <b className={`advisor-action-feedback ${feedback.tone}`}>{feedback.message} · {timeLabel(feedback.at)}</b> : <b className="advisor-action-feedback saved">Saved · {timeLabel(plan.lastSavedAt)}</b>}
                  <button onClick={() => saveReviewActionPlanDraft(plan.id)} type="button"><Save /> Save</button>
                  <button onClick={() => workReviewActionPlan(plan.id)} type="button"><ClipboardCheck /> Work</button>
                </div>
                {expanded ? <>
                  <header>
                    <div>
                      <input aria-label={`Action plan title ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { title: event.target.value })} value={plan.title} />
                      <small>{summary.done}/{summary.total} steps · {plan.priority.toLocaleLowerCase()} priority · {plan.status.toLocaleLowerCase()} · saved {plan.lastSavedAt ? dateLabel(plan.lastSavedAt) : "as draft"}</small>
                    </div>
                    <select aria-label={`Status for ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { status: event.target.value as ReviewActionPlanStatus })} value={plan.status}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Working</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </header>
                  <div className="advisor-action-plan-fields">
                    <input aria-label={`Outcome for ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { outcome: event.target.value })} placeholder="Outcome" value={plan.outcome} />
                    <input aria-label={`Owner for ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { owner: event.target.value })} placeholder="Owner" value={plan.owner} />
                    <input aria-label={`Plan date for ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { planDate: event.target.value })} type="date" value={planDate} />
                    <select aria-label={`Priority for ${plan.title}`} onChange={(event) => updateReviewActionPlan(plan.id, { priority: event.target.value as DailyFocusPriority })} value={plan.priority}>{focusPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  </div>
                  <div className="advisor-action-review-row">
                    <button aria-pressed={Boolean(plan.implementedAt)} className={plan.implementedAt ? "implemented" : ""} onClick={() => markReviewActionPlanImplemented(plan.id, !plan.implementedAt)} type="button"><CheckSquare /> {plan.implementedAt ? "Implemented" : "Mark Implemented"}</button>
                    <small>{plan.implementedAt ? `Implemented ${dateLabel(plan.implementedAt)}` : "Staff can work and close this plan here without creating a task."}</small>
                  </div>
                  <div className="advisor-action-comments">
                    {plan.comments.length ? <div className="advisor-action-comment-list">{plan.comments.map((comment, index) => <small key={`${plan.id}-comment-${index}`}>{comment}</small>)}</div> : null}
                    <div className="advisor-action-comment-entry">
                      <input aria-label={`Update for action plan ${plan.title}`} onChange={(event) => setActionCommentDrafts((drafts) => ({ ...drafts, [planCommentDraftKey]: event.target.value }))} onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addReviewActionPlanComment(plan.id);
                        }
                      }} placeholder="Add plan comment/update..." value={actionCommentDrafts[planCommentDraftKey] ?? ""} />
                      <button disabled={!(actionCommentDrafts[planCommentDraftKey] ?? "").trim()} onClick={() => addReviewActionPlanComment(plan.id)} type="button"><MessageSquareText /> Save update</button>
                    </div>
                  </div>
                  <div className="advisor-action-step-add root">
                    <input aria-label={`Add subtask to ${plan.title}`} onChange={(event) => setActionStepDrafts((drafts) => ({ ...drafts, [rootDraftKey]: event.target.value }))} onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addReviewActionStep(plan.id);
                      }
                    }} placeholder="Add subtask..." value={actionStepDrafts[rootDraftKey] ?? ""} />
                    <button disabled={!(actionStepDrafts[rootDraftKey] ?? "").trim()} onClick={() => addReviewActionStep(plan.id)} type="button"><Plus /> Subtask</button>
                  </div>
                  <div className="advisor-action-step-list">
                    {plan.steps.length ? plan.steps.map((step) => renderReviewActionStep(plan.id, step)) : <p><ListChecks /> Add subtasks only where they help clarify the plan.</p>}
                  </div>
                  <footer>
                    <button onClick={() => saveReviewActionPlanDraft(plan.id)} type="button"><Save /> Save Draft</button>
                    <button onClick={() => workReviewActionPlan(plan.id)} type="button"><ClipboardCheck /> Work Here</button>
                    <button className="advisor-action-promote" disabled={saving || isClosed || isFuturePlan} onClick={() => void promoteReviewActionPlan(plan)} title={isFuturePlan ? "Future-day plans can stay saved here or become a future-dated task." : undefined} type="button"><CheckCircle2 /> Promote to Focus</button>
                    <Link href={cooTaskIntakeHref({ brief: [plan.outcome, `Owner: ${plan.owner || "TBD"}`, `Plan date: ${planDate}`, `Draft steps: ${summary.total}`].filter(Boolean).join("\n"), dueAt: `${planDate}T17:00:00`, expectedOutcome: plan.outcome || `${plan.title} is completed with clear next actions and review notes.`, returnTo: scopedWorkbookHref("/vehicles/coo-workbook/action-plan"), title: plan.title })}>Create Task</Link>
                    <button onClick={() => deleteReviewActionPlan(plan.id)} type="button"><X /> Remove</button>
                  </footer>
                </> : null}
              </article>;
            }) : <p className="advisor-action-empty"><ClipboardList /> Save the first draft action plan above. It will stay in this workspace for the selected date until staff work it here, promote it, or create a formal task.</p>}
          </section>
          <section className="advisor-action-signal-strip" aria-label="Suggested operating signals">
            <header><strong>Operating Signals</strong><small>Optional starting points from today’s workbook intelligence.</small></header>
            <div>
              {attentionItems.length ? attentionItems.slice(0, 6).map((item) => <article key={item.id}>
                <h2>{item.title}</h2>
                <p>{item.context}</p>
                <Link href={scopedWorkbookHref(item.href)}>{item.action}</Link>
              </article>) : <p><CheckCircle2 /> No urgent operating actions are waiting.</p>}
            </div>
          </section>
        </div>
        <Link className="advisor-coo-primary-link" href={planTaskHref}>Create overall action plan task</Link>
      </section> : null}

      {initialTool === "CARRYOVER" ? <section className="advisor-coo-focused-tool advisor-coo-carryover-center" aria-label="Carryover tool">
        <header><div><strong>Carryover</strong><small>Tomorrow-facing items pulled from checklist, Quick Updates, and reviewed Report Seeds.</small></div><button disabled={saving || isClosed} onClick={() => void prepareCarryovers()} type="button"><CalendarClock /> Prepare Carryover</button></header>
        <p className="advisor-coo-tool-guidance">Confirm keeps it as tomorrow context. Convert to task gives it an owner, due time, checklist, comments, and status tracking. Dismiss removes items that do not need follow-up.</p>
        <div>{carryovers.length ? carryovers.map((item) => <article key={item.id}><small>{item.targetBoardDate} · {item.status.toLocaleLowerCase()}</small><strong>{item.title}</strong><span>{item.detail}</span><div className="advisor-coo-seed-actions"><button disabled={saving || isClosed || item.status === "CONFIRMED"} onClick={() => void persistCarryover(item.id, { status: "CONFIRMED" })} type="button">Confirm</button><button disabled={saving || isClosed || item.status === "DISMISSED"} onClick={() => void persistCarryover(item.id, { status: "DISMISSED", dismissedReason: `Dismissed from ${activeWorkbookLabel}.` })} type="button">Dismiss</button>{item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={saving || isClosed || convertingId === item.id} onClick={() => void convertCarryoverToTask(item)} type="button">{convertingId === item.id ? "Converting..." : "Convert to task"}</button>}</div></article>) : carryoverPreview.length ? carryoverPreview.map((item) => <article key={item.id}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.detail}</span></article>) : <p><CheckCircle2 /> No carryover items are marked yet.</p>}</div>
      </section> : null}

      {initialTool === "REPORT_SEEDS" ? <section className="advisor-coo-focused-tool advisor-coo-report-seeds" aria-label="Report Seeds tool">
        <header><div><strong>Report Seeds</strong><small>Review, include, exclude, edit, or carry over source-backed report material.</small></div><span>{reportSeedRollup.reviewed}/{reportSeedRollup.total} reviewed</span></header>
        <div>{reportSeeds.length ? reportSeeds.map((seed) => <article className={seed.tone.toLocaleLowerCase()} id={`report-seed-${seed.id}`} key={seed.id}>
          <span><strong>{seed.title}</strong><small>{reportSeedSourceLabel(seed)} · {reportSeedStatusLabel(seed.status)}</small></span>
          <div className="advisor-coo-seed-actions">
            {seed.sourceHref ? <Link href={seed.sourceHref}>Open source</Link> : null}
            <button aria-pressed={seed.status === "INCLUDED"} disabled={isClosed} onClick={() => void persistReportSeed(seed.id, { status: "INCLUDED" })} type="button">Include</button>
            <button aria-pressed={seed.status === "EXCLUDED"} disabled={isClosed} onClick={() => void persistReportSeed(seed.id, { status: "EXCLUDED" })} type="button">Exclude</button>
            <button aria-pressed={seed.status === "CARRIED_OVER"} disabled={isClosed} onClick={() => void persistReportSeed(seed.id, { status: "CARRIED_OVER" })} type="button">Carry over</button>
          </div>
          <input aria-label={`Report Seed title for ${seed.title}`} disabled={isClosed} onBlur={() => void persistReportSeed(seed.id, { title: seed.title })} onChange={(event) => updateReportSeed(seed.id, { title: event.target.value })} value={seed.title} />
          <textarea aria-label={`Report Seed detail for ${seed.title}`} disabled={isClosed} onBlur={() => void persistReportSeed(seed.id, { detail: seed.detail })} onChange={(event) => updateReportSeed(seed.id, { detail: event.target.value })} value={seed.detail} />
          <input aria-label={`Review note for ${seed.title}`} disabled={isClosed} onBlur={() => void persistReportSeed(seed.id, { reviewNote: seed.reviewNote })} onChange={(event) => updateReportSeed(seed.id, { reviewNote: event.target.value })} placeholder="Optional review note..." value={seed.reviewNote} />
        </article>) : <p><FileText /> No report seeds yet. Work the day, then generate the report trail.</p>}</div>
      </section> : null}

      {initialTool === "STAFF_SUPPORT" ? <section className="advisor-coo-focused-tool advisor-coo-staff-visibility" aria-label="Staff Support tool">
        <header><div><strong>Staff Support</strong><small>Summary-first visibility for coaching, help, and daily accountability.</small></div><span>{staffTodayRollup.total} active</span></header>
        <div className="advisor-coo-followup-row"><input aria-label="Staff support note" onChange={(event) => setSupportNote(event.target.value)} placeholder="Add coaching/support note..." value={supportNote} /><label><input checked={supportUpdateRequested} onChange={(event) => setSupportUpdateRequested(event.target.checked)} type="checkbox" /> Request update</label></div>
        <div>{staffSupportQueue.length ? staffSupportQueue.map((item) => <article key={item.workbookId}><span><strong>{item.staffName}</strong><small>{item.closeReadinessScore}/100 · {item.closeReadinessTone.toLocaleLowerCase()}</small></span><p>{item.closeReadinessPrompts[0] ?? "Ready for daily close review."}</p><button disabled={saving || !supportNote.trim()} onClick={() => void addStaffSupportAction(item.workbookId)} type="button">Save support</button></article>) : <p><CheckCircle2 /> Staff workbooks are clear for now.</p>}</div>
        {supportActions.length ? <div className="advisor-coo-update-list">{supportActions.map((item) => <article key={item.id}><span><strong>{item.status.toLocaleLowerCase().replaceAll("_", " ")}</strong><small>{dateLabel(item.createdAt)}</small></span><p>{item.note}</p><button disabled={saving || item.status === "RESOLVED"} onClick={() => void persistSupportAction(item.id, { status: "RESOLVED" })} type="button">Mark resolved</button></article>)}</div> : null}
      </section> : null}

      {initialTool === "DRAFTS" ? <section className="advisor-coo-focused-tool advisor-coo-report-draft" aria-label="Report Drafts tool">
        <header><div><strong>Report Drafts</strong><small>Generate manager-ready daily, weekly, or monthly summaries from reviewed seeds and operating signals.</small></div><div className="advisor-coo-seed-actions"><button disabled={saving || isClosed} onClick={() => void generateReportDraft("DAILY")} type="button">Daily</button><button disabled={saving || isClosed} onClick={() => void generateReportDraft("WEEKLY")} type="button">Weekly</button><button disabled={saving || isClosed} onClick={() => void generateReportDraft("MONTHLY")} type="button">Monthly</button></div></header>
        {latestReportDraft ? <div className="advisor-coo-saved-draft">
          <header><strong>{latestReportDraft.title}</strong><small>{latestReportDraft.cadence.toLocaleLowerCase()} · Version {latestReportDraft.version} · Generated {dateLabel(latestReportDraft.generatedAt)}</small><button onClick={() => void copyReportDraft()} type="button"><Copy /> Copy Draft</button></header>
          <p>{latestReportDraft.summary}</p>
          <div>{latestReportDraft.sections.map((section) => <article key={section.title}><h2>{section.title}</h2>{section.items.map((item) => <span key={`${section.title}-${item.sourceId}-${item.title}`}><strong>{item.title}</strong><small>{item.detail}</small></span>)}</article>)}</div>
        </div> : <p>Review report seeds, then generate a manager-ready daily draft.</p>}
        {staffWorkbookSummaries.length ? <section className="advisor-coo-staff-reports" aria-label="Staff Reports">
          <header><div><strong>Staff Reports</strong><small>Read the latest staff workbook drafts for this workday.</small></div><span>{staffWorkbookSummaries.filter((item) => item.latestReportDraft).length}/{staffWorkbookSummaries.length} drafted</span></header>
          <div>
            {staffWorkbookSummaries.map((item) => <article className={item.latestReportDraft ? "ready" : item.closeReadinessTone.toLocaleLowerCase()} key={item.workbookId}>
              <header><div><strong>{item.staffName}</strong><small>{item.closeReadinessScore}/100 · {item.closeReadinessTone.toLocaleLowerCase()} · {item.completedDailyFocusCount}/{item.dailyFocusCount} focus done</small></div><span>{item.latestReportDraft ? `v${item.latestReportDraft.version}` : "No draft"}</span></header>
              {item.latestReportDraft ? <>
                <p>{item.latestReportDraft.summary}</p>
                <details>
                  <summary>Read report</summary>
                  <div>{item.latestReportDraft.sections.map((section) => <section key={`${item.workbookId}-${section.title}`}><h3>{section.title}</h3>{section.items.map((draftItem) => <span key={`${item.workbookId}-${section.title}-${draftItem.sourceId}-${draftItem.title}`}><strong>{draftItem.title}</strong><small>{draftItem.detail}</small></span>)}</section>)}</div>
                </details>
                <button onClick={() => void copyReportDraft(item.latestReportDraft ?? undefined)} type="button"><Copy /> Copy</button>
              </> : <p>{item.closeReadinessPrompts[0] ?? "No staff report has been generated yet."}</p>}
            </article>)}
          </div>
        </section> : null}
      </section> : null}

      {initialTool === "BRING_FORWARD" ? <section className="advisor-coo-focused-tool advisor-coo-bring-forward" aria-label="Bring Forward Work tool">
        <header><div><strong>Bring Forward Work</strong><small>Search unfinished prior work and add the right item back into today&apos;s focus, checklist, or action plan.</small></div><span>{bringForwardCandidates.length} available</span></header>
        <div className="advisor-coo-bring-forward-controls">
          <label className="advisor-coo-search-box"><Search /><input aria-label="Search prior unfinished work" onChange={(event) => setBringForwardSearch(event.target.value)} placeholder="Search customer, vehicle, task, update, source date..." type="search" value={bringForwardSearch} /></label>
          <select aria-label="Filter prior work source" onChange={(event) => setBringForwardType(event.target.value as BringForwardCandidate["sourceType"] | "ALL")} value={bringForwardType}>
            <option value="ALL">All prior work</option>
            <option value="DAILY_FOCUS">Daily Focus</option>
            <option value="CHECKLIST_ITEM">Checklist</option>
            <option value="QUICK_UPDATE">Quick Update</option>
            <option value="CARRYOVER">Carryover</option>
          </select>
        </div>
        <div className="advisor-coo-bring-forward-list">
          {filteredBringForwardCandidates.length ? filteredBringForwardCandidates.map((item) => <article className={item.riskLevel.toLocaleLowerCase()} key={item.id}>
            <div>
              <small>{item.sourceBoardDate} · {bringForwardSourceLabel(item.sourceType)} · recommended: {item.recommendedTarget.toLocaleLowerCase().replace("_", " ")}</small>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <Link href={scopedWorkbookHref(item.sourceHref)}>Open original source</Link>
            </div>
            <div className="advisor-coo-seed-actions">
              <button disabled={saving || isClosed} onClick={() => void bringForwardItem(item, "FOCUS")} type="button"><Plus /> Today&apos;s Focus</button>
              <button disabled={saving || isClosed} onClick={() => void bringForwardItem(item, "ACTION_PLAN")} type="button"><ClipboardCheck /> Action Plan</button>
              <button disabled={saving || isClosed} onClick={() => void bringForwardItem(item, "CHECKLIST")} type="button"><CheckSquare /> Checklist</button>
            </div>
          </article>) : <p><CheckCircle2 /> No matching unfinished prior work is available to bring forward.</p>}
        </div>
      </section> : null}

      {initialTool === "PURCHASE_APPRAISAL_CAPTURE" ? <section className="advisor-coo-focused-tool advisor-coo-purchase-capture" aria-label="Purchase / Appraisal Capture tool">
        <header>
          <div><strong>TAI Purchase Assist</strong><small>Capture only the proof needed for a purchase, appraisal, trade-in, or wholesale review. This stays review-only until a manager approves adoption.</small></div>
          <span>Review only</span>
        </header>
        <div className="advisor-coo-purchase-hero">
          <div>
            <small>PHONE CAPTURE WORKFLOW</small>
            <h2>Build the buy/appraisal packet in one pass</h2>
            <p>Use a phone camera for VIN, odometer, condition, title or auction documents, seller/source proof, and pricing evidence. TAI can analyze the packet, but saved customers, inventory, estimates, quotes, and invoices are not changed from this review screen.</p>
          </div>
          <dl>
            <div><dt>Vehicle</dt><dd>VIN, plate, stock tag, keys</dd></div>
            <div><dt>Value</dt><dd>Bid, trade number, recon reserve</dd></div>
            <div><dt>Decision</dt><dd>Buy, hold, pass, manager review</dd></div>
          </dl>
        </div>
        <div className="advisor-coo-purchase-steps" aria-label="Purchase capture steps">
          {[
            ["1", "Capture identity", "VIN label, plate, stock tag, seller, auction lane, or appraisal source."],
            ["2", "Capture condition", "Odometer, dash lights, exterior, interior, tires, damage, keys, and startup proof."],
            ["3", "Attach documents", "Title, registration, auction sheet, payoff, disclosures, bill of sale, or trade worksheet."],
            ["4", "Send to TAI review", "TAI checks missing proof, risk, market fit, recon reserve, and recommended next action."]
          ].map(([step, title, detail]) => <article key={step}>
            <b>{step}</b>
            <span><strong>{title}</strong><small>{detail}</small></span>
          </article>)}
        </div>
        <div className="advisor-coo-purchase-grid">
          <form className="advisor-coo-purchase-form">
            <label>Capture purpose<select aria-label="Purchase capture purpose" onChange={(event) => setPurchaseCaptureType(event.target.value)} value={purchaseCaptureType}>
              <option value="TRADE_IN">Trade-in appraisal</option>
              <option value="AUCTION_PURCHASE">Auction purchase</option>
              <option value="OUTSIDE_PURCHASE">Outside purchase</option>
              <option value="APPRAISAL">Customer appraisal</option>
              <option value="WHOLESALE_REVIEW">Wholesale review</option>
            </select></label>
            <label>Source / seller / lane<input aria-label="Source seller lane" placeholder="Example: Manheim Lane 3, customer trade, Facebook lead" /></label>
            <label>VIN / plate / stock reference<input aria-label="VIN plate stock reference" placeholder="Scan or type VIN, plate, or stock tag" /></label>
            <label>Odometer<input aria-label="Odometer reading" inputMode="numeric" placeholder="Mileage shown on dash" /></label>
            <label>Bid / asking / trade number<input aria-label="Bid asking trade number" inputMode="decimal" placeholder="$ amount being considered" /></label>
            <label>Photo or document proof<input aria-label="Purchase appraisal photo or document proof" accept="image/*,.pdf" capture="environment" multiple type="file" /></label>
            <label className="wide">TAI review notes<textarea aria-label="TAI review notes" placeholder="Damage, warning lights, missing keys, title issue, transport, recon concern, comparable sale, or manager question." /></label>
          </form>
          <aside className="advisor-coo-purchase-review">
            <h2>TAI will check</h2>
            <ul>
              <li><CarFront /> Identity and ownership proof</li>
              <li><Gauge /> Mileage and visible condition risk</li>
              <li><TrendingUp /> Market fit, bid ceiling, margin, and recon reserve</li>
              <li><ShieldCheck /> Missing evidence before purchase or appraisal approval</li>
            </ul>
            <p>No customer, inventory, quote, invoice, or appraisal records were changed from this review screen.</p>
            <div className="advisor-coo-seed-actions">
              <Link href={scopedWorkbookHref("/vehicles/acquisition-appraisal")}>Open Acquisition & Appraisal</Link>
              <Link href={scopedWorkbookHref("/vehicles/coo-workbook/quick-update")}>Save as Quick Update</Link>
              <button onClick={() => setWorkspaceNotice("Purchase/appraisal packet staged for TAI review. Review-only mode is active; no customer, inventory, quote, invoice, or appraisal records were changed.")} type="button"><Send /> Send to TAI review</button>
            </div>
          </aside>
        </div>
      </section> : null}

      {initialTool === "FOCUS_COMPASS" ? <section className="advisor-coo-focused-tool advisor-focus-compass" aria-label="Focus Compass">
        <header>
          <div>
            <strong>Focus Compass</strong>
            <small>One simple tool for Now, Next, Risk, Reset, and Alignment across every planning horizon.</small>
          </div>
          <span>{activeFocusCompass.title}</span>
        </header>

        <div className="advisor-focus-compass-controls" aria-label="Focus Compass controls">
          <div>
            {focusCompassHorizons.map((horizon) => (
              <button aria-pressed={focusCompassHorizon === horizon.value} key={horizon.value} onClick={() => setFocusCompassHorizon(horizon.value)} type="button">
                {horizon.label}
              </button>
            ))}
          </div>
          <div>
            {focusCompassRoles.map((role) => (
              <button aria-pressed={focusCompassRole === role} key={role} onClick={() => setFocusCompassRole(role)} type="button">
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="advisor-focus-view-switch" aria-label="Focus Compass visual mode">
          {focusCompassVisualModes.map(({ icon: Icon, label, value }) => (
            <button aria-pressed={focusCompassVisualMode === value} key={value} onClick={() => setFocusCompassVisualMode(value)} type="button">
              <Icon /> {label}
            </button>
          ))}
        </div>

        <div className="advisor-focus-compass-hero">
          <article className="advisor-focus-now">
            <small>{activeFocusCompass.focus.badge}</small>
            <h2>{activeFocusCompass.focus.title}</h2>
            <p>{activeFocusCompass.focus.detail}</p>
            <div>
              <strong>Why it matters</strong>
              <span>{activeFocusCompass.focus.why}</span>
            </div>
            <div>
              <strong>Next best move</strong>
              <span>{nextBestFocusMove}</span>
            </div>
            <Link href={scopedWorkbookHref("/vehicles/coo-workbook/action-plan")}>Open action plan</Link>
          </article>
          <article className="advisor-focus-score" style={{ "--focus-score": `${activeFocusScore * 3.6}deg` } as CSSProperties}>
            <small>{activeFocusCompass.scoreLabel}</small>
            <div><strong>{activeFocusScore}</strong><span>of 100</span></div>
            <p>{activeFocusScore >= 80 ? "On track" : activeFocusScore >= 65 ? "Needs focus" : "Needs support"}</p>
            <em>{activeFocusProgressText}</em>
            <dl>
              {focusScoreBreakdown.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
          </article>
          <article className="advisor-focus-timeline">
            <small>{focusCompassHorizon === "TODAY" ? "Simple path" : "Timeline"}</small>
            <div>
              {activeFocusCompass.timeline.map((item, index) => (
                <span className={index === 0 ? "done" : index === 1 ? "active" : ""} key={item}>{item}</span>
              ))}
            </div>
          </article>
        </div>

        {focusCompassVisualMode !== "LIST" ? <section className={`advisor-focus-visual advisor-focus-visual-${focusCompassVisualMode.toLocaleLowerCase()}`} aria-label={focusCompassVisualMode === "CALENDAR" ? "Focus deadline calendar" : "Focus timeline"}>
          <header>
            <div>
              <strong>{focusCompassVisualMode === "CALENDAR" ? "Focus Deadline Calendar" : "Focus Timeline"}</strong>
              <small>{focusCompassHorizon === "TODAY" ? model.boardDate : activeFocusCompass.title} · {focusCompassRole}</small>
            </div>
            <span>{activeFocusMustWins.length} focus item{activeFocusMustWins.length === 1 ? "" : "s"}</span>
          </header>
          {focusCompassVisualMode === "TIMELINE" ? <div className="advisor-focus-timeline-review">
            {focusVisualItems.map((visual) => (
              <button className={visual.tone} key={`${visual.drawerKey}-timeline`} onClick={() => setActiveFocusProofDrawerKey(visual.drawerKey)} type="button">
                <b>{visual.index + 1}</b>
                <span>
                  <strong>{visual.item.title}</strong>
                  <small>{activeFocusCompass.timeline[visual.bucketIndex]} · {visual.item.owner} · {visual.item.status}</small>
                </span>
                <em>{visual.proofDone}/{visual.proofTotal} proof</em>
              </button>
            ))}
          </div> : <>
            <div className="advisor-focus-calendar-controls" aria-label="Focus calendar range">
              {(["DAY", "WEEK", "MONTH"] as FocusCompassCalendarView[]).map((view) => (
                <button aria-pressed={focusCompassCalendarView === view} key={view} onClick={() => setFocusCompassCalendarView(view)} type="button">
                  {view === "DAY" ? "Day" : view === "WEEK" ? "Week" : "Month"}
                </button>
              ))}
              <span>{focusCompassCalendarView === "MONTH" ? calendarMonthLabel(focusCalendarAnchor) : focusCompassCalendarView === "WEEK" ? `Week of ${calendarDayLabel(startOfWeek(focusCalendarAnchor))}` : calendarDayLabel(selectedFocusCalendarAnchor)}</span>
            </div>
            <div className={`advisor-focus-calendar-grid ${focusCompassCalendarView.toLocaleLowerCase()}`}>
              {focusCalendarDayItems.map(({ dateKey, day, items, outsideMonth }) => (
                <article className={[
                  items.length ? "" : "empty",
                  outsideMonth ? "outside-month" : "",
                  selectedFocusCalendarDate === dateKey ? "selected" : ""
                ].filter(Boolean).join(" ")} key={dateKey}>
                  <header>
                    <button className="advisor-focus-calendar-day-trigger" onClick={() => setSelectedFocusCalendarDate(dateKey)} type="button">
                      <strong>{focusCompassCalendarView === "MONTH" ? day.getDate() : calendarDayLabel(day)}</strong>
                      <small>{items.length} item{items.length === 1 ? "" : "s"}</small>
                    </button>
                  </header>
                  <div>
                    {items.length ? items.map((visual) => (
                      <button className={visual.tone} key={`${visual.drawerKey}-calendar-${dateKey}`} onClick={() => {
                        setSelectedFocusCalendarDate(dateKey);
                        setActiveFocusProofDrawerKey(visual.drawerKey);
                      }} type="button">
                        <span><strong>{visual.item.title}</strong><small>{visual.calendarReason} · {visual.item.owner} · {visual.item.status}</small></span>
                        <em>{visual.proofDone}/{visual.proofTotal}</em>
                      </button>
                    )) : <p>{focusCompassCalendarView === "DAY" ? "No focus placed on this day" : "Open capacity"}</p>}
                  </div>
                </article>
              ))}
            </div>
            {focusCalendarUndatedItems.length ? <div className="advisor-focus-calendar-undated">
              <strong>Needs date</strong>
              {focusCalendarUndatedItems.map((visual) => <button className={visual.tone} key={`${visual.drawerKey}-undated`} onClick={() => setActiveFocusProofDrawerKey(visual.drawerKey)} type="button">{visual.item.title}</button>)}
            </div> : null}
            <section className="advisor-focus-day-planner" aria-label="Selected day focus planner">
              <header>
                <div>
                  <strong>{calendarDayLabel(selectedFocusCalendarDay.day)}</strong>
                  <small>{selectedFocusCalendarDay.items.length} focus item{selectedFocusCalendarDay.items.length === 1 ? "" : "s"} · {selectedFocusCalendarSlots.length} planned slot{selectedFocusCalendarSlots.length === 1 ? "" : "s"}</small>
                </div>
                <span>Review draft</span>
              </header>
              <div className="advisor-focus-day-layout">
                <div className="advisor-focus-day-list">
                  <strong>Focus on this day</strong>
                  {selectedFocusCalendarDay.items.length ? selectedFocusCalendarDay.items.map((visual) => (
                    <button className={visual.tone} key={`${visual.drawerKey}-selected-day`} onClick={() => setActiveFocusProofDrawerKey(visual.drawerKey)} type="button">
                      <span>
                        <strong>{visual.item.title}</strong>
                        <small>{visual.calendarReason} · {visual.item.owner}</small>
                      </span>
                      <em>{visual.proofDone}/{visual.proofTotal}</em>
                    </button>
                  )) : <p>No focus items are placed on this date yet.</p>}
                </div>
                <form className="advisor-focus-slot-form" onSubmit={(event) => {
                  event.preventDefault();
                  const title = focusSlotDraft.title.trim();
                  if (!title) return;
                  const slot: FocusCalendarSlot = {
                    ...focusSlotDraft,
                    id: `${Date.now()}-${title}`,
                    notes: focusSlotDraft.notes.trim(),
                    title
                  };
                  setFocusCalendarSlots((current) => ({
                    ...current,
                    [selectedFocusCalendarDate]: [...(current[selectedFocusCalendarDate] ?? []), slot]
                  }));
                  setFocusSlotDraft((current) => ({ ...current, notes: "", title: "" }));
                }}>
                  <header>
                    <strong>Add a slot</strong>
                    <small>Plan the day before it becomes live workflow.</small>
                  </header>
                  <label>
                    Time
                    <input value={focusSlotDraft.time} onChange={(event) => setFocusSlotDraft((current) => ({ ...current, time: event.target.value }))} type="time" />
                  </label>
                  <label>
                    Slot type
                    <select value={focusSlotDraft.type} onChange={(event) => setFocusSlotDraft((current) => ({ ...current, type: event.target.value as FocusCalendarSlotType }))}>
                      {Object.entries(focusSlotTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label>
                    Link to focus
                    <select value={focusSlotDraft.focusKey} onChange={(event) => setFocusSlotDraft((current) => ({ ...current, focusKey: event.target.value }))}>
                      <option value="">No linked focus</option>
                      {selectedFocusCalendarDay.items.map((visual) => <option key={visual.drawerKey} value={visual.drawerKey}>{visual.item.title}</option>)}
                    </select>
                  </label>
                  <label>
                    Title
                    <input placeholder="What should happen?" value={focusSlotDraft.title} onChange={(event) => setFocusSlotDraft((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                  <label className="wide">
                    Notes
                    <textarea placeholder="Optional details, person, or result expected." value={focusSlotDraft.notes} onChange={(event) => setFocusSlotDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </label>
                  <button type="submit">Add to day</button>
                </form>
                <div className="advisor-focus-slot-list">
                  <strong>Planned slots</strong>
                  {selectedFocusCalendarSlots.length ? selectedFocusCalendarSlots.map((slot) => {
                    const linkedFocus = focusVisualItems.find((visual) => visual.drawerKey === slot.focusKey);
                    return <article key={slot.id}>
                      <time>{slot.time}</time>
                      <span>
                        <strong>{slot.title}</strong>
                        <small>{focusSlotTypeLabels[slot.type]}{linkedFocus ? ` · ${linkedFocus.item.title}` : ""}</small>
                        {slot.notes ? <p>{slot.notes}</p> : null}
                      </span>
                      <button aria-label={`Remove ${slot.title}`} onClick={() => setFocusCalendarSlots((current) => ({
                        ...current,
                        [selectedFocusCalendarDate]: (current[selectedFocusCalendarDate] ?? []).filter((item) => item.id !== slot.id)
                      }))} type="button"><X /></button>
                    </article>;
                  }) : <p>No time blocks planned yet.</p>}
                </div>
              </div>
            </section>
          </>}
        </section> : null}

        <div className="advisor-focus-compass-grid">
          <section className="advisor-focus-panel advisor-focus-must">
            <header><strong>{focusCompassHorizon === "TODAY" ? "Today’s Must-Wins" : focusCompassHorizon === "WEEK" ? "Weekly Must-Wins" : focusCompassHorizon === "MONTH" ? "Monthly Must-Wins" : focusCompassHorizon === "QUARTER" ? "Quarterly Must-Wins" : "Annual Must-Wins"}</strong><small>{focusCompassRole}</small></header>
            <div>
              {activeFocusMustWins.length ? activeFocusMustWins.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <div className="advisor-focus-must-row">
                    <b>{index + 1}</b>
                    <span><strong>{item.title}</strong><small>{item.owner} · {item.impact}</small></span>
                    <em>{item.status}</em>
                  </div>
                  {(() => {
                    const drawerKey = focusMustWinKey(focusCompassHorizon, item);
                    const proofItems = focusProofItemsFor(item, focusCompassHorizon);
                    const proofDone = proofItems.filter((proof) => focusProofChecked[focusProofKey(focusCompassHorizon, item, proof)]).length;
                    const executionItems = focusExecutionItems[drawerKey] ?? [];
                    const executionDone = executionItems.filter((step) => step.done).length;
                    const drawerOpen = activeFocusProofDrawerKey === drawerKey;

                    return <>
                      <button className="advisor-focus-proof-toggle" aria-expanded={drawerOpen} onClick={() => setActiveFocusProofDrawerKey(drawerOpen ? null : drawerKey)} type="button">
                        <span><strong>Proof checklist</strong><small>{proofDone}/{proofItems.length} proof · {executionDone}/{executionItems.length} execution</small></span>
                        <ChevronDown />
                      </button>
                      {drawerOpen ? <div className="advisor-focus-proof-drawer">
                        <header>
                          <div><strong>Proof checklist</strong><small>Evidence that this focus is controlled and moving.</small></div>
                          <button aria-label="Close proof checklist drawer" onClick={() => setActiveFocusProofDrawerKey(null)} type="button"><X /></button>
                        </header>
                        <fieldset>
                          <legend>Required proof</legend>
                          {proofItems.map((proof) => {
                            const key = focusProofKey(focusCompassHorizon, item, proof);
                            return <label key={key}>
                              <input checked={Boolean(focusProofChecked[key])} onChange={(event) => setFocusProofChecked((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" />
                              <span>{proof.label}</span>
                              <strong>+{proof.weight}</strong>
                            </label>;
                          })}
                        </fieldset>
                        <section>
                          <header><strong>My execution checklist</strong><small>Staff-added steps that help finish the focus.</small></header>
                          <form onSubmit={(event) => {
                            event.preventDefault();
                            const label = focusExecutionDrafts[drawerKey]?.trim();
                            if (!label) return;
                            setFocusExecutionItems((current) => ({
                              ...current,
                              [drawerKey]: [...(current[drawerKey] ?? []), { done: false, id: `${Date.now()}-${label}`, label }]
                            }));
                            setFocusExecutionDrafts((current) => ({ ...current, [drawerKey]: "" }));
                          }}>
                            <input aria-label={`Add execution checklist item for ${item.title}`} onChange={(event) => setFocusExecutionDrafts((current) => ({ ...current, [drawerKey]: event.target.value }))} placeholder="Add a step that keeps this focus moving" value={focusExecutionDrafts[drawerKey] ?? ""} />
                            <button type="submit">Add</button>
                          </form>
                          {executionItems.length ? <div>
                            {executionItems.map((step) => <div key={step.id}>
                              <label>
                                <input checked={step.done} onChange={(event) => setFocusExecutionItems((current) => ({ ...current, [drawerKey]: (current[drawerKey] ?? []).map((currentStep) => currentStep.id === step.id ? { ...currentStep, done: event.target.checked } : currentStep) }))} type="checkbox" />
                                <span>{step.label}</span>
                              </label>
                              <button aria-label={`Remove ${step.label}`} onClick={() => setFocusExecutionItems((current) => ({ ...current, [drawerKey]: (current[drawerKey] ?? []).filter((currentStep) => currentStep.id !== step.id) }))} type="button"><X /></button>
                            </div>)}
                          </div> : <p>No custom execution steps yet.</p>}
                        </section>
                      </div> : null}
                    </>;
                  })()}
                </article>
              )) : <p><CheckCircle2 /> No must-win items are currently visible.</p>}
            </div>
          </section>

          <section className="advisor-focus-panel advisor-focus-risk">
            <header><strong>{focusCompassHorizon === "TODAY" ? "Risk Radar" : focusCompassHorizon === "WEEK" ? "Promise & Deadline Radar" : focusCompassHorizon === "MONTH" ? "Pace & Gap Radar" : "Strategic Risk Radar"}</strong><small>Protect focus</small></header>
            <div>
              {activeFocusCompass.radar.map((item) => (
                <article className={item.severity.toLocaleLowerCase()} key={item.title}>
                  <em>{item.severity}</em>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                </article>
              ))}
            </div>
          </section>

          <section className="advisor-focus-panel advisor-focus-distractions">
            <header><strong>Distraction Filter</strong><small>Minimize noise</small></header>
            <label><input checked={focusDistractionChecked["low-priority"]} onChange={(event) => setFocusDistractionChecked((current) => ({ ...current, "low-priority": event.target.checked }))} type="checkbox" /> Low-priority internal requests</label>
            <label><input checked={focusDistractionChecked["unfocused-work"]} onChange={(event) => setFocusDistractionChecked((current) => ({ ...current, "unfocused-work": event.target.checked }))} type="checkbox" /> Work not tied to {focusCompassHorizon.toLocaleLowerCase()} focus</label>
            <label><input checked={focusDistractionChecked["decisionless-meetings"]} onChange={(event) => setFocusDistractionChecked((current) => ({ ...current, "decisionless-meetings": event.target.checked }))} type="checkbox" /> Meetings without a decision</label>
            <label><input checked={focusDistractionChecked["deep-dives"]} onChange={(event) => setFocusDistractionChecked((current) => ({ ...current, "deep-dives": event.target.checked }))} type="checkbox" /> Deep dives before must-wins move</label>
            <p>{focusNoiseCleared} noise filter(s) active</p>
          </section>

          <section className="advisor-focus-panel advisor-focus-blockers">
            <header><strong>Blocker Capture</strong><small>Explain stalled focus</small></header>
            <div>
              {activeFocusMustWins.slice(0, 3).map((item) => (
                <label key={item.title}>
                  <span>{item.title}</span>
                  <select aria-label={`Blocker for ${item.title}`} value={focusBlockers[item.title] ?? ""} onChange={(event) => setFocusBlockers((current) => ({ ...current, [item.title]: event.target.value }))}>
                    <option value="">No blocker captured</option>
                    {focusBlockerChoices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="advisor-focus-panel advisor-focus-reset">
            <header><strong>Carryover & Reset</strong><small>Close the loop</small></header>
            <div>
              {activeFocusCompass.carryover.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.value}</strong></p>)}
              {protectedCarryoverCount >= 3 ? <p><span>Repeated carryover</span><strong>Convert to action plan</strong></p> : null}
            </div>
            <Link href={scopedWorkbookHref("/vehicles/coo-workbook/carryover")}>Review reset</Link>
          </section>

          <section className="advisor-focus-panel advisor-focus-alignment">
            <header><strong>Company Focus Alignment</strong><small>Why the work matters</small></header>
            <div>
              {activeFocusCompass.alignment.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.value}</strong></p>)}
            </div>
          </section>
        </div>
      </section> : null}

      {initialTool === "MORE_TOOLS" ? <section className="advisor-coo-focused-tool advisor-coo-more-tools-page" aria-label="More Tools">
        <header><div><strong>{activeWorkbookLabel} More Tools</strong><small>Use these supporting tools when the day needs extra structure. Each tool opens a real workbook area that already captures work for reports and coaching.</small></div><span>{moreToolCards.length} tools</span></header>
        <div>
          {moreToolCards.map((tool) => {
            const Icon = tool.icon;
            return <Link href={scopedWorkbookHref(tool.href)} key={tool.title}>
              <Icon />
              <span>
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <dl>
                <div><dt>Use when</dt><dd>{tool.whenToUse}</dd></div>
                <div><dt>Expected result</dt><dd>{tool.outcome}</dd></div>
              </dl>
            </Link>;
          })}
        </div>
      </section> : null}

      {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}
    </section>;
  }

  return <section className={`advisor-panel advisor-coo-workbook advisor-coo-landing ${compact ? "compact" : "full"}`} id="coo-daily-workbook">
    <header className="advisor-coo-landing-header">
      <div>
        <strong>{activeWorkbookLabel}</strong>
        <span>A simple daily workspace for planning, execution, accountability, and reporting.</span>
      </div>
      <div className="advisor-coo-header-actions">
        <Link href="/money-resources"><FileText /> Record spending</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/effectiveness-pilot#start-the-day")}><ClipboardCheck /> Start The Day</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/bring-forward")}><ClipboardList /> Bring Forward</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/quick-update")}><MessageSquareText /> Quick Update</Link>
        <button aria-label={isClosed ? "Open latest report draft" : "Generate Daily Report"} disabled={saving} onClick={() => void generateReportDraft("DAILY", { openDrafts: true })} type="button"><FileText /> {saving ? "Generating..." : isClosed ? "Open Draft" : "Generate Report"}</button>
      </div>
    </header>

    <WorkbookAppointmentFlow date={model.boardDate} workbook={activeWorkbook} pendingWork={dailyPursePendingWork} generating={saving} onGenerateReport={() => generateReportDraft("DAILY")} />
    <section className="advisor-coo-workflow-guide" aria-label="Workbook workflow guide">
      <article>
        <small>Recommended Now</small>
        <strong>{contextRecommendation.title}</strong>
        <span>{contextRecommendation.description}</span>
        {"href" in contextRecommendation ? <Link href={scopedWorkbookHref(contextRecommendation.href!)}>{isClosed ? "Review report" : "Open"}</Link> : <button onClick={contextRecommendation.onSelect} type="button">Open</button>}
      </article>
      <nav aria-label="Daily workflow">
        {workflowPhases.map((phase) => {
          const Icon = phase.icon;
          const content = <>
            <Icon />
            <span><strong>{phase.title}</strong><small>{phase.detail}</small></span>
          </>;
          return "href" in phase ? <Link aria-current={contextRecommendation.phase === phase.key ? "step" : undefined} href={scopedWorkbookHref(phase.href!)} key={phase.key}>{content}</Link> : <button aria-current={contextRecommendation.phase === phase.key ? "step" : undefined} key={phase.key} onClick={phase.onSelect} type="button">{content}</button>;
        })}
      </nav>
    </section>

    <section className="advisor-staff-execution-home" aria-label="Staff Execution Home">
      <header>
        <div>
          <strong>Staff Execution Home</strong>
          <small>Open the next thing, update what changed, ask for help, or close the day without hunting through the workbook.</small>
        </div>
        <span>{todayWorkRollup.total} active</span>
      </header>
      <div>
        {staffExecutionHomeCards.map((card) => {
          const Icon = card.icon;
          return <Link className={card.tone} href={scopedWorkbookHref(card.href)} key={card.title}>
            <Icon />
            <span>
              <small>{card.action}</small>
              <strong>{card.title}</strong>
              <em>{card.detail}</em>
            </span>
          </Link>;
        })}
      </div>
      <footer>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/quick-update")}>Add update</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/staff-support")}>Ask for help</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/quick-update")}>Set follow-up</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/carryover")}>Carry over</Link>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/purchase-appraisal-capture")}>Attach photo/document</Link>
      </footer>
    </section>

    <section className="advisor-coo-command-strip" aria-label="Today's Command" role="tablist">
      {commandCards.map((card) => {
        const Icon = card.icon;
        return <button aria-selected={commandView === card.key} className={card.tone} key={card.label} onClick={() => setCommandView(card.key)} role="tab" type="button">
          <Icon />
          <span>{card.label}</span>
          <strong>{card.stat}</strong>
          <small>{card.meta}</small>
        </button>;
      })}
    </section>

    {commandView ? <section className="advisor-coo-command-detail" aria-label={`${commandDetailTitle} details`} role="tabpanel">
      <header>
        <div><strong>{commandDetailTitle}</strong><small>{commandDetailHelp}</small></div>
        <span>{commandDetailItems.length ? `${commandDetailItems.length} item(s)` : "Clear"}</span>
      </header>
      <div>
        {commandDetailItems.length ? commandDetailItems.map((item) => <a href={scopedWorkbookHref(item.href)} key={item.id}>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span>
          <em>{item.action}</em>
        </a>) : <p><CheckCircle2 /> Nothing is waiting in this area right now.</p>}
      </div>
    </section> : null}

    <section className="advisor-coo-work-search" aria-label="Find task, ticket, vehicle, or customer">
      <header>
        <div>
          <strong>Find task, ticket, vehicle, or customer</strong>
          <small>Search by VIN, stock #, repair order, customer, appointment, checklist, or update note.</small>
        </div>
        <span>{normalizedWorkSearch ? `${workSearchResults.length} match${workSearchResults.length === 1 ? "" : "es"}` : "Ready"}</span>
      </header>
      <label className="advisor-coo-search-box">
        <Search />
        <input
          aria-label="Search COO work"
          onChange={(event) => setWorkSearchQuery(event.target.value)}
          placeholder="Try a VIN like 1G1ZE5SX1JF103855, RO, stock #, customer, or task..."
          type="search"
          value={workSearchQuery}
        />
        {workSearchQuery ? <button onClick={() => setWorkSearchQuery("")} type="button">Clear</button> : null}
      </label>
      {normalizedWorkSearch ? <div className="advisor-coo-search-results">
        {workSearchResults.length ? workSearchResults.map((item) => {
          const existingFocus = findExistingSearchFocus(item);
          return <article className={item.tone} key={item.id}>
            <a className="advisor-coo-search-summary" href={scopedWorkbookHref(item.href)}>
              <span><b>{item.kind}</b><strong>{item.title}</strong><small>{item.context}</small><small>{item.description}</small></span>
              <em>{item.action}</em>
            </a>
            <div className="advisor-coo-search-actions">
              {existingFocus ? (
                <a href={scopedWorkbookHref("/vehicles/coo-workbook/effectiveness-pilot#start-the-day")}>Open existing focus</a>
              ) : (
                <button
                  disabled={Boolean(searchActionId || convertingId) || isClosed}
                  onClick={() => void addSearchResultToWorkbook(item, "FOCUS")}
                  type="button"
                >
                  {searchActionId === `FOCUS:${item.id}` ? "Adding..." : "Add to Today’s Focus"}
                </button>
              )}
              <button
                disabled={Boolean(searchActionId || convertingId) || isClosed}
                onClick={() => void addSearchResultToWorkbook(item, "CHECKLIST")}
                type="button"
              >
                {searchActionId === `CHECKLIST:${item.id}` ? "Adding..." : "Add checklist"}
              </button>
              <button
                disabled={Boolean(searchActionId || convertingId) || isClosed}
                onClick={() => void carrySearchResultForward(item)}
                type="button"
              >
                {searchActionId === `CARRY:${item.id}` ? "Marking..." : "Carry over"}
              </button>
              {item.resume ? (
                <button
                  className="primary"
                  disabled={Boolean(searchActionId || convertingId)}
                  onClick={() => void resumeSearchResultAsTask(item)}
                  type="button"
                >
                  {convertingId === item.id ? "Resuming..." : "Resume as task"}
                </button>
              ) : null}
            </div>
          </article>;
        }) : <div className="advisor-coo-search-empty">
          <span>No matching work found on this board. If this is still work that needs attention, create a task from the search and keep moving.</span>
          <Link href={workSearchTaskHref}>Create task from search</Link>
        </div>}
      </div> : null}
    </section>

    <section className="advisor-coo-landing-grid" aria-label={`${activeWorkbookLabel} daily execution workspace`}>
      <article className="advisor-coo-attention-now">
        <header>
          <div><strong>{executionFocusItems.length ? "Today’s Execution" : "What Needs Attention Now"}</strong><small>{executionFocusItems.length ? "Work selected focus items first. Review attached risks when they affect delivery." : `${activeWorkbookLabel} signals, operating exceptions, and follow-up risk.`}</small></div>
          <span>{executionPanelCount}</span>
        </header>
        <div>
          {executionFocusItems.length ? (
            <div className="advisor-coo-execution-list">
              {focusAttentionLinks.map(({ attention, focus }, index) => {
                const source = dailyFocusSource(focus);
                return <article className={executionFocusTone(focus)} key={focus.id}>
                  <div>
                    <b>{index + 1}</b>
                    <span>
                      <strong>{focus.outcome}</strong>
                      <small>{focus.status === "DONE" ? "Done" : focus.status === "CARRY_OVER" ? "Carryover ready" : `${focus.priority.toLocaleLowerCase()} priority`} · {focus.mustCloseToday ? "must close today" : "flexible"} · {source.toolLabel}</small>
                      {focus.progressUpdate ? <i>Progress: {focus.progressUpdate}</i> : focus.supportNeeded ? <i>Support: {focus.supportNeeded}</i> : focus.riskNote ? <i>Risk: {focus.riskNote}</i> : null}
                    </span>
                  </div>
                  {attention.length ? <div className="advisor-coo-related-attention">
                    <small>Related attention</small>
                    {attention.map((item) => <a className={item.tone} href={scopedWorkbookHref(item.href)} key={item.id}>
                      <span><strong>{item.title}</strong><small>{item.context}</small>{item.meta ? <i>{item.meta}</i> : null}</span>
                      <em>{item.action}</em>
                    </a>)}
                  </div> : null}
                  <div className="advisor-coo-execution-actions">
                    <a className="primary" href={scopedWorkbookHref(source.href)}><Pencil /> Work / Update</a>
                    <button disabled={saving || isClosed || focus.status === "DONE"} onClick={() => void setEndDayFocusStatus(focus.id, "DONE")} type="button"><CheckCircle2 /> Done</button>
                    <button disabled={saving || isClosed || focus.status === "CARRY_OVER"} onClick={() => void setEndDayFocusStatus(focus.id, "CARRY_OVER")} type="button"><CalendarClock /> Carry over</button>
                    <a href={scopedWorkbookHref("/vehicles/coo-workbook/effectiveness-pilot#start-the-day")}>Edit focus</a>
                  </div>
                </article>;
              })}
              {otherAttentionItems.length ? <section className="advisor-coo-other-attention">
                <header><strong>Other Attention</strong><small>Backend signals not attached to today’s selected focus.</small></header>
                {otherAttentionItems.map((item, index) => <a className={item.tone} href={scopedWorkbookHref(item.href)} key={item.id}>
                  <b>{index + 1}</b>
                  <span><strong>{item.title}</strong><small>{item.context}</small><small>{item.description}</small>{item.meta ? <i>{item.meta}</i> : null}</span>
                  <em>{item.action}</em>
                </a>)}
              </section> : null}
            </div>
          ) : attentionItems.length ? attentionItems.map((item, index) => <a className={item.tone} href={scopedWorkbookHref(item.href)} key={item.id}>
            <b>{index + 1}</b>
            <span><strong>{item.title}</strong><small>{item.context}</small><small>{item.description}</small>{item.meta ? <i>{item.meta}</i> : null}</span>
            <em>{item.action}</em>
          </a>) : <p><CheckCircle2 /> No urgent workbook or operating signals need attention right now.</p>}
        </div>
      </article>

      <article className="advisor-coo-tool-launcher">
        <header>
          <div><strong>Open a Tool</strong><small>Keep the landing page clean. Open only what you need to execute.</small></div>
          <span>{toolCards.length} tools</span>
        </header>
        <div className="advisor-coo-tool-grid">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return <a href={scopedWorkbookHref(tool.href)} key={tool.title}>
              <Icon />
              <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            </a>;
          })}
        </div>
      </article>
    </section>

    <section className="advisor-end-day-shell" id="close-report" aria-label="End The Day">
      <header className="advisor-end-day-heading">
        <div><span>DAILY CLOSE</span><h1>End The Day</h1><p>Resolve today, protect tomorrow, review the evidence, and close with an explicit approval.</p></div>
        <strong className={isClosed ? "closed" : endDayReadyForApproval ? "ready" : "review"}><ShieldCheck /> {isClosed ? "Day closed" : endDayReadyForApproval ? "Ready for review" : `${unresolvedEndDayCount + (latestReportDraft ? 0 : 1) + (hasUnsavedManualReportItems ? 1 : 0)} item(s) to resolve`}</strong>
      </header>

      <div className="advisor-end-day-orientation">
        <div><small>Planned work</small><strong>{activeWorkbook.execution.completedWorkCount}/{activeWorkbook.execution.plannedWorkCount} complete</strong></div>
        <div><small>Unfinished</small><strong>{unresolvedEndDayCount} need a decision</strong></div>
        <div><small>Tomorrow</small><strong>{tomorrowItems.length} prepared/candidate</strong></div>
        <div><small>Report evidence</small><strong>{reportSeedRollup.active} seed(s)</strong></div>
        <div><small>Close guidance</small><strong>{activeWorkbook.governance.nextRecommendedAction}</strong></div>
      </div>

      <section className="advisor-end-day-section">
        <header><div><span>1</span><div><h2>Review today’s results</h2><p>Every planned outcome needs a clear Done or Carry to tomorrow decision.</p></div></div><small>{closeReviewItems.length} item(s)</small></header>
        <div className="advisor-end-day-list">
          {closeReviewItems.length ? closeReviewItems.map((item) => <article className={item.status === "Done" ? "done" : item.status === "Carry over" ? "carry" : "open"} key={item.id}>
            <span><strong>{item.title}</strong><small>{item.status} · {item.detail}</small></span>
            <Link href={scopedWorkbookHref(item.href)}>{item.toolLabel}</Link>
            <div>
              <button aria-pressed={item.status === "Done"} className={item.status === "Done" ? "selected" : ""} disabled={saving || isClosed} onClick={() => item.kind === "focus" ? void setEndDayFocusStatus(item.focusId, "DONE") : void persistChecklistItem(item.checklistId, { done: true, carryoverReady: false, status: "GREEN" })} type="button"><CheckCircle2 /> Done</button>
              <button aria-pressed={item.status === "Carry over"} className={item.status === "Carry over" ? "selected carry" : ""} disabled={saving || isClosed} onClick={() => item.kind === "focus" ? void setEndDayFocusStatus(item.focusId, "CARRY_OVER") : void persistChecklistItem(item.checklistId, { done: false, carryoverReady: true })} type="button"><CalendarClock /> Carry to tomorrow</button>
            </div>
          </article>) : <p className="advisor-end-day-empty"><CheckCircle2 /> No planned work was recorded for today.</p>}
        </div>
      </section>

      <section className="advisor-end-day-section">
        <header><div><span>2</span><div><h2>Protect tomorrow</h2><p>Confirm that unfinished work has context and will not disappear overnight.</p></div></div><small>{tomorrowItems.length} item(s)</small></header>
        <div className="advisor-end-day-list compact">
          {tomorrowItems.length ? tomorrowItems.map((item) => <article className="carry" key={item.id}>
            <span><strong>{item.title}</strong><small>{item.status} · {item.detail}</small></span>
            <Link href={scopedWorkbookHref(item.href)}>{item.toolLabel}</Link>
          </article>) : <p className="advisor-end-day-empty"><CheckCircle2 /> Nothing needs to carry into tomorrow.</p>}
        </div>
        <footer><span>Preparing tomorrow creates governed carryover records; it does not duplicate tasks or repair orders.</span><button disabled={saving || isClosed || !tomorrowItems.length} onClick={() => void runCloseStep("carryover")} type="button">{closeStepInProgress === "carryover" ? "Preparing…" : "Prepare tomorrow"}</button></footer>
      </section>

      <section className="advisor-end-day-section">
        <header><div><span>3</span><div><h2>Review the daily report evidence</h2><p>Generate a source-backed draft, then inspect the work that will appear in the daily report.</p></div></div><nav aria-label="Report cadence"><Link aria-current="page" href={scopedWorkbookHref("/vehicles/coo-workbook/drafts?cadence=daily")}>Daily</Link><Link href={scopedWorkbookHref("/vehicles/coo-workbook/drafts?cadence=weekly")}>Weekly</Link><Link href={scopedWorkbookHref("/vehicles/coo-workbook/drafts?cadence=monthly")}>Monthly</Link></nav></header>
        <dl className="advisor-end-day-evidence"><div><dt>Seeds ready</dt><dd>{reportSeedRollup.active}</dd></div><div><dt>Sections</dt><dd>{latestReportDraft?.sections.length ?? 0}</dd></div><div><dt>Latest draft</dt><dd>{latestReportDraft ? dateLabel(latestReportDraft.generatedAt) : "Not generated"}</dd></div><div><dt>Staff source</dt><dd>{staffTodayRollup.total} active</dd></div></dl>
        {latestReportDraft ? <button aria-expanded={closeDraftExpanded} className="advisor-end-day-draft" onClick={() => setCloseDraftExpanded((current) => !current)} type="button"><span><strong>{latestReportDraft.title}</strong><small>{latestReportDraft.summary}</small></span><span>{closeDraftExpanded ? "Hide evidence" : `Review ${latestReportDraftItemCount} item(s)`}<ChevronDown /></span></button> : <p className="advisor-end-day-empty"><FileText /> No daily report draft has been generated yet.</p>}
        {latestReportDraft && closeDraftExpanded ? <div className="advisor-end-day-draft-items">{latestReportDraft.sections.map((section) => <section key={section.title}><strong>{section.title}</strong>{section.items.map((item) => <p key={`${section.title}-${item.sourceId}-${item.title}`}><b>{item.title}</b><small>{item.detail}</small>{item.reviewNote ? <em>{item.reviewNote}</em> : null}</p>)}</section>)}</div> : null}
        <section className="advisor-end-day-manual-report" aria-label="Add missing report items">
          <button aria-expanded={manualReportEditorOpen} onClick={() => setManualReportEditorOpen((current) => !current)} type="button"><MessageSquareText /> Add missing item or comment{hasUnsavedManualReportItems ? <small>Unsaved draft</small> : null}</button>
          {manualReportEditorOpen ? <div>
            <header><div><strong>Add staff-supplied report items</strong><small>Use one row per accomplishment, update, blocker, management item, or carryover the generated report missed.</small></div><span>Click the comment field for a larger writing space.</span></header>
            <div className="advisor-end-day-manual-list">
              {manualReportItems.map((item, index) => <article key={item.id}>
                <b><CheckSquare /> {index + 1}</b>
                <label><span>Report item</span><input aria-label={`Report item ${index + 1}`} onChange={(event) => updateManualReportItem(item.id, { title: event.target.value })} placeholder="What should the report include?" value={item.title} /></label>
                <label><span>Section</span><select aria-label={`Section for report item ${index + 1}`} onChange={(event) => updateManualReportItem(item.id, { category: event.target.value as ManualReportCategory })} value={item.category}><option value="COMPLETED">Completed today</option><option value="UPDATE">Update / unplanned event</option><option value="BLOCKER">Blocker or risk</option><option value="MANAGEMENT">Management review</option><option value="CARRYOVER">Carryover for tomorrow</option></select></label>
                <label><span>Details or comment</span><textarea aria-label={`Details for report item ${index + 1}`} onFocus={() => setExpandedManualReportItemId(item.id)} placeholder="Click to document the useful context…" readOnly value={item.detail} /></label>
                <label><span>Related record (optional)</span><input aria-label={`Related record for report item ${index + 1}`} onChange={(event) => updateManualReportItem(item.id, { relatedContext: event.target.value })} placeholder="Task #, RO, vehicle, or customer" value={item.relatedContext} /></label>
                {manualReportItems.length > 1 ? <button aria-label={`Remove report item ${index + 1}`} onClick={() => setManualReportItems((current) => current.filter((candidate) => candidate.id !== item.id))} type="button">Remove</button> : null}
              </article>)}
            </div>
            <footer><button onClick={addManualReportRow} type="button"><Plus /> Add another item</button><span><button onClick={discardManualReportItems} type="button">Discard</button><button disabled={saving || !manualReportItems.some((item) => item.title.trim())} onClick={() => void saveManualReportItems()} type="button">{saving ? "Saving…" : "Save items & refresh draft"}</button></span></footer>
          </div> : null}
          {expandedManualReportItemId ? (() => {
            const item = manualReportItems.find((candidate) => candidate.id === expandedManualReportItemId);
            if (!item) return null;
            const itemNumber = manualReportItems.findIndex((candidate) => candidate.id === item.id) + 1;
            return <div className="advisor-end-day-comment-layer">
              <section aria-labelledby="expanded-comment-title" aria-modal="true" className="advisor-end-day-comment-editor" role="dialog">
                <header><div><span>REPORT ITEM {itemNumber}</span><h2 id="expanded-comment-title">Document the full comment</h2><p>{item.title || "Add all relevant context now; the report item title can be completed afterward."}</p></div><button aria-label="Close expanded comment" onClick={() => setExpandedManualReportItemId(null)} type="button"><X /></button></header>
                <main><label><span>Comment and supporting details</span><textarea aria-label={`Expanded details for report item ${itemNumber}`} autoFocus onChange={(event) => updateManualReportItem(item.id, { detail: event.target.value })} placeholder="Document the outcome, conversation, decision, next step, names, dates, and any context the generated report missed…" rows={14} value={item.detail} /></label><small><ShieldCheck /> This remains an unsaved draft until you select “Save items & refresh draft.”</small></main>
                <footer><button onClick={() => setExpandedManualReportItemId(null)} type="button">Done writing</button></footer>
              </section>
            </div>;
          })() : null}
        </section>
        <footer><span className="advisor-end-day-support-links"><Link href={scopedWorkbookHref("/vehicles/coo-workbook/report-seeds")}>Review report seeds</Link><Link href={scopedWorkbookHref("/vehicles/coo-workbook/more-tools")}>More Tools</Link></span><button disabled={saving || isClosed} onClick={() => void runCloseStep("draft")} type="button">{closeStepInProgress === "draft" ? "Generating…" : latestReportDraft ? "Refresh daily draft" : "Generate daily draft"}</button></footer>
      </section>

      {reviewingEndDay && !isClosed ? <section className="advisor-end-day-final-review" ref={endDayReviewRef} tabIndex={-1}>
        <header><div><span><ShieldCheck /></span><div><h2>Final End The Day review</h2><p>This approval closes the workbook and preserves today’s decisions, carryovers, and report evidence.</p></div></div><small>{endDayReadyForApproval ? "Ready to approve" : "Needs attention"}</small></header>
        <div><p className={unresolvedEndDayCount ? "blocker" : "ready"}><CheckCircle2 /><span><strong>Work decisions</strong><small>{unresolvedEndDayCount ? `${unresolvedEndDayCount} item(s) still need Done or Carry to tomorrow.` : "Every planned item has a close decision."}</small></span></p><p className={latestReportDraft ? "ready" : "blocker"}><FileText /><span><strong>Daily report</strong><small>{latestReportDraft ? `${latestReportDraftItemCount} source-backed report item(s) reviewed.` : "Generate the daily report draft before closing."}</small></span></p><p className={hasUnsavedManualReportItems ? "blocker" : "ready"}><Plus /><span><strong>Staff additions</strong><small>{hasUnsavedManualReportItems ? "Save or discard the missing report items before closing." : "No staff-supplied report additions are waiting to be saved."}</small></span></p></div>
        <footer><button className="secondary" onClick={() => setReviewingEndDay(false)} type="button">Back to edit</button><button disabled={saving || !endDayReadyForApproval} onClick={() => void closeOrReopenDay()} type="button">{saving ? "Closing…" : "Approve & Close Day"}</button></footer>
      </section> : null}

      <section className="advisor-end-day-confirm">
        <div><span>4</span><div><h2>{isClosed ? "The day is closed" : "Review and approve the close"}</h2><p>{isClosed ? "Reopen the day only when a correction is required; the audit history remains preserved." : "The final checkpoint prevents an incomplete plan from being adopted accidentally."}</p><small><ShieldCheck /> {effectiveWorkbookView === "MY" ? "Approval submits your staff daily report, closes your day, and preserves the handoff evidence." : "Closing is an auditable decision."}</small></div></div>
        {isClosed ? <button disabled={saving} onClick={() => void closeOrReopenDay()} type="button">{saving ? "Reopening…" : "Reopen Day"}</button> : <button disabled={saving} onClick={openEndDayReview} type="button">{reviewingEndDay ? "Return to final review" : "Review End The Day"}</button>}
      </section>
      {closeStepNotice ? <p className="advisor-coo-close-step-notice" role="status">{closeStepNotice}</p> : null}
    </section>

    {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}

    <footer className="advisor-coo-landing-status">
      <span><CheckCircle2 /> All workspace sources connected</span>
      <span>Last saved {dateLabel(model.generatedAt)}</span>
    </footer>
  </section>;
}

export function CooEffectivenessPilotWorkbook({ model }: { model: ServiceAdvisorWorkspaceModel }) {
  const searchParams = currentWorkbookSearchParams();
  const [workbook, setWorkbook] = useState<WorkdayWorkbookModel>(model.workbook);
  const [staffWorkbook, setStaffWorkbook] = useState<WorkdayWorkbookModel>(model.staffWorkbook);
  const [, setStaffWorkbookSummaries] = useState(model.staffWorkbookSummaries);
  const [focusOutcome, setFocusOutcome] = useState("");
  const [focusPriority, setFocusPriority] = useState<DailyFocusPriority>("HIGH");
  const [focusMustClose, setFocusMustClose] = useState(true);
  const [capacityState, setCapacityState] = useState<StartDayCapacity>("ON_TRACK");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [supportOwner, setSupportOwner] = useState("");
  const [supportBy, setSupportBy] = useState("");
  const [editingFocus, setEditingFocus] = useState<DailyFocusItem | null>(null);
  const [editedOutcome, setEditedOutcome] = useState("");
  const [editedPriority, setEditedPriority] = useState<DailyFocusPriority>("HIGH");
  const [editedMustClose, setEditedMustClose] = useState(true);
  const [reviewingStartDay, setReviewingStartDay] = useState(false);
  const [localPlanRevision, setLocalPlanRevision] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [convertingFocusId, setConvertingFocusId] = useState<string | null>(null);
  const attentionSessionKey = useId().replaceAll(":", "");
  const staffWorkbookLabel = model.workspace.staffWorkbookLabel;
  const managementWorkbookLabel = model.workspace.managementWorkbookLabel;
  const canUseManagementWorkbook = model.workspace.canUseManagementWorkbook;
  const effectiveWorkbookView = automaticWorkbookView(canUseManagementWorkbook, searchParams);
  const activeWorkbook = effectiveWorkbookView === "MY" ? staffWorkbook : workbook;
  const activeLabel = effectiveWorkbookView === "MY" ? staffWorkbookLabel : managementWorkbookLabel;
  const sourceReturnTo = searchParams.get("returnTo");
  const scopedWorkbookHref = (href: string) => href.startsWith("/vehicles/coo-workbook") ? workbookScopeHref(href, effectiveWorkbookView, sourceReturnTo) : href;
  const workbookExitHref = sourceReturnTo?.startsWith("/") && !sourceReturnTo.startsWith("//") ? sourceReturnTo : scopedWorkbookHref("/vehicles/coo-workbook");
  const repairOrderHref = (repairOrderId: string) => repairOrderWorkbookHref(repairOrderId, workbookExitHref, sourceReturnTo ? "My Workspace" : activeLabel);
  const dailyFocus = activeWorkbook.dailyFocusItems.filter((item) => !isGenericAdvisorFocusItem(item));
  const isPilotClosed = activeWorkbook.status === "CLOSED";
  const bringForwardCandidates = activeWorkbook.bringForwardCandidates ?? [];
  const prioritySourcesForView = effectiveWorkbookView === "MY"
    ? model.morningPrioritySources.filter((item) => item.staffUserId === model.advisor.id)
    : model.morningPrioritySources;
  const dailyFocusSuggestions = buildDailyFocusSuggestions(activeWorkbook, prioritySourcesForView);
  const existingFocusOutcomes = new Set(dailyFocus.map((item) => item.outcome.trim().toLocaleLowerCase()));
  const carryoverRecords = [...activeWorkbook.incomingCarryovers, ...activeWorkbook.carryovers]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => item.targetBoardDate === model.boardDate)
    .filter((item) => item.status !== "DISMISSED" && item.status !== "CONVERTED");
  const activeCarryovers = carryoverRecords
    .filter((item) => !existingFocusOutcomes.has(item.title.trim().toLocaleLowerCase()));
  const carryoverSuggestions: DailyFocusSuggestion[] = activeCarryovers.map((item) => ({
    detail: item.detail || "Prior work still needs a clear outcome.",
    href: item.sourceHref || "/vehicles/coo-workbook/carryover",
    mustCloseToday: item.status === "CONFIRMED",
    outcome: item.title,
    priority: "HIGH",
    rank: item.status === "OPEN" ? 94 : 84,
    reason: item.status === "OPEN" ? "Unfinished prior work needs a decision for today." : "This carryover was already confirmed for today.",
    riskLevel: item.status === "OPEN" ? "WATCH" : "NONE",
    roleFit: "DIRECT",
    sourceId: `carryover-${item.id}`,
    sourceLabel: "Prior carryover"
  }));
  const carryoverSuggestionIds = new Set(carryoverSuggestions.map((item) => item.sourceId));
  const attentionSuggestions = dailyFocusSuggestions.filter((item) => !carryoverSuggestionIds.has(item.sourceId)).slice(0, 5);
  const mustCloseCount = dailyFocus.filter((item) => item.mustCloseToday).length;
  const latestStartConfirmation = [...activeWorkbook.activitySignals]
    .filter((item) => item.actionType === "workbook.rhythm_start_confirmed")
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0] ?? null;
  const planChangedAfterConfirmation = Boolean(latestStartConfirmation && dailyFocus.some((item) => item.updatedAt > latestStartConfirmation.occurredAt));
  const startConfirmed = Boolean(latestStartConfirmation && !planChangedAfterConfirmation && !localPlanRevision);
  const approvedFocusIds = new Set(activeWorkbook.activitySignals
    .filter((signal) => signal.actionType === "workbook.daily_focus_approved")
    .filter((signal) => {
      const focusId = signal.sourceId.replace(/^daily-focus:/, "");
      const focusItem = dailyFocus.find((item) => item.id === focusId);
      return Boolean(focusItem && signal.occurredAt >= focusItem.updatedAt);
    })
    .map((signal) => signal.sourceId.replace(/^daily-focus:/, "")));
  const unapprovedFocusCount = dailyFocus.filter((item) => !approvedFocusIds.has(item.id)).length;
  const normalizedSourceTitle = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const dailyFocusSource = (item: DailyFocusItem) => {
    if (item.convertedTaskId) return { actionLabel: "Open linked task", description: "This outcome is linked to an existing task.", href: `/tasks/${encodeURIComponent(item.convertedTaskId)}`, isOperationalRecord: true, label: "Linked task" };
    const normalizedOutcome = normalizedSourceTitle(item.outcome);
    const repairOrderNumber = item.outcome.match(/\bRO-[A-Z0-9]+\b/i)?.[0]?.toLocaleUpperCase();
    const repairOrder = repairOrderNumber
      ? model.repairOrders.find((order) => order.repairOrderNumber.toLocaleUpperCase() === repairOrderNumber)
      : null;
    if (repairOrder) return { actionLabel: "Open repair order", description: "This outcome is linked to an existing repair order.", href: repairOrderHref(repairOrder.id), isOperationalRecord: true, label: "Existing repair order" };
    const repairOrderAction = repairOrderNumber
      ? model.actionQueue.find((action) => action.repairOrderNumber.toLocaleUpperCase() === repairOrderNumber)
      : null;
    if (repairOrderAction) return { actionLabel: "Open repair order", description: "This outcome is linked to an existing repair order.", href: repairOrderHref(repairOrderAction.id), isOperationalRecord: true, label: "Existing repair order" };
    const prioritySource = [
      ...prioritySourcesForView,
      ...model.morningPrioritySources
    ].find((source) => source.sourceType === "TASK" ? matchesTaskSourceTitle(source.title, item.outcome) : normalizedSourceTitle(source.title) === normalizedOutcome);
    if (prioritySource) return {
      actionLabel: prioritySource.sourceType === "TASK" ? "Open task" : prioritySource.sourceType === "APPOINTMENT" ? "Open schedule" : "Open source",
      description: `This outcome is linked to an existing ${prioritySource.sourceType.toLocaleLowerCase().replace("_", " ")}.`,
      href: prioritySource.href,
      isOperationalRecord: true,
      label: prioritySource.sourceType === "TASK" ? "Linked task" : prioritySource.sourceType === "REPAIR_ORDER" ? "Existing repair order" : prioritySource.sourceType === "APPOINTMENT" ? "Linked appointment" : "Linked duty"
    };
    const checklist = activeWorkbook.checklistItems.find((candidate) => normalizedSourceTitle(candidate.text) === normalizedOutcome);
    if (checklist) return { actionLabel: "Open checklist source", description: "Added from a workbook checklist. It has not been converted to a task.", href: `/vehicles/coo-workbook/checklist#checklist-${encodeURIComponent(checklist.id)}`, isOperationalRecord: false, label: "Checklist outcome · not a task" };
    const quickUpdate = activeWorkbook.quickUpdates.find((candidate) => normalizedSourceTitle(candidate.text) === normalizedOutcome);
    if (quickUpdate) return { actionLabel: "Open Quick Update source", description: "Added from a Quick Update. It has not been converted to a task.", href: `/vehicles/coo-workbook/quick-update#quick-${encodeURIComponent(quickUpdate.id)}`, isOperationalRecord: false, label: "Quick Update outcome · not a task" };
    const carryover = carryoverRecords.find((candidate) => normalizedSourceTitle(candidate.title) === normalizedOutcome);
    if (carryover) return { actionLabel: "Open carryover source", description: "Carried forward from a prior plan. It has not been converted to a task.", href: carryover.sourceHref || "/vehicles/coo-workbook/carryover", isOperationalRecord: false, label: "Carryover outcome · not a task" };
    return { actionLabel: "Convert to task", description: "Manually added Daily Focus outcome. No task has been created.", href: null, isOperationalRecord: false, label: "Manual outcome · not a task" };
  };
  useEffect(() => {
    let lastTick = Date.now();
    const startedAt = new Date(lastTick).toISOString();

    async function sendHeartbeat(ended = false) {
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.round((now - lastTick) / 1000));
      lastTick = now;
      if (!elapsedSeconds && !ended) return;
      await fetch("/api/coo-workbook/attention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeSeconds: document.visibilityState === "visible" ? elapsedSeconds : 0,
          ended,
          idleSeconds: document.visibilityState === "visible" ? 0 : elapsedSeconds,
          sessionKey: attentionSessionKey,
          sourceArea: "COO_WORKBOOK_EFFECTIVENESS",
          sourcePath: window.location.pathname,
          startedAt,
          workbookId: activeWorkbook.id
        })
      }).catch(() => undefined);
    }

    const interval = window.setInterval(() => void sendHeartbeat(), 60000);
    const endSession = () => void sendHeartbeat(true);
    window.addEventListener("pagehide", endSession);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", endSession);
      endSession();
    };
  }, [activeWorkbook.id, attentionSessionKey]);

  async function refreshPilotWorkbook() {
    if (effectiveWorkbookView === "MY") {
      const response = await fetch(`/api/coo-workbook/staff?date=${encodeURIComponent(model.boardDate)}`);
      const payload = await response.json().catch(() => null) as { staffWorkbookSummaries?: StaffWorkbookSummary[]; workbook?: WorkdayWorkbookModel; error?: string } | null;
      if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? `Unable to refresh ${staffWorkbookLabel}.`);
      setStaffWorkbook(payload.workbook);
      setStaffWorkbookSummaries(payload.staffWorkbookSummaries ?? []);
      return;
    }
    const response = await fetch("/api/coo-workbook");
    const payload = await response.json().catch(() => null) as { workbook?: WorkdayWorkbookModel; error?: string } | null;
    if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? `Unable to refresh ${managementWorkbookLabel}.`);
    setWorkbook(payload.workbook);
  }

  async function createDailyFocusFromSuggestion(suggestion: DailyFocusSuggestion, sortOrder: number) {
      const response = await fetch(`/api/coo-workbook/daily-focus?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mustCloseToday: suggestion.mustCloseToday,
        outcome: suggestion.outcome,
        priority: suggestion.priority,
        riskLevel: suggestion.riskLevel,
        sortOrder,
        supportNeeded: suggestion.riskLevel === "BLOCKED" ? suggestion.detail : "",
        riskNote: suggestion.riskLevel === "WATCH" ? suggestion.detail : ""
      })
    });
    const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Unable to save Daily Focus.");
    return payload;
  }

  async function addDailyFocus(suggestion?: DailyFocusSuggestion) {
    const outcome = (suggestion?.outcome ?? focusOutcome).trim();
    if (!outcome) return;
    if (isPilotClosed) {
      setNotice("This workbook day is closed. Reopen the day before adding the next outcome.");
      return;
    }
    setSaving(true);
    try {
      const result = await createDailyFocusFromSuggestion(suggestion ?? {
        detail: supportNeeded,
        href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
        mustCloseToday: focusMustClose,
        outcome,
        priority: focusPriority,
        rank: 0,
        reason: "Manually added by staff.",
        riskLevel: capacityState === "SUPPORT_NEEDED" ? "BLOCKED" : capacityState === "AT_RISK" ? "WATCH" : "NONE",
        roleFit: "DIRECT",
        sourceId: "manual",
        sourceLabel: "Manual"
      }, dailyFocus.length);
      if (result?.duplicate) {
        setNotice("This item is already in Today’s Focus.");
        setReviewingStartDay(false);
        await refreshPilotWorkbook();
        return;
      }
      if (!suggestion) {
        setFocusOutcome("");
        setSupportNeeded("");
      }
      setNotice(suggestion ? "Suggested Daily Focus added." : "Daily Focus saved.");
      setReviewingStartDay(false);
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save Daily Focus.");
    } finally {
      setSaving(false);
    }
  }

  async function reopenPilotWorkbook() {
    setSaving(true);
    try {
      const response = await fetch("/api/coo-workbook/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbookId: activeWorkbook.id })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to reopen workbook day.");
      setNotice("Workbook day reopened. You can add today's outcome now.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reopen workbook day.");
    } finally {
      setSaving(false);
    }
  }

  function chooseSuggestedOutcome(suggestion: DailyFocusSuggestion) {
    void addDailyFocus(suggestion);
  }

  function chooseManualOutcome() {
    const outcome = focusOutcome.trim();
    if (!outcome) return;
    const suggestion: DailyFocusSuggestion = {
      detail: "Designed manually during Start The Day.",
      href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
      mustCloseToday: focusMustClose,
      outcome,
      priority: focusPriority,
      rank: 0,
      reason: "Manually designed by staff.",
      riskLevel: capacityState === "SUPPORT_NEEDED" ? "BLOCKED" : capacityState === "AT_RISK" ? "WATCH" : "NONE",
      roleFit: "DIRECT",
      sourceId: `manual-${outcome.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      sourceLabel: "Manual"
    };
    setFocusOutcome("");
    chooseSuggestedOutcome(suggestion);
  }

  function beginFocusEdit(item: DailyFocusItem) {
    setEditingFocus(item);
    setEditedOutcome(item.outcome);
    setEditedPriority(item.priority);
    setEditedMustClose(item.mustCloseToday);
  }

  async function saveFocusEdit() {
    if (!editingFocus || !editedOutcome.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(editingFocus.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mustCloseToday: editedMustClose,
          outcome: editedOutcome.trim(),
          priority: editedPriority,
          replaceOutcome: true,
          riskLevel: editingFocus.riskLevel,
          riskNote: editingFocus.riskNote,
          status: "PLANNED",
          supportNeeded: editingFocus.supportNeeded
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update the Daily Focus outcome.");
      setEditingFocus(null);
      setReviewingStartDay(false);
      setNotice("Today’s focus was updated. Review the revised scope before starting the day.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update the Daily Focus outcome.");
    } finally {
      setSaving(false);
    }
  }

  async function approveDailyFocus(item: DailyFocusItem) {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveOutcome: true })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to approve the outcome.");
      setNotice(`Approved for today: ${item.outcome}`);
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to approve the outcome.");
    } finally {
      setSaving(false);
    }
  }

  async function convertDailyFocusToTask(item: DailyFocusItem) {
    if (item.convertedTaskId || dailyFocusSource(item).isOperationalRecord) return;
    if (isPilotClosed) {
      setNotice("This workbook day is closed. Reopen it before converting an outcome to a task.");
      return;
    }
    setConvertingFocusId(item.id);
    setNotice(null);
    try {
      const dueAt = new Date(`${model.boardDate}T17:00:00`);
      const description = dailyFocusTaskDetails(item, activeLabel);
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: model.advisor.id,
          boardDate: model.boardDate,
          conversionContext: {
            category: "DAILY_FOCUS",
            originText: item.outcome,
            sourceId: item.id,
            sourceKind: "COO_WORKBOOK_DAILY_FOCUS"
          },
          description,
          dueAt: dueAt.toISOString(),
          intakeMetadata: {
            channel: activeLabel,
            expectedOutcome: `${item.outcome} has a clear owner, next action, progress trail, and completion result.`,
            intakeType: "Daily Focus Task",
            requiredUpdates: ["Record progress or a blocker before end of day."]
          },
          priority: item.priority,
          requiresManagerApproval: false,
          status: "NOT_STARTED",
          title: item.outcome,
          workflowArea: inferWorkflowAreaFromText(item.outcome)
        })
      });
      const payload = await response.json().catch(() => null) as { task?: { id: string; title: string }; error?: string } | null;
      if (!response.ok || !payload?.task) throw new Error(payload?.error ?? "Unable to convert this outcome right now.");
      const linkResponse = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertedTaskId: payload.task.id })
      });
      const linkPayload = await linkResponse.json().catch(() => null) as { error?: string } | null;
      if (!linkResponse.ok) throw new Error(linkPayload?.error ?? "The task was created, but it could not be linked to this outcome.");
      setNotice(`Task created and linked: ${payload.task.title}`);
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to convert this outcome right now.");
    } finally {
      setConvertingFocusId(null);
    }
  }

  async function askForSupport() {
    const note = [
      supportNeeded.trim() || "Support requested while planning Start The Day.",
      supportOwner.trim() ? `Requested from: ${supportOwner.trim()}.` : "",
      supportBy ? `Needed by: ${supportBy}.` : ""
    ].filter(Boolean).join(" ");
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/staff-support?workbookId=${encodeURIComponent(activeWorkbook.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, requestedUpdate: false })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to ask for support.");
      setSupportNeeded("");
      setSupportOwner("");
      setSupportBy("");
      setNotice("Support request saved.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to ask for support.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmStartDay() {
    if (!dailyFocus.length) {
      setNotice("Choose at least one outcome before starting the day.");
      return;
    }
    if (capacityState === "SUPPORT_NEEDED" && !supportNeeded.trim()) {
      setNotice("Describe the support needed before confirming the plan.");
      return;
    }
    if (unapprovedFocusCount) {
      setNotice(`Review and approve the ${unapprovedFocusCount} remaining outcome${unapprovedFocusCount === 1 ? "" : "s"} before starting the day.`);
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/coo-workbook/rhythm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_CONFIRMED",
          capacityState,
          reviewedPlan: true,
          sourcePath: window.location.pathname,
          supportBy,
          supportNeeded,
          supportOwner,
          workbookId: activeWorkbook.id
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to confirm Start The Day.");
      setLocalPlanRevision(false);
      setReviewingStartDay(false);
      setNotice("Start The Day confirmed. Your plan is saved and ready for execution.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to confirm Start The Day.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="advisor-panel advisor-coo-workbook advisor-coo-effectiveness full" id="coo-effectiveness-pilot">
    <header className="advisor-coo-landing-header">
      <div>
        <strong>{activeLabel}</strong>
        <span>Start The Day: start clear, work the day, close with accountability.</span>
      </div>
    </header>

    <main className="advisor-start-day-shell" id="start-the-day">
      <header className="advisor-start-day-heading">
        <div><span>DAILY PLANNING</span><h1>Start The Day</h1><p>Build a clear plan before work begins. Review attention, choose the outcomes that matter, confirm capacity, and start execution.</p></div>
        <strong className={startConfirmed ? "confirmed" : "draft"}>{startConfirmed ? <><CheckCircle2 /> Plan confirmed</> : <><Clock3 /> Draft plan</>}</strong>
      </header>

      <section className="advisor-start-day-orientation" aria-label="Today at a glance">
        <div><small>Work date</small><strong>{new Date(`${model.boardDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}</strong></div>
        <div><small>Chosen outcomes</small><strong>{dailyFocus.length}</strong></div>
        <div><small>Must close</small><strong>{mustCloseCount}</strong></div>
        <div><small>Carryover</small><strong>{activeCarryovers.length}</strong></div>
        <Link href={scopedWorkbookHref("/vehicles/coo-workbook/bring-forward")}><small>Recover work</small><strong>{bringForwardCandidates.length}</strong></Link>
        <div><small>Last refreshed</small><strong>{dateLabel(activeWorkbook.updatedAt)}</strong></div>
      </section>

      {isPilotClosed ? <p className="advisor-coo-workspace-notice" role="status">This workbook day is closed. Reopen it before changing today&apos;s plan. <button disabled={saving} onClick={() => void reopenPilotWorkbook()} type="button">Reopen Day</button></p> : null}
      {notice ? <p className="advisor-coo-workspace-notice" role="status">{notice}</p> : null}

      <section className="advisor-start-day-section advisor-start-day-carryover" aria-labelledby="start-carryover-title">
        <header><div><span><Clock3 /></span><div><h2 id="start-carryover-title">Unfinished prior assignments</h2><p>Review carryover before accepting new commitments. Nothing is silently added to today&apos;s focus.</p></div></div><Link href={scopedWorkbookHref("/vehicles/coo-workbook/bring-forward")}>{bringForwardCandidates.length} recoverable</Link></header>
        <div className="advisor-start-day-carryover-list">
          {carryoverSuggestions.length ? carryoverSuggestions.map((item) => <article key={item.sourceId}>
            <div><strong>{item.outcome}</strong><small>{item.sourceLabel} · {item.mustCloseToday ? "confirmed for today" : "decision needed"}</small><p>{item.detail}</p></div>
            <Link href={scopedWorkbookHref(item.href)}>Review source →</Link>
            <button disabled={saving || isPilotClosed} onClick={() => chooseSuggestedOutcome(item)} type="button"><Plus /> Add to Today</button>
          </article>) : <p className="advisor-start-day-empty"><CheckCircle2 /> No unfinished prior assignments were carried into today.</p>}
        </div>
      </section>

      <section className="advisor-start-day-section advisor-start-day-attention" aria-labelledby="start-attention-title">
        <header><div><span>1</span><div><h2 id="start-attention-title">What needs your attention today?</h2><p>Source-backed recommendations ranked by urgency, promise risk, and role fit.</p></div></div><small>{attentionSuggestions.length} recommendations</small></header>
        <div className="advisor-start-day-recommendations">
          {attentionSuggestions.length ? attentionSuggestions.map((item) => <article className={dailyFocusSuggestionTone(item)} key={item.sourceId}>
            <div><strong>{item.outcome}</strong><small>{item.sourceLabel} · {item.priority.toLocaleLowerCase()}{item.mustCloseToday ? " · must close" : ""}</small><p>{item.reason}</p><Link href={scopedWorkbookHref(item.href)}>View source context →</Link></div>
            <button disabled={saving || isPilotClosed} onClick={() => chooseSuggestedOutcome(item)} title={item.detail} type="button"><Plus /> Add to Today</button>
          </article>) : <p className="advisor-start-day-empty"><CheckCircle2 /> No additional source-backed priorities need review.</p>}
        </div>
      </section>

      <section className="advisor-start-day-section advisor-start-day-outcomes" aria-labelledby="start-outcomes-title">
        <header><div><span>2</span><div><h2 id="start-outcomes-title">Choose today&apos;s outcomes</h2><p>Add every result or focus task that belongs in today&apos;s plan. Keep each outcome specific and actionable.</p></div></div><small>{dailyFocus.length} chosen</small></header>
        <div className="advisor-start-day-selected">
          {dailyFocus.length ? dailyFocus.map((item, index) => {
            const source = dailyFocusSource(item);
            return <article className={item.riskLevel.toLocaleLowerCase()} key={item.id}>
            <b>{index + 1}</b><ExpandableFocusDetails converting={convertingFocusId === item.id} disabled={saving || isPilotClosed} item={item} onConvertToTask={source.isOperationalRecord || source.href ? undefined : () => void convertDailyFocusToTask(item)} source={source} />
            <div className="advisor-start-day-outcome-actions">
              <button className={approvedFocusIds.has(item.id) ? "approved" : ""} disabled={saving || isPilotClosed || approvedFocusIds.has(item.id)} onClick={() => void approveDailyFocus(item)} type="button"><CheckCircle2 /> {approvedFocusIds.has(item.id) ? "Approved" : "Approve"}</button>
              <button disabled={saving || isPilotClosed} onClick={() => beginFocusEdit(item)} title="Edit the outcome and refine its scope." type="button"><Pencil /> Edit outcome</button>
            </div>
          </article>;
          }) : <p className="advisor-start-day-empty"><CheckCircle2 /> Add at least one meaningful outcome. Three is recommended when the day requires it.</p>}
        </div>
        {editingFocus ? <section className="advisor-start-day-focus-editor" aria-label="Edit or replace chosen outcome">
          <header><div><strong>Edit outcome {dailyFocus.findIndex((item) => item.id === editingFocus.id) + 1}</strong><small>Clarify the result that must be achieved. Saving records the revised scope.</small></div><button onClick={() => setEditingFocus(null)} type="button">Cancel</button></header>
          <div>
            <input aria-label="Edited outcome" onChange={(event) => setEditedOutcome(event.target.value)} value={editedOutcome} />
            <select aria-label="Edited priority" onChange={(event) => setEditedPriority(event.target.value as DailyFocusPriority)} value={editedPriority}>{focusPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <label><input checked={editedMustClose} onChange={(event) => setEditedMustClose(event.target.checked)} type="checkbox" /> Must close today</label>
            <button disabled={saving || !editedOutcome.trim()} onClick={() => void saveFocusEdit()} type="button"><Save /> Save scope</button>
          </div>
        </section> : null}
        <details className="advisor-start-day-manual">
          <summary>Design an outcome manually</summary>
          <div>
            <input aria-label="Daily Focus outcome" onChange={(event) => setFocusOutcome(event.target.value)} placeholder="Outcome that matters today…" value={focusOutcome} />
            <select aria-label="Priority" onChange={(event) => setFocusPriority(event.target.value as DailyFocusPriority)} value={focusPriority}>{focusPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <label><input checked={focusMustClose} onChange={(event) => setFocusMustClose(event.target.checked)} type="checkbox" /> Must close today</label>
            <button disabled={saving || isPilotClosed || !focusOutcome.trim()} onClick={chooseManualOutcome} type="button"><Plus /> Add outcome</button>
          </div>
        </details>
      </section>

      <section className="advisor-start-day-section advisor-start-day-capacity" aria-labelledby="start-capacity-title">
        <header><div><span>3</span><div><h2 id="start-capacity-title">Confirm capacity and support</h2><p>Raise constraints before they turn into missed promises.</p></div></div></header>
        <div className="advisor-start-day-capacity-options" role="radiogroup" aria-label="Capacity status">
          {([
            ["ON_TRACK", "On track", "I can deliver this plan with current capacity."],
            ["AT_RISK", "At risk", "A constraint may affect one or more outcomes."],
            ["SUPPORT_NEEDED", "Support needed", "I need help from a person or department."],
          ] as const).map(([value, label, description]) => <label className={capacityState === value ? "selected" : ""} key={value}><input checked={capacityState === value} name="capacity" onChange={() => { setCapacityState(value); setLocalPlanRevision(true); setReviewingStartDay(false); }} type="radio" value={value} /><span><strong>{label}</strong><small>{description}</small></span></label>)}
        </div>
        {capacityState !== "ON_TRACK" ? <div className="advisor-start-day-support-form">
          <input aria-label="Constraint or support needed" onChange={(event) => { setSupportNeeded(event.target.value); setLocalPlanRevision(true); }} placeholder={capacityState === "SUPPORT_NEEDED" ? "What support do you need?" : "What could put the plan at risk?"} value={supportNeeded} />
          <input aria-label="Person or department requested" onChange={(event) => { setSupportOwner(event.target.value); setLocalPlanRevision(true); }} placeholder="Person or department" value={supportOwner} />
          <input aria-label="Support needed by" onChange={(event) => { setSupportBy(event.target.value); setLocalPlanRevision(true); }} type="time" value={supportBy} />
          {capacityState === "SUPPORT_NEEDED" ? <button disabled={saving || !supportNeeded.trim()} onClick={() => void askForSupport()} type="button"><UsersRound /> Request support</button> : null}
        </div> : null}
      </section>

      {reviewingStartDay ? <section className="advisor-start-day-final-review" aria-labelledby="start-final-review-title">
        <header><div><span><ShieldCheck /></span><div><h2 id="start-final-review-title">Review Start The Day</h2><p>Confirm that the outcomes and capacity below accurately describe the plan staff is adopting.</p></div></div><small>{unapprovedFocusCount ? `${unapprovedFocusCount} need approval` : "Ready to adopt"}</small></header>
        <div className="advisor-start-day-review-list">
          {dailyFocus.map((item, index) => <article key={item.id}>
            <b>{index + 1}</b>
            <span><strong>{item.outcome}</strong><small>{item.priority.toLocaleLowerCase()} · {item.mustCloseToday ? "must close" : "flexible"} · {dailyFocusSource(item).label}</small></span>
            <em className={approvedFocusIds.has(item.id) ? "approved" : "pending"}>{approvedFocusIds.has(item.id) ? <><CheckCircle2 /> Approved</> : "Needs approval"}</em>
            <div>
              {!approvedFocusIds.has(item.id) ? <button disabled={saving || isPilotClosed} onClick={() => void approveDailyFocus(item)} type="button"><CheckCircle2 /> Approve</button> : null}
              <button disabled={saving || isPilotClosed} onClick={() => { setReviewingStartDay(false); beginFocusEdit(item); }} type="button"><Pencil /> Edit</button>
            </div>
          </article>)}
        </div>
        <footer><span><strong>Capacity</strong><small>{capacityState === "ON_TRACK" ? "On track" : capacityState === "AT_RISK" ? "At risk" : "Support needed"}{supportNeeded ? ` · ${supportNeeded}` : ""}</small></span>{unapprovedFocusCount ? <p>Approve every current outcome before adopting this plan.</p> : <p><CheckCircle2 /> All outcomes are approved. The final action records the complete plan snapshot.</p>}</footer>
      </section> : null}

      <section className="advisor-start-day-confirm" aria-labelledby="start-confirm-title">
        <div><span>4</span><div><h2 id="start-confirm-title">Review and start</h2><p>{dailyFocus.length} committed outcome{dailyFocus.length === 1 ? "" : "s"} · {mustCloseCount} must close · {activeCarryovers.length} carryover · {capacityState === "ON_TRACK" ? "capacity on track" : capacityState === "AT_RISK" ? "capacity at risk" : "support requested"}</p><small><CheckCircle2 /> Approved plans remain editable. Any revision requires a fresh review and approval.</small></div></div>
        {startConfirmed ? <Link href={scopedWorkbookHref("/vehicles/coo-workbook")}>Open Work The Day →</Link> : <div className="advisor-start-day-confirm-actions">
          {reviewingStartDay ? <button className="secondary" onClick={() => setReviewingStartDay(false)} type="button">Back to edit</button> : null}
          <button disabled={saving || isPilotClosed || !dailyFocus.length || reviewingStartDay && unapprovedFocusCount > 0} onClick={() => reviewingStartDay ? void confirmStartDay() : setReviewingStartDay(true)} type="button">{saving ? "Saving…" : reviewingStartDay ? planChangedAfterConfirmation || localPlanRevision ? "Approve Updated Plan" : "Approve & Start My Day" : "Review Start Day"}</button>
        </div>}
      </section>
    </main>

  </section>;
}

function AdvisorInbox({ compact = false, highVolume, items }: { compact?: boolean; highVolume: boolean; items: InboxItem[] }) {
  const [filter, setFilter] = useState<InboxFilter>(compact ? "NEEDS_RESPONSE" : "NEEDS_RESPONSE");
  const filtered = items.filter((item) => filter === "ALL" || filter === "NEEDS_RESPONSE" ? filter === "ALL" || item.needsResponse : item.audience === filter);
  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? items[0]?.id ?? "");
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  if (compact) {
    const needsResponse = items.filter((item) => item.needsResponse);
    const preview = needsResponse.slice(0, 3);
    return <section className="advisor-panel advisor-inbox-preview">
      <header><div><strong>Inbox</strong><span>Customer replies, team responses, and management decisions connected to repair work.</span></div><Link href={withAdvisorWorkspaceReturn("/appointments?inbox=all")}>Open inbox{needsResponse.length ? ` · ${needsResponse.length}` : ""}</Link></header>
      <div>{preview.length ? preview.map((item) => <Link href={withAdvisorWorkspaceReturn(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}#advisor-response`)} key={item.id}><span className={`advisor-inbox-audience ${item.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(item.audience)}</span><span><strong>{item.customerName} · {item.repairOrderNumber}</strong><small>{item.preview}</small></span><em>{dateLabel(item.occurredAt)}</em></Link>) : <p className="advisor-empty"><CheckCircle2 /> No conversations currently need a response.</p>}</div>
    </section>;
  }

  return <section className={`advisor-panel advisor-inbox-workspace ${highVolume ? "high-volume" : "calm"}`}>
    <header><div><strong>Unified Inbox</strong><span>Customer contact records and internal collaboration in one repair-order-safe workspace.</span></div><b>{items.filter((item) => item.needsResponse).length} need response</b></header>
    <nav className="advisor-queue-filters" aria-label="Filter advisor inbox">
      {inboxFilters.map((item) => <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}
    </nav>
    <div className="advisor-inbox-layout">
      <div className="advisor-inbox-list" role="listbox" aria-label="Advisor conversations">
        {filtered.length ? filtered.map((item) => <button aria-selected={selected?.id === item.id} className={selected?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)} role="option" type="button"><span className={`advisor-inbox-audience ${item.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(item.audience)}</span><span><strong>{item.customerName}</strong><small>{item.repairOrderNumber} · {item.channel} · {item.direction}</small><p>{item.preview}</p></span><em>{item.needsResponse ? "Needs response" : dateLabel(item.occurredAt)}</em></button>) : <p className="advisor-empty"><CheckCircle2 /> No conversations match this filter.</p>}
      </div>
      <aside className="advisor-inbox-detail" aria-live="polite">
        {selected ? <><header><span className={`advisor-inbox-audience ${selected.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(selected.audience)}</span><small>{dateLabel(selected.occurredAt)}</small></header><div><small>Repair-order context</small><h2>{selected.customerName}</h2><span>{selected.vehicleLabel} · {selected.repairOrderNumber}</span></div><section><small>Subject</small><strong>{selected.subject}</strong><p>{selected.preview}</p></section><dl><div><dt>Channel</dt><dd>{stageLabel(selected.channel)}</dd></div><div><dt>Direction</dt><dd>{stageLabel(selected.direction)}</dd></div><div><dt>Recorded by</dt><dd>{selected.authorName}</dd></div><div><dt>Transport</dt><dd>{selected.transportState === "RECORDED_CONTACT" ? "Contact recorded — external delivery not verified" : selected.transportState === "ESCALATION_RECORDED" ? "Management escalation recorded" : "Shared in repair-order workspace"}</dd></div>{selected.dueAt ? <div><dt>Response due</dt><dd>{dateLabel(selected.dueAt)}</dd></div> : null}</dl>{selected.audience === "CUSTOMER" ? <p className="advisor-inbox-boundary">SMS and email delivery require a connected communications provider. This record does not claim delivery.</p> : <p className="advisor-inbox-boundary internal">Internal content is never included in customer-facing updates.</p>}<Link href={withAdvisorWorkspaceReturn(inboxComposeHref(selected))}><Send /> {inboxActionLabel(selected)}</Link></> : <p className="advisor-empty"><CheckCircle2 /> Choose a conversation to review its repair-order context.</p>}
      </aside>
    </div>
  </section>;
}

export function ServiceAdvisorHome({ initialFilter = "ATTENTION", initialSection = "WORK", model }: { initialFilter?: AdvisorQueueFilter; initialSection?: AdvisorWorkspaceSection; model: ServiceAdvisorWorkspaceModel }) {
  const [filter, setFilter] = useState<AdvisorQueueFilter>(initialFilter);
  const [viewMode] = useState<AdvisorViewMode>("CALM");
  const [selectedActionId, setSelectedActionId] = useState(model.actionQueue[0]?.id ?? "");
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const visibleActions = model.actionQueue.filter((item) => matchesFilter(item, filter));
  const selectedAction = visibleActions.find((item) => item.id === selectedActionId) ?? visibleActions[0] ?? null;
  const primaryAction = model.actionQueue.find((item) => matchesFilter(item, "ATTENTION")) ?? model.actionQueue[0] ?? null;

  function moveSelection(direction: -1 | 1) {
    if (!visibleActions.length) return;
    const currentIndex = Math.max(0, visibleActions.findIndex((item) => item.id === selectedAction?.id));
    const nextIndex = Math.min(visibleActions.length - 1, Math.max(0, currentIndex + direction));
    setSelectedActionId(visibleActions[nextIndex].id);
  }

  return (
    <section className={`advisor-workspace-home advisor-workspace-simplified ${viewMode === "HIGH_VOLUME" ? "advisor-mode-high-volume" : "advisor-mode-calm"}`}>
      <header className="advisor-hero advisor-hero-simplified">
        <div>
          <p>Service Advisor Workspace</p>
          <h1>Welcome, {firstName}. Start with the next customer need.</h1>
          <span>Your queue is already prioritized. Open the first action, check in a vehicle, or search when a customer is in front of you.</span>
        </div>
        <div className="advisor-hero-controls">
          <Link className="advisor-check-in-primary" href={withAdvisorWorkspaceReturn("/vehicles/repair-orders?intakeSource=WALK_IN")}><ClipboardCheck /> Check In Vehicle</Link>
        </div>
      </header>

      <section className="advisor-command-center" aria-label="Today’s first action">
        <article className={`advisor-next-action ${primaryAction ? actionTone(primaryAction.actionKind) : "ready"}`}>
          <small>Start here</small>
          {primaryAction ? <>
            <span className="advisor-action-type">{primaryAction.overdue ? <AlertTriangle /> : primaryAction.actionKind === "PARTS_DELAY" ? <PackageCheck /> : <MessageSquareText />}{primaryAction.actionLabel}</span>
            <h2>{primaryAction.customerName} · {primaryAction.vehicleLabel}</h2>
            <p>{primaryAction.actionReason}</p>
            <div>
              <span>{primaryAction.repairOrderNumber} · {stageLabel(primaryAction.stage)}</span>
              <em>{primaryAction.overdue ? "Overdue" : dateLabel(primaryAction.targetAt)}</em>
            </div>
            <Link href={withAdvisorWorkspaceReturn(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(primaryAction.id)}`)}><Send /> {actionButton(primaryAction.actionKind)}</Link>
          </> : <>
            <h2>No urgent customer action is waiting.</h2>
            <p>Use search or check in the next customer when they arrive.</p>
            <Link href={withAdvisorWorkspaceReturn("/vehicles/repair-orders?intakeSource=WALK_IN")}><ClipboardCheck /> Check In Vehicle</Link>
          </>}
        </article>

        <form action="/vehicles/repair-orders" className="advisor-search-panel advisor-search-form" method="get" aria-label="Find or check in a customer or vehicle">
          <Search />
          <label>
            <strong>Find customer, vehicle, appointment, VIN, phone, or RO</strong>
            <input aria-label="Search customer, vehicle, appointment, VIN, phone, or repair order" name="search" placeholder="Start typing a name, phone, VIN, plate, appointment, or RO…" type="search" />
          </label>
          <input name="intakeSource" type="hidden" value="WALK_IN" />
          <input name="returnTo" type="hidden" value={advisorWorkspaceReturnTo} />
          <button type="submit">Search <Search /></button>
        </form>
      </section>

      <section className="advisor-focus-counters" aria-label="Advisor operating snapshot">
        <a href="#arrival-queue">
          <CalendarClock />
          <span>Arriving today</span>
          <strong>{model.counts.todaysArrivals}</strong>
          <small>{model.counts.todaysArrivals ? "Review today’s arrivals" : "All arrivals handled"}</small>
        </a>
        <button className={filter === "ATTENTION" ? "active" : ""} onClick={() => setFilter("ATTENTION")} type="button">
          <MessageSquareText />
          <span>Needs me now</span>
          <strong>{model.counts.needsAttention}</strong>
          <small>Customer-facing next actions</small>
        </button>
        <button className={filter === "WAITING" ? "active" : ""} onClick={() => setFilter("WAITING")} type="button">
          <Clock3 />
          <span>Waiting on others</span>
          <strong>{model.counts.waitingOnOthers}</strong>
          <small>Technician, parts, or follow-up</small>
        </button>
      </section>

      {initialSection === "INBOX" ? <AdvisorInbox highVolume={viewMode === "HIGH_VOLUME"} items={model.inbox} /> : <>
      <section className="advisor-panel advisor-action-queue advisor-priority-queue">
        <header>
          <div>
            <strong>{filter === "WAITING" ? "Waiting on others" : filter === "AUTHORIZATION" ? "Customer approvals" : "My next actions"}</strong>
            <span>Sorted by urgency and promise time. Each repair order appears once.</span>
          </div>
          <Link href={withAdvisorWorkspaceReturn("/vehicles/repair-workbench?view=all")}>All repair orders</Link>
        </header>
        <nav className="advisor-queue-filters" aria-label="Filter advisor actions">
          {filters.map((item) => (
            <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>
          ))}
        </nav>
        {viewMode === "CALM" ? <div>
          {visibleActions.length ? visibleActions.map((item) => (
            <Link className={`advisor-action-card ${actionTone(item.actionKind)}`} href={withAdvisorWorkspaceReturn(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`)} key={`${item.actionKind}-${item.id}`}>
              <span className="advisor-action-type">{item.overdue ? <AlertTriangle /> : item.actionKind === "PARTS_DELAY" ? <PackageCheck /> : <MessageSquareText />}{item.actionLabel}</span>
              <span>
                <strong>{item.customerName} <i>·</i> {item.vehicleLabel}</strong>
                <small>{item.repairOrderNumber} · {stageLabel(item.stage)}</small>
                <span>{item.actionReason}</span>
                {item.latestAdvisorUpdate ? <small>Last note: {item.latestAdvisorUpdate.summary}</small> : null}
              </span>
              <em>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</em>
              <b><Send /> {actionButton(item.actionKind)}</b>
            </Link>
          )) : (
            <p className="advisor-empty"><CheckCircle2 /> Nothing in this view needs attention. Choose another filter or continue with the next customer.</p>
          )}
        </div> : <div className="advisor-high-volume-layout">
          <div
            aria-label="High-volume advisor action list"
            className="advisor-high-volume-list"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); moveSelection(1); }
              if (event.key === "ArrowUp") { event.preventDefault(); moveSelection(-1); }
            }}
            role="listbox"
            tabIndex={0}
          >
            {visibleActions.length ? visibleActions.map((item) => (
              <button aria-selected={selectedAction?.id === item.id} className={`${actionTone(item.actionKind)} ${selectedAction?.id === item.id ? "selected" : ""}`} key={`${item.actionKind}-${item.id}`} onClick={() => setSelectedActionId(item.id)} role="option" type="button">
                <span className="advisor-high-volume-status">{item.overdue ? <AlertTriangle /> : <MessageSquareText />}{item.actionLabel}</span>
                <span><strong>{item.customerName}</strong><small>{item.repairOrderNumber} · {item.vehicleLabel}</small></span>
                <span><b>{item.overdue ? "Overdue" : dateLabel(item.targetAt)}</b><small>{stageLabel(item.stage)}</small></span>
              </button>
            )) : <p className="advisor-empty"><CheckCircle2 /> Nothing in this view needs attention.</p>}
          </div>
          <aside className="advisor-action-preview" aria-live="polite">
            {selectedAction ? <>
              <header>
                <span className={`advisor-action-type ${actionTone(selectedAction.actionKind)}`}>{selectedAction.actionLabel}</span>
                <small>{selectedAction.overdue ? "Promise or target is overdue" : `Target ${dateLabel(selectedAction.targetAt)}`}</small>
              </header>
              <div>
                <p>Selected repair order</p>
                <h2>{selectedAction.customerName}</h2>
                <span>{selectedAction.vehicleLabel} · {selectedAction.repairOrderNumber}</span>
              </div>
              <section>
                <small>Why it needs attention</small>
                <strong>{selectedAction.actionReason}</strong>
              </section>
              <section>
                <small>Recommended next step</small>
                <strong>{selectedAction.nextAction}</strong>
              </section>
              {selectedAction.latestAdvisorUpdate ? <section><small>Last advisor note</small><strong>{selectedAction.latestAdvisorUpdate.summary}</strong></section> : null}
              <Link href={withAdvisorWorkspaceReturn(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selectedAction.id)}`)}><Send /> {actionButton(selectedAction.actionKind)}</Link>
              <footer>Use ↑ and ↓ while the queue is focused to review the next item.</footer>
            </> : <p className="advisor-empty"><CheckCircle2 /> Select another filter to review advisor work.</p>}
          </aside>
        </div>}
      </section>

      <div className="advisor-support-grid">
        <AdvisorInbox compact highVolume={false} items={model.inbox} />

        <section className={`advisor-panel advisor-arrivals advisor-arrivals-compact ${model.appointments.length ? "" : "is-empty"}`} id="arrival-queue">
          <header>
            <div>
              <strong>{model.appointments.length ? "Arrivals" : "Arrivals clear"}</strong>
              <span>{model.appointments.length ? "Confirm before creating repair work." : "No appointment arrivals are waiting."}</span>
            </div>
            <Link href={withAdvisorWorkspaceReturn("/appointments?view=board")}>Appointment board</Link>
          </header>
          {model.appointments.length ? <div>
            {model.appointments.map((appointment) => (
              <article key={appointment.id}>
                <time>{timeLabel(appointment.startsAt)}</time>
                <span>
                  <strong>{appointment.customerName}</strong>
                  <small>{appointment.vehicleLabel} · {appointment.appointmentNumber}</small>
                  <small>{appointment.phoneNumber ?? appointment.email ?? appointment.title}</small>
                </span>
                <Link href={withAdvisorWorkspaceReturn(`/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=${encodeURIComponent(appointment.id)}`)}>Check in</Link>
              </article>
            ))}
          </div> : <p className="advisor-arrivals-clear"><CheckCircle2 /> You’re caught up on arrivals.</p>}
        </section>
      </div>

      <footer className="advisor-calm-footer">
        <CheckCircle2 />
        <span><strong>Stay customer-centered.</strong> Confirm the concern, make only a supportable promise, and leave every repair order with a clear owner and next update.</span>
        <Link href={withAdvisorWorkspaceReturn("/customers")}><UsersRound /> Find customer</Link>
      </footer>
      </>}
    </section>
  );
}
