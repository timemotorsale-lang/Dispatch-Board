"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  Camera,
  CarFront,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  Grid3X3,
  KeyRound,
  ListChecks,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Plus,
  Printer,
  ScanLine,
  ShieldAlert,
  XCircle,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { OutsideRepairWorkPanel, type OutsideWork } from "@/features/advisor/outside-repair-work-panel";
import { RepairOrderDiagnosticsBridge } from "@/features/diagnostics/repair-order-diagnostics-bridge";
import type { getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import type { TaskReadModel } from "@/server/services/task-read";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

import { BackToVehicleOperationsWorkspace } from "./workspace-return-link";

type RepairOrderWorkbenchOrder = {
  id: string;
  repairOrderNumber: string;
  stage: string;
  stageStartedAt?: string | null;
  operatingState: string;
  openedAt: string;
  targetAt: string;
  nextAction: string;
  stateReason: string | null;
  version: number;
  vehicle: {
    custodyEvents?: Array<{
      custodian: string;
      event: string;
      id: string;
      location: { name: string } | null;
      occurredAt: string | Date;
      positionLabel: string | null;
    }>;
    id: string;
    color?: string | null;
    make: string | null;
    model: string | null;
    vehicleNumber: string;
    version?: number | null;
    vin: string | null;
    year: number | null;
  };
  customer: { displayName: string } | null;
  inventoryUnit: { id?: string; inventoryNumber: string } | null;
  shopReconLifecycle?: {
    id?: string;
    nextAction: string;
    operatingState: string;
    stage: string;
    targetAt: string | Date | null;
    version: number;
    zoneCode: string | null;
  } | null;
  ownerUser: { id: string; name: string };
  location: { id: string; name: string };
  serviceVisit: {
    appointmentId: string | null;
    arrivedAt: string;
    concernSummary: string;
    consentStatus: string;
    createdByUser?: { id: string; name: string } | null;
    intakeNotes: string | null;
    keyTag: string | null;
    keysReceivedCount: number;
    promisedAt: string | null;
    readinessSnapshotId: string | null;
    transportMode: string;
  };
  inspectionVersions: Array<{ id: string; items: unknown; summary: string; version: number }>;
  diagnosisVersions: Array<{
    cause: string;
    concern: string;
    diagnosedAt: string;
    id: string;
    proposedCorrection: string;
    recommendation: string;
    technicianUser: { id: string; name: string };
    uncertainty: string;
    version: number;
  }>;
  estimateVersions: Array<{
    authorizations: Array<{ disposition: string; id: string }>;
    id: string;
    status: string;
    totalCents: number;
    version: number;
  }>;
  repairJobs: Array<{
    description: string;
    id: string;
    jobNumber: string;
    readinessReasonCodes: string[];
    status: string;
  }>;
  partDemands: Array<{ id: string; quantityRequired: number; quantityReserved: number }>;
  vendorWorks?: Array<{
    approvalStatus: string;
    approvedAmountCents: number | null;
    currentLocation: string;
    directFromSource: boolean;
    estimateAmountCents: number | null;
    events: Array<{ actorUser: { name: string }; occurredAt: string | Date; summary: string; toStatus: string }>;
    expectedReturnAt: string | Date | null;
    id: string;
    keysCustodian: string;
    lastUpdateSummary: string;
    nextAction: string;
    nextFollowUpAt: string | Date | null;
    scope: string;
    sentAt: string | Date;
    sentFrom: string;
    status: string;
    supplementalAmountCents: number | null;
    transportMethod: string | null;
    vendorId: string | null;
    vendorName: string;
    workType: string;
  }>;
  advisorUpdates?: Array<{
    authorUser: { id: string; name: string };
    contactOutcome: string;
    customerVisibleSummary: string;
    id: string;
    internalNotes: string | null;
    occurredAt: string | Date;
    statusCode: string;
    version: number;
  }>;
  stateEvents?: Array<{
    actorUser: { id: string; name: string };
    id: string;
    nextAction: string;
    occurredAt: string | Date;
    reason: string;
    toOperatingState: string;
    toStage: string;
    version: number;
  }>;
};

type Options = { users: Array<{ id: string; name: string }> };
type RelatedPurchaseOrder = {
  id: string;
  createdAt?: string;
  orderedTotalCents?: number;
  purchaseOrderNumber: string;
  requisition?: { demand?: { repairOrder?: { id: string; repairOrderNumber: string } | null } | null } | null;
  status?: string;
  vendor?: { name?: string } | null;
};

type ReconRepairPath = "MECHANICAL" | "BODYWORK" | "OUTSIDE_VENDOR" | "DETAIL_PREP" | "INSPECTION_ONLY";
type RoSummaryDrawer = "progress" | "subtasks" | "checklist" | "comments" | "fullTools" | "repairDetails";

const reconRepairPathOptions: Array<{
  detail: string;
  label: string;
  value: ReconRepairPath;
}> = [
  { detail: "Diagnosis, estimate, parts, repair, QC", label: "Mechanical repair", value: "MECHANICAL" },
  { detail: "Visible damage, body labor, paint, vendor if needed", label: "Bodywork", value: "BODYWORK" },
  { detail: "Send out, track estimate, approval, ETA, return", label: "Outside vendor", value: "OUTSIDE_VENDOR" },
  { detail: "Detail, cleanup, recon package, frontline prep", label: "Detail / prep", value: "DETAIL_PREP" },
  { detail: "Verify condition, document, then close or QC", label: "Inspection only", value: "INSPECTION_ONLY" },
];

type DiagnosticsBridge =
  | Awaited<ReturnType<typeof getRepairOrderDiagnosticsBridge>>
  | { state: "UNAVAILABLE"; reason: string; repairOrderId: string };

type PlanItem = { evidence: string; label: string; objective: string };
type EvidenceSuggestion = { category: string; finding: string; requirement: string; severity: "Critical" | "Repair required" | "Needs review" };

function diagnosticPlan(concern: string): PlanItem[] {
  if (/brake|grind|squeal|rotor|caliper/i.test(concern))
    return [
      { label: "Reproduce symptom safely", objective: "Confirm the reported condition under a controlled test", evidence: "Road-test notes" },
      { label: "Complete visual brake inspection", objective: "Inspect pads, rotors, hardware, hoses, and wear indicators", evidence: "Inspection notes and photos" },
      { label: "Measure friction material", objective: "Measure inner and outer pad or shoe thickness", evidence: "Measurements and photos" },
      { label: "Measure rotor or drum condition", objective: "Record thickness, variation, runout, or wear as applicable", evidence: "Measured values" },
      { label: "Inspect hydraulic and caliper operation", objective: "Check binding, slide pins, leaks, and actuation", evidence: "Inspection findings" },
      { label: "Capture diagnostic evidence", objective: "Attach the observations supporting the conclusion", evidence: "Photos and measurements" },
      { label: "Document cause and proposed correction", objective: "Separate confirmed cause from recommended repair", evidence: "Diagnosis version" },
    ];
  if (/engine|warning light|check engine|power|stall|misfire/i.test(concern))
    return [
      { label: "Verify the warning indicator", objective: "Confirm current and historical warning state", evidence: "Indicator photo" },
      { label: "Scan all applicable modules", objective: "Record codes, status, and freeze-frame data", evidence: "Scan report" },
      { label: "Reproduce the reported condition", objective: "Use the customer's stated operating conditions", evidence: "Test notes" },
      { label: "Inspect related systems", objective: "Complete visual, electrical, fluid, and connection checks", evidence: "Inspection findings" },
      { label: "Perform pinpoint tests", objective: "Test only the systems supported by current evidence", evidence: "Measurements and results" },
      { label: "Document cause and correction", objective: "Record uncertainty, recommendation, and proposed correction", evidence: "Diagnosis version" },
    ];
  return [
    { label: "Confirm the reported symptom", objective: "Preserve the customer's operating conditions and expected outcome", evidence: "Verification notes" },
    { label: "Perform safety and operability triage", objective: "Identify conditions requiring restricted operation or escalation", evidence: "Triage result" },
    { label: "Inspect the affected system", objective: "Complete the applicable visual and functional inspection", evidence: "Inspection evidence" },
    { label: "Perform evidence-led tests", objective: "Record measurements and test results before identifying cause", evidence: "Test results" },
    { label: "Document confirmed cause", objective: "Separate facts, uncertainty, and recommendation", evidence: "Diagnosis version" },
    { label: "Define proposed correction and verification", objective: "Prepare authorized scope and final validation criteria", evidence: "Correction plan" },
  ];
}

function suggestedInspectionFindings(concern: string): EvidenceSuggestion[] {
  const suggestions: EvidenceSuggestion[] = [];
  if (/code|codes|dash|warning light|check engine|abs|airbag|tpms|light/i.test(concern)) {
    suggestions.push({
      category: "Diagnostic codes",
      finding: "Dash or module code evidence recorded",
      requirement: "Attach scan result, active/history status, and warning-light photo.",
      severity: /airbag|abs|brake/i.test(concern) ? "Critical" : "Repair required",
    });
  }
  if (/brake|rotor|vibrat|grind|squeal|caliper/i.test(concern)) {
    suggestions.push({
      category: "Mechanical finding",
      finding: "Brake vibration or braking concern",
      requirement: "Record road-test result, pad/rotor measurements, and repair recommendation.",
      severity: "Critical",
    });
  }
  if (/body|bumper|crack|broken|damage|dent|paint|panel|cover/i.test(concern)) {
    suggestions.push({
      category: "Body damage",
      finding: "Visible exterior damage",
      requirement: "Capture panel location, repair vs replacement decision, and before photos.",
      severity: "Repair required",
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      category: "Inspection finding",
      finding: "Concern requires technician verification",
      requirement: "Capture condition, evidence, severity, and next repair recommendation.",
      severity: "Needs review",
    });
  }
  return suggestions;
}

const format = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length
    ? value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())
    : "Not recorded";
