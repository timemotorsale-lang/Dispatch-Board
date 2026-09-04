"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Save,
  Undo2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";
import { ChecklistReminderField } from "./checklist-reminder-field";
import { ExpandableFocusDetails } from "./expandable-focus-details";
import { WorkbookAppointmentFlow } from "./workbook-appointment-flow";
import { QuickUpdateEditor } from "./quick-update-editor";
import { CrmContactImport } from "./crm-contact-import";

type Action = ServiceAdvisorWorkspaceModel["actionQueue"][number];
type InboxItem = ServiceAdvisorWorkspaceModel["inbox"][number];
export type AdvisorQueueFilter = "ATTENTION" | "ALL" | Action["actionKind"] | "WAITING";
type AdvisorViewMode = "CALM" | "HIGH_VOLUME";
type AdvisorWorkspaceSection = "COO_WORKBOOK" | "INBOX" | "WORK";
type WorkbookViewMode = "COO" | "MY";
type InboxFilter = "ALL" | InboxItem["audience"] | "NEEDS_RESPONSE";

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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

function repairOrderWorkbookHref(repairOrderId: string) {
  return `/vehicles/repair-workbench?${new URLSearchParams({
    repairOrderId,
    returnLabel: "Daily Workbook",
    returnTo: "/vehicles/coo-workbook"
  }).toString()}`;
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

function cooTaskIntakeHref(input: { brief: string; dueAt?: string; expectedOutcome: string; title: string; vehicleReference?: string }) {
  const due = taskDateParts(input.dueAt);
  const params = new URLSearchParams({
    brief: input.brief,
    dueDate: due.date,
    dueTime: due.time,
    expectedOutcome: input.expectedOutcome,
    intakeType: "Manager Decision",
    returnTo: "/vehicles/coo-workbook",
    title: input.title,
    workflowArea: "GENERAL_MANAGER"
  });
  if (input.vehicleReference) params.set("vehicleReference", input.vehicleReference);
  return `/tasks/intake?${params.toString()}`;
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
type DailyChecklistStatus = DailyChecklistItem["status"];
type QuickUpdateCategory = QuickUpdateItem["category"];
type ReportCadence = "DAILY" | "WEEKLY" | "MONTHLY";
type DailyFocusItem = WorkdayWorkbookModel["dailyFocusItems"][number];
type DailyFocusStatus = DailyFocusItem["status"];
type DailyFocusPriority = DailyFocusItem["priority"];
type DailyFocusRisk = DailyFocusItem["riskLevel"];
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
type CloseStepView = "DONE" | "TOMORROW" | "DRAFT";
type CommandCardView = "CLOSE" | "ATTENTION" | "WORK" | "REPORT";
type MoreToolCard = { description: string; href: string; icon: typeof ClipboardCheck; outcome: string; title: string; whenToUse: string };
type WorkflowPhaseKey = "START" | "WORK" | "END";
type WorkflowPhaseAction = { detail: string; href: string; icon: typeof ClipboardCheck; key: WorkflowPhaseKey; onSelect?: never; title: string } | { detail: string; href?: never; icon: typeof ClipboardCheck; key: WorkflowPhaseKey; onSelect: () => void; title: string };
type ContextRecommendation = { description: string; href: string; onSelect?: never; phase: WorkflowPhaseKey; title: string } | { description: string; href?: never; onSelect: () => void; phase: WorkflowPhaseKey; title: string };
type WorkbookResumeSource = "checklist" | "quick" | "focus" | "reportSeed";
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
  title: string;
  tone: string;
};
export type CooWorkbookTool = "CHECKLIST" | "TO_DO_LIST" | "QUICK_UPDATE" | "ACTION_PLAN" | "CARRYOVER" | "REPORT_SEEDS" | "STAFF_SUPPORT" | "DRAFTS" | "MORE_TOOLS";

const quickUpdateCategories: Array<{ label: string; value: QuickUpdateCategory }> = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Vendor", value: "VENDOR" },
  { label: "Facility", value: "FACILITY" },
  { label: "Staff", value: "STAFF" },
  { label: "Sales / Opportunity", value: "SALES_OPPORTUNITY" },
  { label: "Finance", value: "FINANCE" },
  { label: "Inventory / Parts", value: "INVENTORY_PARTS" },
  { label: "Safety", value: "SAFETY" },
  { label: "Training", value: "TRAINING" },
  { label: "Other", value: "OTHER" }
];

const focusPriorities: Array<{ label: string; value: DailyFocusPriority }> = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" }
];

const focusRiskLevels: Array<{ label: string; value: DailyFocusRisk }> = [
  { label: "None", value: "NONE" },
  { label: "Watch", value: "WATCH" },
  { label: "Blocked", value: "BLOCKED" }
];

