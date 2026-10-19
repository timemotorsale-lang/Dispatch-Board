"use client";

import { ArrowLeft, BadgeCheck, Building2, CarFront, Check, ChevronRight, ClipboardCheck, FileCheck2, Gauge, LockKeyhole, PackageCheck, ShieldCheck, Stethoscope, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { buildReconBudgetSummary, formatMoneyCents } from "@/lib/recon-budget";
import { copyEstimateForRevision, type RevisableEstimate } from "@/lib/estimate-revision";
import { emptyManualLaborReview, estimateReviewScope } from "@/lib/estimate-review";
import { estimateControlsScope, initialEstimatePricing, type EstimateControls } from "@/lib/labor-guide-controls";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { laborOperationForLineKey } from "@/lib/labor-catalog-selection";
import { EstimateControlsPanel } from "@/features/diagnostics/estimate-controls-panel";
import { EstimatePriceCorrection } from "./estimate-price-correction";
import styles from "./shop-planning-workspace.module.css";

type Line = { key: string; type: "LABOR" | "PART" | "FEE"; description: string; quantity: number; unitPriceCents: number; taxable: boolean; workTypeCode: string; laborGuideMinutes: number; plannedCorrection: string };
type AdvisorUpdate = { id: string; version: number; statusCode: string; promiseAt: string | null; contactChannel: string; contactDirection: string; contactOutcome: string; customerVisibleSummary: string; internalNotes: string | null; nextContactAt: string | null; occurredAt: string; authorUser: { name: string } };
type RepairVendorWork = {
  approvalStatus: string;
  approvedAmountCents?: number | null;
  currentLocation: string;
  directFromSource?: boolean;
  estimateAmountCents?: number | null;
  expectedReturnAt: string | null;
  id: string;
  keysCustodian?: string | null;
  lastUpdateSummary: string;
  nextAction: string;
  nextFollowUpAt?: string | null;
  scope: string;
  sentFrom?: string | null;
  status: string;
  supplementalAmountCents?: number | null;
  transportMethod?: string | null;
  vendorName: string;
};
type Order = {
  id: string; repairOrderNumber: string; version: number; stage: string; updatedAt: string;
  vehicle: { id: string; vehicleNumber: string; vin: string | null; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: {
    acquisitionAppraisals: Array<{ estimatedReconCents?: number | null; estimatedRetailCents?: number | null }>;
    acquisitionCase: { appraisalSnapshot?: Record<string, unknown> | null; recommendationSnapshot?: Record<string, unknown> | null } | null;
    costEntries: Array<{ amountCents: number; category?: string | null; currency?: string | null; recoveredAt?: string | null; status?: string | null }>;
    id: string;
    inventoryNumber: string;
    lifecycleStage: string;
    nextAction: string;
    operatingState: string;
    ownerUser: { id: string; name: string };
    stateReason: string | null;
    targetAt: string | null;
    version: number;
  } | null;
  serviceVisit: { arrivedAt: string; concernSummary: string };
  advisorUpdates: AdvisorUpdate[];
  vendorWorks: RepairVendorWork[];
  inspectionVersions: Array<{ id: string; version: number; summary: string; completedAt: string }>;
  diagnosisVersions: Array<{ id: string; version: number; cause: string; proposedCorrection: string; uncertainty: string; technicianUser: { name: string } }>;
  estimateVersions: Array<RevisableEstimate & { status: string; totalCents: number; expiresAt: string; authorizations: Array<{ id: string; disposition: string; authorizedLineKeys: string[]; authorizedAmountCents: number; decisionActorName: string }> }>;
  repairJobs: Array<{ id: string; jobNumber: string; authorizedLineKey: string; description: string; status: string; readinessReasonCodes: string[]; partDemands: Array<{ part: { partNumber: string }; quantityRequired: number; quantityReserved: number }> }>;
  partDemands: Array<{ id: string; repairJobId: string | null; quantityRequired: number; quantityReserved: number; part: { partNumber: string; description: string } }>;
};
type Model = { repairOrders: Order[]; users: Array<{ id: string; name: string }> };
type RepairPath = "DIAGNOSTIC" | "DIRECT_BODY" | "VENDOR";
type LaborGuideOption = { description: string; key: string; minutes: number; plannedCorrection: string; source: string; title: string; unitPriceCents: number; workTypeCode: string };
type ReleaseJobDraft = {
  authorizationId: string;
  authorizedLineKey: string;
  description: string;
  laborGuideMinutes: number;
  partDemandIds: string[];
  partsRequired: boolean;
  plannedCorrection: string;
  workTypeCode: string;
};
type EstimateDraft = {
  lineKey: string;
  lineType: "LABOR" | "PART" | "FEE";
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxable: boolean;
  workTypeCode: string;
  laborGuideMinutes: number;
  plannedCorrection: string;
  taxCents: number;
  discountCents: number;
  taxBoundary: string;
  presentationChannel: string;
  presentedAt: string;
  expiresAt: string;
};
type ClearanceResult = "PASS" | "ADVISORY" | "FAIL" | "NOT_APPLICABLE";
type ClearanceStatus = "CLEARED" | "NEEDS_PROOF" | "REQUIRED" | "NOT_CHECKED" | "OPTIONAL";
type ClearanceItem = {
  detail: string;
  key: string;
  label: string;
  proof: string;
  required: boolean;
  result: ClearanceResult;
  status: ClearanceStatus;
};

const local = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const daysAfter = (value: string | Date, days: number) => local(new Date(new Date(value).getTime() + days * 86_400_000).toISOString());
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const format = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const readableDateTime = (value: string | Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const vehicleLabel = (order: Order) => [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
const directRepairPattern = /\b(body|bodywork|collision|bumper|fender|paint|mirror|dent|hail|panel|cosmetic)\b/i;
const bodyworkRepairDefaults = (concern = "Visible bodywork damage") => ({
  proposedCorrection: "Repair the documented bodywork damage, then verify panel fit, finish, and repair quality.",
  recommendation: "Prepare a bodywork repair estimate from the documented visible damage.",
  scopeSummary: concern,
});
const directRepairRecorded = (order?: Order) => Boolean(order?.diagnosisVersions[0]?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis."));
const activeVendorWork = (order?: Order) => order?.vendorWorks.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? null;
const defaultRepairPath = (order?: Order): RepairPath => activeVendorWork(order) ? "VENDOR" : directRepairRecorded(order) || directRepairPattern.test(order?.serviceVisit.concernSummary ?? "") ? "DIRECT_BODY" : "DIAGNOSTIC";
const vendorStatuses = ["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"] as const;
const vendorApprovalStatuses = ["NEEDS_DOCUMENTATION", "PENDING", "APPROVED", "DECLINED", "NOT_REQUIRED"] as const;
const vendorEstimateCaptured = (work?: RepairVendorWork | null) => Boolean(work && (work.estimateAmountCents != null || ["APPROVAL_NEEDED", "SUPPLEMENT_NEEDED", "WAITING_PARTS", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status)));
const vendorApprovalCaptured = (work?: RepairVendorWork | null) => Boolean(work && ["APPROVED", "NOT_REQUIRED"].includes(work.approvalStatus));
const vendorRepairReturned = (work?: RepairVendorWork | null) => Boolean(work && ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status));
const vendorRepairFailed = (work?: RepairVendorWork | null) => Boolean(work && /\b(fail|failed|incomplete|not complete|not completed|not fixed|did not complete|problem still|still persists|rework|follow-up|decision)\b/i.test(`${work.lastUpdateSummary} ${work.nextAction}`));
const centsText = (value?: number | null) => value == null ? "" : String(value);
const createEstimateDraft = (presentedAt: string, expiresAt: string, lineKey = "LINE-1"): EstimateDraft => ({
  lineKey,
  lineType: "LABOR",
  description: "",
  quantity: 1,
  unitPriceCents: 0,
  taxable: false,
  workTypeCode: "GENERAL_REPAIR",
  laborGuideMinutes: 60,
  plannedCorrection: "",
  taxCents: 0,
  discountCents: 0,
  taxBoundary: "Taxes are calculated by the configured financial system boundary.",
  presentationChannel: "IN_PERSON",
  presentedAt,
  expiresAt,
});
const buildLaborGuideOptions = (order: Order | undefined, latestDiagnosis: Order["diagnosisVersions"][number] | undefined, directPath: boolean): LaborGuideOption[] => {
  const concern = order?.serviceVisit.concernSummary || "Repair concern";
  const correction = latestDiagnosis?.proposedCorrection || (directPath ? "Repair visible body or collision damage from the approved scope." : "Perform the verified repair from the recorded diagnosis.");
  const diagnosisDescription = latestDiagnosis?.cause ? `${latestDiagnosis.cause} — ${correction}` : correction;
  const base: LaborGuideOption[] = [
    { description: diagnosisDescription, key: "diagnosis-correction", minutes: directPath ? 120 : 60, plannedCorrection: correction, source: latestDiagnosis ? "Diagnosis recommendation" : "Repair scope", title: "Use recorded correction", unitPriceCents: directPath ? 30000 : 15000, workTypeCode: directPath ? "BODY_REPAIR" : "DIAGNOSTIC_REPAIR" },
    { description: `Inspect, verify, and prepare estimate for: ${concern}`, key: "verify-estimate", minutes: 30, plannedCorrection: "Verify the concern, confirm the repair operation, and prepare the estimate line.", source: "Labor Guide helper", title: "Verification / estimate setup", unitPriceCents: 7500, workTypeCode: "INSPECTION_ESTIMATE" },
  ];
  return directPath ? [
    ...base,
    { description: `Body / collision labor for: ${concern}`, key: "body-collision-labor", minutes: 180, plannedCorrection: correction, source: "Body Labor Guide", title: "Body / collision labor", unitPriceCents: 45000, workTypeCode: "BODY_COLLISION" },
    { description: `Teardown and supplement check for: ${concern}`, key: "teardown-supplement", minutes: 60, plannedCorrection: "Perform teardown, document hidden damage, and create a supplement only if new evidence is found.", source: "Body Labor Guide", title: "Teardown / supplement check", unitPriceCents: 15000, workTypeCode: "TEARDOWN_SUPPLEMENT" },
  ] : [
    ...base,
    { description: `Mechanical repair labor for: ${concern}`, key: "mechanical-repair", minutes: 90, plannedCorrection: correction, source: "Mechanical Labor Guide", title: "Mechanical repair labor", unitPriceCents: 22500, workTypeCode: "MECHANICAL_REPAIR" },
    { description: `Warning-light or electrical repair labor for: ${concern}`, key: "warning-light-electrical", minutes: 60, plannedCorrection: correction, source: "Mechanical Labor Guide", title: "Warning light / electrical", unitPriceCents: 15000, workTypeCode: "ELECTRICAL_DIAG_REPAIR" },
  ];
};
const seedVendorProgress = (work?: RepairVendorWork | null, order?: Order) => ({
  approvalStatus: work?.approvalStatus ?? "NEEDS_DOCUMENTATION",
  approvedAmountCents: centsText(work?.approvedAmountCents),
  currentLocation: work?.currentLocation ?? work?.vendorName ?? "",
  customerVisibleSummary: work ? `Vendor update from ${work.vendorName}: ${work.lastUpdateSummary}` : "",
  directFromSource: work?.directFromSource ?? false,
  estimateAmountCents: centsText(work?.estimateAmountCents),
  evidence: "",
  expectedReturnAt: work?.expectedReturnAt ? local(work.expectedReturnAt) : "",
  internalNotes: "",
  keysCustodian: work?.keysCustodian ?? work?.vendorName ?? "",
  lastUpdateSummary: work?.lastUpdateSummary ?? "Vendor progress updated.",
  nextAction: work?.nextAction ?? "Confirm vendor progress, parts needs, and expected return.",
  nextFollowUpAt: work?.nextFollowUpAt ? local(work.nextFollowUpAt) : "",
  scope: work?.scope ?? order?.serviceVisit.concernSummary ?? "",
  sentFrom: work?.sentFrom ?? "Dealership",
  status: work?.status ?? "AT_VENDOR",
  supplementalAmountCents: centsText(work?.supplementalAmountCents),
  transportMethod: work?.transportMethod ?? "Internal transport"
});
const progressStatuses = [
  { value: "REPAIR_IN_PROGRESS", label: "Repair in progress" },
  { value: "WAITING_PARTS", label: "Waiting on parts" },
  { value: "WAITING_TOOL", label: "Waiting on tool / equipment" },
  { value: "WAITING_VENDOR", label: "Waiting on vendor" },
  { value: "READY_FOR_QC", label: "Ready for quality check" },
  { value: "REPAIR_BLOCKED", label: "Blocked / needs decision" },
  { value: "REPAIR_COMPLETE", label: "Repair work complete" },
] as const;
const qcReadyStatuses = new Set(["READY_FOR_QC", "REPAIR_COMPLETE"]);

function activeStep(order?: Order) {
  if (!order) return 0;
  if (activeVendorWork(order)) {
    if (["ESTIMATE", "AUTHORIZATION"].includes(order.stage)) return 3;
    if (["READY_FOR_REPAIR", "REPAIR", "QUALITY_CONTROL", "ADVISOR_REVIEW", "HANDOFF"].includes(order.stage)) return 4;
    return 1;
  }
  const inspectionComplete = order.inspectionVersions.length > 0;
  const diagnosisComplete = order.diagnosisVersions.length > 0;
  const directBodyPath = defaultRepairPath(order) === "DIRECT_BODY";
  if (!inspectionComplete && !diagnosisComplete && !directBodyPath) return 0;
  if (!diagnosisComplete && !directBodyPath) return 1;
  if (!order.estimateVersions.length) return 2;
  const accepted = ["ACCEPTED", "PARTIAL"].includes(order.estimateVersions[0]?.authorizations[0]?.disposition ?? "");
  if (!accepted) return 3;
  return 4;
}

const steps = [
  { label: "Inspection evidence", icon: FileCheck2 },
  { label: "Diagnosis", icon: Stethoscope },
  { label: "Estimate", icon: Gauge },
  { label: "Authorization", icon: ShieldCheck },
  { label: "Repair job", icon: Wrench },
] as const;
const vendorSteps = [
  { label: "Vendor assigned", icon: Building2 },
  { label: "Vendor estimate", icon: Gauge },
  { label: "Approval", icon: ShieldCheck },
  { label: "Repair and return", icon: Truck },
  { label: "Dealership QC", icon: ClipboardCheck },
] as const;
const inspectionClearanceSeed: ClearanceItem[] = [
  { detail: "Customer concern, keys, VIN, mileage, and intake notes are available.", key: "INTAKE_IDENTITY", label: "Intake identity", proof: "Repair order and vehicle identity are open", required: true, result: "PASS", status: "CLEARED" },
  { detail: "Exterior, interior, underhood, and visible condition were checked.", key: "GENERAL_CONDITION", label: "General condition", proof: "Walkaround complete", required: true, result: "PASS", status: "CLEARED" },
  { detail: "Photos, scan result, measurement, or plain note supports the finding.", key: "INSPECTION_PROOF", label: "Inspection proof", proof: "", required: true, result: "ADVISORY", status: "NEEDS_PROOF" },
  { detail: "Safety items and warning lights are clear enough to choose the next path.", key: "SAFETY_WARNING_LIGHTS", label: "Safety / warning lights", proof: "", required: true, result: "PASS", status: "REQUIRED" },
  { detail: "The team knows whether this needs diagnosis, bodywork scope, or vendor work.", key: "REPAIR_PATH_READY", label: "Repair path decision", proof: "", required: true, result: "PASS", status: "NOT_CHECKED" },
  { detail: "Extra customer concern, cosmetic note, or optional shop observation.", key: "OPTIONAL_NOTE", label: "Optional note", proof: "", required: false, result: "NOT_APPLICABLE", status: "OPTIONAL" },
];

export function ShopPlanningWorkspace({ initial, returnTo, vendorFollowUp = false, defaultLaborRate = 125, canOverrideLaborRate = false }: { initial: Model; returnTo?: string; vendorFollowUp?: boolean; defaultLaborRate?: number; canOverrideLaborRate?: boolean }) {
  const router = useRouter();
  const [model, setModel] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.repairOrders[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submitInFlight = useRef(false);
  const first = initial.repairOrders[0];
  const defaultTime = first?.updatedAt ?? first?.serviceVisit.arrivedAt ?? "";
  const firstEstimate = first?.estimateVersions[0];
  const firstAccepted = firstEstimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition));
  const firstExistingKeys = new Set((first?.repairJobs ?? []).map((item) => item.authorizedLineKey));
  const firstAuthorizedLaborLines = (firstEstimate?.lineItems ?? []).filter((line) => line.type === "LABOR" && Boolean(firstAccepted?.authorizedLineKeys.includes(line.key)));
  const firstReleaseLine = firstAuthorizedLaborLines.find((line) => !firstExistingKeys.has(line.key)) ?? firstAuthorizedLaborLines[0];
  const [repairPath, setRepairPath] = useState<RepairPath>(vendorFollowUp && activeVendorWork(first) ? "DIRECT_BODY" : defaultRepairPath(first));
  const [inspection, setInspection] = useState({ templateCode: "GENERAL_DVI", templateVersion: 1, startedAt: defaultTime ? local(defaultTime) : "", completedAt: defaultTime ? local(defaultTime) : "", summary: "", itemKey: "GENERAL_CONDITION", itemLabel: "General condition", itemResult: "PASS", measurement: "", itemNotes: "", evidence: "" });
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>(() => inspectionClearanceSeed.map((item) => ({ ...item })));
  const [activeClearanceKey, setActiveClearanceKey] = useState("INSPECTION_PROOF");
  const [diagnosis, setDiagnosis] = useState({ concern: first?.serviceVisit.concernSummary ?? "", symptoms: "", testName: "", testResult: "", evidence: "", cause: "", uncertainty: "MEDIUM", recommendation: "", proposedCorrection: "", technicianUserId: initial.users[0]?.id ?? "", diagnosedAt: defaultTime ? local(defaultTime) : "" });
  const [directScope, setDirectScope] = useState({ concern: first?.serviceVisit.concernSummary ?? "", diagnosedAt: defaultTime ? local(defaultTime) : "", evidence: "", ...bodyworkRepairDefaults(first?.serviceVisit.concernSummary), scopeType: "BODYWORK", technicianUserId: initial.users[0]?.id ?? "", uncertainty: "LOW", whyNoDiagnosis: "Visible body or collision damage can move directly to scope, estimate, parts, and repair without troubleshooting diagnostics." });
  const [vendorWork, setVendorWork] = useState({ approvalStatus: "NEEDS_DOCUMENTATION", customerVisibleSummary: "", directFromSource: false, evidence: "", expectedReturnAt: "", internalNotes: "", lastUpdateSummary: "Outside vendor route created from repair planning.", nextAction: "Confirm vendor received the vehicle, estimate or scope, parts needs, and expected return.", nextFollowUpAt: "", scope: first?.serviceVisit.concernSummary ?? "", sentAt: defaultTime ? local(defaultTime) : "", sentFrom: "Dealership", status: "AT_VENDOR", transportMethod: "Internal transport", vendorName: "", workType: "BODY_SHOP" });
  const [vendorProgress, setVendorProgress] = useState(seedVendorProgress(activeVendorWork(first), first));
  const defaultPresentedAt = defaultTime ? local(defaultTime) : "";
  const defaultExpiresAt = defaultTime ? daysAfter(defaultTime, 7) : "";
  const [estimate, setEstimate] = useState<EstimateDraft>(createEstimateDraft(defaultPresentedAt, defaultExpiresAt));
  const [estimateLines, setEstimateLines] = useState<Line[]>([]);
  const [manualLaborReview, setManualLaborReview] = useState({ ...emptyManualLaborReview });
  const [estimateControls, setEstimateControls] = useState<EstimateControls>({ version: 1, pricing: { ...initialEstimatePricing, laborRate: defaultLaborRate }, fitment: {}, overlapResolution: "", reviewedScope: "" });
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const cancelDraftEdits = useRef<(() => void) | null>(null);
  const [revisionSource, setRevisionSource] = useState<{ id: string; version: number } | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionOptions, setRevisionOptions] = useState<unknown>(null);
  useEffect(() => {
    if (editingStep === null) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [editingStep]);
  const [laborGuideQuery, setLaborGuideQuery] = useState("");
  const [authorization, setAuthorization] = useState({ estimateVersionId: "", disposition: "ACCEPTED", channel: "IN_PERSON", authorizedLineKeys: "", decisionActorType: "CUSTOMER", decisionActorName: "", decisionActorReference: "", decidedAt: defaultTime ? local(defaultTime) : "" });
  const [job, setJob] = useState({ authorizationId: firstAccepted?.id ?? "", authorizedLineKey: firstReleaseLine?.key ?? "", diagnosisVersionId: first?.diagnosisVersions[0]?.id ?? "", workTypeCode: firstReleaseLine?.workTypeCode ?? "GENERAL_REPAIR", description: firstReleaseLine?.description ?? "", plannedCorrection: firstReleaseLine?.plannedCorrection ?? "", laborGuideMinutes: firstReleaseLine?.laborGuideMinutes ?? 60, requiredSkills: "", requiredCertifications: "", bayRequirements: "", toolRequirements: "", priority: "NORMAL", dependencyJobIds: "", partsRequired: false, partDemandIds: [] as string[] });
  const [releaseJobs, setReleaseJobs] = useState<ReleaseJobDraft[]>([]);
  const [repairProgress, setRepairProgress] = useState({ statusCode: "REPAIR_IN_PROGRESS", contactOutcome: "Repair progress updated", customerVisibleSummary: "", internalNotes: "", nextContactAt: defaultTime ? local(defaultTime) : "", promiseAt: "", nextAction: "Continue repair and record the next progress update." });
  const [repairOutcome, setRepairOutcome] = useState<"SUCCESS" | "FAILED">("SUCCESS");
  const [completedByUserId, setCompletedByUserId] = useState(initial.users[0]?.id ?? "");

  const selected = model.repairOrders.find((item) => item.id === selectedId) ?? model.repairOrders[0];
  const summaryCardHref = selected
    ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selected.id)}&vehicleId=${encodeURIComponent(selected.vehicle.id)}`
    : "/vehicles/repair-workbench";
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : summaryCardHref;
  const currentStep = activeStep(selected);
  const latestEstimate = selected?.estimateVersions[0];
  const latestDiagnosis = selected?.diagnosisVersions[0];
  const latestDecision = latestEstimate?.authorizations[0];
  const accepted = latestEstimate && latestDecision && ["ACCEPTED", "PARTIAL"].includes(latestDecision.disposition) ? { ...latestDecision, estimate: latestEstimate } : undefined;
  const authorizationEstimate = selected?.estimateVersions.find((item) => item.id === (authorization.estimateVersionId || latestEstimate?.id)) ?? latestEstimate;
  const authorizationLineKeys = authorizationEstimate?.lineItems.map((line) => line.key).filter(Boolean) ?? [];
  const typedAuthorizationLineKeys = authorization.authorizedLineKeys.split(",").map((value) => value.trim()).filter(Boolean);
  const approvalNeedsLineKeys = ["ACCEPTED", "PARTIAL"].includes(authorization.disposition);
  const authorizationDraftLineKeys = authorization.disposition === "ACCEPTED" ? authorizationLineKeys : authorization.authorizedLineKeys.trim() ? typedAuthorizationLineKeys : approvalNeedsLineKeys ? authorizationLineKeys : [];
  const authorizationDecisionDate = authorization.decidedAt ? new Date(authorization.decidedAt) : null;
  const authorizationDecisionTimeValid = Boolean(authorizationDecisionDate && !Number.isNaN(authorizationDecisionDate.getTime()));
  const authorizationExpired = Boolean(approvalNeedsLineKeys && authorizationEstimate && authorizationDecisionDate && !Number.isNaN(authorizationDecisionDate.getTime()) && new Date(authorizationEstimate.expiresAt) < authorizationDecisionDate);
  const authorizationUnknownLineKeys = authorizationDraftLineKeys.filter((key) => !authorizationLineKeys.includes(key));
  const partialCoversAllLines = authorization.disposition === "PARTIAL" && authorizationLineKeys.length > 0 && authorizationDraftLineKeys.length >= authorizationLineKeys.length;
  const authorizationBlockedReason = !authorizationEstimate
    ? "Create and present an estimate version before recording authorization."
    : authorizationExpired
      ? `This estimate expired on ${readableDateTime(authorizationEstimate.expiresAt)}. Present a new estimate version before authorizing repair work.`
      : !authorization.decisionActorName.trim()
        ? "Enter who made the authorization decision before continuing."
        : !authorization.decidedAt || !authorizationDecisionTimeValid
          ? "Enter a valid decision time before continuing."
          : approvalNeedsLineKeys && !authorizationDraftLineKeys.length
            ? "Choose at least one estimate line for this authorization."
            : authorizationUnknownLineKeys.length
              ? `Remove unknown line key${authorizationUnknownLineKeys.length === 1 ? "" : "s"}: ${authorizationUnknownLineKeys.join(", ")}.`
              : partialCoversAllLines
                ? "Partial authorization must cover fewer than all estimate lines. Use Accepted if the full estimate was approved."
                : "";
  const authorizationCanSubmit = Boolean(!authorizationBlockedReason && !busy);
  const authorizationHelper = authorization.disposition === "ACCEPTED"
    ? `Accepted will approve all ${authorizationLineKeys.length || "available"} estimate line${authorizationLineKeys.length === 1 ? "" : "s"} on this exact version.`
    : authorization.disposition === "PARTIAL"
      ? "Partial approves only the selected line keys. Leave only the lines the decision maker accepted."
      : "Declined, deferred, expired, and revoked decisions do not release repair work.";
  const authorizedLaborLines = (latestEstimate?.lineItems ?? []).filter((line) => line.type === "LABOR" && Boolean(accepted?.authorizedLineKeys.includes(line.key)));
  const existingAuthorizedLineKeys = new Set((selected?.repairJobs ?? []).map((item) => item.authorizedLineKey));
  const creatableAuthorizedLineKeys = authorizedLaborLines.filter((line) => !existingAuthorizedLineKeys.has(line.key)).map((line) => line.key);
  const selectedAuthorizedLineKey = job.authorizedLineKey || creatableAuthorizedLineKeys[0] || authorizedLaborLines[0]?.key || "";
  const selectedReleaseLine = authorizedLaborLines.find((line) => line.key === selectedAuthorizedLineKey) ?? null;
  const existingJobForSelectedLine = selected?.repairJobs.find((item) => item.authorizedLineKey === selectedAuthorizedLineKey) ?? null;
  const hasRepairJob = (selected?.repairJobs.length ?? 0) > 0;
  const directPath = repairPath === "DIRECT_BODY";
  const vendorPath = repairPath === "VENDOR";
  const currentVendorWork = activeVendorWork(selected);
  const vendorNeedsInternalCompletion = Boolean(currentVendorWork && currentVendorWork.status === "QC_REQUIRED" && (vendorFollowUp || vendorRepairFailed(currentVendorWork)));
  const followUpScopeReady = Boolean(vendorNeedsInternalCompletion && (latestDiagnosis || directRepairRecorded(selected)));
  const followUpEstimateReady = Boolean(vendorNeedsInternalCompletion && latestEstimate);
  const followUpAuthorizationReady = Boolean(vendorNeedsInternalCompletion && accepted);
  const releasePrerequisiteBlocked = Boolean(!accepted || !creatableAuthorizedLineKeys.length);
  const vendorCurrentStep = !currentVendorWork ? 0
    : !vendorEstimateCaptured(currentVendorWork) ? 1
      : !vendorApprovalCaptured(currentVendorWork) ? 2
        : !vendorRepairReturned(currentVendorWork) ? 3
          : 4;
  const displaySteps = vendorPath ? vendorSteps : steps;
  const displayCurrentStep = vendorPath ? vendorCurrentStep : currentStep;
  const vendorReadinessTitle = !currentVendorWork ? "Vendor assignment required"
    : !vendorEstimateCaptured(currentVendorWork) ? "Waiting for vendor estimate"
      : !vendorApprovalCaptured(currentVendorWork) ? "Vendor estimate needs a decision"
        : !vendorRepairReturned(currentVendorWork) ? "Vendor repair is authorized"
          : "Return and dealership QC required";
  const stageTwoComplete = Boolean((selected?.diagnosisVersions.length ?? 0) > 0 || currentVendorWork);
  const stageTwoTitle = vendorPath ? "Outside vendor route" : directPath ? "Bodywork repair scope" : "Evidence-backed diagnosis";
  const missionLabel = vendorPath ? "Outside vendor mission" : directPath ? "Bodywork repair mission" : "Diagnostic mission";
  const missionTitle = vendorPath ? "Dispatch the vehicle to the vendor workflow and track the rapid recon answers" : directPath ? "Document the bodywork scope and move directly to estimate" : "Verify the reported concern and identify the root cause";
  const orderPathLabel = vendorPath ? "Vehicle ready for outside vendor route" : directPath ? "Vehicle selected for bodywork repair" : "Vehicle released for diagnosis";
  const recentRepairUpdates = (selected?.advisorUpdates ?? []).slice(0, 6);
  const latestRepairUpdate = selected?.advisorUpdates?.[0] ?? null;
  const qcReady = Boolean(latestRepairUpdate && qcReadyStatuses.has(latestRepairUpdate.statusCode));
  const qcHref = selected ? `/vehicles/quality-control?repairOrderId=${encodeURIComponent(selected.id)}&returnLabel=${encodeURIComponent("Return to Repair Planning")}&returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}` : "/vehicles/quality-control";
  const dispatchHref = selected ? `/vehicles/shop-dispatch?repairOrderId=${encodeURIComponent(selected.id)}&returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}` : "/vehicles/shop-dispatch";
  const partsHref = selected ? `/vehicles/service-close-parts?repairOrderId=${encodeURIComponent(selected.id)}&returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}&returnLabel=${encodeURIComponent("Return to Repair Planning")}` : "/vehicles/service-close-parts";
  const repairJobWorkbenchHref = selected?.repairJobs[0] ? `/vehicles/repair-jobs/${encodeURIComponent(selected.repairJobs[0].id)}/workbench` : dispatchHref;
  const repairReleaseHref = !hasRepairJob ? "#repair-planning-step-5-create-job" : qcReady ? qcHref : "#repair-result";
  const reconBudget = selected?.inventoryUnit ? buildReconBudgetSummary({
    acquisitionAppraisals: selected.inventoryUnit.acquisitionAppraisals,
    acquisitionCase: selected.inventoryUnit.acquisitionCase,
    costEntries: selected.inventoryUnit.costEntries.filter((item) => item.currency !== "CAD"),
    estimateVersions: selected.estimateVersions,
    vendorWorks: selected.vendorWorks
  }) : null;
  const laborGuideOptions = buildLaborGuideOptions(selected, latestDiagnosis, directPath);
  const laborGuideNeedle = laborGuideQuery.trim().toLowerCase();
  const visibleLaborGuideOptions = laborGuideNeedle ? laborGuideOptions.filter((option) => `${option.title} ${option.source} ${option.description} ${option.plannedCorrection} ${option.workTypeCode}`.toLowerCase().includes(laborGuideNeedle)) : laborGuideOptions;
  const laborGuideHref = selected ? `/diagnostics/labor-guide?${new URLSearchParams({ query: laborGuideQuery || latestDiagnosis?.proposedCorrection || selected.serviceVisit.concernSummary, repairOrderId: selected.id, returnLabel: "Return to estimate", returnTo: `/vehicles/shop-planning?repairOrderId=${selected.id}#estimate` }).toString()}` : "/diagnostics/labor-guide";
  const quickEstimateOptions = visibleLaborGuideOptions.slice(0, 4);
  const activeClearanceItem = clearanceItems.find((item) => item.key === activeClearanceKey) ?? clearanceItems[0];
  const clearanceRequired = clearanceItems.filter((item) => item.required);
  const clearedRequiredCount = clearanceRequired.filter((item) => item.status === "CLEARED").length;
  const stageClearanceReady = clearedRequiredCount === clearanceRequired.length;
  const clearanceBlockers = clearanceRequired.filter((item) => item.status !== "CLEARED");
  const setActiveClearance = (item: ClearanceItem) => {
    setActiveClearanceKey(item.key);
    setInspection((value) => ({
      ...value,
      evidence: item.proof || value.evidence,
      itemKey: item.key,
      itemLabel: item.label,
      itemResult: item.result,
      summary: value.summary || item.detail,
    }));
  };
  const updateClearance = (key: string, patch: Partial<ClearanceItem>) => {
    setClearanceItems((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
    if (key === activeClearanceKey) {
      setInspection((value) => ({
        ...value,
        evidence: patch.proof ?? value.evidence,
        itemResult: patch.result ?? value.itemResult,
      }));
    }
  };
  const toggleClearance = (item: ClearanceItem) => {
    const nextStatus = item.status === "CLEARED" ? item.required ? "REQUIRED" : "OPTIONAL" : "CLEARED";
    updateClearance(item.key, { status: nextStatus });
    setActiveClearance(item);
  };
  const clearanceStages = [
    { detail: selected.serviceVisit.concernSummary, label: "Stage 1 - Intake", state: "Clear", tone: "done" },
    { detail: `${clearedRequiredCount} of ${clearanceRequired.length} required items cleared`, label: "Stage 2 - Inspection", state: stageClearanceReady ? "Clear" : "Active", tone: stageClearanceReady ? "done" : "current" },
    { detail: latestDiagnosis ? latestDiagnosis.proposedCorrection : "Unlock after inspection clearance", label: "Stage 3 - Diagnosis", state: latestDiagnosis ? "Clear" : "Locked", tone: latestDiagnosis ? "done" : "locked" },
    { detail: latestEstimate ? `${money(latestEstimate.totalCents)} estimate version ${latestEstimate.version}` : "Estimate and approval stay gated", label: "Stage 4 - Estimate / Approval", state: accepted ? "Clear" : latestEstimate ? "Needs approval" : "Locked", tone: accepted ? "done" : "locked" },
    { detail: hasRepairJob ? `${selected.repairJobs.length} repair job${selected.repairJobs.length === 1 ? "" : "s"} created` : "Repair release waits for authorization", label: "Stage 5 - Repair Ready", state: hasRepairJob ? "Clear" : "Locked", tone: hasRepairJob ? "done" : "locked" },
  ];
  const staffNext = !selected ? null : currentVendorWork
    ? vendorNeedsInternalCompletion
      ? !followUpScopeReady
        ? { action: "Create internal follow-up scope", detail: "Keep this same RO open and create the internal completion work for the items the outside vendor did not finish.", href: "#repair-planning-step-2", step: 2, title: "Create same-RO completion work" }
        : !followUpEstimateReady
          ? { action: "Create completion estimate", detail: "Price the unfinished vendor-return work first. After that, record the approval and release the internal completion job.", href: "#repair-planning-step-3", step: 3, title: "Create approved completion line" }
          : !followUpAuthorizationReady
            ? { action: "Record completion approval", detail: "Approve the exact completion estimate line before creating the internal repair job.", href: "#repair-planning-step-4", step: 4, title: "Approve completion work" }
            : { action: "Create completion repair job", detail: "The completion work is approved. Create the internal repair job on this same RO.", href: "#repair-planning-step-5-create-job", step: 5, title: "Create internal completion job" }
      : !vendorEstimateCaptured(currentVendorWork)
      ? { action: "Open vendor estimate", detail: "Enter the vendor estimate, expected return, and next follow-up. Do not repeat inspection or diagnosis.", href: "#repair-planning-step-3", step: 3, title: "Record the vendor estimate" }
      : !vendorApprovalCaptured(currentVendorWork)
        ? { action: "Open vendor approval", detail: "Review the vendor amount, then choose Approved, No approval required, or Still pending.", href: "#repair-planning-step-4", step: 4, title: "Record the approval decision" }
        : !vendorRepairReturned(currentVendorWork)
          ? { action: "Open vendor tracking", detail: "Record whether repair is in progress, waiting on parts, ready for pickup, or returning to the dealership.", href: "#repair-planning-step-5", step: 5, title: "Track the outside repair" }
          : { action: "Open dealership QC", detail: "Pass the returned vendor repair or fail it and create the follow-up repair scope before inventory handoff.", href: qcHref, step: 5, title: "Inspect vendor return" }
    : currentStep === 0
      ? { action: "Open inspection", detail: "Record what staff inspected, the result, the finding, and supporting proof.", href: "#repair-planning-step-1", step: 1, title: "Complete the condition inspection" }
      : currentStep === 1
        ? { action: "Open repair path", detail: "Choose diagnostic repair, visible body/collision scope, or an outside vendor route.", href: "#repair-planning-step-2", step: 2, title: "Choose how the work will be completed" }
        : currentStep === 2
          ? { action: "Open estimate", detail: directPath ? "Build and save the in-house bodywork estimate from the recorded bodywork scope." : "Build and save the estimate from the recorded diagnosis.", href: "#repair-planning-step-3", step: 3, title: "Create the repair estimate" }
          : currentStep === 3
            ? { action: "Open authorization", detail: "Record who approved which estimate lines and the exact approved amount.", href: "#repair-planning-step-4", step: 4, title: "Record the authorization decision" }
            : !hasRepairJob
              ? releasePrerequisiteBlocked
                ? !latestEstimate
                  ? { action: "Create estimate first", detail: "There is no approved repair line to release yet. Create the estimate, record approval, then create the repair job.", href: "#repair-planning-step-3", step: 3, title: "Create an approved repair line" }
                  : { action: "Record approval first", detail: "There is an estimate, but no accepted decision for the repair line yet. Record the approval before creating the repair job.", href: "#repair-planning-step-4", step: 4, title: "Approve repair work before release" }
                : { action: "Open repair release", detail: "Create the repair job first. After that, staff can record the result and move straight to Final QC.", href: repairReleaseHref, step: 5, title: "Release the approved repair" }
              : qcReady
                ? { action: "Open Final QC", detail: "The repair result is already recorded. Continue in Final QC to inspect and release the vehicle.", href: repairReleaseHref, step: 5, title: "Complete final quality control" }
                : { action: "Open repair update", detail: "Record progress, blockers, next steps, or the final repair result.", href: repairReleaseHref, step: 5, title: "Update repair progress" };
  const estimateBasisNotice = directPath
    ? "In-house bodywork does not need a mechanical diagnosis. Save the bodywork repair scope first, then present the estimate from that scope."
    : vendorPath
      ? "Outside-vendor estimates need the vendor, repair scope, and approval saved before presentation."
      : "Mechanical estimates need a recorded diagnosis before presentation.";
  const displayNotice = notice.includes("Presenting this estimate needs")
    ? estimateBasisNotice
    : notice.includes("cannot move backward") && staffNext
      ? `This repair order is already at ${format(selected?.stage ?? "the current gate")}. Do not repeat an earlier step. ${staffNext.title}.`
      : notice;

  function navigateToInternalTarget(hash: string) {
    if (!hash.startsWith("#")) return;
    const id = hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    const container = target.closest("details");
    if (container && !container.open) container.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    target.classList.remove(styles.jumpTargetActive);
    window.setTimeout(() => target.classList.add(styles.jumpTargetActive), 0);
    window.setTimeout(() => target.classList.remove(styles.jumpTargetActive), 1800);
  }

  function releaseLineByKey(lineKey: string) {
    return authorizedLaborLines.find((line) => line.key === lineKey);
  }

  function nextReleaseLineKey(usedKeys: string[] = []) {
    return creatableAuthorizedLineKeys.find((key) => !usedKeys.includes(key)) ?? creatableAuthorizedLineKeys[0] ?? "";
  }

  function applyReleaseLineDefaults(lineKey: string) {
    const line = releaseLineByKey(lineKey);
    setJob((value) => ({
      ...value,
      authorizationId: accepted?.id ?? value.authorizationId,
      authorizedLineKey: lineKey,
      description: line?.description ?? "",
      diagnosisVersionId: latestDiagnosis?.id ?? value.diagnosisVersionId,
      laborGuideMinutes: line?.laborGuideMinutes ?? 60,
      partDemandIds: [],
      partsRequired: false,
      plannedCorrection: line?.plannedCorrection ?? "",
      workTypeCode: line?.workTypeCode ?? "GENERAL_REPAIR",
    }));
  }

  function resetReleaseBuilder(order = selected) {
    const orderEstimate = order?.estimateVersions[0];
    const orderAccepted = orderEstimate?.authorizations.find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition));
    const orderExistingKeys = new Set((order?.repairJobs ?? []).map((item) => item.authorizedLineKey));
    const orderAuthorizedLaborLines = (orderEstimate?.lineItems ?? []).filter((line) => line.type === "LABOR" && Boolean(orderAccepted?.authorizedLineKeys.includes(line.key)));
    const nextLine = orderAuthorizedLaborLines.find((line) => !orderExistingKeys.has(line.key)) ?? orderAuthorizedLaborLines[0];
    setReleaseJobs([]);
    setJob((value) => ({
      ...value,
      authorizationId: orderAccepted?.id ?? "",
      authorizedLineKey: nextLine?.key ?? "",
      description: nextLine?.description ?? "",
      diagnosisVersionId: order?.diagnosisVersions[0]?.id ?? "",
      laborGuideMinutes: nextLine?.laborGuideMinutes ?? 60,
      partDemandIds: [],
      partsRequired: false,
      plannedCorrection: nextLine?.plannedCorrection ?? "",
      workTypeCode: nextLine?.workTypeCode ?? "GENERAL_REPAIR",
    }));
  }

  function nextEstimateLineKey(lines = estimateLines) {
    let index = 1;
    while (lines.some((line) => line.key === `LINE-${index}`)) index += 1;
    return `LINE-${index}`;
  }

  function beginDraftEdit(step: number) {
    if (busy) return false;
    if (editingStep !== null) {
      if (editingStep === step) return true;
      setNotice("Save or cancel the current edits before editing another section.");
      return false;
    }
    cancelDraftEdits.current = () => {
      setInspection(inspection); setDiagnosis(diagnosis); setDirectScope(directScope);
      setVendorWork(vendorWork); setVendorProgress(vendorProgress);
      setEstimate(estimate); setEstimateLines(estimateLines); setAuthorization(authorization);
      setJob(job); setReleaseJobs(releaseJobs); setRepairProgress(repairProgress);
      setRepairOutcome(repairOutcome); setCompletedByUserId(completedByUserId);
      setRevisionSource(revisionSource); setRevisionReason(revisionReason);
      setRevisionNotes(revisionNotes); setRevisionOptions(revisionOptions);
    };
    setEditingStep(step);
    window.setTimeout(() => navigateToInternalTarget(`#repair-planning-step-${step}`), 0);
    return true;
  }

  function cancelEditing() {
    cancelDraftEdits.current?.();
    cancelDraftEdits.current = null;
    setEditingStep(null);
    setNotice("Edits cancelled. Saved records were not changed.");
  }

  function reviseEstimate() {
    if (!authorizationEstimate || busy) return;
    if (revisionSource?.id === authorizationEstimate.id && editingStep === 3) {
      navigateToInternalTarget("#estimate-price-correction");
      return;
    }
    if (revisionSource || estimateLines.length || estimate.description.trim()) {
      if (!window.confirm("Replace the current estimate draft with a copy of the selected version? Saved estimates will not change.")) return;
    }
    if (editingStep === 4) setEditingStep(3);
    else if (!beginDraftEdit(3)) return;
    const copy = copyEstimateForRevision(authorizationEstimate);
    const now = new Date();
    setEstimateLines(copy.lineItems);
    setEstimate({ ...createEstimateDraft(local(now.toISOString()), daysAfter(now, 7), nextEstimateLineKey(copy.lineItems)), taxCents: copy.taxCents, discountCents: copy.discountCents, taxBoundary: copy.taxBoundary, presentationChannel: copy.presentationChannel });
    setRevisionSource({ id: authorizationEstimate.id, version: authorizationEstimate.version });
    setRevisionReason("");
    setRevisionNotes(copy.assumptions ?? "");
    setRevisionOptions(copy.optionGroups);
    setNotice(`Editing a copy of estimate v${authorizationEstimate.version}. Update the lines, then save a new version. Existing approvals will not transfer.`);
    window.setTimeout(() => navigateToInternalTarget("#estimate-price-correction"), 0);
  }

  function resetEstimateDraft(lineKey = nextEstimateLineKey()) {
    setEstimate((value) => ({
      ...createEstimateDraft(value.presentedAt, value.expiresAt, lineKey),
      presentationChannel: value.presentationChannel,
      taxBoundary: value.taxBoundary,
      taxCents: value.taxCents,
      discountCents: value.discountCents,
    }));
  }

  function saveEstimateLine() {
    const description = estimate.description.trim();
    const plannedCorrection = estimate.plannedCorrection.trim();
    if (!description || !plannedCorrection) {
      setNotice("Add a short description and what should be done before saving the estimate line.");
      return;
    }
    if (estimate.quantity <= 0) {
      setNotice("Quantity must be greater than zero.");
      return;
    }
    const nextLine: Line = {
      key: estimate.lineKey.trim() || nextEstimateLineKey(),
      type: estimate.lineType,
      description,
      quantity: estimate.quantity,
      unitPriceCents: estimate.unitPriceCents,
      taxable: estimate.taxable,
      workTypeCode: estimate.workTypeCode,
      laborGuideMinutes: estimate.laborGuideMinutes,
      plannedCorrection,
    };
    setEstimateLines((value) => {
      const existingIndex = value.findIndex((line) => line.key === nextLine.key);
      if (existingIndex >= 0) {
        const copy = [...value];
        copy[existingIndex] = nextLine;
        return copy;
      }
      return [...value, nextLine];
    });
    setNotice(`${nextLine.key} is ready in the estimate draft. Add another line or present the estimate when you are ready.`);
    resetEstimateDraft(nextEstimateLineKey(estimateLines.some((line) => line.key === nextLine.key) ? estimateLines : [...estimateLines, nextLine]));
  }

  function editEstimateLine(line: Line) {
    setEstimate((value) => ({
      ...value,
      lineKey: line.key,
      lineType: line.type,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxable: line.taxable,
      workTypeCode: line.workTypeCode,
      laborGuideMinutes: line.laborGuideMinutes,
      plannedCorrection: line.plannedCorrection,
    }));
    setNotice(`Editing ${line.key}. Update the fields below, then save the line again.`);
  }

  function removeEstimateLine(lineKey: string) {
    setEstimateLines((value) => value.filter((line) => line.key !== lineKey));
    if (estimate.lineKey === lineKey) resetEstimateDraft(lineKey);
    setNotice(`${lineKey} was removed from the estimate draft.`);
  }

  function saveReleaseJobDraft() {
    const lineKey = job.authorizedLineKey.trim();
    if (!lineKey) {
      setNotice("Choose an approved work line before adding it to the repair release.");
      return;
    }
    if (!job.description.trim() || !job.plannedCorrection.trim()) {
      setNotice("Add a job description and what should be done before saving this repair line.");
      return;
    }
    const duplicate = releaseJobs.find((item) => item.authorizedLineKey === lineKey);
    const draft: ReleaseJobDraft = {
      authorizationId: job.authorizationId || accepted?.id || "",
      authorizedLineKey: lineKey,
      description: job.description.trim(),
      laborGuideMinutes: job.laborGuideMinutes,
      partDemandIds: job.partDemandIds,
      partsRequired: job.partsRequired,
      plannedCorrection: job.plannedCorrection.trim(),
      workTypeCode: job.workTypeCode.trim() || "GENERAL_REPAIR",
    };
    setReleaseJobs((value) => duplicate ? value.map((item) => item.authorizedLineKey === lineKey ? draft : item) : [...value, draft]);
    const nextKey = nextReleaseLineKey((duplicate ? releaseJobs : [...releaseJobs, draft]).map((item) => item.authorizedLineKey));
    if (nextKey && nextKey !== lineKey) {
      applyReleaseLineDefaults(nextKey);
      setJob((value) => ({ ...value, partDemandIds: [], partsRequired: false }));
    }
    setNotice(`${lineKey} is ready for repair release. Add another line or create the listed repair jobs.`);
  }

  function editReleaseJobDraft(draft: ReleaseJobDraft) {
    setJob((value) => ({
      ...value,
      authorizationId: draft.authorizationId,
      authorizedLineKey: draft.authorizedLineKey,
      description: draft.description,
      laborGuideMinutes: draft.laborGuideMinutes,
      partDemandIds: draft.partDemandIds,
      partsRequired: draft.partsRequired,
      plannedCorrection: draft.plannedCorrection,
      workTypeCode: draft.workTypeCode,
    }));
    setNotice(`Editing ${draft.authorizedLineKey}. Update it and save the line again.`);
  }

  function removeReleaseJobDraft(lineKey: string) {
    setReleaseJobs((value) => value.filter((item) => item.authorizedLineKey !== lineKey));
    if (job.authorizedLineKey === lineKey) applyReleaseLineDefaults(nextReleaseLineKey(releaseJobs.filter((item) => item.authorizedLineKey !== lineKey).map((item) => item.authorizedLineKey)));
    setNotice(`${lineKey} was removed from the repair release list.`);
  }

  function buildCurrentReleaseDraft() {
    const lineKey = job.authorizedLineKey.trim();
    if (!lineKey || !selectedReleaseLine) return null;
    return {
      authorizationId: job.authorizationId || accepted?.id || "",
      authorizedLineKey: lineKey,
      description: job.description.trim() || selectedReleaseLine.description,
      laborGuideMinutes: job.laborGuideMinutes || selectedReleaseLine.laborGuideMinutes,
      partDemandIds: job.partDemandIds,
      partsRequired: job.partsRequired,
      plannedCorrection: job.plannedCorrection.trim() || selectedReleaseLine.plannedCorrection,
      workTypeCode: job.workTypeCode.trim() || selectedReleaseLine.workTypeCode || "GENERAL_REPAIR",
    };
  }

  async function createReleaseJobs() {
    const currentDraft = buildCurrentReleaseDraft();
    const drafts = releaseJobs.length ? releaseJobs : currentDraft ? [currentDraft] : [];
    if (!drafts.length) {
      setNotice("Choose an approved repair line, then create the repair job to continue to assignment, parts, repair completion, and Final QC.");
      navigateToInternalTarget("#repair-planning-step-5-create-job");
      return;
    }
    let firstRepairJobId = "";
    let firstRepairJobNumber = "";
    for (const draft of drafts) {
      const created = await submit("CREATE_JOB", {
        authorizationId: draft.authorizationId || accepted?.id,
        authorizedLineKey: draft.authorizedLineKey,
        diagnosisVersionId: latestDiagnosis?.id,
        laborGuideMinutes: draft.laborGuideMinutes,
        partDemandIds: draft.partDemandIds,
        partsRequired: draft.partsRequired,
        plannedCorrection: draft.plannedCorrection,
        priority: "NORMAL",
        reason: "Create an authorized, readiness-gated repair job.",
        requiredCertifications: [],
        requiredSkills: [],
        bayRequirements: [],
        dependencyJobIds: [],
        description: draft.description,
        toolRequirements: [],
        workTypeCode: draft.workTypeCode,
      }, "Create an authorized, readiness-gated repair job.");
      if (!created) return;
      if (!firstRepairJobId && typeof created.result?.id === "string") firstRepairJobId = created.result.id;
      if (!firstRepairJobNumber && typeof created.result?.jobNumber === "string") firstRepairJobNumber = created.result.jobNumber;
    }
    setReleaseJobs([]);
    if (firstRepairJobId) {
      setNotice(`${firstRepairJobNumber || "Repair job"} created. Opening the repair workbench now.`);
      window.setTimeout(() => router.push(`/vehicles/repair-jobs/${encodeURIComponent(firstRepairJobId)}/workbench`), 120);
      return;
    }
    setNotice("Repair job created. Open repair work order below to assign work, update parts, complete repair, then move to Final QC.");
    window.setTimeout(() => navigateToInternalTarget("#repair-next-actions"), 120);
  }

  function applyLaborGuideOption(option: LaborGuideOption) {
    const presentedAt = local(new Date().toISOString());
    setEstimate((value) => ({ ...value, description: option.description, expiresAt: daysAfter(new Date(), 7), laborGuideMinutes: option.minutes, lineType: "LABOR", plannedCorrection: option.plannedCorrection, presentedAt, unitPriceCents: option.unitPriceCents, workTypeCode: option.workTypeCode }));
    setNotice(`${option.title} loaded into the estimate line. Review it, edit anything needed, then save the line.`);
  }

  async function submitEstimate(correctedLines?: Line[]) {
    if (revisionSource && !revisionReason.trim()) {
      setNotice("Enter the reason for revising this estimate before saving.");
      return;
    }
    if (!correctedLines && estimateLines.length && (estimate.description.trim() || estimate.plannedCorrection.trim())) {
      setNotice("Save your line changes with Update line or Add line to estimate before presenting this version.");
      return;
    }
    const now = new Date();
    const presentedAt = new Date(estimate.presentedAt);
    const expiresAt = new Date(estimate.expiresAt);
    if (Number.isNaN(presentedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      setNotice("Presented and Expires must contain valid dates and times.");
      return;
    }
    if (expiresAt <= presentedAt || expiresAt <= now) {
      setEstimate((value) => ({ ...value, presentedAt: local(now.toISOString()), expiresAt: daysAfter(now, 7) }));
      setNotice("The estimate expiration had already passed. Presented and Expires were updated to a seven-day window. Review them, then select Present estimate version again.");
      return;
    }
    const currentDraftReady = estimate.description.trim() && estimate.plannedCorrection.trim();
    const lineItems = correctedLines ?? (estimateLines.length
      ? estimateLines
      : currentDraftReady
        ? [{
          key: estimate.lineKey.trim() || "LINE-1",
          type: estimate.lineType,
          description: estimate.description.trim(),
          quantity: estimate.quantity,
          unitPriceCents: estimate.unitPriceCents,
          taxable: estimate.taxable,
          workTypeCode: estimate.workTypeCode,
          laborGuideMinutes: estimate.laborGuideMinutes,
          plannedCorrection: estimate.plannedCorrection.trim()
        }]
        : []);
    if (!lineItems.length) {
      setNotice("Add at least one estimate line before presenting the estimate.");
      return;
    }
    const usesCatalog = lineItems.some(line => laborOperationForLineKey(line.key, flattenLaborOperationTaxonomy()));
    const saved = await submit("PRESENT_ESTIMATE", { lineItems, ...(lineItems.some(line => line.type === "LABOR") ? { manualLaborReview } : {}), ...(usesCatalog ? { estimateControls } : {}), taxCents: estimate.taxCents, discountCents: estimate.discountCents, taxBoundary: estimate.taxBoundary, presentationChannel: estimate.presentationChannel, presentedAt: estimate.presentedAt, expiresAt: estimate.expiresAt, ...(revisionSource ? { assumptions: revisionNotes, optionGroups: revisionOptions } : {}) }, revisionSource ? `Revise estimate v${revisionSource.version} (${revisionSource.id}): ${revisionReason.trim()}` : vendorPath ? "Present an immutable estimate version from the approved outside-vendor scope." : "Present an immutable estimate version from diagnostic evidence.");
    if (saved) {
      setEstimateLines([]);
      resetEstimateDraft("LINE-1");
      setRevisionSource(null); setRevisionReason(""); setRevisionNotes(""); setRevisionOptions(null);
      setAuthorization(value => ({ ...value, estimateVersionId: "", authorizedLineKeys: "", decisionActorName: "", decisionActorReference: "", decidedAt: local(new Date().toISOString()) }));
      setNotice("New estimate version saved. Review it and record a new authorization decision; previous approvals do not transfer.");
      window.setTimeout(() => navigateToInternalTarget("#repair-planning-step-4"), 0);
    }
  }

  async function createFastApprovedRepairJob() {
    if (!selected || submitInFlight.current) return;
    const lineItem = accepted?.estimate.lineItems.find(line => line.type === "LABOR" && accepted.authorizedLineKeys.includes(line.key));
    if (!lineItem) { setNotice("Present and authorize the reviewed estimate before creating completion work. No automatic price or approval will be generated."); navigateToInternalTarget("#repair-planning-step-3"); return; }
    submitInFlight.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await request(`/api/repair-orders/${selected.id}/planning`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_COMPLETION_JOB",
          idempotencyKey: crypto.randomUUID(),
          lineKey: lineItem.key,
          partDemandIds: job.partDemandIds,
          partsRequired: job.partsRequired,
          reason: "Create and open the approved completion repair job after failed vendor QC.",
        }),
      }) as { result?: { job?: { id?: string; jobNumber?: string } } };
      setEstimateLines([]);
      setReleaseJobs([]);
      const jobId = response.result?.job?.id;
      setNotice(`Completion job ${response.result?.job?.jobNumber ?? ""} created. Opening the repair work order.`.trim());
      await refresh();
      if (jobId) router.push(`/vehicles/repair-jobs/${encodeURIComponent(jobId)}/workbench`);
      else window.setTimeout(() => navigateToInternalTarget("#repair-next-actions"), 120);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Completion job creation failed.");
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  }

  function chooseRepairPath(path: RepairPath) {
    setRepairPath(path);
    if (path === "DIRECT_BODY") {
      const defaults = bodyworkRepairDefaults(selected?.serviceVisit.concernSummary);
      setDirectScope((value) => ({
        ...value,
        concern: selected?.serviceVisit.concernSummary ?? value.concern,
        proposedCorrection: value.proposedCorrection.trim() || defaults.proposedCorrection,
        recommendation: value.recommendation.trim() || defaults.recommendation,
        scopeSummary: value.scopeSummary.trim() || defaults.scopeSummary,
        scopeType: "BODYWORK",
      }));
      setInspection((value) => ({ ...value, itemLabel: value.itemLabel === "General condition" ? "Bodywork / exterior damage" : value.itemLabel }));
    }
    if (path === "VENDOR") setVendorWork((value) => ({ ...value, workType: value.workType || "BODY_SHOP" }));
  }

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Shop planning request failed.");
    return body;
  }

  async function refresh() {
    const next = await request("/api/shop-planning") as Model;
    setModel(next);
    const nextOrder = next.repairOrders.find((item) => item.id === selectedId) ?? next.repairOrders[0];
    resetReleaseBuilder(nextOrder);
    const vendor = activeVendorWork(nextOrder);
    if (nextOrder && vendor) {
      setRepairPath("VENDOR");
      setVendorProgress(seedVendorProgress(vendor, nextOrder));
    }
    cancelDraftEdits.current = null;
    setEditingStep(null);
  }

  async function submit(action: string, value: Record<string, unknown>, reason: string) {
    if (!selected || submitInFlight.current) return false;
    submitInFlight.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result = await request(`/api/repair-orders/${selected.id}/planning`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...value, expectedVersion: selected.version, idempotencyKey: crypto.randomUUID(), reason })
      }) as { result?: { id?: string; jobNumber?: string; message?: string } };
      setNotice(result?.result?.message ?? reason);
      await refresh();
      cancelDraftEdits.current = null;
      setEditingStep(null);
      return result;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Shop planning request failed.");
      return false;
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  }

  function chooseProgressStatus(statusCode: string) {
    const readyForQc = qcReadyStatuses.has(statusCode);
    setRepairProgress((value) => ({
      ...value,
      contactOutcome: readyForQc ? "Repair complete and ready for QC" : statusCode === "WAITING_PARTS" ? "Repair waiting on parts" : statusCode === "WAITING_TOOL" ? "Repair waiting on tool / equipment" : statusCode === "WAITING_VENDOR" ? "Repair waiting on vendor" : statusCode === "REPAIR_BLOCKED" ? "Repair needs a decision" : "Repair progress updated",
      nextAction: readyForQc ? "Complete final quality control, then hand off the vehicle." : statusCode === "WAITING_PARTS" ? "Confirm parts availability and resume repair when ready." : statusCode === "WAITING_TOOL" ? "Confirm tool delivery and resume repair when it arrives." : statusCode === "WAITING_VENDOR" ? "Follow up with the vendor and confirm the next committed date." : statusCode === "REPAIR_BLOCKED" ? "Resolve the blocker and record the repair decision." : "Continue repair and record the next meaningful update.",
      statusCode,
    }));
  }

  async function submitRepairProgress(statusOverride?: string, openQc = false, outcomeOverride?: "SUCCESS" | "FAILED") {
    const statusCode = statusOverride ?? repairProgress.statusCode;
    const customerVisibleSummary = repairProgress.customerVisibleSummary.trim();
    const readyForQc = qcReadyStatuses.has(statusCode);
    if (!customerVisibleSummary) {
      setNotice("Tell us what happened before saving this update.");
      return;
    }
    const failedRepair = outcomeOverride === "FAILED";
    const completedBy = model.users.find((user) => user.id === completedByUserId)?.name ?? "Staff member";
    const contactOutcome = failedRepair ? "Repair failed — QC decision required" : readyForQc ? "Repair complete and ready for QC" : repairProgress.contactOutcome.trim() || "Repair progress updated";
    const nextAction = readyForQc ? "Complete final quality control, then hand off or return the vehicle for rework." : repairProgress.nextAction.trim() || "Continue repair and record the next meaningful update.";
    if (latestRepairUpdate?.statusCode === statusCode && latestRepairUpdate.customerVisibleSummary.trim() === customerVisibleSummary) {
      if (readyForQc && openQc) {
        window.location.assign(qcHref);
        return;
      }
      setNotice(readyForQc ? "This completion update is already saved. Open QC to continue." : "This exact repair update is already saved; no duplicate was created.");
      return;
    }
    const saved = await submit("RECORD_REPAIR_PROGRESS", { contactChannel: "INTERNAL", contactDirection: "INTERNAL", contactOutcome, customerVisibleSummary, exceptionCodes: ["REPAIR_BLOCKED", "WAITING_PARTS", "WAITING_TOOL", "WAITING_VENDOR"].includes(statusCode) ? [statusCode] : [], internalNotes: [outcomeOverride ? `Repair outcome: ${outcomeOverride}. Work performed by: ${completedBy}.` : "", repairProgress.internalNotes.trim(), `Next action: ${nextAction}`].filter(Boolean).join("\n"), nextContactAt: readyForQc ? null : repairProgress.nextContactAt ? new Date(repairProgress.nextContactAt).toISOString() : null, occurredAt: new Date().toISOString(), promiseAt: repairProgress.promiseAt ? new Date(repairProgress.promiseAt).toISOString() : null, reason: "Record live repair progress from the repair planning workspace.", statusCode }, readyForQc ? "Repair result saved. Opening Final QC." : "Repair progress update recorded.");
    if (saved && openQc) {
      window.location.assign(qcHref);
      return;
    }
    if (saved) setRepairProgress((value) => ({ ...value, contactOutcome: "Repair progress updated", customerVisibleSummary: "", internalNotes: "", nextAction: "Continue repair and record the next meaningful update.", statusCode: "REPAIR_IN_PROGRESS" }));
  }

  async function submitVendorWork() {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const vendorName = vendorWork.vendorName.trim();
      const result = await request(`/api/repair-orders/${selected.id}/vendor-work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          approvalStatus: vendorWork.approvalStatus,
          currentLocation: vendorName,
          customerVisibleSummary: vendorWork.customerVisibleSummary || `The vehicle is with ${vendorName} for outside repair work. We are monitoring scope, parts, and expected return.`,
          directFromSource: vendorWork.directFromSource,
          evidence: vendorWork.evidence.split(",").map((value) => value.trim()).filter(Boolean),
          expectedReturnAt: vendorWork.expectedReturnAt ? new Date(vendorWork.expectedReturnAt).toISOString() : null,
          idempotencyKey: crypto.randomUUID(),
          internalNotes: vendorWork.internalNotes || null,
          keysCustodian: vendorName,
          lastUpdateSummary: vendorWork.lastUpdateSummary,
          nextAction: vendorWork.nextAction,
          nextFollowUpAt: vendorWork.nextFollowUpAt ? new Date(vendorWork.nextFollowUpAt).toISOString() : null,
          occurredAt: vendorWork.sentAt ? new Date(vendorWork.sentAt).toISOString() : new Date().toISOString(),
          reason: "Deploy outside vendor repair workflow from repair planning.",
          scope: vendorWork.scope,
          sentAt: vendorWork.sentAt ? new Date(vendorWork.sentAt).toISOString() : new Date().toISOString(),
          sentFrom: vendorWork.directFromSource ? "Auction/source" : vendorWork.sentFrom,
          status: vendorWork.status,
          transportMethod: vendorWork.transportMethod || null,
          vendorName,
          workType: vendorWork.workType
        })
      }) as { duplicate?: boolean; result?: { vendorName?: string } };
      setNotice(result.duplicate ? "Outside vendor workflow is already active for this repair order." : `Outside vendor workflow deployed for ${result.result?.vendorName ?? vendorName}.`);
      await refresh();
      setRepairPath("VENDOR");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Outside vendor workflow could not be deployed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitVendorProgress(statusOverride?: string, summaryOverride?: string, nextActionOverride?: string, overrides: Partial<typeof vendorProgress> = {}) {
    if (!selected || !currentVendorWork) return;
    setBusy(true);
    setNotice("");
    const data = { ...vendorProgress, ...overrides };
    const status = statusOverride ?? data.status;
    const lastUpdateSummary = summaryOverride ?? vendorProgress.lastUpdateSummary;
    const nextAction = nextActionOverride ?? vendorProgress.nextAction;
    try {
      const response = await request(`/api/repair-orders/${selected.id}/vendor-work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          approvalStatus: data.approvalStatus,
          approvedAmountCents: data.approvedAmountCents ? Number(data.approvedAmountCents) : null,
          currentLocation: data.currentLocation || currentVendorWork.vendorName,
          customerVisibleSummary: data.customerVisibleSummary || `Vendor update from ${currentVendorWork.vendorName}: ${lastUpdateSummary}`,
          directFromSource: data.directFromSource,
          estimateAmountCents: data.estimateAmountCents ? Number(data.estimateAmountCents) : null,
          evidence: data.evidence.split(",").map((value) => value.trim()).filter(Boolean),
          expectedReturnAt: data.expectedReturnAt ? new Date(data.expectedReturnAt).toISOString() : null,
          idempotencyKey: crypto.randomUUID(),
          internalNotes: data.internalNotes || null,
          keysCustodian: data.keysCustodian || currentVendorWork.vendorName,
          lastUpdateSummary,
          nextAction,
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt).toISOString() : null,
          occurredAt: new Date().toISOString(),
          reason: "Record outside vendor lifecycle update from repair planning.",
          scope: data.scope,
          sentFrom: data.sentFrom || null,
          status,
          supplementalAmountCents: data.supplementalAmountCents ? Number(data.supplementalAmountCents) : null,
          transportMethod: data.transportMethod || null,
          vendorWorkId: currentVendorWork.id
        })
      }) as { result?: { status?: string; vendorName?: string } };
      setVendorProgress((value) => ({ ...value, ...overrides, lastUpdateSummary, nextAction, status }));
      setNotice(`${response.result?.vendorName ?? currentVendorWork.vendorName} vendor workflow updated to ${format(response.result?.status ?? status)}.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Outside vendor progress could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function choose(id: string) {
    if (editingStep !== null) {
      setNotice("Save or cancel your edits before switching repair orders.");
      return;
    }
    setSelectedId(id);
    const order = model.repairOrders.find((item) => item.id === id);
    if (order) {
      const time = local(order.updatedAt);
      resetReleaseBuilder(order);
      setRepairPath(defaultRepairPath(order));
      setDiagnosis((value) => ({ ...value, concern: order.serviceVisit.concernSummary, diagnosedAt: time }));
      setDirectScope((value) => ({ ...value, concern: order.serviceVisit.concernSummary, diagnosedAt: time, ...bodyworkRepairDefaults(order.serviceVisit.concernSummary) }));
      const vendor = activeVendorWork(order);
      setVendorWork((value) => ({ ...value, expectedReturnAt: "", nextFollowUpAt: "", scope: order.serviceVisit.concernSummary, sentAt: time, vendorName: vendor?.vendorName ?? "" }));
      setVendorProgress(seedVendorProgress(vendor, order));
      setInspection((value) => ({ ...value, startedAt: local(order.serviceVisit.arrivedAt), completedAt: time }));
      setEstimate((value) => ({ ...value, presentedAt: time }));
      setAuthorization((value) => ({ ...value, decidedAt: time }));
      setRepairProgress((value) => ({ ...value, customerVisibleSummary: "", internalNotes: "", nextContactAt: time, promiseAt: order.inventoryUnit?.targetAt ? local(order.inventoryUnit.targetAt) : "", nextAction: order.inventoryUnit?.nextAction ?? "Continue repair and record the next progress update." }));
    }
  }

  async function submitAuthorizationDecision() {
    if (authorizationBlockedReason) {
      setNotice(authorizationBlockedReason);
      return;
    }
    const saved = await submit("DECIDE_AUTHORIZATION", {
      ...authorization,
      estimateVersionId: authorizationEstimate?.id,
      authorizedLineKeys: authorizationDraftLineKeys,
    }, "Record an attributable decision on the exact estimate version.");
    if (saved && approvalNeedsLineKeys) {
      window.setTimeout(() => navigateToInternalTarget("#repair-planning-step-5"), 150);
    }
  }

  const vendorWorkflowForm = selected ? <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submitVendorWork(); }}>
      <div className={styles.pathInfo}><strong>Outside vendor path</strong><p>Use this when the next accountable work belongs to a body shop, glass shop, calibration vendor, mechanic, detailer, or other third party. Saving this deploys the vendor workflow: custody, scope, parts needs, completion, return transportation, QC, and handoff.</p></div>
      <div className={styles.vendorAlgorithmGrid}>
        <span><strong>Receive</strong>Confirm whether the vendor has the car.</span>
        <span><strong>Scope</strong>Record what they are fixing and how much is known.</span>
        <span><strong>Parts</strong>Flag dealership-supplied parts or vendor blockers.</span>
        <span><strong>Return</strong>When fixed, start pickup or transport planning.</span>
        <span><strong>QC &amp; handoff</strong>After return, move through quality control and inventory lifecycle.</span>
      </div>
      <FormGrid>
        <Field label="Outside vendor"><input placeholder="Northside Garage" required value={vendorWork.vendorName} onChange={(event) => setVendorWork((value) => ({ ...value, vendorName: event.target.value }))} /></Field>
        <Field label="Vendor work type"><select value={vendorWork.workType} onChange={(event) => setVendorWork((value) => ({ ...value, workType: event.target.value }))}>{["BODY_SHOP", "MECHANICAL", "GLASS", "CALIBRATION", "DETAIL", "AUCTION_ARBITRATION", "OTHER"].map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
        <Field label="Vendor status"><select value={vendorWork.status} onChange={(event) => setVendorWork((value) => ({ ...value, status: event.target.value }))}>{["SCHEDULED", "AT_VENDOR", "ESTIMATE_NEEDED", "APPROVAL_NEEDED"].map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
        <Field label="What are they fixing?" wide><textarea required value={vendorWork.scope} onChange={(event) => setVendorWork((value) => ({ ...value, scope: event.target.value }))} /></Field>
        <Field label="Sent from"><input value={vendorWork.sentFrom} onChange={(event) => setVendorWork((value) => ({ ...value, sentFrom: event.target.value }))} /></Field>
        <Field label="Dispatch time"><input type="datetime-local" value={vendorWork.sentAt} onChange={(event) => setVendorWork((value) => ({ ...value, sentAt: event.target.value }))} /></Field>
        <Field label="Expected return"><input type="datetime-local" value={vendorWork.expectedReturnAt} onChange={(event) => setVendorWork((value) => ({ ...value, expectedReturnAt: event.target.value }))} /></Field>
        <Field label="Transport method"><input placeholder="Internal transport, carrier, driven there" value={vendorWork.transportMethod} onChange={(event) => setVendorWork((value) => ({ ...value, transportMethod: event.target.value }))} /></Field>
        <Field label="Approval status"><select value={vendorWork.approvalStatus} onChange={(event) => setVendorWork((value) => ({ ...value, approvalStatus: event.target.value }))}>{["NEEDS_DOCUMENTATION", "PENDING", "APPROVED", "NOT_REQUIRED"].map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
        <label className={styles.check}><input checked={vendorWork.directFromSource} type="checkbox" onChange={(event) => setVendorWork((value) => ({ ...value, directFromSource: event.target.checked, sentFrom: event.target.checked ? "Auction/source" : "Dealership" }))} />Direct from auction/source to vendor</label>
        <Field label="Evidence references" wide><input placeholder="auction note, dispatch text, vendor estimate, photos" value={vendorWork.evidence} onChange={(event) => setVendorWork((value) => ({ ...value, evidence: event.target.value }))} /></Field>
        <Field label="Next vendor follow-up"><input type="datetime-local" value={vendorWork.nextFollowUpAt} onChange={(event) => setVendorWork((value) => ({ ...value, nextFollowUpAt: event.target.value }))} /></Field>
        <Field label="Vendor update"><input value={vendorWork.lastUpdateSummary} onChange={(event) => setVendorWork((value) => ({ ...value, lastUpdateSummary: event.target.value }))} /></Field>
        <Field label="Next action" wide><input value={vendorWork.nextAction} onChange={(event) => setVendorWork((value) => ({ ...value, nextAction: event.target.value }))} /></Field>
        <Field label="Internal notes" wide><textarea value={vendorWork.internalNotes} onChange={(event) => setVendorWork((value) => ({ ...value, internalNotes: event.target.value }))} /></Field>
      </FormGrid>
      <Submit busy={busy}>Deploy vendor workflow</Submit>
    </form> : null;

  return <section className={styles.workspace}>
    <header className={styles.hero}>
      <div>
        <nav aria-label="Repair planning breadcrumb"><Link href="/vehicles/repair-workbench">Repair Workbench</Link><ChevronRight /><span>Repair Planning</span></nav>
        <span className={styles.eyebrow}>Shop Operations · Estimate-ready intake</span>
        <h1>Repair Planning</h1>
        <p>Pick the repair path, open the Labor Guide, and keep staff moving from intake to estimate, authorization, and release.</p>
      </div>
      <div className={styles.heroActions}><Link href={summaryCardHref}><ArrowLeft />Return to summary card</Link>{safeReturnTo !== summaryCardHref ? <Link href={safeReturnTo}>Return to source workbench</Link> : null}{selected ? <Link className={styles.primary} href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}?returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(summaryCardHref)}`)}`}>Open Vehicle 360</Link> : null}</div>
      <div className={styles.truthBar}><span><BadgeCheck /><b>Authoritative repair plan</b></span><span><LockKeyhole />Immutable evidence versions</span><span>Exact-version customer authorization required</span><span>Repair work remains blocked until readiness passes.</span></div>
    </header>

    {displayNotice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|not enabled|already exists/i.test(displayNotice) ? styles.danger : styles.success}`}><p>{displayNotice}</p>{notice.includes("cannot move backward") && staffNext ? staffNext.href.startsWith("/") ? <Link href={staffNext.href}>{staffNext.action}<ChevronRight /></Link> : <button className={styles.inlineNavAction} onClick={() => navigateToInternalTarget(staffNext.href)} type="button">{staffNext.action}<ChevronRight /></button> : null}</div> : null}

    <section className={styles.orderBar}>
      <label><span>Active repair order</span><select value={selected?.id ?? ""} onChange={(event) => choose(event.target.value)}>{model.repairOrders.map((order) => <option key={order.id} value={order.id}>{order.repairOrderNumber} · {order.vehicle.vehicleNumber} · {format(order.stage)}</option>)}</select></label>
      {selected ? <><div className={styles.vehicleIcon}><CarFront /></div><div className={styles.orderIdentity}><span>{orderPathLabel}</span><h2>{vehicleLabel(selected)}</h2><p>{selected.vehicle.vin ? `VIN ${selected.vehicle.vin}` : selected.vehicle.vehicleNumber} · {selected.repairOrderNumber} · version {selected.version}</p></div><dl><div><dt>Current gate</dt><dd>{format(selected.stage)}</dd></div><div><dt>Responsible party</dt><dd>{selected.customer?.displayName ?? selected.inventoryUnit?.inventoryNumber ?? "Internal inventory"}</dd></div><div><dt>Arrival</dt><dd>{new Date(selected.serviceVisit.arrivedAt).toLocaleString()}</dd></div></dl></> : null}
    </section>

    {selected ? <>
      {!stageTwoComplete ? <section className={styles.repairTypePicker} aria-label="Select repair type"><header><span>Repair path</span><h2>Choose path</h2><p>Pick how this RO should be estimated. Details stay available inside each step.</p></header><div className={styles.pathPicker} role="radiogroup" aria-label="Repair type"><button aria-checked={!directPath && !vendorPath} className={!directPath && !vendorPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("DIAGNOSTIC")} role="radio" type="button"><Stethoscope /> Diagnostic / mechanical</button><button aria-checked={directPath} className={directPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("DIRECT_BODY")} role="radio" type="button"><Wrench /> Bodywork repair</button><button aria-checked={vendorPath} className={vendorPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("VENDOR")} role="radio" type="button"><Building2 /> Outside vendor</button></div></section> : null}
      <section className={styles.toolStrip} aria-label="Quick repair actions">
        <div><span>Quick action flow</span><h2>Intake &rarr; diagnosis &rarr; Labor Guide estimate &rarr; authorization</h2></div>
        <nav>
          {staffNext ? staffNext.href.startsWith("/") ? <Link href={staffNext.href}>{staffNext.action}<ChevronRight /></Link> : <button onClick={() => navigateToInternalTarget(staffNext.href)} type="button">{staffNext.action}<ChevronRight /></button> : null}
          {!vendorPath ? <Link className={styles.toolPrimary} href={laborGuideHref}><Gauge />Build Labor Guide estimate</Link> : null}
          <Link href={dispatchHref}><Truck />Shop Dispatch</Link>
        </nav>
      </section>
      {staffNext ? <section className={styles.staffNow} aria-label="What staff should do now"><div><span>What staff should do now</span><h2>{staffNext.title}</h2><p>{staffNext.detail}</p></div>{staffNext.href.startsWith("/") ? <Link href={staffNext.href}>{staffNext.action}<ChevronRight /></Link> : <button className={styles.primaryJumpAction} onClick={() => navigateToInternalTarget(staffNext.href)} type="button">{staffNext.action}<ChevronRight /></button>}</section> : null}
      <section className={styles.mission}>{vendorPath ? <Building2 /> : directPath ? <Wrench /> : <Stethoscope />}<div><span>{missionLabel}</span><h2>{missionTitle}</h2><p>{selected.serviceVisit.concernSummary}</p></div><aside><strong>{displayCurrentStep + 1} of {displaySteps.length}</strong><span>{vendorPath ? "vendor steps" : "repair stages"}</span></aside></section>

      <section className={styles.stepRail} aria-label={vendorPath ? "Outside vendor progress" : "Repair planning stages"}>{displaySteps.map((step, index) => { const Icon = step.icon; const state = index < displayCurrentStep ? styles.complete : index === displayCurrentStep ? styles.active : ""; return <div className={state} key={step.label}><span>{index < displayCurrentStep ? <Check /> : <Icon />}</span><small>Step {index + 1}</small><strong>{step.label}</strong></div>; })}</section>

      <div className={styles.commandGrid}>
        <main className={styles.workflow}>
          <WorkflowStep editing={editingStep === 1} editDisabled={busy || (editingStep !== null && editingStep !== 1)} onEdit={() => beginDraftEdit(1)} onCancel={cancelEditing} complete={selected.inspectionVersions.length > 0} icon={<FileCheck2 />} number={1} open={currentStep === 0 || staffNext?.step === 1} showEditControls={false} subtitle="Check the required items, add proof only where needed, then unlock the next stage." title="Stage 1-5 clearance checklist">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_INSPECTION", { templateCode: inspection.templateCode, templateVersion: inspection.templateVersion, templateSnapshot: { code: inspection.templateCode, version: inspection.templateVersion }, startedAt: inspection.startedAt, completedAt: inspection.completedAt, summary: inspection.summary || clearanceItems.filter((item) => item.status === "CLEARED").map((item) => item.label).join(", "), items: clearanceItems.map((item) => ({ key: item.key, label: item.label, result: item.result, measurement: item.required ? "" : "Optional", notes: item.detail, evidence: [item.proof].filter(Boolean) })) }, "Record a versioned digital vehicle inspection."); }}>
              <div className={styles.clearanceReview}>
                <header className={styles.clearanceHeader}>
                  <div>
                    <span className={styles.simpleEyebrow}>Adopted checklist flow</span>
                    <h3>Check what is cleared. The app locks what is not ready.</h3>
                    <p>This replaces the long inspection-entry form for the normal Stage 1 and Stage 2 workflow. Staff only open details when proof or a note is needed.</p>
                  </div>
                  <aside>
                    <strong>{clearedRequiredCount}/{clearanceRequired.length}</strong>
                    <span>required cleared</span>
                  </aside>
                </header>
                <div className={styles.clearanceTimeline} aria-label="Stage clearance overview">
                  {clearanceStages.map((stage) => <article className={`${styles.clearanceStage} ${stage.tone === "done" ? styles.clearanceStageDone : stage.tone === "current" ? styles.clearanceStageCurrent : styles.clearanceStageLocked}`} key={stage.label}>
                    <span>{stage.state}</span>
                    <h4>{stage.label}</h4>
                    <p>{stage.detail}</p>
                  </article>)}
                </div>
                <div className={styles.clearanceGrid}>
                  <section className={styles.clearanceList} aria-label="Inspection clearance items">
                    <header>
                      <span>Stage 2 - Inspection</span>
                      <strong>{stageClearanceReady ? "Ready for diagnosis" : `${clearanceBlockers.length} item${clearanceBlockers.length === 1 ? "" : "s"} still open`}</strong>
                    </header>
                    {clearanceItems.map((item) => <button aria-pressed={item.status === "CLEARED"} className={`${styles.clearanceRow} ${item.key === activeClearanceKey ? styles.clearanceRowActive : ""}`} key={item.key} onClick={() => toggleClearance(item)} type="button">
                      <span className={styles.clearanceCheck}>{item.status === "CLEARED" ? <Check /> : item.required ? "" : "+"}</span>
                      <span><strong>{item.label}</strong><small>{item.detail}</small>{item.proof ? <em>{item.proof}</em> : null}</span>
                      <b>{format(item.status)}</b>
                    </button>)}
                  </section>
                  <aside className={styles.clearanceGate}>
                    <span>{stageClearanceReady ? "Next step open" : "Next step locked"}</span>
                    <h4>{stageClearanceReady ? "Diagnosis can begin" : "Finish the required clearance items"}</h4>
                    <p>{stageClearanceReady ? "All required inspection blockers are cleared. Saving this review records the current inspection version for the repair order." : `${clearanceBlockers.map((item) => item.label).join(", ")} still need attention before staff should advance.`}</p>
                    <button disabled={!stageClearanceReady || busy} type="submit">{stageClearanceReady ? "Save and unlock diagnosis" : "Unlock diagnosis"}</button>
                  </aside>
                </div>
                {activeClearanceItem ? <details className={styles.clearanceEditor}>
                  <summary>Add proof or change result for {activeClearanceItem.label}</summary>
                  <div>
                    <h4>{activeClearanceItem.label}</h4>
                    <p>{activeClearanceItem.detail}</p>
                  </div>
                  <div className={styles.resultButtons} aria-label="Clearance state">
                    {(["CLEARED", "NEEDS_PROOF", "REQUIRED", "NOT_CHECKED"] as ClearanceStatus[]).map((status) => <button className={activeClearanceItem.status === status ? styles.resultActive : ""} key={status} onClick={() => updateClearance(activeClearanceItem.key, { status })} type="button">{format(status)}</button>)}
                  </div>
                  <FormGrid>
                    <Field label="Result">
                      <select value={activeClearanceItem.result} onChange={(event) => updateClearance(activeClearanceItem.key, { result: event.target.value as ClearanceResult })}>
                        {["PASS", "ADVISORY", "FAIL", "NOT_APPLICABLE"].map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Proof or quick note">
                      <input placeholder="Photo, scan, video, measurement, or note" value={activeClearanceItem.proof} onChange={(event) => updateClearance(activeClearanceItem.key, { proof: event.target.value })} />
                    </Field>
                  </FormGrid>
                </details> : null}
              </div>
              <details className={styles.advancedDetails}>
                <summary>System details for uncommon inspection notes</summary>
                <FormGrid>
                  <Field label="Area checked">
                    <input placeholder="Example: General condition, brakes, front suspension, body damage" value={inspection.itemLabel} onChange={(event) => setInspection((value) => ({ ...value, itemLabel: event.target.value }))} />
                  </Field>
                  <Field label="Measurement or quick note (optional)">
                    <input placeholder="Example: 4 mm, 12.4V, cracked, no reading" value={inspection.measurement} onChange={(event) => setInspection((value) => ({ ...value, measurement: event.target.value }))} />
                  </Field>
                  <Field label="Proof references">
                    <input placeholder="Example: photos, scan results, auction notes, walkaround video" value={inspection.evidence} onChange={(event) => setInspection((value) => ({ ...value, evidence: event.target.value }))} />
                  </Field>
                  <Field label="Extra inspection notes (optional)" wide>
                    <textarea placeholder="Anything the team should know that does not fit in the main finding." value={inspection.itemNotes} onChange={(event) => setInspection((value) => ({ ...value, itemNotes: event.target.value }))} />
                  </Field>
                  <Field label="Started"><input type="datetime-local" value={inspection.startedAt} onChange={(event) => setInspection((value) => ({ ...value, startedAt: event.target.value }))} /></Field>
                  <Field label="Completed"><input type="datetime-local" value={inspection.completedAt} onChange={(event) => setInspection((value) => ({ ...value, completedAt: event.target.value }))} /></Field>
                  <Field label="Template code"><input value={inspection.templateCode} onChange={(event) => setInspection((value) => ({ ...value, templateCode: event.target.value }))} /></Field>
                </FormGrid>
              </details>
              <Submit busy={busy} disabled={!stageClearanceReady}>Save checklist and unlock next stage</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep editing={editingStep === 2} editDisabled={busy || (editingStep !== null && editingStep !== 2)} onEdit={() => beginDraftEdit(2)} onCancel={cancelEditing} complete={stageTwoComplete} icon={vendorPath ? <Building2 /> : <Stethoscope />} number={2} open={currentStep === 1 || staffNext?.step === 2} showEditControls={false} subtitle="Choose the path, confirm the scope, and move on. Open details only when the case needs extra explanation." title={stageTwoTitle}>
            <div className={styles.pathPicker} role="tablist" aria-label="Repair path">
              <button aria-pressed={!directPath && !vendorPath} className={!directPath && !vendorPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("DIAGNOSTIC")} type="button">Diagnostic / mechanical</button>
              <button aria-pressed={directPath} className={directPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("DIRECT_BODY")} type="button">Bodywork repair</button>
              <button aria-pressed={vendorPath} className={vendorPath ? styles.pathActive : ""} onClick={() => chooseRepairPath("VENDOR")} type="button"><Building2 /> Outside vendor</button>
            </div>
            <div className={styles.concern}><span>Carried forward from intake</span><p>{selected.serviceVisit.concernSummary}</p></div>
            {vendorNeedsInternalCompletion ? (
              <div className={styles.simpleCard}>
                <span className={styles.simpleEyebrow}>Same-RO completion work</span>
                <h3>Create the internal follow-up job here, not a separate unrelated RO</h3>
                <p>Dealership QC failed the outside-vendor return. Keep {selected.repairOrderNumber} as the parent record, choose the internal path that fits the missing work, then create the estimate and repair job for the unfinished items.</p>
                <div className={styles.simpleInstructions}>
                  <strong>Recommended for this case</strong>
                  <p>Use the missing vendor scope as the new internal completion scope, for example: complete the outer door handle and replace the upper/lower steering column covers.</p>
                </div>
                <div className={styles.simpleActions}>
                  <button type="button" onClick={() => setRepairPath("DIRECT_BODY")}>Create internal completion scope</button>
                  <button type="button" onClick={() => setRepairPath("DIAGNOSTIC")}>Use diagnostic path instead</button>
                </div>
              </div>
            ) : null}
            {vendorPath ? currentVendorWork ? <section className={styles.vendorRouteActive}>
              <header><Building2 /><div><span>Vendor workflow active</span><h3>{currentVendorWork.vendorName}</h3><p>{currentVendorWork.scope}</p></div><b>{format(currentVendorWork.status)}</b></header>
              <div className={styles.vendorAlgorithmGrid}>
                <span><strong>Did the vendor receive it?</strong>{["SCHEDULED", "ESTIMATE_NEEDED", "APPROVAL_NEEDED"].includes(currentVendorWork.status) ? "Confirm with vendor" : "Yes, vendor route is active"}</span>
                <span><strong>What are they fixing?</strong>{vendorProgress.scope || currentVendorWork.scope || "Scope needs update"}</span>
                <span><strong>Do they need parts?</strong>{currentVendorWork.status === "WAITING_PARTS" ? "Yes, open parts control" : "Not reported yet"}</span>
                <span><strong>Was it fixed?</strong>{vendorRepairFailed(currentVendorWork) ? "No — vendor repair failed or remains incomplete" : ["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(currentVendorWork.status) ? "Vendor says repairs are complete" : "Not yet"}</span>
                <span><strong>What happens after completion?</strong>{vendorRepairFailed(currentVendorWork) ? "Bring it back for QC and a repair decision" : currentVendorWork.status === "RETURN_TRANSPORT" ? "Track pickup / return transport" : ["READY_FOR_PICKUP", "RETURNED"].includes(currentVendorWork.status) ? "Plan return transport, then QC and handoff" : "Keep next vendor update current"}</span>
              </div>
              <form className={styles.vendorProgressForm} onSubmit={(event: FormEvent) => { event.preventDefault(); void submitVendorProgress(); }}>
                <div className={styles.pathInfo}><strong>Staff-entered vendor workbench</strong><p>Use updates received from the vendor by phone, text, email, or in person. Edit incorrect vendor information here, then move the vehicle through the vendor lifecycle. Every save creates a vendor event, advisor update, custody update when returned, and repair-order stage projection.</p></div>
                <FormGrid>
                  <Field label="Vendor lifecycle status"><select value={vendorProgress.status} onChange={(event) => setVendorProgress((value) => ({ ...value, status: event.target.value }))}>{vendorStatuses.map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
                  <Field label="Approval status"><select value={vendorProgress.approvalStatus} onChange={(event) => setVendorProgress((value) => ({ ...value, approvalStatus: event.target.value }))}>{vendorApprovalStatuses.map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
                  <Field label="Current location"><input value={vendorProgress.currentLocation} onChange={(event) => setVendorProgress((value) => ({ ...value, currentLocation: event.target.value }))} /></Field>
                  <Field label="Correct vendor scope" wide><textarea value={vendorProgress.scope} onChange={(event) => setVendorProgress((value) => ({ ...value, scope: event.target.value }))} /></Field>
                  <Field label="Vendor update"><input value={vendorProgress.lastUpdateSummary} onChange={(event) => setVendorProgress((value) => ({ ...value, lastUpdateSummary: event.target.value }))} /></Field>
                  <Field label="Next action"><input value={vendorProgress.nextAction} onChange={(event) => setVendorProgress((value) => ({ ...value, nextAction: event.target.value }))} /></Field>
                  <Field label="Expected return"><input type="datetime-local" value={vendorProgress.expectedReturnAt} onChange={(event) => setVendorProgress((value) => ({ ...value, expectedReturnAt: event.target.value }))} /></Field>
                  <Field label="Next follow-up"><input type="datetime-local" value={vendorProgress.nextFollowUpAt} onChange={(event) => setVendorProgress((value) => ({ ...value, nextFollowUpAt: event.target.value }))} /></Field>
                  <Field label="Estimate cents"><input min="0" type="number" value={vendorProgress.estimateAmountCents} onChange={(event) => setVendorProgress((value) => ({ ...value, estimateAmountCents: event.target.value }))} /></Field>
                  <Field label="Approved cents"><input min="0" type="number" value={vendorProgress.approvedAmountCents} onChange={(event) => setVendorProgress((value) => ({ ...value, approvedAmountCents: event.target.value }))} /></Field>
                  <Field label="Supplement cents"><input min="0" type="number" value={vendorProgress.supplementalAmountCents} onChange={(event) => setVendorProgress((value) => ({ ...value, supplementalAmountCents: event.target.value }))} /></Field>
                  <Field label="Evidence references"><input placeholder="vendor estimate, call note, photos, parts list" value={vendorProgress.evidence} onChange={(event) => setVendorProgress((value) => ({ ...value, evidence: event.target.value }))} /></Field>
                  <Field label="Transport method"><input value={vendorProgress.transportMethod} onChange={(event) => setVendorProgress((value) => ({ ...value, transportMethod: event.target.value }))} /></Field>
                  <Field label="Keys custodian"><input value={vendorProgress.keysCustodian} onChange={(event) => setVendorProgress((value) => ({ ...value, keysCustodian: event.target.value }))} /></Field>
                  <Field label="Customer-visible note" wide><textarea value={vendorProgress.customerVisibleSummary} onChange={(event) => setVendorProgress((value) => ({ ...value, customerVisibleSummary: event.target.value }))} /></Field>
                  <Field label="Internal notes" wide><textarea value={vendorProgress.internalNotes} onChange={(event) => setVendorProgress((value) => ({ ...value, internalNotes: event.target.value }))} /></Field>
                </FormGrid>
                <div className={styles.vendorLifecycleActions}>
                  <button disabled={busy} onClick={() => void submitVendorProgress("ESTIMATE_NEEDED", "Vendor estimate requested.", "Confirm vendor estimate, scope, and expected return.")} type="button">Need estimate</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("APPROVAL_NEEDED", "Vendor approval needed.", "Review vendor estimate and record approval decision.")} type="button">Need approval</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("AT_VENDOR", "Vendor is actively repairing the vehicle.", "Monitor vendor progress, parts needs, and expected return.")} type="button">At vendor</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("WAITING_PARTS", "Vendor is waiting on parts.", "Open parts readiness and resolve the vendor parts blocker.")} type="button">Waiting parts</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("READY_FOR_PICKUP", "Vendor repairs are complete and the vehicle is ready for pickup.", "Organize return transportation, then complete dealership QC.")} type="button">Ready pickup</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("RETURN_TRANSPORT", "Return transportation is in progress.", "Track pickup ETA and confirm dealership receipt.", { status: "RETURN_TRANSPORT", currentLocation: "In transit to dealership" })} type="button">Pickup started</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("RETURNED", "Vehicle returned from outside vendor.", "Complete dealership quality control before handoff.")} type="button">Returned</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("QC_REQUIRED", "Outside vendor work is ready for dealership QC.", "Complete quality control and release the vehicle to the next inventory step.")} type="button">QC required</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("COMPLETED", "Outside vendor repair and dealership QC are complete.", "Continue inventory lifecycle handoff after QC.")} type="button">Complete vendor work</button>
                </div>
                <Submit busy={busy}>Save vendor update</Submit>
              </form>
            </section> : vendorWorkflowForm : directPath ? <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_DIRECT_REPAIR_SCOPE", { ...directScope, evidence: directScope.evidence.split(",").map((value) => value.trim()).filter(Boolean) }, "Record a governed direct repair scope without troubleshooting diagnosis."); }}>
              <section className={styles.simpleCard}>
                <span className={styles.simpleEyebrow}>Fast scope confirmation</span>
                <h3>Use the visible damage as the repair scope</h3>
                <p>{directScope.scopeSummary}</p>
                <dl className={styles.simpleFacts}>
                  <div><dt>Path</dt><dd>{format(directScope.scopeType)}</dd></div>
                  <div><dt>Why no diagnosis</dt><dd>{directScope.whyNoDiagnosis}</dd></div>
                  <div><dt>Next step</dt><dd>Create the estimate from this approved scope.</dd></div>
                </dl>
              </section>
              <details className={styles.advancedDetails}>
                <summary>Scope details for unusual bodywork cases</summary>
                <div className={styles.pathInfo}><strong>Bodywork repair path</strong><p>Use this for visible body, collision, paint, dent, cosmetic, or teardown work when troubleshooting diagnostics are not needed to define the repair.</p></div>
                <FormGrid><Field label="Direct repair summary (required)" wide><textarea required value={directScope.scopeSummary} onChange={(event) => setDirectScope((value) => ({ ...value, scopeSummary: event.target.value }))} /></Field><Field label="Why diagnosis is not required (required)" wide><textarea required value={directScope.whyNoDiagnosis} onChange={(event) => setDirectScope((value) => ({ ...value, whyNoDiagnosis: event.target.value }))} /></Field><Field label="Scope type"><select value={directScope.scopeType} onChange={(event) => setDirectScope((value) => ({ ...value, scopeType: event.target.value }))}><option value="BODYWORK">Bodywork</option><option value="COLLISION">Collision</option><option value="OUTSIDE_VENDOR">Outside vendor</option><option value="COSMETIC">Cosmetic</option></select></Field><Field label="Evidence references (optional)"><input placeholder="photos, auction notes, vendor teardown" value={directScope.evidence} onChange={(event) => setDirectScope((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Scope uncertainty"><select value={directScope.uncertainty} onChange={(event) => setDirectScope((value) => ({ ...value, uncertainty: event.target.value }))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Responsible reviewer"><select required value={directScope.technicianUserId} onChange={(event) => setDirectScope((value) => ({ ...value, technicianUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Recommendation (required)"><textarea required value={directScope.recommendation} onChange={(event) => setDirectScope((value) => ({ ...value, recommendation: event.target.value }))} /></Field><Field label="Proposed correction (required)"><textarea required value={directScope.proposedCorrection} onChange={(event) => setDirectScope((value) => ({ ...value, proposedCorrection: event.target.value }))} /></Field></FormGrid>
              </details>
              {displayNotice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|not enabled|already exists/i.test(displayNotice) ? styles.danger : ""}`}><p>{displayNotice}</p></div> : null}
              <Submit busy={busy}>Confirm scope and unlock estimate</Submit>
            </form> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_DIAGNOSIS", { ...diagnosis, symptoms: diagnosis.symptoms.split(",").map((value) => value.trim()).filter(Boolean), tests: [{ name: diagnosis.testName, result: diagnosis.testResult }], evidence: diagnosis.evidence.split(",").map((value) => value.trim()).filter(Boolean) }, "Record evidence-backed concern, cause, and proposed correction."); }}>
              <section className={styles.simpleCard}>
                <span className={styles.simpleEyebrow}>Fast diagnosis confirmation</span>
                <h3>Confirm the likely cause and repair direction</h3>
                <p>{diagnosis.proposedCorrection || latestDiagnosis?.proposedCorrection || selected.serviceVisit.concernSummary}</p>
                <dl className={styles.simpleFacts}>
                  <div><dt>Concern</dt><dd>{selected.serviceVisit.concernSummary}</dd></div>
                  <div><dt>Uncertainty</dt><dd>{format(diagnosis.uncertainty)}</dd></div>
                  <div><dt>Technician</dt><dd>{model.users.find((user) => user.id === diagnosis.technicianUserId)?.name ?? "Select technician"}</dd></div>
                </dl>
              </section>
              <details className={styles.advancedDetails}>
                <summary>Diagnosis details when troubleshooting needs documentation</summary>
                <FormGrid><Field label="Symptoms"><input placeholder="Comma separated" value={diagnosis.symptoms} onChange={(event) => setDiagnosis((value) => ({ ...value, symptoms: event.target.value }))} /></Field><Field label="Diagnostic test"><input value={diagnosis.testName} onChange={(event) => setDiagnosis((value) => ({ ...value, testName: event.target.value }))} /></Field><Field label="Test result"><input value={diagnosis.testResult} onChange={(event) => setDiagnosis((value) => ({ ...value, testResult: event.target.value }))} /></Field><Field label="Evidence references"><input value={diagnosis.evidence} onChange={(event) => setDiagnosis((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Root cause" wide><textarea value={diagnosis.cause} onChange={(event) => setDiagnosis((value) => ({ ...value, cause: event.target.value }))} /></Field><Field label="Diagnostic uncertainty"><select value={diagnosis.uncertainty} onChange={(event) => setDiagnosis((value) => ({ ...value, uncertainty: event.target.value }))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Technician"><select value={diagnosis.technicianUserId} onChange={(event) => setDiagnosis((value) => ({ ...value, technicianUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Recommendation"><textarea value={diagnosis.recommendation} onChange={(event) => setDiagnosis((value) => ({ ...value, recommendation: event.target.value }))} /></Field><Field label="Proposed correction"><textarea value={diagnosis.proposedCorrection} onChange={(event) => setDiagnosis((value) => ({ ...value, proposedCorrection: event.target.value }))} /></Field></FormGrid>
              </details>
              <Submit busy={busy}>Confirm diagnosis and unlock estimate</Submit>
            </form>}
          </WorkflowStep>

          <WorkflowStep editing={editingStep === 3} editDisabled={busy || (editingStep !== null && editingStep !== 3)} onEdit={() => beginDraftEdit(3)} onCancel={cancelEditing} complete={vendorPath ? vendorEstimateCaptured(currentVendorWork) : selected.estimateVersions.length > 0} icon={<Gauge />} number={3} open={currentStep === 2 || staffNext?.step === 3} showEditControls={false} subtitle={vendorPath ? "Vendor estimate and approval are tracked from staff-entered vendor updates while the work stays offsite." : "Use quick estimate lines first. Open line details only when the estimate needs manual pricing or adjustment."} title={vendorPath ? "Vendor estimate update" : directPath ? "Direct repair estimate" : "Exact-version estimate"}>
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submitEstimate(); }}>
              {revisionSource ? <section className={styles.pathInfo} aria-label="Estimate revision"><strong>Revising estimate v{revisionSource.version}</strong><p>The original remains in history. Review every price, tax, discount, source note, and date. Prior manual-review notes are historical, not verification of this revision. Changed work needs a new approval.</p><FormGrid><Field label="Reason for revision"><input required maxLength={350} value={revisionReason} onChange={event => setRevisionReason(event.target.value)} /></Field><Field label="Assumptions / source notes (review before saving)" wide><textarea value={revisionNotes} onChange={event => setRevisionNotes(event.target.value)} /></Field></FormGrid></section> : null}
              {vendorPath ? <div className={styles.pathInfo}><strong>Simple vendor estimate path</strong><p>If the outside vendor is already approved to do the job, the saved vendor record is the evidence: vendor name, repair scope, current location/status, and approval. You do not need to create an internal diagnosis just to present this estimate.</p></div> : directPath ? <details className={styles.advancedDetails}><summary>Estimate guidance</summary><div className={styles.pathInfo}><strong>Body and collision estimating discipline</strong><p>Follow the same fast sequence every time: visible scope, labor guide or vendor quote, parts list, internal spend decision, then repair release. This keeps bodywork moving without pretending a troubleshooting diagnosis happened when it did not.</p></div><div className={styles.pathInfo}><strong>Rapid recon estimate recipe</strong><p>1) use body labor guide or vendor quote, 2) separate labor, parts, and sublet cleanly, 3) preserve teardown supplements as new exact versions, and 4) never promise completion until parts and vendor timing are real.</p></div></details> : null}
              {vendorNeedsInternalCompletion && !vendorPath ? <div className={styles.simpleCard} id="repair-planning-step-3-completion-estimate" tabIndex={-1}>
                <span className={styles.simpleEyebrow}>Completion estimate</span>
                <h3>Turn the failed vendor QC items into an approved line</h3>
                <p>Enter the unfinished work from dealership QC here, present the completion estimate, then approve that exact line in Stage 4 before creating the internal repair job.</p>
                <div className={styles.simpleInstructions}>
                  <strong>Recommended for this case</strong>
                  <p>Use the missing vendor scope as the estimate line, such as completing the outer door handle and replacing the upper/lower steering column covers.</p>
                </div>
                <div className={styles.simpleActions}>
                  <button className={styles.primaryAction} disabled={busy} onClick={() => void createFastApprovedRepairJob()} type="button">{busy ? "Creating completion job..." : "Create/open completion job"}</button>
                </div>
              </div> : null}
              {reconBudget ? <div className={styles.concern}><span>{reconBudget.source === "TAI" ? "TAI recon budget guardrail" : "Recon budget guardrail"}</span><p>{reconBudget.status === "OVER_BUDGET" ? "This estimate is already beyond the current recon spend target. Review the scope, labor source, and approval path before releasing more work." : reconBudget.status === "CAUTION" ? "This vehicle is getting close to its current recon budget. Tighten the estimate and confirm the next approval before moving forward." : "There is still recon spend room available for this vehicle. Keep the estimate anchored to real labor, parts, and vendor work."}</p><p>Budget {formatMoneyCents(reconBudget.estimatedReconBudgetCents)} · committed {formatMoneyCents(reconBudget.committedSpendCents)} · remaining {formatMoneyCents(reconBudget.remainingBudgetCents)}</p></div> : null}
              {!vendorPath ? <section className={styles.simpleCard} aria-label="Simple estimate builder"><span className={styles.simpleEyebrow}>Simple estimate lines</span><h3>Add the repair lines, edit them if needed, then present the estimate</h3><p>Keep this stage simple. Add plain estimate lines like R &amp; R brake vacuum pump, repair and paint front bumper cover, sublet alignment, or teardown. The full labor guide is still available when staff needs deeper research.</p><div className={styles.simpleActions}>{directPath || vendorNeedsInternalCompletion ? <button className={styles.primaryAction} disabled={busy} onClick={() => void createFastApprovedRepairJob()} type="button">{busy ? "Creating completion job..." : vendorNeedsInternalCompletion ? "Create/open completion job" : "Create/open repair job"}</button> : null}<Link className={styles.primaryAction} href={laborGuideHref}>Open full Labor Guide</Link></div><label className={styles.laborGuideHelper}><span>Quick search for a common repair area</span><input placeholder="Example: brake vacuum pump, bumper, paint, teardown" value={laborGuideQuery} onChange={(event) => setLaborGuideQuery(event.target.value)} /></label>{quickEstimateOptions.length ? <div className={styles.estimateQuickPicks}>{quickEstimateOptions.map((option) => <button disabled={busy} key={option.key} onClick={() => applyLaborGuideOption(option)} type="button">{option.title}</button>)}</div> : null}</section> : null}
              <details className={styles.estimateEntryCard} aria-label="Add work to estimate">
                <summary>Estimate line details</summary>
                <header>
                  <span>Add work to estimate</span>
                  <h3>Describe the work, confirm time and price, then add the line.</h3>
                </header>
                <div className={styles.estimateEntryGrid}>
                  <Field label="Work type">
                    <select value={estimate.lineType} onChange={(event) => setEstimate((value) => ({ ...value, lineType: event.target.value as EstimateDraft["lineType"] }))}>{["LABOR", "PART", "FEE"].map((value) => <option key={value}>{format(value)}</option>)}</select>
                  </Field>
                  <Field label="Quantity">
                    <input min="1" type="number" value={estimate.quantity} onChange={(event) => setEstimate((value) => ({ ...value, quantity: Number(event.target.value) || 1 }))} />
                  </Field>
                  <Field label="Labor time">
                    <input min="0" type="number" value={estimate.laborGuideMinutes} onChange={(event) => setEstimate((value) => ({ ...value, laborGuideMinutes: Number(event.target.value) }))} />
                  </Field>
                  <Field label="Price">
                    <input min="0" type="number" value={estimate.unitPriceCents} onChange={(event) => setEstimate((value) => ({ ...value, unitPriceCents: Number(event.target.value) }))} />
                  </Field>
                  <Field label="What is being added?" wide>
                    <input placeholder="Example: R & R brake vacuum pump" required={!estimateLines.length} value={estimate.description} onChange={(event) => setEstimate((value) => ({ ...value, description: event.target.value }))} />
                  </Field>
                  <Field label="What should be done?" wide>
                    <input placeholder="Example: Remove and replace failed brake vacuum pump, verify brake assist, and road test" required={!estimateLines.length} value={estimate.plannedCorrection} onChange={(event) => setEstimate((value) => ({ ...value, plannedCorrection: event.target.value }))} />
                  </Field>
                </div>
                <details className={styles.advancedDetails}>
                  <summary>Advanced defaults</summary>
                  <FormGrid>
                    <Field label="Line key"><input required value={estimate.lineKey} onChange={(event) => setEstimate((value) => ({ ...value, lineKey: event.target.value }))} /></Field>
                    <Field label="Work type code"><input value={estimate.workTypeCode} onChange={(event) => setEstimate((value) => ({ ...value, workTypeCode: event.target.value }))} /></Field>
                    <Field label="Tax (cents)"><input min="0" type="number" value={estimate.taxCents} onChange={(event) => setEstimate((value) => ({ ...value, taxCents: Number(event.target.value) }))} /></Field>
                    <Field label="Discount (cents)"><input min="0" type="number" value={estimate.discountCents} onChange={(event) => setEstimate((value) => ({ ...value, discountCents: Number(event.target.value) }))} /></Field>
                    <Field label="Presented"><input required type="datetime-local" value={estimate.presentedAt} onChange={(event) => setEstimate((value) => ({ ...value, presentedAt: event.target.value }))} /></Field>
                    <Field label="Expires"><input min={estimate.presentedAt} required type="datetime-local" value={estimate.expiresAt} onChange={(event) => setEstimate((value) => ({ ...value, expiresAt: event.target.value }))} /></Field>
                  </FormGrid>
                </details>
                {!vendorPath ? <div className={styles.estimateLineActions}><button disabled={busy} onClick={saveEstimateLine} type="button">{estimateLines.some((line) => line.key === estimate.lineKey) ? "Update line" : "Add line to estimate"}</button><button disabled={busy} onClick={() => resetEstimateDraft()} type="button">Start a new line</button></div> : null}
              </details>
              {!vendorPath && estimateLines.length ? <section className={styles.estimateLineList} aria-label="Estimate draft lines"><header><div><span>Estimate draft</span><h3>{estimateLines.length} line{estimateLines.length === 1 ? "" : "s"} ready for approval</h3></div></header>{estimateLines.map((line) => <article key={line.key}><div><strong>{line.key} · {line.description}</strong><p>{line.plannedCorrection}</p><small>{line.quantity} x {money(line.unitPriceCents)} · {format(line.workTypeCode)}</small></div><div className={styles.estimateLineActions}><button disabled={busy} onClick={() => editEstimateLine(line)} type="button">Edit</button><button disabled={busy} onClick={() => removeEstimateLine(line.key)} type="button">Remove</button></div></article>)}</section> : null}
              {displayNotice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|not enabled|already exists|expiration|valid date/i.test(displayNotice) ? styles.danger : ""}`}>
                <p>{displayNotice}</p>
                {directPath && displayNotice.includes("Save the bodywork repair scope first") ? <button className={styles.inlineNavAction} onClick={() => navigateToInternalTarget("#repair-planning-step-2")} type="button">Open bodywork scope<ChevronRight /></button> : null}
              </div> : null}
              <details><summary>Labor source and applicability review (required for labor)</summary>
                {([ ["engine", "Engine / powertrain"], ["configuration", "Configuration / relevant options"], ["source", "Labor-hour and applicability source"], ["limitations", "Limitations / assumptions"] ] as const).map(([key, label]) => <Field key={key} label={label}><input maxLength={2000} value={manualLaborReview[key]} onChange={event => setManualLaborReview({ ...manualLaborReview, [key]: event.target.value, scope: "" })} /></Field>)}
                <label><input type="checkbox" checked={manualLaborReview.scope === estimateReviewScope(selected.vehicle.id, estimateLines.length ? estimateLines : [{ key: estimate.lineKey, type: estimate.lineType, description: estimate.description, quantity: estimate.quantity, unitPriceCents: estimate.unitPriceCents, laborGuideMinutes: estimate.laborGuideMinutes }])} onChange={event => setManualLaborReview({ ...manualLaborReview, scope: event.target.checked ? estimateReviewScope(selected.vehicle.id, estimateLines.length ? estimateLines : [{ key: estimate.lineKey, type: estimate.lineType, description: estimate.description, quantity: estimate.quantity, unitPriceCents: estimate.unitPriceCents, laborGuideMinutes: estimate.laborGuideMinutes }]) : "" })} />I reviewed this vehicle and exact work. This is not OEM verification.</label>
              </details>
              {estimateLines.some(line => laborOperationForLineKey(line.key, flattenLaborOperationTaxonomy())) && <EstimateControlsPanel controls={estimateControls} scope={estimateControlsScope(selected.vehicle.id, estimateLines, estimateControls)} labor={estimateLines.flatMap(line => { const operation = laborOperationForLineKey(line.key, flattenLaborOperationTaxonomy()); return operation ? [operation] : []; })} parts={estimateLines.filter(line => line.type === "PART").map(line => ({ key: line.key, label: line.description }))} onChange={setEstimateControls} canOverrideLaborRate={canOverrideLaborRate} shopLaborRate={defaultLaborRate} />}
              <Submit busy={busy}>{revisionSource ? "Save revised estimate version" : "Present estimate version"}</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep editing={editingStep === 4} editDisabled={busy || (editingStep !== null && editingStep !== 4)} onEdit={() => beginDraftEdit(4)} onCancel={cancelEditing} complete={vendorPath ? vendorApprovalCaptured(currentVendorWork) : Boolean(accepted)} icon={<ShieldCheck />} number={4} open={currentStep === 3 || staffNext?.step === 4} subtitle={vendorPath ? "Record the outside-vendor approval decision and release the vendor repair lifecycle." : "Record who decided, through which channel, and exactly which estimate lines were accepted."} title={vendorPath ? "Vendor approval decision" : "Attributable authorization"}>
            {vendorPath && currentVendorWork ? <form className={styles.vendorProgressForm} onSubmit={(event: FormEvent) => { event.preventDefault(); void submitVendorProgress(vendorProgress.status, vendorProgress.lastUpdateSummary || "Vendor approval updated.", vendorProgress.nextAction || "Continue vendor repair and monitor parts or return timing."); }}>
              <div className={styles.pathInfo}><strong>Staff-entered vendor approval</strong><p>Record the approval your team received or decided from the vendor quote. Once approved, the outside-vendor record projects the repair order out of authorization waiting and into vendor repair.</p></div>
              <FormGrid>
                <Field label="Approval decision"><select value={vendorProgress.approvalStatus} onChange={(event) => setVendorProgress((value) => ({ ...value, approvalStatus: event.target.value }))}>{vendorApprovalStatuses.map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
                <Field label="Approved cents"><input min="0" type="number" value={vendorProgress.approvedAmountCents} onChange={(event) => setVendorProgress((value) => ({ ...value, approvedAmountCents: event.target.value }))} /></Field>
                <Field label="Vendor status"><select value={vendorProgress.status} onChange={(event) => setVendorProgress((value) => ({ ...value, status: event.target.value }))}>{vendorStatuses.map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
                <Field label="Approval evidence"><input placeholder="manager approval, estimate number, vendor text, call note" value={vendorProgress.evidence} onChange={(event) => setVendorProgress((value) => ({ ...value, evidence: event.target.value }))} /></Field>
                <Field label="Vendor update"><input value={vendorProgress.lastUpdateSummary} onChange={(event) => setVendorProgress((value) => ({ ...value, lastUpdateSummary: event.target.value }))} /></Field>
                <Field label="Next action"><input value={vendorProgress.nextAction} onChange={(event) => setVendorProgress((value) => ({ ...value, nextAction: event.target.value }))} /></Field>
              </FormGrid>
              <div className={styles.vendorLifecycleActions}>
                <button disabled={busy} onClick={() => void submitVendorProgress("AT_VENDOR", "Vendor estimate approved; work may continue.", "Monitor vendor repair progress, parts needs, and expected return.", { approvalStatus: "APPROVED", status: "AT_VENDOR" })} type="button">Approve and move to repair</button>
                <button disabled={busy} onClick={() => void submitVendorProgress("AT_VENDOR", "Vendor approval not required; work may continue.", "Monitor vendor repair progress, parts needs, and expected return.", { approvalStatus: "NOT_REQUIRED", status: "AT_VENDOR" })} type="button">No approval required</button>
                <button disabled={busy} onClick={() => void submitVendorProgress(vendorProgress.status, "Vendor approval is pending.", "Confirm the approval decision before releasing more vendor work.", { approvalStatus: "PENDING" })} type="button">Still pending</button>
              </div>
              <Submit busy={busy}>Save vendor approval</Submit>
            </form> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submitAuthorizationDecision(); }}>
              <div className={styles.estimateLineActions}><button type="button" disabled={busy || !authorizationEstimate || (editingStep !== null && editingStep !== 3 && editingStep !== 4)} onClick={reviseEstimate}>Edit selected estimate</button><span>Creates a new version; previous estimates and decisions stay in history.</span></div>{revisionSource && editingStep === 3 ? <div id="estimate-price-correction" tabIndex={-1}><EstimatePriceCorrection key={revisionSource.id} lines={estimateLines} taxCents={estimate.taxCents} discountCents={estimate.discountCents} reason={revisionReason} feedback={displayNotice} busy={busy} onReason={setRevisionReason} onSave={lines => void submitEstimate(lines)} onCancel={cancelEditing} /></div> : null}<FormGrid><Field label="Estimate version"><select value={authorization.estimateVersionId || latestEstimate?.id || ""} onChange={(event) => setAuthorization((value) => ({ ...value, estimateVersionId: event.target.value, authorizedLineKeys: value.disposition === "ACCEPTED" ? "" : value.authorizedLineKeys }))}>{selected.estimateVersions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {money(item.totalCents)}</option>)}</select></Field><Field label="Decision"><select value={authorization.disposition} onChange={(event) => setAuthorization((value) => ({ ...value, disposition: event.target.value, authorizedLineKeys: event.target.value === "ACCEPTED" ? "" : value.authorizedLineKeys }))}>{["ACCEPTED", "PARTIAL", "DECLINED", "DEFERRED", "EXPIRED", "REVOKED"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Authorized line keys"><input disabled={authorization.disposition === "ACCEPTED" || !approvalNeedsLineKeys} placeholder={authorizationLineKeys.join(",")} value={authorization.disposition === "ACCEPTED" ? authorizationLineKeys.join(", ") : authorization.authorizedLineKeys} onChange={(event) => setAuthorization((value) => ({ ...value, authorizedLineKeys: event.target.value }))} /></Field><Field label="Channel"><select value={authorization.channel} onChange={(event) => setAuthorization((value) => ({ ...value, channel: event.target.value }))}>{["IN_PERSON", "PHONE", "SMS", "EMAIL", "INTERNAL", "WARRANTY"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Decision actor"><input value={authorization.decisionActorName} onChange={(event) => setAuthorization((value) => ({ ...value, decisionActorName: event.target.value }))} /></Field><Field label="Decision time"><input type="datetime-local" value={authorization.decidedAt} onChange={(event) => setAuthorization((value) => ({ ...value, decidedAt: event.target.value }))} /></Field></FormGrid>
              <div className={`${styles.authorizationGuardrail} ${authorizationBlockedReason ? styles.authorizationGuardrailBlocked : ""}`} aria-live="polite">
                <strong>{authorizationBlockedReason ? "Authorization needs attention" : "Authorization ready"}</strong>
                <p>{authorizationBlockedReason || authorizationHelper}</p>
                {authorizationBlockedReason ? <p>{authorizationHelper}</p> : null}
              </div>
              <Submit busy={busy} disabled={!authorizationCanSubmit}>Record authorization decision</Submit>
            </form>}
          </WorkflowStep>

          <WorkflowStep editing={editingStep === 5} editDisabled={busy || (editingStep !== null && editingStep !== 5)} onEdit={() => beginDraftEdit(5)} onCancel={cancelEditing} complete={vendorPath ? vendorRepairReturned(currentVendorWork) : selected.repairJobs.length > 0} icon={<Wrench />} number={5} open={currentStep === 4 || staffNext?.step === 5} subtitle={vendorPath ? "Confirm vendor repair completion, plan return transportation, then move to dealership QC and inventory handoff." : "Simple instructions for moving approved work forward."} title={vendorPath ? "Vendor repair, return, and QC handoff" : "Repair release"}>
            {vendorPath && currentVendorWork ? <section className={`${styles.vendorRouteActive} ${vendorRepairFailed(currentVendorWork) ? styles.vendorRouteFailed : ""}`}>
              <header><Truck /><div><span>Vendor repair lifecycle</span><h3>{currentVendorWork.vendorName}</h3><p>{currentVendorWork.nextAction}</p></div><b>{format(currentVendorWork.status)}</b></header>
              {vendorNeedsInternalCompletion ? (
                <div className={styles.simpleCard}>
                  <span className={styles.simpleEyebrow}>Same-RO completion work</span>
                  <h3>Create the internal follow-up job here, not a separate unrelated RO</h3>
                  <p>Dealership QC failed the outside-vendor return. Keep {selected.repairOrderNumber} as the parent record, switch to Bodywork repair or Diagnostic / mechanical, then create the estimate and repair job for the unfinished items.</p>
                  <div className={styles.simpleInstructions}>
                    <strong>Recommended for this case</strong>
                    <p>Use the missing vendor scope as the new internal completion scope, for example: complete the outer door handle and replace the upper/lower steering column covers.</p>
                  </div>
                  <div className={styles.simpleActions}>
                    <button type="button" onClick={() => { setRepairPath("DIRECT_BODY"); window.setTimeout(() => navigateToInternalTarget("#repair-planning-step-2"), 0); }}>Create internal completion scope</button>
                    <button type="button" onClick={() => { setRepairPath("DIAGNOSTIC"); window.setTimeout(() => navigateToInternalTarget("#repair-planning-step-2"), 0); }}>Use diagnostic path instead</button>
                  </div>
                </div>
              ) : null}
              <div className={styles.vendorAlgorithmGrid}>
                <span><strong>Was the vehicle repaired?</strong>{vendorRepairFailed(currentVendorWork) ? "No — vendor repair failed or remains incomplete" : ["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(currentVendorWork.status) ? "Vendor repair reported complete" : "Not confirmed yet"}</span>
                <span><strong>Repairs completed?</strong>{vendorRepairFailed(currentVendorWork) ? "Not completed — QC/decision required" : currentVendorWork.status === "COMPLETED" ? "Completed after dealership QC" : ["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(currentVendorWork.status) ? "Vendor portion complete; dealership QC remains" : "Waiting on vendor repair update"}</span>
                <span><strong>What is the next step?</strong>{vendorRepairFailed(currentVendorWork) ? "Bring back, QC, then decide: internal repair, vendor rework, supplement, or stop work" : currentVendorWork.status === "READY_FOR_PICKUP" ? "Schedule pickup / return transportation" : currentVendorWork.status === "RETURN_TRANSPORT" ? "Track transport and confirm dealership receipt" : currentVendorWork.status === "RETURNED" ? "Start dealership QC" : currentVendorWork.status === "QC_REQUIRED" ? "Complete QC and release to inventory lifecycle" : "Confirm repair progress and parts blockers"}</span>
                <span><strong>Transport back?</strong>{["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(currentVendorWork.status) ? "Vehicle back at dealership" : currentVendorWork.status === "RETURN_TRANSPORT" ? "Pickup / transport is in progress" : currentVendorWork.status === "READY_FOR_PICKUP" ? "Transportation needs to be organized" : "Not ready yet"}</span>
                <span><strong>Inventory lifecycle</strong>{["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(currentVendorWork.status) ? "QC and inventory handoff are now the dealership path" : "Starts once vehicle returns"}</span>
              </div>
              <form className={styles.vendorProgressForm} onSubmit={(event: FormEvent) => { event.preventDefault(); void submitVendorProgress(); }}>
                <div className={styles.pathInfo}><strong>Staff-entered repair completion and return</strong><p>Use this after the vendor gives your team a repair update by phone, text, email, or in person. If repairs are complete, mark ready for pickup. If repairs failed or were not completed, bring the car back for QC and a repair decision instead of treating it as completed.</p></div>
                <FormGrid>
                  <Field label="Vendor repair status"><select value={vendorProgress.status} onChange={(event) => setVendorProgress((value) => ({ ...value, status: event.target.value }))}>{vendorStatuses.map((value) => <option key={value} value={value}>{format(value)}</option>)}</select></Field>
                  <Field label="Expected return / pickup time"><input type="datetime-local" value={vendorProgress.expectedReturnAt} onChange={(event) => setVendorProgress((value) => ({ ...value, expectedReturnAt: event.target.value }))} /></Field>
                  <Field label="Return transport method"><input placeholder="Driver pickup, carrier, vendor drop-off" value={vendorProgress.transportMethod} onChange={(event) => setVendorProgress((value) => ({ ...value, transportMethod: event.target.value }))} /></Field>
                  <Field label="Vendor completion update" wide><textarea value={vendorProgress.lastUpdateSummary} onChange={(event) => setVendorProgress((value) => ({ ...value, lastUpdateSummary: event.target.value }))} /></Field>
                  <Field label="Next action" wide><input value={vendorProgress.nextAction} onChange={(event) => setVendorProgress((value) => ({ ...value, nextAction: event.target.value }))} /></Field>
                  <Field label="Evidence references"><input placeholder="call note, text, final invoice, pickup confirmation" value={vendorProgress.evidence} onChange={(event) => setVendorProgress((value) => ({ ...value, evidence: event.target.value }))} /></Field>
                  <Field label="Customer-visible note" wide><textarea value={vendorProgress.customerVisibleSummary} onChange={(event) => setVendorProgress((value) => ({ ...value, customerVisibleSummary: event.target.value }))} /></Field>
                  <Field label="Internal notes" wide><textarea value={vendorProgress.internalNotes} onChange={(event) => setVendorProgress((value) => ({ ...value, internalNotes: event.target.value }))} /></Field>
                </FormGrid>
                <div className={styles.vendorLifecycleActions}>
                  <button disabled={busy} onClick={() => void submitVendorProgress("READY_FOR_PICKUP", "Vendor repair is complete and vehicle is ready for pickup.", "Organize return transportation to the dealership.", { status: "READY_FOR_PICKUP" })} type="button">Vendor repaired — plan pickup</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("RETURN_TRANSPORT", "Return transportation is in progress.", "Track pickup ETA and confirm dealership receipt.", { status: "RETURN_TRANSPORT", currentLocation: "In transit to dealership" })} type="button">Pickup / transport started</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("RETURNED", "Vendor repair failed or was not completed.", "Return vehicle to dealership QC, then decide whether to repair internally, return to vendor, approve supplement, or stop work.", { status: "RETURNED", currentLocation: "Dealership" })} type="button">Vendor failed — bring back</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("RETURNED", "Vehicle returned from outside vendor.", "Start dealership quality control and inventory handoff.", { status: "RETURNED", currentLocation: "Dealership" })} type="button">Vehicle returned</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("QC_REQUIRED", "Vehicle is back from vendor and ready for dealership QC.", "Complete quality control; if QC fails, route to internal repair, vendor rework, supplement approval, or management decision.", { status: "QC_REQUIRED", currentLocation: "Dealership" })} type="button">Send to QC / decision</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("QC_REQUIRED", "Vendor did not complete the repair; dealership decision required.", "QC the vehicle, then decide internal repair, vendor rework, supplement approval, or stop work.", { status: "QC_REQUIRED", currentLocation: "Dealership" })} type="button">Needs repair decision</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("AT_VENDOR", "Dealership QC failed; vehicle requires vendor rework.", "Return to vendor workflow and confirm corrected scope, ETA, and parts needs.", { status: "AT_VENDOR" })} type="button">QC failed — return to vendor</button>
                  <button disabled={busy} onClick={() => void submitVendorProgress("COMPLETED", "Outside vendor work and dealership QC are complete.", "Continue inventory lifecycle handoff.", { status: "COMPLETED", currentLocation: "Dealership" })} type="button">Complete after QC</button>
                  <Link className={styles.secondaryAction} href={qcHref}>Open QC workspace</Link>
                </div>
                <Submit busy={busy}>Save vendor repair update</Submit>
              </form>
            </section> : existingJobForSelectedLine || (accepted && !creatableAuthorizedLineKeys.length) ? (
              <section className={styles.simpleCard} id="repair-next-actions" tabIndex={-1}>
                <span className={styles.simpleEyebrow}>Repair job already created</span>
                <h3>{existingJobForSelectedLine?.jobNumber ?? selected.repairJobs[0]?.jobNumber} is already carrying this approved work</h3>
                <p>You do not need to fill out another form here. The next move is to assign the repair work, buy or update any needed parts, complete the repair, and then hand the vehicle to Final QC.</p>
                <dl className={styles.simpleFacts}>
                  <div><dt>Approved work</dt><dd>{existingJobForSelectedLine?.description ?? selected.repairJobs[0]?.description ?? "Approved repair work"}</dd></div>
                  <div><dt>Current status</dt><dd>{format(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status ?? "READY_FOR_REPAIR")}</dd></div>
                  <div><dt>What it needs now</dt><dd>{(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status) === "WAITING_PARTS" ? "Update parts and receiving so repair can continue." : "Continue repair readiness, dispatch, or live repair work."}</dd></div>
                </dl>
                <div className={styles.simpleInstructions}>
                  <strong>Next step</strong>
                  <p>{(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status) === "WAITING_PARTS" ? "Open Parts & readiness first, then return to dispatch or repair execution once the required parts are ready." : qcReady ? "The repair result is already saved. Go straight to Final QC." : "Open dispatch or the repair work order, then record progress, blockers, or the final result from the Repair Update area."}</p>
                </div>
                <div className={styles.simpleActions}>
                  <Link href={dispatchHref}>Open repair assignment</Link>
                  <Link href={repairJobWorkbenchHref}>Open repair work order</Link>
                  <Link href={partsHref}>Open parts purchases</Link>
                  {qcReady ? <Link className={styles.primaryAction} href={qcHref}>Open Final QC</Link> : <a className={styles.primaryAction} href="#repair-result">Record repair update</a>}
                </div>
              </section>
            ) : releasePrerequisiteBlocked ? (
              <section className={styles.simpleCard} id="repair-planning-step-5-create-job" tabIndex={-1}>
                <span className={styles.simpleEyebrow}>Approval needed before repair job</span>
                <h3>No approved repair line is available to release yet</h3>
                <p>The approved decision and approved repair line dropdowns are hidden because there is no accepted estimate line ready for job creation.</p>
                <div className={styles.simpleInstructions}>
                  <strong>What staff should do</strong>
                  <p>{latestEstimate ? "Record the approval decision for the estimate lines, then return here to release the approved repair job." : "Create and present the repair estimate first, record the approval decision, then return here to release the approved repair job."}</p>
                </div>
                <div className={styles.simpleActions}>
                  <button className={styles.primaryAction} disabled={busy} onClick={() => void createFastApprovedRepairJob()} type="button">{busy ? "Creating completion job..." : vendorNeedsInternalCompletion ? "Create/open completion job" : "Create/open repair job"}</button>
                  <button type="button" onClick={() => navigateToInternalTarget(latestEstimate ? "#repair-planning-step-4" : "#repair-planning-step-3")}>{latestEstimate ? "Record approval first" : vendorNeedsInternalCompletion ? "Create completion estimate first" : "Create estimate first"}</button>
                  <button type="button" onClick={() => navigateToInternalTarget("#repair-planning-step-2")}>{vendorNeedsInternalCompletion ? "Review completion scope" : "Review repair scope"}</button>
                </div>
              </section>
            ) : (
              <>
                <div className={styles.repairReleaseNow} id="repair-planning-step-5-create-job" tabIndex={-1}>
                  <header>
                    <span>Next action</span>
                    <h3>Create the repair job for the approved work</h3>
                    <p>The customer or manager already approved this line. Confirm the job details below, then select Create repair job.</p>
                  </header>
                  <ol className={styles.quickSteps}>
                    <li><strong>Approved</strong><span>{selectedReleaseLine ? `${selectedReleaseLine.description} · ${money(selectedReleaseLine.quantity * selectedReleaseLine.unitPriceCents)}` : "Choose the approved line."}</span></li>
                    <li><strong>Repair job</strong><span>{job.description || "Confirm the job description."}</span></li>
                    <li><strong>Parts</strong><span>{job.partsRequired ? "Parts must be ready before repair starts." : "No parts blocker selected."}</span></li>
                    <li><strong>Move forward</strong><span>Create the job, then manage repair progress and Final QC.</span></li>
                  </ol>
                </div>
                <form onSubmit={(event: FormEvent) => { event.preventDefault(); void createReleaseJobs(); }}>
                  <section className={styles.repairReleaseCard} aria-label="Repair job details">
                    <header>
                      <span>Repair job details</span>
                      <h3>{job.description || "Approved repair line"}</h3>
                    </header>
                    <FormGrid>
                      <Field label="Approved work"><select value={selectedAuthorizedLineKey} onChange={(event) => applyReleaseLineDefaults(event.target.value)}>{creatableAuthorizedLineKeys.map((value) => { const line = releaseLineByKey(value); return <option key={value} value={value}>{line?.description ?? value} · {line ? money(line.quantity * line.unitPriceCents) : ""}</option>; })}</select></Field>
                      <Field label="Job description"><input placeholder="Example: Bodywork repair and paint front bumper cover" value={job.description} onChange={(event) => setJob((value) => ({ ...value, description: event.target.value }))} /></Field>
                      <Field label="What should be done" wide><input placeholder="Example: Repair and paint front bumper cover" value={job.plannedCorrection} onChange={(event) => setJob((value) => ({ ...value, plannedCorrection: event.target.value }))} /></Field>
                      <Field label="Labor time"><input min="0" type="number" value={job.laborGuideMinutes} onChange={(event) => setJob((value) => ({ ...value, laborGuideMinutes: Number(event.target.value) }))} /></Field>
                      <label className={styles.check}><input checked={job.partsRequired} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partsRequired: event.target.checked }))} />This job needs parts before repair can continue</label>
                      {job.partsRequired ? <fieldset className={styles.parts}><legend>Select part records only if they already exist</legend>{selected.partDemands.filter((item) => !item.repairJobId).map((item) => <label key={item.id}><input checked={job.partDemandIds.includes(item.id)} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partDemandIds: event.target.checked ? [...value.partDemandIds, item.id] : value.partDemandIds.filter((id) => id !== item.id) }))} />{item.part.partNumber} · {item.quantityReserved}/{item.quantityRequired} reserved</label>)}</fieldset> : null}
                    </FormGrid>
                    <details className={styles.advancedDetails}>
                      <summary>Advanced release details</summary>
                      <FormGrid>
                    <Field label="Approved decision"><select value={job.authorizationId || accepted?.id || ""} onChange={(event) => setJob((value) => ({ ...value, authorizationId: event.target.value }))}>{selected.estimateVersions.flatMap((item) => item.authorizations).filter((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)).map((item) => <option key={item.id} value={item.id}>{format(item.disposition)} · {item.decisionActorName || "Approved decision"}</option>)}</select></Field>
                    <Field label="Work type code"><input value={job.workTypeCode} onChange={(event) => setJob((value) => ({ ...value, workTypeCode: event.target.value }))} /></Field>
                      </FormGrid>
                    </details>
                  </section>
                  {selectedReleaseLine ? <div className={styles.pathInfo}><strong>Approved amount</strong><p>{selectedReleaseLine.description} is approved at {money(selectedReleaseLine.quantity * selectedReleaseLine.unitPriceCents)}. If that amount is wrong, update the estimate line first.</p></div> : null}
                  <div className={styles.estimateLineActions}>
                    <button disabled={busy || !creatableAuthorizedLineKeys.length} onClick={saveReleaseJobDraft} type="button">{releaseJobs.some((item) => item.authorizedLineKey === selectedAuthorizedLineKey) ? "Update selected job" : "Add another approved job"}</button>
                    <button disabled={busy || !creatableAuthorizedLineKeys.length} onClick={() => applyReleaseLineDefaults(nextReleaseLineKey(releaseJobs.map((item) => item.authorizedLineKey)))} type="button">Choose another approved line</button>
                  </div>
                  {releaseJobs.length ? <section className={styles.estimateLineList} aria-label="Repair release lines"><header><div><span>Repair release list</span><h3>{releaseJobs.length} line{releaseJobs.length === 1 ? "" : "s"} ready to create</h3></div></header>{releaseJobs.map((draft) => { const line = releaseLineByKey(draft.authorizedLineKey); return <article key={draft.authorizedLineKey}><div><strong>{draft.authorizedLineKey} · {draft.description}</strong><p>{draft.plannedCorrection}</p><small>{line ? money(line.quantity * line.unitPriceCents) : ""} · {draft.workTypeCode}</small></div><div className={styles.estimateLineActions}><button disabled={busy} onClick={() => editReleaseJobDraft(draft)} type="button">Edit</button><button disabled={busy} onClick={() => removeReleaseJobDraft(draft.authorizedLineKey)} type="button">Remove</button></div></article>; })}</section> : null}
                  <Submit busy={busy}>{releaseJobs.length > 1 ? "Create repair jobs" : "Create repair job"}</Submit>
                </form>
              </>
            )}
          </WorkflowStep>

          {hasRepairJob ? <section className={styles.repairResult} id="repair-result" tabIndex={-1}>
            <header>
              <span>Manage repair</span>
              <h2>Tell the shop what happened</h2>
              <p>Choose the repair status, write the update, then save it or send the vehicle to Final QC.</p>
            </header>
            {qcReady ? <div className={styles.qcReadyBanner}>
              <div>
                <strong>Repair is ready for QC</strong>
                <p>The next guided step is quality control before final handoff. Open the QC workspace to complete the check and release decision.</p>
              </div>
              <Link className={styles.qcReadyAction} href={qcHref}>Open QC workspace</Link>
            </div> : null}
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submitRepairProgress(); }}>
              <ol className={styles.quickSteps}>
                <li><strong>Status</strong><span>Pick where the repair stands now.</span></li>
                <li><strong>Update</strong><span>Write the plain-language result or blocker.</span></li>
                <li><strong>Action</strong><span>Save progress or send completed work to QC.</span></li>
                <li><strong>History</strong><span>The note stays on the repair record.</span></li>
              </ol>
              <div className={styles.repairUpdateModeHint}>
                <strong>Progress update</strong>
                <span>Use this when the repair is still open, paused, waiting, or blocked.</span>
                <b>{recentRepairUpdates.length} prior update{recentRepairUpdates.length === 1 ? "" : "s"}</b>
              </div>
              <div className={styles.progressGrid}>
                <label><span>What is the status?</span><select value={repairProgress.statusCode} onChange={(event) => chooseProgressStatus(event.target.value)}>{progressStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                <label><span>Update title</span><input value={repairProgress.contactOutcome} onChange={(event) => setRepairProgress((value) => ({ ...value, contactOutcome: event.target.value }))} /></label>
                <label><span>Follow up (optional)</span><input type="datetime-local" value={repairProgress.nextContactAt} onChange={(event) => setRepairProgress((value) => ({ ...value, nextContactAt: event.target.value }))} /></label>
                <label><span>Target date (optional)</span><input type="datetime-local" value={repairProgress.promiseAt} onChange={(event) => setRepairProgress((value) => ({ ...value, promiseAt: event.target.value }))} /></label>
                <label className={styles.wideField}><span>What happened? (required)</span><textarea required placeholder="Example: Required repair tool was not available. Tool was ordered online and repair is paused until it arrives." value={repairProgress.customerVisibleSummary} onChange={(event) => setRepairProgress((value) => ({ ...value, customerVisibleSummary: event.target.value }))} /></label>
                <label className={styles.wideField}><span>Next step</span><input placeholder="Example: Confirm tool delivery and resume repair when it arrives." value={repairProgress.nextAction} onChange={(event) => setRepairProgress((value) => ({ ...value, nextAction: event.target.value }))} /></label>
                <label className={styles.wideField}><span>Internal repair note (optional)</span><textarea placeholder="Tool order, tracking number, blocker context, or handoff note." value={repairProgress.internalNotes} onChange={(event) => setRepairProgress((value) => ({ ...value, internalNotes: event.target.value }))} /></label>
              </div>
              {displayNotice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|failed|error/i.test(displayNotice) ? styles.danger : ""}`}><p>{displayNotice}</p></div> : null}
              <div className={styles.progressActions}>
                <small>{repairProgress.customerVisibleSummary.trim() ? "Choose one clear action." : "Enter what happened to unlock save and QC actions."}</small>
                <div className={styles.progressPrimaryActions}>
                  {qcReady || qcReadyStatuses.has(repairProgress.statusCode) ? <Link className={styles.secondaryAction} href={qcHref}>Go to QC</Link> : null}
                  {!qcReady ? <button className={styles.completeQcAction} disabled={busy || !repairProgress.customerVisibleSummary.trim()} onClick={() => void submitRepairProgress("READY_FOR_QC")} type="button">{busy ? "Saving..." : "Repair complete — send to QC"}</button> : null}
                  <button disabled={busy || !repairProgress.customerVisibleSummary.trim()} type="submit">{busy ? "Saving..." : "Save update"}</button>
                </div>
              </div>
            </form>

            <details className={styles.finalRepairResult}>
              <summary>Final result / send to QC</summary>
              <div className={styles.outcomeChoices} role="group" aria-label="Repair outcome">
                <button aria-pressed={repairOutcome === "SUCCESS"} onClick={() => setRepairOutcome("SUCCESS")} type="button">
                  <Check aria-hidden="true" />
                  <span><strong>Completed successfully</strong><small>The repair is finished and ready for inspection.</small></span>
                </button>
                <button aria-pressed={repairOutcome === "FAILED"} onClick={() => setRepairOutcome("FAILED")} type="button">
                  <Wrench aria-hidden="true" />
                  <span><strong>Repair failed</strong><small>Send it to QC for a rework decision.</small></span>
                </button>
              </div>
              <div className={styles.repairResultFields}>
                <label><span>Who performed the work?</span><select value={completedByUserId} onChange={(event) => setCompletedByUserId(event.target.value)}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label><span>Final result note</span><textarea required placeholder="Example: Left fender from Metro Auto Salvage was received and installed today. Panel fit and attachment are complete." value={repairProgress.customerVisibleSummary} onChange={(event) => setRepairProgress((value) => ({ ...value, customerVisibleSummary: event.target.value }))} /></label>
              </div>
              <button className={styles.sendToQcAction} disabled={busy || !repairProgress.customerVisibleSummary.trim() || !completedByUserId} onClick={() => void submitRepairProgress("READY_FOR_QC", true, repairOutcome)} type="button">
                {busy ? "Saving..." : "Save final result and open Final QC"}
              </button>
            </details>

            <div className={styles.progressHistory}>
              <strong>Recent repair updates</strong>
              {recentRepairUpdates.length ? recentRepairUpdates.map((update) => <article key={update.id}>
                <div>
                  <span>{format(update.statusCode)}</span>
                  <h3>{update.contactOutcome}</h3>
                  <p>{update.customerVisibleSummary}</p>
                  {update.internalNotes ? <small>{update.internalNotes}</small> : null}
                </div>
                <aside>
                  <b>{update.authorUser.name}</b>
                  <time>{new Date(update.occurredAt).toLocaleString()}</time>
                </aside>
              </article>) : <p>No repair progress has been recorded yet.</p>}
            </div>
          </section> : null}
        </main>

        <aside className={styles.rail}>
          <section><span>{vendorPath ? "Vendor progress" : "Release readiness"}</span><h2>{vendorPath ? vendorReadinessTitle : currentStep === 0 ? "Inspection evidence required" : currentStep === 1 ? directPath ? "Ready for direct repair scope" : "Ready for diagnosis" : currentStep === 2 ? directRepairRecorded(selected) ? "Direct repair scope established" : "Diagnosis established" : currentStep === 3 ? "Estimate awaiting decision" : selected.repairJobs.length ? "Repair jobs already created" : "Authorized work ready"}</h2><div className={styles.progress}><i style={{ width: `${((displayCurrentStep + 1) / displaySteps.length) * 100}%` }} /></div><small>Step {displayCurrentStep + 1} of {displaySteps.length}</small></section>
          {vendorPath && currentVendorWork ? <section><span>Vendor record</span><dl><div><dt>Vendor assigned</dt><dd>Yes</dd></div><div><dt>Estimate received</dt><dd>{vendorEstimateCaptured(currentVendorWork) ? "Yes" : "No"}</dd></div><div><dt>Approved to repair</dt><dd>{vendorApprovalCaptured(currentVendorWork) ? "Yes" : "No"}</dd></div><div><dt>Returned for QC</dt><dd>{vendorRepairReturned(currentVendorWork) ? "Yes" : "No"}</dd></div></dl></section> : <section><span>Evidence ledger</span><dl><div><dt>Inspection versions</dt><dd>{selected.inspectionVersions.length}</dd></div><div><dt>Diagnosis versions</dt><dd>{selected.diagnosisVersions.length}</dd></div><div><dt>Estimate versions</dt><dd>{selected.estimateVersions.length}</dd></div><div><dt>Repair jobs</dt><dd>{selected.repairJobs.length}</dd></div></dl></section>}
          <section><span>{vendorPath ? "Simple vendor controls" : "Safety controls"}</span>{vendorPath ? <ul><li><Building2 />Vendor and repair scope are recorded</li><li><ShieldCheck />Approval is recorded before work continues</li><li><Truck />Staff track progress and expected return</li><li><ClipboardCheck />Dealership QC happens after return</li></ul> : <ul><li><LockKeyhole />No estimate overwrites a prior version</li><li><ShieldCheck />Authorization is tied to exact line keys</li><li><PackageCheck />Parts readiness follows the repair job</li><li><ClipboardCheck />Repair cannot start from intake alone</li></ul>}</section>
          {!currentVendorWork ? <details className={styles.vendorRecovery}>
            <summary><Truck /><span><strong>Send to outside vendor</strong><small>Use when recon is stuck at any stage and the work should move offsite.</small></span><ChevronRight /></summary>
            {vendorWorkflowForm}
          </details> : <section className={styles.vendorRecoveryActive}><span>Outside vendor active</span><h2>{currentVendorWork.vendorName}</h2><p>{currentVendorWork.nextAction}</p><Link href={safeReturnTo}>Open vendor workbench</Link></section>}
          {selected.repairJobs.length ? <section><span>Job readiness</span>{selected.repairJobs.map((item) => <article key={item.id}><strong>{item.jobNumber} · {format(item.status)}</strong><p>{item.description}</p><small>{item.readinessReasonCodes.length ? item.readinessReasonCodes.map(format).join(" · ") : "No blocking reason codes"}</small></article>)}</section> : null}
          {reconBudget ? <section><span>{reconBudget.source === "TAI" ? "TAI budget discipline" : "Recon budget discipline"}</span><h2>{reconBudget.status === "OVER_BUDGET" ? "Spend exception review required" : reconBudget.status === "CAUTION" ? "Spend room is getting tight" : "Spend room available"}</h2><p>{reconBudget.source === "TAI" ? "Acquisition appraisal is feeding this recon budget guardrail." : "A latest appraisal is feeding this recon budget guardrail."}</p><dl><div><dt>Budget</dt><dd>{formatMoneyCents(reconBudget.estimatedReconBudgetCents)}</dd></div><div><dt>Committed</dt><dd>{formatMoneyCents(reconBudget.committedSpendCents)}</dd></div><div><dt>Remaining</dt><dd>{formatMoneyCents(reconBudget.remainingBudgetCents)}</dd></div></dl></section> : null}
          <section><span>Connected workspaces</span><nav><Link href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}`}>Vehicle 360 <ChevronRight /></Link><Link href="/vehicles/service-close-parts">Parts &amp; readiness <ChevronRight /></Link><Link href="/diagnostics/labor-guide">Labor guide <ChevronRight /></Link><Link href="/vehicles/quality-control">Quality control <ChevronRight /></Link></nav></section>
        </aside>
      </div>
    </> : <section className={styles.empty}><CarFront /><h2>No open repair order is available</h2><p>Return to the Repair Workbench and select an eligible order before planning the repair path.</p><Link href="/vehicles/repair-workbench">Open Repair Workbench</Link></section>}
  </section>;
}

