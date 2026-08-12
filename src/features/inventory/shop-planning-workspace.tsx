"use client";

import { ArrowLeft, BadgeCheck, Building2, CarFront, Check, ChevronRight, ClipboardCheck, FileCheck2, Gauge, LockKeyhole, PackageCheck, ShieldCheck, Stethoscope, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { buildReconBudgetSummary, formatMoneyCents } from "@/lib/recon-budget";
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
  estimateVersions: Array<{ id: string; version: number; status: string; totalCents: number; expiresAt: string; lineItems: Line[]; authorizations: Array<{ id: string; disposition: string; authorizedLineKeys: string[]; authorizedAmountCents: number; decisionActorName: string }> }>;
  repairJobs: Array<{ id: string; jobNumber: string; authorizedLineKey: string; description: string; status: string; readinessReasonCodes: string[]; partDemands: Array<{ part: { partNumber: string }; quantityRequired: number; quantityReserved: number }> }>;
  partDemands: Array<{ id: string; repairJobId: string | null; quantityRequired: number; quantityReserved: number; part: { partNumber: string; description: string } }>;
};
type Model = { repairOrders: Order[]; users: Array<{ id: string; name: string }> };
type RepairPath = "DIAGNOSTIC" | "DIRECT_BODY" | "VENDOR";

const local = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const format = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const vehicleLabel = (order: Order) => [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
const directRepairPattern = /\b(body|bodywork|collision|bumper|fender|paint|mirror|dent|hail|panel|cosmetic)\b/i;
const directRepairRecorded = (order?: Order) => Boolean(order?.diagnosisVersions[0]?.cause?.includes("Direct repair scope approved without troubleshooting diagnosis."));
const activeVendorWork = (order?: Order) => order?.vendorWorks.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? null;
const defaultRepairPath = (order?: Order): RepairPath => activeVendorWork(order) ? "VENDOR" : directRepairRecorded(order) || directRepairPattern.test(order?.serviceVisit.concernSummary ?? "") ? "DIRECT_BODY" : "DIAGNOSTIC";
const vendorStatuses = ["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"] as const;
const vendorApprovalStatuses = ["NEEDS_DOCUMENTATION", "PENDING", "APPROVED", "DECLINED", "NOT_REQUIRED"] as const;
const vendorEstimateCaptured = (work?: RepairVendorWork | null) => Boolean(work && (work.estimateAmountCents != null || ["APPROVAL_NEEDED", "SUPPLEMENT_NEEDED", "WAITING_PARTS", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status)));
const vendorApprovalCaptured = (work?: RepairVendorWork | null) => Boolean(work && ["APPROVED", "NOT_REQUIRED"].includes(work.approvalStatus));
const vendorRepairReturned = (work?: RepairVendorWork | null) => Boolean(work && ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status));
const vendorRepairFailed = (work?: RepairVendorWork | null) => Boolean(work && /\b(fail|failed|incomplete|not fixed|problem still|still persists|rework|decision)\b/i.test(`${work.lastUpdateSummary} ${work.nextAction}`));
const centsText = (value?: number | null) => value == null ? "" : String(value);
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
  { value: "WAITING_VENDOR", label: "Waiting on vendor" },
  { value: "READY_FOR_QC", label: "Ready for quality check" },
  { value: "REPAIR_BLOCKED", label: "Blocked / needs decision" },
  { value: "REPAIR_COMPLETE", label: "Repair work complete" },
] as const;
const qcReadyStatuses = new Set(["READY_FOR_QC", "REPAIR_COMPLETE"]);

