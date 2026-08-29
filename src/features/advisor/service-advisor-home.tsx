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
import { useState } from "react";

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
type DailyChecklistStatus = DailyChecklistItem["status"];
type QuickUpdateCategory = QuickUpdateItem["category"];
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
    ...reportSeeds.filter((seed) => seed.status === "CARRIED_OVER").map((seed) => ({ detail: seed.detail, id: `seed-${seed.id}`, kind: reportSeedSourceLabel(seed), title: seed.title }))
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

  async function generateDailyReportDraft() {
    setSaving(true);
    try {
      const response = await fetch(`/api/coo-workbook/${workbookView === "MY" ? "staff/report-drafts" : "report-drafts"}?date=${encodeURIComponent(model.generatedAt.slice(0, 10))}`, {
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to generate Daily Report Draft.");
      await refreshActiveWorkbook();
      setWorkspaceNotice(`${activeWorkbookLabel} Daily Report Draft generated from reviewed seeds.`);
    } catch (error) {
      setWorkspaceNotice(error instanceof Error ? error.message : "Unable to generate Daily Report Draft.");
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
          <button disabled={saving || !checklistText.trim()} onClick={() => void addChecklistItem()} type="button"><Plus /> Add</button>
        </div>
        <div className="advisor-coo-checklist-items">
          {checklistItems.length ? checklistItems.map((item) => <div className={`advisor-coo-checklist-item ${item.status.toLocaleLowerCase()} ${item.done ? "done" : ""}`} key={item.id}>
            <button aria-label={`Mark ${item.text} ${item.done ? "not done" : "done"}`} className="advisor-coo-check" onClick={() => void persistChecklistItem(item.id, { done: !item.done, status: !item.done ? "GREEN" : item.status })} type="button"><CheckSquare /></button>
            <div>
              <strong>{item.text}</strong>
              <small>{checklistStatusLabel(item)} · Added {dateLabel(item.createdAt)}</small>
              <input aria-label={`Update for ${item.text}`} onBlur={() => void persistChecklistItem(item.id, { update: item.update })} onChange={(event) => updateChecklistItem(item.id, { update: event.target.value })} placeholder="Add update..." value={item.update} />
            </div>
            <select aria-label={`Status for ${item.text}`} onChange={(event) => void persistChecklistItem(item.id, { status: event.target.value as DailyChecklistStatus, done: event.target.value === "GREEN" ? item.done : false })} value={item.status}>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <button aria-pressed={item.carryoverReady} onClick={() => void persistChecklistItem(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={convertingId === item.id} onClick={() => void convertToTask("checklist", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert"}</button>}
          </div>) : <p><ListChecks /> Add a quick list of what needs to get done today.</p>}
        </div>
      </section> : null}

      {initialTool === "TO_DO_LIST" ? <section className="advisor-coo-focused-tool advisor-coo-todo-list" aria-label="To-Do List tool">
        <header><div><strong>{activeWorkbookLabel} To-Do List</strong><small>Use the checklist for light same-day work. Convert only the items that need formal ownership, due dates, and tracking.</small></div><span>{checklistRollup.open} open</span></header>
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
        <textarea aria-label="Quick Update details" onChange={(event) => setQuickUpdateText(event.target.value)} placeholder="Example: AJ checked the roof today and may fix it in the next few weeks." value={quickUpdateText} />
        <div className="advisor-coo-quick-fields">
          <select aria-label="Quick Update category" onChange={(event) => setQuickUpdateCategory(event.target.value as QuickUpdateCategory)} value={quickUpdateCategory}>
            {quickUpdateCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input aria-label="Person involved" onChange={(event) => setQuickUpdatePerson(event.target.value)} placeholder="Person" value={quickUpdatePerson} />
          <input aria-label="Company or outside party" onChange={(event) => setQuickUpdateCompany(event.target.value)} placeholder="Company / outside party" value={quickUpdateCompany} />
        </div>
        <div className="advisor-coo-followup-row">
          <label><input checked={quickUpdateFollowUp} onChange={(event) => setQuickUpdateFollowUp(event.target.checked)} type="checkbox" /> Follow-up needed</label>
          <input aria-label="Follow-up due date or time window" disabled={!quickUpdateFollowUp} onChange={(event) => setQuickUpdateDueWindow(event.target.value)} placeholder="Due date or time window" value={quickUpdateDueWindow} />
          <button disabled={saving || !quickUpdateText.trim()} onClick={() => void addQuickUpdate()} type="button"><Save /> Save update</button>
        </div>
        <div className="advisor-coo-update-list">
          {quickUpdates.length ? quickUpdates.map((item) => <article key={item.id}>
            <span><strong>{quickUpdateCategoryLabel(item.category)}</strong><small>{dateLabel(item.createdAt)}</small></span>
            <p>{item.text}</p>
            <small>{[item.person, item.company, item.followUpNeeded ? `Follow-up: ${item.dueWindow || "needed"}` : "", item.carryoverReady ? "Carryover ready" : ""].filter(Boolean).join(" · ") || "No extra details"}</small>
            <button aria-pressed={item.carryoverReady} onClick={() => void persistQuickUpdate(item.id, { carryoverReady: !item.carryoverReady })} type="button">{item.carryoverReady ? "Carryover" : "Carry over"}</button>
            {item.convertedTaskId ? <Link href={`/tasks/${item.convertedTaskId}`}>Open task</Link> : <button disabled={convertingId === item.id} onClick={() => void convertToTask("quick", item)} type="button">{convertingId === item.id ? "Converting..." : "Convert to task"}</button>}
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
        <header><div><strong>Carryover</strong><small>Tomorrow-facing items pulled from checklist, Quick Updates, and reviewed Report Seeds.</small></div><span>{closeReadiness.carryoverItems} item(s)</span></header>
        <div>{carryoverPreview.length ? carryoverPreview.map((item) => <article key={item.id}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.detail}</span></article>) : <p><CheckCircle2 /> No carryover items are marked yet.</p>}</div>
      </section> : null}

      {initialTool === "REPORT_SEEDS" ? <section className="advisor-coo-focused-tool advisor-coo-report-seeds" aria-label="Report Seeds tool">
        <header><div><strong>Report Seeds</strong><small>Review, include, exclude, edit, or carry over source-backed report material.</small></div><span>{reportSeedRollup.reviewed}/{reportSeedRollup.total} reviewed</span></header>
        <div>{reportSeeds.length ? reportSeeds.map((seed) => <article className={seed.tone.toLocaleLowerCase()} key={seed.id}>
          <span><strong>{seed.title}</strong><small>{reportSeedSourceLabel(seed)} · {reportSeedStatusLabel(seed.status)}</small></span>
          <div className="advisor-coo-seed-actions">
            <button aria-pressed={seed.status === "INCLUDED"} onClick={() => void persistReportSeed(seed.id, { status: "INCLUDED" })} type="button">Include</button>
            <button aria-pressed={seed.status === "EXCLUDED"} onClick={() => void persistReportSeed(seed.id, { status: "EXCLUDED" })} type="button">Exclude</button>
            <button aria-pressed={seed.status === "CARRIED_OVER"} onClick={() => void persistReportSeed(seed.id, { status: "CARRIED_OVER" })} type="button">Carry over</button>
          </div>
          <input aria-label={`Report Seed title for ${seed.title}`} onBlur={() => void persistReportSeed(seed.id, { title: seed.title })} onChange={(event) => updateReportSeed(seed.id, { title: event.target.value })} value={seed.title} />
          <textarea aria-label={`Report Seed detail for ${seed.title}`} onBlur={() => void persistReportSeed(seed.id, { detail: seed.detail })} onChange={(event) => updateReportSeed(seed.id, { detail: event.target.value })} value={seed.detail} />
          <input aria-label={`Review note for ${seed.title}`} onBlur={() => void persistReportSeed(seed.id, { reviewNote: seed.reviewNote })} onChange={(event) => updateReportSeed(seed.id, { reviewNote: event.target.value })} placeholder="Optional review note..." value={seed.reviewNote} />
        </article>) : <p><FileText /> No report seeds yet. Work the day, then generate the report trail.</p>}</div>
      </section> : null}

      {initialTool === "STAFF_SUPPORT" ? <section className="advisor-coo-focused-tool advisor-coo-staff-visibility" aria-label="Staff Support tool">
        <header><div><strong>Staff Support</strong><small>Summary-first visibility for coaching, help, and daily accountability.</small></div><span>{staffTodayRollup.total} active</span></header>
        <div>{staffSupportQueue.length ? staffSupportQueue.map((item) => <article key={item.workbookId}><span><strong>{item.staffName}</strong><small>{item.closeReadinessScore}/100 · {item.closeReadinessTone.toLocaleLowerCase()}</small></span><p>{item.closeReadinessPrompts[0] ?? "Ready for daily close review."}</p></article>) : <p><CheckCircle2 /> Staff workbooks are clear for now.</p>}</div>
      </section> : null}

      {initialTool === "DRAFTS" ? <section className="advisor-coo-focused-tool advisor-coo-report-draft" aria-label="Report Drafts tool">
        <header><div><strong>Report Drafts</strong><small>Generate a manager-ready daily summary from reviewed seeds and operating signals.</small></div><button disabled={saving} onClick={() => void generateDailyReportDraft()} type="button"><FileText /> Generate Draft</button></header>
        {latestReportDraft ? <div className="advisor-coo-saved-draft">
          <header><strong>{latestReportDraft.title}</strong><small>Version {latestReportDraft.version} · Generated {dateLabel(latestReportDraft.generatedAt)}</small><button onClick={() => void copyDailyReportDraft()} type="button"><Copy /> Copy Draft</button></header>
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
      <div className="advisor-coo-header-actions">
        <Link href="/vehicles/coo-workbook/quick-update"><MessageSquareText /> Quick Update</Link>
        <button disabled={saving} onClick={() => void generateDailyReportDraft()} type="button"><FileText /> {saving ? "Generating..." : "Generate Report"}</button>
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
      <button disabled={saving} onClick={() => void generateDailyReportDraft()} type="button"><FileText /> {saving ? "Generating..." : "Generate Report"}</button>
    </section>

    {workspaceNotice ? <p className="advisor-coo-workspace-notice" role="status">{workspaceNotice}</p> : null}

    <footer className="advisor-coo-landing-status">
      <span><CheckCircle2 /> All workspace sources connected</span>
      <span>Last saved {dateLabel(model.generatedAt)}</span>
    </footer>
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