function WorkflowStep({ children, complete, icon, number, open, subtitle, title, editing, editDisabled, onEdit, onCancel, showEditControls = true }: { children: ReactNode; complete: boolean; icon: ReactNode; number: number; open: boolean; subtitle: string; title: string; editing: boolean; editDisabled: boolean; onEdit: () => void; onCancel: () => void; showEditControls?: boolean }) {
  return <details className={styles.step} id={`repair-planning-step-${number}`} open={open || editing}><summary><span className={complete ? styles.done : ""}>{complete ? <Check /> : icon}</span><div><small>Stage {number}</small><h2>{title}</h2><p>{subtitle}</p></div><b>{editing ? "Editing draft" : complete ? "Complete" : open ? "Current" : "Pending"}</b><ChevronRight /></summary><div className={styles.stepBody}>{showEditControls ? <div className={styles.estimateLineActions}><button type="button" disabled={editDisabled} onClick={editing ? onCancel : onEdit}>{editing ? "Cancel edits" : "Update this stage"}</button><small>{editing ? "Edit the form below, then use its save action. Cancel restores the draft from before editing." : "History stays saved automatically. Use the existing approval checks when the scope changes."}</small></div> : null}{children}</div></details>;
}
function FormGrid({ children }: { children: ReactNode }) { return <div className={styles.formGrid}>{children}</div>; }
function Field({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) { return <label className={wide ? styles.wide : ""}><span>{label}</span>{children}</label>; }
function Submit({ busy, children, disabled = false }: { busy: boolean; children: ReactNode; disabled?: boolean }) { return <footer className={styles.submit}><span><LockKeyhole />Saved history and approval checks stay protected.</span><button disabled={busy || disabled} type="submit">{busy ? "Saving..." : children}</button></footer>; }