function activeStep(order?: Order) {
  if (!order || !order.inspectionVersions.length) return 0;
  if (activeVendorWork(order)) {
    if (["ESTIMATE", "AUTHORIZATION"].includes(order.stage)) return 3;
    if (["READY_FOR_REPAIR", "REPAIR", "QUALITY_CONTROL", "ADVISOR_REVIEW", "HANDOFF"].includes(order.stage)) return 4;
    return 1;
  }
  if (!order.diagnosisVersions.length) return 1;
  if (!order.estimateVersions.length) return 2;
  const accepted = order.estimateVersions.some((estimate) => estimate.authorizations.some((authorization) => ["ACCEPTED", "PARTIAL"].includes(authorization.disposition)));
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

export function ShopPlanningWorkspace({ initial, returnTo }: { initial: Model; returnTo?: string }) {
  const [model, setModel] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.repairOrders[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const first = initial.repairOrders[0];
  const defaultTime = first?.updatedAt ?? first?.serviceVisit.arrivedAt ?? "";
  const [repairPath, setRepairPath] = useState<RepairPath>(defaultRepairPath(first));
  const [inspection, setInspection] = useState({ templateCode: "GENERAL_DVI", templateVersion: 1, startedAt: defaultTime ? local(defaultTime) : "", completedAt: defaultTime ? local(defaultTime) : "", summary: "", itemKey: "GENERAL_CONDITION", itemLabel: "General condition", itemResult: "PASS", measurement: "", itemNotes: "", evidence: "" });
  const [diagnosis, setDiagnosis] = useState({ concern: first?.serviceVisit.concernSummary ?? "", symptoms: "", testName: "", testResult: "", evidence: "", cause: "", uncertainty: "MEDIUM", recommendation: "", proposedCorrection: "", technicianUserId: initial.users[0]?.id ?? "", diagnosedAt: defaultTime ? local(defaultTime) : "" });
  const [directScope, setDirectScope] = useState({ concern: first?.serviceVisit.concernSummary ?? "", diagnosedAt: defaultTime ? local(defaultTime) : "", evidence: "", proposedCorrection: "", recommendation: "", scopeSummary: "", scopeType: "BODYWORK", technicianUserId: initial.users[0]?.id ?? "", uncertainty: "LOW", whyNoDiagnosis: "Visible body or collision damage can move directly to scope, estimate, parts, and repair without troubleshooting diagnostics." });
  const [vendorWork, setVendorWork] = useState({ approvalStatus: "NEEDS_DOCUMENTATION", customerVisibleSummary: "", directFromSource: false, evidence: "", expectedReturnAt: "", internalNotes: "", lastUpdateSummary: "Outside vendor route created from repair planning.", nextAction: "Confirm vendor received the vehicle, estimate or scope, parts needs, and expected return.", nextFollowUpAt: "", scope: first?.serviceVisit.concernSummary ?? "", sentAt: defaultTime ? local(defaultTime) : "", sentFrom: "Dealership", status: "AT_VENDOR", transportMethod: "Internal transport", vendorName: "", workType: "BODY_SHOP" });
  const [vendorProgress, setVendorProgress] = useState(seedVendorProgress(activeVendorWork(first), first));
  const [estimate, setEstimate] = useState({ lineKey: "LINE-1", lineType: "LABOR", description: "", quantity: 1, unitPriceCents: 0, taxable: false, workTypeCode: "GENERAL_REPAIR", laborGuideMinutes: 60, plannedCorrection: "", taxCents: 0, discountCents: 0, taxBoundary: "Taxes are calculated by the configured financial system boundary.", presentationChannel: "IN_PERSON", presentedAt: defaultTime ? local(defaultTime) : "", expiresAt: "" });
  const [authorization, setAuthorization] = useState({ estimateVersionId: "", disposition: "ACCEPTED", channel: "IN_PERSON", authorizedLineKeys: "", decisionActorType: "CUSTOMER", decisionActorName: "", decisionActorReference: "", decidedAt: defaultTime ? local(defaultTime) : "" });
  const [job, setJob] = useState({ authorizationId: "", authorizedLineKey: "", diagnosisVersionId: "", workTypeCode: "GENERAL_REPAIR", description: "", plannedCorrection: "", laborGuideMinutes: 60, requiredSkills: "", requiredCertifications: "", bayRequirements: "", toolRequirements: "", priority: "NORMAL", dependencyJobIds: "", partsRequired: false, partDemandIds: [] as string[] });
  const [repairProgress, setRepairProgress] = useState({ statusCode: "REPAIR_IN_PROGRESS", contactOutcome: "Repair progress updated", customerVisibleSummary: "", internalNotes: "", nextContactAt: defaultTime ? local(defaultTime) : "", promiseAt: "", nextAction: "Continue repair and record the next progress update." });

  const selected = model.repairOrders.find((item) => item.id === selectedId) ?? model.repairOrders[0];
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : selected ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(selected.id)}` : "/vehicles/repair-workbench";
  const currentStep = activeStep(selected);
  const latestEstimate = selected?.estimateVersions[0];
  const latestDiagnosis = selected?.diagnosisVersions[0];
  const accepted = selected?.estimateVersions.flatMap((item) => item.authorizations.map((auth) => ({ ...auth, estimate: item }))).find((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition));
  const existingAuthorizedLineKeys = new Set((selected?.repairJobs ?? []).map((item) => item.authorizedLineKey));
  const creatableAuthorizedLineKeys = accepted?.authorizedLineKeys.filter((value) => !existingAuthorizedLineKeys.has(value)) ?? [];
  const selectedAuthorizedLineKey = job.authorizedLineKey || creatableAuthorizedLineKeys[0] || accepted?.authorizedLineKeys[0] || "";
  const existingJobForSelectedLine = selected?.repairJobs.find((item) => item.authorizedLineKey === selectedAuthorizedLineKey) ?? null;
  const directPath = repairPath === "DIRECT_BODY";
  const vendorPath = repairPath === "VENDOR";
  const currentVendorWork = activeVendorWork(selected);
  const stageTwoComplete = Boolean((selected?.diagnosisVersions.length ?? 0) > 0 || currentVendorWork);
  const stageTwoTitle = vendorPath ? "Outside vendor route" : directPath ? "Direct body and collision scope" : "Evidence-backed diagnosis";
  const stageTwoSubtitle = "Choose the governed path that fits this work: full diagnosis, direct body and collision scope, or outside vendor repair.";
  const missionLabel = vendorPath ? "Outside vendor mission" : directPath ? "Direct repair mission" : "Diagnostic mission";
  const missionTitle = vendorPath ? "Dispatch the vehicle to the vendor workflow and track the rapid recon answers" : directPath ? "Capture visible damage scope and move directly to estimate" : "Verify the reported concern and identify the root cause";
  const orderPathLabel = vendorPath ? "Vehicle ready for outside vendor route" : directPath ? "Vehicle ready for direct repair scope" : "Vehicle released for diagnosis";
  const recentRepairUpdates = (selected?.advisorUpdates ?? []).slice(0, 6);
  const latestRepairUpdate = selected?.advisorUpdates?.[0] ?? null;
  const qcReady = Boolean(latestRepairUpdate && qcReadyStatuses.has(latestRepairUpdate.statusCode));
  const qcHref = selected ? `/vehicles/quality-control?repairOrderId=${encodeURIComponent(selected.id)}&returnLabel=${encodeURIComponent("Return to Repair Planning")}&returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}` : "/vehicles/quality-control";
  const reconBudget = selected?.inventoryUnit ? buildReconBudgetSummary({
    acquisitionAppraisals: selected.inventoryUnit.acquisitionAppraisals,
    acquisitionCase: selected.inventoryUnit.acquisitionCase,
    costEntries: selected.inventoryUnit.costEntries.filter((item) => item.currency !== "CAD"),
    estimateVersions: selected.estimateVersions,
    vendorWorks: selected.vendorWorks
  }) : null;

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
    const vendor = activeVendorWork(nextOrder);
    if (nextOrder && vendor) {
      setRepairPath("VENDOR");
      setVendorProgress(seedVendorProgress(vendor, nextOrder));
    }
  }

  async function submit(action: string, value: Record<string, unknown>, reason: string) {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await request(`/api/repair-orders/${selected.id}/planning`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...value, idempotencyKey: crypto.randomUUID(), reason })
      }) as { result?: { message?: string } };
      setNotice(result?.result?.message ?? reason);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Shop planning request failed.");
    } finally {
      setBusy(false);
    }
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
    setSelectedId(id);
    const order = model.repairOrders.find((item) => item.id === id);
    if (order) {
      const time = local(order.updatedAt);
      setRepairPath(defaultRepairPath(order));
      setDiagnosis((value) => ({ ...value, concern: order.serviceVisit.concernSummary, diagnosedAt: time }));
      setDirectScope((value) => ({ ...value, concern: order.serviceVisit.concernSummary, diagnosedAt: time }));
      const vendor = activeVendorWork(order);
      setVendorWork((value) => ({ ...value, expectedReturnAt: "", nextFollowUpAt: "", scope: order.serviceVisit.concernSummary, sentAt: time, vendorName: vendor?.vendorName ?? "" }));
      setVendorProgress(seedVendorProgress(vendor, order));
      setInspection((value) => ({ ...value, startedAt: local(order.serviceVisit.arrivedAt), completedAt: time }));
      setEstimate((value) => ({ ...value, presentedAt: time }));
      setAuthorization((value) => ({ ...value, decidedAt: time }));
      setJob((value) => ({ ...value, authorizationId: "", authorizedLineKey: "", partDemandIds: [] }));
      setRepairProgress((value) => ({ ...value, customerVisibleSummary: "", internalNotes: "", nextContactAt: time, promiseAt: order.inventoryUnit?.targetAt ? local(order.inventoryUnit.targetAt) : "", nextAction: order.inventoryUnit?.nextAction ?? "Continue repair and record the next progress update." }));
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
        <span className={styles.eyebrow}>Shop Operations · Governed repair planning</span>
        <h1>Repair Planning Command Center</h1>
        <p>Turn intake into the right governed path: full diagnosis when troubleshooting is needed, direct repair scope when damage is visible, or outside vendor repair when the work should move offsite.</p>
      </div>
      <div className={styles.heroActions}><Link href={safeReturnTo}><ArrowLeft />Return to workbench</Link>{selected ? <Link className={styles.primary} href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}?returnTo=${encodeURIComponent(`/vehicles/shop-planning?repairOrderId=${selected.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}`}>Open Vehicle 360</Link> : null}</div>
      <div className={styles.truthBar}><span><BadgeCheck /><b>Authoritative repair plan</b></span><span><LockKeyhole />Immutable evidence versions</span><span>Exact-version customer authorization required</span><span>Repair work remains blocked until readiness passes.</span></div>
    </header>

    {notice ? <div aria-live="polite" className={`${styles.notice} ${/required|cannot|invalid|not enabled|already exists/i.test(notice) ? styles.danger : styles.success}`}><p>{notice}</p></div> : null}

    <section className={styles.orderBar}>
      <label><span>Active repair order</span><select value={selected?.id ?? ""} onChange={(event) => choose(event.target.value)}>{model.repairOrders.map((order) => <option key={order.id} value={order.id}>{order.repairOrderNumber} · {order.vehicle.vehicleNumber} · {format(order.stage)}</option>)}</select></label>
      {selected ? <><div className={styles.vehicleIcon}><CarFront /></div><div className={styles.orderIdentity}><span>{orderPathLabel}</span><h2>{vehicleLabel(selected)}</h2><p>{selected.vehicle.vin ? `VIN ${selected.vehicle.vin}` : selected.vehicle.vehicleNumber} · {selected.repairOrderNumber} · version {selected.version}</p></div><dl><div><dt>Current gate</dt><dd>{format(selected.stage)}</dd></div><div><dt>Responsible party</dt><dd>{selected.customer?.displayName ?? selected.inventoryUnit?.inventoryNumber ?? "Internal inventory"}</dd></div><div><dt>Arrival</dt><dd>{new Date(selected.serviceVisit.arrivedAt).toLocaleString()}</dd></div></dl></> : null}
    </section>

    {selected ? <>
      <section className={styles.mission}>{vendorPath ? <Building2 /> : <Stethoscope />}<div><span>{missionLabel}</span><h2>{missionTitle}</h2><p>{selected.serviceVisit.concernSummary}</p></div><aside><strong>{currentStep + 1} of {steps.length}</strong><span>governed stages</span></aside></section>

      <section className={styles.stepRail} aria-label="Diagnostic release stages">{steps.map((step, index) => { const Icon = step.icon; const state = index < currentStep ? styles.complete : index === currentStep ? styles.active : ""; return <div className={state} key={step.label}><span>{index < currentStep ? <Check /> : <Icon />}</span><small>Stage {index + 1}</small><strong>{step.label}</strong></div>; })}</section>

      <div className={styles.commandGrid}>
        <main className={styles.workflow}>
          <WorkflowStep complete={selected.inspectionVersions.length > 0} icon={<FileCheck2 />} number={1} open={currentStep === 0} subtitle="Establish the physical-condition baseline and attach supporting evidence." title="Digital vehicle inspection">
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_INSPECTION", { templateCode: inspection.templateCode, templateVersion: inspection.templateVersion, templateSnapshot: { code: inspection.templateCode, version: inspection.templateVersion }, startedAt: inspection.startedAt, completedAt: inspection.completedAt, summary: inspection.summary, items: [{ key: inspection.itemKey, label: inspection.itemLabel, result: inspection.itemResult, measurement: inspection.measurement, notes: inspection.itemNotes, evidence: inspection.evidence.split(",").map((value) => value.trim()).filter(Boolean) }] }, "Record a versioned digital vehicle inspection."); }}>
              <div className={styles.simpleCard}>
                <span className={styles.simpleEyebrow}>Simple inspection entry</span>
                <h3>Capture the condition in plain language</h3>
                <p>Tell the team what you checked, whether it passed, what you found, and what proof supports it. Technical versioning stays preserved automatically.</p>
              </div>
              <FormGrid>
                <Field label="What did you inspect?">
                  <input placeholder="Example: General condition, brakes, front suspension, body damage" value={inspection.itemLabel} onChange={(event) => setInspection((value) => ({ ...value, itemLabel: event.target.value }))} />
                </Field>
                <Field label="Result">
                  <select value={inspection.itemResult} onChange={(event) => setInspection((value) => ({ ...value, itemResult: event.target.value }))}>
                    {["PASS", "ADVISORY", "FAIL", "NOT_APPLICABLE"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </Field>
                <Field label="Optional measurement">
                  <input placeholder="Example: 4 mm, 12.4V, cracked, no reading" value={inspection.measurement} onChange={(event) => setInspection((value) => ({ ...value, measurement: event.target.value }))} />
                </Field>
                <Field label="What did you find?" wide>
                  <textarea placeholder="Write the finding in plain language so the next person immediately understands the condition." value={inspection.summary} onChange={(event) => setInspection((value) => ({ ...value, summary: event.target.value }))} />
                </Field>
                <Field label="Proof / evidence" wide>
                  <input placeholder="Example: photos, scan results, auction notes, walkaround video" value={inspection.evidence} onChange={(event) => setInspection((value) => ({ ...value, evidence: event.target.value }))} />
                </Field>
                <Field label="Extra inspection notes (optional)" wide>
                  <textarea placeholder="Anything the team should know that does not fit in the main finding." value={inspection.itemNotes} onChange={(event) => setInspection((value) => ({ ...value, itemNotes: event.target.value }))} />
                </Field>
              </FormGrid>
              <details className={styles.advancedDetails}>
                <summary>Advanced details</summary>
                <FormGrid>
                  <Field label="Started"><input type="datetime-local" value={inspection.startedAt} onChange={(event) => setInspection((value) => ({ ...value, startedAt: event.target.value }))} /></Field>
                  <Field label="Completed"><input type="datetime-local" value={inspection.completedAt} onChange={(event) => setInspection((value) => ({ ...value, completedAt: event.target.value }))} /></Field>
                  <Field label="Template code"><input value={inspection.templateCode} onChange={(event) => setInspection((value) => ({ ...value, templateCode: event.target.value }))} /></Field>
                </FormGrid>
              </details>
              <Submit busy={busy}>Record immutable inspection version</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={stageTwoComplete} icon={vendorPath ? <Building2 /> : <Stethoscope />} number={2} open={currentStep === 1} subtitle={stageTwoSubtitle} title={stageTwoTitle}>
            <div className={styles.pathPicker} role="tablist" aria-label="Repair path">
              <button aria-pressed={!directPath && !vendorPath} className={!directPath && !vendorPath ? styles.pathActive : ""} onClick={() => setRepairPath("DIAGNOSTIC")} type="button">Diagnostic repair</button>
              <button aria-pressed={directPath} className={directPath ? styles.pathActive : ""} onClick={() => setRepairPath("DIRECT_BODY")} type="button">Body / collision scope</button>
              <button aria-pressed={vendorPath} className={vendorPath ? styles.pathActive : ""} onClick={() => setRepairPath("VENDOR")} type="button"><Building2 /> Outside vendor</button>
            </div>
            <div className={styles.concern}><span>Carried forward from intake</span><p>{selected.serviceVisit.concernSummary}</p></div>
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
              <div className={styles.pathInfo}><strong>No-diagnosis path</strong><p>Use this when the work is visible body, collision, cosmetic, teardown, or direct vendor repair and the team does not need troubleshooting diagnostics to define the next action.</p></div>
              <FormGrid><Field label="Direct repair summary" wide><textarea value={directScope.scopeSummary} onChange={(event) => setDirectScope((value) => ({ ...value, scopeSummary: event.target.value }))} /></Field><Field label="Why diagnosis is not required" wide><textarea value={directScope.whyNoDiagnosis} onChange={(event) => setDirectScope((value) => ({ ...value, whyNoDiagnosis: event.target.value }))} /></Field><Field label="Scope type"><select value={directScope.scopeType} onChange={(event) => setDirectScope((value) => ({ ...value, scopeType: event.target.value }))}><option value="BODYWORK">Bodywork</option><option value="COLLISION">Collision</option><option value="OUTSIDE_VENDOR">Outside vendor</option><option value="COSMETIC">Cosmetic</option></select></Field><Field label="Evidence references"><input placeholder="photos, auction notes, vendor teardown" value={directScope.evidence} onChange={(event) => setDirectScope((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Scope uncertainty"><select value={directScope.uncertainty} onChange={(event) => setDirectScope((value) => ({ ...value, uncertainty: event.target.value }))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Responsible reviewer"><select value={directScope.technicianUserId} onChange={(event) => setDirectScope((value) => ({ ...value, technicianUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Recommendation"><textarea value={directScope.recommendation} onChange={(event) => setDirectScope((value) => ({ ...value, recommendation: event.target.value }))} /></Field><Field label="Proposed correction"><textarea value={directScope.proposedCorrection} onChange={(event) => setDirectScope((value) => ({ ...value, proposedCorrection: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record direct repair scope</Submit>
            </form> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_DIAGNOSIS", { ...diagnosis, symptoms: diagnosis.symptoms.split(",").map((value) => value.trim()).filter(Boolean), tests: [{ name: diagnosis.testName, result: diagnosis.testResult }], evidence: diagnosis.evidence.split(",").map((value) => value.trim()).filter(Boolean) }, "Record evidence-backed concern, cause, and proposed correction."); }}>
              <FormGrid><Field label="Symptoms"><input placeholder="Comma separated" value={diagnosis.symptoms} onChange={(event) => setDiagnosis((value) => ({ ...value, symptoms: event.target.value }))} /></Field><Field label="Diagnostic test"><input value={diagnosis.testName} onChange={(event) => setDiagnosis((value) => ({ ...value, testName: event.target.value }))} /></Field><Field label="Test result"><input value={diagnosis.testResult} onChange={(event) => setDiagnosis((value) => ({ ...value, testResult: event.target.value }))} /></Field><Field label="Evidence references"><input value={diagnosis.evidence} onChange={(event) => setDiagnosis((value) => ({ ...value, evidence: event.target.value }))} /></Field><Field label="Root cause" wide><textarea value={diagnosis.cause} onChange={(event) => setDiagnosis((value) => ({ ...value, cause: event.target.value }))} /></Field><Field label="Diagnostic uncertainty"><select value={diagnosis.uncertainty} onChange={(event) => setDiagnosis((value) => ({ ...value, uncertainty: event.target.value }))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Technician"><select value={diagnosis.technicianUserId} onChange={(event) => setDiagnosis((value) => ({ ...value, technicianUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Recommendation"><textarea value={diagnosis.recommendation} onChange={(event) => setDiagnosis((value) => ({ ...value, recommendation: event.target.value }))} /></Field><Field label="Proposed correction"><textarea value={diagnosis.proposedCorrection} onChange={(event) => setDiagnosis((value) => ({ ...value, proposedCorrection: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record diagnosis version</Submit>
            </form>}
          </WorkflowStep>

          <WorkflowStep complete={vendorPath ? vendorEstimateCaptured(currentVendorWork) : selected.estimateVersions.length > 0} icon={<Gauge />} number={3} open={currentStep === 2} subtitle={vendorPath ? "Vendor estimate and approval are tracked from staff-entered vendor updates while the work stays offsite." : directPath ? "Create the governed body, collision, vendor, or teardown estimate from the approved direct scope." : "Create an immutable, expiring estimate from the verified diagnostic correction."} title={vendorPath ? "Vendor estimate update" : directPath ? "Direct repair estimate" : "Exact-version estimate"}>
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("PRESENT_ESTIMATE", { lineItems: [{ key: estimate.lineKey, type: estimate.lineType, description: estimate.description, quantity: estimate.quantity, unitPriceCents: estimate.unitPriceCents, taxable: estimate.taxable, workTypeCode: estimate.workTypeCode, laborGuideMinutes: estimate.laborGuideMinutes, plannedCorrection: estimate.plannedCorrection }], taxCents: estimate.taxCents, discountCents: estimate.discountCents, taxBoundary: estimate.taxBoundary, presentationChannel: estimate.presentationChannel, presentedAt: estimate.presentedAt, expiresAt: estimate.expiresAt }, "Present an immutable estimate version from diagnostic evidence."); }}>
              {vendorPath ? <div className={styles.pathInfo}><strong>Vendor estimating discipline</strong><p>Keep vendor estimate, approval documentation, parts responsibility, and expected return current on the outside vendor workflow. Do not duplicate internal diagnosis just to move the record.</p></div> : directPath ? <div className={styles.pathInfo}><strong>Body and collision estimating discipline</strong><p>Follow the same fast sequence every time: visible scope, labor guide or vendor quote, parts list, internal spend decision, then repair release. This keeps bodywork moving without pretending a troubleshooting diagnosis happened when it did not.</p></div> : null}
              {reconBudget ? <div className={styles.concern}><span>{reconBudget.source === "TAI" ? "TAI recon budget guardrail" : "Recon budget guardrail"}</span><p>{reconBudget.status === "OVER_BUDGET" ? "This estimate is already beyond the current recon spend target. Review the scope, labor source, and approval path before releasing more work." : reconBudget.status === "CAUTION" ? "This vehicle is getting close to its current recon budget. Tighten the estimate and confirm the next approval before moving forward." : "There is still recon spend room available for this vehicle. Keep the estimate anchored to real labor, parts, and vendor work."}</p><p>Budget {formatMoneyCents(reconBudget.estimatedReconBudgetCents)} · committed {formatMoneyCents(reconBudget.committedSpendCents)} · remaining {formatMoneyCents(reconBudget.remainingBudgetCents)}</p></div> : null}
              {directPath ? <div className={styles.pathInfo}><strong>Rapid recon estimate recipe</strong><p>1) use body labor guide or vendor quote, 2) separate labor, parts, and sublet cleanly, 3) preserve teardown supplements as new exact versions, and 4) never promise completion until parts and vendor timing are real.</p></div> : null}
              <FormGrid><Field label="Line key"><input value={estimate.lineKey} onChange={(event) => setEstimate((value) => ({ ...value, lineKey: event.target.value }))} /></Field><Field label="Type"><select value={estimate.lineType} onChange={(event) => setEstimate((value) => ({ ...value, lineType: event.target.value }))}>{["LABOR", "PART", "FEE"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Description"><input value={estimate.description} onChange={(event) => setEstimate((value) => ({ ...value, description: event.target.value }))} /></Field><Field label="Unit price (cents)"><input min="0" type="number" value={estimate.unitPriceCents} onChange={(event) => setEstimate((value) => ({ ...value, unitPriceCents: Number(event.target.value) }))} /></Field><Field label="Labor guide minutes"><input min="0" type="number" value={estimate.laborGuideMinutes} onChange={(event) => setEstimate((value) => ({ ...value, laborGuideMinutes: Number(event.target.value) }))} /></Field><Field label="Planned correction"><input value={estimate.plannedCorrection} onChange={(event) => setEstimate((value) => ({ ...value, plannedCorrection: event.target.value }))} /></Field><Field label="Tax (cents)"><input min="0" type="number" value={estimate.taxCents} onChange={(event) => setEstimate((value) => ({ ...value, taxCents: Number(event.target.value) }))} /></Field><Field label="Discount (cents)"><input min="0" type="number" value={estimate.discountCents} onChange={(event) => setEstimate((value) => ({ ...value, discountCents: Number(event.target.value) }))} /></Field><Field label="Presented"><input type="datetime-local" value={estimate.presentedAt} onChange={(event) => setEstimate((value) => ({ ...value, presentedAt: event.target.value }))} /></Field><Field label="Expires"><input type="datetime-local" value={estimate.expiresAt} onChange={(event) => setEstimate((value) => ({ ...value, expiresAt: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Present estimate version</Submit>
            </form>
          </WorkflowStep>

          <WorkflowStep complete={vendorPath ? vendorApprovalCaptured(currentVendorWork) : Boolean(accepted)} icon={<ShieldCheck />} number={4} open={currentStep === 3} subtitle={vendorPath ? "Record the outside-vendor approval decision and release the vendor repair lifecycle." : "Record who decided, through which channel, and exactly which estimate lines were accepted."} title={vendorPath ? "Vendor approval decision" : "Attributable authorization"}>
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
            </form> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("DECIDE_AUTHORIZATION", { ...authorization, estimateVersionId: authorization.estimateVersionId || latestEstimate?.id, authorizedLineKeys: (authorization.authorizedLineKeys || latestEstimate?.lineItems.map((line) => line.key).join(",") || "").split(",").map((value) => value.trim()).filter(Boolean) }, "Record an attributable decision on the exact estimate version."); }}>
              <FormGrid><Field label="Estimate version"><select value={authorization.estimateVersionId || latestEstimate?.id || ""} onChange={(event) => setAuthorization((value) => ({ ...value, estimateVersionId: event.target.value }))}>{selected.estimateVersions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {money(item.totalCents)}</option>)}</select></Field><Field label="Decision"><select value={authorization.disposition} onChange={(event) => setAuthorization((value) => ({ ...value, disposition: event.target.value }))}>{["ACCEPTED", "PARTIAL", "DECLINED", "DEFERRED", "EXPIRED", "REVOKED"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Authorized line keys"><input placeholder={latestEstimate?.lineItems.map((line) => line.key).join(",")} value={authorization.authorizedLineKeys} onChange={(event) => setAuthorization((value) => ({ ...value, authorizedLineKeys: event.target.value }))} /></Field><Field label="Channel"><select value={authorization.channel} onChange={(event) => setAuthorization((value) => ({ ...value, channel: event.target.value }))}>{["IN_PERSON", "PHONE", "SMS", "EMAIL", "INTERNAL", "WARRANTY"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Decision actor"><input value={authorization.decisionActorName} onChange={(event) => setAuthorization((value) => ({ ...value, decisionActorName: event.target.value }))} /></Field><Field label="Decision time"><input type="datetime-local" value={authorization.decidedAt} onChange={(event) => setAuthorization((value) => ({ ...value, decidedAt: event.target.value }))} /></Field></FormGrid>
              <Submit busy={busy}>Record authorization decision</Submit>
            </form>}
          </WorkflowStep>

          <WorkflowStep complete={vendorPath ? vendorRepairReturned(currentVendorWork) : selected.repairJobs.length > 0} icon={<Wrench />} number={5} open={currentStep === 4} subtitle={vendorPath ? "Confirm vendor repair completion, plan return transportation, then move to dealership QC and inventory handoff." : "Simple instructions for moving approved work forward."} title={vendorPath ? "Vendor repair, return, and QC handoff" : "Repair release"}>
            {vendorPath && currentVendorWork ? <section className={`${styles.vendorRouteActive} ${vendorRepairFailed(currentVendorWork) ? styles.vendorRouteFailed : ""}`}>
              <header><Truck /><div><span>Vendor repair lifecycle</span><h3>{currentVendorWork.vendorName}</h3><p>{currentVendorWork.nextAction}</p></div><b>{format(currentVendorWork.status)}</b></header>
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
              <section className={styles.simpleCard}>
                <span className={styles.simpleEyebrow}>Repair job already created</span>
                <h3>{existingJobForSelectedLine?.jobNumber ?? selected.repairJobs[0]?.jobNumber} is already carrying this approved work</h3>
                <p>You do not need to fill out another form here. This repair job already exists, so the right move is to continue the work from its current status.</p>
                <dl className={styles.simpleFacts}>
                  <div><dt>Approved work</dt><dd>{existingJobForSelectedLine?.description ?? selected.repairJobs[0]?.description ?? "Approved repair work"}</dd></div>
                  <div><dt>Current status</dt><dd>{format(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status ?? "READY_FOR_REPAIR")}</dd></div>
                  <div><dt>What it needs now</dt><dd>{(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status) === "WAITING_PARTS" ? "Update parts and receiving so repair can continue." : "Continue repair readiness, dispatch, or live repair work."}</dd></div>
                </dl>
                <div className={styles.simpleInstructions}>
                  <strong>Next step</strong>
                  <p>{(existingJobForSelectedLine?.status ?? selected.repairJobs[0]?.status) === "WAITING_PARTS" ? "Open Parts & readiness, confirm what is missing, and update the parts progress for this job." : "Return to the workbench and keep the repair moving forward from the current repair stage."}</p>
                </div>
                <div className={styles.simpleActions}>
                  <Link href="/vehicles/service-close-parts">Open Parts &amp; readiness</Link>
                  <Link href={safeReturnTo}>Return to workbench</Link>
                  <Link className={styles.primaryAction} href={`/vehicles/360/${encodeURIComponent(selected.vehicle.id)}`}>Open Vehicle 360</Link>
                </div>
              </section>
            ) : (
              <>
                <div className={styles.simpleCard}>
                  <span className={styles.simpleEyebrow}>Simple repair release</span>
                  <h3>Create one repair job from the approved work</h3>
                  <p>Use the approved line below, give it a short plain-language description, and mark whether parts are needed. Everything else can stay simple.</p>
                </div>
                <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("CREATE_JOB", { ...job, authorizationId: job.authorizationId || accepted?.id, authorizedLineKey: selectedAuthorizedLineKey, diagnosisVersionId: job.diagnosisVersionId || latestDiagnosis?.id, requiredSkills: job.requiredSkills.split(",").map((value) => value.trim()).filter(Boolean), requiredCertifications: job.requiredCertifications.split(",").map((value) => value.trim()).filter(Boolean), bayRequirements: job.bayRequirements.split(",").map((value) => value.trim()).filter(Boolean), toolRequirements: job.toolRequirements.split(",").map((value) => value.trim()).filter(Boolean), dependencyJobIds: job.dependencyJobIds.split(",").map((value) => value.trim()).filter(Boolean) }, "Create an authorized, readiness-gated repair job."); }}>
                  <FormGrid>
                    <Field label="Approved decision"><select value={job.authorizationId || accepted?.id || ""} onChange={(event) => setJob((value) => ({ ...value, authorizationId: event.target.value }))}>{selected.estimateVersions.flatMap((item) => item.authorizations).filter((item) => ["ACCEPTED", "PARTIAL"].includes(item.disposition)).map((item) => <option key={item.id} value={item.id}>{money(item.authorizedAmountCents)} · {item.disposition}</option>)}</select></Field>
                    <Field label="Approved work line"><select value={selectedAuthorizedLineKey} onChange={(event) => setJob((value) => ({ ...value, authorizedLineKey: event.target.value }))}>{accepted?.authorizedLineKeys.map((value) => <option key={value} value={value}>{existingAuthorizedLineKeys.has(value) ? `${value} · already created` : value}</option>)}</select></Field>
                    <Field label="Job description"><input placeholder="Example: bodywork repair" value={job.description} onChange={(event) => setJob((value) => ({ ...value, description: event.target.value }))} /></Field>
                    <Field label="What should be done"><input placeholder="Example: replace bumper and prep for paint" value={job.plannedCorrection} onChange={(event) => setJob((value) => ({ ...value, plannedCorrection: event.target.value }))} /></Field>
                    <label className={styles.check}><input checked={job.partsRequired} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partsRequired: event.target.checked }))} />This job needs parts before repair can continue</label>
                    {job.partsRequired ? <fieldset className={styles.parts}><legend>Select part records only if they already exist</legend>{selected.partDemands.filter((item) => !item.repairJobId).map((item) => <label key={item.id}><input checked={job.partDemandIds.includes(item.id)} type="checkbox" onChange={(event) => setJob((value) => ({ ...value, partDemandIds: event.target.checked ? [...value.partDemandIds, item.id] : value.partDemandIds.filter((id) => id !== item.id) }))} />{item.part.partNumber} · {item.quantityReserved}/{item.quantityRequired} reserved</label>)}</fieldset> : null}
                  </FormGrid>
                  <Submit busy={busy}>Create repair job</Submit>
                </form>
              </>
            )}
          </WorkflowStep>

          <section className={styles.progressWorkspace} id="repair-progress">
            <header>
              <div>
                <span>Live repair progress</span>
                <h2>Give staff one simple place to update the work</h2>
                <p>Record what changed, what is next, and when we should follow up. This writes to the real repair-order timeline.</p>
              </div>
              <b>{recentRepairUpdates.length} update{recentRepairUpdates.length === 1 ? "" : "s"}</b>
            </header>
            {qcReady ? <div className={styles.qcReadyBanner}>
              <div>
                <strong>Repair is ready for QC</strong>
                <p>The next guided step is quality control before final handoff. Open the QC workspace to complete the check and release decision.</p>
              </div>
              <Link className={styles.qcReadyAction} href={qcHref}>Open QC workspace</Link>
            </div> : null}
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("RECORD_REPAIR_PROGRESS", { contactChannel: "INTERNAL", contactDirection: "INTERNAL", contactOutcome: repairProgress.contactOutcome, customerVisibleSummary: repairProgress.customerVisibleSummary, exceptionCodes: ["REPAIR_BLOCKED", "WAITING_PARTS", "WAITING_VENDOR"].includes(repairProgress.statusCode) ? [repairProgress.statusCode] : [], internalNotes: [repairProgress.internalNotes.trim(), `Next action: ${repairProgress.nextAction}`].filter(Boolean).join("\n"), nextContactAt: repairProgress.nextContactAt ? new Date(repairProgress.nextContactAt).toISOString() : null, occurredAt: new Date().toISOString(), promiseAt: repairProgress.promiseAt ? new Date(repairProgress.promiseAt).toISOString() : null, reason: "Record live repair progress from the repair planning workspace.", statusCode: repairProgress.statusCode }, "Repair progress update recorded."); }}>
              <div className={styles.progressGrid}>
                <label><span>Live status</span><select value={repairProgress.statusCode} onChange={(event) => setRepairProgress((value) => ({ ...value, statusCode: event.target.value }))}>{progressStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                <label><span>Short update title</span><input value={repairProgress.contactOutcome} onChange={(event) => setRepairProgress((value) => ({ ...value, contactOutcome: event.target.value }))} /></label>
                <label><span>Next follow-up</span><input type="datetime-local" value={repairProgress.nextContactAt} onChange={(event) => setRepairProgress((value) => ({ ...value, nextContactAt: event.target.value }))} /></label>
                <label><span>Promise / target</span><input type="datetime-local" value={repairProgress.promiseAt} onChange={(event) => setRepairProgress((value) => ({ ...value, promiseAt: event.target.value }))} /></label>
                <label className={styles.wideField}><span>What happened</span><textarea placeholder="Example: Body tech completed teardown. Waiting on reinforcement bar, radiator, condenser, and coolant before reassembly can continue." value={repairProgress.customerVisibleSummary} onChange={(event) => setRepairProgress((value) => ({ ...value, customerVisibleSummary: event.target.value }))} /></label>
                <label className={styles.wideField}><span>Next step</span><input placeholder="Example: Order missing parts and follow up with vendor tomorrow morning." value={repairProgress.nextAction} onChange={(event) => setRepairProgress((value) => ({ ...value, nextAction: event.target.value }))} /></label>
                <label className={styles.wideField}><span>Private staff notes</span><textarea placeholder="Internal repair detail, handoff note, or blocker context." value={repairProgress.internalNotes} onChange={(event) => setRepairProgress((value) => ({ ...value, internalNotes: event.target.value }))} /></label>
              </div>
              <div className={styles.progressActions}>
                <small>Simple rule: say what changed, what is blocking it, and what should happen next.</small>
                <div className={styles.progressPrimaryActions}>
                  {qcReady || qcReadyStatuses.has(repairProgress.statusCode) ? <Link className={styles.secondaryAction} href={qcHref}>Go to QC</Link> : null}
                  <button disabled={busy} type="submit">{busy ? "Saving progress..." : "Save repair progress update"}</button>
                </div>
              </div>
            </form>
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
          </section>
        </main>

        <aside className={styles.rail}>
          <section><span>Release readiness</span><h2>{currentStep === 0 ? "Inspection evidence required" : currentStep === 1 ? directPath ? "Ready for direct repair scope" : "Ready for diagnosis" : currentStep === 2 ? directRepairRecorded(selected) ? "Direct repair scope established" : "Diagnosis established" : currentStep === 3 ? "Estimate awaiting decision" : selected.repairJobs.length ? "Repair jobs already created" : "Authorized work ready"}</h2><div className={styles.progress}><i style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div><small>Stage {currentStep + 1} of {steps.length}</small></section>
          <section><span>Evidence ledger</span><dl><div><dt>Inspection versions</dt><dd>{selected.inspectionVersions.length}</dd></div><div><dt>Diagnosis versions</dt><dd>{selected.diagnosisVersions.length}</dd></div><div><dt>Estimate versions</dt><dd>{selected.estimateVersions.length}</dd></div><div><dt>Repair jobs</dt><dd>{selected.repairJobs.length}</dd></div></dl></section>
          <section><span>Safety controls</span><ul><li><LockKeyhole />No estimate overwrites a prior version</li><li><ShieldCheck />Authorization is tied to exact line keys</li><li><PackageCheck />Parts readiness follows the repair job</li><li><ClipboardCheck />Repair cannot start from intake alone</li></ul></section>
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

function WorkflowStep({ children, complete, icon, number, open, subtitle, title }: { children: ReactNode; complete: boolean; icon: ReactNode; number: number; open: boolean; subtitle: string; title: string }) {
  return <details className={styles.step} open={open}><summary><span className={complete ? styles.done : ""}>{complete ? <Check /> : icon}</span><div><small>Stage {number}</small><h2>{title}</h2><p>{subtitle}</p></div><b>{complete ? "Complete" : open ? "Current" : "Pending"}</b><ChevronRight /></summary><div className={styles.stepBody}>{children}</div></details>;
}
function FormGrid({ children }: { children: ReactNode }) { return <div className={styles.formGrid}>{children}</div>; }
function Field({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) { return <label className={wide ? styles.wide : ""}><span>{label}</span>{children}</label>; }
function Submit({ busy, children }: { busy: boolean; children: ReactNode }) { return <footer className={styles.submit}><span><LockKeyhole />Creates a new immutable version and audit event.</span><button disabled={busy} type="submit">{busy ? "Saving governed version..." : children}</button></footer>; }
