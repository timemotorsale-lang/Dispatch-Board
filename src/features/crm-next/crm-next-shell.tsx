"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  FileSearch,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Target,
  UserPlus,
  Users
} from "lucide-react";

import { CrmNextIntakeForm } from "@/features/crm-next/crm-next-intake-form";
import { CrmNextActivityFilterTabs } from "@/features/crm-next/crm-next-activity-filter-tabs";
import { CrmNextDealStartTool, crmNextDealDraftStorageKey, type CrmNextDealDraft } from "@/features/crm-next/crm-next-deal-start-tool";
import { CrmNextDirectActionForm } from "@/features/crm-next/crm-next-direct-action-form";
import { CrmNextInlineTaskComposer } from "@/features/crm-next/crm-next-inline-task-composer";
import { CrmNextWorkbenchSections } from "@/features/crm-next/crm-next-workbench-sections";
import { normalizeCrmWorkPathId, type CrmWorkPathId } from "@/features/crm-next/crm-next-work-paths";
import {
  CRM_CUSTOMER_LANDING_HREF,
  CRM_NEXT_DEAL_START_HREF,
  CRM_NEXT_CUSTOMERS_HREF,
  LEGACY_CRM_FALLBACK_HREF,
  LEGACY_CUSTOMER_ARCHIVE_HREF,
  crmNextCustomerAppointmentHref
} from "@/features/crm/crm-route-authority";
import { crmActionSourceTruth } from "@/lib/crm-source-of-truth-registry";
import type { CrmNextAccessReason } from "@/server/crm-next/access";
import type { CrmNextActionBridgePreview } from "@/server/crm-next/action-bridge";
import type { CrmNextAttentionItem, CrmNextCommandCenter, CrmNextCustomer360, CrmNextMilestoneStatus, CrmNextOperatingAction, CrmNextSalesRecord } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