const focusStatuses: Array<{ label: string; value: DailyFocusStatus }> = [
  { label: "Planned", value: "PLANNED" },
  { label: "Done", value: "DONE" },
  { label: "Carry over", value: "CARRY_OVER" }
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

function dailyFocusSuggestionTone(suggestion: DailyFocusSuggestion) {
  if (suggestion.riskLevel === "BLOCKED" || suggestion.priority === "CRITICAL") return "red";
  if (suggestion.riskLevel === "WATCH" || suggestion.priority === "HIGH" || suggestion.mustCloseToday) return "yellow";
  return "blue";
}

export function CooDailyWorkbook({ compact = false, closedRepairOrderId = null, initialTool = null, model }: { compact?: boolean; closedRepairOrderId?: string | null; initialTool?: CooWorkbookTool | null; model: ServiceAdvisorWorkspaceModel }) {
  const [workbookView, setWorkbookView] = useState<WorkbookViewMode>(model.workspace.canUseManagementWorkbook ? "COO" : "MY");
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
  const [quickUpdateFollowUp, setQuickUpdateFollowUp] = useState(false);
  const [quickUpdateDueWindow, setQuickUpdateDueWindow] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [supportUpdateRequested, setSupportUpdateRequested] = useState(true);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [commandView, setCommandView] = useState<CommandCardView | null>(null);
  const [closeStepNotice, setCloseStepNotice] = useState<string | null>(null);
  const [closeStepInProgress, setCloseStepInProgress] = useState<"carryover" | "draft" | null>(null);
  const [closeStepView, setCloseStepView] = useState<CloseStepView>("DONE");
  const [closeDraftExpanded, setCloseDraftExpanded] = useState(false);
  const [closeDraftSectionExpanded, setCloseDraftSectionExpanded] = useState<Record<string, boolean>>({});
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const actionQueue = closedRepairOrderId
    ? model.actionQueue.filter((item) => item.id !== closedRepairOrderId)
    : model.actionQueue;
  const dailyPursePendingWork = actionQueue.map((item) => ({
    detail: `${item.repairOrderNumber} · ${item.vehicleLabel} · ${item.actionReason}`,
    href: repairOrderWorkbookHref(item.id),
    id: `${item.actionKind}-${item.id}`,
    title: item.actionLabel
  }));
  const approvalCount = actionQueueCount(actionQueue, "AUTHORIZATION");
  const reportExceptions = actionQueue.filter((item) => matchesFilter(item, "ATTENTION") || matchesFilter(item, "WAITING")).length;
  const staffWorkbookLabel = model.workspace.staffWorkbookLabel;
  const managementWorkbookLabel = model.workspace.managementWorkbookLabel;
  const canUseManagementWorkbook = model.workspace.canUseManagementWorkbook;
  const effectiveWorkbookView: WorkbookViewMode = canUseManagementWorkbook ? workbookView : "MY";
  const activeWorkbook = effectiveWorkbookView === "MY" ? staffWorkbook : workbook;
  const activeWorkbookLabel = effectiveWorkbookView === "MY" ? staffWorkbookLabel : managementWorkbookLabel;
  const checklistItems = activeWorkbook.checklistItems;
  const quickUpdates = activeWorkbook.quickUpdates;
  const reportSeeds = activeWorkbook.reportSeeds;
  const latestReportDraft = activeWorkbook.reportDrafts[0] ?? null;
  const carryovers = activeWorkbook.carryovers;
  const supportActions = activeWorkbook.supportActions;
  const isClosed = activeWorkbook.status === "CLOSED";
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
  const planTaskHref = cooTaskIntakeHref({
    brief: `Create the ${activeWorkbookLabel} daily action plan from ${actionQueue.length} active repair order signal(s), ${approvalCount} approval review item(s), and ${reportExceptions} unresolved risk/carryover item(s).`,
    dueAt: model.generatedAt,
    expectedOutcome: "The COO daily action plan is reviewed, prioritized, assigned, and ready to support the end-of-day operations report.",
    title: `Create ${activeWorkbookLabel} daily action plan`
  });
  const supportSignals = closeReadiness.checklistNeedsSupport + closeReadiness.quickFollowUps + reportExceptions;
  const buildSearchText = (...parts: Array<string | number | null | undefined | string[]>) => parts.flatMap((part) => Array.isArray(part) ? part : [part]).filter((part): part is string | number => part !== null && part !== undefined && String(part).trim().length > 0).join(" ").toLocaleLowerCase();
  const attentionItems = [
    ...actionQueue.slice(0, 4).map((item) => ({
      action: actionButton(item.actionKind),
      context: `${item.customerName} · ${item.repairOrderNumber} · ${item.vehicleLabel}`,
      description: item.actionReason,
      href: repairOrderWorkbookHref(item.id),
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
      href: repairOrderWorkbookHref(item.id),
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
      title: `Review ${workSearchQuery.trim().slice(0, 70)}`,
      vehicleReference: workSearchQuery.trim()
    })
    : "";
  const commandCards = [
    {
      icon: CheckCircle2,
      key: "CLOSE" as const,
      label: "Daily Close",
      meta: closeReadinessLabel(closeReadiness.tone),
      stat: `${closeReadiness.score}/100`,
      tone: closeReadiness.tone === "READY" ? "green" : closeReadiness.tone === "SUPPORT" ? "yellow" : "blue"
    },
    {
      icon: AlertTriangle,
      key: "ATTENTION" as const,
      label: "Needs Attention",
      meta: supportSignals ? "Review now" : "Clear",
      stat: supportSignals,
      tone: supportSignals ? "red" : "green"
    },
    {
      icon: ListChecks,
      key: "WORK" as const,
      label: "Today’s Work",
      meta: `${todayWorkRollup.done} done`,
      stat: `${todayWorkRollup.total} items`,
      tone: "blue"
    },
    {
      icon: FileText,
      key: "REPORT" as const,
      label: "Report Ready",
      meta: latestReportDraft ? `Draft v${latestReportDraft.version}` : "Draft ready",
      stat: `${reportSeedRollup.active} seeds`,
      tone: latestReportDraft ? "green" : "blue"
    }
  ];
  const activeCommandView = commandView ?? "CLOSE";
  const commandDetailItems = activeCommandView === "CLOSE"
    ? closeReadiness.prompts.slice(0, 5).map((prompt, index) => ({ action: index === 0 ? "Open close" : "Review", detail: closeReadinessLabel(closeReadiness.tone), href: "#close-report", id: `close-${index}`, title: prompt }))
    : activeCommandView === "ATTENTION"
      ? attentionItems.map((item) => ({ action: item.action, detail: item.context, href: item.href, id: item.id, title: item.title }))
      : activeCommandView === "WORK"
        ? [
          ...activeWorkbook.dailyFocusItems.slice(0, 3).map((item) => ({ action: item.status === "DONE" ? "Done" : "Update", detail: item.progressUpdate || item.supportNeeded || item.riskNote || `${item.priority.toLocaleLowerCase()} priority`, href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day", id: `work-focus-${item.id}`, title: item.outcome })),
          ...checklistItems.slice(0, 4).map((item) => ({ action: item.done ? "Done" : "Update", detail: latestChecklistUpdateText(item) || checklistStatusLabel(item), href: "/vehicles/coo-workbook/checklist", id: `work-checklist-${item.id}`, title: item.text })),
          ...quickUpdates.slice(0, 2).map((item) => ({ action: item.followUpNeeded ? "Follow up" : "Review", detail: quickUpdateCategoryLabel(item.category), href: "/vehicles/coo-workbook/quick-update", id: `work-quick-${item.id}`, title: item.text }))
        ].slice(0, 6)
        : latestReportDraft
          ? latestReportDraft.sections.flatMap((section) => section.items.map((item) => ({ action: "Open draft", detail: section.title, href: "/vehicles/coo-workbook/drafts", id: `draft-${section.title}-${item.sourceId}-${item.title}`, title: item.title }))).slice(0, 5)
          : reportSeeds.filter((seed) => seed.status !== "EXCLUDED").slice(0, 5).map((seed) => ({ action: reportSeedStatusLabel(seed.status), detail: reportSeedSourceLabel(seed), href: "/vehicles/coo-workbook/report-seeds", id: `seed-${seed.id}`, title: seed.title }));
  const commandDetailTitle = commandCards.find((card) => card.key === activeCommandView)?.label ?? "Daily Close";
  const commandDetailHelp = activeCommandView === "CLOSE"
    ? "Review what must be cleaned up before the day is closed."
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
  const closeReviewItems = [
    ...activeDailyFocusItems.map((item) => ({
      detail: item.progressUpdate || item.supportNeeded || item.riskNote || (item.status === "DONE" ? "Completed today." : "Needs update or close decision."),
      href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : cooTaskIntakeHref({
        brief: item.progressUpdate || item.supportNeeded || item.riskNote || `Review this Daily Focus item and record whether it is done, needs support, should become a task, or should carry over: ${item.outcome}`,
        dueAt: model.generatedAt,
        expectedOutcome: "This Daily Focus item has a clear owner, status, next action, and close decision.",
        title: item.outcome
      }),
      id: `focus-${item.id}`,
      status: item.status === "DONE" ? "Done" : item.status === "CARRY_OVER" ? "Carry over" : "Not done",
      title: item.outcome,
      toolLabel: item.convertedTaskId ? "Open task" : "Create task"
    })),
    ...checklistItems.map((item) => ({
      detail: latestChecklistUpdateText(item) || checklistStatusLabel(item),
      href: "/vehicles/coo-workbook/checklist",
      id: `checklist-${item.id}`,
      status: item.done ? "Done" : "Not done",
      title: item.text,
      toolLabel: "Open checklist"
    }))
  ].slice(0, 8);
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
    ...activeCarryovers.map((item) => ({
      action: "open" as const,
      detail: item.detail,
      href: item.sourceHref ?? "/vehicles/coo-workbook/carryover",
      id: `carryover-${item.id}`,
      status: item.status === "CONFIRMED" ? "Confirmed" : item.status === "CONVERTED" ? "Task created" : "Carryover",
      title: item.title,
      toolLabel: item.sourceHref ? "Open source" : "Open carryover"
    }))
  ].slice(0, 8);
  const draftPreviewItems = latestReportDraft
    ? latestReportDraft.sections.flatMap((section) => section.items.map((item) => ({
      detail: item.detail,
      id: `draft-${section.title}-${item.sourceId}-${item.title}`,
      section: section.title,
      title: item.title
    }))).slice(0, 8)
    : reportSeeds.filter((seed) => seed.status !== "EXCLUDED").slice(0, 8).map((seed) => ({
      detail: seed.detail,
      id: `seed-${seed.id}`,
      section: reportSeedStatusLabel(seed.status),
      title: seed.title
    }));
  const latestReportDraftItemCount = latestReportDraft?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0;
  const staffSupportQueue = [...staffWorkbookSummaries]
    .filter((item) => item.closeReadinessTone !== "READY" || item.redYellowItemCount > 0 || item.followUpNeededCount > 0 || item.carryoverCount > 0)
    .sort((left, right) => {
      const leftSupport = left.redYellowItemCount + left.followUpNeededCount + left.carryoverCount;
      const rightSupport = right.redYellowItemCount + right.followUpNeededCount + right.carryoverCount;
      return rightSupport - leftSupport || left.closeReadinessScore - right.closeReadinessScore || left.staffName.localeCompare(right.staffName);
    })
    .slice(0, 5);
  const toolCards = [
    { description: `${checklistRollup.open} open · ${checklistRollup.done} done`, href: "/vehicles/coo-workbook/checklist", icon: CheckSquare, title: "Daily Checklist" },
    { description: "Light list that can become tasks", href: "/vehicles/coo-workbook/to-do-list", icon: ClipboardList, title: "To-Do List" },
    { description: `${quickUpdateRollup.total} captured today`, href: "/vehicles/coo-workbook/quick-update", icon: MessageSquareText, title: "Quick Update" },
    { description: "Create or assign today’s priorities", href: "/vehicles/coo-workbook/action-plan", icon: ClipboardCheck, title: "Daily Action Plan" },
    { description: `${closeReadiness.carryoverItems} tomorrow-facing item(s)`, href: "/vehicles/coo-workbook/carryover", icon: CalendarClock, title: "Carryover" },
    { description: `${reportSeedRollup.reviewed}/${reportSeedRollup.total} reviewed`, href: "/vehicles/coo-workbook/report-seeds", icon: FileText, title: "Report Seeds" },
    { description: `${staffTodayRollup.support} need support · ${staffTodayRollup.ready} ready`, href: "/vehicles/coo-workbook/staff-support", icon: UsersRound, title: "Staff Support" },
    { description: latestReportDraft ? `Saved ${dateLabel(latestReportDraft.generatedAt)}` : "No draft saved yet", href: "/vehicles/coo-workbook/drafts", icon: Clock3, title: "Drafts" }
  ];
  const moreToolCards: MoreToolCard[] = [
    { description: "Rank urgent promises, blockers, and follow-ups before the day gets crowded.", href: "/vehicles/coo-workbook/action-plan", icon: AlertTriangle, outcome: "A short ordered action list for the work that matters most.", title: "Priority Triage", whenToUse: "Use when several issues are competing for attention." },
    { description: "Review Quick Updates and follow-up dates so nothing important drifts.", href: "/vehicles/coo-workbook/quick-update", icon: CalendarClock, outcome: "Follow-ups have a person, note, and date window.", title: "Follow-Up Center", whenToUse: "Use after customer, vendor, parts, or facility updates." },
    { description: "Escalate blocked work and connect it to support before close.", href: "/vehicles/coo-workbook/staff-support", icon: AlertTriangle, outcome: "Manager support is requested with context instead of a vague blocker.", title: "Blocker Escalation", whenToUse: "Use when work is red, blocked, or waiting on a decision." },
    { description: "Review promises and customer commitments that may need protection.", href: "/vehicles/coo-workbook/action-plan", icon: ShieldCheck, outcome: "Promise risks become visible before they become missed commitments.", title: "Promise Tracker", whenToUse: "Use when promised or target times need review." },
    { description: "Ask for or record manager help without turning the day into paperwork.", href: "/vehicles/coo-workbook/staff-support", icon: UsersRound, outcome: "Support requests are captured for accountability and coaching.", title: "Manager Help Request", whenToUse: "Use when staff need help, clarity, approval, or removal of a blocker." },
    { description: "Capture a coaching opportunity, process gap, or training need from the day.", href: "/vehicles/coo-workbook/quick-update", icon: MessageSquareText, outcome: "Training moments become useful context for staff development.", title: "Training Moment Capture", whenToUse: "Use when repeated confusion or a learning opportunity appears." },
    { description: "Record a win, lesson, or useful improvement that should not be lost.", href: "/vehicles/coo-workbook/quick-update", icon: CheckCircle2, outcome: "Good habits and useful lessons show up in reports and coaching.", title: "Daily Win / Learning", whenToUse: "Use when someone solved a problem or learned something worth repeating." },
    { description: "Prepare unfinished work for tomorrow with clear ownership and context.", href: "/vehicles/coo-workbook/carryover", icon: CalendarClock, outcome: "Tomorrow starts with cleaner carryover instead of rediscovery.", title: "Smart Carryover Builder", whenToUse: "Use when work cannot be completed today." },
    { description: "Review source-backed items that may belong in the report.", href: "/vehicles/coo-workbook/report-seeds", icon: FileText, outcome: "The report is built from reviewed signals, not noisy raw logs.", title: "Report Seeds", whenToUse: "Use before generating daily, weekly, or monthly summaries." },
    { description: "Close the day through work review, carryover, and report preparation.", href: "/vehicles/coo-workbook/drafts", icon: ClipboardList, outcome: "The day ends cleanly with a manager-ready draft and tomorrow setup.", title: "End-of-Day Assistant", whenToUse: "Use near close or when the daily report is ready to finalize." }
  ];
  const hasReportDraftBlocker = activeWorkbook.governance.closeBlockers.some((prompt) => prompt.toLocaleLowerCase().includes("report draft"));
  const hasOpenCarryoverBlocker = (activeWorkbook.governance.dispositionCounts?.unconfirmedCarryovers ?? 0) > 0;
  const needsAttentionRecommendation = "Review needs-attention work before ending the day.";
  const endTheDayDisplayScore = Math.min(activeWorkbook.governance.endTheDayEligibilityScore ?? closeReadiness.score, closeReadiness.score);
  const contextRecommendation: ContextRecommendation = activeWorkbook.governance.currentPhase === "START"
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
      detail: `${endTheDayDisplayScore}/100 ready · ${closeReadiness.carryoverItems} carryover`,
      href: "#close-report",
      icon: FileText,
      key: "END" as const,
      title: "End The Day"
    }
  ];

  function openWorkbookTool(toolPath: string) {
    if (typeof window === "undefined") return;
    window.location.href = `${toolPath}${window.location.search}`;
  }

  async function refreshWorkbook() {
    const response = await fetch("/api/coo-workbook");
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
    }
  }

  async function addQuickUpdate() {
    const text = quickUpdateText.trim();
    if (!text) return;
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before saving Quick Updates.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/quick-updates" : "quick-updates"}?date=${encodeURIComponent(model.boardDate)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: quickUpdateCategory, company: quickUpdateCompany, dueWindow: quickUpdateDueWindow, followUpNeeded: quickUpdateFollowUp, person: quickUpdatePerson, phoneNumber: quickUpdatePhone, text })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save Quick Update.");
      setQuickUpdateText("");
      setQuickUpdateCategory("OTHER");
      setQuickUpdatePerson("");
      setQuickUpdatePhone("");
      setQuickUpdateCompany("");
      setQuickUpdateFollowUp(false);
      setQuickUpdateDueWindow("");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`Quick Update saved to ${activeWorkbookLabel}.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to save Quick Update.");
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
        window.location.href = `/tasks/${encodeURIComponent(payload.task.id)}?view=simple&returnTo=${encodeURIComponent("/vehicles/coo-workbook")}`;
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
      setCloseStepView("TOMORROW");
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
        : await fetch(`/api/coo-workbook/close?date=${encodeURIComponent(model.boardDate)}&scope=${effectiveWorkbookView === "MY" ? "STAFF" : "COO"}`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { carryoverCount?: number; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update workbook close status.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(isClosed ? "Workbook day reopened." : `Workbook day closed with ${payload?.carryoverCount ?? 0} carryover item(s).`);
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
      setCloseStepView("DRAFT");
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
      MORE_TOOLS: "More Tools"
    };

    return <section className={`advisor-panel advisor-coo-workbook advisor-coo-tool-page ${compact ? "compact" : "full"}`} id="coo-workbook-tool">
      <header className="advisor-coo-tool-page-header">
        <div>
          <Link href="/vehicles/coo-workbook">← {activeWorkbookLabel}</Link>
          <strong>{toolLabels[initialTool]}</strong>
          <span>{activeWorkbookLabel} focused workspace. Finish the action here, then return to the landing page.</span>
        </div>
        <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
          {canUseManagementWorkbook ? <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> {managementWorkbookLabel}</button> : null}
          <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> {staffWorkbookLabel}</button>
        </nav>
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
            <Link href="/vehicles/coo-workbook/checklist">Open Daily Checklist</Link>
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
            {quickUpdateCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input aria-label="Person involved" disabled={isClosed} onChange={(event) => setQuickUpdatePerson(event.target.value)} placeholder="Person" value={quickUpdatePerson} />
          <input aria-label="Phone number" disabled={isClosed} inputMode="tel" onChange={(event) => setQuickUpdatePhone(event.target.value)} placeholder="Phone number" value={quickUpdatePhone} />
          <input aria-label="Company or outside party" disabled={isClosed} onChange={(event) => setQuickUpdateCompany(event.target.value)} placeholder="Company / outside party" value={quickUpdateCompany} />
        </div>
        <div className="advisor-coo-followup-row">
          <label><input checked={quickUpdateFollowUp} disabled={isClosed} onChange={(event) => setQuickUpdateFollowUp(event.target.checked)} type="checkbox" /> Follow-up needed</label>
          <input aria-label="Follow-up date" disabled={isClosed || !quickUpdateFollowUp} min={model.boardDate} onChange={(event) => setQuickUpdateDueWindow(event.target.value)} type="date" value={quickUpdateDueWindow} />
          <button disabled={saving || isClosed || !quickUpdateText.trim()} onClick={() => void addQuickUpdate()} type="button"><Save /> Save update</button>
        </div>
        <div className="advisor-coo-update-list">
          {quickUpdates.length ? quickUpdates.map((item) => <article id={`source-${item.id}`} key={item.id}>
            <span><strong>{quickUpdateCategoryLabel(item.category)}</strong>{" · "}<small>{dateLabel(item.createdAt)}</small></span>
            <QuickUpdateEditor item={item} categories={quickUpdateCategories} disabled={isClosed} onSaved={refreshActiveWorkbook} />
            <CrmContactImport disabled={isClosed} sourceId={item.id} sourceKind="Quick Update" sourceText={item.text} person={item.person} phoneNumber={item.phoneNumber} company={item.company} followUpDate={item.followUpNeeded ? item.dueWindow : ""} />
            <p>{item.text}</p>
            {item.intelligence ? <small>{item.intelligence.signalLabel} · impact {item.intelligence.impactScore}/100 · {item.intelligence.confidence.toLocaleLowerCase()} confidence · {item.intelligence.recommendedAction}</small> : null}
            <small>{[item.person, item.phoneNumber, item.company, item.followUpNeeded ? `Follow-up: ${item.dueWindow || "needed"}` : "", item.carryoverReady ? "Carryover ready" : ""].filter(Boolean).join(" · ") || "No extra details"}</small>
            {item.followUpNeeded && /^\d{4}-\d{2}-\d{2}$/.test(item.dueWindow) ? <Link href={`/appointments?section=today&localDate=${encodeURIComponent(item.dueWindow)}`}>Open daily schedule · {item.dueWindow}</Link> : null}
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistQuickUpdate(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("quick", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert to task"}</button>}
          </article>) : <p><MessageSquareText /> No Quick Updates captured yet.</p>}
        </div>
      </section> : null}

      {initialTool === "ACTION_PLAN" ? <section className="advisor-coo-focused-tool advisor-coo-action-plan" aria-label="Daily Action Plan tool">
        <header><strong>Daily Action Plan</strong><small>Turn operating signals into clear next actions without forcing everything into task tracking.</small></header>
        <div>
          {attentionItems.length ? attentionItems.map((item) => <article key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.context}</p>
            <Link href={item.href}>{item.action}</Link>
          </article>) : <p><CheckCircle2 /> No urgent operating actions are waiting.</p>}
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

      {initialTool === "MORE_TOOLS" ? <section className="advisor-coo-focused-tool advisor-coo-more-tools-page" aria-label="More Tools">
        <header><div><strong>{activeWorkbookLabel} More Tools</strong><small>Use these supporting tools when the day needs extra structure. Each tool opens a real workbook area that already captures work for reports and coaching.</small></div><span>{moreToolCards.length} tools</span></header>
        <div>
          {moreToolCards.map((tool) => {
            const Icon = tool.icon;
            return <Link href={tool.href} key={tool.title}>
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
      <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
        {canUseManagementWorkbook ? <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> {managementWorkbookLabel}</button> : null}
        <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> {staffWorkbookLabel}</button>
      </nav>
      <nav className="advisor-coo-version-switcher" aria-label="Workbook version">
        <Link aria-current="page" href="/vehicles/coo-workbook">Current Workbook</Link>
        <Link href="/vehicles/coo-workbook/effectiveness-pilot">Effectiveness Pilot</Link>
      </nav>
      <div className="advisor-coo-header-actions">
        <Link href="/vehicles/coo-workbook/effectiveness-pilot#start-the-day"><ClipboardCheck /> Start The Day</Link>
        <Link href="/vehicles/coo-workbook/quick-update"><MessageSquareText /> Quick Update</Link>
        <button aria-label={isClosed ? "Open latest report draft" : "Generate Daily Report"} disabled={saving} onClick={() => void generateReportDraft("DAILY", { openDrafts: true })} type="button"><FileText /> {saving ? "Generating..." : isClosed ? "Open Draft" : "Generate Report"}</button>
      </div>
    </header>

    <WorkbookAppointmentFlow date={model.boardDate} workbook={activeWorkbook} pendingWork={dailyPursePendingWork} generating={saving} onGenerateReport={() => generateReportDraft("DAILY")} />
    <section className="advisor-coo-workflow-guide" aria-label="Workbook workflow guide">
      <article>
        <small>Recommended Now</small>
        <strong>{contextRecommendation.title}</strong>
        <span>{contextRecommendation.description}</span>
        {"href" in contextRecommendation ? <Link href={contextRecommendation.href!}>Open</Link> : <button onClick={contextRecommendation.onSelect} type="button">Open</button>}
      </article>
      <nav aria-label="Daily workflow">
        {workflowPhases.map((phase) => {
          const Icon = phase.icon;
          const content = <>
            <Icon />
            <span><strong>{phase.title}</strong><small>{phase.detail}</small></span>
          </>;
          return "href" in phase ? <Link aria-current={contextRecommendation.phase === phase.key ? "step" : undefined} href={phase.href!} key={phase.key}>{content}</Link> : <button aria-current={contextRecommendation.phase === phase.key ? "step" : undefined} key={phase.key} onClick={phase.onSelect} type="button">{content}</button>;
        })}
      </nav>
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
        {commandDetailItems.length ? commandDetailItems.map((item) => <a href={item.href} key={item.id}>
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
        {workSearchResults.length ? workSearchResults.map((item) => <article className={item.tone} key={item.id}>
          <a href={item.href}>
            <span><b>{item.kind}</b><strong>{item.title}</strong><small>{item.context}</small><small>{item.description}</small></span>
            <em>{item.action}</em>
          </a>
          {item.resume ? (
            <button
              disabled={Boolean(convertingId)}
              onClick={() => void resumeSearchResultAsTask(item)}
              type="button"
            >
              {convertingId === item.id ? "Resuming..." : "Resume as task"}
            </button>
          ) : null}
        </article>) : <div className="advisor-coo-search-empty">
          <span>No matching work found on this board. If this is still work that needs attention, create a task from the search and keep moving.</span>
          <Link href={workSearchTaskHref}>Create task from search</Link>
        </div>}
      </div> : null}
    </section>

    <section className="advisor-coo-landing-grid" aria-label={`${activeWorkbookLabel} daily execution workspace`}>
      <article className="advisor-coo-attention-now">
        <header>
          <div><strong>What Needs Attention Now</strong><small>{activeWorkbookLabel} signals, operating exceptions, and follow-up risk.</small></div>
          <span>{attentionItems.length ? `${attentionItems.length} priority` : "Clear"}</span>
        </header>
        <div>
          {attentionItems.length ? attentionItems.map((item, index) => <a className={item.tone} href={item.href} key={item.id}>
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
            return <a href={tool.href} key={tool.title}>
              <Icon />
              <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            </a>;
          })}
        </div>
      </article>
    </section>

    <section className="advisor-coo-close-day" id="close-report" aria-label="Close the Day">
      <header>
        <div><strong>Close the Day</strong><small>One closing workspace for done/not done review, tomorrow setup, and the manager-ready report.</small></div>
        <nav aria-label="Report cadence">
          <Link aria-current="page" href="/vehicles/coo-workbook/drafts?cadence=daily">Daily</Link>
          <Link href="/vehicles/coo-workbook/drafts?cadence=weekly">Weekly</Link>
          <Link href="/vehicles/coo-workbook/drafts?cadence=monthly">Monthly</Link>
        </nav>
      </header>
      <div aria-label="Close the Day review steps" className="advisor-coo-close-flow" role="tablist">
        <button aria-selected={closeStepView === "DONE"} onClick={() => setCloseStepView("DONE")} role="tab" type="button"><ListChecks /><strong>Done / Not Done</strong><small>{activeWorkbook.execution.completedWorkCount}/{activeWorkbook.execution.plannedWorkCount} planned complete</small></button>
        <button aria-selected={closeStepView === "TOMORROW"} onClick={() => setCloseStepView("TOMORROW")} role="tab" type="button"><CalendarClock /><strong>Tomorrow Setup</strong><small>{activeWorkbook.risk.tomorrowCarryoverCandidates.length} candidate item(s)</small></button>
        <button aria-selected={closeStepView === "DRAFT"} onClick={() => setCloseStepView("DRAFT")} role="tab" type="button"><FileText /><strong>Report Draft</strong><small>{activeWorkbook.reporting.staffGuidance}</small></button>
      </div>
      <p className="advisor-coo-governance-note">{activeWorkbook.governance.nextRecommendedAction}</p>
      <div className="advisor-coo-tomorrow-list" role="tabpanel">
        {closeStepView === "DONE" ? closeReviewItems.length ? closeReviewItems.map((item) => <article className="advisor-coo-close-action-row" key={item.id}>
          <span><strong>{item.title}</strong><small>{item.status} · {item.detail}</small></span>
          <Link href={item.href}>{item.toolLabel}</Link>
        </article>) : <p><CheckCircle2 /> No planned work has been added yet.</p> : null}
        {closeStepView === "TOMORROW" ? tomorrowItems.length ? tomorrowItems.map((item) => <article className="advisor-coo-close-action-row" key={item.id}>
          <span><strong>{item.title}</strong><small>{item.status} · {item.detail}</small></span>
          <div>
            <Link href={item.href}>{item.toolLabel}</Link>
            {item.action === "prepare" ? <button disabled={saving || isClosed} onClick={() => void runCloseStep("carryover")} type="button">Prepare tomorrow</button> : null}
          </div>
        </article>) : <p><CheckCircle2 /> No tomorrow setup items yet.</p> : null}
        {closeStepView === "DRAFT" ? <>
          {latestReportDraft ? <>
            <button
              aria-expanded={closeDraftExpanded}
              className="advisor-coo-draft-summary-button"
              onClick={() => setCloseDraftExpanded((current) => !current)}
              type="button"
            >
              <span><strong>{latestReportDraft.title}</strong><small>{latestReportDraft.summary}</small></span>
              <span>{closeDraftExpanded ? "Hide report items" : `Show ${latestReportDraftItemCount} report item${latestReportDraftItemCount === 1 ? "" : "s"}`}<ChevronDown /></span>
            </button>
            {closeDraftExpanded ? <div className="advisor-coo-draft-section-list">
              {latestReportDraft.sections.map((section) => {
                const sectionIsExpanded = closeDraftSectionExpanded[section.title] ?? true;
                return <section key={section.title}>
                  <button
                    aria-expanded={sectionIsExpanded}
                    className="advisor-coo-draft-section-summary"
                    onClick={() => setCloseDraftSectionExpanded((current) => ({ ...current, [section.title]: !sectionIsExpanded }))}
                    type="button"
                  >
                    <span><strong>{section.title}</strong><small>{section.items.length} report item{section.items.length === 1 ? "" : "s"}</small></span>
                    <ChevronDown />
                  </button>
                  {sectionIsExpanded ? <div>
                    {section.items.map((item) => <p key={`${section.title}-${item.sourceId}-${item.title}`}><strong>{item.title}</strong><small>{item.detail}</small></p>)}
                  </div> : null}
                </section>;
              })}
            </div> : <>
              {draftPreviewItems.length ? draftPreviewItems.map((item) => <button
                className="advisor-coo-draft-preview-button"
                key={item.id}
                onClick={() => {
                  setCloseDraftExpanded(true);
                  setCloseDraftSectionExpanded((current) => ({ ...current, [item.section]: true }));
                }}
                type="button"
              >
                <span><strong>{item.title}</strong><small>{item.section} · {item.detail}</small></span>
                <em>Open section</em>
              </button>) : null}
              {latestReportDraftItemCount > draftPreviewItems.length ? <p className="advisor-coo-draft-more-note"><strong>{latestReportDraftItemCount - draftPreviewItems.length} more report item{latestReportDraftItemCount - draftPreviewItems.length === 1 ? "" : "s"}</strong><small>Click the report summary above to review every prepared item.</small></p> : null}
            </>}
          </> : <p><FileText /> No saved draft yet. Generate a draft from reviewed report seeds when the day is ready.</p>}
        </> : null}
      </div>
      {closeStepNotice ? <p className="advisor-coo-close-step-notice" role="status">{closeStepNotice}</p> : null}
      <dl className="advisor-coo-close-preview">
        <div><dt>Seeds ready</dt><dd>{reportSeedRollup.active}</dd></div>
        <div><dt>Sections</dt><dd>{latestReportDraft?.sections.length ?? 5}</dd></div>
        <div><dt>Latest draft</dt><dd>{latestReportDraft ? dateLabel(latestReportDraft.generatedAt) : "Not generated"}</dd></div>
        <div><dt>Staff source</dt><dd>{staffTodayRollup.total} active</dd></div>
      </dl>
      <div className="advisor-coo-seed-actions">
        <button disabled={saving || isClosed} onClick={() => void runCloseStep("carryover")} type="button">{closeStepInProgress === "carryover" ? "Preparing..." : "Prepare Tomorrow"}</button>
        <button disabled={saving || isClosed} onClick={() => void runCloseStep("draft")} type="button">{closeStepInProgress === "draft" ? "Generating..." : "Generate Draft"}</button>
      </div>
      <button disabled={saving} onClick={() => void closeOrReopenDay()} type="button"><FileText /> {saving ? "Saving..." : isClosed ? "Reopen Day" : "Close Day"}</button>
      <Link className="advisor-coo-more-tools-link" href="/vehicles/coo-workbook/more-tools"><ClipboardList /> More Tools</Link>
    </section>

    {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}

    <footer className="advisor-coo-landing-status">
      <span><CheckCircle2 /> All workspace sources connected</span>
      <span>Last saved {dateLabel(model.generatedAt)}</span>
    </footer>
  </section>;
}

export function CooEffectivenessPilotWorkbook({ model }: { model: ServiceAdvisorWorkspaceModel }) {
  const [workbookView, setWorkbookView] = useState<WorkbookViewMode>(model.workspace.canUseManagementWorkbook ? "COO" : "MY");
  const [workbook, setWorkbook] = useState<WorkdayWorkbookModel>(model.workbook);
  const [staffWorkbook, setStaffWorkbook] = useState<WorkdayWorkbookModel>(model.staffWorkbook);
  const [staffWorkbookSummaries, setStaffWorkbookSummaries] = useState(model.staffWorkbookSummaries);
  const [focusOutcome, setFocusOutcome] = useState("");
  const [focusPriority, setFocusPriority] = useState<DailyFocusPriority>("HIGH");
  const [focusRisk, setFocusRisk] = useState<DailyFocusRisk>("NONE");
  const [focusMustClose, setFocusMustClose] = useState(true);
  const [focusProgressUpdates, setFocusProgressUpdates] = useState<Record<string, string>>({});
  const [supportNeeded, setSupportNeeded] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const attentionSessionKey = useId().replaceAll(":", "");
  const staffWorkbookLabel = model.workspace.staffWorkbookLabel;
  const managementWorkbookLabel = model.workspace.managementWorkbookLabel;
  const canUseManagementWorkbook = model.workspace.canUseManagementWorkbook;
  const effectiveWorkbookView: WorkbookViewMode = canUseManagementWorkbook ? workbookView : "MY";
  const activeWorkbook = effectiveWorkbookView === "MY" ? staffWorkbook : workbook;
  const activeLabel = effectiveWorkbookView === "MY" ? staffWorkbookLabel : managementWorkbookLabel;
  const pilotDailyPursePendingWork = model.actionQueue.map((item) => ({
    detail: `${item.repairOrderNumber} · ${item.vehicleLabel} · ${item.actionReason}`,
    href: repairOrderWorkbookHref(item.id), id: `${item.actionKind}-${item.id}`, title: item.actionLabel
  }));
  const coaching = activeWorkbook.coaching;
  const activityIntelligence = activeWorkbook.activityIntelligence;
  const timeAttention = activeWorkbook.timeAttention;
  const effectiveness = activeWorkbook.effectiveness;
  const dailyFocus = activeWorkbook.dailyFocusItems.filter((item) => !isGenericAdvisorFocusItem(item));
  const isPilotClosed = activeWorkbook.status === "CLOSED";
  const prioritySourcesForView = effectiveWorkbookView === "MY"
    ? model.morningPrioritySources.filter((item) => item.staffUserId === model.advisor.id)
    : model.morningPrioritySources;
  const dailyFocusSuggestions = buildDailyFocusSuggestions(activeWorkbook, prioritySourcesForView);
  const remainingFocusSlots = Math.max(0, 3 - dailyFocus.length);
  const visibleDailyFocusSuggestions = remainingFocusSlots ? dailyFocusSuggestions.slice(0, remainingFocusSlots) : [];
  const moreAttentionSuggestions = remainingFocusSlots ? dailyFocusSuggestions.slice(visibleDailyFocusSuggestions.length, visibleDailyFocusSuggestions.length + 8) : [];
  const manualFocusSlots = Math.max(0, remainingFocusSlots - visibleDailyFocusSuggestions.length);
  const staffNeedingSupport = staffWorkbookSummaries
    .filter((item) => item.closeReadinessTone !== "READY" || item.dailyFocusRiskCount > 0 || item.followUpNeededCount > 0)
    .slice(0, 4);
  async function generatePilotDailyReport() {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/coo-workbook/${effectiveWorkbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.boardDate)}&cadence=DAILY`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to generate the daily report.");
      await refreshPilotWorkbook(); setNotice("Daily report generated from current workbook activity.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to generate the daily report."); }
    finally { setSaving(false); }
  }

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

  const refreshPilotWorkbook = useCallback(async function refreshPilotWorkbook() {
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
  }, [effectiveWorkbookView, managementWorkbookLabel, model.boardDate, staffWorkbookLabel]);

  const createDailyFocusFromSuggestion = useCallback(async function createDailyFocusFromSuggestion(suggestion: DailyFocusSuggestion, sortOrder: number) {
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
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Unable to save Daily Focus.");
  }, [effectiveWorkbookView, model.boardDate]);

  async function addDailyFocus(suggestion?: DailyFocusSuggestion) {
    const outcome = (suggestion?.outcome ?? focusOutcome).trim();
    if (!outcome) return;
    if (isPilotClosed) {
      setNotice("This workbook day is closed. Reopen the day before adding the next outcome.");
      return;
    }
    setSaving(true);
    try {
      await createDailyFocusFromSuggestion(suggestion ?? {
        detail: supportNeeded,
        href: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day",
        mustCloseToday: focusMustClose,
        outcome,
        priority: focusPriority,
        rank: 0,
        reason: "Manually added by staff.",
        riskLevel: focusRisk,
        roleFit: "DIRECT",
        sourceId: "manual",
        sourceLabel: "Manual"
      }, dailyFocus.length);
      if (!suggestion) {
        setFocusOutcome("");
        setSupportNeeded("");
      }
      setNotice(suggestion ? "Suggested Daily Focus added." : "Daily Focus saved.");
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

  async function updateDailyFocus(item: DailyFocusItem, input: Partial<Pick<DailyFocusItem, "mustCloseToday" | "outcome" | "priority" | "progressUpdate" | "riskLevel" | "riskNote" | "status" | "supportNeeded">>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update Daily Focus.");
      setNotice("Daily Focus updated.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update Daily Focus.");
    } finally {
      setSaving(false);
    }
  }

  async function undoDailyFocus(item: DailyFocusItem) {
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus/${encodeURIComponent(item.id)}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to remove Daily Focus.");
      setNotice("Daily Focus removed. You can choose another item.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to remove Daily Focus.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDailyFocusProgress(item: DailyFocusItem) {
    const progressUpdate = (focusProgressUpdates[item.id] ?? item.progressUpdate ?? "").trim();
    if (!progressUpdate) {
      setNotice("Add a short progress update first.");
      return;
    }
    await updateDailyFocus(item, { progressUpdate });
    setFocusProgressUpdates((current) => ({ ...current, [item.id]: progressUpdate }));
  }

  async function askForSupport() {
    const note = supportNeeded.trim() || "Support requested from Daily Effectiveness Pilot.";
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
      setNotice("Support request saved.");
      await refreshPilotWorkbook();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to ask for support.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="advisor-panel advisor-coo-workbook advisor-coo-effectiveness full" id="coo-effectiveness-pilot">
    <header className="advisor-coo-landing-header">
      <div>
        <strong>{activeLabel}</strong>
        <span>Effectiveness Pilot: start clear, work the day, close with accountability.</span>
      </div>
      <nav className="advisor-coo-version-switcher" aria-label="Workbook version">
        <Link href="/vehicles/coo-workbook">Current Workbook</Link>
        <Link aria-current="page" href="/vehicles/coo-workbook/effectiveness-pilot">Effectiveness Pilot</Link>
      </nav>
      <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
        {canUseManagementWorkbook ? <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> {managementWorkbookLabel}</button> : null}
        <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> {staffWorkbookLabel}</button>
      </nav>
    </header>

    <WorkbookAppointmentFlow date={model.boardDate} workbook={activeWorkbook} pendingWork={pilotDailyPursePendingWork} generating={saving} onGenerateReport={generatePilotDailyReport} />
    <section className="advisor-coo-effectiveness-score" aria-label="Daily Effectiveness">
      <article><strong>{coaching.effectivenessScore}/100</strong><span>Daily Effectiveness</span><small>{coaching.staffSummary}</small></article>
      <dl>
        <div><dt>Focus</dt><dd>{activeWorkbook.planning.score}</dd></div>
        <div><dt>Execution</dt><dd>{activeWorkbook.execution.score}</dd></div>
        <div><dt>Reporting</dt><dd>{activeWorkbook.reporting.score}</dd></div>
        <div><dt>Risk</dt><dd>{activeWorkbook.risk.score}</dd></div>
        <div><dt>Carryover</dt><dd>{effectiveness.carryoverQualityScore}</dd></div>
      </dl>
    </section>

    <section className="advisor-coo-effectiveness-grid" aria-label={`${activeLabel} effectiveness pilot`}>
      <article className="advisor-coo-start-day" id="start-the-day">
        <header><div><strong>Start The Day</strong><small>Choose the top outcomes before work gets noisy.</small></div><span>{dailyFocus.length}/3 focus</span></header>
        {isPilotClosed ? <p className="advisor-coo-workspace-notice" role="status">This workbook day is closed. Reopen it before adding or changing today&apos;s outcomes. <button disabled={saving} onClick={() => void reopenPilotWorkbook()} type="button">Reopen Day</button></p> : null}
        <div className="advisor-coo-focus-form">
          <input aria-label="Daily Focus outcome" onChange={(event) => setFocusOutcome(event.target.value)} placeholder="Outcome that matters today..." value={focusOutcome} />
          <select aria-label="Priority" onChange={(event) => setFocusPriority(event.target.value as DailyFocusPriority)} value={focusPriority}>{focusPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select aria-label="Risk" onChange={(event) => setFocusRisk(event.target.value as DailyFocusRisk)} value={focusRisk}>{focusRiskLevels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label><input checked={focusMustClose} onChange={(event) => setFocusMustClose(event.target.checked)} type="checkbox" /> Must close today</label>
          <input aria-label="Support needed" onChange={(event) => setSupportNeeded(event.target.value)} placeholder="Support needed, if any..." value={supportNeeded} />
          <button disabled={saving || isPilotClosed || !focusOutcome.trim()} onClick={() => void addDailyFocus()} title={isPilotClosed ? "Reopen the workbook day before adding an outcome." : "Add this outcome to the workbook."} type="button"><Plus /> Add Today&apos;s Outcome</button>
        </div>
        {visibleDailyFocusSuggestions.length ? <div className="advisor-coo-focus-suggestions" aria-label="Suggested Daily Focus from app priorities">
          <header><strong>Suggested focus</strong><small>{manualFocusSlots ? `Approve what fits, then add ${manualFocusSlots} more manually to reach three focus items.` : "Review and approve the three most important source-backed priorities."}</small></header>
          {visibleDailyFocusSuggestions.map((item) => <article className={dailyFocusSuggestionTone(item)} key={item.sourceId}>
            <Link href={item.href} title={`Open source details for ${item.outcome}`}><strong>{item.outcome}</strong><small>{item.sourceLabel} · {item.priority.toLocaleLowerCase()} · {item.riskLevel.toLocaleLowerCase()}</small><small>{item.reason}</small><small>{item.detail}</small></Link>
            <button disabled={saving || isPilotClosed || dailyFocus.length >= 3} onClick={() => void addDailyFocus(item)} title={item.detail} type="button"><Plus /> Approve</button>
          </article>)}
        </div> : null}
        {moreAttentionSuggestions.length ? <div className="advisor-coo-more-attention" aria-label="More app priorities needing attention">
          <header><strong>More needing attention</strong><small>Use these if one of the suggested focus items does not fit today.</small></header>
          {moreAttentionSuggestions.map((item) => <article className={dailyFocusSuggestionTone(item)} key={item.sourceId}>
            <Link href={item.href} title={`Open source details for ${item.outcome}`}><strong>{item.outcome}</strong><small>{item.sourceLabel} · {item.priority.toLocaleLowerCase()} · {item.riskLevel.toLocaleLowerCase()}</small><small>{item.reason}</small></Link>
            <Link className="advisor-coo-suggestion-detail-link" href={item.href} title={`Open source details for ${item.outcome}`}>{item.detail}</Link>
            <button disabled={saving || isPilotClosed || dailyFocus.length >= 3} onClick={() => void addDailyFocus(item)} title={item.detail} type="button"><Plus /> Add to Focus</button>
          </article>)}
        </div> : null}
        {notice ? <p className="advisor-coo-workspace-notice" role="status">{notice}</p> : null}
        <div className="advisor-coo-focus-list">
          {dailyFocus.length ? dailyFocus.slice(0, 5).map((item) => <article className={item.riskLevel.toLocaleLowerCase()} key={item.id}>
            <ExpandableFocusDetails item={item} />
            <select aria-label={`Status for ${item.outcome}`} disabled={saving || isPilotClosed} onChange={(event) => void updateDailyFocus(item, { status: event.target.value as DailyFocusStatus })} value={item.status}>{focusStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            <select aria-label={`Risk for ${item.outcome}`} disabled={saving || isPilotClosed} onChange={(event) => void updateDailyFocus(item, { riskLevel: event.target.value as DailyFocusRisk })} value={item.riskLevel}>{focusRiskLevels.map((risk) => <option key={risk.value} value={risk.value}>{risk.label}</option>)}</select>
            <button className="advisor-coo-focus-undo" disabled={saving || isPilotClosed} onClick={() => void undoDailyFocus(item)} title="Remove this Daily Focus so another can be chosen." type="button"><Undo2 /> Undo</button>
            <div className="advisor-coo-focus-progress">
              <input aria-label={`Progress update for ${item.outcome}`} disabled={saving || isPilotClosed} onChange={(event) => setFocusProgressUpdates((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Quick progress update..." value={focusProgressUpdates[item.id] ?? item.progressUpdate ?? ""} />
              <button disabled={saving || isPilotClosed || !(focusProgressUpdates[item.id] ?? item.progressUpdate ?? "").trim()} onClick={() => void saveDailyFocusProgress(item)} type="button">Save Update</button>
              {item.progressUpdate ? <small>Last update: {item.progressUpdate}</small> : null}
            </div>
          </article>) : <p><CheckCircle2 /> Add up to three outcomes that would make today successful.</p>}
        </div>
      </article>

      <article className="advisor-coo-coaching-panel">
        <header><div><strong>Coaching Panel</strong><small>Supportive signals from the day, not surveillance.</small></div><span>{activeWorkbook.risk.blockerCount} blocked</span></header>
        <div>
          <p><CheckCircle2 /> {activityIntelligence.staffGuidance}</p>
          <p><CheckCircle2 /> {timeAttention.staffGuidance}</p>
          {coaching.coachingPrompts.map((prompt) => <p key={prompt}><CheckCircle2 /> {prompt}</p>)}
        </div>
        <button disabled={saving} onClick={() => void askForSupport()} type="button"><UsersRound /> Ask For Support</button>
      </article>

      <article className="advisor-coo-work-tools">
        <header><div><strong>Tools</strong><small>Open focused execution tools only when needed.</small></div></header>
        <div>
          <Link href="/vehicles/coo-workbook/checklist"><CheckSquare /> Light Checklist</Link>
          <Link href="/vehicles/coo-workbook/quick-update"><MessageSquareText /> Quick Update</Link>
          <Link href="/vehicles/coo-workbook/action-plan"><ClipboardCheck /> Action Plan</Link>
          <Link href="/vehicles/coo-workbook/report-seeds"><FileText /> Report Seeds</Link>
        </div>
      </article>

      <article className="advisor-coo-manager-summary">
        <header><div><strong>Manager View</strong><small>Same data, summarized for support and accountability.</small></div><span>{staffNeedingSupport.length} need review</span></header>
        <div>{staffNeedingSupport.length ? staffNeedingSupport.map((item) => <p key={item.workbookId}><strong>{item.staffName}</strong><small>{item.managerCoachingSummary}</small></p>) : <p><CheckCircle2 /> Staff summaries are clear for now.</p>}</div>
      </article>
    </section>

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
      <header><div><strong>Inbox</strong><span>Customer replies, team responses, and management decisions connected to repair work.</span></div><Link href="/appointments?inbox=all">Open inbox{needsResponse.length ? ` · ${needsResponse.length}` : ""}</Link></header>
      <div>{preview.length ? preview.map((item) => <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrderId)}#advisor-response`} key={item.id}><span className={`advisor-inbox-audience ${item.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(item.audience)}</span><span><strong>{item.customerName} · {item.repairOrderNumber}</strong><small>{item.preview}</small></span><em>{dateLabel(item.occurredAt)}</em></Link>) : <p className="advisor-empty"><CheckCircle2 /> No conversations currently need a response.</p>}</div>
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
        {selected ? <><header><span className={`advisor-inbox-audience ${selected.audience.toLocaleLowerCase()}`}>{inboxAudienceLabel(selected.audience)}</span><small>{dateLabel(selected.occurredAt)}</small></header><div><small>Repair-order context</small><h2>{selected.customerName}</h2><span>{selected.vehicleLabel} · {selected.repairOrderNumber}</span></div><section><small>Subject</small><strong>{selected.subject}</strong><p>{selected.preview}</p></section><dl><div><dt>Channel</dt><dd>{stageLabel(selected.channel)}</dd></div><div><dt>Direction</dt><dd>{stageLabel(selected.direction)}</dd></div><div><dt>Recorded by</dt><dd>{selected.authorName}</dd></div><div><dt>Transport</dt><dd>{selected.transportState === "RECORDED_CONTACT" ? "Contact recorded — external delivery not verified" : selected.transportState === "ESCALATION_RECORDED" ? "Management escalation recorded" : "Shared in repair-order workspace"}</dd></div>{selected.dueAt ? <div><dt>Response due</dt><dd>{dateLabel(selected.dueAt)}</dd></div> : null}</dl>{selected.audience === "CUSTOMER" ? <p className="advisor-inbox-boundary">SMS and email delivery require a connected communications provider. This record does not claim delivery.</p> : <p className="advisor-inbox-boundary internal">Internal content is never included in customer-facing updates.</p>}<Link href={inboxComposeHref(selected)}><Send /> {inboxActionLabel(selected)}</Link></> : <p className="advisor-empty"><CheckCircle2 /> Choose a conversation to review its repair-order context.</p>}
      </aside>
    </div>
  </section>;
}

export function ServiceAdvisorHome({ initialFilter = "ATTENTION", initialSection = "WORK", model }: { initialFilter?: AdvisorQueueFilter; initialSection?: AdvisorWorkspaceSection; model: ServiceAdvisorWorkspaceModel }) {
  const [filter, setFilter] = useState<AdvisorQueueFilter>(initialFilter);
  const [viewMode, setViewMode] = useState<AdvisorViewMode>("CALM");
  const [selectedActionId, setSelectedActionId] = useState(model.actionQueue[0]?.id ?? "");
  const firstName = model.advisor.name.split(" ")[0] ?? "Advisor";
  const visibleActions = model.actionQueue.filter((item) => matchesFilter(item, filter));
  const selectedAction = visibleActions.find((item) => item.id === selectedActionId) ?? visibleActions[0] ?? null;

  function chooseViewMode(mode: AdvisorViewMode) {
    setViewMode(mode);
  }

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
          <h1>Welcome, {firstName}. Who needs you next?</h1>
          <span>One focused queue for arrivals, customer decisions, promises, and repair updates.</span>
        </div>
        <div className="advisor-hero-controls">
          <div className="advisor-view-mode" role="group" aria-label="Advisor workspace display mode">
            <button aria-pressed={viewMode === "CALM"} onClick={() => chooseViewMode("CALM")} type="button">Calm</button>
            <button aria-pressed={viewMode === "HIGH_VOLUME"} onClick={() => chooseViewMode("HIGH_VOLUME")} type="button">High-volume</button>
          </div>
          <Link className="advisor-check-in-primary" href="/vehicles/repair-orders?intakeSource=WALK_IN"><ClipboardCheck /> Check In Vehicle</Link>
        </div>
      </header>

      <form action="/vehicles/repair-orders" className="advisor-search-panel advisor-search-form" method="get" aria-label="Find or check in a customer or vehicle">
        <Search />
        <label>
          <strong>Find or check in a customer, vehicle, appointment, VIN, phone, or RO</strong>
          <input aria-label="Search customer, vehicle, appointment, VIN, phone, or repair order" name="search" placeholder="Start typing a name, phone, VIN, plate, appointment, or RO…" type="search" />
        </label>
        <input name="intakeSource" type="hidden" value="WALK_IN" />
        <button type="submit">Search &amp; check in <Search /></button>
      </form>

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
      <AdvisorInbox compact highVolume={false} items={model.inbox} />

      <section className="advisor-panel advisor-action-queue advisor-priority-queue">
        <header>
          <div>
            <strong>{filter === "WAITING" ? "Waiting on others" : filter === "AUTHORIZATION" ? "Customer approvals" : "My next actions"}</strong>
            <span>Sorted by urgency and promise time. Each repair order appears once.</span>
          </div>
          <Link href="/vehicles/repair-workbench?view=all">All repair orders</Link>
        </header>
        <nav className="advisor-queue-filters" aria-label="Filter advisor actions">
          {filters.map((item) => (
            <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>
          ))}
        </nav>
        {viewMode === "CALM" ? <div>
          {visibleActions.length ? visibleActions.map((item) => (
            <Link className={`advisor-action-card ${actionTone(item.actionKind)}`} href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`} key={`${item.actionKind}-${item.id}`}>
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
              <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selectedAction.id)}`}><Send /> {actionButton(selectedAction.actionKind)}</Link>
              <footer>Use ↑ and ↓ while the queue is focused to review the next item.</footer>
            </> : <p className="advisor-empty"><CheckCircle2 /> Select another filter to review advisor work.</p>}
          </aside>
        </div>}
      </section>

      <section className={`advisor-panel advisor-arrivals advisor-arrivals-compact ${model.appointments.length ? "" : "is-empty"}`} id="arrival-queue">
        <header>
          <div>
            <strong>{model.appointments.length ? "Arrivals ready for check-in" : "All expected arrivals are handled"}</strong>
            <span>{model.appointments.length ? "Confirm the customer and vehicle before creating repair work." : "No appointment arrivals are waiting in the current view."}</span>
          </div>
          <Link href="/appointments?view=board">Appointment board</Link>
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
              <Link href={`/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=${encodeURIComponent(appointment.id)}`}>Check in</Link>
            </article>
          ))}
        </div> : <p className="advisor-arrivals-clear"><CheckCircle2 /> You’re caught up on arrivals.</p>}
      </section>

      <footer className="advisor-calm-footer">
        <CheckCircle2 />
        <span><strong>Stay customer-centered.</strong> Confirm the concern, make only a supportable promise, and leave every repair order with a clear owner and next update.</span>
        <Link href="/customers"><UsersRound /> Find customer</Link>
      </footer>
      </>}
    </section>
  );
}
