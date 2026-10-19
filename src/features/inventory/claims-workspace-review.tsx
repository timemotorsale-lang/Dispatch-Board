"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { claimPhotoCategory, type ClaimPhotoCategory } from "@/lib/claim-photo-upload";
import { ClaimPhotoUploader } from "./claim-photo-uploader";
import { ClaimRepairWorkflow } from "./claim-repair-workflow";
import { ClaimCustomerAuthorization } from "./claim-customer-authorization";
import { claimPermissionStatus } from "@/lib/claim-customer-authorization";

import type { ClaimChecklistItem, ClaimReadModel } from "@/server/claims-workspace/service";

import styles from "./claims-workspace-review.module.css";

const snapshot = [
  ["Customer", "Deqo Roble"],
  ["Vehicle", "2018 Toyota Camry"],
  ["VIN", "4T1B11HK9JU128441"],
  ["Owner", "Eli Manager"],
  ["Carrier", "State Farm"],
  ["Adjuster", "Needed"],
  ["Loss date", "Sep 15, 2026"],
  ["Deductible", "$500 confirmed"],
];

const needs = [
  { label: "Claim number", detail: "Captured from customer", state: "done" },
  { label: "Customer authorization", detail: "Signature required before repair handoff", state: "blocked" },
  { label: "Carrier and policy", detail: "Insurance card attached", state: "done" },
  { label: "Adjuster contact", detail: "Call carrier or customer", state: "warning" },
  { label: "Damage photos", detail: "Need left-front and VIN photo", state: "blocked" },
  { label: "Deductible", detail: "$500 confirmed", state: "done" },
] as const;

const readiness = [
  { label: "Estimate readiness", percent: 88, status: "Ready", tone: "good" },
  { label: "Repair order handoff", percent: 56, status: "Blocked", tone: "warning" },
  { label: "Payment follow-up", percent: 32, status: "Later", tone: "info" },
  { label: "Closeout", percent: 18, status: "Not yet", tone: "info" },
] as const;

const fallbackTasks = [
  { actionLabel: "Record carrier call", detail: "Call the carrier, capture adjuster name, phone, email, and approval status.", dueLabel: "Today", id: "fallback-carrier-call", ownerRole: "Service advisor", status: "ready", title: "Find adjuster contact" },
  { actionLabel: "Send authorization", detail: "Repair handoff is blocked until authorization is complete.", dueLabel: "Today", id: "fallback-authorization", ownerRole: "Service advisor", status: "ready", title: "Get customer authorization" },
  { actionLabel: "Upload photos", detail: "Visible damage photos and closeups.", dueLabel: "Today", id: "fallback-photos", ownerRole: "Intake staff", status: "ready", title: "Take damage photos" }
] as const;

const fallbackBillingRecovery: ClaimReadModel["billingRecovery"] = {
  blockers: ["Carrier / adjuster missing", "Signed authorization missing", "Approved estimate or supplement missing"],
  invoicePacket: {
    missing: ["Carrier / adjuster", "Signed authorization", "Approved estimate or supplement"],
    ready: false,
    required: ["Claim number", "Carrier / adjuster", "Signed authorization", "Approved estimate or supplement", "Final invoice / repair order"],
    status: "BLOCKED",
    title: "Carrier invoice packet"
  },
  nextAction: {
    dueLabel: "Today",
    label: "Confirm payer contact",
    ownerRole: "Service advisor",
    reason: "Carrier, adjuster, or warranty payer contact must be complete before billing."
  },
  payerSplit: [
    { amountLabel: "Pending packet", payer: "INSURANCE", status: "BLOCKED", title: "Insurance carrier" },
    { amountLabel: "Deductible pending", payer: "CUSTOMER", status: "PENDING", title: "Customer deductible" },
    { amountLabel: "No rental active", payer: "INSURANCE", status: "PENDING", title: "Rental recovery" }
  ],
  rental: {
    approvedDaysLabel: "Not started",
    overageRisk: "NONE",
    payer: "INSURANCE",
    status: "NOT_STARTED",
    summary: "No active rental evidence is attached to this claim.",
    usedDaysLabel: "0 days"
  },
  shortPayWatch: {
    active: false,
    reason: "No short-pay issue detected."
  },
  summary: {
    approvedAmountLabel: "Pending approval",
    balanceLabel: "Blocked",
    billedAmountLabel: "Not ready",
    deductibleLabel: "Pending",
    paidAmountLabel: "No payment posted"
  }
};

type ExtraActionTool = "text" | "call" | "email" | "appointment" | "file" | "repair";

const extraActionTools: Array<{ id: ExtraActionTool; label: string; detail: string }> = [
  { id: "text", label: "Text", detail: "Send a customer or carrier text update." },
  { id: "call", label: "Call", detail: "Log a phone call and capture the promise or result." },
  { id: "email", label: "Email", detail: "Send or document an email follow-up." },
  { id: "appointment", label: "Appointment", detail: "Schedule inspection, reinspect, drop-off, or follow-up." },
  { id: "file", label: "File upload", detail: "Attach authorization, photos, estimates, or payment proof." },
  { id: "repair", label: "Repair workflow", detail: "Move toward handoff, repair order, or exception review." }
];

function toolForTask(task: { actionLabel: string; title: string }): ExtraActionTool {
  const text = `${task.actionLabel} ${task.title}`.toLowerCase();
  if (text.includes("call") || text.includes("adjuster") || text.includes("carrier")) return "call";
  if (text.includes("authorization") || text.includes("photo") || text.includes("upload") || text.includes("odometer") || text.includes("vin")) return "file";
  if (text.includes("handoff") || text.includes("repair order")) return "repair";
  return "text";
}