function levelClass(level: "High" | "Medium" | "Low") {
  if (level === "High") return styles.levelHigh;
  if (level === "Medium") return styles.levelMedium;
  return styles.levelLow;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function crmNextActionHref(actionId: string, customerId?: string) {
  const baseHref = `/crm-next/actions/${actionId}`;
  return customerId ? `${baseHref}?customerId=${encodeURIComponent(customerId)}` : baseHref;
}

function crmNextActionSearchHref(actionId: string) {
  return `/crm-next/search?returnAction=${encodeURIComponent(actionId)}`;
}

function crmNextActionLabel(actionId: string) {
  if (actionId === "add-note") return "Add Note";
  if (actionId === "new-task") return "Create CRM Task";
  if (actionId === "new-case") return "New Case";
  if (actionId === "log-call") return "Log Call";
  if (actionId === "schedule-appointment") return "Schedule Appointment";
  return "CRM action";
}

function validReturnAction(actionId?: string) {
  return ["add-note", "new-task", "new-case", "log-call", "schedule-appointment", "upload-document"].includes(actionId ?? "") ? actionId : undefined;
}

function crmNextTimelineHref(customerId?: string) {
  return customerId ? `/crm-next/timeline?customerId=${encodeURIComponent(customerId)}` : "/crm-next/timeline";
}

function salesWorkbenchHref(customer: CrmNextCustomer360) {
  return `/sales?workspace=guided&customerId=${encodeURIComponent(customer.id)}&customerName=${encodeURIComponent(customer.name)}&returnTo=${encodeURIComponent(`/crm-next/customers/${customer.id}`)}`;
}

function directActionWorkspace(action: CrmNextOperatingAction, customerName: string, nextAction: string) {
  if (action.id === "log-call") {
    return {
      button: "Log call when phone is wired",
      fields: [
        { label: "Call outcome", placeholder: "Phone provider is not wired yet. This will capture the call result here." },
        { label: "Follow-up", placeholder: nextAction }
      ],
      status: "Phone logging is not wired yet. Once connected, this page will save the call directly to the customer timeline.",
      title: "Log customer call"
    };
  }
  if (action.id === "send-email") {
    return {
      button: "Send when email is wired",
      fields: [
        { label: "Email note", placeholder: "Email provider is not wired yet. Draft context will open here." },
        { label: "Purpose", placeholder: nextAction }
      ],
      status: "Email is not wired yet. Staff can see the intended action here without being sent to another page.",
      title: "Send customer email"
    };
  }
  if (action.id === "new-task") {
    return {
      button: "Save CRM Task",
      fields: [
        { label: "Task", placeholder: nextAction },
        { label: "Due", placeholder: "Today" }
      ],
      status: `This creates a CRM task on ${customerName}'s record. It does not become a dispatch task unless staff hand it off.`,
      title: "Create CRM task"
    };
  }
  if (action.id === "add-note") {
    return {
      button: "Save Note",
      fields: [
        { label: "Note", placeholder: "Type the customer note here." }
      ],
      status: `This note stays on ${customerName}'s CRM timeline.`,
      title: "Add customer note"
    };
  }
  if (action.id === "new-case") {
    return {
      button: "Create Case",
      fields: [
        { label: "Case summary", placeholder: "What customer issue needs ownership?" },
        { label: "Owner", placeholder: "Eli Manager" },
        { label: "Priority", placeholder: "Low, Medium, High, or Urgent" },
        { label: "Due / SLA", placeholder: "Resolve by today, tomorrow, or a specific date." },
        { label: "Reminder", placeholder: "When should staff be reminded to follow up?" },
        { label: "Escalation trigger", placeholder: "Escalate if overdue, blocked, high-risk, or customer complaint is unresolved." },
        { label: "Customer note", placeholder: "Record the customer context, promise, complaint, or update that explains why this case exists." },
        { label: "Resolution needed", placeholder: "What must be true before this case can be closed?" }
      ],
      status: `This creates a tracked CRM case for ${customerName} with reminder, escalation, and resolution ownership.`,
      title: "Create customer case"
    };
  }
  if (action.id === "upload-document") {
    return {
      button: "Save Document Record",
      fields: [
        { label: "Document type", placeholder: "Insurance, ID, title, proof, or other customer document" },
        { label: "Notes", placeholder: "What is this file proving or supporting?" }
      ],
      status: "Choose the file, classify it, and save the document record to the customer timeline.",
      title: "Upload customer document"
    };
  }
  return {
    button: "Continue",
    fields: [{ label: "Next step", placeholder: action.response }],
    status: "This action is available from Customer Console.",
    title: action.label
  };
}

const CRM_WORK_PATHS = {
  "customer-follow-up": {
    completeStage: "Resolved",
    detailLabel: "Follow-up Evidence",
    label: "Customer Follow-up",
    primaryAction: "Update follow-up",
    progressActive: "Review follow-up",
    summaryLabel: "Issue",
    stages: ["New", "Contact Attempt", "Contacted", "Follow-up Needed", "Resolved", "Closed", "No Action Needed"]
  },
  "delivery-transport": {
    completeStage: "Delivered",
    detailLabel: "Delivery Evidence",
    label: "Delivery / Transport",
    primaryAction: "Record delivery",
    progressActive: "Complete delivery",
    summaryLabel: "Delivery",
    stages: ["Requested", "Assigned", "Scheduled", "In Transit", "Delivered", "Resolved", "Closed", "No Action Needed"]
  },
  "finance-payment": {
    completeStage: "Resolved",
    detailLabel: "Payment Evidence",
    label: "Finance / Payment",
    primaryAction: "Update payment issue",
    progressActive: "Resolve payment",
    summaryLabel: "Payment",
    stages: ["New", "Reviewed", "Promise Made", "Waiting Payment", "Resolved", "Closed", "No Action Needed"]
  },
  "general-issue": {
    completeStage: "Resolved",
    detailLabel: "Issue Evidence",
    label: "General Issue",
    primaryAction: "Update issue",
    progressActive: "Resolve issue",
    summaryLabel: "Issue",
    stages: ["Open", "Reviewed", "Waiting", "Resolved", "Closed", "No Action Needed"]
  },
  "sales-deal": {
    completeStage: "Sold",
    detailLabel: "Deal Evidence",
    label: "Sales / Deal",
    primaryAction: "Start deal",
    progressActive: "Start deal",
    summaryLabel: "Deals",
    stages: ["New", "Contact Attempt", "Contacted", "Appointment Scheduled", "Working Deal", "Missed Appt.", "Visit Follow-up", "Sold", "Lost"]
  },
  "service-repair": {
    completeStage: "Completed",
    detailLabel: "Service Evidence",
    label: "Service / Repair",
    primaryAction: "Update service",
    progressActive: "Complete service",
    summaryLabel: "Service",
    stages: ["Intake", "Diagnosed", "Waiting Approval", "In Progress", "Ready", "Completed", "Resolved", "Closed", "No Action Needed"]
  },
  "title-document": {
    completeStage: "Resolved",
    detailLabel: "Document Evidence",
    label: "Title / Document",
    primaryAction: "Update document issue",
    progressActive: "Resolve document",
    summaryLabel: "Documents",
    stages: ["Open", "Reviewed", "Waiting Document", "Ready", "Resolved", "Closed", "No Action Needed"]
  },
  "vendor-partner": {
    completeStage: "Resolved",
    detailLabel: "Vendor Evidence",
    label: "Vendor / Partner",
    primaryAction: "Update vendor issue",
    progressActive: "Resolve vendor issue",
    summaryLabel: "Vendor Work",
    stages: ["Open", "Assigned", "Waiting Vendor", "Completed", "Resolved", "Closed", "No Action Needed"]
  }
} as const;

type CustomerJourneyStage = typeof CRM_WORK_PATHS[CrmWorkPathId]["stages"][number];

const CRM_DEALERSHIP_WORK_CATEGORIES = [
  { id: "retail-sale", label: "Retail sale / purchase", path: "sales-deal", summary: "Shopping, working numbers, deal creation, or sold/lost decision." },
  { id: "lead-follow-up", label: "Lead follow-up", path: "customer-follow-up", summary: "Follow up with a lead, prospect, or previous conversation." },
  { id: "appointment-follow-up", label: "Appointment follow-up", path: "customer-follow-up", summary: "Confirm, reschedule, or follow through after an appointment." },
  { id: "vehicle-delivery", label: "Vehicle delivery / transport", path: "delivery-transport", summary: "Transporter, pickup, drop-off, delivery promise, or handoff close-out." },
  { id: "service-repair", label: "Service / repair", path: "service-repair", summary: "Repair order, service visit, diagnosis, approval, or vehicle-ready update." },
  { id: "title-registration", label: "Title / registration", path: "title-document", summary: "Title, lien, registration, plates, paperwork, or document blocker." },
  { id: "finance-payment", label: "Finance / payment", path: "finance-payment", summary: "Deposit, down payment, collections, promise-to-pay, or lender issue." },
  { id: "document-upload", label: "Document / proof collection", path: "title-document", summary: "Collect ID, insurance, proof, signed form, or other required document." },
  { id: "customer-issue", label: "Customer issue / complaint", path: "general-issue", summary: "Complaint, support case, blocker, or customer concern needing resolution." },
  { id: "vendor-partner", label: "Vendor / partner", path: "vendor-partner", summary: "Tow company, warranty company, transporter, auction, or outside party work." },
  { id: "ownership-support", label: "Ownership support", path: "customer-follow-up", summary: "Post-sale ownership help, customer care, or continuity follow-up." },
  { id: "general-work", label: "General work / other", path: "general-issue", summary: "Use when the customer or vendor needs help but no specific category fits." }
] as const satisfies Array<{ id: string; label: string; path: CrmWorkPathId; summary: string }>;

type CrmWorkCategoryId = typeof CRM_DEALERSHIP_WORK_CATEGORIES[number]["id"];

function normalizeCrmWorkCategoryId(value: string | null | undefined): CrmWorkCategoryId | null {
  return CRM_DEALERSHIP_WORK_CATEGORIES.some((category) => category.id === value) ? value as CrmWorkCategoryId : null;
}

function crmWorkCategoryStorageKey(customerId: string) {
  return `crm-next:work-category:${customerId}`;
}

function crmWorkCategoryById(categoryId: CrmWorkCategoryId) {
  return CRM_DEALERSHIP_WORK_CATEGORIES.find((category) => category.id === categoryId) ?? CRM_DEALERSHIP_WORK_CATEGORIES[0];
}

function crmWorkPathStorageKey(customerId: string) {
  return `crm-next:work-path:${customerId}`;
}

function workbenchCheckInHref(baseHref: string, path: CrmWorkPathId, categoryId?: CrmWorkCategoryId) {
  const joiner = baseHref.includes("?") ? "&" : "?";
  const query = new URLSearchParams({ workPath: path });
  if (categoryId) query.set("category", categoryId);
  return `${baseHref}${joiner}${query.toString()}`;
}

function inferCrmWorkPath(item: Pick<CrmNextAttentionItem, "area" | "customerName" | "nextAction" | "reason">): CrmWorkPathId {
  const text = `${item.customerName} ${item.reason} ${item.nextAction} ${item.area}`.toLowerCase();
  if (/\b(transport|transporter|tow|towing|delivery|delivered|pickup|pick up|drop[- ]?off|vendor)\b/.test(text)) return "delivery-transport";
  if (/\b(service|repair|diagnos|appointment|ro\b|mechanic)\b/.test(text)) return "service-repair";
  if (/\b(payment|promise|finance|collections|down payment|deposit)\b/.test(text)) return "finance-payment";
  if (/\b(title|document|paperwork|registration|lien|license)\b/.test(text)) return "title-document";
  if (/\b(case|issue|complaint|support|problem|resolved)\b/.test(text)) return "general-issue";
  return "sales-deal";
}

function readCrmWorkPath(item: CrmNextAttentionItem, preferredPath?: CrmWorkPathId): CrmWorkPathId {
  if (preferredPath) return preferredPath;
  if (typeof window !== "undefined") {
    try {
      const stored = normalizeCrmWorkPathId(window.localStorage.getItem(crmWorkPathStorageKey(item.customerId)));
      if (stored) return stored;
    } catch {
      // Path inference still keeps the workbench usable when local storage is unavailable.
    }
  }
  return inferCrmWorkPath(item);
}

function normalizeJourneyStage(stage: string | undefined, path: CrmWorkPathId): CustomerJourneyStage {
  const stages = CRM_WORK_PATHS[path].stages;
  if (stage && (stages as readonly string[]).includes(stage)) return stage as CustomerJourneyStage;
  if (path !== "sales-deal" && stage === "Sold") return CRM_WORK_PATHS[path].completeStage as CustomerJourneyStage;
  if (path !== "sales-deal" && stage === "Lost") return "Closed" as CustomerJourneyStage;
  return stages[Math.min(2, stages.length - 1)] as CustomerJourneyStage;
}

function isTerminalJourneyStage(stage: CustomerJourneyStage) {
  return ["Closed", "Completed", "Delivered", "Lost", "No Action Needed", "Resolved", "Sold"].includes(stage);
}

function customerWorkbenchProgressStorageKey(customerId: string) {
  return `crm-next:workbench:${customerId}:progress`;
}

function isKnownJourneyStage(stage: string | undefined): stage is CustomerJourneyStage {
  if (!stage) return false;
  return Object.values(CRM_WORK_PATHS).some((path) => (path.stages as readonly string[]).includes(stage));
}

function readCustomerWorkbenchProgress(customerId: string) {
  if (!customerId || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(customerWorkbenchProgressStorageKey(customerId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { notice?: string; stage?: string };
    return {
      notice: typeof parsed.notice === "string" ? parsed.notice : "",
      stage: isKnownJourneyStage(parsed.stage) ? parsed.stage : undefined
    };
  } catch {
    return null;
  }
}

function isAttentionClosedLocally(item: CrmNextAttentionItem) {
  const savedStage = readCustomerWorkbenchProgress(item.customerId)?.stage;
  return Boolean(savedStage && isTerminalJourneyStage(savedStage));
}

function openAttentionItems(items: CrmNextAttentionItem[]) {
  return items.filter((item) => !isAttentionClosedLocally(item));
}

function customer360Href(customerId: string) {
  return `/crm-next/customers/${encodeURIComponent(customerId)}`;
}

function customerDisplayStatus(customer: CrmNextCustomer360, savedStage?: CustomerJourneyStage) {
  return savedStage && isTerminalJourneyStage(savedStage) ? savedStage : customer.status;
}

function normalizedCustomerIdentityValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "not recorded" || normalized.includes("not recorded")) return "";
  return normalized;
}

function customerDuplicateKeys(customer: CrmNextCustomer360) {
  return [
    normalizedCustomerIdentityValue(customer.name),
    normalizedCustomerIdentityValue(customer.phone),
    normalizedCustomerIdentityValue(customer.email)
  ].filter(Boolean);
}

function isAppointmentStage(stage: CustomerJourneyStage) {
  return ["Appointment Scheduled", "Missed Appt.", "Scheduled", "Visit Follow-up"].includes(stage);
}

function isDealStage(stage: CustomerJourneyStage) {
  return ["Lost", "Sold", "Working Deal"].includes(stage);
}

function customerJourneyStage(customer: CrmNextCustomer360, activeAttentionItem?: CrmNextAttentionItem) {
  const nextAction = `${customer.nextAction} ${activeAttentionItem?.nextAction ?? ""}`.toLowerCase();
  if (customer.openDeals > 0 || nextAction.includes("deal")) return "Working Deal";
  if (nextAction.includes("appointment") || nextAction.includes("schedule")) return "Appointment Scheduled";
  if (customer.communications.length > 0 || nextAction.includes("call") || nextAction.includes("contact")) return "Contacted";
  return "New";
}

function customerRelationshipType(customer: CrmNextCustomer360, attentionItem?: CrmNextAttentionItem) {
  const text = `${customer.name} ${customer.nextAction} ${attentionItem?.reason ?? ""} ${attentionItem?.nextAction ?? ""}`.toLowerCase();
  if (/\b(transport|transporter|tow|towing|vendor|warranty|lender|auction)\b/.test(text)) return "Vendor / Partner";
  if (customer.openDeals > 0 || /\b(deal|sale|sold|vehicle interest|retail)\b/.test(text)) return "Customer / Sales";
  if (/\b(service|repair|ro\b|appointment)\b/.test(text)) return "Customer / Service";
  if (/\b(title|document|paperwork|registration)\b/.test(text)) return "Customer / Document";
  if (/\b(payment|finance|deposit|collections)\b/.test(text)) return "Customer / Finance";
  return "Customer / General";
}

function customerDirectoryCategory(customer: CrmNextCustomer360, attentionItem?: CrmNextAttentionItem) {
  const text = `${customer.name} ${customer.nextAction} ${attentionItem?.reason ?? ""} ${attentionItem?.nextAction ?? ""}`.toLowerCase();
  if (/\b(transport|transporter|tow|towing|vendor|warranty|lender|auction)\b/.test(text)) return "Vendor";
  if (/\b(service|repair|ro\b|appointment)\b/.test(text)) return "Service";
  if (/\b(title|document|paperwork|registration|proof|upload)\b/.test(text)) return "Docs";
  if (/\b(payment|finance|deposit|collections)\b/.test(text)) return "Finance";
  if (customer.openDeals > 0 || attentionItem?.area === "Sales" || /\b(deal|sale|sold|vehicle interest|retail)\b/.test(text)) return "Sales";
  if (attentionItem?.area === "Service") return "Service";
  if (attentionItem?.area === "Finance") return "Finance";
  if (attentionItem?.area === "Support") return "Support";
  if (/\b(overdue|follow[- ]?up|call back|check in|contact)\b/.test(text)) return "Follow-up";
  return "General";
}

function customerSearchKeywords(customer: CrmNextCustomer360, attentionItem?: CrmNextAttentionItem) {
  return [
    customer.name,
    customer.phone,
    customer.email,
    customer.vehicles.map((vehicle) => `${vehicle.label} ${vehicle.vin}`).join(" "),
    customer.nextAction,
    attentionItem?.reason,
    attentionItem?.nextAction
  ].filter(Boolean).join(" · ");
}

function customerWorkIssue(item: CrmNextAttentionItem) {
  const reason = item.reason.toLowerCase();
  const nextAction = item.nextAction || "Review customer record";
  if (reason.includes("payment")) {
    return {
      done: "Payment status, customer promise, and next due date are recorded.",
      issue: item.reason,
      why: "Finance risk can interrupt delivery, collections, or the next customer commitment."
    };
  }
  if (reason.includes("title")) {
    return {
      done: "Title status is confirmed, blocker is owned, and the customer has a clear update.",
      issue: item.reason,
      why: "Title uncertainty can block delivery, registration, financing, or customer trust."
    };
  }
  if (reason.includes("service") || reason.includes("appointment")) {
    return {
      done: "Appointment or service plan is scheduled, confirmed, or clearly carried forward.",
      issue: item.reason,
      why: "The customer needs a clear service path before the issue becomes a complaint."
    };
  }
  if (reason.includes("insurance") || reason.includes("claim")) {
    return {
      done: "Claim status, responsible party, and customer follow-up window are recorded.",
      issue: item.reason,
      why: "Insurance work often depends on outside parties and needs visible ownership."
    };
  }
  return {
    done: `${nextAction} is completed or updated with the customer outcome and next follow-up.`,
    issue: item.reason || "Customer record needs review",
    why: "The customer record needs enough clarity for staff to take the next safe step."
  };
}

function verifiedTimelineEvents(events: CrmNextCommandCenter["timeline"]) {
  return events.filter((event) => Boolean(event.sourceRecordId));
}

type WorkbenchDealEvidence = {
  detail: string;
  label: string;
  source: string;
  started: boolean;
  vehicle?: string;
};

function readWorkbenchDealDraft(customerId: string): CrmNextDealDraft | null {
  if (!customerId || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(crmNextDealDraftStorageKey(customerId));
    return stored ? JSON.parse(stored) as CrmNextDealDraft : null;
  } catch {
    return null;
  }
}

function vehicleFromTimeline(events: CrmNextCommandCenter["timeline"]) {
  const vehicleLike = events.find((event) =>
    Boolean(event.sourceRecordId) &&
    (
      event.source === "Vehicle" ||
      event.source === "Opportunity" ||
      /\b(19|20)\d{2}\b.*\b(vehicle|jeep|ford|chevrolet|toyota|honda|hyundai|nissan|kia|cherokee|elantra|camry|accord|suv|sedan|truck)\b/i.test(`${event.label} ${event.detail}`)
    )
  );
  return vehicleLike ? `${vehicleLike.label}: ${vehicleLike.detail}` : "";
}

function salesRecordForCustomer(records: CrmNextSalesRecord[], item: CrmNextAttentionItem) {
  return records.find((record) =>
    record.customerName.toLowerCase() === item.customerName.toLowerCase() ||
    record.href.includes(encodeURIComponent(item.customerId))
  );
}

function sourceDealEvidence(model: CrmNextCommandCenter, item: CrmNextAttentionItem): WorkbenchDealEvidence {
  const customers = model.customers ?? [];
  const sales = model.sales ?? { deals: [], opportunities: [] };
  const customer = customers.find((record) => record.id === item.customerId || record.name === item.customerName);
  const dealRecord = salesRecordForCustomer(sales.deals ?? [], item) ?? salesRecordForCustomer(sales.opportunities ?? [], item);
  const linkedVehicle = customer?.vehicles[0]?.label;
  const timelineVehicle = vehicleFromTimeline(model.timeline ?? []);

  if (dealRecord) {
    return {
      detail: `${dealRecord.stage} · ${dealRecord.vehicle || "Vehicle pending"}`,
      label: "Deal started",
      source: "Deal workspace",
      started: true,
      vehicle: dealRecord.vehicle
    };
  }

  if ((customer?.openDeals ?? 0) > 0) {
    return {
      detail: `${customer?.openDeals ?? 0} open deal${customer?.openDeals === 1 ? "" : "s"} on Customer 360`,
      label: "Deal started",
      source: "Customer 360",
      started: true,
      vehicle: linkedVehicle
    };
  }

  if (linkedVehicle) {
    return {
      detail: `Vehicle selected: ${linkedVehicle}`,
      label: "Vehicle selected",
      source: "Customer 360",
      started: true,
      vehicle: linkedVehicle
    };
  }

  if (timelineVehicle) {
    return {
      detail: timelineVehicle,
      label: "Vehicle selected",
      source: "Customer timeline",
      started: true
    };
  }

  return {
    detail: "No deal or vehicle evidence is visible on this workbench yet.",
    label: "Start deal",
    source: "Workbench",
    started: false
  };
}

export function CrmNextUnavailable({ fallbackHref, reason }: { fallbackHref: string; reason: CrmNextAccessReason }) {
  const message = reason === "CRM_NEXT_OFF"
    ? "Customer Console is safely turned off. Customer Archive and the older customer tools remain available."
    : "Customer Console is not enabled for your current workspace.";

  return (
    <section className={styles.blocked} aria-label="Customer Console unavailable">
      <small>CRM NEXT</small>
      <h1>Customer Console is protected right now.</h1>
      <p>{message}</p>
      <div className={styles.buttonRow}>
        <Link className={styles.primaryButton} href={fallbackHref}>Return to my workspace</Link>
        <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Customer Archive</Link>
        <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Older Customer Tools</Link>
      </div>
    </section>
  );
}

function CrmNextFrame({ active, children, userName }: { active: "command" | "new" | "attention" | "customer" | "customers" | "work" | "progress" | "search" | "pipeline" | "timeline" | "appointments" | "deals" | "support" | "execution" | "intelligence" | "pilot" | "hardening" | "coexistence" | "release" | "safety" | "review"; children: React.ReactNode; userName: string }) {
  const links = [
    { id: "command", href: "/crm-next", label: "Command Center", icon: LayoutDashboard },
    { id: "attention", href: "/crm-next/needs-attention", label: "Needs Attention", icon: Bell },
    { id: "work", href: "/crm-next/work/attn-michael-overdue-follow-up", label: "Work Customer", icon: ClipboardCheck },
    { id: "search", href: "/crm-next/search", label: "Search", icon: Search },
    { id: "pipeline", href: "/crm-next/pipeline", label: "Pipeline", icon: Target },
    { id: "timeline", href: "/crm-next/timeline", label: "Timeline", icon: FileSearch },
    { id: "appointments", href: "/crm-next/appointments", label: "Appointments", icon: CalendarDays },
    { id: "deals", href: "/crm-next/deals", label: "Deals", icon: DollarSign },
    { id: "support", href: "/crm-next/ownership-support", label: "Ownership & Support", icon: FileText },
    { id: "execution", href: "/crm-next/shared-execution", label: "Shared Execution", icon: ClipboardCheck },
    { id: "intelligence", href: "/crm-next/intelligence-foundation", label: "Intelligence", icon: Brain }
  ] as const;

  return (
    <section className={`${styles.shell} crm-next-shell`}>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="Customer Console navigation">
          <div className={styles.brand}>Time Motor Sales</div>
          <Link className={styles.consoleReturn} href={CRM_CUSTOMER_LANDING_HREF}>
            <ArrowLeft size={16} /> Customers console
          </Link>
          <nav className={styles.nav}>
            {links.slice(0, 1).map(({ id, href, label, icon: Icon }) => (
              <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>
                <Icon size={17} /> {label}
              </Link>
            ))}
            <div className={styles.navGroup} data-active={active === "customers" || active === "customer" || active === "new" ? "true" : undefined}>
              <Link aria-current={active === "customers" || active === "customer" ? "page" : undefined} href={CRM_NEXT_CUSTOMERS_HREF}>
                <Users size={17} /> Customers
              </Link>
              <div className={styles.navChildren}>
                <Link aria-current={active === "customers" ? "page" : undefined} href={CRM_NEXT_CUSTOMERS_HREF}>Customer List</Link>
                <Link aria-current={active === "new" ? "page" : undefined} href="/crm-next/new">Add Customer</Link>
                <Link href="/crm-next/pipeline">Leads</Link>
              </div>
            </div>
            {links.slice(1).map(({ id, href, label, icon: Icon }) => (
              <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>
                <Icon size={17} /> {label}
              </Link>
            ))}
            <Link href={LEGACY_CRM_FALLBACK_HREF}><ChevronRight size={17} /> Older Customer Tools</Link>
            <Link href={LEGACY_CUSTOMER_ARCHIVE_HREF}><ChevronRight size={17} /> Customer Archive</Link>
          </nav>
          <div className={styles.operator}>
            <strong>{userName}</strong>
            <small>Team workspace</small>
          </div>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </section>
  );
}

function Topbar({ defaultQuery = "", returnAction }: { defaultQuery?: string; returnAction?: string }) {
  return (
    <div className={styles.topbar}>
      <form action="/crm-next/search" className={styles.search} role="search">
        <Search size={20} aria-hidden="true" />
        {returnAction ? <input name="returnAction" type="hidden" value={returnAction} /> : null}
        <input
          aria-label="Search customer records"
          defaultValue={defaultQuery}
          name="q"
          placeholder="Search customers, vehicles, deals, stock #, RO..."
          type="search"
        />
        <button type="submit">Search</button>
      </form>
      <div className={styles.topActions}>
        <Link className={styles.secondaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
        <div className={styles.governance}><ShieldCheck size={16} /> Customer Console active</div>
      </div>
    </div>
  );
}

function safeOperationalRead(model: CrmNextCommandCenter): CrmNextCommandCenter["operationalRead"] {
  return model.operationalRead ?? {
    safety: "Customer Console is using a protected fallback while source status refreshes.",
    sources: [],
    state: "FALLBACK_READ"
  };
}

function safeEnterpriseLayer(model: CrmNextCommandCenter): CrmNextCommandCenter["enterpriseLayer"] {
  return model.enterpriseLayer ?? {
    adminGuardrails: [],
    automationRecommendations: [],
    reportingBrief: {
      generatedAt: new Date(0).toISOString(),
      managerSummary: "Report readiness is unavailable while enterprise signals refresh.",
      reviewableSeedCount: 0,
      sections: [],
      sourceCount: 0
    },
    supportingParties: []
  };
}

function OperationalSourceStrip({ model }: { model: CrmNextCommandCenter }) {
  const operationalRead = safeOperationalRead(model);
  return (
    <section className={styles.sourceStrip} aria-label="Customer source status">
      <div>
        <span className={styles.eyebrow}>Operational read status</span>
        <strong>{operationalRead.state.replaceAll("_", " ")}</strong>
        <p>{operationalRead.safety}</p>
      </div>
      <div className={styles.sourcePills}>
        {operationalRead.sources.map((source) => (
          <Link className={styles.sourcePill} data-state={source.state} href={source.href} key={`${source.id}-${source.observedAt}`}>
            <span>{source.label}</span>
            <b>{source.state.replaceAll("_", " ")}</b>
            <small>{source.sourceOfTruth}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompactSourceStatus({ model }: { model: CrmNextCommandCenter }) {
  const operationalRead = safeOperationalRead(model);
  return (
    <div className={styles.compactSourceStatus} aria-label="Customer source status">
      <span>Source status: <strong>{operationalRead.state.replaceAll("_", " ")}</strong></span>
      {operationalRead.sources.slice(0, 4).map((source) => (
        <Link data-state={source.state} href={source.href} key={`${source.id}-${source.label}`}>
          {source.label}: {source.state.replaceAll("_", " ")}
        </Link>
      ))}
      <small>No live communications</small>
    </div>
  );
}

function automationLevelClass(severity: string) {
  if (severity === "critical" || severity === "high") return styles.levelHigh;
  if (severity === "medium") return styles.levelMedium;
  return styles.levelLow;
}

function CrmNextRecommendedWork({ model }: { model: CrmNextCommandCenter }) {
  const recommendations = safeEnterpriseLayer(model).automationRecommendations.slice(0, 4);
  if (recommendations.length === 0) return null;

  return (
    <article className={`${styles.card} ${styles.enterprisePanel}`}>
      <header>
        <div>
          <h2>Recommended by system</h2>
          <p className={styles.muted}>Customer Console is surfacing the next safest customer work from the signals already visible to the team.</p>
        </div>
        <span className={styles.pill}>{recommendations.length} ready</span>
      </header>
      <div className={styles.enterpriseActionList}>
        {recommendations.map((item) => (
          <Link className={styles.enterpriseActionRow} href={item.href} key={item.id}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.explanation}</small>
            </span>
            <b className={automationLevelClass(item.severity)}>{item.actionLabel}</b>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextSupportingParties({ model, compact = false }: { compact?: boolean; model: CrmNextCommandCenter }) {
  const parties = safeEnterpriseLayer(model).supportingParties.slice(0, compact ? 3 : 3);
  if (parties.length === 0) return null;

  return (
    <article className={styles.sidePanel}>
      <header>
        <h2>Supporting Parties</h2>
        <span className={styles.pill}>{parties.length}</span>
      </header>
      <div className={styles.partyList}>
        {parties.map((context) => (
          <Link className={styles.partyItem} href={context.associations[0]?.href ?? "/crm-next/ownership-support"} key={context.party.id}>
            <strong>{context.party.name}</strong>
            <small>{context.party.typeLabel} · {context.openFollowUps.length} follow-up</small>
            <span>{context.workbookCandidates[0]?.title ?? context.associations[0]?.label ?? "Open supporting context"}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextReportReadiness({ model }: { model: CrmNextCommandCenter }) {
  const brief = safeEnterpriseLayer(model).reportingBrief;
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>Report readiness</h2>
          <p className={styles.muted}>{brief.managerSummary}</p>
        </div>
        <span className={styles.pill}>{brief.reviewableSeedCount} seeds</span>
      </header>
      <div className={styles.reportSectionList}>
        {brief.sections.slice(0, 4).map((section) => (
          <Link className={styles.reportSectionItem} href={section.items[0]?.href ?? "/crm-next/timeline"} key={section.reportType}>
            <span>{section.title}</span>
            <strong>{section.items.length}</strong>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextAdminGuardrails({ model }: { model: CrmNextCommandCenter }) {
  const controls = safeEnterpriseLayer(model).adminGuardrails.slice(0, 4);
  if (controls.length === 0) return null;

  return (
    <article className={styles.sidePanel}>
      <header>
        <h2>Admin guardrails</h2>
        <span className={styles.pill}>{controls.length}</span>
      </header>
      <div className={styles.guardrailList}>
        {controls.map((control) => (
          <Link href={control.href} key={control.title}>
            <strong>{control.title}</strong>
            <small>{control.summary}</small>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CrmNextCommandCenterView({ model }: { model: CrmNextCommandCenter }) {
  const customers = model.customers ?? [];
  const attention = openAttentionItems(model.attention ?? []);
  const nextActions = model.nextActions ?? [];
  const pipeline = model.pipeline ?? [];
  const summary = model.summary ?? [];
  const revenue = model.revenue ?? { monthToDate: "No source data available", trend: "Revenue source is unavailable right now." };
  const commandCenter = model.commandCenter ?? {
    guidance: "Open Customer Console tools while customer source status refreshes.",
    headline: "Who needs attention?"
  };
  const firstVerifiedCustomerHref = customers[0] ? `/crm-next/customers/${encodeURIComponent(customers[0].id)}` : "/crm-next/search";
  const firstVerifiedWorkHref = attention[0]?.workHref ?? "/crm-next/needs-attention";
  return (
    <CrmNextFrame active="command" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Command Center Dashboard</span>
          <h1>{commandCenter.headline}</h1>
          <p>{commandCenter.guidance}</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.primaryButton} href="/crm-next/needs-attention"><Bell size={16} /> View attention queue</Link>
          <Link className={styles.secondaryButton} href="/crm-next/search"><Search size={16} /> Search customer records</Link>
          <Link className={styles.secondaryButton} href={firstVerifiedCustomerHref}><Users size={16} /> Open Customer 360</Link>
          <Link className={styles.secondaryButton} href={firstVerifiedWorkHref}><ClipboardCheck size={16} /> Work customer</Link>
          <Link className={styles.secondaryButton} href="/crm-next/pipeline"><Target size={16} /> Pipeline</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console summary">
        {summary.map((item) => (
          <Link className={styles.summaryCard} data-tone={item.tone} href={item.href} key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <p>{item.trend}</p>
            <span>{item.source}</span>
          </Link>
        ))}
      </section>

      <section className={styles.enterpriseSurfaceGrid} aria-label="Customer Console operating intelligence">
        <CrmNextRecommendedWork model={model} />
        <CrmNextReportReadiness model={model} />
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`${styles.card} ${styles.wide}`}>
          <header><h2>Needs Attention (Top 5)</h2><Link className={styles.textLink} href="/crm-next/needs-attention">View all</Link></header>
          <div className={styles.attentionList}>
            {attention.length ? attention.map((item) => <AttentionRow item={item} key={item.id} />) : (
              <div className={styles.activityTimelineEmpty}>
                <strong>No source data available</strong>
                <span>No verified customer attention records are available yet.</span>
              </div>
            )}
          </div>
        </article>
        <article className={styles.card}>
          <header><h2>Intelligence & Next Action</h2><span className={styles.pill}>Today</span></header>
          <div className={styles.nextList}>
            {nextActions.length ? nextActions.map((action) => (
              <Link className={styles.nextItem} href={action.href} key={action.id}>
                <CheckCircle2 size={20} />
                <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                <b className={levelClass(action.impact)}>{action.impact}</b>
              </Link>
            )) : (
              <div className={styles.activityTimelineEmpty}>
                <strong>No source data available</strong>
                <span>No verified next-action recommendations are available yet.</span>
              </div>
            )}
          </div>
        </article>
        <CrmNextSupportingParties model={model} />
        <article className={styles.card} id="pipeline">
          <header><h2>Pipeline Overview</h2><Link className={styles.textLink} href="/crm-next/pipeline">Open board</Link></header>
          <div className={styles.pipelineRows}>
            {pipeline.length ? pipeline.map((row) => (
              <div className={styles.pipelineRow} key={row.label}>
                <span>{row.label}</span><span className={styles.bar}><i style={{ width: `${Math.max(12, row.value)}%` }} /></span><strong>{row.value}</strong>
              </div>
            )) : (
              <div className={styles.activityTimelineEmpty}>
                <strong>No source data available</strong>
                <span>No verified pipeline stages are available yet.</span>
              </div>
            )}
          </div>
        </article>
        <article className={styles.card}>
          <header><h2>Revenue (MTD)</h2><Link className={styles.textLink} href="/crm-next/deals"><DollarSign size={18} /></Link></header>
          <div className={styles.revenueValue}>{revenue.monthToDate}</div>
          <p className={styles.muted}>{revenue.trend}</p>
        </article>
        <CrmNextAdminGuardrails model={model} />
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextCustomersListView({ model }: { model: CrmNextCommandCenter }) {
  const customers = model.customers ?? [];
  const attention = model.attention ?? [];
  const hasVerifiedCustomers = customers.length > 0;
  const [savedCustomerProgress] = useState<Record<string, { notice: string; stage?: CustomerJourneyStage }>>(() => {
    const nextProgress: Record<string, { notice: string; stage?: CustomerJourneyStage }> = {};
    if (typeof window === "undefined") return nextProgress;
    for (const customer of customers) {
      const storedProgress = readCustomerWorkbenchProgress(customer.id);
      if (storedProgress?.stage) nextProgress[customer.id] = storedProgress;
    }
    return nextProgress;
  });
  const duplicateBuckets = new Map<string, string[]>();
  for (const customer of customers) {
    for (const key of customerDuplicateKeys(customer)) {
      duplicateBuckets.set(key, [...(duplicateBuckets.get(key) ?? []), customer.id]);
    }
  }
  const duplicateCustomerIds = new Set(
    [...duplicateBuckets.values()]
      .filter((ids) => ids.length > 1)
      .flat()
  );
  const customerHealth = {
    closed: customers.filter((customer) => {
      const savedStage = savedCustomerProgress[customer.id]?.stage;
      return Boolean(savedStage && isTerminalJourneyStage(savedStage));
    }).length,
    duplicates: duplicateCustomerIds.size,
    missingOwner: customers.filter((customer) => {
      const attentionItem = attention.find((item) => item.customerId === customer.id);
      return !attentionItem?.owner || attentionItem.owner === "Unassigned";
    }).length,
    visible: customers.length
  };

  return (
    <CrmNextFrame active="customers" userName={model.userName}>
      <Topbar />
      <section className={styles.compactHero}>
        <div>
          <span className={styles.eyebrow}>Customers</span>
          <h1>Find the customer, then keep working.</h1>
          <p>Browse active customers when you do not remember the name, or jump into Customer 360, Attend Mode, leads, and intake.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.secondaryButton} href="/crm-next/search"><Search size={16} /> Search customer records</Link>
          <Link className={styles.secondaryButton} href="/crm-next/pipeline"><Target size={16} /> Leads</Link>
        </div>
      </section>

      <section className={styles.customerDirectoryGrid}>
        <details className={styles.customerToolsDrawer}>
          <summary>
            <span>
              <strong>Customer tools</strong>
              <small>Add, search, review attention, or open pipeline without narrowing the list.</small>
            </span>
            <ChevronRight size={18} />
          </summary>
          <div className={styles.miniActionList}>
            <Link href="/crm-next/new"><UserPlus size={16} /> Add a customer or prospect</Link>
            <Link href="/crm-next/pipeline"><Target size={16} /> Open leads and pipeline</Link>
            <Link href="/crm-next/needs-attention"><Bell size={16} /> View customers needing attention</Link>
            <Link href="/crm-next/search"><Search size={16} /> Search all customer records</Link>
          </div>
        </details>
        <section className={styles.customerConsoleGuardrails} aria-label="Customer console hardening checks">
          <article><span>Visible records</span><strong>{customerHealth.visible}</strong><small>Live customer source</small></article>
          <article><span>Need owner</span><strong>{customerHealth.missingOwner}</strong><small>Assign before handoff</small></article>
          <article><span>Possible duplicates</span><strong>{customerHealth.duplicates}</strong><small>Name, phone, or email match</small></article>
          <article><span>Closed locally</span><strong>{customerHealth.closed}</strong><small>Workbench outcome saved</small></article>
        </section>
        <article className={`${styles.card} ${styles.directoryCard}`}>
          <header>
            <h2>Customer List</h2>
            <span className={styles.pill}>{customers.length} visible</span>
          </header>
          <div className={styles.directoryRows}>
            {hasVerifiedCustomers ? customers.map((customer) => {
              const activeAttentionItem = attention.find((item) => item.customerId === customer.id);
              const attendHref = activeAttentionItem?.workHref ?? `/crm-next/work/customer-read-${encodeURIComponent(customer.id)}`;
              const savedStage = savedCustomerProgress[customer.id]?.stage;
              const displayStatus = customerDisplayStatus(customer, savedStage);
              const statusTone = displayStatus === "Active" ? "active" : "closed";
              const customerCategory = customerDirectoryCategory(customer, activeAttentionItem);
              const rowIssues = [
                !activeAttentionItem?.owner || activeAttentionItem.owner === "Unassigned" ? "Needs owner" : "",
                duplicateCustomerIds.has(customer.id) ? "Possible duplicate" : "",
                statusTone === "closed" ? "Closed locally" : ""
              ].filter(Boolean);
              return (
                <article className={styles.directoryRow} data-status={statusTone} key={customer.id}>
                  <Link className={styles.directoryIdentity} href={customer360Href(customer.id)}>
                    <span className={styles.avatar}>{initials(customer.name)}</span>
                    <span>
                      <strong>{customer.name}</strong>
                      <small>{customer.phone} · {customer.email}</small>
                    </span>
                  </Link>
                  <dl>
                    <div><dt>Category</dt><dd>{customerCategory}</dd></div>
                    <div><dt>Owner</dt><dd>{activeAttentionItem?.owner ?? "Unassigned"}</dd></div>
                    <div><dt>Risk</dt><dd>{customer.riskLevel}</dd></div>
                    <div><dt>Status</dt><dd>{displayStatus}</dd></div>
                    <div><dt>Next</dt><dd>{customer.nextAction}</dd></div>
                  </dl>
                  <div className={styles.directoryIssueList} aria-label={`${customer.name} data checks`}>
                    {rowIssues.length ? rowIssues.map((issue) => <span key={issue}>{issue}</span>) : <span data-empty="true">Clear</span>}
                  </div>
                  <div className={styles.directoryActions}>
                    <Link className={styles.secondaryButton} href={customer360Href(customer.id)}>Open</Link>
                    <Link className={styles.primaryButton} href={attendHref}>Attend</Link>
                  </div>
                </article>
              );
            }) : (
              <CrmNextEmptyCustomerSourcePanel />
            )}
          </div>
        </article>
      </section>
    </CrmNextFrame>
  );
}

function CrmNextEmptyCustomerSourcePanel({ actionId }: { actionId?: string }) {
  const actionLabel = crmNextActionLabel(actionId ?? "");
  const newCustomerHref = actionId
    ? `/crm-next/new?returnAction=${encodeURIComponent(actionId)}`
    : "/crm-next/new";

  return (
    <article className={styles.emptyCustomerSource}>
      <div>
        <span className={styles.eyebrow}>Customer source</span>
        <h2>No verified Customer 360 records are visible here yet</h2>
        <p>
          Customer Console is waiting on the live customer source. The existing customer list is still available in Customer Archive while this view has no verified records.
        </p>
      </div>
      <div className={styles.emptyCustomerActions}>
        <Link className={styles.primaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Open Customer Archive</Link>
        <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Open older customer tools</Link>
        <Link className={styles.secondaryButton} href={newCustomerHref}>
          {actionId ? `Add customer, then continue ${actionLabel}` : "Add Customer / Prospect"}
        </Link>
      </div>
    </article>
  );
}

function statusClass(status: CrmNextMilestoneStatus) {
  if (status === "VERIFIED") return styles.statusVerified;
  if (status === "IMPLEMENTED_UNVERIFIED") return styles.statusImplemented;
  if (status === "IN_PROGRESS") return styles.statusProgress;
  if (status === "HELD") return styles.statusHeld;
  if (status === "DEFERRED") return styles.statusDeferred;
  if (status === "CONTRACTED") return styles.statusContracted;
  return styles.statusPlanned;
}

export function CrmNextProgressView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="progress" userName={model.userName}>
      <Topbar />
      <OperationalSourceStrip model={model} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Implementation Progress</span>
          <h1>Customer Console build cockpit</h1>
          <p>Review what is implemented, what is next, and what remains safely gated.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Open Customer Console</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Older Customer Tools</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Customer Archive</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console implementation scorecard">
        <article className={styles.summaryCard} data-tone="blue"><small>Envelope</small><strong>{model.progress.envelopeCount}</strong><p>next milestones staged</p></article>
        <article className={styles.summaryCard}><small>Implemented</small><strong>{model.progress.completedCount}</strong><p>not yet promoted</p></article>
        <article className={styles.summaryCard}><small>Verified</small><strong>{model.progress.verifiedCount}</strong><p>release-grade proof later</p></article>
        <article className={styles.summaryCard}><small>Held</small><strong>{model.progress.heldCount}</strong><p>blocked decisions</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>current control slice</p></article>
      </section>

      <article className={styles.card} id="crm-next-envelope">
        <header>
          <div>
            <h2>Customer Console milestone envelope</h2>
            <p className={styles.muted}>Built sequentially. Each slice gets checks, honest status, and a commit checkpoint before the next one.</p>
          </div>
          <span className={styles.pill}>CRMN-016 → CRMN-119</span>
        </header>
        <div className={styles.progressList}>
          {model.progress.milestones.map((milestone) => (
            <Link className={styles.progressRow} href={milestone.reviewHref} key={milestone.id}>
              <span>
                <strong>{milestone.id}</strong>
                <small>{milestone.title}</small>
              </span>
              <span>{milestone.objective}</span>
              <b className={statusClass(milestone.status)}>{milestone.status}</b>
            </Link>
          ))}
        </div>
      </article>

      <section className={styles.dashboardGrid}>
        <article className={styles.card}>
          <header><h2>How to review progress</h2></header>
          <p>Start here, open the review link for any implemented milestone, and compare the screen against the approved UX baseline.</p>
        </article>
        <article className={styles.card}>
          <header><h2>Safety promise</h2></header>
          <p>Customer Console is available for internal use. Operational Dispatch handoff creation is enabled; customer communications, payments, documents, and route replacement remain controlled.</p>
        </article>
        <article className={styles.card}>
          <header><h2>Rollback posture</h2></header>
          <p>Turn off `CRM_NEXT` and Customer Console fails closed while Customer Archive and the older customer tools remain available.</p>
        </article>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextReviewCenterView({ model }: { model: CrmNextCommandCenter }) {
  const reviewLinks = [
    {
      href: "/crm-next/progress",
      label: "Progress",
      detail: "Implementation milestones, evidence, and current proof state."
    },
    {
      href: "/crm-next/pilot-readiness",
      label: "Pilot Readiness",
      detail: "Pilot scenarios and review expectations before any rollout decision."
    },
    {
      href: "/crm-next/hardening",
      label: "Hardening",
      detail: "Testing, accessibility, security, rollback, and evidence controls."
    },
    {
      href: "/crm-next/coexistence",
      label: "Coexistence",
      detail: "Customer Archive and older customer tools protection, migration rules, and switchback posture."
    },
    {
      href: "/crm-next/pilot-release",
      label: "Pilot Release",
      detail: "Promotion checklist, training readiness, and leadership approval hold."
    },
    {
      href: "/crm-next/system/permissions",
      label: "Permissions Review",
      detail: "Who can access Customer Console and what remains blocked."
    },
    {
      href: "/crm-next/system/states",
      label: "State Review",
      detail: "Empty, partial, unavailable, and protected states."
    },
    {
      href: "/crm-next/system/rollback",
      label: "Rollback Review",
      detail: "How Customer Console fails closed while the customer archive and older customer tools remain available."
    }
  ];

  return (
    <CrmNextFrame active="review" userName={model.userName}>
      <Topbar />
      <OperationalSourceStrip model={model} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Review Center</span>
          <h1>Hidden build-review controls</h1>
          <p>These pages are kept for approval, safety, and release review. They are not regular staff workflow screens.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Return to operating CRM</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Older Customer Tools</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Customer Archive</Link>
        </div>
      </section>

      <section className={styles.searchGroups} aria-label="Customer Console review pages">
        {reviewLinks.map((link) => (
          <Link className={styles.card} href={link.href} key={link.href}>
            <header>
              <h2>{link.label}</h2>
              <span className={styles.pill}>Review only</span>
            </header>
            <p>{link.detail}</p>
            <p className={styles.safeNotice}>Hidden from regular staff navigation; available when called out for review.</p>
          </Link>
        ))}
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Command Center implementation cards</h2>
            <p className={styles.muted}>These cards explain the build milestones behind the operating dashboard and stay here for review only.</p>
          </div>
          <span className={styles.pill}>Hidden from staff nav</span>
        </header>
        <section className={styles.commandModeGrid} aria-label="Customer command center review modes">
          {(model.commandCenter?.modes ?? []).map((mode) => (
            <Link className={styles.commandModeCard} href={mode.href} id={mode.id} key={mode.id}>
              <span className={styles.eyebrow}>{mode.milestone} · {mode.audience}</span>
              <div>
                <h2>{mode.title}</h2>
                <b>{mode.state}</b>
              </div>
              <p>{mode.objective}</p>
              <dl>
                <div><dt>Primary</dt><dd>{mode.primaryMetric}</dd></div>
                <div><dt>Secondary</dt><dd>{mode.secondaryMetric}</dd></div>
              </dl>
              <small>{mode.guidance}</small>
            </Link>
          ))}
        </section>
      </article>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Dispatch bridge implementation proof</h2>
            <p className={styles.muted}>This is the builder-facing explanation that was removed from the staff Work Customer screen.</p>
          </div>
          <span className={styles.pill}>{model.bridge.liveTaskCreationEnabled ? "Task creation enabled" : "Review only"}</span>
        </header>
        <section className={styles.handoffGrid} aria-label="Customer dispatch bridge proof">
          <article className={styles.handoffCard}>
            <span>Backend contract</span>
            <strong>CRM action prepared</strong>
            <b>Customer follow-up</b>
            <small>Customer Console prepares the task payload from attention/customer context.</small>
          </article>
          <article className={styles.handoffCard}>
            <span>Dispatch Board</span>
            <strong>Task engine owns creation</strong>
            <b>Source-owned write</b>
            <small>The existing Dispatch task engine remains the source of truth after a handoff is created.</small>
          </article>
          <article className={styles.handoffCard}>
            <span>Activation boundary</span>
            <strong>Internal task only</strong>
            <b>No external send</b>
            <small>Calls, texts, emails, documents, payments, and customer writes remain gated.</small>
          </article>
        </section>
        <p className={styles.safeNotice}>{model.bridge.message}</p>
      </article>
    </CrmNextFrame>
  );
}

function AttentionRow({ item }: { item: CrmNextAttentionItem }) {
  return (
    <Link className={styles.attentionItem} href={item.workHref}>
      <span className={styles.avatar}>{initials(item.customerName)}</span>
      <span><strong>{item.customerName}</strong><small>{item.reason} · {item.area} · {item.owner}</small></span>
      <b className={levelClass(item.level)}>{item.level}</b>
    </Link>
  );
}

export function CrmNextNeedsAttentionView({ model }: { model: CrmNextCommandCenter }) {
  const attention = openAttentionItems(model.attention ?? []);

  return (
    <CrmNextFrame active="attention" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Needs Attention List</span>
          <h1>Prioritized customers that need action</h1>
          <p>Open one row, work the customer, and return here for the next priority.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next">Back to Command Center</Link>
      </section>
      <article className={styles.card}>
        <div className={styles.attentionList}>
          {attention.length ? attention.map((item) => <AttentionRow item={item} key={item.id} />) : (
            <div className={styles.activityTimelineEmpty}>
              <strong>No open attention records</strong>
              <span>Closed or resolved workbench items are hidden from this queue.</span>
            </div>
          )}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextSearchView({ model, returnAction }: { model: CrmNextCommandCenter; returnAction?: string }) {
  const actionId = validReturnAction(returnAction);
  const actionLabel = crmNextActionLabel(actionId ?? "");
  const customers = model.customers ?? [];
  const search = model.search ?? { activeQuery: "", groups: [], queryPlaceholder: "Search customers, vehicles, deals, communications, or work." };
  const hasVerifiedCustomers = customers.length > 0;
  return (
    <CrmNextFrame active="search" userName={model.userName}>
      <Topbar defaultQuery={search.activeQuery} returnAction={actionId} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Global Search</span>
          <h1>{actionId ? `Find the customer, then continue ${actionLabel}` : "Find the customer, then take the next safe action"}</h1>
          <p>{actionId ? "Choose a verified Customer 360 record so the pending action saves to the right timeline." : search.queryPlaceholder}</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href={actionId ? `/crm-next/new?returnAction=${encodeURIComponent(actionId)}` : "/crm-next/new"}><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.secondaryButton} href="/crm-next">Back to Command Center</Link>
        </div>
      </section>
      {actionId ? (
        <section className={styles.returnActionPanel} aria-label={`Continue ${actionLabel}`}>
          <header>
            <div>
              <span className={styles.eyebrow}>Pending action</span>
              <h2>{actionLabel}</h2>
              <p>Select a customer below to return to the action with verified context.</p>
            </div>
          </header>
          <div>
            {hasVerifiedCustomers ? customers.slice(0, 6).map((customer) => (
              <Link className={styles.returnActionCustomer} href={crmNextActionHref(actionId, customer.id)} key={customer.id}>
                <strong>{customer.name}</strong>
                <span>{customer.nextAction}</span>
                <small>Continue {actionLabel}</small>
              </Link>
            )) : (
              <CrmNextEmptyCustomerSourcePanel actionId={actionId} />
            )}
          </div>
        </section>
      ) : null}
      {!actionId && !hasVerifiedCustomers ? <CrmNextEmptyCustomerSourcePanel /> : null}
      <section className={styles.searchGroups} aria-label="Customer record search results">
        {search.groups.map((group) => {
          const isCustomerGroup = group.id.includes("customer");
          const href = actionId && isCustomerGroup
            ? customers[0]
              ? crmNextActionHref(actionId, customers[0].id)
              : `/crm-next/new?returnAction=${encodeURIComponent(actionId)}`
            : isCustomerGroup
              ? CRM_NEXT_CUSTOMERS_HREF
              : group.href;
          const count = isCustomerGroup && hasVerifiedCustomers ? customers.length : group.count;
          const description = isCustomerGroup && hasVerifiedCustomers
            ? `Open the customer list. Latest visible records include ${customers.slice(0, 3).map((customer) => customer.name).join(", ")}.`
            : group.description;
          return (
            <Link className={styles.card} href={href} key={group.id}>
              <header><h2>{group.label}</h2><span className={styles.pill}>{count}</span></header>
              <p>{description}</p>
            </Link>
          );
        })}
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextIntakeView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="new" userName={model.userName}>
      <Topbar />
      <section className={styles.intakeHero}>
        <div>
          <span className={styles.eyebrow}>Customer Intake</span>
          <h1>Add a customer or prospect</h1>
          <p>Create the shared customer record once, then continue the sales or service workflow from Customer Console.</p>
        </div>
        <div className={styles.intakeHeroFacts}>
          <span><strong>Shared customer record</strong><small>Visible across CRM modes</small></span>
          <span><strong>Duplicate check</strong><small>Phone and email are matched</small></span>
          <span><strong>Prospect lead</strong><small>Optional after customer save</small></span>
        </div>
      </section>

      <section className={styles.intakeLayout}>
        <CrmNextIntakeForm />
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextTimelineView({ model }: { model: CrmNextCommandCenter }) {
  const events = verifiedTimelineEvents(model.timeline ?? []);
  const customer360Href = model.customers?.[0] ? `/crm-next/customers/${encodeURIComponent(model.customers[0].id)}` : "/crm-next/search";
  return (
    <CrmNextFrame active="timeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Customer Timeline</span>
          <h1>Customer activity timeline</h1>
          <p>See recent customer activity, appointments, opportunities, and Dispatch work in one place.</p>
        </div>
        <Link className={styles.secondaryButton} href={customer360Href}>Open Customer 360</Link>
      </section>
      <article className={styles.card}>
        {events.length > 0 ? (
          <div className={styles.commList}>
            {events.map((event) => (
              <Link className={styles.communicationItem} href={event.href} key={event.id}>
                <strong>{event.source}</strong>
                <span>{event.label}<small>{event.detail}</small></span>
                <small>{event.occurredAt}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.activityTimelineEmpty}>
            <strong>No recorded activity yet</strong>
            <span>There are no verified customer activity records available from customer sources yet.</span>
          </div>
        )}
      </article>
    </CrmNextFrame>
  );
}

function SalesTable({ records, title, summary }: { records: CrmNextSalesRecord[]; title: string; summary: string }) {
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>{title}</h2>
          <p className={styles.muted}>{summary}</p>
        </div>
        <span className={styles.pill}>Open</span>
      </header>
      <div className={styles.salesRows}>
        {records.length ? records.map((record) => (
          <Link className={styles.salesRow} href={record.href} key={record.id}>
            <span><strong>{record.customerName}</strong><small>{record.vehicle}</small></span>
            <span>{record.amount}</span>
            <span>{record.stage}</span>
            <span>{record.owner}</span>
            <span>{record.nextAction}</span>
          </Link>
        )) : (
          <div className={styles.activityTimelineEmpty}>
            <strong>No source data available</strong>
            <span>No verified records are available for this section yet.</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function CrmNextPipelineView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pipeline</span>
          <h1>Pipeline board</h1>
          <p>Review lead and opportunity flow, owners, value, stage, and next action.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.secondaryButton} href="/crm-next/deals">Deals</Link>
          <Link className={styles.secondaryButton} href="/crm-next/test-drives">Test drives</Link>
          <Link className={styles.secondaryButton} href="/crm-next/appointments">Appointments</Link>
        </div>
      </section>
      <SalesTable records={model.sales.opportunities} title="Opportunities" summary="Stage, amount, owner, and next action are visible for the sales team." />
    </CrmNextFrame>
  );
}

export function CrmNextAppointmentsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="appointments" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Appointments</span>
          <h1>Appointments</h1>
          <p>See customer appointments and jump into the appointment workspace when scheduling work is needed.</p>
        </div>
        <Link className={styles.primaryButton} href="/appointments">Open existing appointment workspace</Link>
      </section>
      <SalesTable records={model.sales.appointments} title="Appointment-linked opportunities" summary="Customer appointment context for the sales team." />
    </CrmNextFrame>
  );
}

export function CrmNextTestDrivesView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Test Drives</span>
          <h1>Test drives</h1>
          <p>Show who wants to drive what vehicle and what staff should do next.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
      </section>
      <SalesTable records={model.sales.testDrives} title="Test drives needing attention" summary="Customers, vehicles, owners, and next steps for upcoming test-drive work." />
    </CrmNextFrame>
  );
}

export function CrmNextDealsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="deals" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Deals</span>
          <h1>Deals in progress</h1>
          <p>Deal value, stage, owner, and next action for active sales work.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href={CRM_NEXT_DEAL_START_HREF}>Start Deal</Link>
          <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
        </div>
      </section>
      <SalesTable records={model.sales.deals} title="Deals in progress" summary="A compact operating view for sales staff." />
    </CrmNextFrame>
  );
}

export function CrmNextDealStartView({
  initialCustomerId,
  model
}: {
  initialCustomerId?: string;
  model: CrmNextCommandCenter;
}) {
  return (
    <CrmNextFrame active="deals" userName={model.userName}>
      <Topbar />
      <CrmNextDealStartTool initialCustomerId={initialCustomerId} model={model} />
    </CrmNextFrame>
  );
}

export function CrmNextOwnershipSupportView({ model }: { model: CrmNextCommandCenter }) {
  const grouped = [
    { label: "Ownership", ids: ["Vehicle", "Finance", "Payment"] },
    { label: "Support", ids: ["Case", "Title/Document", "Service", "Rental/Loaner", "Customer Issue", "Insurance"] }
  ];

  return (
    <CrmNextFrame active="support" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Ownership & Support</span>
          <h1>Everything important, without turning Customer 360 into a maze</h1>
          <p>Vehicle, finance, payment, case, title, service, rental, issue, and insurance context grouped by customer need.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/customers/michael-johnson">Customer 360</Link>
          <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Attend Customer</Link>
        </div>
      </section>

      {grouped.map((group) => (
        <article className={styles.card} key={group.label}>
          <header>
            <div>
              <h2>{group.label}</h2>
              <p className={styles.muted}>Customer support context grouped for quick follow-up.</p>
            </div>
            <span className={styles.pill}>{group.label}</span>
          </header>
          <div className={styles.supportGrid}>
            {model.ownershipSupport
              .filter((record) => group.ids.includes(record.domain))
              .map((record) => (
                <Link className={styles.supportCard} href={record.href} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
                  <span className={styles.eyebrow}>{record.domain}</span>
                  <h3>{record.title}</h3>
                  <p>{record.status}</p>
                  <p className={styles.muted}>{record.nextAction}</p>
                  <div className={styles.metaLine}>
                    <b className={levelClass(record.priority)}>{record.priority}</b>
                    <span>{record.permission}</span>
                    <small>{record.owner}</small>
                  </div>
                </Link>
              ))}
          </div>
        </article>
      ))}
    </CrmNextFrame>
  );
}

export function CrmNextSharedExecutionView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="execution" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Shared Execution</span>
          <h1>Shared customer execution</h1>
          <p>Keep customer tasks inside CRM, then create a Dispatch handoff only when operations must execute the work.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up#dispatch-task">Create Dispatch handoff</Link>
          <Link className={styles.secondaryButton} href="/crm-next/needs-attention">Needs Attention</Link>
        </div>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Customer work handoff</h2>
            <p className={styles.muted}>CRM tasks stay with the customer record. Dispatch handoffs are reserved for operational execution.</p>
          </div>
          <span className={styles.pill}>Active workflow</span>
        </header>
        <div className={styles.executionGrid}>
          {model.sharedExecution.map((record) => (
            <Link className={styles.executionCard} href={record.href.replace("#dispatch-preview", "#dispatch-task")} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
              <span className={styles.eyebrow}>Customer work</span>
              <h3>{record.title}</h3>
              <p>{record.description}</p>
              <div className={styles.surfacePair}>
                <span><small>Customer Console</small><strong>{record.crmNextSurface}</strong></span>
                <span><small>Dispatch</small><strong>{record.dispatchSurface}</strong></span>
              </div>
              <div className={styles.metaLine}>
                <span>Open workflow</span>
                <small>Team execution</small>
              </div>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

function LeadSourcePerformanceReport({ model }: { model: CrmNextCommandCenter }) {
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>Lead source performance report</h2>
          <p className={styles.muted}>{model.leadSourceReport.summary}</p>
        </div>
        <span className={styles.pill}>{model.leadSourceReport.generatedFrom}</span>
      </header>
      <div className={styles.sourceReportLayout}>
        <div className={styles.sourceReportTable} aria-label="Lead source funnel performance">
          <div className={styles.sourceReportHead}>
            <span>Source</span>
            <span>Leads</span>
            <span>Contacted</span>
            <span>Appts</span>
            <span>Deals</span>
            <span>Sold</span>
            <span>Leak</span>
            <span>Action</span>
          </div>
          {model.leadSourceReport.sources.map((source) => (
            <Link className={styles.sourceReportRow} href={source.href} key={source.id}>
              <span><strong>{source.label}</strong><small>{source.health} · {source.conversionRate} sold</small></span>
              <b>{source.leads}</b>
              <b>{source.contacted}</b>
              <b>{source.appointments}</b>
              <b>{source.deals}</b>
              <b>{source.sold}</b>
              <span>{source.leak}</span>
              <span>{source.nextAction}</span>
            </Link>
          ))}
        </div>
        <aside className={styles.sourceActionQueue} aria-label="Lead source action queue">
          <h3>Work these first</h3>
          {model.leadSourceReport.actionQueue.length ? model.leadSourceReport.actionQueue.map((action) => (
            <Link href={action.href} key={action.id}>
              <strong>{action.label}</strong>
              <span>{action.customer}</span>
              <small>{action.source} · {action.reason}</small>
            </Link>
          )) : <p className={styles.muted}>No stale or uncontacted source work is exposed by the current read.</p>}
        </aside>
      </div>
      <div className={styles.sourceWorkflowStrip} aria-label="Lead source optimization workflow">
        {model.leadSourceReport.workflow.map((step) => (
          <span key={step.step}><strong>{step.step}</strong><small>{step.goal}</small></span>
        ))}
      </div>
    </article>
  );
}

export function CrmNextLeadSourceReportView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="intelligence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Lead Source Report</span>
          <h1>Lead Source Performance</h1>
          <p>See which lead sources are creating real work, where the funnel is leaking, and what staff should do next.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/pipeline">Open pipeline</Link>
          <Link className={styles.secondaryButton} href="/crm-next/intelligence-foundation">Intelligence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Lead source report summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Sources</small><strong>{model.leadSourceReport.sources.length}</strong><p>classified</p></article>
        <article className={styles.summaryCard}><small>Total Leads</small><strong>{model.leadSourceReport.sources.reduce((total, source) => total + source.leads, 0)}</strong><p>in report</p></article>
        <article className={styles.summaryCard}><small>Stale Work</small><strong>{model.leadSourceReport.sources.reduce((total, source) => total + source.stale, 0)}</strong><p>needs action</p></article>
        <article className={styles.summaryCard}><small>Action Queue</small><strong>{model.leadSourceReport.actionQueue.length}</strong><p>work first</p></article>
        <article className={styles.summaryCard}><small>Mode</small><strong>Assist</strong><p>staff executes</p></article>
      </section>

      <LeadSourcePerformanceReport model={model} />
    </CrmNextFrame>
  );
}

export function CrmNextIntelligenceFoundationView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="intelligence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Intelligence</span>
          <h1>Recommendations that explain themselves</h1>
          <p>See risk, next-action suggestions, opportunity signals, queue priority, and manager attention items with a clear reason.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/needs-attention">Open queue</Link>
          <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Attend customer</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console intelligence summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Mode</small><strong>Assist</strong><p>human decides</p></article>
        <article className={styles.summaryCard}><small>Signals</small><strong>{model.intelligence.length}</strong><p>explainable inputs</p></article>
        <article className={styles.summaryCard}><small>Automation</small><strong>Manual</strong><p>staff confirms</p></article>
        <article className={styles.summaryCard}><small>Risk items</small><strong>12</strong><p>need review</p></article>
        <article className={styles.summaryCard}><small>Actions</small><strong>23</strong><p>recommended</p></article>
      </section>

      <LeadSourcePerformanceReport model={model} />

      <article className={styles.card}>
        <header>
          <div>
            <h2>Recommended customer actions</h2>
            <p className={styles.muted}>Each recommendation explains the signal, the suggested next step, and why it matters.</p>
          </div>
          <span className={styles.pill}>Staff assist</span>
        </header>
        <div className={styles.intelligenceCards}>
          {model.intelligence.map((record) => (
            <Link className={styles.intelligenceCard} href={record.href} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
              <span className={styles.eyebrow}>{record.kind}</span>
              <h3>{record.title}</h3>
              <p>{record.signal}</p>
              <div className={styles.recommendationBox}>
                <small>Recommended next step</small>
                <strong>{record.recommendation}</strong>
                <span>{record.explanation}</span>
              </div>
              <div className={styles.metaLine}>
                <span>{record.confidence}</span>
                <small>{record.sourceSystem}</small>
              </div>
              <p className={styles.safeNotice}>{record.safety}</p>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextPilotReadinessView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pilot" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pilot Readiness</span>
          <h1>Enough substance to review before we turn anything live</h1>
          <p>Expanded pilot scenarios show customers, queues, Customer 360 context, timeline activity, and manager review paths while preserving source-of-truth ownership.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Command Center</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress">Progress</Link>
          <Link className={styles.secondaryButton} href="/crm-next/intelligence-foundation">Intelligence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console pilot scenario summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Pilot scenarios</small><strong>{model.pilotScenarios.length}</strong><p>review records</p></article>
        <article className={styles.summaryCard}><small>Writes</small><strong>0</strong><p>still disabled</p></article>
        <article className={styles.summaryCard}><small>Live comms</small><strong>0</strong><p>not enabled</p></article>
        <article className={styles.summaryCard}><small>Route replacement</small><strong>No</strong><p>Fallback protected</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>hardening gate</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-075 → CRMN-079 pilot scenario expansion</h2>
            <p className={styles.muted}>Each scenario explains what reviewers should inspect, which source system owns the data, and what remains gated.</p>
          </div>
          <span className={styles.pill}>IMPLEMENTED_UNVERIFIED</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.pilotScenarios.map((scenario) => (
            <Link className={styles.pilotScenarioCard} href={scenario.href} id={scenario.id} key={scenario.id}>
              <span className={styles.eyebrow}>{scenario.milestone} · {scenario.category}</span>
              <h3>{scenario.title}</h3>
              <p>{scenario.summary}</p>
              <div className={styles.metaLine}>
                <span>{scenario.reviewState}</span>
                <small>{scenario.sourceOfTruth}</small>
              </div>
              <p className={styles.safeNotice}>{scenario.nextReviewStep}</p>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextHardeningView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="hardening" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Release Hardening</span>
          <h1>Controls before pilot promotion</h1>
          <p>Customer Console can be reviewed with richer scenarios, but migration, live communication, customer writes, manager overrides, and route replacement remain gated.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/pilot-readiness">Pilot readiness</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress">Progress</Link>
          <Link className={styles.secondaryButton} href="/crm-next/system/rollback">Rollback proof</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console hardening summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Hardening gates</small><strong>{model.hardeningGates.length}</strong><p>review controls</p></article>
        <article className={styles.summaryCard}><small>Held gate</small><strong>CRMN-080</strong><p>migration approval</p></article>
        <article className={styles.summaryCard}><small>Customer writes</small><strong>0</strong><p>still disabled</p></article>
        <article className={styles.summaryCard}><small>Route replacement</small><strong>No</strong><p>Fallback protected</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>coexistence plan</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-080 → CRMN-086 hardening packet</h2>
            <p className={styles.muted}>This packet makes the pilot controls reviewable without turning on live operational commands.</p>
          </div>
          <span className={styles.pill}>approval-gated</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.hardeningGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone} · {gate.category}</span>
              <h3>{gate.title}</h3>
              <p>{gate.proof}</p>
              <div className={styles.metaLine}>
                <span>{gate.reviewState}</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
              <p className={styles.safeNotice}>{gate.riskControl}</p>
              <p>{gate.nextStep}</p>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextCoexistenceView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="coexistence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Fallback Coexistence</span>
          <h1>Customer Console can be reviewed without replacing today’s CRM</h1>
          <p>Customer Archive and the older customer tools remain operational while Customer Console proves whether it is ready to become the replacement experience.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Customer Console</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Customer Archive</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Older Customer Tools</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console coexistence summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Coexistence gates</small><strong>{model.coexistenceGates.length}</strong><p>review controls</p></article>
        <article className={styles.summaryCard}><small>Fallback routes</small><strong>Open</strong><p>protected</p></article>
        <article className={styles.summaryCard}><small>Default route</small><strong>No</strong><p>not replaced</p></article>
        <article className={styles.summaryCard}><small>Retirement</small><strong>Held</strong><p>approval needed</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>pilot gates</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-087 → CRMN-090 coexistence packet</h2>
            <p className={styles.muted}>This page is the safe bridge between review, pilot, and any future cutover decision.</p>
          </div>
          <span className={styles.pill}>parallel replacement</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.coexistenceGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone}</span>
              <h3>{gate.title}</h3>
              <p>{gate.crmNextRole}</p>
              <div className={styles.details}>
                <p><span>Fallback owner</span>{gate.legacyOwner}</p>
                <p><span>Cutover rule</span>{gate.cutoverRule}</p>
                <p><span>Rollback rule</span>{gate.rollbackRule}</p>
              </div>
              <div className={styles.metaLine}>
                <span>{gate.safety}</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextPilotReleaseView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="release" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pilot Release Gates</span>
          <h1>Ready for review, not ready for launch without approval</h1>
          <p>The final Customer Console pilot gates show what must be reviewed before any broader rollout, live command, or fallback replacement is allowed.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/progress">Progress cockpit</Link>
          <Link className={styles.secondaryButton} href="/crm-next/hardening">Hardening</Link>
          <Link className={styles.secondaryButton} href="/crm-next/coexistence">Coexistence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Customer Console pilot release summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Release gates</small><strong>{model.pilotReleaseGates.length}</strong><p>final checks</p></article>
        <article className={styles.summaryCard}><small>Launch</small><strong>Held</strong><p>approval needed</p></article>
        <article className={styles.summaryCard}><small>Live commands</small><strong>0</strong><p>not enabled</p></article>
        <article className={styles.summaryCard}><small>Fallback</small><strong>Open</strong><p>archive kept</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>decision gate</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-091 → CRMN-094 pilot release packet</h2>
            <p className={styles.muted}>This is the review checklist before Customer Console can become a controlled pilot instead of a protected preview.</p>
          </div>
          <span className={styles.pill}>launch held</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.pilotReleaseGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone} · {gate.owner}</span>
              <h3>{gate.title}</h3>
              <p>{gate.requirement}</p>
              <div className={styles.details}>
                <p><span>Decision</span>{gate.decision}</p>
                <p><span>Proof</span>{gate.proof}</p>
                <p><span>Cannot proceed until</span>{gate.cannotProceedUntil}</p>
              </div>
              <div className={styles.metaLine}>
                <span>Promotion gate</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextSafetyView({ kind, model }: { kind: "states" | "permissions" | "rollback"; model: CrmNextCommandCenter }) {
  const copy = {
    states: {
      eyebrow: "State Coverage",
      title: "Clear states instead of confusing dead ends",
      body: "Empty, loading, blocked, and unavailable states explain what happened and offer a safe next step."
    },
    permissions: {
      eyebrow: "Permission Safety",
      title: "Denied users fail closed",
      body: "Customer Console only opens for approved roles and workspaces. Otherwise users are routed back to the customer archive or older customer tools."
    },
    rollback: {
      eyebrow: "Rollback Proof",
      title: "Customer Console can be turned off safely",
      body: "When CRM_NEXT is disabled, /crm-next shows the protected fallback and existing Dispatch Board routes continue working."
    }
  }[kind];

  return (
    <CrmNextFrame active="safety" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/progress">Back to progress</Link>
      </section>
      <section className={styles.dashboardGrid}>
        <article className={styles.card}><header><h2>Feature flag</h2></header><p>CRM_NEXT controls access to the new experience and fails closed by default.</p></article>
        <article className={styles.card}><header><h2>Fallback</h2></header><p>Customer Archive and the older customer tools remain available during pilot review.</p></article>
        <article className={styles.card}><header><h2>Activation boundary</h2></header><p>Operational Dispatch handoff creation is enabled. Calls, texts, emails, payments, documents, and deal/customer writes remain protected.</p></article>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextCustomer360View({ customer, model }: { customer: CrmNextCustomer360; model: CrmNextCommandCenter }) {
  const attention = model.attention ?? [];
  const activeAttentionItem = attention.find((item) => item.customerId === customer.id);
  const attendHref = activeAttentionItem?.workHref ?? `/crm-next/work/customer-read-${encodeURIComponent(customer.id)}`;
  const [selectedWorkCategory, setSelectedWorkCategory] = useState<CrmWorkCategoryId>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = normalizeCrmWorkCategoryId(window.localStorage.getItem(crmWorkCategoryStorageKey(customer.id)));
        if (stored) return stored;
      } catch {
        // A fresh category can still be selected when local storage is unavailable.
      }
    }
    return customer.name.toLowerCase().includes("transport") ? "vehicle-delivery" : "retail-sale";
  });
  const selectedCategoryConfig = crmWorkCategoryById(selectedWorkCategory);
  const checkInHref = workbenchCheckInHref(attendHref, selectedCategoryConfig.path, selectedWorkCategory);
  function startCheckedInWorkbench() {
    try {
      window.localStorage.setItem(crmWorkCategoryStorageKey(customer.id), selectedWorkCategory);
      window.localStorage.setItem(crmWorkPathStorageKey(customer.id), selectedCategoryConfig.path);
    } catch {
      // The URL still carries the selected work path into the workbench.
    }
    window.location.assign(checkInHref);
  }
  const currentJourneyStage = customerJourneyStage(customer, activeAttentionItem);
  const appointmentHref = crmNextCustomerAppointmentHref({
    customerId: customer.id,
    customerName: customer.name,
    reason: customer.nextAction,
    returnTo: `/crm-next/customers/${customer.id}`
  });
  const customerSalesWorkbenchHref = salesWorkbenchHref(customer);
  const [savedCustomerProgress] = useState(() => readCustomerWorkbenchProgress(customer.id));
  const savedCustomerStage = savedCustomerProgress?.stage;
  const displayCustomerStatus = customerDisplayStatus(customer, savedCustomerStage);
  const customerMetrics = [
    { label: "Open Leads", value: customer.openDeals, detail: "Active", tone: "green" },
    { label: "Open Cases", value: customer.openCases, detail: "Active", tone: "red" },
    { label: "Appointments", value: customer.glance.find((item) => item.label === "Appointments")?.value ?? "0", detail: "Upcoming", tone: "blue" },
    { label: "Tasks", value: attention.filter((item) => item.customerId === customer.id).length, detail: "Open", tone: "blue" },
    { label: "Documents", value: "0", detail: "Missing", tone: "amber" },
    { label: "SLA Risk", value: customer.riskLevel, detail: "Current", tone: customer.riskLevel === "High" ? "red" : customer.riskLevel === "Medium" ? "amber" : "green" }
  ];

  return (
    <CrmNextFrame active="customer" userName={model.userName}>
      <Topbar />
      <CompactSourceStatus model={model} />
      <section className={styles.customerWorkspace}>
        <main className={styles.customerMain}>
          <section className={styles.customerHeroCard}>
            <div className={styles.customerIdentity}>
              <span className={styles.profileAvatar}>{initials(customer.name)}</span>
              <div>
                <h1 className={styles.customerName}>{customer.name}</h1>
                <span className={styles.customerBadge}>Preferred Customer</span>
                <p>{customer.phone} · {customer.email}</p>
                <p>{customer.address}</p>
              </div>
            </div>
            <dl className={styles.customerFacts}>
              <div><dt>Customer Since</dt><dd>{customer.customerSince}</dd></div>
              <div><dt>Lifetime Value</dt><dd>{customer.lifetimeValue}</dd></div>
              <div><dt>Owner</dt><dd>Unassigned</dd></div>
              <div><dt>Status</dt><dd>{displayCustomerStatus}</dd></div>
              <div><dt>Risk</dt><dd><b className={levelClass(customer.riskLevel)}>{customer.riskLevel}</b></dd></div>
            </dl>
            <div className={styles.customerHeroActions}>
              <Link className={styles.secondaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer</Link>
              <button
                className={styles.primaryButton}
                onClick={startCheckedInWorkbench}
                type="button"
              >
                Check-In
              </button>
              <Link className={styles.secondaryButton} href={customerSalesWorkbenchHref}><Target size={16} /> Sales Workbench</Link>
              <Link className={styles.secondaryButton} href={crmNextActionHref("send-text", customer.id)}><MessageSquare size={16} /> Message</Link>
              <Link className={styles.secondaryButton} href="/crm">Open older customer tools</Link>
            </div>
            <section className={styles.customerCheckInPanel} aria-label="Customer check-in">
              <div>
                <span className={styles.eyebrow}>Check-In</span>
                <h2>Choose why this customer or vendor is here.</h2>
                <p>{selectedCategoryConfig.summary}</p>
              </div>
              <label>
                <span>Work category</span>
                <select value={selectedWorkCategory} onChange={(event) => setSelectedWorkCategory(event.target.value as CrmWorkCategoryId)}>
                  {CRM_DEALERSHIP_WORK_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </label>
              <button
                className={styles.secondaryButton}
                onClick={startCheckedInWorkbench}
                type="button"
              >
                Start {CRM_WORK_PATHS[selectedCategoryConfig.path].label}
              </button>
            </section>
          </section>

          <section className={styles.customerJourneyPanel} aria-label="Customer journey">
            <header>
              <div>
                <span className={styles.eyebrow}>Customer journey</span>
                <h2>Work the customer from first contact to outcome.</h2>
              </div>
              <Link className={styles.secondaryButton} href={checkInHref}>Update progress</Link>
            </header>
            <ol className={styles.customerJourneyRail}>
              {CRM_WORK_PATHS["sales-deal"].stages.map((stage) => (
                <li data-state={stage === currentJourneyStage ? "active" : "pending"} key={stage}>
                  <span>{stage}</span>
                </li>
              ))}
            </ol>
            <p className={styles.muted}>Stage changes should come from staff actions: calls, texts, appointments, CRM tasks, deal work, or a sold/lost decision.</p>
          </section>

          <CustomerOperatingLedger
            activeAttentionItem={activeAttentionItem}
            customer={customer}
            model={model}
            savedStage={savedCustomerStage}
          />

          <section className={styles.customerMetricGrid} aria-label="Customer operating metrics">
            {customerMetrics.map((metric) => (
              <article className={styles.customerMetricCard} data-tone={metric.tone} key={metric.label}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className={styles.panel}>
            <nav className={styles.tabs} aria-label="Customer 360 sections">
              <Link aria-current="page" href="#overview">Overview</Link>
              <Link href="#timeline">Timeline</Link>
              <Link href="#deals">Deals</Link>
              <Link href="#cases">Cases</Link>
              <Link href="#appointments">Appointments</Link>
              <Link href="#documents-held">Documents</Link>
              <Link href="#vehicles">Vehicles</Link>
              <Link href="#supporting-parties">Parties</Link>
              <Link href="#communications-held">Communications</Link>
            </nav>
            <div className={styles.compactInfoGrid} id="overview">
              {customer.glance.map((item) => (
                <Link className={styles.glanceItem} href={item.href} key={item.label}>
                  <CalendarDays size={20} /><span><strong>{item.label}</strong><small>{item.value}</small></span><ChevronRight size={18} />
                </Link>
              ))}
            </div>
            <div className={styles.compactSectionGrid}>
              <article id="deals" className={styles.compactSectionCard}>
                <strong>Deals</strong>
                <span>{customer.openDeals} open · managed in current CRM</span>
                <Link href="/crm-next/deals">Open deal board</Link>
              </article>
              <article id="cases" className={styles.compactSectionCard}>
                <strong>Cases</strong>
                <span>{customer.openCases} open · support queue</span>
                <Link href="/crm-next/ownership-support#cases">Open support cases</Link>
              </article>
              <article id="appointments" className={styles.compactSectionCard}>
                <strong>Appointments</strong>
                <span>{customer.glance.find((item) => item.label === "Appointments")?.value ?? "0"} upcoming · open calendar flow</span>
                <Link href={appointmentHref}>Schedule appointment</Link>
              </article>
              <article id="documents-held" className={styles.compactSectionCard}>
                <strong>Documents</strong>
                <span>Use the approved document workspace for sending or uploads.</span>
                <Link href={crmNextActionHref("upload-document", customer.id)}>Review document action</Link>
              </article>
              <article id="communications-held" className={styles.compactSectionCard}>
                <strong>Communications</strong>
                <span>Use approved contact workflows for live calls, texts, and emails.</span>
                <Link href={crmNextActionHref("log-call", customer.id)}>Review contact actions</Link>
              </article>
            </div>
          </section>

          <section className={`${styles.timeline} ${styles.wide}`} id="timeline">
            <header className={styles.panelHeader}><h2>Communication (Last 5)</h2><Link className={styles.textLink} href={crmNextTimelineHref(customer.id)}>View all</Link></header>
            {customer.communications.length > 0 ? (
              <div className={styles.commList}>
                {customer.communications.map((item) => (
                  <article className={styles.communicationItem} key={item.id}>
                    <strong>{item.channel}</strong><span>{item.detail}</span><small>{item.occurredAt}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.activityTimelineEmpty}>
                <strong>No verified communication yet</strong>
                <span>No calls, texts, emails, or appointments have been recorded for {customer.name} in customer sources yet.</span>
              </div>
            )}
          </section>
        </main>

        <aside className={styles.customerAside}>
          <article className={styles.sidePanel}>
            <header><h2>Quick Actions</h2></header>
            <div className={styles.quickActionTiles}>
              <Link href={crmNextActionHref("log-call", customer.id)}><Phone size={22} />Log Call</Link>
              <Link href={crmNextActionHref("send-email", customer.id)}><Mail size={22} />Send Email</Link>
              <Link href={crmNextActionHref("new-task", customer.id)}><ClipboardCheck size={22} />CRM Task</Link>
              <Link href={crmNextActionHref("add-note", customer.id)}><MessageSquare size={22} />Add Note</Link>
              <Link href={crmNextActionHref("new-case", customer.id)}><FileText size={22} />New Case</Link>
              <Link href={appointmentHref}><CalendarDays size={22} />Schedule Appt</Link>
              <Link href={crmNextActionHref("upload-document", customer.id)}><FileSearch size={22} />Upload Doc</Link>
              <Link href={customerSalesWorkbenchHref}><Target size={22} />Sales Workbench</Link>
            </div>
          </article>

          <article className={styles.sidePanel}>
            <header><h2>Next Best Action</h2></header>
            <div className={styles.nextBestAction}>
              <CheckCircle2 size={24} />
              <div>
                <strong>{customer.nextAction}</strong>
                <p>Open Attend Mode to complete the next safe customer step.</p>
              </div>
            </div>
            <Link className={styles.primaryButton} href={checkInHref}>Work Customer</Link>
          </article>

          <div id="supporting-parties">
            <CrmNextSupportingParties compact model={model} />
          </div>

          <article className={styles.sidePanel}>
            <header><h2>Customer Risk</h2></header>
            <strong className={levelClass(customer.riskLevel)}>{customer.riskLevel}</strong>
            <ul className={styles.signalList}>
              <li>{customer.openCases} open cases</li>
              <li>{customer.vehiclesOwned} linked vehicles</li>
              <li>{customer.openDeals} open deals</li>
            </ul>
          </article>

          <article className={styles.sidePanel} id="vehicles">
            <header><h2>Linked Vehicles ({customer.vehicles.length})</h2></header>
            <div className={styles.vehicleList}>
              {customer.vehicles.length ? customer.vehicles.map((vehicle) => (
                <Link href="/crm-next/search" key={vehicle.id}>
                  <strong>{vehicle.label}</strong>
                  <small>{vehicle.status} · {vehicle.vin}</small>
                </Link>
              )) : <p className={styles.muted}>No linked vehicles exposed by the current source.</p>}
            </div>
          </article>
        </aside>
      </section>
    </CrmNextFrame>
  );
}

function CustomerOperatingLedger({
  activeAttentionItem,
  customer,
  model,
  savedStage
}: {
  activeAttentionItem?: CrmNextAttentionItem;
  customer: CrmNextCustomer360;
  model: CrmNextCommandCenter;
  savedStage?: CustomerJourneyStage;
}) {
  const customerTimelineEvents = verifiedTimelineEvents(model.timeline ?? [])
    .filter((event) => event.detail.toLowerCase().includes(customer.name.toLowerCase()) || event.label.toLowerCase().includes(customer.name.toLowerCase()))
    .slice(0, 4);
  const fallbackEvents = [
    ...customer.communications.map((item) => ({
      detail: item.detail,
      href: crmNextTimelineHref(customer.id),
      id: item.id,
      label: item.channel,
      occurredAt: item.occurredAt,
      source: "Communication" as const
    })),
    ...(activeAttentionItem ? [{
      detail: activeAttentionItem.reason,
      href: activeAttentionItem.workHref,
      id: `${activeAttentionItem.id}-attention`,
      label: activeAttentionItem.nextAction,
      occurredAt: activeAttentionItem.age,
      source: "Support" as const
    }] : [])
  ].slice(0, 4);
  const ledgerEvents = customerTimelineEvents.length ? customerTimelineEvents : fallbackEvents;
  const duplicateCandidates = (model.customers ?? [])
    .filter((record) => record.id !== customer.id)
    .filter((record) => record.name.toLowerCase() === customer.name.toLowerCase() || record.phone === customer.phone || record.email === customer.email)
    .slice(0, 3);
  const relationshipType = customerRelationshipType(customer, activeAttentionItem);
  const currentStatus = customerDisplayStatus(customer, savedStage);
  const nextOwner = activeAttentionItem?.owner ?? "Unassigned";
  const dueWindow = activeAttentionItem?.age ?? "No due date visible";
  const hasOwnerException = nextOwner === "Unassigned";
  const hasOverdueException = /overdue|missed|due/i.test(`${activeAttentionItem?.reason ?? ""} ${activeAttentionItem?.age ?? ""}`);
  const hasDuplicateException = duplicateCandidates.length > 0;
  const hasCloseoutException = savedStage && isTerminalJourneyStage(savedStage) ? false : /delivered|resolved|closed|no action/i.test(customer.nextAction);
  const managerExceptions = [
    hasOwnerException ? "No owner assigned" : "",
    hasOverdueException ? "Overdue or missed follow-up" : "",
    hasDuplicateException ? "Possible duplicate record" : "",
    hasCloseoutException ? "Closeout status may be missing" : ""
  ].filter(Boolean);
  const roleViews = [
    { label: "Sales", value: customer.openDeals > 0 ? `${customer.openDeals} open deal(s)` : "No open deal" },
    { label: "Service", value: customer.vehiclesOwned > 0 ? `${customer.vehiclesOwned} linked vehicle(s)` : "No linked vehicle" },
    { label: "Finance", value: /payment|finance|deposit/i.test(customer.nextAction) ? "Finance attention" : "No finance blocker" },
    { label: "Manager", value: managerExceptions.length ? `${managerExceptions.length} exception(s)` : "No exception" }
  ];
  const closeoutCopy = savedStage && isTerminalJourneyStage(savedStage)
    ? `${savedStage} recorded. Confirm note, owner, and any follow-up before archiving.`
    : "Not closed yet. Record outcome, note, owner, and whether follow-up is required.";

  return (
    <section className={styles.customerLedger} aria-label="Customer operating ledger">
      <header>
        <div>
          <span className={styles.eyebrow}>Customer Operating Ledger</span>
          <h2>One record for status, next action, timeline, exceptions, and closeout.</h2>
        </div>
        <Link className={styles.secondaryButton} href={activeAttentionItem?.workHref ?? `/crm-next/work/customer-read-${encodeURIComponent(customer.id)}`}>Open workbench</Link>
      </header>

      <div className={styles.ledgerStateGrid}>
        <article><span>Identity type</span><strong>{relationshipType}</strong><small>Customer/vendor path separated early.</small></article>
        <article><span>Status</span><strong>{currentStatus}</strong><small>{savedStage ? "Workbench outcome reflected" : "Live customer source"}</small></article>
        <article><span>Next owner</span><strong>{nextOwner}</strong><small>{activeAttentionItem?.nextAction ?? customer.nextAction}</small></article>
        <article><span>Due / SLA</span><strong>{dueWindow}</strong><small>{hasOverdueException ? "Manager review signal" : "No overdue signal"}</small></article>
      </div>

      <div className={styles.ledgerColumns}>
        <article>
          <h3>Unified Timeline</h3>
          <div className={styles.ledgerTimeline}>
            {ledgerEvents.length ? ledgerEvents.map((event) => (
              <Link href={event.href} key={event.id}>
                <span>{event.source}</span>
                <strong>{event.label}</strong>
                <small>{event.detail} · {event.occurredAt}</small>
              </Link>
            )) : <p>No verified activity yet. Start with Check-In, note, task, appointment, or outcome.</p>}
          </div>
        </article>

        <article>
          <h3>Closeout Framework</h3>
          <p>{closeoutCopy}</p>
          <dl>
            <div><dt>Outcome</dt><dd>{savedStage ?? "Open"}</dd></div>
            <div><dt>Evidence</dt><dd>{ledgerEvents.length ? `${ledgerEvents.length} visible event(s)` : "Needs note or event"}</dd></div>
            <div><dt>Follow-up</dt><dd>{activeAttentionItem ? activeAttentionItem.nextAction : "No open follow-up"}</dd></div>
          </dl>
        </article>

        <article>
          <h3>Duplicates & Relationships</h3>
          {duplicateCandidates.length ? duplicateCandidates.map((record) => (
            <Link href={customer360Href(record.id)} key={record.id}>
              <strong>{record.name}</strong>
              <small>{record.phone} · {record.email}</small>
            </Link>
          )) : <p>No matching name, phone, or email duplicate found in the visible list.</p>}
        </article>

        <article>
          <h3>Role Views</h3>
          <dl>
            {roleViews.map((role) => <div key={role.label}><dt>{role.label}</dt><dd>{role.value}</dd></div>)}
          </dl>
        </article>

        <article>
          <h3>Search Coverage</h3>
          <p>{customerSearchKeywords(customer, activeAttentionItem)}</p>
          <Link className={styles.textLink} href={`/crm-next/search?q=${encodeURIComponent(customer.name)}`}>Search this record</Link>
        </article>

        <article>
          <h3>Audit & Manager Exceptions</h3>
          <p>Every future live update should record actor, source record, previous value, new value, reason, and timestamp.</p>
          <div className={styles.ledgerExceptionList}>
            {managerExceptions.length ? managerExceptions.map((exception) => <span key={exception}>{exception}</span>) : <span>No manager exception visible</span>}
          </div>
        </article>
      </div>
    </section>
  );
}

export function CrmNextActionReadinessView({ action, customerId, model }: { action: CrmNextOperatingAction; customerId?: string; model: CrmNextCommandCenter }) {
  const customers = model.customers ?? [];
  const attention = model.attention ?? [];
  const requestedCustomer = customerId ? customers.find((customer) => customer.id === customerId) : undefined;
  const relatedCustomer = customerId ? requestedCustomer : customers[0];
  const missingRequestedCustomer = Boolean(customerId && !requestedCustomer);
  const customerDisplayName = relatedCustomer?.name ?? "Customer record unavailable";
  const findCustomerHref = crmNextActionSearchHref(action.id);
  const backHref = relatedCustomer ? `/crm-next/customers/${relatedCustomer.id}` : findCustomerHref;
  const activeAttentionItem = relatedCustomer ? attention.find((item) => item.customerId === relatedCustomer.id) : undefined;
  const workbenchHref = activeAttentionItem?.workHref ?? backHref;
  const caseReturnHref = relatedCustomer ? crmNextActionHref("new-case", relatedCustomer.id) : "/crm-next/actions/new-case";
  const caseReminderHref = crmNextCustomerAppointmentHref({
    customerId: relatedCustomer?.id,
    customerName: customerDisplayName,
    reason: `Case reminder / SLA follow-up: ${relatedCustomer?.nextAction ?? action.response}`,
    returnTo: caseReturnHref
  });
  const caseTaskHref = crmNextActionHref("new-task", relatedCustomer?.id);
  const caseNoteHref = crmNextActionHref("add-note", relatedCustomer?.id);
  const caseQueueHref = relatedCustomer
    ? `/my-tasks?source=crm-case&customerId=${encodeURIComponent(relatedCustomer.id)}&owner=${encodeURIComponent(activeAttentionItem?.owner ?? "Unassigned")}`
    : "/my-tasks?source=crm-case";
  const caseEscalationHref = relatedCustomer
    ? `/manager-review?source=crm-case&customerId=${encodeURIComponent(relatedCustomer.id)}`
    : "/manager-review?source=crm-case";
  const stateCopy = action.state === "SAFE_ROUTE"
    ? "Ready to continue"
    : action.state === "PREVIEW_ONLY"
      ? "Open the customer context before using the approved live workspace"
      : "Use the approved workspace for this action";
  const primaryHref = action.id === "schedule-appointment"
    ? crmNextCustomerAppointmentHref({
        customerId: relatedCustomer?.id,
        customerName: customerDisplayName,
        reason: relatedCustomer?.nextAction ?? action.response,
        returnTo: backHref
      })
    : backHref;
  const workspace = directActionWorkspace(action, customerDisplayName, relatedCustomer?.nextAction ?? action.response);
  const actionTruth = crmActionSourceTruth(action.id);
  const isCrmTaskAction = action.id === "new-task";
  const isCaseAction = action.id === "new-case";
  const isHeldProviderAction = actionTruth.status === "Not wired" || actionTruth.status === "Hidden";
  const isLiveAction = actionTruth.status === "Live";
  const successMessage = action.id === "add-note"
    ? `Note saved to ${customerDisplayName}'s CRM timeline.`
    : action.id === "new-case"
      ? `Case prepared for ${customerDisplayName} with reminder, task, queue, and escalation routing.`
      : action.id === "new-task"
        ? `CRM task saved for ${customerDisplayName}.`
        : action.id === "upload-document"
          ? `Document record saved to ${customerDisplayName}'s CRM timeline.`
        : `${action.label} saved for ${customerDisplayName}.`;
  const canUseDirectAction = isLiveAction && Boolean(relatedCustomer);
  const actionStatusLabel = missingRequestedCustomer ? "Needs customer context" : actionTruth.status;
  const actionStatusClass = missingRequestedCustomer
    ? styles.levelMedium
    : action.state === "SAFE_ROUTE"
      ? styles.levelLow
      : action.state === "PREVIEW_ONLY" ? styles.levelMedium : styles.levelHigh;

  return (
    <CrmNextFrame active="work" userName={model.userName}>
      <Topbar />
      <section className={styles.customerWorkspace}>
        <section className={`${styles.customerHeroCard} ${styles.actionCustomerHero}`}>
          <div className={styles.actionCustomerIdentity}>
            <span className={styles.avatar}>{initials(customerDisplayName)}</span>
            <div>
              <span className={styles.eyebrow}>Customer action</span>
              <h1 className={styles.customerName}>{customerDisplayName}</h1>
              <span className={styles.customerBadge}>{action.label}</span>
              <p>{missingRequestedCustomer ? "Open this action from a verified Customer 360 record before saving work." : stateCopy}</p>
            </div>
          </div>
          <dl className={styles.customerFacts}>
            <div><dt>Status</dt><dd>{actionStatusLabel}</dd></div>
            <div><dt>Action type</dt><dd>{action.category}</dd></div>
            <div><dt>Customer</dt><dd>{customerDisplayName}</dd></div>
            <div><dt>Next step</dt><dd>{missingRequestedCustomer ? "Find verified customer" : isCrmTaskAction ? "Create CRM task" : "Continue"}</dd></div>
          </dl>
          <div className={styles.customerHeroActions}>
            {action.id === "schedule-appointment" ? <Link className={styles.primaryButton} href={primaryHref}>Open appointment console</Link> : null}
            <Link className={styles.secondaryButton} href={backHref}>{relatedCustomer ? "Back to Customer 360" : `Find customer for ${action.label}`}</Link>
            <Link className={styles.secondaryButton} href="/crm">Open older customer tools</Link>
          </div>
        </section>
        <main className={styles.customerMain}>
          {action.id === "schedule-appointment" ? null : (
            <section className={`${styles.panel} ${styles.directActionPanel}`}>
              <header className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Ready action</span>
                  <h2>{workspace.title}</h2>
                  <p>{workspace.status}</p>
                </div>
                <span className={isHeldProviderAction ? styles.levelMedium : styles.levelLow}>
                  {actionStatusLabel}
                </span>
              </header>
              <CrmNextDirectActionForm
                actionId={action.id}
                cancelHref={backHref}
                customerId={relatedCustomer?.id}
                customerName={customerDisplayName}
                disabled={!canUseDirectAction}
                fields={workspace.fields}
                nextAction={relatedCustomer?.nextAction ?? action.response}
                saveLabel={workspace.button}
                successMessage={successMessage}
              >
                {isCaseAction ? (
                  <div className={styles.caseControlGrid} aria-label="Case reminder and escalation controls">
                    <article>
                      <strong>Reminder control</strong>
                      <span>Reminder and due dates route to the appointment console so the promised follow-up is visible on the operating schedule.</span>
                      <Link href={caseReminderHref}>Open appointment link</Link>
                    </article>
                    <article>
                      <strong>Owner CRM task</strong>
                      <span>Assigned staff gets a CRM task tied to this customer, with the case summary and due date attached.</span>
                      <Link href={caseTaskHref}>Preview CRM task</Link>
                    </article>
                    <article>
                      <strong>Staff queue</strong>
                      <span>The customer is added to the owner&apos;s queue until the reminder, task, or case resolution is completed.</span>
                      <Link href={caseQueueHref}>Open staff queue</Link>
                    </article>
                    <article>
                      <strong>Escalation control</strong>
                      <span>Manager review is triggered when the case is overdue, blocked, urgent, or customer-impacting.</span>
                      <Link href={caseEscalationHref}>Open escalation queue</Link>
                    </article>
                    <article>
                      <strong>Customer note</strong>
                      <span>Add the case context directly to this customer&apos;s CRM timeline without leaving the customer record.</span>
                      <Link href={caseNoteHref}>Add customer note</Link>
                    </article>
                    <article>
                      <strong>Notification control</strong>
                      <span>The assigned staff member is tagged on the case activity and notified when ownership changes or the reminder becomes due.</span>
                      <Link href={caseNoteHref}>Tag staff in note</Link>
                    </article>
                    <article>
                      <strong>Resolution control</strong>
                      <span>Case cannot close until the final outcome is recorded on the customer timeline.</span>
                      <Link href={backHref}>Return to customer record</Link>
                    </article>
                  </div>
                ) : null}
              </CrmNextDirectActionForm>
            </section>
          )}

          <section className={styles.panel}>
            <header className={styles.panelHeader}><h2>What happens next</h2><span className={styles.pill}>{action.category}</span></header>
            <div className={styles.compactSectionGrid}>
              <article className={styles.compactSectionCard}><strong>Customer step</strong><span>{action.response}</span></article>
              <article className={styles.compactSectionCard}><strong>Work area</strong><span>{actionTruth.source}</span></article>
              <article className={styles.compactSectionCard}><strong>Follow-up</strong><span>{isCrmTaskAction ? "Keep this task in the customer CRM record unless an operational handoff is required." : "Return to Customer 360 after completing the step."}</span></article>
              <article className={styles.compactSectionCard}><strong>Availability</strong><span>{actionTruth.staffMessage}</span></article>
            </div>
          </section>

          <section className={styles.timeline}>
            <header className={styles.panelHeader}><h2>Available customer actions</h2><Link className={styles.textLink} href={workbenchHref}>Back to workbench</Link></header>
            <div className={styles.compactInfoGrid}>
              {model.operatingActions.map((item) => (
                <Link className={styles.glanceItem} href={crmNextActionHref(item.id, relatedCustomer?.id)} key={item.id}>
                  <ClipboardCheck size={18} />
                  <span><strong>{item.label}</strong><small>{item.category}</small></span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.customerAside}>
          <article className={styles.sidePanel}>
            <header><h2>Action status</h2></header>
            <strong className={actionStatusClass}>
              {actionStatusLabel}
            </strong>
            <ul className={styles.signalList}>
              <li>Customer context stays visible</li>
              <li>Next step stays clear</li>
              <li>Customer Archive and older customer tools remain available</li>
            </ul>
          </article>
          <article className={styles.sidePanel}>
            <header><h2>Need the old view?</h2></header>
            <p className={styles.muted}>Open the customer archive only when a workflow is not yet available here.</p>
            <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Open customer archive</Link>
          </article>
        </aside>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextWorkCustomerView({
  bridgePreview,
  initialWorkPath,
  item,
  model
}: {
  bridgePreview?: CrmNextActionBridgePreview;
  initialWorkPath?: CrmWorkPathId;
  item: CrmNextAttentionItem;
  model: CrmNextCommandCenter;
}) {
  const issue = customerWorkIssue(item);
  const verifiedCustomerActivity = verifiedTimelineEvents(model.timeline ?? []);
  const dueTask = bridgePreview?.dispatchPreview;
  const pendingTasks = dueTask ? "1 due" : "None";
  const workPathSelectRef = useRef<HTMLSelectElement | null>(null);
  const [workPath, setWorkPath] = useState<CrmWorkPathId>(() => readCrmWorkPath(item, initialWorkPath));
  const workPathConfig = CRM_WORK_PATHS[workPath];
  const progressStorageKey = customerWorkbenchProgressStorageKey(item.customerId);
  const [progressState, setProgressState] = useState<{ notice: string; stage: CustomerJourneyStage }>(() => {
    const resolvedInitialWorkPath = readCrmWorkPath(item, initialWorkPath);
    const initialPathConfig = CRM_WORK_PATHS[resolvedInitialWorkPath];
    const fallback = {
      notice: `${initialPathConfig.label} work is ready for staff follow-through.`,
      stage: normalizeJourneyStage(undefined, resolvedInitialWorkPath)
    };
    if (typeof window === "undefined") return fallback;
    try {
      const stored = window.localStorage.getItem(progressStorageKey);
      if (!stored) return fallback;
      const parsed = JSON.parse(stored) as { notice?: string; stage?: string };
      return {
        notice: parsed.notice || fallback.notice,
        stage: normalizeJourneyStage(parsed.stage, resolvedInitialWorkPath)
      };
    } catch {
      return fallback;
    }
  });
  const [dueTaskOpen, setDueTaskOpen] = useState(false);
  const sourceEvidence = sourceDealEvidence(model, item);
  const [draftDealEvidence] = useState<WorkbenchDealEvidence>(() => {
    const draft = readWorkbenchDealDraft(item.customerId);
    return draft?.vehicle?.trim()
      ? {
        detail: `Vehicle selected: ${draft.vehicle}`,
        label: "Vehicle selected",
        source: "Saved deal draft",
        started: true,
        vehicle: draft.vehicle
      }
      : sourceEvidence;
  });
  const dealEvidence = draftDealEvidence.started ? draftDealEvidence : sourceEvidence;
  const journeyStage = progressState.stage;
  const statusNotice = progressState.notice;
  const activeStageIndex = workPathConfig.stages.indexOf(journeyStage as never);
  const salesPath = workPath === "sales-deal";
  const dealStarted = salesPath && (dealEvidence.started || isDealStage(journeyStage));
  const appointmentScheduled = isAppointmentStage(journeyStage) || (salesPath && isDealStage(journeyStage)) || isTerminalJourneyStage(journeyStage);
  const terminalOutcome = isTerminalJourneyStage(journeyStage);
  const currentNeed = terminalOutcome
    ? `${journeyStage} recorded for ${workPathConfig.label.toLowerCase()}.`
    : journeyStage === "Appointment Scheduled" || journeyStage === "Scheduled"
      ? "Prepare appointment and keep the customer confirmed"
      : journeyStage === "Working Deal"
        ? "Work deal details and next customer commitment"
        : item.nextAction;
  const stageStatusText = terminalOutcome ? "Completed" : journeyStage;
  const appointmentSummary = appointmentScheduled ? "Scheduled" : "Not Scheduled";
  const startDealHref = `${CRM_NEXT_DEAL_START_HREF}?customerId=${encodeURIComponent(item.customerId)}&returnTo=${encodeURIComponent(item.workHref)}`;
  const appointmentHref = crmNextCustomerAppointmentHref({
    customerId: item.customerId,
    customerName: item.customerName,
    reason: item.nextAction,
    returnTo: item.workHref
  });
  const primaryExecutionHref = salesPath && !dealStarted ? startDealHref : !appointmentScheduled && salesPath ? appointmentHref : "#lead";
  const primaryExecutionLabel = salesPath && !dealStarted ? "Start deal" : !appointmentScheduled && salesPath ? "Schedule appointment" : workPathConfig.primaryAction;
  function updateJourneyStage(stage: string, summary?: string) {
    const nextStage = normalizeJourneyStage(stage, workPath);
    const nextProgressState = {
      notice: summary ?? `${nextStage} saved on this workbench.`,
      stage: nextStage
    };
    setProgressState(nextProgressState);
    try {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(nextProgressState));
    } catch {
      // The visible workbench still updates even if local persistence is unavailable.
    }
  }
  function updateWorkPath(nextPath: CrmWorkPathId) {
    setWorkPath(nextPath);
    const nextStage = normalizeJourneyStage(progressState.stage, nextPath);
    const nextProgressState = {
      notice: `${CRM_WORK_PATHS[nextPath].label} path selected for this workbench.`,
      stage: nextStage
    };
    setProgressState(nextProgressState);
    try {
      window.localStorage.setItem(crmWorkPathStorageKey(item.customerId), nextPath);
      window.localStorage.setItem(progressStorageKey, JSON.stringify(nextProgressState));
    } catch {
      // The visible workbench still updates even if local persistence is unavailable.
    }
  }
  function focusCheckInPathSelector() {
    workPathSelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => workPathSelectRef.current?.focus(), 220);
  }
  const progressSteps = [
    { label: "Customer opened", state: "complete" },
    { label: "Contact made", state: "complete" },
    { label: salesPath ? (dealStarted ? dealEvidence.label : "Start deal") : workPathConfig.progressActive, state: salesPath ? (dealStarted ? "complete" : "active") : (terminalOutcome ? "complete" : "active") },
    { label: terminalOutcome ? journeyStage : "Outcome", state: terminalOutcome ? "complete" : "waiting" }
  ];
  const executionSteps = [
    ...(salesPath ? [{
      href: startDealHref,
      label: "Next",
      title: dealStarted ? "Continue the deal" : "Start or update the deal",
      detail: dealStarted ? `${dealEvidence.detail}. Keep price, customer commitment, and delivery path current.` : "No deal is recorded on this workbench yet. Start the deal, attach vehicle interest, and return here.",
      state: dealStarted ? dealEvidence.source : "Needed"
    }] : [{
      href: "#lead",
      label: "Next",
      title: workPathConfig.primaryAction,
      detail: `${workPathConfig.label} is not a sales funnel. Use the status strip to mark delivered, resolved, closed, or no action needed.`,
      state: terminalOutcome ? stageStatusText : "Ready"
    }]),
    ...(salesPath ? [{
      href: appointmentHref,
      label: "Then",
      title: "Schedule the appointment",
      detail: appointmentScheduled ? "Appointment is marked scheduled. Keep confirmation and arrival follow-through visible." : "Next appointment is not scheduled. Put the customer on the calendar before this leaves the queue.",
      state: appointmentScheduled ? "Scheduled" : "Open"
    }] : []),
    {
      href: "#lead",
      label: "Record",
      title: salesPath ? "Log the customer outcome" : "Close the work cleanly",
      detail: terminalOutcome ? "Outcome is marked. Add the note or close-loop task the next staff member needs." : "Capture what happened, the promise made, and the next staff owner so the work does not reset.",
      state: terminalOutcome ? stageStatusText : "Ready"
    }
  ];
  const completionSignals = [
    { label: "Contact", value: "Done today", tone: "complete" },
    { label: salesPath ? "Deal" : "Path", value: salesPath ? (dealStarted ? "Started" : "Missing") : workPathConfig.label, tone: salesPath ? (dealStarted ? "complete" : "attention") : "complete" },
    { label: "Status", value: terminalOutcome ? String(journeyStage) : "Open", tone: terminalOutcome ? "complete" : "attention" },
    { label: "Task", value: pendingTasks, tone: pendingTasks === "None" ? "quiet" : "attention" }
  ];

  return (
    <CrmNextFrame active="work" userName={model.userName}>
      <section className={styles.workShell}>
        <header className={styles.workHero}>
          <div className={styles.workHeroMeta}>
            <div className={styles.workHeroBreadcrumbs}>
              <span className={styles.eyebrow}>Customer Workbench</span>
              <Link href="/crm-next/needs-attention">← Back to attention queue</Link>
            </div>
            <span className={levelClass(item.level)}>{item.level}</span>
          </div>
          <div className={styles.workHeroBody}>
            <div>
              <h1 className={styles.workTitle}>{item.customerName}</h1>
              <p className={styles.muted}>{issue.issue} · {workPathConfig.label} · Owner: {item.owner}</p>
            </div>
            <div className={styles.workActions}>
              <button className={styles.secondaryButton} onClick={focusCheckInPathSelector} type="button">Check-In</button>
              {salesPath ? <Link className={styles.secondaryButton} href={startDealHref}>{dealStarted ? "Continue Deal" : "Start Deal"}</Link> : null}
              <Link className={styles.secondaryButton} href={item.customerHref}>Customer 360</Link>
            </div>
          </div>
        </header>
        <main>
          <section className={styles.executionFunnel} aria-labelledby="execution-funnel-heading">
            <header>
              <div>
                <span className={styles.eyebrow}>Execution funnel</span>
                <h2 id="execution-funnel-heading">What has happened, what is missing, and what to do next</h2>
                <p>Open this workbench and move from contact to deal, appointment, and recorded outcome without guessing.</p>
              </div>
              <Link className={styles.primaryButton} href={primaryExecutionHref}>{primaryExecutionLabel}</Link>
            </header>
            <ol className={styles.executionProgress} aria-label="Customer execution progress">
              {progressSteps.map((step) => (
                <li data-state={step.state} key={step.label}>{step.label}</li>
              ))}
            </ol>
            <div className={styles.executionSignalGrid} aria-label="Workbench completion signals">
              {completionSignals.map((signal) => (
                dueTask && signal.label === "Task" ? (
                  <button
                    aria-controls="workbench-due-task"
                    aria-expanded={dueTaskOpen}
                    data-tone={signal.tone}
                    key={signal.label}
                    onClick={() => setDueTaskOpen((open) => !open)}
                    type="button"
                  >
                    <span>{signal.label}</span>
                    <strong>{signal.value}</strong>
                    <small>{dueTaskOpen ? "Hide details" : "View details"}</small>
                  </button>
                ) : (
                  <article data-tone={signal.tone} key={signal.label}>
                    <span>{signal.label}</span>
                    <strong>{signal.value}</strong>
                  </article>
                )
              ))}
            </div>
            {dueTask && dueTaskOpen ? (
              <section className={styles.dueTaskPanel} id="workbench-due-task" aria-label="Due customer task">
                <header>
                  <div>
                    <span className={styles.eyebrow}>Due task</span>
                    <h3>{dueTask.title}</h3>
                    <p>{dueTask.source}</p>
                  </div>
                  <strong>{dueTask.due}</strong>
                </header>
                <dl>
                  <div><dt>Owner</dt><dd>{dueTask.assignedTo}</dd></div>
                  <div><dt>Customer 360 update</dt><dd>{dueTask.customer360Update}</dd></div>
                </dl>
                <div className={styles.dueTaskActions}>
                  <Link href="#lead">Work task on this page</Link>
                  <Link href={crmNextActionHref("new-task", item.customerId)}>Open CRM task action</Link>
                  <Link href={crmNextTimelineHref(item.customerId)}>Open customer timeline</Link>
                </div>
              </section>
            ) : null}
            <div className={styles.executionStepGrid}>
              {executionSteps.map((step) => (
                <Link className={styles.executionStepCard} href={step.href} key={step.title}>
                  <span>{step.label}</span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                  <em>{step.state}</em>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.crmWorkbenchBoard} aria-label="CRM customer workbench">
            <header className={styles.crmWorkbenchHeader}>
              <div>
                <span className={styles.eyebrow}>Customer file</span>
                <h2>{item.customerName}</h2>
              <p>{issue.issue}</p>
              <small className={styles.statusUpdateNotice}>{statusNotice}</small>
              </div>
              <div className={styles.workPathControl} id="work-path">
                <label>
                  <span>Work Path</span>
                  <select ref={workPathSelectRef} value={workPath} onChange={(event) => updateWorkPath(event.target.value as CrmWorkPathId)}>
                    {Object.entries(CRM_WORK_PATHS).map(([id, path]) => (
                      <option key={id} value={id}>{path.label}</option>
                    ))}
                  </select>
                </label>
                <Link className={styles.secondaryButton} href="#customer-sections">Update Status</Link>
              </div>
            </header>

            <ol className={styles.dealerJourneyStrip} aria-label="Customer journey">
              {workPathConfig.stages.map((stage, index) => {
                const state = stage === journeyStage
                  ? "active"
                  : index < activeStageIndex && !isTerminalJourneyStage(stage as CustomerJourneyStage)
                    ? "complete"
                    : "idle";
                return (
                  <li data-state={state} key={stage}>
                    <button onClick={() => updateJourneyStage(stage)} type="button">{stage}</button>
                  </li>
                );
              })}
            </ol>

            <section className={styles.dealerCustomerSnapshot} aria-label="Customer status summary">
              <div><span>Next Appt.</span><strong>{appointmentSummary}</strong></div>
              <div><span>Last Appt.</span><strong>{journeyStage === "Missed Appt." ? "Missed" : "None"}</strong></div>
              {dueTask ? (
                <button aria-controls="workbench-due-task" aria-expanded={dueTaskOpen} onClick={() => setDueTaskOpen((open) => !open)} type="button">
                  <span>Pending Tasks</span>
                  <strong>{pendingTasks}</strong>
                </button>
              ) : (
                <div><span>Pending Tasks</span><strong>{pendingTasks}</strong></div>
              )}
              <div><span>Deposit</span><strong>None</strong></div>
              <div><span>{workPathConfig.summaryLabel}</span><strong>{salesPath ? (dealStarted ? (terminalOutcome ? stageStatusText : dealEvidence.label) : "None") : stageStatusText}</strong></div>
              <div><span>Last Contacted</span><strong>Today</strong></div>
              <div><span>Days Old</span><strong>0</strong></div>
              <div><span>Days Since Activity</span><strong>0</strong></div>
            </section>

            <section className={styles.dealerCustomerDetails} aria-label="Customer source details">
              <div>
                <span>Lead Source</span>
                <strong>Walk-in / customer next action</strong>
              </div>
              <div>
                <span>Inquiry Type</span>
                <strong>{workPathConfig.label}</strong>
              </div>
              <div>
                <span>Sales Rep</span>
                <strong>{item.owner}</strong>
              </div>
              <div>
                <span>Current Need</span>
                <strong>{currentNeed}</strong>
              </div>
              <div>
                <span>{workPathConfig.detailLabel}</span>
                <strong>{salesPath ? dealEvidence.detail : `${workPathConfig.label} status is ${journeyStage}.`}</strong>
              </div>
            </section>

            <CrmNextWorkbenchSections
              currentNeed={item.nextAction}
              customerId={item.customerId}
              customerName={item.customerName}
              dealEvidence={dealEvidence}
              documentActionHref={crmNextActionHref("upload-document", item.customerId)}
              doneMeaning={issue.done}
            />

            <CrmNextInlineTaskComposer
              appointmentHref={crmNextCustomerAppointmentHref({
                customerId: item.customerId,
                customerName: item.customerName,
                reason: item.nextAction,
                returnTo: item.workHref
              })}
              customerName={item.customerName}
              nextAction={item.nextAction}
              onProgressUpdate={updateJourneyStage}
              owner={item.owner}
            />
          </section>

          <section className={styles.activityWorkbenchGrid} id="customer-activity">
            <article className={styles.card}>
              <header>
                <div>
                  <h2>Activity</h2>
                  <p className={styles.muted}>Everything staff needs to understand what happened and decide the next customer step.</p>
                </div>
                <Link className={styles.textLink} href={crmNextTimelineHref(item.customerId)}>Open full timeline</Link>
              </header>
              <CrmNextActivityFilterTabs customerName={item.customerName} events={verifiedCustomerActivity} />
            </article>
          </section>
        </main>
      </section>
    </CrmNextFrame>
  );
}
