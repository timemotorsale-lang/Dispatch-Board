"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
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
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

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

function actionCount(model: ServiceAdvisorWorkspaceModel, kind: Action["actionKind"]) {
  return model.actionQueue.filter((item) => item.actionKind === kind).length;
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

type WorkdayWorkbookModel = ServiceAdvisorWorkspaceModel["workbook"];
type StaffWorkbookSummary = ServiceAdvisorWorkspaceModel["staffWorkbookSummaries"][number];
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
export type CooWorkbookTool = "CHECKLIST" | "TO_DO_LIST" | "QUICK_UPDATE" | "ACTION_PLAN" | "CARRYOVER" | "REPORT_SEEDS" | "STAFF_SUPPORT" | "DRAFTS";

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

function checklistStatusLabel(item: DailyChecklistItem) {
  if (item.done) return "Done";
  if (item.status === "RED") return "Blocked";
  if (item.status === "YELLOW") return "Needs update";
  return "On track";
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

function dailyReportDraftText(draft: WorkdayWorkbookModel["reportDrafts"][number]) {
  const sections = draft.sections.map((section) => [
    section.title,
    ...section.items.map((item) => `- ${item.title}: ${item.detail}${item.reviewNote ? ` (${item.reviewNote})` : ""}`)
  ].join("\n")).join("\n\n");
  return `${draft.title}\n${draft.summary}\n\n${sections}`;
}

export function CooDailyWorkbook({ compact = false, initialTool = null, model }: { compact?: boolean; initialTool?: CooWorkbookTool | null; model: ServiceAdvisorWorkspaceModel }) {
  const [workbookView, setWorkbookView] = useState<WorkbookViewMode>("COO");
  const [workbook, setWorkbook] = useState<WorkdayWorkbookModel>(model.workbook);
  const [staffWorkbook, setStaffWorkbook] = useState<WorkdayWorkbookModel>(model.staffWorkbook);
  const [staffWorkbookSummaries, setStaffWorkbookSummaries] = useState(model.staffWorkbookSummaries);
  const [checklistText, setChecklistText] = useState("");
  const [quickUpdateText, setQuickUpdateText] = useState("");
  const [quickUpdateCategory, setQuickUpdateCategory] = useState<QuickUpdateCategory>("OTHER");
  const [quickUpdatePerson, setQuickUpdatePerson] = useState("");
  const [quickUpdateCompany, setQuickUpdateCompany] = useState("");
  const [quickUpdateFollowUp, setQuickUpdateFollowUp] = useState(false);
  const [quickUpdateDueWindow, setQuickUpdateDueWindow] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [supportUpdateRequested, setSupportUpdateRequested] = useState(true);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const approvalCount = actionCount(model, "AUTHORIZATION");
  const reportExceptions = model.counts.needsAttention + model.counts.waitingOnOthers;
  const activeWorkbook = workbookView === "MY" ? staffWorkbook : workbook;
  const activeWorkbookLabel = workbookView === "MY" ? "My Workbook" : "COO Workbook";
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
  const quickUpdateRollup = {
    carryover: quickUpdates.filter((item) => item.carryoverReady).length,
    followUp: quickUpdates.filter((item) => item.followUpNeeded).length,
    total: quickUpdates.length
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
    brief: `Create the COO daily action plan from ${model.counts.activeRepairOrders} active repair order(s), ${approvalCount} approval review item(s), and ${reportExceptions} unresolved risk/carryover item(s).`,
    dueAt: model.generatedAt,
    expectedOutcome: "The COO daily action plan is reviewed, prioritized, assigned, and ready to support the end-of-day operations report.",
    title: "Create COO daily action plan"
  });
  const supportSignals = closeReadiness.checklistNeedsSupport + closeReadiness.quickFollowUps + reportExceptions;
  const attentionItems = [
    ...model.actionQueue.slice(0, 4).map((item) => ({
      action: actionButton(item.actionKind),
      context: `${item.customerName} · ${item.repairOrderNumber}`,
      href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`,
      id: `action-${item.id}`,
      title: item.actionReason,
      tone: item.actionKind === "AUTHORIZATION" || item.overdue ? "red" : item.actionKind === "PARTS_DELAY" || item.actionKind === "TECHNICIAN_CLARIFICATION" || item.actionKind === "PROMISE_RISK" ? "yellow" : "blue"
    })),
    ...quickUpdates.filter((item) => item.followUpNeeded || item.carryoverReady).slice(0, 2).map((item) => ({
      action: item.followUpNeeded ? "Follow up" : "Review",
      context: [item.person, item.company, item.dueWindow].filter(Boolean).join(" · ") || "Quick Update",
      href: "/vehicles/coo-workbook/quick-update",
      id: `quick-${item.id}`,
      title: item.text,
      tone: item.followUpNeeded ? "yellow" : "blue"
    })),
    ...checklistItems.filter((item) => !item.done && (item.status === "RED" || item.status === "YELLOW" || item.carryoverReady)).slice(0, 2).map((item) => ({
      action: item.status === "RED" ? "Resolve" : "Update",
      context: item.update || "Daily Checklist",
      href: "/vehicles/coo-workbook/checklist",
      id: `checklist-${item.id}`,
      title: item.text,
      tone: item.status === "RED" ? "red" : "yellow"
    }))
  ].slice(0, 4);
  const commandCards = [
    {
      icon: CheckCircle2,
      label: "Daily Close",
      meta: closeReadinessLabel(closeReadiness.tone),
      stat: `${closeReadiness.score}/100`,
      tone: closeReadiness.tone === "READY" ? "green" : closeReadiness.tone === "SUPPORT" ? "yellow" : "blue"
    },
    {
      icon: AlertTriangle,
      label: "Needs Attention",
      meta: supportSignals ? "Review now" : "Clear",
      stat: supportSignals,
      tone: supportSignals ? "red" : "green"
    },
    {
      icon: ListChecks,
      label: "Today’s Work",
      meta: `${checklistRollup.done} done`,
      stat: `${checklistItems.length} items`,
      tone: "blue"
    },
    {
      icon: FileText,
      label: "Report Ready",
      meta: latestReportDraft ? `Draft v${latestReportDraft.version}` : "Draft ready",
      stat: `${reportSeedRollup.active} seeds`,
      tone: latestReportDraft ? "green" : "blue"
    }
  ];
  const carryoverPreview = [
    ...checklistItems.filter((item) => item.carryoverReady).map((item) => ({ detail: item.update || checklistStatusLabel(item), id: `checklist-${item.id}`, kind: "Checklist", title: item.text })),
    ...quickUpdates.filter((item) => item.carryoverReady).map((item) => ({ detail: [item.person, item.company, item.dueWindow].filter(Boolean).join(" · ") || item.text, id: `quick-${item.id}`, kind: "Quick Update", title: item.text })),
    ...reportSeeds.filter((seed) => seed.status === "CARRIED_OVER").map((seed) => ({ detail: seed.detail, id: `seed-${seed.id}`, kind: reportSeedSourceLabel(seed), title: seed.title })),
    ...carryovers.filter((item) => item.status !== "DISMISSED").map((item) => ({ detail: item.detail, id: `carryover-${item.id}`, kind: `Carryover · ${item.status.toLocaleLowerCase()}`, title: item.title }))
  ].slice(0, 6);
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
    const response = await fetch(`/api/coo-workbook/staff?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}`);
    const payload = await response.json().catch(() => null) as { staffWorkbookSummaries?: StaffWorkbookSummary[]; workbook?: WorkdayWorkbookModel; error?: string } | null;
    if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? "Unable to refresh My Workbook.");
    setStaffWorkbook(payload.workbook);
    setStaffWorkbookSummaries(payload.staffWorkbookSummaries ?? []);
  }

  async function refreshActiveWorkbook() {
    if (workbookView === "MY") {
      await refreshStaffWorkbook();
      return;
    }
    await refreshWorkbook();
  }

  function updateActiveWorkbook(updater: (current: WorkdayWorkbookModel) => WorkdayWorkbookModel) {
    if (workbookView === "MY") {
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
      const response = await fetch(`/api/coo-workbook/${workbookView === "MY" ? "staff/checklist" : "checklist"}?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}`, {
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

  async function persistChecklistItem(id: string, patch: Partial<DailyChecklistItem>) {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before updating checklist items.");
      return;
    }
    updateChecklistItem(id, patch);
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
      const response = await fetch(`/api/coo-workbook/${workbookView === "MY" ? "staff/quick-updates" : "quick-updates"}?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: quickUpdateCategory, company: quickUpdateCompany, dueWindow: quickUpdateDueWindow, followUpNeeded: quickUpdateFollowUp, person: quickUpdatePerson, text })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save Quick Update.");
      setQuickUpdateText("");
      setQuickUpdateCategory("OTHER");
      setQuickUpdatePerson("");
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
      const response = await fetch(`/api/coo-workbook/${workbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}&cadence=${cadence}`, {
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

  async function copyDailyReportDraft() {
    if (!latestReportDraft || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(dailyReportDraftText(latestReportDraft));
      setWorkspaceNotice("Daily Report Draft copied.");
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
      ? `Converted from COO Daily Checklist. Update: ${(item as DailyChecklistItem).update || "No update added yet."}`
      : `Converted from COO Quick Update. Category: ${quickUpdateCategoryLabel((item as QuickUpdateItem).category)}. ${(item as QuickUpdateItem).person ? `Person: ${(item as QuickUpdateItem).person}. ` : ""}${(item as QuickUpdateItem).company ? `Company: ${(item as QuickUpdateItem).company}. ` : ""}${(item as QuickUpdateItem).text}`;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: model.advisor.id,
          boardDate: model.generatedAt.slice(0, 10),
          description,
          dueAt: dueAt.toISOString(),
          intakeMetadata: {
            channel: "COO Workbook",
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
          description: `Converted from COO Workbook carryover. ${item.detail}`,
          dueAt: dueAt.toISOString(),
          intakeMetadata: {
            channel: "COO Workbook",
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

  async function prepareCarryovers() {
    if (isClosed) {
      setWorkspaceNotice("This workbook day is closed. Reopen it before preparing carryover.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/carryovers?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}&scope=${workbookView === "MY" ? "STAFF" : "COO"}`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { count?: number; targetBoardDate?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to prepare carryover.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`${payload?.count ?? 0} carryover item(s) prepared for ${payload?.targetBoardDate ?? "tomorrow"}.`);
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
        : await fetch(`/api/coo-workbook/close?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}&scope=${workbookView === "MY" ? "STAFF" : "COO"}`, { method: "POST" });
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
      TO_DO_LIST: "To-Do List"
    };

    return <section className={`advisor-panel advisor-coo-workbook advisor-coo-tool-page ${compact ? "compact" : "full"}`} id="coo-workbook-tool">
      <header className="advisor-coo-tool-page-header">
        <div>
          <Link href="/vehicles/coo-workbook">← COO Workbook</Link>
          <strong>{toolLabels[initialTool]}</strong>
          <span>{activeWorkbookLabel} focused workspace. Finish the action here, then return to the landing page.</span>
        </div>
        <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
          <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> COO View</button>
          <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> My Workbook</button>
        </nav>
      </header>

      {initialTool === "CHECKLIST" ? <section className="advisor-coo-daily-checklist advisor-coo-focused-tool" aria-label="Daily Checklist tool">
        <header><div><strong>{activeWorkbookLabel} Daily Checklist</strong><small>Create a simple same-day list. Convert only the items that need formal tracking.</small></div><span>{checklistRollup.done}/{checklistItems.length} done</span></header>
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
          {checklistItems.length ? checklistItems.map((item) => <div className={`advisor-coo-checklist-item ${item.status.toLocaleLowerCase()} ${item.done ? "done" : ""}`} key={item.id}>
            <button aria-label={`Mark ${item.text} ${item.done ? "not done" : "done"}`} className="advisor-coo-check" disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { done: !item.done, status: !item.done ? "GREEN" : item.status })} type="button"><CheckSquare /></button>
            <div>
              <strong>{item.text}</strong>
              <small>{checklistStatusLabel(item)} · Added {dateLabel(item.createdAt)}</small>
              <input aria-label={`Update for ${item.text}`} disabled={isClosed} onBlur={() => void persistChecklistItem(item.id, { update: item.update })} onChange={(event) => updateChecklistItem(item.id, { update: event.target.value })} placeholder="Add update..." value={item.update} />
            </div>
            <select aria-label={`Status for ${item.text}`} disabled={isClosed} onChange={(event) => void persistChecklistItem(item.id, { status: event.target.value as DailyChecklistStatus, done: event.target.value === "GREEN" ? item.done : false })} value={item.status}>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("checklist", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert"}</button>}
          </div>) : <p><ListChecks /> Add a quick list of what needs to get done today.</p>}
        </div>
      </section> : null}

      {initialTool === "TO_DO_LIST" ? <section className="advisor-coo-focused-tool advisor-coo-todo-list" aria-label="To-Do List tool">
        <header><div><strong>{activeWorkbookLabel} To-Do List</strong><small>Use the checklist for light same-day work. Convert only the items that need formal ownership, due dates, and tracking.</small></div><span>{checklistRollup.open} open</span></header>
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
          {checklistItems.length ? checklistItems.map((item) => <div className={`advisor-coo-checklist-item ${item.status.toLocaleLowerCase()} ${item.done ? "done" : ""}`} key={item.id}>
            <button aria-label={`Mark ${item.text} ${item.done ? "not done" : "done"}`} className="advisor-coo-check" disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { done: !item.done, status: !item.done ? "GREEN" : item.status })} type="button"><CheckSquare /></button>
            <div>
              <strong>{item.text}</strong>
              <small>{checklistStatusLabel(item)} · Checklist-powered to-do</small>
              <input aria-label={`To-Do update for ${item.text}`} disabled={isClosed} onBlur={() => void persistChecklistItem(item.id, { update: item.update })} onChange={(event) => updateChecklistItem(item.id, { update: event.target.value })} placeholder="Add update..." value={item.update} />
            </div>
            <select aria-label={`To-Do status for ${item.text}`} disabled={isClosed} onChange={(event) => void persistChecklistItem(item.id, { status: event.target.value as DailyChecklistStatus, done: event.target.value === "GREEN" ? item.done : false })} value={item.status}>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <button aria-pressed={item.carryoverReady} disabled={isClosed} onClick={() => void persistChecklistItem(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={isClosed || convertingId === item.id} onClick={() => void convertToTask("checklist", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert"}</button>}
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
        <header><div><strong>{activeWorkbookLabel} Quick Update</strong><small>Capture unplanned events, visitors, facility issues, or anything worth remembering.</small></div><span>{quickUpdates.length} captured</span></header>
        <textarea aria-label="Quick Update details" disabled={isClosed} onChange={(event) => setQuickUpdateText(event.target.value)} placeholder="Example: AJ checked the roof today and may fix it in the next few weeks." value={quickUpdateText} />
        <div className="advisor-coo-quick-fields">
          <select aria-label="Quick Update category" disabled={isClosed} onChange={(event) => setQuickUpdateCategory(event.target.value as QuickUpdateCategory)} value={quickUpdateCategory}>
            {quickUpdateCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input aria-label="Person involved" disabled={isClosed} onChange={(event) => setQuickUpdatePerson(event.target.value)} placeholder="Person" value={quickUpdatePerson} />
          <input aria-label="Company or outside party" disabled={isClosed} onChange={(event) => setQuickUpdateCompany(event.target.value)} placeholder="Company / outside party" value={quickUpdateCompany} />
        </div>
        <div className="advisor-coo-followup-row">
          <label><input checked={quickUpdateFollowUp} disabled={isClosed} onChange={(event) => setQuickUpdateFollowUp(event.target.checked)} type="checkbox" /> Follow-up needed</label>
          <input aria-label="Follow-up due date or time window" disabled={isClosed || !quickUpdateFollowUp} onChange={(event) => setQuickUpdateDueWindow(event.target.value)} placeholder="Due date or time window" value={quickUpdateDueWindow} />
          <button disabled={saving || isClosed || !quickUpdateText.trim()} onClick={() => void addQuickUpdate()} type="button"><Save /> Save update</button>
        </div>
        <div className="advisor-coo-update-list">
          {quickUpdates.length ? quickUpdates.map((item) => <article key={item.id}>
            <span><strong>{quickUpdateCategoryLabel(item.category)}</strong><small>{dateLabel(item.createdAt)}</small></span>
            <p>{item.text}</p>
            <small>{[item.person, item.company, item.followUpNeeded ? `Follow-up: ${item.dueWindow || "needed"}` : "", item.carryoverReady ? "Carryover ready" : ""].filter(Boolean).join(" · ") || "No extra details"}</small>
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
        <Link className="advisor-coo-primary-link" href={planTaskHref}>Create action plan task</Link>
      </section> : null}

      {initialTool === "CARRYOVER" ? <section className="advisor-coo-focused-tool advisor-coo-carryover-center" aria-label="Carryover tool">
        <header><div><strong>Carryover</strong><small>Tomorrow-facing items pulled from checklist, Quick Updates, and reviewed Report Seeds.</small></div><button disabled={saving || isClosed} onClick={() => void prepareCarryovers()} type="button"><CalendarClock /> Prepare Carryover</button></header>
        <div>{carryovers.length ? carryovers.map((item) => <article key={item.id}><small>{item.targetBoardDate} · {item.status.toLocaleLowerCase()}</small><strong>{item.title}</strong><span>{item.detail}</span><div className="advisor-coo-seed-actions"><button disabled={saving || isClosed || item.status === "CONFIRMED"} onClick={() => void persistCarryover(item.id, { status: "CONFIRMED" })} type="button">Confirm</button><button disabled={saving || isClosed || item.status === "DISMISSED"} onClick={() => void persistCarryover(item.id, { status: "DISMISSED", dismissedReason: "Dismissed from COO Workbook." })} type="button">Dismiss</button>{item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={saving || isClosed || convertingId === item.id} onClick={() => void convertCarryoverToTask(item)} type="button">{convertingId === item.id ? "Converting..." : "Convert to task"}</button>}</div></article>) : carryoverPreview.length ? carryoverPreview.map((item) => <article key={item.id}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.detail}</span></article>) : <p><CheckCircle2 /> No carryover items are marked yet.</p>}</div>
      </section> : null}

      {initialTool === "REPORT_SEEDS" ? <section className="advisor-coo-focused-tool advisor-coo-report-seeds" aria-label="Report Seeds tool">
        <header><div><strong>Report Seeds</strong><small>Review, include, exclude, edit, or carry over source-backed report material.</small></div><span>{reportSeedRollup.reviewed}/{reportSeedRollup.total} reviewed</span></header>
        <div>{reportSeeds.length ? reportSeeds.map((seed) => <article className={seed.tone.toLocaleLowerCase()} key={seed.id}>
          <span><strong>{seed.title}</strong><small>{reportSeedSourceLabel(seed)} · {reportSeedStatusLabel(seed.status)}</small></span>
          <div className="advisor-coo-seed-actions">
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
          <header><strong>{latestReportDraft.title}</strong><small>{latestReportDraft.cadence.toLocaleLowerCase()} · Version {latestReportDraft.version} · Generated {dateLabel(latestReportDraft.generatedAt)}</small><button onClick={() => void copyDailyReportDraft()} type="button"><Copy /> Copy Draft</button></header>
          <p>{latestReportDraft.summary}</p>
          <div>{latestReportDraft.sections.map((section) => <article key={section.title}><h2>{section.title}</h2>{section.items.map((item) => <span key={`${section.title}-${item.sourceId}-${item.title}`}><strong>{item.title}</strong><small>{item.detail}</small></span>)}</article>)}</div>
        </div> : <p>Review report seeds, then generate a manager-ready daily draft.</p>}
      </section> : null}

      {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}
    </section>;
  }

  return <section className={`advisor-panel advisor-coo-workbook advisor-coo-landing ${compact ? "compact" : "full"}`} id="coo-daily-workbook">
    <header className="advisor-coo-landing-header">
      <div>
        <strong>COO Workbook</strong>
        <span>A simple daily workspace for planning, execution, accountability, and reporting.</span>
      </div>
      <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
        <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> COO View</button>
        <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> My Workbook</button>
      </nav>
      <nav className="advisor-coo-version-switcher" aria-label="Workbook version">
        <Link aria-current="page" href="/vehicles/coo-workbook">Current Workbook</Link>
        <Link href="/vehicles/coo-workbook/effectiveness-pilot">Effectiveness Pilot</Link>
      </nav>
      <div className="advisor-coo-header-actions">
        <Link href="/vehicles/coo-workbook/quick-update"><MessageSquareText /> Quick Update</Link>
        <button aria-label={isClosed ? "Open latest report draft" : "Generate Daily Report"} disabled={saving} onClick={() => void generateReportDraft("DAILY", { openDrafts: true })} type="button"><FileText /> {saving ? "Generating..." : isClosed ? "Open Draft" : "Generate Report"}</button>
      </div>
    </header>

    <section className="advisor-coo-command-strip" aria-label="Today's Command">
      {commandCards.map((card) => {
        const Icon = card.icon;
        return <article className={card.tone} key={card.label}>
          <Icon />
          <span>{card.label}</span>
          <strong>{card.stat}</strong>
          <small>{card.meta}</small>
        </article>;
      })}
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
            <span><strong>{item.title}</strong><small>{item.context}</small></span>
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
        <div><strong>Close the Day</strong><small>Review work, confirm carryover, then generate a manager-ready report.</small></div>
        <nav aria-label="Report cadence">
          <Link aria-current="page" href="/vehicles/coo-workbook/drafts?cadence=daily">Daily</Link>
          <Link href="/vehicles/coo-workbook/drafts?cadence=weekly">Weekly</Link>
          <Link href="/vehicles/coo-workbook/drafts?cadence=monthly">Monthly</Link>
        </nav>
      </header>
      <div className="advisor-coo-close-flow">
        <span><CheckCircle2 /><strong>Review work</strong><small>{checklistRollup.done}/{checklistItems.length} checklist done</small></span>
        <span><CalendarClock /><strong>Confirm carryover</strong><small>{closeReadiness.carryoverItems} item(s)</small></span>
        <span><FileText /><strong>Generate report</strong><small>{latestReportDraft ? `Draft v${latestReportDraft.version}` : "Ready when reviewed"}</small></span>
      </div>
      <dl className="advisor-coo-close-preview">
        <div><dt>Seeds ready</dt><dd>{reportSeedRollup.active}</dd></div>
        <div><dt>Sections</dt><dd>{latestReportDraft?.sections.length ?? 5}</dd></div>
        <div><dt>Latest draft</dt><dd>{latestReportDraft ? dateLabel(latestReportDraft.generatedAt) : "Not generated"}</dd></div>
        <div><dt>Staff source</dt><dd>{staffTodayRollup.total} active</dd></div>
      </dl>
      <button disabled={saving} onClick={() => void closeOrReopenDay()} type="button"><FileText /> {saving ? "Saving..." : isClosed ? "Reopen Day" : "Close Day"}</button>
    </section>

    {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}

    <footer className="advisor-coo-landing-status">
      <span><CheckCircle2 /> All workspace sources connected</span>
      <span>Last saved {dateLabel(model.generatedAt)}</span>
    </footer>
  </section>;
}

export function CooEffectivenessPilotWorkbook({ model }: { model: ServiceAdvisorWorkspaceModel }) {
  const [workbookView, setWorkbookView] = useState<WorkbookViewMode>("COO");
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
  const [closeStepNotice, setCloseStepNotice] = useState<string | null>(null);
  const [closeStepInProgress, setCloseStepInProgress] = useState<"carryover" | "draft" | null>(null);
  const [saving, setSaving] = useState(false);
  const attentionSessionKey = useId().replaceAll(":", "");
  const activeWorkbook = workbookView === "MY" ? staffWorkbook : workbook;
  const activeLabel = workbookView === "MY" ? "My Workbook" : "COO Workbook";
  const coaching = activeWorkbook.coaching;
  const activityIntelligence = activeWorkbook.activityIntelligence;
  const timeAttention = activeWorkbook.timeAttention;
  const effectiveness = activeWorkbook.effectiveness;
  const dailyFocus = activeWorkbook.dailyFocusItems;
  const isPilotClosed = activeWorkbook.status === "CLOSED";
  const activeCarryovers = activeWorkbook.carryovers.filter((item) => item.status !== "DISMISSED");
  const carryoverSourceIds = new Set(activeCarryovers.map((item) => item.sourceId));
  const tomorrowItems = [
    ...dailyFocus.filter((item) => (item.status === "CARRY_OVER" || item.mustCloseToday && item.status !== "DONE") && !carryoverSourceIds.has(`daily-focus:${item.id}`)).map((item) => ({ detail: item.supportNeeded || item.riskNote || "Needs tomorrow ownership.", id: `focus-${item.id}`, title: item.outcome })),
    ...activeCarryovers.map((item) => ({ detail: item.detail, id: `carryover-${item.id}`, title: item.title }))
  ].slice(0, 5);
  const staffNeedingSupport = staffWorkbookSummaries
    .filter((item) => item.closeReadinessTone !== "READY" || item.dailyFocusRiskCount > 0 || item.followUpNeededCount > 0)
    .slice(0, 4);

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
    if (workbookView === "MY") {
      const response = await fetch(`/api/coo-workbook/staff?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}`);
      const payload = await response.json().catch(() => null) as { staffWorkbookSummaries?: typeof staffWorkbookSummaries; workbook?: WorkdayWorkbookModel; error?: string } | null;
      if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? "Unable to refresh My Workbook.");
      setStaffWorkbook(payload.workbook);
      setStaffWorkbookSummaries(payload.staffWorkbookSummaries ?? []);
      return;
    }
    const response = await fetch("/api/coo-workbook");
    const payload = await response.json().catch(() => null) as { workbook?: WorkdayWorkbookModel; error?: string } | null;
    if (!response.ok || !payload?.workbook) throw new Error(payload?.error ?? "Unable to refresh COO Workbook.");
    setWorkbook(payload.workbook);
  }

  async function addDailyFocus() {
    const outcome = focusOutcome.trim();
    if (!outcome) return;
    if (isPilotClosed) {
      setNotice("This workbook day is closed. Reopen the day before adding the next outcome.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/daily-focus?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}&scope=${workbookView === "MY" ? "STAFF" : "COO"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mustCloseToday: focusMustClose,
          outcome,
          priority: focusPriority,
          riskLevel: focusRisk,
          sortOrder: dailyFocus.length,
          supportNeeded
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save Daily Focus.");
      setFocusOutcome("");
      setSupportNeeded("");
      setNotice("Daily Focus saved.");
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

  async function runCloseStep(step: "carryover" | "draft") {
    setSaving(true);
    setCloseStepInProgress(step);
    setCloseStepNotice(null);
    try {
      const scope = workbookView === "MY" ? "STAFF" : "COO";
      const path = step === "carryover" ? "carryovers" : scope === "STAFF" ? "staff/report-drafts" : "report-drafts";
      const response = await fetch(`/api/coo-workbook/${path}?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}&scope=${scope}&cadence=DAILY`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { count?: number; error?: string; targetBoardDate?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to complete close step.");
      const message = step === "carryover"
        ? `Tomorrow setup prepared${payload?.count === undefined ? "" : ` with ${payload.count} item(s)`}${payload?.targetBoardDate ? ` for ${payload.targetBoardDate}` : ""}.`
        : "Daily report draft generated and saved.";
      setCloseStepNotice(message);
      setNotice(message);
      await refreshPilotWorkbook();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete close step.";
      setCloseStepNotice(message);
      setNotice(message);
    } finally {
      setCloseStepInProgress(null);
      setSaving(false);
    }
  }

  return <section className="advisor-panel advisor-coo-workbook advisor-coo-effectiveness full" id="coo-effectiveness-pilot">
    <header className="advisor-coo-landing-header">
      <div>
        <strong>COO Workbook</strong>
        <span>Effectiveness Pilot: start clear, work the day, close with accountability.</span>
      </div>
      <nav className="advisor-coo-version-switcher" aria-label="Workbook version">
        <Link href="/vehicles/coo-workbook">Current Workbook</Link>
        <Link aria-current="page" href="/vehicles/coo-workbook/effectiveness-pilot">Effectiveness Pilot</Link>
      </nav>
      <nav className="advisor-coo-workbook-switcher" aria-label="Workbook view">
        <button aria-pressed={workbookView === "COO"} onClick={() => setWorkbookView("COO")} type="button"><ShieldCheck /> COO View</button>
        <button aria-pressed={workbookView === "MY"} onClick={() => setWorkbookView("MY")} type="button"><CheckSquare /> My Workbook</button>
      </nav>
    </header>

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
      <article className="advisor-coo-start-day">
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
        {notice ? <p className="advisor-coo-workspace-notice" role="status">{notice}</p> : null}
        <div className="advisor-coo-focus-list">
          {dailyFocus.length ? dailyFocus.slice(0, 5).map((item) => <article className={item.riskLevel.toLocaleLowerCase()} key={item.id}>
            <span><strong>{item.outcome}</strong><small>{item.priority.toLocaleLowerCase()} · {item.mustCloseToday ? "must close" : "flexible"}</small></span>
            <select aria-label={`Status for ${item.outcome}`} disabled={saving || isPilotClosed} onChange={(event) => void updateDailyFocus(item, { status: event.target.value as DailyFocusStatus })} value={item.status}>{focusStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            <select aria-label={`Risk for ${item.outcome}`} disabled={saving || isPilotClosed} onChange={(event) => void updateDailyFocus(item, { riskLevel: event.target.value as DailyFocusRisk })} value={item.riskLevel}>{focusRiskLevels.map((risk) => <option key={risk.value} value={risk.value}>{risk.label}</option>)}</select>
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

      <article className="advisor-coo-end-day">
        <header><div><strong>End The Day</strong><small>Close cleanly and set tomorrow up before leaving.</small></div><span>{activeWorkbook.governance.closeReadinessState.toLocaleLowerCase()}</span></header>
        <div className="advisor-coo-close-flow">
          <span><ListChecks /><strong>Done / Not Done</strong><small>{activeWorkbook.execution.completedWorkCount}/{activeWorkbook.execution.plannedWorkCount} planned complete</small></span>
          <span><CalendarClock /><strong>Tomorrow Setup</strong><small>{activeWorkbook.risk.tomorrowCarryoverCandidates.length} candidate item(s)</small></span>
          <span><FileText /><strong>Report Draft</strong><small>{activeWorkbook.reporting.staffGuidance}</small></span>
        </div>
        <p className="advisor-coo-governance-note">{activeWorkbook.governance.nextRecommendedAction}</p>
        <div className="advisor-coo-tomorrow-list">
          {tomorrowItems.length ? tomorrowItems.map((item) => <p key={item.id}><strong>{item.title}</strong><small>{item.detail}</small></p>) : <p><CheckCircle2 /> No tomorrow setup items yet.</p>}
        </div>
        {closeStepNotice ? <p className="advisor-coo-close-step-notice" role="status">{closeStepNotice}</p> : null}
        <div className="advisor-coo-seed-actions">
          <button disabled={saving} onClick={() => void runCloseStep("carryover")} type="button">{closeStepInProgress === "carryover" ? "Preparing..." : "Prepare Tomorrow"}</button>
          <button disabled={saving} onClick={() => void runCloseStep("draft")} type="button">{closeStepInProgress === "draft" ? "Generating..." : "Generate Draft"}</button>
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