const date = (value: string | Date | null | undefined) => {
  if (!value) return "Not recorded";
  const stamp = value instanceof Date ? value : new Date(value);
  return Number.isNaN(stamp.getTime()) ? "Not recorded" : stamp.toLocaleString();
};
const money = (value: number | null | undefined) => (value == null ? "Not recorded" : `$${(value / 100).toFixed(2)}`);
const duration = (value: string | Date | null | undefined) => {
  if (!value) return "Not started";
  const started = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(started.getTime())) return "Not started";
  const minutes = Math.max(0, Math.round((Date.now() - started.getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

function returnToAfterRepairOrderClose(returnTo: string, repairOrderId: string) {
  const url = new URL(returnTo, window.location.origin);
  url.searchParams.set("closedRepairOrderId", repairOrderId);
  url.searchParams.set("repairOrderClosed", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
const lifecycleLabels = ["Intake", "Diagnose", "Estimate", "Approval", "Repair", "Quality Check", "Handoff"] as const;
const stageToLifecycleIndex: Record<string, number> = {
  INTAKE: 0,
  DIAGNOSIS: 1,
  ESTIMATE: 2,
  AUTHORIZATION: 3,
  APPROVAL: 3,
  PARTS_ORDERING: 4,
  READY_FOR_REPAIR: 4,
  REPAIR: 4,
  REPAIRS: 4,
  QUALITY_CHECK: 5,
  QUALITY_CONTROL: 5,
  ADVISOR_REVIEW: 5,
  HANDOFF: 6,
  DELIVERY_OR_INVENTORY_HANDOFF: 6,
  COMPLETE: 6,
  COMPLETED: 6,
};

function activeVendorWorkFor(order: RepairOrderWorkbenchOrder) {
  const works = order.vendorWorks ?? [];
  // A returned first vendor must not hide a later vendor that currently has the vehicle.
  return works.find((work) => ["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURN_TRANSPORT"].includes(work.status))
    ?? works.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status))
    ?? null;
}

function vendorQcNeedsInternalCompletion(work: ReturnType<typeof activeVendorWorkFor>) {
  if (!work || work.status !== "QC_REQUIRED") return false;
  return /\b(fail|failed|incomplete|not complete|not completed|not fixed|did not complete|follow-up|completion|decision|required)\b/i.test(`${work.lastUpdateSummary} ${work.nextAction}`);
}

function vendorNeedsFollowUpVendor(work: ReturnType<typeof activeVendorWorkFor>) {
  if (!work || !["RETURNED", "QC_REQUIRED"].includes(work.status)) return false;
  return /\b(could not repair|unable to repair|diagnosed only|unfinished|not complete|not completed|did not complete|another vendor|follow-up vendor|selected follow-up vendor|next repair path)\b/i.test(
    `${work.scope} ${work.lastUpdateSummary} ${work.nextAction}`,
  );
}

function vendorWorkForEditor(work: NonNullable<ReturnType<typeof activeVendorWorkFor>>): OutsideWork {
  const copy = JSON.parse(JSON.stringify(work)) as Partial<OutsideWork>;
  return {
    approvalStatus: copy.approvalStatus ?? "NEEDS_DOCUMENTATION",
    approvedAmountCents: copy.approvedAmountCents ?? null,
    currentLocation: copy.currentLocation ?? copy.vendorName ?? "Outside vendor",
    directFromSource: copy.directFromSource ?? false,
    estimateAmountCents: copy.estimateAmountCents ?? null,
    events: copy.events ?? [],
    expectedReturnAt: copy.expectedReturnAt ?? null,
    id: copy.id ?? "",
    keysCustodian: copy.keysCustodian ?? "Vendor",
    lastUpdateSummary: copy.lastUpdateSummary ?? "Outside vendor work is active.",
    nextAction: copy.nextAction ?? "Record the latest outside-vendor update.",
    nextFollowUpAt: copy.nextFollowUpAt ?? null,
    scope: copy.scope ?? "Outside vendor repair work.",
    sentAt: copy.sentAt ?? new Date().toISOString(),
    sentFrom: copy.sentFrom ?? "Dealership",
    status: copy.status ?? "AT_VENDOR",
    supplementalAmountCents: copy.supplementalAmountCents ?? null,
    transportMethod: copy.transportMethod ?? null,
    vendorId: copy.vendorId ?? null,
    vendorName: copy.vendorName ?? "Outside vendor",
    workType: copy.workType ?? "OTHER",
  };
}

function vendorDispatchSummary(work: NonNullable<ReturnType<typeof activeVendorWorkFor>>) {
  if (work.directFromSource) return `Vehicle sent directly from ${work.sentFrom} to ${work.vendorName}.`;
  if (work.transportMethod?.trim()) return `Vehicle ${work.transportMethod} from ${work.sentFrom} to ${work.vendorName}.`;
  return `Vehicle sent from ${work.sentFrom} to ${work.vendorName}.`;
}

function inferReconRepairPath(order: RepairOrderWorkbenchOrder): ReconRepairPath {
  const concern = `${order.serviceVisit?.concernSummary ?? ""} ${order.serviceVisit?.intakeNotes ?? ""} ${order.nextAction ?? ""}`;
  if (activeVendorWorkFor(order)) return "OUTSIDE_VENDOR";
  if (order.diagnosisVersions[0]?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis.")) return "BODYWORK";
  if (/\b(vendor|sublet|body shop|glass shop|calibration|outside repair|offsite)\b/i.test(concern)) return "OUTSIDE_VENDOR";
  if (/\b(body|bumper|fender|paint|dent|collision|cosmetic|scratch|panel|door|quarter|hood|trunk)\b/i.test(concern)) return "BODYWORK";
  if (/\b(detail|cleanup|clean up|wash|odor|interior|frontline|photo|merchandising|recon package)\b/i.test(concern)) return "DETAIL_PREP";
  if (/\b(inspect only|inspection only|verify only|check only|no repair|condition report)\b/i.test(concern)) return "INSPECTION_ONLY";
  return "MECHANICAL";
}

function reconPathLabel(path: ReconRepairPath) {
  return reconRepairPathOptions.find((option) => option.value === path)?.label ?? "Mechanical repair";
}

function nextStepPlan(input: {
  activeVendorWork: ReturnType<typeof activeVendorWorkFor>;
  authorization: { disposition: string; id: string } | null;
  diagnosis: RepairOrderWorkbenchOrder["diagnosisVersions"][number] | null;
  directBodyPath: boolean;
  estimate: RepairOrderWorkbenchOrder["estimateVersions"][number] | null;
  hasRepairJobs: boolean;
  orderStage: string;
  waitingParts: boolean;
}) {
  if (input.activeVendorWork?.status === "WAITING_PARTS")
    return [
      {
        current: true,
        detail:
          input.activeVendorWork.nextAction ||
          input.activeVendorWork.lastUpdateSummary ||
          "The outside vendor is waiting on parts from the dealership before repair can continue.",
        title: "Deliver the requested parts",
      },
      {
        current: false,
        detail: "Record receiving, approval, and vendor delivery evidence so the outside repair can restart without another stall.",
        title: "Update parts and vendor custody",
      },
      {
        current: false,
        detail: "After the vendor resumes work, track repair completion, dealership QC, and final handoff.",
        title: "Resume repair to quality control",
      },
    ] as const;
  if (input.activeVendorWork && ["RETURNED", "QC_REQUIRED"].includes(input.activeVendorWork.status))
    return [
      { current: true, detail: "Open Final QC to record the pass/fail decision for the returned vendor repair.", title: "Release to Final QC" },
      { current: false, detail: "If QC passes, recon can complete. If QC fails, route the failed item back through the approved repair path.", title: "Record QC outcome" },
      { current: false, detail: "After QC passes, return the vehicle to Inventory or the next owning workspace with final readiness evidence.", title: "Complete recon handoff" },
    ] as const;
  if (input.activeVendorWork)
    return [
      { current: true, detail: input.activeVendorWork.nextAction, title: "Confirm outside-vendor progress" },
      { current: false, detail: "Bring the vehicle back from the vendor, complete dealership QC, and record any follow-up work before handoff.", title: "Return from vendor and verify quality" },
      { current: false, detail: "After repair and QC are complete, return the vehicle to Inventory or release workflow with final readiness evidence.", title: "Hand off to the next owning workspace" },
    ] as const;
  if (!input.diagnosis)
    return [
      {
        current: true,
        detail: input.directBodyPath
          ? "Capture visible damage, direct scope evidence, and the reason troubleshooting diagnosis is not required."
          : "Record inspection evidence, scan results, tests, and the supported cause.",
        title: input.directBodyPath ? "Record direct repair scope" : "Diagnose the concern",
      },
      { current: false, detail: "Create the repair scope and price from the confirmed evidence.", title: "Prepare estimate" },
      { current: false, detail: "Record approval, parts readiness, technician/vendor path, and dispatch plan.", title: "Authorize and release work" },
    ] as const;
  if (!input.estimate)
    return [
      { current: true, detail: "Create the exact-version estimate from the recorded scope and current evidence.", title: "Prepare estimate" },
      { current: false, detail: "Record the attributable approval decision for the exact estimate version.", title: "Capture approval" },
      { current: false, detail: "Create jobs or record outside-vendor work once approval and readiness are complete.", title: "Release repair path" },
    ] as const;
  if (!input.authorization)
    return [
      { current: true, detail: "Record the attributable approval decision for the exact estimate version.", title: "Capture approval" },
      { current: false, detail: "After approval, create jobs or record outside-vendor work from the governed scope.", title: "Release repair path" },
      { current: false, detail: "Move the approved work through parts, execution, quality control, and final handoff.", title: "Track execution to QC" },
    ] as const;
  if (!input.hasRepairJobs && input.waitingParts)
    return [
      { current: true, detail: "Confirm sourcing, reservation, and ETA before moving the repair forward.", title: "Resolve parts readiness" },
      { current: false, detail: "Once parts are ready, create the approved repair jobs or route the authorized vendor path.", title: "Create or dispatch repair work" },
      { current: false, detail: "Move the repair through execution, quality control, and handoff.", title: "Track repair to QC" },
    ] as const;
  if (["QUALITY_CONTROL", "ADVISOR_REVIEW"].includes(input.orderStage))
    return [
      { current: true, detail: "Verify the completed work independently and record any rework or release blockers.", title: "Perform quality control" },
      { current: false, detail: "Confirm keys, custody, final cost, and receiving-workspace readiness before handoff.", title: "Prepare handoff" },
      { current: false, detail: "Return the vehicle to Inventory or release workflow with complete evidence.", title: "Close the repair phase" },
    ] as const;
  if (input.orderStage === "HANDOFF")
    return [
      { current: true, detail: "Transfer the vehicle with final quality, cost, keys, and custody evidence recorded.", title: "Complete handoff" },
      { current: false, detail: "Make sure the next workspace acknowledges readiness and takes control.", title: "Confirm receiving ownership" },
      { current: false, detail: "Retain the full trace from intake through release for future review.", title: "Audit the closed loop" },
    ] as const;
  return [
    { current: true, detail: "Continue the approved repair path and keep the next accountable action current on the record.", title: "Perform authorized repair" },
    { current: false, detail: "When repair work is complete, move the vehicle into independent QC and road-test review.", title: "Verify quality readiness" },
    { current: false, detail: "After QC passes, return the vehicle to Inventory or release workflow with full evidence.", title: "Prepare handoff" },
  ] as const;
}

type WorkspaceTransitionTab = {
  detail: string;
  href: string;
  recommended?: boolean;
  title: string;
};

function contextualWorkspaceTabs(input: {
  activeVendorWork: ReturnType<typeof activeVendorWorkFor>;
  authorization: { disposition: string; id: string } | null;
  diagnosis: RepairOrderWorkbenchOrder["diagnosisVersions"][number] | null;
  directBodyPath: boolean;
  hasRepairJobs: boolean;
  orderId: string;
  orderStage: string;
  partsWorkspaceHref: string;
  planningHref: string;
  vendorProgressHref: string;
  vendorNeedsInternalCompletion: boolean;
  vendorReadyForFinalQc: boolean;
}) {
  const qcHref = `/vehicles/quality-control?repairOrderId=${encodeURIComponent(input.orderId)}&returnLabel=${encodeURIComponent("Return to Repair Workbench")}&returnTo=${encodeURIComponent(`/vehicles/repair-workbench?repairOrderId=${input.orderId}`)}`;
  const completionHref = `${input.planningHref}#repair-progress`;
  const repairTabs: WorkspaceTransitionTab[] = [
    {
      detail: "Manage the repair path, assignment, and readiness from the governed planning workspace.",
      href: input.planningHref,
      title: "Repair",
    },
    {
      detail: "Record what changed, what is next, and mark the work ready for quality control.",
      href: completionHref,
      recommended: true,
      title: "Completion",
    },
    {
      detail: "When repair is complete, move straight into independent QC and release review.",
      href: qcHref,
      title: "Quality control",
    },
  ];

  if (input.activeVendorWork?.status === "WAITING_PARTS") {
    return [
      {
        detail: "Approve, receive, and deliver the requested parts so the outside vendor can resume work.",
        href: input.partsWorkspaceHref,
        recommended: true,
        title: "Parts & delivery",
      },
      repairTabs[1],
      repairTabs[2],
    ] satisfies WorkspaceTransitionTab[];
  }

  if (input.vendorNeedsInternalCompletion) {
    return [
      {
        detail: "Create an internal completion scope/job on this same RO for the items the outside vendor did not finish.",
        href: `${input.planningHref}#repair-planning-step-2`,
        recommended: true,
        title: "Follow-up repair scope",
      },
      {
        detail: "Review the failed vendor-return decision and keep the QC evidence attached to the same repair order.",
        href: qcHref,
        title: "Vendor QC record",
      },
    ] satisfies WorkspaceTransitionTab[];
  }

  if (input.vendorReadyForFinalQc) {
    return [
      {
        detail: "The vehicle has returned from the outside vendor. Open Final QC to record pass/fail and complete recon handoff.",
        href: qcHref,
        recommended: true,
        title: "Final QC",
      },
      {
        detail: "Review the vendor completion notes, approved cost, and return evidence before completing handoff.",
        href: input.vendorProgressHref,
        title: "Vendor repair record",
      },
    ] satisfies WorkspaceTransitionTab[];
  }

  if (input.activeVendorWork) {
    return [
      {
        detail: "Record the vendor's repair progress, ETA, estimate, and approval status, then select the verified next stage for this repair order.",
        href: input.vendorProgressHref,
        recommended: true,
        title: "Vendor repair progress",
      },
      repairTabs[1],
      repairTabs[2],
    ] satisfies WorkspaceTransitionTab[];
  }

  if (["QUALITY_CONTROL", "QUALITY_CHECK"].includes(input.orderStage)) {
    return [
      {
        detail: "Review the last repair update and anything that could still block quality release.",
        href: completionHref,
        title: "Completion",
      },
      {
        detail: "Inspect, road test if needed, and decide whether the vehicle can move to handoff.",
        href: qcHref,
        recommended: true,
        title: "Quality control",
      },
    ] satisfies WorkspaceTransitionTab[];
  }

  if (input.orderStage === "HANDOFF") {
    return [
      {
        detail: "Review the final repair and QC trace before turning the vehicle over to the next owner.",
        href: completionHref,
        title: "Completion",
      },
      {
        detail: "Re-open QC only if a release blocker or rework question appears.",
        href: qcHref,
        title: "Quality control",
      },
    ] satisfies WorkspaceTransitionTab[];
  }

  if (input.hasRepairJobs || input.orderStage === "REPAIR" || input.authorization) return repairTabs;

  if (input.diagnosis || input.directBodyPath) {
    return [
      {
        detail: "Move the recorded evidence into estimate, approval, and repair release.",
        href: input.planningHref,
        recommended: true,
        title: "Repair planning",
      },
      repairTabs[1],
      repairTabs[2],
    ] satisfies WorkspaceTransitionTab[];
  }

  return [
    {
      detail: "Start from the guided repair planning path so the record can move cleanly into estimate and approval.",
      href: input.planningHref,
      recommended: true,
      title: "Repair planning",
    },
  ] satisfies WorkspaceTransitionTab[];
}

const inventorySafeNextAction = (nextAction: string | null | undefined, inventoryRecon: boolean) => {
  if (!nextAction) return inventoryRecon ? "Continue governed recon flow" : "Continue governed repair flow";
  if (!inventoryRecon) return nextAction;
  if (/resolve advisor exceptions and update the customer/i.test(nextAction)) return "Resolve recon approval exceptions and update Inventory";
  if (/maintain the service promise and next customer contact/i.test(nextAction)) return "Maintain the recon promise and next internal follow-up";
  return nextAction;
};

export function RepairOrderEnterpriseWorkbench({
  diagnostics,
  fullDetailMode = false,
  linkedTask = null,
  order,
  options,
  relatedPurchaseOrders = [],
  returnLabel,
  returnTo,
  showAdvisorReturn = false,
  showWorkspaceReturn = false,
}: {
  actorIsManager?: boolean;
  canUpdateLinkedTask?: boolean;
  diagnostics?: DiagnosticsBridge;
  fullDetailMode?: boolean;
  linkedTask?: TaskReadModel | null;
  linkedTaskReadiness?: TaskCompletionReadiness | null;
  order: RepairOrderWorkbenchOrder;
  options: Options;
  relatedPurchaseOrders?: RelatedPurchaseOrder[];
  returnLabel?: string;
  returnTo?: string;
  showAdvisorReturn?: boolean;
  showWorkspaceReturn?: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [closePanelOpen, setClosePanelOpen] = useState(false);
  const [closePanelMessage, setClosePanelMessage] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(order.ownerUser.id);
  const [currentOwner, setCurrentOwner] = useState(order.ownerUser);
  const [currentVersion, setCurrentVersion] = useState(order.version);
  const [evidencePreviewOpen, setEvidencePreviewOpen] = useState(false);
  const [useInternalRecon, setUseInternalRecon] = useState(false);
  const [reconReportOpen, setReconReportOpen] = useState(false);
  const [activeRoDrawer, setActiveRoDrawer] = useState<RoSummaryDrawer | null>(null);
  const [roCommentDraft, setRoCommentDraft] = useState("");
  const [roCommentSaving, setRoCommentSaving] = useState(false);
  const [roCommentMessage, setRoCommentMessage] = useState("");
  const [vehicleColor, setVehicleColor] = useState(order.vehicle.color ?? "");
  const [vehicleColorDraft, setVehicleColorDraft] = useState(order.vehicle.color ?? "");
  const [vehicleColorBusy, setVehicleColorBusy] = useState(false);
  const [vehicleVersion, setVehicleVersion] = useState(order.vehicle.version ?? 0);
  const [selectedReconPath, setSelectedReconPath] = useState<ReconRepairPath>(() => inferReconRepairPath(order));
  const [advancedDetailOpen, setAdvancedDetailOpen] = useState(false);
  const concernSummary = order.serviceVisit?.concernSummary?.trim() || "Concern not recorded.";
  const intakeNotes = order.serviceVisit?.intakeNotes?.trim() || null;
  const plan = useMemo(() => diagnosticPlan(concernSummary), [concernSummary]);
  const evidenceSuggestions = useMemo(() => suggestedInspectionFindings(concernSummary), [concernSummary]);
  const diagnosis = order.diagnosisVersions[0] ?? null;
  const estimate = order.estimateVersions[0] ?? null;
  const authorization = estimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)) ?? null;
  const intakeChecks = [
    ["Customer and vehicle", Boolean(order.customer || order.inventoryUnit) && Boolean(order.vehicle)],
    ["Concern captured", concernSummary.length >= 10 && concernSummary !== "Concern not recorded."],
    ["Keys and custody", order.serviceVisit.keysReceivedCount >= 0],
    ["Consent disposition", Boolean(order.serviceVisit.consentStatus)],
    ["Accountable owner", Boolean(ownerUserId)],
    ["Target and next action", Boolean(order.targetAt && order.nextAction)],
  ] as const;
  const readyCount = intakeChecks.filter((item) => item[1]).length;
  const intakeReady = readyCount === intakeChecks.length;
  const isInventoryRecon = Boolean(order.inventoryUnit);
  const capacityEvidence = Boolean(order.serviceVisit.readinessSnapshotId);
  const safetyReview = /brake|steer|airbag|fire|smoke|fuel|overheat|safety|not operable/i.test(concernSummary);
  const planningReturn = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}&vehicleId=${encodeURIComponent(order.vehicle.id)}`;
  const planningHref = `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(planningReturn)}`;
  const vendorFollowUpPlanningHref = `${planningHref}&vendorFollowUp=1`;
  const vendorProgressHref = "#vendor-repair-progress";
  const estimatePlanningHref = `${planningHref}#repair-planning-step-3`;
  const partsWorkspaceHref = `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(order.id)}&returnTo=${encodeURIComponent(planningReturn)}&returnLabel=${encodeURIComponent(order.repairOrderNumber)}`;
  const finalQcHref = `/vehicles/quality-control?repairOrderId=${encodeURIComponent(order.id)}&returnLabel=${encodeURIComponent("Return to Repair Workbench")}&returnTo=${encodeURIComponent(planningReturn)}`;
  const selectedOwner = options.users.find((user) => user.id === ownerUserId) ?? null;
  const assignmentChanged = Boolean(selectedOwner && selectedOwner.id !== currentOwner.id);
  const diagnosticCase = diagnostics && "cases" in diagnostics ? diagnostics.cases[0] ?? null : null;
  const concernLabel = isInventoryRecon ? "Inventory recon concern" : "Customer concern";
  const ownerLabel = isInventoryRecon ? "Inventory / work unit" : "Customer / inventory";
  const primaryContactLabel = isInventoryRecon ? "Inventory / Vehicle" : "Customer / Vehicle";
  const promiseGuardrailLabel = isInventoryRecon ? "Internal recon approval is required before any repair work is performed." : "Customer authorization is required before any repair work is performed.";
  const commitmentFollowUp = isInventoryRecon ? "Retail appointment readiness does not apply. Diagnosis determines the repair scope." : capacityEvidence ? "Live shop capacity is recorded." : "Scheduling capacity will be checked before repair dispatch.";
  const readinessNote = isInventoryRecon ? "Retail appointment readiness does not apply. Diagnosis determines the repair scope." : capacityEvidence ? "A live shop-capacity snapshot is linked to this intake." : "You can start diagnosis now; capacity can be reviewed before scheduling repair work.";
  const activeVendorWork = activeVendorWorkFor(order);
  const latestVendorWork = activeVendorWork ?? order.vendorWorks?.[0] ?? null;
  const showingInternalRecon = useInternalRecon || !activeVendorWork;
  const preservedVendorHistoryWork = useInternalRecon && activeVendorWork
    ? activeVendorWork
    : (order.vendorWorks ?? []).find((work) => ["COMPLETED", "CANCELLED"].includes(work.status)) ?? null;
  const vendorNeedsInternalCompletion = vendorQcNeedsInternalCompletion(activeVendorWork);
  const needsFollowUpVendor = vendorNeedsFollowUpVendor(activeVendorWork);
  const vendorReadyForFinalQc = Boolean(activeVendorWork && ["RETURNED", "QC_REQUIRED"].includes(activeVendorWork.status) && !vendorNeedsInternalCompletion && !needsFollowUpVendor);
  const vendorCanOpenFinalQc = Boolean(activeVendorWork && ["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(activeVendorWork.status) && !vendorNeedsInternalCompletion && !needsFollowUpVendor);
  const evidenceStageIndex = authorization ? 3 : estimate ? 2 : order.inspectionVersions.length || diagnosis ? 1 : 0;
  const lifecycleStageIndex = Math.max(
    stageToLifecycleIndex[order.stage] ?? 0,
    evidenceStageIndex,
    order.repairJobs.length > 0 ? 4 : 0,
    activeVendorWork ? 4 : 0,
    vendorReadyForFinalQc ? 5 : 0,
  );
  const waitingParts = order.partDemands.some((part) => part.quantityReserved < part.quantityRequired);
  const vendorWaitingParts = Boolean(activeVendorWork) && (activeVendorWork?.status === "WAITING_PARTS" || waitingParts);
  const directBodyPath = diagnosis?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis.") ?? false;
  const latestCustody = order.vehicle.custodyEvents?.[0] ?? null;
  const custodyLocation = latestCustody?.positionLabel || latestCustody?.location?.name || null;
  const currentLocationLabel = activeVendorWork?.currentLocation || custodyLocation || order.location.name;
  const currentLocationKind = activeVendorWork || custodyLocation ? "Current physical location" : "Current location";
  const vendorCorrectionDraft = activeVendorWork
    ? undefined
    : {
        approvalStatus: "NEEDS_DOCUMENTATION",
        currentLocation: "",
        customerVisibleSummary: "The vehicle is with an outside repair facility. We are monitoring the work and expected return.",
        lastUpdateSummary: "Vehicle assigned back to outside vendor.",
        nextAction: "Confirm vendor receipt, scope, estimate, approval status, and expected return.",
        scope: concernSummary,
        status: "AT_VENDOR",
        workType: "BODY_SHOP",
      };
  const followUpVendorDraft = needsFollowUpVendor && activeVendorWork
    ? {
        approvalStatus: "PENDING",
        currentLocation: "",
        customerVisibleSummary: `The vehicle is being sent to another approved outside vendor after ${activeVendorWork.vendorName} returned it unfinished.`,
        lastUpdateSummary: `Vehicle sent to the selected follow-up vendor after ${activeVendorWork.vendorName} returned it unfinished.`,
        nextAction: "Confirm the selected follow-up vendor received the vehicle, can complete the repair, and provided an expected return.",
        scope: activeVendorWork.scope || concernSummary,
        status: "AT_VENDOR",
        workType: activeVendorWork.workType || "MECHANICAL_SUBLET",
        vendorName: "",
      }
    : undefined;
  const additionalVendorDraft = activeVendorWork && !needsFollowUpVendor
    ? {
        allowParallelVendorWork: true,
        approvalStatus: "PENDING",
        currentLocation: "",
        customerVisibleSummary: "A second outside repair facility is performing an approved portion of this repair.",
        lastUpdateSummary: "Additional outside repair facility added for a separate payable portion of the RO.",
        nextAction: "Confirm the additional vendor's scope, approved amount, approver, and expected return.",
        scope: "",
        status: "AT_VENDOR",
        workType: activeVendorWork.workType || "MECHANICAL_SUBLET",
        vendorName: "",
      }
    : undefined;
  const nextSteps = nextStepPlan({
    activeVendorWork,
    authorization,
    diagnosis,
    directBodyPath,
    estimate,
    hasRepairJobs: order.repairJobs.length > 0,
    orderStage: order.stage,
    waitingParts,
  });
  const reconPathCanGuide = !activeVendorWork && !diagnosis && !estimate && !authorization && order.repairJobs.length === 0;
  const selectedReconPathOption = reconRepairPathOptions.find((option) => option.value === selectedReconPath) ?? reconRepairPathOptions[0];
  const reconPathRecommendation = selectedReconPath === "BODYWORK"
    ? {
        href: `${planningHref}#repair-planning-step-2`,
        label: "Start Bodywork Scope",
        nextAction: "Capture the visible bodywork scope, evidence, and repair path before estimate.",
        summary: "Use the direct bodywork path when troubleshooting diagnosis is not needed."
      }
    : selectedReconPath === "OUTSIDE_VENDOR"
      ? {
          href: "#vendor-repair-progress",
          label: "Send to Outside Vendor",
          nextAction: "Create or update the outside-vendor workflow for this repair order.",
          summary: "Send the vehicle out, then track vendor scope, estimate, approval, ETA, return, and QC."
        }
      : selectedReconPath === "DETAIL_PREP"
        ? {
            href: `/vehicles/shop-recon/${encodeURIComponent(order.id)}?${new URLSearchParams({ returnTo: planningReturn })}`,
            label: "Start Detail / Prep",
            nextAction: "Open the Shop & Recon workspace for detail, cleanup, and frontline-prep execution.",
            summary: "Use a recon package path when the work is preparation rather than mechanical diagnosis."
          }
        : selectedReconPath === "INSPECTION_ONLY"
          ? {
              href: finalQcHref,
              label: "Document Inspection",
              nextAction: "Verify the condition, document the inspection outcome, then close or move to QC.",
              summary: "Use inspection-only when the vehicle needs condition verification without repair work."
            }
          : {
              href: planningHref,
              label: "Start Diagnosis",
              nextAction: concernSummary === "Concern not recorded." && !order.nextAction.trim() ? "Continue governed repair flow" : "Start an evidence-led mechanical diagnosis for this repair order.",
              summary: safetyReview ? "Use diagnosis with safety-first handling before operating or road-testing this vehicle." : "Use diagnosis when the cause, tests, or mechanical repair plan still needs to be proven."
            };
  const displayedNextAction = vendorWaitingParts
    ? activeVendorWork?.nextAction || activeVendorWork?.lastUpdateSummary || "Vendor is waiting on parts from the dealership before repair can continue."
    : vendorReadyForFinalQc
      ? "Open Final QC to record pass/fail, complete recon, and hand off the vehicle."
    : activeVendorWork
      ? activeVendorWork.nextAction || activeVendorWork.lastUpdateSummary || "Record the latest outside-vendor progress and expected return."
      : reconPathCanGuide
        ? reconPathRecommendation.nextAction
      : order.repairJobs.length > 0
        ? nextSteps[0]?.detail || inventorySafeNextAction(order.nextAction, isInventoryRecon)
      : inventorySafeNextAction(order.nextAction, isInventoryRecon);
  const primaryActionHref = vendorWaitingParts
    ? partsWorkspaceHref
    : vendorNeedsInternalCompletion
      ? `${vendorFollowUpPlanningHref}#repair-planning-step-2`
    : vendorReadyForFinalQc
      ? finalQcHref
      : activeVendorWork
        ? vendorProgressHref
        : reconPathCanGuide
          ? reconPathRecommendation.href
        : diagnosis || directBodyPath
          ? estimatePlanningHref
          : planningHref;
  const primaryActionLabel = vendorWaitingParts
    ? "Update parts and delivery"
    : vendorNeedsInternalCompletion
      ? "Create follow-up repair scope"
    : vendorReadyForFinalQc
      ? "Open Final QC"
    : activeVendorWork
      ? "Document vendor repair progress"
      : reconPathCanGuide
        ? reconPathRecommendation.label
      : order.repairJobs.length > 0
        ? "Manage repair readiness"
      : diagnosis
        ? "Open Estimate Planning"
        : directBodyPath
          ? "Record Direct Repair Scope"
          : "Start Diagnosis";
  const primaryActionSummary = vendorWaitingParts
    ? "Receive the requested parts, approve any draft purchase order, and record delivery to the outside vendor so repair can continue."
    : vendorNeedsInternalCompletion
      ? "Keep this same RO open and add the internal completion work for the items the outside vendor did not finish."
    : vendorReadyForFinalQc
      ? "The vendor repair is back with the dealership. Record the Final QC pass/fail decision so recon can complete and handoff can proceed."
    : activeVendorWork
      ? activeVendorWork.nextAction
      : reconPathCanGuide
        ? reconPathRecommendation.summary
      : order.repairJobs.length > 0
        ? nextSteps[0]?.detail || "Continue the approved repair path and keep readiness, parts, and dispatch current."
      : diagnosis
        ? "Use the recorded evidence to prepare the repair scope and estimate."
        : directBodyPath
          ? "Capture the visible damage scope, direct evidence, and the reason troubleshooting diagnosis is not required."
          : "Open the guided diagnostic plan for this exact repair order and vehicle.";
  const workflowGateLabel = vendorWaitingParts
    ? "Parts action required"
    : vendorNeedsInternalCompletion
      ? "Vendor QC failed"
    : vendorReadyForFinalQc
      ? "Ready for Final QC"
    : activeVendorWork
      ? "Outside repair in progress"
      : diagnosis
        ? "Diagnosis already recorded"
        : intakeReady
          ? "Ready for diagnosis"
          : "Complete intake facts";
  const workflowGateActionLabel = vendorWaitingParts
    ? "Open Parts Workspace"
    : vendorNeedsInternalCompletion
      ? "Create follow-up repair scope"
    : vendorReadyForFinalQc
      ? "Open Final QC"
    : activeVendorWork
      ? "Record vendor update"
      : safetyReview
        ? "Start Safety Diagnosis"
        : diagnosis
          ? "Review estimate planning"
          : "Start Diagnosis";
  const stageHeadline = vendorWaitingParts
    ? "Vendor waiting on our parts"
    : vendorNeedsInternalCompletion
      ? "Vendor QC failed - create internal completion work"
    : vendorReadyForFinalQc
      ? "Ready for Final QC"
    : activeVendorWork
      ? "Outside repair in progress"
      : diagnosis
        ? "Diagnosis recorded"
        : "Technician diagnosis is next";
  const stageSummary = vendorWaitingParts
    ? activeVendorWork?.lastUpdateSummary || activeVendorWork?.nextAction || "The outside vendor is blocked until the dealership delivers the requested parts."
    : vendorNeedsInternalCompletion
      ? activeVendorWork?.lastUpdateSummary || "Dealership QC found the vendor return was incomplete and needs a follow-up internal repair scope."
    : vendorReadyForFinalQc
      ? activeVendorWork?.lastUpdateSummary || "The outside vendor repair has returned and is ready for Final QC."
    : activeVendorWork
      ? activeVendorWork?.lastUpdateSummary || vendorDispatchSummary(activeVendorWork) || activeVendorWork?.nextAction || "The vehicle is currently with the outside vendor and needs progress tracking."
      : diagnosis
        ? "Diagnosis is already on file. Use this repair order to move into estimate, approval, parts, and repair coordination."
        : "The repair order remains the source of truth and is ready for technician evidence-led diagnosis.";
  const stageSupport = vendorWaitingParts
    ? "Lead with parts receiving, approval, and delivery updates. Keep the diagnosis record visible as supporting evidence only."
    : vendorNeedsInternalCompletion
      ? "Do not open a detached RO. Keep the original RO as the parent record, switch Repair Planning to Bodywork or Diagnostic as needed, and create the follow-up job from the missing work."
    : vendorReadyForFinalQc
      ? "Lead with Final QC. If QC passes, recon can complete and handoff can proceed; if QC fails, route the failed work back through the approved repair path."
    : activeVendorWork
      ? "Lead with vendor progress, ETA, and return requirements. Keep the diagnosis record available underneath as supporting context."
      : diagnosis
        ? "Keep the recorded diagnosis available while guiding staff into the next governed step."
        : "Tests and findings should be recorded here before estimate and approval.";
  const relatedDraftPurchaseOrders = relatedPurchaseOrders.filter((item) => item.status === "DRAFT");
  const relatedApprovedPurchaseOrders = relatedPurchaseOrders.filter((item) => item.status && item.status !== "DRAFT");
  const hasOffsiteVendorWithoutDiagnosis = Boolean(activeVendorWork) && !diagnosis;
  const reviewAnchorHref = hasOffsiteVendorWithoutDiagnosis ? "#vendor-dispatch" : "#diagnosis";
  const reviewAnchorLabel = hasOffsiteVendorWithoutDiagnosis ? "Review vendor dispatch record" : "Review diagnosis record";
  const authorizationBoundaryText = hasOffsiteVendorWithoutDiagnosis
    ? "Outside-vendor progress is governed from this RO. While the vehicle is offsite, keep vendor updates, estimate approval, parts coordination, and expected return current here."
    : "Diagnosis is permitted from this RO. No repair is authorized until the estimate and approval are recorded.";
  const referencePanelTitle = hasOffsiteVendorWithoutDiagnosis ? "Vendor dispatch reference" : "Diagnostic reference";
  const referencePanelSubtitle = hasOffsiteVendorWithoutDiagnosis ? "Preserved outside-vendor dispatch, accountability, and return requirements for this repair order" : "Preserved technician reasoning and evidence for this repair order";
  const referencePanelBadge = diagnosis ? `Diagnosis v${diagnosis.version}` : hasOffsiteVendorWithoutDiagnosis ? "Outside vendor active" : "No diagnosis recorded";
  const referencePlan = hasOffsiteVendorWithoutDiagnosis
    ? [
      { label: "Confirm outside-vendor route", objective: vendorDispatchSummary(activeVendorWork!), evidence: "Dispatch origin, transport method, and current physical location" },
      { label: "Track vendor estimate and approval", objective: "Keep the vendor estimate, approval status, and expected return current on the repair order.", evidence: "Vendor estimate and approval record" },
      { label: "Coordinate return and next custody move", objective: "Manage parts, ETA, return to dealership, and post-vendor QC without forcing an in-shop diagnosis step.", evidence: "Vendor updates and return plan" }
    ]
    : plan;
  const referenceFooter = hasOffsiteVendorWithoutDiagnosis
    ? "This reference keeps the offsite vendor story accurate. It does not require an in-shop diagnosis while the vehicle remains with the vendor."
    : "This plan identifies what to verify. It does not assume the cause or authorize repair work.";
  const workspaceTabs = contextualWorkspaceTabs({
    activeVendorWork,
    authorization,
    diagnosis,
    directBodyPath,
    hasRepairJobs: order.repairJobs.length > 0,
    orderId: order.id,
    orderStage: order.stage,
    partsWorkspaceHref,
    planningHref: vendorNeedsInternalCompletion ? vendorFollowUpPlanningHref : diagnosis || directBodyPath ? estimatePlanningHref : planningHref,
    vendorProgressHref,
    vendorNeedsInternalCompletion,
    vendorReadyForFinalQc,
  });

  function openVendorProgress() {
    if (!activeVendorWork || vendorNeedsInternalCompletion || vendorReadyForFinalQc) return;
    window.dispatchEvent(new Event("repair-vendor-progress:open"));
    window.setTimeout(() => {
      const target = document.getElementById("vendor-repair-progress");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstField = target?.querySelector("input, textarea, select, button") as HTMLElement | null;
      firstField?.focus({ preventScroll: true });
    }, 50);
  }

  async function approveRelatedPurchaseOrder(purchaseOrder: RelatedPurchaseOrder) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/service-close-parts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSITION_PURCHASE_ORDER",
          idempotencyKey: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
          reason: `Approve ${purchaseOrder.purchaseOrderNumber} from the repair order workbench so receiving can continue.`,
          subjectId: purchaseOrder.id,
          toStatus: "APPROVED",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Purchase order approval could not be saved.");
      setNotice(`${purchaseOrder.purchaseOrderNumber} approved. Receiving may still require a part number, stock location, or receipt detail in Parts Workspace.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Purchase order approval could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function assignOwner() {
    if (!selectedOwner || !assignmentChanged) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}/technician-assignment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          technicianUserId: ownerUserId,
          reason: "Assign the explicitly selected technician from the Repair Order workbench.",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Assignment could not be saved.");
      const savedVersion = Number(body.result?.version);
      setCurrentOwner(selectedOwner);
      if (Number.isInteger(savedVersion) && savedVersion > currentVersion) setCurrentVersion(savedVersion);
      setNotice(`${selectedOwner.name} is now the accountable owner / technician for ${order.repairOrderNumber}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Assignment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveVehicleColor() {
    const color = vehicleColorDraft.trim();
    if (!color) {
      setNotice("Enter the vehicle color before saving.");
      return;
    }
    if (color.toLocaleLowerCase() === vehicleColor.trim().toLocaleLowerCase()) {
      setNotice("Vehicle color is already current.");
      return;
    }
    setVehicleColorBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(order.vehicle.id)}/commands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "CORRECT_COLOR",
          color,
          expectedVersion: vehicleVersion,
          idempotencyKey: crypto.randomUUID(),
          locationId: order.location.id,
          reason: vehicleColor ? "Correct vehicle color from the repair order vehicle card." : "Record missing vehicle color from the repair order vehicle card.",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Vehicle color could not be saved.");
      const savedVersion = Number(body.version ?? body.result?.version);
      setVehicleColor(color);
      setVehicleColorDraft(color);
      if (Number.isInteger(savedVersion) && savedVersion > vehicleVersion) setVehicleVersion(savedVersion);
      setNotice(`Vehicle color saved as ${color}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle color could not be saved.");
    } finally {
      setVehicleColorBusy(false);
    }
  }

  async function closeNoFurtherWork() {
    const reason = closeReason.trim();
    if (reason.length < 10) {
      setClosePanelMessage("Add a clear closure reason before closing this repair order.");
      return;
    }
    setBusy(true);
    setClosePanelMessage("Closing repair order...");
    setNotice("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE_NO_FURTHER_WORK",
          expectedVersion: currentVersion,
          idempotencyKey: crypto.randomUUID(),
          reason,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; result?: { version?: number } };
      if (!response.ok) throw new Error(body.error ?? "Repair order could not be closed.");
      const savedVersion = Number(body.result?.version);
      if (Number.isInteger(savedVersion) && savedVersion > currentVersion) setCurrentVersion(savedVersion);
      setClosePanelOpen(false);
      setClosePanelMessage("");
      setCloseReason("");
      setNotice("Repair order closed. No further work is planned.");
      if (returnTo) {
        router.push(returnToAfterRepairOrderClose(returnTo, order.id));
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Repair order could not be closed.";
      setClosePanelMessage(message);
      setNotice(message);
    } finally {
      setBusy(false);
    }
  }

  const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
  const vehicleColorEditor = (
    <section className="rowb-vehicle-color-editor" aria-label="Vehicle color">
      <label>
        <span>Vehicle color</span>
        <input onChange={(event) => setVehicleColorDraft(event.target.value)} placeholder="Example: White" value={vehicleColorDraft} />
      </label>
      <button disabled={vehicleColorBusy || !vehicleColorDraft.trim() || vehicleColorDraft.trim().toLocaleLowerCase() === vehicleColor.trim().toLocaleLowerCase()} onClick={() => void saveVehicleColor()} type="button">
        {vehicleColorBusy ? "Saving color..." : vehicleColor ? "Update color" : "Save color"}
      </button>
    </section>
  );
  const summaryStages = lifecycleLabels.map((label) => ({ key: label, label }));
  const activeSummaryIndex = lifecycleStageIndex;
  const summaryStageState = (index: number) => {
    if (index < activeSummaryIndex) return "done";
    if (index === activeSummaryIndex) return "current";
    if (index === activeSummaryIndex + 1) return "next";
    return "upcoming";
  };
  const summaryActionLabel = vendorReadyForFinalQc ? "Continue to Final QC" : primaryActionLabel;
  const summaryBadge = vendorReadyForFinalQc ? "Ready for Final QC" : reconPathCanGuide ? `${reconPathLabel(selectedReconPath)} path` : workflowGateLabel;
  const vendorAmountLabel = money(latestVendorWork?.approvedAmountCents ?? latestVendorWork?.estimateAmountCents ?? null);
  const latestVendorEvents = latestVendorWork?.events ?? [];
  const vendorApprovalEvent = latestVendorEvents.find((event) => /approv/i.test(event.summary));
  const vendorApprovalActor = vendorApprovalEvent?.actorUser.name;
  const vendorApprovedOn = latestVendorWork?.approvalStatus === "APPROVED"
    ? date(vendorApprovalEvent?.occurredAt ?? latestVendorWork.sentAt)
    : "Not recorded";
  const vendorStatusDone = Boolean(latestVendorWork && ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(latestVendorWork.status));
  const reportRisk = vendorWaitingParts || vendorNeedsInternalCompletion
    ? "Stalled"
    : vendorReadyForFinalQc || ["QUALITY_CONTROL", "QUALITY_CHECK", "HANDOFF", "COMPLETE", "COMPLETED"].includes(order.stage)
      ? "Review"
      : "On track";
  const reportBlocker = vendorWaitingParts
    ? "Vendor is waiting on dealership-supplied parts."
    : vendorNeedsInternalCompletion
      ? "Dealership QC found incomplete vendor work."
      : !intakeReady
        ? "Intake facts are incomplete."
        : !diagnosis
          ? "Diagnosis or direct repair scope has not been recorded."
          : !estimate
            ? "Estimate has not been prepared."
            : !authorization
              ? "Approval has not been captured."
              : waitingParts
                ? "Parts are not fully reserved."
                : vendorReadyForFinalQc
                  ? "Final QC pass/fail is ready to record."
                  : "No active blocker recorded.";
  const reportMilestones = [
    { label: "Intake", result: intakeReady ? "Done" : "Needs facts", detail: concernSummary },
    { label: "Diagnosis", result: diagnosis || directBodyPath || hasOffsiteVendorWithoutDiagnosis ? "Done" : "Pending", detail: diagnosis?.cause ?? (hasOffsiteVendorWithoutDiagnosis ? "Outside-vendor path is documented." : "Technician evidence is still needed.") },
    { label: "Estimate", result: estimate ? `Version ${estimate.version}` : "Pending", detail: estimate ? money(estimate.totalCents) : "No estimate on file." },
    { label: "Approval", result: authorization ? format(authorization.disposition) : "Pending", detail: authorization ? "Approval is attached to the current estimate." : "Approval decision still needs to be recorded." },
    { label: "Parts", result: waitingParts ? "Stalled" : order.partDemands.length ? "Ready" : "No demand", detail: order.partDemands.length ? `${order.partDemands.reduce((sum, part) => sum + Math.max(0, part.quantityRequired - part.quantityReserved), 0)} still needed` : "No parts demand recorded." },
    { label: "Repair", result: activeVendorWork ? format(activeVendorWork.status) : order.repairJobs.length ? `${order.repairJobs.length} job(s)` : "Pending", detail: activeVendorWork?.lastUpdateSummary ?? primaryActionSummary },
    { label: "QC", result: vendorReadyForFinalQc ? "Ready for pass/fail" : ["QUALITY_CONTROL", "QUALITY_CHECK"].includes(order.stage) ? "In review" : "Pending", detail: vendorReadyForFinalQc ? "Record pass/fail, then handoff." : "QC opens after repair completion." },
    { label: "Handoff", result: ["HANDOFF", "COMPLETE", "COMPLETED"].includes(order.stage) ? "Ready" : "Pending", detail: "After QC passes, return the vehicle to the next owning workspace." },
  ];
  const reportEvents = [
    ...(order.stateEvents ?? []).slice(0, 4).map((event) => ({
      detail: event.nextAction || event.reason,
      label: `${format(event.toStage)} - ${format(event.toOperatingState)}`,
      when: date(event.occurredAt)
    })),
    ...(order.advisorUpdates ?? []).slice(0, 4).map((update) => ({
      detail: update.internalNotes || update.customerVisibleSummary,
      label: update.contactOutcome || format(update.statusCode),
      when: date(update.occurredAt)
    })),
    latestVendorEvents[0]
      ? { label: "Last vendor update", detail: latestVendorEvents[0].summary, when: date(latestVendorEvents[0].occurredAt) }
      : null,
    latestVendorWork
      ? { label: activeVendorWork ? "Vendor status" : "Latest vendor history", detail: `${latestVendorWork.vendorName} - ${format(latestVendorWork.status)}`, when: date(latestVendorWork.sentAt) }
      : null,
    diagnosis
      ? { label: "Diagnosis recorded", detail: diagnosis.recommendation, when: date(diagnosis.diagnosedAt) }
      : null,
    estimate
      ? { label: "Estimate prepared", detail: `${money(estimate.totalCents)} - ${format(estimate.status)}`, when: `Version ${estimate.version}` }
      : null,
  ].filter(Boolean) as Array<{ detail: string; label: string; when: string }>;
  const summaryChecklist = [
    { complete: intakeReady, detail: `${readyCount}/${intakeChecks.length} intake facts complete`, label: "Intake facts" },
    { complete: Boolean(diagnosis || directBodyPath || hasOffsiteVendorWithoutDiagnosis), detail: hasOffsiteVendorWithoutDiagnosis ? "Outside vendor path is active" : diagnosis?.recommendation ?? "Technician evidence or direct scope needed", label: "Diagnosis / scope" },
    { complete: Boolean(estimate), detail: estimate ? `${money(estimate.totalCents)} - ${format(estimate.status)}` : "Estimate has not been prepared", label: "Estimate" },
    { complete: Boolean(authorization), detail: authorization ? format(authorization.disposition) : "Approval decision still needs to be recorded", label: "Approval" },
    { complete: !waitingParts, detail: waitingParts ? "Parts are not fully reserved" : "No open parts blocker", label: "Parts readiness" },
    { complete: vendorReadyForFinalQc || order.repairJobs.some((job) => job.status === "COMPLETED"), detail: vendorReadyForFinalQc ? "Final QC is ready" : order.repairJobs.length ? `${order.repairJobs.length} job(s) on this RO` : "Repair execution has not been completed", label: "Repair / QC" },
  ];
  const openSummaryChecklistCount = summaryChecklist.filter((item) => !item.complete).length;
  const roComments = [
    ...(order.advisorUpdates ?? []).map((update) => ({
      author: update.authorUser.name,
      body: update.internalNotes || update.customerVisibleSummary,
      id: update.id,
      label: update.contactOutcome || format(update.statusCode),
      when: date(update.occurredAt)
    })),
    ...(intakeNotes ? [{
      author: order.serviceVisit.createdByUser?.name ?? currentOwner.name,
      body: intakeNotes,
      id: "intake-note",
      label: "Intake note",
      when: date(order.openedAt)
    }] : [])
  ];
  const roSubtasks = [
    ...order.repairJobs.map((job) => ({
      complete: ["COMPLETED", "QC_PASSED", "CANCELLED"].includes(job.status),
      detail: job.description,
      id: job.id,
      label: job.jobNumber,
      status: format(job.status)
    })),
    ...nextSteps.map((step, index) => ({
      complete: false,
      detail: step.detail,
      id: `next-step-${index}`,
      label: step.title,
      status: step.current ? "Current" : "Next"
    }))
  ];
  const summaryCommentCount = roComments.length;
  const repairDetailCount = 4;
  const toggleRoDrawer = (drawer: RoSummaryDrawer) => {
    setActiveRoDrawer((currentDrawer) => currentDrawer === drawer ? null : drawer);
  };
  async function addRoComment() {
    const body = roCommentDraft.trim();
    if (!body) {
      setRoCommentMessage("Add a comment before saving.");
      return;
    }
    setRoCommentSaving(true);
    setRoCommentMessage("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(order.id)}/advisor-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactChannel: "INTERNAL",
          contactDirection: "INTERNAL",
          contactOutcome: "RO comment recorded",
          customerVisibleSummary: body,
          exceptionCodes: [],
          idempotencyKey: `ro-comment-${order.id}-${Date.now()}`,
          internalNotes: body,
          occurredAt: new Date().toISOString(),
          reason: "Record internal repair-order comment.",
          statusCode: "INTERNAL_NOTE"
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save this RO comment.");
      setRoCommentDraft("");
      setRoCommentMessage("RO comment saved.");
      router.refresh();
    } catch (error) {
      setRoCommentMessage(error instanceof Error ? error.message : "Unable to save this RO comment.");
    } finally {
      setRoCommentSaving(false);
    }
  }
  const reconReportPanel = (
    <section className="rowb-recon-report" id="recon-report" aria-label="Vehicle recon progress report">
      <header>
        <div>
          <small>Recon Report</small>
          <h3>{vehicle}</h3>
          <p>{order.repairOrderNumber} - {workflowGateLabel} - {currentLocationLabel}</p>
        </div>
        <strong>{reportRisk}</strong>
      </header>
      <div className="rowb-report-kpis">
        <div><span>Current stage</span><b>{format(order.stage)}</b></div>
        <div><span>Days in recon</span><b>{duration(order.openedAt)}</b></div>
        <div><span>Stage clock</span><b>{duration(order.stageStartedAt)}</b></div>
        <div><span>Owner</span><b>{currentOwner.name}</b></div>
      </div>
      <div className="rowb-report-focus">
        <article><small>Stall / blocker</small><strong>{reportBlocker}</strong></article>
        <article><small>Next move</small><strong>{displayedNextAction}</strong></article>
      </div>
      <div className="rowb-report-stages">
        {reportMilestones.map((stage) => (
          <article key={stage.label}>
            <span>{stage.label}</span>
            <b>{stage.result}</b>
            <p>{stage.detail}</p>
          </article>
        ))}
      </div>
      <div className="rowb-report-events">
        <strong>Recent progress</strong>
        {reportEvents.length ? reportEvents.map((event) => (
          <p key={`${event.label}-${event.when}`}><span>{event.label}</span><b>{event.when}</b>{event.detail}</p>
        )) : <p><span>Current record</span><b>Now</b>{stageSummary}</p>}
      </div>
    </section>
  );
  const detailRoute = `/vehicles/repair-workbench?${new URLSearchParams({
    repairOrderId: order.id,
    vehicleId: order.vehicle.id,
    fullDetails: "1",
    ...(returnTo ? { returnTo } : {}),
    ...(returnLabel ? { returnLabel } : {}),
  })}`;
  const summaryRoute = `/vehicles/repair-workbench?${new URLSearchParams({
    repairOrderId: order.id,
    vehicleId: order.vehicle.id,
    ...(returnTo ? { returnTo } : {}),
    ...(returnLabel ? { returnLabel } : {}),
  })}`;
  const workbenchReturnRoute = fullDetailMode ? detailRoute : summaryRoute;
  const linkedTaskReturnRoute = linkedTask
    ? `/tasks/${encodeURIComponent(linkedTask.id)}?${new URLSearchParams({ view: "workbench", returnTo: workbenchReturnRoute })}`
    : null;
  const calendarPlannerHref = linkedTask
    ? `/appointments?${new URLSearchParams({
        action: "new",
        returnTo: linkedTaskReturnRoute ?? workbenchReturnRoute,
        sourceTask: linkedTask.id
      })}`
    : `/appointments?${new URLSearchParams({
        action: "new",
        reason: order.nextAction,
        returnTo: workbenchReturnRoute,
        title: `${order.repairOrderNumber} appointment`,
        vehicleReference: [order.vehicle.year, order.vehicle.make, order.vehicle.model, order.vehicle.vin ?? order.vehicle.vehicleNumber].filter(Boolean).join(" ")
      })}`;
  const inventoryLifecycleHref = `/vehicles/${encodeURIComponent(order.vehicle.id)}/inventory-planning?${new URLSearchParams({ repairOrderId: order.id })}`;
  const shopReconHref = `/vehicles/shop-recon/${encodeURIComponent(order.id)}?${new URLSearchParams({ returnTo: workbenchReturnRoute })}`;
  const shopReconStageDefinition = SHOP_RECON_STAGES.find((stage) => stage.code === order.shopReconLifecycle?.stage);
  const shopReconStageLabel = shopReconStageDefinition
    ? `${shopReconStageDefinition.order}. ${shopReconStageDefinition.label}`
    : format(order.shopReconLifecycle?.stage ?? order.stage);
  const shopReconWhereLabel = order.shopReconLifecycle?.zoneCode || currentLocationLabel;
  const summaryPrimaryHref = !vendorReadyForFinalQc && primaryActionHref.startsWith("#")
    ? `${detailRoute}${primaryActionHref}`
    : primaryActionHref;
  const footerPrimaryHref = !fullDetailMode && !vendorReadyForFinalQc && primaryActionHref.startsWith("#")
    ? `${detailRoute}${primaryActionHref}`
    : primaryActionHref;
  const footerPrimaryClick = fullDetailMode && primaryActionHref === vendorProgressHref ? openVendorProgress : undefined;
  const toggleReconReport = () => setReconReportOpen((open) => !open);
  const vehicleToolLinks = () => (
    <div className="rowb-vehicle-tool-links" aria-label="Vehicle inventory shortcuts">
      <Link href={inventoryLifecycleHref}><ClipboardCheck /><span><strong>Inventory Lifecycle</strong><small>Acquisition and inventory tools</small></span></Link>
      <Link href={shopReconHref}><Wrench /><span><strong>Shop &amp; Recon</strong><small>{shopReconStageLabel} · {shopReconWhereLabel}</small></span></Link>
    </div>
  );
  const showReconPathSelector = !activeVendorWork || vendorNeedsInternalCompletion || needsFollowUpVendor;
  const reconPathSelector = showReconPathSelector ? (
    <section className="rowb-recon-path-selector" aria-label="Choose repair or recon path">
      <header>
        <div>
          <span>{reconPathCanGuide ? "Choose recon path" : "Repair path"}</span>
          <strong>{selectedReconPathOption.label}</strong>
        </div>
        <small>{reconPathCanGuide ? selectedReconPathOption.detail : `${format(order.stage)} · use this selector to keep the intended work path visible while the governed workflow continues.`}</small>
      </header>
      <div>
        {reconRepairPathOptions.map((option) => (
          <button
            aria-pressed={selectedReconPath === option.value}
            key={option.value}
            onClick={() => setSelectedReconPath(option.value)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <section className={`rowb-shell${fullDetailMode ? " rowb-full-detail-mode" : ""}`} aria-label="Repair Order Workbench">
      {fullDetailMode ? (
        <>
          <header className="rowb-header">
            <div>
              {returnTo ? (
                <Link href={returnTo}>← {returnLabel ?? "Return to source workspace"}</Link>
              ) : showAdvisorReturn ? (
                <BackToServiceAdvisorWorkspace />
              ) : showWorkspaceReturn ? (
                <BackToVehicleOperationsWorkspace />
              ) : null}
              <Link href="/vehicles/repair-workbench?view=all">← All Repair Orders</Link>
              <Link href={summaryRoute}>← Back to summary card</Link>
              <span>Repair Order Workbench</span>
              <h1>{order.repairOrderNumber}</h1>
              <div className="rowb-document-actions">
                <button aria-expanded={reconReportOpen} aria-controls="recon-report" onClick={toggleReconReport} type="button">
                  <Activity />
                  Recon Report
                </button>
                <Link href={partsWorkspaceHref}>
                  <PackageCheck />
                  Parts
                </Link>
                <a href="#repair-order-document">
                  <FileText />
                  View RO
                </a>
                <a href={`/api/repair-orders/${encodeURIComponent(order.id)}/print`} rel="noreferrer" target="_blank">
                  <Printer />
                  Print RO
                </a>
              </div>
            </div>
            <dl>
              <div><dt>Vehicle</dt><dd>{vehicle}</dd></div>
              <div><dt>{isInventoryRecon ? "Inventory" : "Customer"}</dt><dd>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work"}</dd></div>
              <div><dt>Stage</dt><dd>{format(order.stage)}</dd></div>
              <div><dt>Arrival</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div>
              <div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div>
              <div><dt>Audit</dt><dd>Version {currentVersion}</dd></div>
            </dl>
          </header>
          <nav className="rowb-lifecycle" aria-label="Repair lifecycle">
            {lifecycleLabels.map((label, index) => {
              const reached = index <= lifecycleStageIndex;
              return (
                <span className={reached ? "reached" : "locked"} key={label}>
                  <i>{reached ? <Check /> : <LockKeyhole />}</i>
                  {label}
                </span>
              );
            })}
          </nav>
          {reconReportOpen ? reconReportPanel : null}
        </>
      ) : null}
      {notice ? <div className="rowb-notice" role="status">{notice}</div> : null}
      {fullDetailMode ? (
        <section className="rowb-daily-command" aria-label="Daily repair-order action">
          <div className="rowb-daily-primary">
            <span>Today&apos;s RO action</span>
            <h2>{primaryActionLabel}</h2>
            <p>{primaryActionSummary}</p>
            <div>
              <Link
                className="primary"
                href={primaryActionHref}
                onClick={primaryActionHref === vendorProgressHref ? openVendorProgress : undefined}
              >
                {primaryActionLabel}
                <ChevronRight />
              </Link>
              <button onClick={() => setAdvancedDetailOpen(true)} type="button">Open full RO detail</button>
            </div>
          </div>
          <dl className="rowb-daily-status">
            <div><dt>Stage</dt><dd>{workflowGateLabel}</dd></div>
            <div><dt>Owner</dt><dd>{currentOwner.name}</dd></div>
            <div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div>
            <div><dt>Approval</dt><dd>{authorization ? format(authorization.disposition) : "Not approved yet"}</dd></div>
          </dl>
          <ol className="rowb-daily-path" aria-label="Simple daily path">
            {nextSteps.slice(0, 4).map((step, index) => (
              <li className={step.current ? "current" : undefined} key={step.title}>
                <b>{index + 1}</b>
                <span>
                  <strong>{step.title}</strong>
                  {step.detail}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {!fullDetailMode ? (
      <section className="rowb-summary-card" aria-label="Vehicle summary card">
        <nav className="rowb-summary-nav" aria-label="Repair order navigation">
          <div>
            {returnTo ? (
              <Link href={returnTo}>← {returnLabel ?? "Return to source workspace"}</Link>
            ) : showAdvisorReturn ? (
              <BackToServiceAdvisorWorkspace />
            ) : showWorkspaceReturn ? (
              <BackToVehicleOperationsWorkspace />
            ) : null}
            <Link href="/vehicles/repair-workbench?view=all">← All Repair Orders</Link>
          </div>
          <div>
            <button aria-expanded={reconReportOpen} aria-controls="recon-report" onClick={toggleReconReport} type="button"><Activity /> Recon Report</button>
            <Link href={partsWorkspaceHref}><PackageCheck /> Parts</Link>
            <Link href={`${detailRoute}#repair-order-document`}><FileText /> View RO</Link>
            <a href={`/api/repair-orders/${encodeURIComponent(order.id)}/print`} rel="noreferrer" target="_blank"><Printer /> Print RO</a>
            <button aria-expanded={closePanelOpen} aria-controls="repair-order-close-panel" onClick={() => { setClosePanelMessage(""); setClosePanelOpen((open) => !open); }} type="button"><XCircle /> Close RO</button>
          </div>
        </nav>
        <div className="rowb-summary-top">
          <div className="rowb-summary-vehicle">
            <span className="rowb-summary-icon"><CarFront /></span>
            <div>
              <small>{order.inventoryUnit ? "Inventory recon" : "Repair order"}</small>
              <h2>{vehicle}</h2>
              <p>{[order.repairOrderNumber, order.inventoryUnit?.inventoryNumber ?? order.vehicle.vehicleNumber, vehicleColor || "Color not recorded"].filter(Boolean).join(" · ")}</p>
              {vehicleToolLinks()}
              {vehicleColorEditor}
            </div>
          </div>
          <div className="rowb-summary-status">
            <span>{summaryBadge}</span>
            <strong>{stageHeadline}</strong>
            <p>{displayedNextAction}</p>
          </div>
          <div className="rowb-summary-actions">
            <Link
              className="primary"
              href={vendorReadyForFinalQc ? finalQcHref : summaryPrimaryHref}
              onClick={() => {
                if (!vendorReadyForFinalQc && primaryActionHref === vendorProgressHref && fullDetailMode) openVendorProgress();
              }}
            >
              {summaryActionLabel}
              <ChevronRight />
            </Link>
            <Link href={detailRoute}>
              View full details
              <ChevronRight />
            </Link>
            <button aria-expanded={reconReportOpen} aria-controls="recon-report" onClick={toggleReconReport} type="button">
              <Activity />
              Recon Report
            </button>
          </div>
        </div>
        {closePanelOpen ? (
          <div className="rowb-close-panel" id="repair-order-close-panel">
            <label>
              <span>Closure reason</span>
              <textarea onChange={(event) => setCloseReason(event.target.value)} placeholder="Example: Customer declined further diagnosis; no work will be pursued." value={closeReason} />
            </label>
            <div>
              <button disabled={busy} onClick={() => { setClosePanelOpen(false); setClosePanelMessage(""); setCloseReason(""); }} type="button">Keep open</button>
              <button disabled={busy || closeReason.trim().length < 10} onClick={() => void closeNoFurtherWork()} type="button">{busy ? "Closing..." : "Close with no further work"}</button>
            </div>
            {closePanelMessage ? <p role="status">{closePanelMessage}</p> : null}
          </div>
        ) : null}
        {reconPathSelector}
        {reconReportOpen ? reconReportPanel : null}
        <dl className="rowb-summary-facts">
          <div><dt>Custody / location</dt><dd>{currentLocationLabel}</dd></div>
          <div><dt>Owner</dt><dd>{currentOwner.name}</dd></div>
          <div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div>
          <div><dt>Vendor amount</dt><dd>{vendorAmountLabel}</dd></div>
        </dl>
        <div className="rowb-summary-rail" aria-label="Recon progress">
          {summaryStages.map((stage, index) => (
            <span className={summaryStageState(index)} key={stage.key}>
              <i>{summaryStageState(index) === "done" ? <Check /> : index + 1}</i>
              {stage.label}
            </span>
          ))}
        </div>
        <div className="rowb-summary-drawer-stack">
          <nav className="rowb-summary-drawer-tabs" aria-label="Repair order drawers">
            <button aria-pressed={activeRoDrawer === "progress"} onClick={() => toggleRoDrawer("progress")} type="button"><Activity />Progress / Updates <span>{reportEvents.length}</span></button>
            <button aria-pressed={activeRoDrawer === "subtasks"} onClick={() => toggleRoDrawer("subtasks")} type="button"><ListChecks />Subtasks <span>{roSubtasks.length}</span></button>
            <button aria-pressed={activeRoDrawer === "checklist"} onClick={() => toggleRoDrawer("checklist")} type="button"><ClipboardCheck />Checklist <span>{openSummaryChecklistCount}</span></button>
            <button aria-pressed={activeRoDrawer === "comments"} onClick={() => toggleRoDrawer("comments")} type="button"><MessageSquareText />Comments <span>{summaryCommentCount}</span></button>
            <button aria-pressed={activeRoDrawer === "fullTools"} onClick={() => toggleRoDrawer("fullTools")} type="button"><Grid3X3 />Full tools <span>{workspaceTabs.length}</span></button>
            <button aria-pressed={activeRoDrawer === "repairDetails"} onClick={() => toggleRoDrawer("repairDetails")} type="button"><Wrench />RO statistics <span>{repairDetailCount}</span></button>
          </nav>
          {activeRoDrawer ? (
            <section className="rowb-summary-drawer-panel">
              {activeRoDrawer === "progress" ? (
                <div className="rowb-summary-drawer-list">
                  <strong>Progress / Updates</strong>
                  {reportEvents.length ? reportEvents.map((event) => (
                    <p key={`${event.label}-${event.when}`}><span>{event.label}</span><b>{event.when}</b>{event.detail}</p>
                  )) : <p><span>Current record</span><b>Now</b>{stageSummary}</p>}
                  {linkedTask ? (
                    <p><span>Linked task</span><b>{format(linkedTask.status)}</b>{linkedTask.title}</p>
                  ) : null}
                </div>
              ) : null}
              {activeRoDrawer === "subtasks" ? (
                <div className="rowb-summary-drawer-list">
                  <strong>Subtasks</strong>
                  {roSubtasks.map((item) => (
                    <p className={item.complete ? "complete" : "open"} key={item.id}><i>{item.complete ? <Check /> : "!"}</i><span>{item.label}</span><b>{item.status}</b>{item.detail}</p>
                  ))}
                  <div className="rowb-summary-drawer-tools compact">
                    <Link href={planningHref}><Plus />Add repair work</Link>
                    <Link href={detailRoute}><FileText />Manage RO work</Link>
                  </div>
                </div>
              ) : null}
              {activeRoDrawer === "checklist" ? (
                <div className="rowb-summary-drawer-list">
                  <strong>Checklist</strong>
                  {summaryChecklist.map((item) => (
                    <p className={item.complete ? "complete" : "open"} key={item.label}><i>{item.complete ? <Check /> : "!"}</i><span>{item.label}</span><b>{item.complete ? "Done" : "Open"}</b>{item.detail}</p>
                  ))}
                </div>
              ) : null}
              {activeRoDrawer === "comments" ? (
                <div className="rowb-summary-drawer-list rowb-summary-comments">
                  <strong>Comments</strong>
                  <label>
                    <span>Add RO comment</span>
                    <textarea onChange={(event) => setRoCommentDraft(event.target.value)} placeholder="Add an internal repair-order comment..." value={roCommentDraft} />
                  </label>
                  <div className="rowb-summary-comment-actions">
                    <button disabled={roCommentSaving || roCommentDraft.trim().length < 2} onClick={() => void addRoComment()} type="button">{roCommentSaving ? "Saving..." : "Save comment"}</button>
                    {roCommentMessage ? <small>{roCommentMessage}</small> : null}
                  </div>
                  {roComments.length ? roComments.map((comment) => (
                    <p key={comment.id}><span>{comment.label}</span><b>{comment.when}</b>{comment.body} <small>{comment.author}</small></p>
                  )) : <p><span>RO comments</span><b>None yet</b>Add the first repair-order comment above.</p>}
                </div>
              ) : null}
              {activeRoDrawer === "fullTools" ? (
                <div className="rowb-summary-drawer-tools">
                  <Link href={calendarPlannerHref}>
                    <CalendarClock />
                    <span>
                      <strong>Calendar planner</strong>
                      <small>{linkedTask ? "Plan from linked task" : "Create appointment block"}</small>
                    </span>
                  </Link>
                  <button aria-expanded={reconReportOpen} aria-controls="recon-report" onClick={toggleReconReport} type="button"><Activity />Recon Report</button>
                  {workspaceTabs.map((tab) => (
                    <Link className={tab.recommended ? "recommended" : undefined} href={tab.href} key={`${tab.title}-${tab.href}`} onClick={tab.href === vendorProgressHref ? openVendorProgress : undefined}>
                      <span><strong>{tab.title}</strong><small>{tab.detail}</small></span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {activeRoDrawer === "repairDetails" ? (
                <div className="rowb-summary-details rowb-summary-details-panel" id="repair-order-details">
                  <article>
                    <small><CarFront /> Vehicle information</small>
                    <strong>{vehicle}</strong>
                    <dl>
                      <div><dt>Year / Make / Model</dt><dd>{vehicle}</dd></div>
                      <div><dt>Color</dt><dd>{vehicleColor || "Not recorded"}</dd></div>
                      <div><dt>VIN</dt><dd>{order.vehicle.vin ?? "Not recorded"}</dd></div>
                      <div><dt>Inventory / vehicle</dt><dd>{order.inventoryUnit?.inventoryNumber ?? order.vehicle.vehicleNumber}</dd></div>
                      <div><dt>In-service date</dt><dd>{date(order.openedAt)}</dd></div>
                    </dl>
                  </article>
                  <article>
                    <small><Wrench /> Vendor progress</small>
                    <strong>{latestVendorWork?.vendorName ?? "No vendor history recorded"}</strong>
                    <dl>
                      <div><dt>Vendor</dt><dd>{latestVendorWork?.vendorName ?? "Not recorded"}</dd></div>
                      <div><dt>Date received</dt><dd>{date(latestVendorWork?.sentAt)}</dd></div>
                      <div><dt>Target completion</dt><dd>{date(latestVendorWork?.expectedReturnAt)}</dd></div>
                      <div><dt>Days in stage</dt><dd>{duration(latestVendorWork?.sentAt)}</dd></div>
                      <div><dt>Last update</dt><dd>{date(latestVendorEvents[0]?.occurredAt ?? latestVendorWork?.sentAt)}</dd></div>
                      <div><dt>Status</dt><dd><em>{format(latestVendorWork?.status)}</em></dd></div>
                    </dl>
                  </article>
                  <article>
                    <small><ClipboardCheck /> Approved work</small>
                    <strong>{format(latestVendorWork?.approvalStatus)}</strong>
                    <dl>
                      <div><dt>Amount</dt><dd className="money">{vendorAmountLabel}</dd></div>
                      <div><dt>Approved by</dt><dd>{vendorApprovalActor ?? "Not recorded"}</dd></div>
                      <div><dt>Approved on</dt><dd>{vendorApprovedOn}</dd></div>
                      <div><dt>Revision</dt><dd>RO v{currentVersion}</dd></div>
                    </dl>
                  </article>
                  <article>
                    <small><ShieldAlert /> Repair outcome</small>
                    <strong>{vendorReadyForFinalQc ? "Vendor repaired and returned" : primaryActionLabel}</strong>
                    <dl>
                      <div><dt>Repairs completed</dt><dd>{vendorStatusDone ? "Yes" : "Pending"}</dd></div>
                      <div><dt>Quality check</dt><dd>{vendorReadyForFinalQc ? "Ready for pass/fail" : "Pending"}</dd></div>
                      <div><dt>Notes</dt><dd>{latestVendorWork?.lastUpdateSummary ?? primaryActionSummary}</dd></div>
                    </dl>
                    <Link href={vendorReadyForFinalQc ? finalQcHref : summaryPrimaryHref}>{summaryActionLabel}</Link>
                  </article>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
      ) : null}
      {fullDetailMode ? (
      <details className="rowb-advanced-detail" id="full-ro-details" onToggle={(event) => setAdvancedDetailOpen(event.currentTarget.open)} open={advancedDetailOpen}>
        <summary>
          <span>Full RO details and evidence tools</span>
          <small>Open source record, evidence forms, assignment, timing, audit, and deeper controls when needed.</small>
          <ChevronRight />
        </summary>
      <div className="rowb-legacy-detail-page" id="legacy-vehicle-card">
        <div className="rowb-official-detail-stack">
      <section className="rowb-print-document" id="repair-order-document" aria-label="Repair Order document">
        <header>
          <div>
            <small>Authoritative Repair Order</small>
            <h2>{order.repairOrderNumber}</h2>
            <span>RO Version {currentVersion} · {format(order.stage)}</span>
          </div>
          <div className="rowb-print-actions">
            <a href={`/api/repair-orders/${encodeURIComponent(order.id)}/print`} rel="noreferrer" target="_blank">
              <Printer />
              Print RO
            </a>
          </div>
        </header>
        <div className="rowb-document-grid">
          <dl>
            <div><dt>Vehicle</dt><dd>{vehicle}</dd></div>
            <div><dt>Color</dt><dd>{vehicleColor || "Not recorded"}</dd></div>
            <div><dt>VIN / vehicle ID</dt><dd>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</dd></div>
            <div><dt>{ownerLabel}</dt><dd>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work"}</dd></div>
            <div><dt>{currentLocationKind}</dt><dd>{currentLocationLabel}</dd></div>
          </dl>
          <dl>
            <div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div>
            <div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div>
            <div><dt>Assigned technician / owner</dt><dd>{currentOwner.name}</dd></div>
            <div><dt>Next action</dt><dd>{displayedNextAction}</dd></div>
          </dl>
        </div>
        {vehicleToolLinks()}
        {vehicleColorEditor}
        <section className="rowb-location-workflow" aria-label="Location and workflow correction">
          <header>
            <MapPin />
            <div>
              <small>Location / workflow correction</small>
              <strong>{activeVendorWork && !useInternalRecon ? "Outside vendor workflow is active" : "Internal recon workflow"}</strong>
              <span>{activeVendorWork && !useInternalRecon ? "Update vendor status, ETA, and next action here. If our team is taking over the remaining work, preserve the vendor history and continue internally below." : "Use this when our staff are repairing the vehicle internally. Keep parts, job creation, repair progress, and Final QC on this same RO."}</span>
            </div>
          </header>
          {showingInternalRecon ? (
            <div className="rowb-internal-recon-path">
              <Wrench />
              <div>
                <strong>Vehicle is being repaired internally</strong>
                <span>Continue with the internal chain: create or update the repair job, track parts, record repair progress, then open Final QC.</span>
              </div>
              <Link href={partsWorkspaceHref}>Open internal repair and parts <ChevronRight /></Link>
            </div>
          ) : null}
          {showingInternalRecon && preservedVendorHistoryWork ? (
            <div className="rowb-preserved-vendor-path">
              <Building2 />
              <div>
                <strong>Outside vendor history preserved</strong>
                <span>{preservedVendorHistoryWork.vendorName} remains on this RO as a prior vendor leg. Last vendor update: {preservedVendorHistoryWork.lastUpdateSummary}</span>
                <span>Next internal action: {preservedVendorHistoryWork.nextAction}</span>
              </div>
              <small>{format(preservedVendorHistoryWork.status)} · {date(preservedVendorHistoryWork.expectedReturnAt ?? preservedVendorHistoryWork.sentAt)}</small>
            </div>
          ) : null}
          {needsFollowUpVendor && activeVendorWork ? (
            <div className="rowb-follow-up-vendor-path">
              <Wrench />
              <div>
                <strong>{activeVendorWork.vendorName} returned the vehicle unfinished</strong>
                <span>Use a new outside-vendor record for the follow-up shop so the original vendor history stays intact and the next repair path is documented on this same RO.</span>
              </div>
              <Link href="#follow-up-vendor-documentation">Add follow-up vendor <ChevronRight /></Link>
            </div>
          ) : null}
          {additionalVendorDraft ? (
            <div className="rowb-follow-up-vendor-path">
              <Building2 />
              <div>
                <strong>Another facility also worked on this RO?</strong>
                <span>Add a separate outside-vendor record so each shop appears in its own ledger and can be paid for its portion of the repair.</span>
              </div>
              <Link href="#additional-vendor-documentation">Add additional vendor <ChevronRight /></Link>
            </div>
          ) : null}
          <div id="vendor-repair-progress">
            <OutsideRepairWorkPanel
              accountableLocation={order.location.name}
              defaultOpen={false}
              draft={vendorCorrectionDraft}
              internalReconHref={partsWorkspaceHref}
              openOnHash="vendor-repair-progress"
              onUseInternalRecon={() => setUseInternalRecon(true)}
              repairOrderId={order.id}
              work={activeVendorWork && !useInternalRecon ? vendorWorkForEditor(activeVendorWork) : null}
            />
          </div>
          {followUpVendorDraft ? (
            <div id="follow-up-vendor-documentation">
              <OutsideRepairWorkPanel
                defaultOpen={false}
                draft={followUpVendorDraft}
                repairOrderId={order.id}
                work={null}
              />
            </div>
          ) : null}
          {additionalVendorDraft ? (
            <div id="additional-vendor-documentation">
              <OutsideRepairWorkPanel
                defaultOpen={false}
                draft={additionalVendorDraft}
                repairOrderId={order.id}
                work={null}
              />
            </div>
          ) : null}
        </section>
          <article>
            <small>{isInventoryRecon ? "Recon concern captured at intake" : "Concern captured at intake"}</small>
            <p>{concernSummary}</p>
          </article>
        {intakeNotes ? (
            <article>
              <small>Advisor / intake notes</small>
              <p>{intakeNotes}</p>
            </article>
          ) : null}
        <footer>
          <div>
            <strong>Technician use</strong>
            <span>{diagnosticCase ? `Use this RO as the governing record. Diagnostic Record v${diagnosticCase.version} preserves the technician's tests, evidence, and findings.` : `This RO Version ${currentVersion} preserves the intake concern and remains the governing record for technician evidence and findings.`}</span>
          </div>
          <div>
            <strong>Authorization boundary</strong>
            <span>{authorizationBoundaryText}</span>
          </div>
        </footer>
      </section>
      {(activeVendorWork || diagnosis) ? (
        <section className="panel-card page-stack" aria-label="Current step">
          <header className="page-copy">
            <span className="eyebrow">{vendorWaitingParts ? "Outside vendor blocked" : activeVendorWork ? "Outside vendor active" : "Diagnosis complete"}</span>
            <h2>{stageHeadline}</h2>
            <p>{stageSummary}</p>
          </header>
          <div className="form-actions">
            <Link className="button button-primary" href={primaryActionHref}>
              {vendorWaitingParts ? "Open Parts Workspace" : primaryActionLabel}
            </Link>
            <Link className="button button-secondary" href={reviewAnchorHref}>
              {reviewAnchorLabel}
            </Link>
          </div>
          <p>{stageSupport}</p>
        </section>
      ) : null}
      {relatedDraftPurchaseOrders.length ? (
        <section className="panel-card page-stack" aria-label="Manager purchase approval">
          <header className="page-copy">
            <span className="eyebrow">Manager approval needed</span>
            <h2>Approve purchase order for this vehicle</h2>
            <p>These draft purchase orders are still waiting on manager approval before parts receiving can continue.</p>
          </header>
          <div className="settings-overview-grid">
            {relatedDraftPurchaseOrders.map((item) => (
              <article className="settings-callout-card" key={item.id}>
                <strong>{item.purchaseOrderNumber}</strong>
                <p>{item.vendor?.name ?? "Vendor"} · {item.orderedTotalCents != null ? `$${(item.orderedTotalCents / 100).toFixed(2)}` : "Amount pending"}</p>
                <small>Approval age {date(item.createdAt)}</small>
                <div className="form-actions">
                  <button className="button button-primary" disabled={busy} onClick={() => void approveRelatedPurchaseOrder(item)} type="button">
                    Approve purchase order
                  </button>
                  <Link className="button button-secondary" href={partsWorkspaceHref}>
                    Open Parts Workspace
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : relatedApprovedPurchaseOrders.length ? (
        <section className="panel-card page-stack" aria-label="Purchase approval status">
          <header className="page-copy">
            <span className="eyebrow">Approval complete</span>
            <h2>Manager approval is already on file</h2>
            <p>Any remaining parts blocker is likely operational, such as missing part number, stock location, receiving detail, or vendor delivery evidence.</p>
          </header>
          <div className="form-actions">
            <Link className="button button-primary" href={partsWorkspaceHref}>
              Open Parts Workspace
            </Link>
          </div>
        </section>
      ) : null}
      <RepairOrderDiagnosticsBridge bridge={diagnostics ?? { state: "UNAVAILABLE", repairOrderId: order.id, reason: "Diagnostics bridge was not supplied." }} />
      <div className="rowb-layout">
        <aside className="rowb-context">
          <section><h2><UserRound />{primaryContactLabel}</h2><strong>{order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "No customer linked"}</strong><span>{vehicle}</span><small>{order.vehicle.vin ?? order.vehicle.vehicleNumber}</small></section>
          <section><h2><KeyRound />Appointment &amp; Custody</h2><dl><div><dt>Appointment</dt><dd>{order.serviceVisit.appointmentId ? "Matched" : "Walk-in"}</dd></div><div><dt>Keys</dt><dd>{order.serviceVisit.keysReceivedCount} · {order.serviceVisit.keyTag ?? "No tag"}</dd></div><div><dt>Transportation</dt><dd>{format(order.serviceVisit.transportMode)}</dd></div><div><dt>Arrived</dt><dd>{date(order.serviceVisit.arrivedAt)}</dd></div></dl></section>
          <section><h2><Gauge />Intake Completeness</h2><div className="rowb-readiness"><b>{readyCount}/{intakeChecks.length}</b><span>Required facts complete</span></div>{intakeChecks.map(([label, passed]) => <p className={passed ? "pass" : "pending"} key={label}><i>{passed ? <Check /> : "!"}</i>{label}</p>)}<div className="rowb-context-note"><strong>{isInventoryRecon ? "Inventory path" : capacityEvidence ? "Live capacity checked" : "Capacity snapshot optional"}</strong><span>{readinessNote}</span></div></section>
          <section><h2><CalendarClock />Advisor Commitment</h2><dl><div><dt>Owner</dt><dd>{currentOwner.name}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next action</dt><dd>{displayedNextAction}</dd></div></dl></section>
          <section><h2><CalendarClock />Flow Clock</h2><dl><div><dt>Total open time</dt><dd>{duration(order.openedAt)}</dd></div><div><dt>Current stage time</dt><dd>{duration(order.stageStartedAt)}</dd></div><div><dt>Approval wait</dt><dd>{estimate && !authorization ? duration(order.stageStartedAt) : authorization ? "Approved" : "Not in approval"}</dd></div></dl></section>
          <section><h2><Activity />Location context</h2><dl><div><dt>{currentLocationKind}</dt><dd>{currentLocationLabel}</dd></div><div><dt>Home / accountable site</dt><dd>{order.location.name}</dd></div>{activeVendorWork ? <div><dt>Vendor status</dt><dd>{format(activeVendorWork.status)}</dd></div> : null}</dl></section>
          <section><h2><Activity />Traceability</h2><p><i>{capacityEvidence ? <Check /> : "–"}</i>{capacityEvidence ? "Capacity snapshot linked" : isInventoryRecon ? "Inventory intake path recorded" : "Capacity snapshot not required"}</p><p><i><Check /></i>Immutable intake evidence</p><p><i><Check /></i>Exact repair-order version</p></section>
        </aside>
        <main className="rowb-main">
          <nav className="rowb-tabs"><a className="active" href="#concerns">Concerns</a><a href="#inspection">Inspection</a><a href="#diagnosis">Diagnosis</a><a href="#estimate">Estimate</a><a href="#jobs">Jobs</a><a href="#quality">QC</a><a href="#timeline">Timeline</a></nav>
          <div className="rowb-actions"><span>{activeVendorWork ? `Offsite · ${format(activeVendorWork.status)}` : order.operatingState === "ACTIVE" ? "Active work order" : format(order.operatingState)}</span><button aria-expanded={reconReportOpen} aria-controls="recon-report" onClick={toggleReconReport} type="button"><Activity /> Recon Report</button><Link href={primaryActionHref} onClick={primaryActionHref === vendorProgressHref ? openVendorProgress : undefined}>{vendorWaitingParts ? "Open Parts Control" : "Review Plan"}</Link><Link className="primary" href={primaryActionHref} onClick={primaryActionHref === vendorProgressHref ? openVendorProgress : undefined}>{primaryActionLabel} <ChevronRight /></Link></div>
          <section className="rowb-transition-strip" aria-label="Contextual next-step workspaces">
            <header>
              <strong>Next step workspaces</strong>
              <span>Use these when the current card cannot move the work to the next stage on its own.</span>
            </header>
            <div className="rowb-transition-grid">
              {workspaceTabs.map((tab) => (
                <Link className={tab.recommended ? "recommended" : undefined} href={tab.href} key={`${tab.title}-${tab.href}`} onClick={tab.href === vendorProgressHref ? openVendorProgress : undefined}>
                  <small>{tab.recommended ? "Recommended next" : "Available next"}</small>
                  <strong>{tab.title}</strong>
                  <span>{tab.detail}</span>
                </Link>
              ))}
            </div>
          </section>
          <section className={`rowb-concern ${safetyReview ? "safety" : ""}`} id="concerns"><header><b>1</b><div><small>{concernLabel} · source evidence from intake</small><h2>{concernSummary}</h2></div>{safetyReview ? <em><ShieldAlert />Safety review</em> : <em>Standard triage</em>}</header>
            <div className="rowb-plan" id={hasOffsiteVendorWithoutDiagnosis ? "vendor-dispatch" : undefined}><header><div><h3>{referencePanelTitle}</h3><span>{referencePanelSubtitle}</span></div><b>{referencePanelBadge}</b></header>
              <div className="rowb-plan-head"><span>Step</span><span>Objective</span><span>Owner</span><span>Evidence required</span><span>Status</span></div>
              {referencePlan.map((item, index) => <article key={item.label}><i>{diagnosis || hasOffsiteVendorWithoutDiagnosis ? <Check /> : index + 1}</i><strong>{item.label}</strong><span>{item.objective}</span><span>{diagnosis?.technicianUser.name ?? currentOwner.name}</span><span>{item.evidence}</span><b>{diagnosis ? "Recorded" : hasOffsiteVendorWithoutDiagnosis ? "Vendor managed" : "Not started"}</b></article>)}
              <footer><AlertTriangle />{referenceFooter}</footer>
            </div>
          </section>
          <section className="rowb-evidence-review" id="inspection" aria-label="Initial Recon Evidence Form">
            <header>
              <div>
                <small>Initial recon inspection · review form</small>
                <h2>Capture evidence before estimate and approval</h2>
                <p>Same evidence pattern as Final QC, but focused on what is wrong before repair starts.</p>
              </div>
              <b>Review only</b>
            </header>
            <div className="rowb-evidence-grid">
              <fieldset>
                <legend><ScanLine /> Diagnostic codes</legend>
                <label><span>Code / module</span><input placeholder="Example: P0301, ABS C0035, SRS B1234" /></label>
                <label><span>Status</span><select defaultValue="ACTIVE"><option>ACTIVE</option><option>HISTORY</option><option>PENDING</option><option>NOT PRESENT AFTER CLEAR</option></select></label>
                <label><span>Required action</span><textarea placeholder="Record scan result, warning light, freeze-frame note, and next test." rows={3} /></label>
              </fieldset>
              <fieldset>
                <legend><CarFront /> Body and exterior</legend>
                <label><span>Area</span><select defaultValue="Rear bumper"><option>Front bumper</option><option>Rear bumper</option><option>Hood</option><option>Left side</option><option>Right side</option><option>Glass / lights</option><option>Wheels / tires</option></select></label>
                <label><span>Condition</span><select defaultValue="Broken / cracked"><option>OK</option><option>Scratched</option><option>Dented</option><option>Broken / cracked</option><option>Missing</option><option>Needs paint</option><option>Needs replacement</option></select></label>
                <label><span>Evidence note</span><textarea placeholder="Example: rear bumper cover cracked; replacement likely required." rows={3} /></label>
              </fieldset>
              <fieldset>
                <legend><Wrench /> Mechanical findings</legend>
                <label><span>System</span><select defaultValue={safetyReview ? "Brakes / safety" : "General inspection"}><option>Brakes / safety</option><option>Engine</option><option>Transmission</option><option>Suspension / steering</option><option>Electrical</option><option>Interior / comfort</option><option>General inspection</option></select></label>
                <label><span>Severity</span><select defaultValue={safetyReview ? "Critical" : "Repair required"}><option>Critical</option><option>Repair required</option><option>Monitor</option><option>Cosmetic</option></select></label>
                <label><span>Finding</span><textarea placeholder="Record symptom, measurement, road-test result, and recommended correction." rows={3} /></label>
              </fieldset>
              <fieldset>
                <legend><Camera /> Photos and evidence</legend>
                <div className="rowb-evidence-checks">
                  {["VIN / odometer", "Dash warning lights", "Exterior damage", "Brake / wheel evidence", "Before repair overview", "Scan report"].map((item) => <label key={item}><input type="checkbox" /> <span>{item}</span></label>)}
                </div>
                <p>Photo upload will be wired after this review surface is approved. For now, this defines the required evidence groups.</p>
              </fieldset>
            </div>
            <div className="rowb-evidence-suggestions">
              <header><strong>Auto work-plan starter</strong><span>Generated from the intake concern for review before approval.</span></header>
              {evidenceSuggestions.map((item) => (
                <article key={`${item.category}-${item.finding}`}>
                  <b>{item.severity}</b>
                  <span><strong>{item.category}</strong>{item.finding}</span>
                  <p>{item.requirement}</p>
                </article>
              ))}
            </div>
            <footer>
              <div>
                <strong>Sellability gate</strong>
                <span>{safetyReview ? "Do not move to approval until safety evidence is reviewed." : "Move forward only after required evidence is captured."}</span>
              </div>
              <button type="button" onClick={() => setEvidencePreviewOpen((open) => !open)}>{evidencePreviewOpen ? "Hide Work Plan Draft" : "Review Work Plan Draft"}</button>
            </footer>
            {evidencePreviewOpen ? (
              <aside className="rowb-evidence-preview" aria-live="polite">
                <strong>Draft only · not saved</strong>
                <p>{evidenceSuggestions.map((item) => `${item.category}: ${item.finding}`).join(" · ")}</p>
                <span>This draft becomes the estimate starter after you approve the evidence form design.</span>
              </aside>
            ) : null}
          </section>
          <section className="rowb-finding" id="diagnosis"><header><h2>{diagnosis ? `Current diagnosis · version ${diagnosis.version}` : hasOffsiteVendorWithoutDiagnosis ? "Offsite vendor path" : "Diagnosis"}</h2><span>{diagnosis ? `${format(diagnosis.uncertainty)} uncertainty` : hasOffsiteVendorWithoutDiagnosis ? "Vendor-managed while offsite" : "Not yet recorded"}</span></header>{diagnosis ? <dl><div><dt>Confirmed cause</dt><dd>{diagnosis.cause}</dd></div><div><dt>Recommendation</dt><dd>{diagnosis.recommendation}</dd></div><div><dt>Proposed correction</dt><dd>{diagnosis.proposedCorrection}</dd></div><div><dt>Technician</dt><dd>{diagnosis.technicianUser.name}</dd></div></dl> : hasOffsiteVendorWithoutDiagnosis ? <dl><div><dt>Dispatch origin</dt><dd>{activeVendorWork?.sentFrom ?? "Dealership"}</dd></div><div><dt>Transportation</dt><dd>{activeVendorWork?.transportMethod ?? "Not recorded"}</dd></div><div><dt>Outside vendor</dt><dd>{activeVendorWork?.vendorName ?? "Not recorded"}</dd></div><div><dt>Scope</dt><dd>{activeVendorWork?.scope ?? "Not recorded"}</dd></div></dl> : <p>Release the repair order to Planning &amp; Diagnosis to record evidence, tests, cause, uncertainty, recommendation, and proposed correction.</p>}</section>
          <div className="rowb-stage-cards"><article><ClipboardCheck /><span>Inspection</span><strong>{order.inspectionVersions.length ? `${order.inspectionVersions.length} version(s)` : hasOffsiteVendorWithoutDiagnosis ? "Vendor-managed offsite" : "Review form ready"}</strong></article><article id="estimate"><FileText /><span>Estimate</span><strong>{estimate ? `v${estimate.version} · $${(estimate.totalCents / 100).toFixed(2)}` : hasOffsiteVendorWithoutDiagnosis ? "Awaiting vendor estimate" : "Pending evidence"}</strong></article><article><LockKeyhole /><span>Authorization</span><strong>{authorization?.disposition ?? hasOffsiteVendorWithoutDiagnosis ? "Awaiting vendor approval" : "Pending estimate"}</strong></article><article id="jobs"><Wrench /><span>Repair Jobs</span><strong>{order.repairJobs.length ? `${order.repairJobs.length} job(s)` : hasOffsiteVendorWithoutDiagnosis ? "Waiting on vendor release" : "Pending authorization"}</strong></article><article id="quality"><ShieldAlert /><span>Quality Check</span><strong>{hasOffsiteVendorWithoutDiagnosis ? "After vendor return" : "Pending repairs"}</strong></article></div>
          <section className="rowb-finding" id="timeline"><header><h2>Repair-order timeline</h2><span>Exact version {currentVersion}</span></header><dl><div><dt>Opened</dt><dd>{date(order.openedAt)}</dd></div><div><dt>Current stage</dt><dd>{format(order.stage)}</dd></div><div><dt>Current stage clock</dt><dd>{duration(order.stageStartedAt)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Next accountable action</dt><dd>{displayedNextAction}</dd></div></dl></section>
        </main>
        <aside className="rowb-command">
          <section className="rowb-workflow-gate"><h2>Workflow Gate</h2><div className="rowb-gate"><b>{readyCount}/{intakeChecks.length}</b><span>{workflowGateLabel}</span></div>{vendorWaitingParts ? <p className="danger"><AlertTriangle />Outside repair is paused because the vendor is waiting on dealership-supplied parts.</p> : vendorNeedsInternalCompletion ? <p className="danger"><AlertTriangle />Dealership QC failed the outside-vendor return. Create the missing completion work on this same RO.</p> : vendorReadyForFinalQc ? <p className="success"><Check />The vehicle has returned from the outside vendor and is ready for Final QC.</p> : activeVendorWork ? <p className="success"><Check />The vehicle is already in outside repair. Keep the vendor status, ETA, and return requirements current.</p> : safetyReview ? <p className="danger"><ShieldAlert />Begin with a safety inspection before operating or road-testing this vehicle.</p> : diagnosis ? <p className="success"><Check />Diagnosis has been recorded. The next step is to continue estimate, approval, and repair coordination.</p> : intakeReady ? <p className="success"><Check />Intake is complete. Diagnosis is the next step.</p> : <p className="danger"><AlertTriangle />Complete the highlighted intake facts before diagnosis.</p>}<Link className="rowb-gate-action" href={primaryActionHref} onClick={primaryActionHref === vendorProgressHref ? openVendorProgress : undefined}>{workflowGateActionLabel}<ChevronRight /></Link><small>{vendorWaitingParts ? "Use the parts workspace to approve, receive, and record delivery of vendor-requested parts." : vendorNeedsInternalCompletion ? "Open Repair Planning, choose the internal path that fits the missing work, then create the follow-up job under this RO." : vendorReadyForFinalQc ? "Open Final QC to pass/fail the returned vendor repair, complete recon, and hand off the vehicle." : activeVendorWork ? "Use this workbench to record vendor progress, confirm expected return, and shift to parts control whenever the vendor is waiting on dealership-supplied parts." : diagnosis ? "Diagnosis is already on file, so the work should move through estimate, approval, parts, and repair governance." : commitmentFollowUp}</small></section>
          <section id="assignment"><h2>Assignment &amp; Capacity</h2><label><span>Accountable owner / technician</span><select aria-label="Accountable owner or technician" disabled={busy} onChange={(event) => { setOwnerUserId(event.target.value); setNotice(""); }} value={ownerUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button disabled={busy || !assignmentChanged} onClick={() => void assignOwner()} type="button">{busy ? "Saving Assignment…" : assignmentChanged ? `Assign to ${selectedOwner?.name}` : `Assigned to ${currentOwner.name}`}</button><p>{assignmentChanged ? `Save to make ${selectedOwner?.name} accountable for this repair order.` : `${currentOwner.name} is already assigned. Select a different person to change the assignment.`}</p><dl><div><dt>Current owner</dt><dd>{currentOwner.name}</dd></div><div><dt>Location</dt><dd>{order.location.name}</dd></div><div><dt>Parts demand</dt><dd>{order.partDemands.length}</dd></div></dl></section>
          <section><h2>What happens next</h2><ol className="rowb-next-steps">{nextSteps.map((step, index) => <li className={step.current ? "current" : undefined} key={step.title}><b>{index + 1}</b><span><strong>{step.title}</strong>{step.detail}</span></li>)}</ol></section>
          <section><h2>SLA / Promise Risk</h2><dl><div><dt>Promise</dt><dd>{date(order.serviceVisit.promisedAt)}</dd></div><div><dt>Target</dt><dd>{date(order.targetAt)}</dd></div><div><dt>Operating state</dt><dd>{format(order.operatingState)}</dd></div><div><dt>Stage clock</dt><dd>{duration(order.stageStartedAt)}</dd></div></dl></section>
          <section className="rowb-next"><h2>Do this now</h2><Wrench /><strong>{primaryActionLabel}</strong><span>{primaryActionSummary}</span><Link href={primaryActionHref} onClick={primaryActionHref === vendorProgressHref ? openVendorProgress : undefined}>{primaryActionLabel}</Link>{vendorCanOpenFinalQc && primaryActionHref !== finalQcHref ? <Link className="secondary" href={finalQcHref}>Open Final QC</Link> : null}</section>
        </aside>
      </div>
        </div>
      </div>
      </details>
      ) : null}
      <footer className="rowb-footer"><span><ShieldAlert />{promiseGuardrailLabel}</span><div>{returnTo ? <Link href={returnTo}>{returnLabel ?? "Source Workspace"}</Link> : null}<Link href="/vehicles/shop-recon">Shop &amp; Recon</Link><Link href="/vehicles/repair-workbench?view=all">All Repair Orders</Link>{vendorCanOpenFinalQc && primaryActionHref !== finalQcHref ? <Link href={finalQcHref}>Open Final QC</Link> : null}<Link className="primary" href={footerPrimaryHref} onClick={footerPrimaryClick}>{vendorWaitingParts ? "Open Parts Workspace" : primaryActionLabel}</Link></div></footer>
    </section>
  );
}