function StatusBadge({ tone = "info", children }: { tone?: "good" | "warning" | "danger" | "info"; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

type NeedState = "done" | "warning" | "blocked";

function NeedIcon({ state }: { state: NeedState }) {
  const symbol = state === "done" ? "✓" : state === "warning" ? "?" : "!";
  return <span className={`${styles.needIcon} ${styles[state]}`}>{symbol}</span>;
}

function checklistState(item: ClaimChecklistItem): NeedState {
  if (item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED" || item.state === "NOT_APPLICABLE") return "done";
  if (item.state === "BLOCKED") return "blocked";
  return "warning";
}

function readinessTone(status: string): "good" | "warning" | "danger" | "info" {
  if (status === "ready" || status === "exception_ready") return "good";
  if (status === "blocked") return "warning";
  return "info";
}

function readinessLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  if (status === "exception_ready") return "Exception ready";
  return "Not yet";
}

type ManualFieldTone = "filled" | "pending" | "missing";

const manualFieldToneClass: Record<ManualFieldTone, string> = {
  filled: styles.manualFilled,
  pending: styles.manualPending,
  missing: styles.manualMissing
};

function hasManualValue(value: unknown) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

function manualFieldClassName(value: unknown, options: { required?: boolean; wide?: boolean } = {}) {
  const tone: ManualFieldTone = hasManualValue(value) ? "filled" : options.required ? "missing" : "pending";
  return [manualFieldToneClass[tone], options.wide ? styles.fullField : null].filter(Boolean).join(" ");
}

function activityActorName(activity: ClaimReadModel["activities"][number]) {
  if (activity.actorUserName) return activity.actorUserName;
  if (activity.actorUserId === "seed") return "System";
  if (activity.actorUserId === "advisor") return "Eli Manager";
  return "Eli Manager";
}

function claimOwnerName(ownerUserId?: string) {
  if (!ownerUserId) return "Unassigned";
  const knownOwners: Record<string, string> = {
    "advisor-1": "Eli Manager",
    "advisor-2": "Service Advisor",
    advisor: "Eli Manager",
    seed: "System"
  };
  return knownOwners[ownerUserId] ?? "Eli Manager";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayInputDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function ClaimsWorkspaceReview({ loadError, model, authorizationRequested = false }: { loadError?: string; model?: ClaimReadModel; authorizationRequested?: boolean }) {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [authorizationOpen, setAuthorizationOpen] = useState(authorizationRequested);
  const [actionMessage, setActionMessage] = useState("");
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [activeExtraTool, setActiveExtraTool] = useState<ExtraActionTool>("call");
  const [extraToolsOpen, setExtraToolsOpen] = useState(false);
  const [estimateDrawerOpen, setEstimateDrawerOpen] = useState(false);
  const [approvedAmountEditorOpen, setApprovedAmountEditorOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [moneyDrawerOpen, setMoneyDrawerOpen] = useState(false);
  const [printDocument, setPrintDocument] = useState<{ html: string; title: string } | null>(null);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");
  const [snapshotEditing, setSnapshotEditing] = useState(false);
  const [photoCategory, setPhotoCategory] = useState<ClaimPhotoCategory | null>(null);
  const reminderDateInputRef = useRef<HTMLInputElement>(null);
  const communicationPending = !!model && model.claim.status !== "CLOSED" && claimPermissionStatus(model.evidence, "CLAIM_COMMUNICATION") !== "Verified signed copy";
  const primaryBlocker = communicationPending ? "Claim communication permission needed" : model?.primaryBlocker;
  const snapshotRows = model ? [
    ["Customer", model.claim.customerName],
    ["Address", [model.claim.customerAddressLine1, model.claim.customerAddressLine2, model.claim.customerCity, model.claim.customerState, model.claim.customerPostalCode].filter(Boolean).join(", ") || "Pending"],
    ["Vehicle", [model.claim.vehicleYear, model.claim.vehicleMake, model.claim.vehicleModel].filter(Boolean).join(" ") || "Not captured"],
    ["Color / mileage", [model.claim.vehicleColor, model.claim.vehicleMileage].filter(Boolean).join(" / ") || "Pending"],
    ["VIN", model.claim.vehicleVin || "Pending"],
    ["Plate / stock", [model.claim.vehiclePlate, model.claim.vehicleStockNumber].filter(Boolean).join(" / ") || "Pending"],
    ["Owner", claimOwnerName(model.claim.ownerUserId)],
    ["Carrier", model.claim.carrierName || "Pending"],
    ["Adjuster", model.claim.adjusterName || "Needed"],
    ["Loss date", model.claim.lossDate || "Pending"],
    ["Deductible", model.claim.deductible || "Pending"]
  ] : snapshot;
  const needRows = model ? model.checklist.map((item) => ({
    detail: item.detail,
    label: item.category === "AUTHORIZATION" ? "Repair authorization" : item.label,
    state: checklistState(item)
  })) : needs;
  const readinessRows: { label: string; percent: number; status: string; tone: "good" | "warning" | "danger" | "info" }[] = model ? model.readiness.map((item) => ({
    label: item.title,
    percent: item.percent,
    status: readinessLabel(item.status),
    tone: readinessTone(item.status)
  })) : [...readiness];
  if (model) {
    const permission = claimPermissionStatus(model.evidence, "CLAIM_COMMUNICATION");
    readinessRows.unshift({ label: "Claim communication permission", percent: permission === "Verified signed copy" ? 100 : 0, status: communicationPending ? "Signature verification needed" : permission, tone: permission === "Verified signed copy" ? "good" : "warning" });
  }
  const completedNeeds = model?.checklist.filter((item) => item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED" || item.state === "NOT_APPLICABLE").length;
  const activityRows = model?.activities.length ? model.activities.slice(0, 5) : [
    { action: "CLAIM_CREATED", actorUserName: "Eli Manager", at: "2026-09-17T14:00:00.000Z", detail: "Insurance claim workspace opened from Claims Desk.", actorUserId: "advisor", id: "fallback-activity" }
  ];
  const evidenceByActivityId = new Map(
    activityRows.map((activity) => [
      activity.id,
      model?.evidence.find((evidence) => activity.action === "CLAIM_EVIDENCE_ATTACHED" && activity.detail.startsWith(`${evidence.title} attached as `))
    ])
  );
  const evidenceRows = model ? [...model.evidence].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) : [];
  const taskRows = model?.executionTasks ?? fallbackTasks;
  const billingRecovery = model?.billingRecovery ?? fallbackBillingRecovery;
  const estimateReview: ClaimReadModel["estimateReview"] = model?.estimateReview ?? {
    approvedAmountCents: null,
    approvedAmountLabel: "Pending approval",
    confidence: "NEEDS_REVIEW" as const,
    detail: "No carrier estimate or supplement has been attached to this claim yet.",
    status: "MISSING" as const
  };
  const estimateEvidence = estimateReview.sourceTitle
    ? evidenceRows.find((evidence) =>
      evidence.id === estimateReview.evidenceId ||
      evidence.documentLibraryId === estimateReview.documentLibraryId ||
      (evidence.fileName && evidence.fileName === estimateReview.fileName) ||
      evidence.title === estimateReview.sourceTitle
    )
    : undefined;
  const carrier = model?.carrierTracker ?? {
    adjuster: "Needed",
    approvalStatus: "needs_adjuster",
    carrier: "State Farm",
    claimNumber: "MN-48291",
    nextContact: "Call carrier for adjuster",
    policyNumber: "Pending",
    statusLabel: "needs adjuster"
  };
  const claimId = model?.claim.id;
  const claimReturnHref = claimId ? `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}` : "/vehicles/claims-workspace";
  const repairTaskCustomer = model?.claim.customerName ?? "Claim customer";
  const repairTaskVehicle = [model?.claim.vehicleYear, model?.claim.vehicleMake, model?.claim.vehicleModel].filter(Boolean).join(" ");
  const repairTaskContext = new URLSearchParams({
    brief: [
      "Prepare and link the repair order. Do not start repairs before scope-specific customer and payer approval are recorded.",
      `Claim: ${model?.claim.claimNumber || claimId || "Pending claim number"}.`,
      `Carrier: ${model?.claim.carrierName || carrier.carrier || "Pending carrier"}.`,
      `Approved amount: ${estimateReview.approvedAmountLabel}.`,
      "Confirm authorization, approved estimate or supplement, stop rules, owner, and first repair action before work begins."
    ].join("\n"),
    customerReference: repairTaskCustomer,
    expectedOutcome: "The claim is linked to its repair plan with scope, authorization, supplement checkpoints, owner, and first action documented.",
    intakeType: "Repair Order / Authorization",
    returnTo: claimReturnHref,
    sourceTitle: "Claims Desk repair approval handoff",
    title: `Prepare repair plan for ${repairTaskCustomer}`,
    workflowArea: "SERVICE_ADVISOR"
  });
  if (repairTaskVehicle) repairTaskContext.set("vehicleReference", repairTaskVehicle);
  const startRepairTaskHref = `/tasks/intake?${repairTaskContext.toString()}`;
  const repairWorkflowTaskHref = model?.associatedRepairTask ? `${model.associatedRepairTask.href}?${new URLSearchParams({ claimId: claimId!, returnTo: claimReturnHref })}` : startRepairTaskHref;
  const repairWorkflowTaskActionLabel = model?.associatedRepairTask ? "View assigned task" : "Create repair planning task";
  const repairWorkflowTaskDetail = model?.associatedRepairTask
    ? `${model.associatedRepairTask.title} is already tied to this claim. Open it to keep repair progress centralized.`
    : "Create a repair planning task with authorization, scope, owner, and first action tied to this claim.";
  const appointmentContext = new URLSearchParams({
    action: "new",
    reason: model?.nextAction.reason ?? "Claim follow-up from Claims Workspace.",
    returnTo: claimReturnHref,
    title: "Claim appointment / reminder"
  });
  const appointmentCustomer = model?.claim.customerName;
  const appointmentVehicle = [model?.claim.vehicleYear, model?.claim.vehicleMake, model?.claim.vehicleModel].filter(Boolean).join(" ");
  if (appointmentCustomer) appointmentContext.set("customerReference", appointmentCustomer);
  if (appointmentVehicle) appointmentContext.set("vehicleReference", appointmentVehicle);
  const newAppointmentHref = `/appointments?${appointmentContext.toString()}`;
  const minimumReminderDate = todayInputDate();

  async function submitJson(path: string, body: Record<string, unknown>, method = "POST") {
    setActionError("");
    setActionMessage("");
    setIsWorking(true);
    try {
      const response = await fetch(path, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The claim action could not be recorded.");
      setActionMessage("Action recorded. Refreshing workspace...");
      window.location.reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "The claim action could not be recorded.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitEvidenceForm(path: string, formData: FormData) {
    setActionError("");
    setActionMessage("");
    setIsWorking(true);
    try {
      const files = formData.getAll("file").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length) {
        for (const file of files) {
          const upload = new FormData();
          for (const [key, value] of formData.entries()) {
            if (key !== "file") upload.append(key, value);
          }
          upload.append("file", file);
          const response = await fetch(path, { body: upload, method: "POST" });
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(`${file.name}: ${payload?.error ?? "The claim evidence could not be recorded."}`);
        }
      } else {
        const response = await fetch(path, {
          body: JSON.stringify(Object.fromEntries(formData.entries())),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? "The claim evidence could not be recorded.");
      }
      setActionMessage(files.length ? `${files.length} file${files.length === 1 ? "" : "s"} uploaded and linked to the claim. Refreshing workspace...` : "Evidence recorded. Refreshing workspace...");
      window.location.reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "The claim evidence could not be recorded.");
    } finally {
      setIsWorking(false);
    }
  }

  async function recordCarrierCall(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, Object.fromEntries(formData.entries()), "PATCH");
  }

  async function recordActivityUpdate(formData: FormData) {
    if (!claimId) return;
    const category = String(formData.get("category") ?? "ACTIVITY_ONLY");
    const files = formData.getAll("file").filter((file): file is File => file instanceof File && file.size > 0);
    const fileName = files[0]?.name ?? "";
    const title = String(formData.get("title") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const updateType = String(formData.get("updateType") ?? "").trim();

    if (category !== "ACTIVITY_ONLY" && (title || fileName)) {
      formData.set("notes", note);
      formData.set("relationshipTargets", "CLAIM,CUSTOMER,VEHICLE,REPAIR_ORDER");
      formData.set("status", "RECEIVED");
      if (!title) formData.set("title", fileName || updateType);
      await submitEvidenceForm(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/evidence`, formData);
      return;
    }

    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, {
      nextAction: formData.get("nextAction"),
      note,
      updateType
    }, "PATCH");
  }

  async function requestHandoff(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/handoff`, {
      exceptionReason: formData.get("exceptionReason")
    });
  }

  async function saveClaim() {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, {
      note: "Claim workspace reviewed and saved."
    }, "PATCH");
  }

  async function saveSnapshot(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, Object.fromEntries(formData.entries()), "PATCH");
  }

  function buildEvidenceDocument(activity: ClaimReadModel["activities"][number]) {
    if (!model) return;
    const evidence = evidenceByActivityId.get(activity.id);
    if (!evidence) return;
    return buildEvidenceDocumentFromEvidence(evidence, activityActorName(activity), activity.detail);
  }

  function buildEvidenceDocumentFromEvidence(evidence: ClaimReadModel["evidence"][number], actorName = "Claim workspace", fallbackDetail = "") {
    if (!model) return;
    const printedAt = new Date().toLocaleString();
    const rows = [
      ["Customer", model.claim.customerName],
      ["Claim #", model.claim.claimNumber || "Draft"],
      ["Carrier", model.claim.carrierName || "Pending"],
      ["Vehicle", [model.claim.vehicleYear, model.claim.vehicleMake, model.claim.vehicleModel].filter(Boolean).join(" ") || "Not captured"],
      ["VIN", model.claim.vehicleVin || "Pending"],
      ["Evidence category", evidence.category.replaceAll("_", " ")],
      ["Evidence title", evidence.title],
      ["File name", evidence.fileName || "No file name captured"],
      ["Status", evidence.status.replaceAll("_", " ")],
      ["Attached at", new Date(evidence.createdAt).toLocaleString()],
      ["Recorded by", actorName]
    ];
    const notes = evidence.notes || fallbackDetail || "No additional evidence note was captured.";
    return {
      html: `
        <header>
          <h1>Claim Evidence Document</h1>
          <small>Prepared ${escapeHtml(printedAt)} from the Claims Workspace audit trail.</small>
        </header>
        <table>
          <tbody>
            ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
          </tbody>
        </table>
        <h2>Evidence note</h2>
        <div class="note">${escapeHtml(notes)}</div>
      `,
      title: evidence.title
    };
  }

  function openEvidenceDocument(activity: ClaimReadModel["activities"][number]) {
    const document = buildEvidenceDocument(activity);
    if (!document) return;
    setPrintDocument(document);
  }

  function openUploadedEvidenceDocument(evidence: ClaimReadModel["evidence"][number]) {
    const document = buildEvidenceDocumentFromEvidence(evidence);
    if (!document) return;
    setPrintDocument(document);
    setActivityDrawerOpen(true);
  }

  function originalEvidenceHref(evidence: ClaimReadModel["evidence"][number]) {
    return claimId && evidence.documentLibraryId
      ? `/api/claims-workspace/claims/${encodeURIComponent(claimId)}/evidence/${encodeURIComponent(evidence.id)}/content`
      : null;
  }

  function originalEvidenceUnavailableLabel(evidence: ClaimReadModel["evidence"][number]) {
    return evidence.documentLibraryId ? "Original source unavailable" : "Original file not captured";
  }

  function printEvidenceDocument(activity: ClaimReadModel["activities"][number]) {
    const document = buildEvidenceDocument(activity);
    if (!document) return;
    const documentWindow = window.open("", "_blank");
    if (!documentWindow) {
      setPrintDocument(document);
      setActionError("The print window was blocked. The document is open in this panel, and you can use Print from here.");
      return;
    }
    documentWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(document.title)} - Claim Evidence</title>
          <style>
            body { color: #111827; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
            header { border-bottom: 2px solid #111827; margin-bottom: 24px; padding-bottom: 16px; }
            h1 { font-size: 24px; margin: 0 0 6px; }
            h2 { font-size: 18px; margin: 24px 0 8px; }
            small { color: #4b5563; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; width: 220px; }
            .note { border: 1px solid #d1d5db; padding: 14px; white-space: pre-wrap; }
            @media print { body { margin: 18mm; } }
          </style>
        </head>
        <body>${document.html}</body>
      </html>`);
    documentWindow.document.close();
    documentWindow.focus();
    documentWindow.print();
  }

  function openExtraTool(tool: ExtraActionTool) {
    setActiveExtraTool(tool);
    setExtraToolsOpen(true);
  }

  function openReminderPicker() {
    setReminderPickerOpen(true);
    window.setTimeout(() => {
      const picker = reminderDateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
      picker?.focus();
      picker?.showPicker?.();
    }, 0);
  }

  async function createAppointmentReminder(date: string) {
    if (!date) return;
    setActionError("");
    setReminderStatus("Saving reminder...");
    setIsWorking(true);
    const reminderText = [
      "Claim appointment reminder",
      model?.nextAction.label ?? model?.nextAction.reason ?? "Follow up on claim",
      model?.claim.claimNumber ? `Claim # ${model.claim.claimNumber}` : "",
      model?.claim.customerName ? `Customer: ${model.claim.customerName}` : "",
      appointmentVehicle ? `Vehicle: ${appointmentVehicle}` : ""
    ].filter(Boolean).join(" - ");

    try {
      const response = await fetch(`/api/coo-workbook/staff/quick-updates?date=${encodeURIComponent(minimumReminderDate)}`, {
        body: JSON.stringify({
          category: "APPOINTMENT",
          company: model?.claim.carrierName ?? "Claims workspace",
          dueWindow: date,
          followUpNeeded: true,
          person: model?.claim.customerName ?? "",
          phoneNumber: model?.claim.customerPhone ?? "",
          text: reminderText
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The reminder could not be saved.");
      setActionMessage(`Reminder saved for ${date}.`);
      setReminderStatus(`Reminder saved for ${date}. Opening the Appointment Console reminders now...`);
      window.setTimeout(() => {
        router.push(`/appointments?section=follow-up&localDate=${encodeURIComponent(date)}`);
      }, 350);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The reminder could not be saved.";
      setActionError(message);
      setReminderStatus(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Insurance Claim Assistant</span>
        <div className={styles.topActions}>
          <Link href="/crm-next/customers">Customer 360</Link>
          <Link href="/vehicles/360/demo">Vehicle 360</Link>
          <button disabled={!claimId || isWorking} onClick={saveClaim} type="button">{isWorking ? "Saving..." : "Save claim"}</button>
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          <h1>Claims Workspace</h1>
          <p>A simple execution desk for moving insurance claims from first contact to repair, payment, or follow-up handoff.</p>
        </div>
        <aside className={styles.currentClaim}>
          <span className={styles.cardEyebrow}>Current claim</span>
          <div className={styles.statusLine}>
            <strong>Waiting on adjuster</strong>
            <StatusBadge tone="warning">{primaryBlocker ?? "2 days open"}</StatusBadge>
          </div>
          <p>{communicationPending ? "Verify signed claim communication permission. Repair authorization and the optional direction to pay remain separate." : model?.nextAction.reason ?? "Next action is assigned to service advisor. Repair handoff is blocked until authorization and damage photos are complete."}</p>
        </aside>
      </header>

      {loadError ? (
        <section className={`${styles.panel} ${styles.safeModeNotice}`}>
          <div>
            <span className={styles.cardEyebrow}>Safe mode</span>
            <strong>Claim details are temporarily limited</strong>
            <p>{loadError}</p>
          </div>
          <StatusBadge tone="warning">Retry from Claim Desk</StatusBadge>
        </section>
      ) : null}

      {claimId ? <ClaimRepairWorkflow claimId={claimId} onAuthorize={() => setAuthorizationOpen(true)} intakeReady={model?.handoff.allowed} intakeTask={taskRows.find((task) => task.id !== "task-repair-handoff")} onIntake={() => {
        const task = taskRows.find((item) => item.id !== "task-repair-handoff");
        if (!task) return;
        const category = claimPhotoCategory(task);
        if (category) setPhotoCategory(category);
        else openExtraTool(toolForTask(task));
      }} onTools={() => setExtraToolsOpen(true)} taskHref={model?.associatedRepairTask ? repairWorkflowTaskHref : undefined} taskTitle={model?.associatedRepairTask?.title} /> : null}
      {model ? <ClaimCustomerAuthorization model={model} open={authorizationOpen} onOpen={() => setAuthorizationOpen(true)} onClose={() => setAuthorizationOpen(false)} /> : null}

      <div className={styles.workspace}>
        <div className={styles.mainStack}>
          {!claimId ? <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Execute Next Tasks</h2>
                <p>The workspace stays simple: do the next task, record the result, and let the claim unfold only when needed.</p>
              </div>
              <StatusBadge tone={model?.handoff.allowed ? "good" : "warning"}>{model?.handoff.allowed ? "Ready for handoff" : "Execution active"}</StatusBadge>
            </div>
            <div className={styles.taskList}>
              {taskRows.map((task) => (
                <article className={styles.taskItem} key={task.title}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.detail}</span>
                    <small>{task.ownerRole} - {task.dueLabel}</small>
                  </div>
                  {task.id === "task-repair-handoff" ? (
                    <Link href={repairWorkflowTaskHref}>{repairWorkflowTaskActionLabel}</Link>
                  ) : (
                    <button disabled={!claimId || isWorking} onClick={() => {
                      const category = claimPhotoCategory(task);
                      if (category) setPhotoCategory(category);
                      else openExtraTool(toolForTask(task));
                    }} type="button">{task.actionLabel}</button>
                  )}
                </article>
              ))}
            </div>
            <div className={styles.actionForms}>
              <button className={styles.extraToolsButton} onClick={() => setExtraToolsOpen(true)} type="button">Extra Action Tools</button>
            </div>
          </section> : null}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Claim Snapshot</h2>
                <p>Enough context to work the claim without making staff complete every advanced field up front.</p>
              </div>
              <div className={styles.snapshotActions}>
                <StatusBadge>Claim # {model?.claim.claimNumber ?? "MN-48291"}</StatusBadge>
                {model ? <button onClick={() => setSnapshotEditing((value) => !value)} type="button">{snapshotEditing ? "Close edit" : "Edit snapshot"}</button> : null}
              </div>
            </div>
            {snapshotEditing && model ? (
              <form action={saveSnapshot} className={styles.snapshotEditForm}>
                <fieldset>
                  <legend>Customer</legend>
                  <label className={manualFieldClassName(model.claim.customerName, { required: true })}><span>Customer name</span><input name="customerName" defaultValue={model.claim.customerName} /></label>
                  <label className={manualFieldClassName(model.claim.customerPhone)}><span>Phone</span><input name="customerPhone" defaultValue={model.claim.customerPhone ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.customerEmail)}><span>Email</span><input name="customerEmail" defaultValue={model.claim.customerEmail ?? ""} type="email" /></label>
                  <label className={manualFieldClassName(model.claim.customerAddressLine1, { wide: true })}><span>Address line 1</span><input name="customerAddressLine1" defaultValue={model.claim.customerAddressLine1 ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.customerAddressLine2)}><span>Address line 2</span><input name="customerAddressLine2" defaultValue={model.claim.customerAddressLine2 ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.customerCity)}><span>City</span><input name="customerCity" defaultValue={model.claim.customerCity ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.customerState)}><span>State</span><input name="customerState" defaultValue={model.claim.customerState ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.customerPostalCode)}><span>ZIP</span><input name="customerPostalCode" defaultValue={model.claim.customerPostalCode ?? ""} /></label>
                </fieldset>
                <fieldset>
                  <legend>Vehicle</legend>
                  <label className={manualFieldClassName(model.claim.vehicleVin, { required: true })}><span>VIN</span><input name="vehicleVin" defaultValue={model.claim.vehicleVin ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleYear)}><span>Year</span><input name="vehicleYear" defaultValue={model.claim.vehicleYear ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleMake)}><span>Make</span><input name="vehicleMake" defaultValue={model.claim.vehicleMake ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleModel)}><span>Model</span><input name="vehicleModel" defaultValue={model.claim.vehicleModel ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleColor)}><span>Color</span><input name="vehicleColor" defaultValue={model.claim.vehicleColor ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleMileage)}><span>Mileage</span><input name="vehicleMileage" defaultValue={model.claim.vehicleMileage ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehiclePlate)}><span>Plate</span><input name="vehiclePlate" defaultValue={model.claim.vehiclePlate ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.vehicleStockNumber)}><span>Stock #</span><input name="vehicleStockNumber" defaultValue={model.claim.vehicleStockNumber ?? ""} /></label>
                </fieldset>
                <fieldset>
                  <legend>Claim details</legend>
                  <label className={manualFieldClassName(model.claim.carrierName, { required: true })}><span>Carrier</span><input name="carrierName" defaultValue={model.claim.carrierName ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.claimNumber, { required: true })}><span>Claim #</span><input name="claimNumber" defaultValue={model.claim.claimNumber ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.adjusterName, { required: true })}><span>Adjuster</span><input name="adjusterName" defaultValue={model.claim.adjusterName ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.policyNumber, { required: true })}><span>Policy #</span><input name="policyNumber" defaultValue={model.claim.policyNumber ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.deductible, { required: true })}><span>Deductible</span><input name="deductible" defaultValue={model.claim.deductible ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.lossDate, { required: true })}><span>Loss date</span><input name="lossDate" defaultValue={model.claim.lossDate ?? ""} type="date" /></label>
                  <label className={manualFieldClassName(model.claim.lossLocation, { wide: true })}><span>Loss location</span><input name="lossLocation" defaultValue={model.claim.lossLocation ?? ""} /></label>
                  <label className={manualFieldClassName(model.claim.description, { required: true, wide: true })}><span>Incident summary</span><textarea name="description" defaultValue={model.claim.description ?? ""} rows={4} /></label>
                </fieldset>
                <div className={styles.snapshotEditFooter}>
                  <button disabled={!claimId || isWorking} type="submit">{isWorking ? "Saving..." : "Save snapshot"}</button>
                  <button disabled={isWorking} onClick={() => setSnapshotEditing(false)} type="button">Cancel</button>
                </div>
              </form>
            ) : (
              <div className={styles.snapshotGrid}>
                {snapshotRows.map(([label, value]) => (
                  <div className={styles.fact} key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
                <div className={`${styles.fact} ${styles.wide}`}>
                  <span>Incident summary</span>
                  <strong>{model?.claim.description ?? "Front bumper and left fender damage. Customer reports vehicle was driveable after loss."}</strong>
                </div>
                <div className={`${styles.fact} ${styles.wide}`}>
                  <span>Current blocker</span>
                  <strong>{primaryBlocker ?? "Missing adjuster contact and signed repair authorization."}</strong>
                </div>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>What We Need</h2>
                <p>A focused checklist replaces a long intake form. Staff can mark items complete, blocked, or not applicable.</p>
              </div>
              <StatusBadge tone="warning">{completedNeeds ?? 5}/{model?.checklist.length ?? 9} ready</StatusBadge>
            </div>
            <div className={styles.needGrid}>
              {needRows.map((item) => (
                <article className={styles.need} key={item.label}>
                  <NeedIcon state={item.state} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Uploaded Files</h2>
                <p>Every upload port feeds this same evidence list, so files can be found, reviewed, and used by the claim desk.</p>
              </div>
              <StatusBadge>{evidenceRows.length} file{evidenceRows.length === 1 ? "" : "s"}</StatusBadge>
            </div>
            <div className={styles.photoUploadToolbar}><button disabled={!claimId || isWorking} onClick={() => setPhotoCategory("DAMAGE_PHOTO")} type="button"><Camera size={18} /> Add claim photos</button></div>
            {evidenceRows.length ? (
              <div className={styles.uploadedEvidenceList}>
                {evidenceRows.map((evidence) => (
                  <article className={styles.uploadedEvidenceItem} key={evidence.id}>
                    <div>
                      <span>{evidence.category.replaceAll("_", " ")}</span>
                      <strong>{evidence.title}</strong>
                      <small>{evidence.fileName || "No file name captured"} - {new Date(evidence.createdAt).toLocaleString()}</small>
                    </div>
                    {originalEvidenceHref(evidence) ? (
                      <div className={styles.uploadedEvidenceActions}>
                        <a href={originalEvidenceHref(evidence) ?? "#"} rel="noreferrer" target="_blank">View document</a>
                        <button onClick={() => openUploadedEvidenceDocument(evidence)} type="button">View summary</button>
                      </div>
                    ) : (
                      <div className={styles.uploadedEvidenceActions}>
                        <button onClick={() => openUploadedEvidenceDocument(evidence)} type="button">View summary</button>
                        <span>{originalEvidenceUnavailableLabel(evidence)}</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyEvidence}>No uploaded files yet. Attach authorization, photos, estimates, rental support, or payment proof from any action tool.</p>
            )}
          </section>

        </div>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Carrier Tracker</h2>
                <p>Claim, policy, adjuster, approval, and next contact stay visible.</p>
              </div>
            </div>
            <div className={styles.carrierGrid}>
              {[
                ["Carrier", carrier.carrier],
                ["Claim", carrier.claimNumber],
                ["Policy", carrier.policyNumber],
                ["Adjuster", carrier.adjuster],
                ["Status", carrier.statusLabel],
                ["Next", carrier.nextContact]
              ].map(([label, value]) => (
                <div className={styles.fact} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          {!claimId ? <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Next Action</h2>
                <p>Deterministic workflow logic keeps the desk simple.</p>
              </div>
            </div>
            <div className={styles.nextAction}>
              <span className={styles.cardEyebrow}>Recommended now</span>
              <strong>{model?.nextAction.label ?? "Contact adjuster"}</strong>
              <p>{model?.nextAction.reason ?? "Carrier is captured, but adjuster contact and approval status are missing. Repair handoff remains blocked until authorization and required photos are complete."}</p>
              <button onClick={() => openExtraTool("call")} type="button">Record carrier call</button>
              <div className={styles.ownerGrid}>
                <div className={styles.fact}>
                  <span>Owner</span>
                  <strong>{model?.nextAction.ownerRole ?? "Service advisor"}</strong>
                </div>
                <div className={styles.fact}>
                  <span>Due</span>
                  <strong>{model?.nextAction.dueLabel ?? "Today, 4:00 PM"}</strong>
                </div>
              </div>
            </div>
          </section> : null}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Money & Recovery</h2>
                <p>One money action stays visible. Open the workspace for invoice, rental, and payment detail.</p>
              </div>
              <StatusBadge tone={billingRecovery.invoicePacket.ready ? "good" : "warning"}>{billingRecovery.invoicePacket.status.replaceAll("_", " ").toLowerCase()}</StatusBadge>
            </div>
            <div className={styles.recoveryCompact}>
              <article className={styles.recoveryAction}>
                <span className={styles.cardEyebrow}>Money action</span>
                <strong>{billingRecovery.nextAction.label}</strong>
                <p>{billingRecovery.nextAction.reason}</p>
              </article>
              <div className={styles.recoveryCompactFacts}>
                <div className={styles.fact}>
                  <span>Approved repairs</span>
                  <strong>{estimateReview.approvedAmountLabel}</strong>
                  <button className={styles.approvedAmountEdit} aria-expanded={approvedAmountEditorOpen} aria-controls="approved-repairs-editor" disabled={!claimId || isWorking} onClick={() => setApprovedAmountEditorOpen((open) => !open)} type="button">
                    <Pencil size={14} aria-hidden="true" /> Edit approved repairs
                  </button>
                </div>
                <div className={styles.fact}>
                  <span>Balance</span>
                  <strong>{billingRecovery.summary.balanceLabel}</strong>
                </div>
                <div className={styles.fact}>
                  <span>Rental</span>
                  <strong>{billingRecovery.rental.status.replaceAll("_", " ").toLowerCase()}</strong>
                </div>
              </div>
              {approvedAmountEditorOpen ? (
                <form id="approved-repairs-editor" action={saveSnapshot} className={styles.executionForm}>
                  <strong>Record reviewed approval</strong>
                  <label className={styles.noteField}>
                    <span>Approved repair amount ($)</span>
                    <input autoFocus defaultValue={estimateReview.approvedAmountCents !== null ? (estimateReview.approvedAmountCents / 100).toFixed(2) : ""} inputMode="decimal" min="0" max="21474836.47" name="approvedRepairAmount" required step="0.01" type="number" />
                  </label>
                  <label className={styles.noteField}>
                    <span>Supporting document</span>
                    <select name="approvalEvidenceId" defaultValue={model?.claim.approvedAmountSourceEvidenceId ?? ""}>
                      <option value="">No document linked</option>
                      {model?.evidence.filter((item) => item.status !== "BLOCKED").map((item) => <option key={item.id} value={item.id}>{item.title}{item.fileName ? ` - ${item.fileName}` : ""}</option>)}
                    </select>
                  </label>
                  <label className={styles.noteField}>
                    <span>Approval / correction note</span>
                    <textarea name="note" required maxLength={500} placeholder="Who approved the amount, approval date, and reason for this correction" rows={3} />
                  </label>
                  <button disabled={!claimId || isWorking} type="submit">{isWorking ? "Saving..." : "Save reviewed approval"}</button>
                  <button disabled={isWorking} onClick={() => setApprovedAmountEditorOpen(false)} type="button">Cancel</button>
                  {actionError ? <p className={styles.actionError} role="alert">{actionError}</p> : null}
                </form>
              ) : null}
              <button className={styles.recoveryOpenButton} onClick={() => setMoneyDrawerOpen(true)} type="button">Open recovery workspace</button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Carrier Estimate</h2>
                <p>Uploaded estimates live in claim evidence, feed the approved repair amount, and remain reviewable before billing.</p>
              </div>
              <StatusBadge tone={estimateReview.status === "AMOUNT_FOUND" ? "good" : estimateReview.status === "REVIEW_NEEDED" ? "warning" : "info"}>
                {estimateReview.status.replaceAll("_", " ").toLowerCase()}
              </StatusBadge>
            </div>
            <article className={styles.estimateCard}>
              <span className={styles.cardEyebrow}>Approved repairs</span>
              <strong>{estimateReview.approvedAmountLabel}</strong>
              <p>{estimateReview.detail}</p>
              <div className={styles.estimateFacts}>
                <div className={styles.fact}>
                  <span>Source</span>
                  <strong>{estimateReview.sourceTitle ?? "No estimate uploaded"}</strong>
                </div>
                <div className={styles.fact}>
                  <span>File</span>
                  {estimateEvidence && originalEvidenceHref(estimateEvidence) ? (
                    <a className={styles.inlineDocumentLink} href={originalEvidenceHref(estimateEvidence) ?? "#"} rel="noreferrer" target="_blank">
                      {estimateReview.fileName ?? "Open uploaded estimate"}
                    </a>
                  ) : (
                    <strong>{estimateReview.fileName ?? "No file captured"}</strong>
                  )}
                </div>
                <div className={styles.fact}>
                  <span>Stored in</span>
                  <strong>Claim evidence / Document library</strong>
                </div>
              </div>
              <button onClick={() => setEstimateDrawerOpen(true)} type="button">Review estimate</button>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Handoff Readiness</h2>
                <p>Clear gates prevent premature handoff while allowing approved exceptions.</p>
              </div>
            </div>
            <div className={styles.gateList}>
              {readinessRows.map((gate) => (
                <article className={styles.gate} key={gate.label}>
                  <div>
                    <strong>{gate.label}</strong>
                    <StatusBadge tone={gate.tone}>{gate.status}</StatusBadge>
                  </div>
                  <span className={styles.progress}><i style={{ width: `${gate.percent}%` }} /></span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Activity Timeline</h2>
                <p>Keep progress recording and audit history close without crowding the claim workspace.</p>
              </div>
              <StatusBadge>{activityRows.length} update{activityRows.length === 1 ? "" : "s"}</StatusBadge>
            </div>
            <div className={styles.activitySummary}>
              <strong>{activityRows[0]?.action.replaceAll("_", " ") ?? "No activity yet"}</strong>
              <span>{activityRows[0]?.detail ?? "Record the first claim movement when work starts."}</span>
              <button onClick={() => setActivityDrawerOpen(true)} type="button">Add progress note / view timeline</button>
            </div>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </section>
        </aside>
      </div>

      {moneyDrawerOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Money and Recovery Workspace" aria-modal="true" className={`${styles.timelineDrawer} ${styles.recoveryDrawer}`} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Billing execution</span>
                <h2>Money & Recovery</h2>
                <p>Work the carrier invoice, deductible, rental support, payment proof, and short-pay follow-up from one focused space.</p>
              </div>
              <button aria-label="Close Money and Recovery" onClick={() => setMoneyDrawerOpen(false)} type="button">x</button>
            </header>
            <section className={styles.recoveryWorkspace} aria-label="Billing and recovery workspace">
              <div className={styles.recoveryCommand}>
                <article className={styles.recoveryAction}>
                  <span className={styles.cardEyebrow}>Recommended now</span>
                  <strong>{billingRecovery.nextAction.label}</strong>
                  <p>{billingRecovery.nextAction.reason}</p>
                  <div className={styles.ownerGrid}>
                    <div className={styles.fact}>
                      <span>Owner</span>
                      <strong>{billingRecovery.nextAction.ownerRole}</strong>
                    </div>
                    <div className={styles.fact}>
                      <span>Due</span>
                      <strong>{billingRecovery.nextAction.dueLabel}</strong>
                    </div>
                  </div>
                </article>
                <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                  <strong>Record recovery action</strong>
                  <div>
                    <select name="updateType" defaultValue="Payment follow-up">
                      <option>Payment follow-up</option>
                      <option>Carrier invoice sent</option>
                      <option>Warranty authorization</option>
                      <option>Rental extension</option>
                      <option>Short-pay review</option>
                    </select>
                    <select name="category" defaultValue="PAYMENT">
                      <option value="PAYMENT">Payment proof</option>
                      <option value="ESTIMATE">Estimate / supplement</option>
                      <option value="RENTAL">Rental support</option>
                      <option value="AUTHORIZATION">Authorization</option>
                    </select>
                    <input name="title" placeholder="Evidence title" />
                    <input multiple name="file" type="file" />
                  </div>
                  <label className={styles.noteField}>
                    <span>Recovery note</span>
                    <textarea name="note" placeholder="Example: Carrier invoice sent to adjuster with estimate, authorization, and rental support attached." rows={4} />
                  </label>
                  <button disabled={!claimId || isWorking} type="submit">{isWorking ? "Recording..." : "Record recovery action"}</button>
                </form>
              </div>
              <div className={styles.recoverySummary}>
                {[
                  ["Billed", billingRecovery.summary.billedAmountLabel],
                  ["Approved", billingRecovery.summary.approvedAmountLabel],
                  ["Deductible", billingRecovery.summary.deductibleLabel],
                  ["Paid", billingRecovery.summary.paidAmountLabel],
                  ["Balance", billingRecovery.summary.balanceLabel]
                ].map(([label, value]) => (
                  <div className={styles.fact} key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.recoveryGrid}>
                <article>
                  <span className={styles.cardEyebrow}>{billingRecovery.invoicePacket.title}</span>
                  <strong>{billingRecovery.invoicePacket.ready ? "Ready to send" : "Missing packet items"}</strong>
                  <p>{billingRecovery.invoicePacket.ready ? "Packet is ready for billing follow-up." : billingRecovery.invoicePacket.missing.join(", ")}</p>
                </article>
                <article>
                  <span className={styles.cardEyebrow}>Rental tracker</span>
                  <strong>{billingRecovery.rental.status.replaceAll("_", " ").toLowerCase()}</strong>
                  <p>{billingRecovery.rental.summary}</p>
                </article>
                <article>
                  <span className={styles.cardEyebrow}>Short-pay watch</span>
                  <strong>{billingRecovery.shortPayWatch.active ? "Review needed" : "Clear"}</strong>
                  <p>{billingRecovery.shortPayWatch.reason}</p>
                </article>
              </div>
              <div className={styles.payerSplit}>
                {billingRecovery.payerSplit.map((payer) => (
                  <div key={`${payer.payer}-${payer.title}`}>
                    <span>{payer.payer.replaceAll("_", " ")}</span>
                    <strong>{payer.title}</strong>
                    <small>{payer.amountLabel} - {payer.status.toLowerCase()}</small>
                  </div>
                ))}
              </div>
            </section>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}

      {estimateDrawerOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Carrier Estimate Review" aria-modal="true" className={`${styles.timelineDrawer} ${styles.estimateDrawer}`} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Estimate intelligence</span>
                <h2>Carrier Estimate Review</h2>
                <p>Verify the uploaded estimate, approved repair amount, and where this amount flows before relying on it for billing.</p>
              </div>
              <button aria-label="Close Carrier Estimate Review" onClick={() => setEstimateDrawerOpen(false)} type="button">x</button>
            </header>
            <section className={styles.estimateReviewGrid}>
              <article className={styles.estimateHeroCard}>
                <span className={styles.cardEyebrow}>Approved repair amount</span>
                <strong>{estimateReview.approvedAmountLabel}</strong>
                <p>{estimateReview.detail}</p>
                <StatusBadge tone={estimateReview.confidence === "HIGH" ? "good" : estimateReview.confidence === "MEDIUM" ? "info" : "warning"}>
                  {estimateReview.confidence.replaceAll("_", " ").toLowerCase()}
                </StatusBadge>
              </article>
              <article className={styles.estimateSourceCard}>
                <strong>Where it goes</strong>
                <p>The uploaded estimate is recorded as ESTIMATE evidence, appears in the claim activity timeline, updates Money & Recovery approved amount, and supports the invoice packet.</p>
                <div className={styles.estimateFacts}>
                  <div className={styles.fact}>
                    <span>Evidence title</span>
                    <strong>{estimateReview.sourceTitle ?? "Pending upload"}</strong>
                  </div>
                  <div className={styles.fact}>
                    <span>File</span>
                    {estimateEvidence && originalEvidenceHref(estimateEvidence) ? (
                      <a className={styles.inlineDocumentLink} href={originalEvidenceHref(estimateEvidence) ?? "#"} rel="noreferrer" target="_blank">
                        {estimateReview.fileName ?? "Open uploaded estimate"}
                      </a>
                    ) : (
                      <strong>{estimateReview.fileName ?? "No file captured"}</strong>
                    )}
                  </div>
                  <div className={styles.fact}>
                    <span>Received</span>
                    <strong>{estimateReview.receivedAt ? new Date(estimateReview.receivedAt).toLocaleString() : "Not received"}</strong>
                  </div>
                  <div className={styles.fact}>
                    <span>Library link</span>
                    <strong>{estimateReview.documentLibraryId ?? "Pending document object"}</strong>
                  </div>
                </div>
              </article>
            </section>
            <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
              <strong>Attach carrier estimate or supplement</strong>
              <input name="category" type="hidden" value="ESTIMATE" />
              <div>
                <input name="title" placeholder="Evidence title, e.g. Progressive estimate approved $4,812.44" />
                <input name="nextAction" placeholder="Next action after estimate review" />
                <input multiple name="file" type="file" />
              </div>
              <label className={styles.noteField}>
                <span>Estimate note</span>
                <textarea name="note" placeholder="Paste or summarize the estimate total, approved repair amount, supplement amount, deductible, and any carrier conditions." rows={5} />
              </label>
              <button disabled={!claimId || isWorking} type="submit">{isWorking ? "Recording..." : "Attach / read estimate"}</button>
            </form>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}

      {activityDrawerOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Activity Timeline" aria-modal="true" className={styles.timelineDrawer} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Claim audit trail</span>
                <h2>Activity Timeline</h2>
                <p>Record progress here. Every claim movement should leave a lightweight audit trail.</p>
              </div>
              <button aria-label="Close Activity Timeline" onClick={() => setActivityDrawerOpen(false)} type="button">x</button>
            </header>
            <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
              <strong>Add progress note</strong>
              <div>
                <select name="updateType" defaultValue="Teardown / reinspection">
                  <option>Teardown / reinspection</option>
                  <option>Inspector visit</option>
                  <option>Carrier call</option>
                  <option>Customer authorization</option>
                  <option>Photos taken</option>
                  <option>Estimate / supplement</option>
                  <option>Payment follow-up</option>
                  <option>General note</option>
                </select>
                <select name="category" defaultValue="ACTIVITY_ONLY">
                  <option value="ACTIVITY_ONLY">Activity only</option>
                  <option value="DAMAGE_PHOTO">Attach damage photos</option>
                  <option value="AUTHORIZATION">Attach authorization</option>
                  <option value="ESTIMATE">Attach estimate / supplement</option>
                  <option value="RENTAL">Attach rental support</option>
                  <option value="REPAIR_HANDOFF">Attach handoff evidence</option>
                  <option value="PAYMENT">Attach payment proof</option>
                </select>
                <input name="title" placeholder="Optional evidence title" />
                <input name="nextAction" placeholder="Next action, e.g. Reinspection by Spencer" />
                <input multiple name="file" type="file" />
              </div>
              <label className={styles.noteField}>
                <span>Progress note</span>
                <textarea name="note" placeholder="Example: Vehicle torn down today and ready for reinspection by Spencer. Estimate remains pending reinspect after teardown." rows={4} />
              </label>
              <button disabled={!claimId || isWorking} type="submit">Record progress</button>
            </form>
            <section className={styles.timelineReport} aria-label="Progress reports">
              <header>
                <div>
                  <span className={styles.cardEyebrow}>Progress reports</span>
                  <h3>Activity updates</h3>
                </div>
                <span>{activityRows.length} total</span>
              </header>
            <div className={styles.timeline}>
              {activityRows.map((activity) => (
                <article className={evidenceByActivityId.get(activity.id) ? styles.evidenceActivity : undefined} key={activity.id}>
                  <header>
                    <strong>{activity.action.replaceAll("_", " ")}</strong>
                    <time dateTime={activity.at}>{new Date(activity.at).toLocaleString()}</time>
                  </header>
                  {evidenceByActivityId.get(activity.id) ? (
                    <>
                      <p><strong>{evidenceByActivityId.get(activity.id)?.title}</strong></p>
                      <span>{evidenceByActivityId.get(activity.id)?.category.replaceAll("_", " ")} evidence attached{evidenceByActivityId.get(activity.id)?.fileName ? ` - ${evidenceByActivityId.get(activity.id)?.fileName}` : ""}</span>
                      <div className={styles.timelineActions}>
                        {originalEvidenceHref(evidenceByActivityId.get(activity.id)!) ? (
                          <a href={originalEvidenceHref(evidenceByActivityId.get(activity.id)!) ?? "#"} rel="noreferrer" target="_blank">View document</a>
                        ) : null}
                        <button onClick={() => openEvidenceDocument(activity)} type="button">View summary</button>
                        <button onClick={() => printEvidenceDocument(activity)} type="button">Print</button>
                      </div>
                    </>
                  ) : <p>{activity.detail}</p>}
                  <small>Recorded by {activityActorName(activity)}</small>
                </article>
              ))}
            </div>
            </section>
            {printDocument ? (
              <section className={styles.printPreview} aria-label="Evidence document preview">
                <header>
                  <div>
                    <span className={styles.cardEyebrow}>Document preview</span>
                    <h3>{printDocument.title}</h3>
                  </div>
                  <button onClick={() => setPrintDocument(null)} type="button">Close preview</button>
                </header>
                <div className={styles.printDocument} dangerouslySetInnerHTML={{ __html: printDocument.html }} />
                <button onClick={() => window.print()} type="button">Print this document</button>
              </section>
            ) : null}
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}

      {photoCategory && claimId ? <ClaimPhotoUploader claimId={claimId} category={photoCategory} customer={model?.claim.customerName ?? "Claim"} onClose={() => setPhotoCategory(null)} onSaved={() => window.location.reload()} /> : null}

      {extraToolsOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Extra Action Tools" aria-modal="true" className={`${styles.timelineDrawer} ${styles.extraToolsDrawer}`} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Execution support</span>
                <h2>Extra Action Tools</h2>
                <p>Pick the tool that matches the task, complete the action, then record the result back to the claim.</p>
              </div>
              <button aria-label="Close Extra Action Tools" onClick={() => setExtraToolsOpen(false)} type="button">x</button>
            </header>
            <section className={styles.toolWorkbench} aria-label="Extra action tools workbench">
              <nav className={styles.toolGridPanel} aria-label="Communication and execution tools">
                {extraActionTools.map((tool) => (
                  <button aria-pressed={activeExtraTool === tool.id} key={tool.id} onClick={() => setActiveExtraTool(tool.id)} type="button">
                    <strong>{tool.label}</strong>
                    <span>{tool.detail}</span>
                  </button>
                ))}
              </nav>
              <div className={styles.toolWorkArea}>
                {activeExtraTool === "text" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Text update</strong>
                    <input name="updateType" type="hidden" value="Text update" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="nextAction" placeholder="Next action after text, if any" />
                    <label className={styles.noteField}>
                      <span>Message / outcome</span>
                      <textarea name="note" placeholder="Example: Texted customer for authorization signature. Waiting on reply before repair handoff." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record text update</button>
                  </form>
                ) : null}
                {activeExtraTool === "call" ? (
                  <form action={recordCarrierCall} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Call / carrier follow-up</strong>
                    <div>
                      <input name="carrierName" placeholder="Carrier" defaultValue={model?.claim.carrierName ?? ""} />
                      <input name="claimNumber" placeholder="Claim #" defaultValue={model?.claim.claimNumber ?? ""} />
                      <input name="policyNumber" placeholder="Policy #" defaultValue={model?.claim.policyNumber ?? ""} />
                      <input name="adjusterName" placeholder="Adjuster name" defaultValue={model?.claim.adjusterName ?? ""} />
                      <input name="adjusterPhone" placeholder="Adjuster phone" defaultValue={model?.claim.adjusterPhone ?? ""} />
                      <input name="adjusterEmail" placeholder="Adjuster email" defaultValue={model?.claim.adjusterEmail ?? ""} />
                    </div>
                    <label className={styles.noteField}>
                      <span>Call result</span>
                      <textarea name="note" placeholder="Short call note, carrier promise, estimate status, or next follow-up." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record call result</button>
                  </form>
                ) : null}
                {activeExtraTool === "email" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Email follow-up</strong>
                    <input name="updateType" type="hidden" value="Email follow-up" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="title" placeholder="Email subject or reference" />
                    <input name="nextAction" placeholder="Next action after email, if any" />
                    <label className={styles.noteField}>
                      <span>Email summary</span>
                      <textarea name="note" placeholder="Example: Emailed Progressive for supplement approval and requested adjuster ETA." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record email follow-up</button>
                  </form>
                ) : null}
                {activeExtraTool === "appointment" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <div className={styles.appointmentToolHeader}>
                      <Link href={newAppointmentHref}>Appointment / inspection scheduling</Link>
                      <span>Create appointments in the Appointment Console, or pick a reminder date here and open the saved reminder in the Appointment Console.</span>
                    </div>
                    <div className={styles.appointmentToolActions}>
                      <Link href={newAppointmentHref}>Create appointment</Link>
                      <button onClick={openReminderPicker} type="button">Pick reminder date</button>
                    </div>
                    {reminderPickerOpen ? (
                      <div className={styles.reminderPicker}>
                        <label>
                          <span>Reminder date</span>
                          <input
                            ref={reminderDateInputRef}
                            min={minimumReminderDate}
                            onChange={(event) => {
                              const selectedDate = event.target.value;
                              setReminderDate(selectedDate);
                              void createAppointmentReminder(selectedDate);
                            }}
                            type="date"
                            value={reminderDate}
                          />
                        </label>
                        <p aria-live="polite">{reminderStatus || "Pick a date to create the reminder."}</p>
                      </div>
                    ) : null}
                    <input name="updateType" type="hidden" value="Appointment scheduled" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="title" placeholder="Appointment type, e.g. Reinspection" />
                    <input name="nextAction" placeholder="Next action after appointment" />
                    <label className={styles.noteField}>
                      <span>Appointment details</span>
                      <textarea name="note" placeholder="Example: Scheduled Spencer for Friday reinspect. Staff should call if he has not arrived by noon." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record appointment plan</button>
                  </form>
                ) : null}
                {activeExtraTool === "file" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>File upload / evidence</strong>
                    <div>
                      <select name="category" defaultValue="AUTHORIZATION">
                        <option value="AUTHORIZATION">Authorization</option>
                        <option value="DAMAGE_PHOTO">Damage photos</option>
                        <option value="VIN_PHOTO">VIN photo</option>
                        <option value="ODOMETER_PHOTO">Odometer photo</option>
                        <option value="ESTIMATE">Estimate / supplement</option>
                        <option value="RENTAL">Rental support</option>
                        <option value="REPAIR_HANDOFF">Repair handoff evidence</option>
                        <option value="PAYMENT">Payment proof</option>
                      </select>
                      <input name="title" placeholder="Evidence title" />
                      <input name="nextAction" placeholder="Next action after upload" />
                      <input multiple name="file" type="file" />
                    </div>
                    <label className={styles.noteField}>
                      <span>Evidence note</span>
                      <textarea name="note" placeholder="Explain what was uploaded and how it moves the claim forward. For estimates, include the approved repair amount or paste the estimate total so the workspace can read it." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Attach / record file</button>
                  </form>
                ) : null}
                {activeExtraTool === "repair" ? (
                  <form action={requestHandoff} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Repair workflow</strong>
                    <div className={styles.repairTaskLinkCard}>
                      <span>{model?.associatedRepairTask ? "Associated task found" : "After approval"}</span>
                      <p>{repairWorkflowTaskDetail}</p>
                      <Link href={repairWorkflowTaskHref}>{repairWorkflowTaskActionLabel}</Link>
                    </div>
                    <label className={styles.noteField}>
                      <span>Handoff or exception reason</span>
                      <textarea name="exceptionReason" placeholder="Optional manager exception reason if repair handoff is blocked" rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">{model?.handoff.allowed ? "Open repair handoff" : "Request exception handoff"}</button>
                  </form>
                ) : null}
                <p className={styles.toolHint}>This workbench records the action against the claim so the Activity Timeline stays clear and complete.</p>
              </div>
            </section>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
