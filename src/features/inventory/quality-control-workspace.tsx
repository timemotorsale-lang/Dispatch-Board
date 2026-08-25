"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Car,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  ImagePlus,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: string; name: string };
type Inspection = {
  id: string;
  version: number;
  disposition: string;
  inspectedAt: string;
  safetyChecksPassed: boolean;
  peerVerificationRequired: boolean;
  peerVerificationPassed: boolean;
  roadTestRequired: boolean;
  roadTestOutcome: string;
  failureReasonCodes: string[];
  reworkInstructions: string | null;
  inspectorUser: { name: string };
  peerVerifierUser: { name: string } | null;
};
type Job = {
  id: string;
  jobNumber: string;
  description: string;
  plannedCorrection: string;
  status: string;
  lane: string | null;
  executionEvidence: string[] | null;
  qcHandoffNotes: string | null;
  readinessReasonCodes: string[];
  procedureVersion: { title: string; version: number; qcRules: string[] } | null;
  qualityInspections: Inspection[];
  dispatches: Array<{ technicianUser: { name: string } }>;
  laborClocks: Array<{ state: string; accumulatedMinutes: number }>;
  comebackCases?: Array<{ id: string; status: string; reasonCategory?: string | null; reportedConcern?: string | null }>;
  partDemands?: Array<{
    id: string;
    quantityRequired: number;
    quantityReserved: number;
    status: string;
    part: { partNumber: string; description: string };
  }>;
};
type VendorWork = {
  id: string;
  approvalStatus: string;
  currentLocation: string | null;
  expectedReturnAt: string | null;
  lastUpdateSummary: string;
  nextAction: string;
  scope: string | null;
  sentFrom: string | null;
  status: string;
  transportMethod: string | null;
  vendorName: string;
};
type Order = {
  id: string;
  repairOrderNumber: string;
  origin: string;
  stage: string;
  locationId: string;
  targetAt: string;
  vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  location: { name: string };
  serviceVisit: { concernSummary: string; promisedAt: string | null };
  releaseAuthorization: { id: string; destination: string; authorizedAt: string } | null;
  vendorWorks: VendorWork[];
  repairJobs: Job[];
};
type Model = { repairOrders: Order[]; users: User[] };
type FrontlineResult = "FAIL" | "REVIEW" | "PASS";
type FrontlineQcItem = { code: string; label: string; hint: string };
type FrontlineQcSection = { title: string; items: FrontlineQcItem[] };

const frontlineQcSections: FrontlineQcSection[] = [
  { title: "Exterior & Body", items: [
    { code: "REPAIR_AREA_ALIGNMENT", label: "Repair area / panel alignment", hint: "Panels even and gaps consistent" },
    { code: "PAINT_FINISH", label: "Paint and finish", hint: "Color match and surface quality" },
    { code: "BUMPER_TRIM", label: "Bumpers, trim and moldings", hint: "Secure and undamaged" },
    { code: "BODY_OPENINGS", label: "Doors, hood and liftgate", hint: "Open, close and latch properly" },
    { code: "GLASS_MIRRORS_WIPERS", label: "Glass, mirrors and wipers", hint: "Clear, secure and operating" }
  ] },
  { title: "Tires, Wheels & Brakes", items: [
    { code: "TIRES", label: "Tire condition and tread", hint: "Adequate tread and even wear" },
    { code: "WHEELS_LUGS", label: "Wheel condition and lug security", hint: "No damage and lugs secured" },
    { code: "BRAKES", label: "Brake operation / warning lights", hint: "Firm pedal and no warning lights" }
  ] },
  { title: "Lights & Safety", items: [
    { code: "HEADLIGHTS_SIGNALS", label: "Headlights and signals", hint: "All exterior lights function" },
    { code: "BRAKE_REVERSE_LIGHTS", label: "Brake and reverse lights", hint: "All operate correctly" },
    { code: "SAFETY_EQUIPMENT", label: "Seat belts, horn and safety equipment", hint: "Present and functional" }
  ] },
  { title: "Interior & Controls", items: [
    { code: "DASH_WARNINGS", label: "Dash warning lights", hint: "No warning lights illuminated" },
    { code: "HVAC_ACCESSORIES", label: "HVAC and accessories", hint: "Heat, A/C, radio, windows and locks" },
    { code: "INTERIOR_CONDITION", label: "Seats, trim and cleanliness", hint: "Clean with no damage or stains" }
  ] },
  { title: "Mechanical & Road Check", items: [
    { code: "UNDERHOOD_LEAKS", label: "Fluid leaks / underhood check", hint: "No leaks and levels within range" },
    { code: "STEERING_SUSPENSION", label: "Steering and suspension", hint: "No noises; stable and centered" },
    { code: "ROAD_TEST", label: "Road-test operation", hint: "Shifts, brakes and acceleration operate properly" }
  ] },
  { title: "Frontline Presentation", items: [
    { code: "DETAIL_QUALITY", label: "Detail quality", hint: "Clean inside and out" },
    { code: "KEYS_DOCUMENTS", label: "Keys, manuals and documents", hint: "All keys, books and records accounted for" }
  ] }
];
const frontlineQcItems = frontlineQcSections.flatMap((section) => section.items);

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const isFailed = (job: Job) => job.qualityInspections[0]?.disposition === "FAILED" || job.readinessReasonCodes.some((code) => code.includes("REWORK"));
const vehicleName = (order: Order) => [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
const workbenchHref = (order: Order) => `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`;
const manageRepairHref = (order: Order) => `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: order.id, returnTo: `/vehicles/quality-control?repairOrderId=${order.id}` })}`;
const vendorFollowUpHref = (order: Order) => `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId: order.id, returnTo: `/vehicles/quality-control?repairOrderId=${order.id}`, vendorFollowUp: "1" })}#repair-planning-step-2`;
const code = (value: string) => value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase().slice(0, 80) || "QC_CHECK";
const hasOpenLabor = (job: Job) => job.laborClocks.some((clock) => clock.state === "RUNNING" || clock.state === "PAUSED");
const hasPartsBlock = (job: Job) => (job.partDemands ?? []).some((demand) => demand.quantityReserved < demand.quantityRequired || ["OPEN", "PARTIALLY_RESERVED", "REQUESTED"].includes(demand.status));
const hasPartsActivity = (job: Job) => Boolean(job.partDemands?.length);
const needsRoadTest = (job: Job, order: Order) => /brake|noise|steer|suspension|drive|vibration|alignment|engine|transmission/i.test(`${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`);
const needsPeer = (job: Job) => job.lane === "DIAGNOSTIC_HEAVY" || /airbag|brake|steer|safety|engine|transmission|electrical/i.test(`${job.description} ${job.plannedCorrection}`);
const isSafetyCritical = (job: Job, order: Order) => /airbag|srs|brake|steer|suspension|wheel|tire|seatbelt|safety|engine|transmission|abs/i.test(`${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`);
const isFrontlineCleared = (order: Order) => Boolean(order.releaseAuthorization);
const vendorQcStatuses = new Set(["RETURNED", "QC_REQUIRED"]);
const activeVendorQcWork = (order?: Order | null) => order?.vendorWorks.find((work) => vendorQcStatuses.has(work.status)) ?? null;

function generatedChecklist(order: Order, job: Job) {
  const text = `${job.description} ${job.plannedCorrection} ${order.serviceVisit.concernSummary}`;
  const base = [
    { label: "Original concern resolved", detail: order.serviceVisit.concernSummary || "Verify the customer concern no longer reproduces." },
    { label: "Approved correction completed", detail: job.plannedCorrection || "Confirm completed work matches the authorized repair." },
    { label: "Technician evidence reviewed", detail: job.executionEvidence?.join(", ") || "Completion proof is missing." },
    { label: "Safety-impact check passed", detail: "No visible, functional, custody, or safety condition blocks release." }
  ];
  if (/brake/i.test(text)) base.push({ label: "Brake road test and wheel torque verified", detail: "Confirm pedal feel, noise resolution, no warning lights, and wheel torque evidence." });
  if (/steer|suspension|alignment|vibration/i.test(text)) base.push({ label: "Steering and suspension behavior verified", detail: "Confirm centered steering, no abnormal noise, and stable road-test behavior." });
  if (/electrical|battery|charging|scan|warning|abs|airbag/i.test(text)) base.push({ label: "Electrical/scan evidence verified", detail: "Confirm warning-light state, scan/measurement evidence, and secured wiring/connectors." });
  if ((job.partDemands ?? []).length) {
    base.push({ label: "Parts installed or accounted for", detail: `${job.partDemands?.length ?? 0} part demand record(s) tied to this repair job.` });
    base.push({ label: "Unused parts/core returns accounted for", detail: "Confirm any unused, wrong, warranty, or core part has a return, bin, quarantine, or credit-recovery disposition in Parts." });
  }
  if (needsRoadTest(job, order)) base.push({ label: "Road test outcome captured", detail: "A driving concern or safety-impact repair requires road-test evidence." });
  if (needsPeer(job)) base.push({ label: "Independent/peer review considered", detail: "Safety-critical or heavy diagnostic work should not rely on one set of eyes." });
  return base;
}

function gateRows(order: Order, job: Job) {
  return [
    { label: "Technician completion evidence", state: job.executionEvidence?.length ? "ready" : "blocked", detail: job.executionEvidence?.length ? `${job.executionEvidence.length} evidence item(s)` : "Missing completion proof" },
    { label: "QC handoff notes", state: job.qcHandoffNotes ? "ready" : "blocked", detail: job.qcHandoffNotes ?? "Technician must tell QC what to verify" },
    { label: "Labor clock", state: hasOpenLabor(job) ? "blocked" : "ready", detail: hasOpenLabor(job) ? "Running or paused labor blocks release" : "No open labor clock" },
    { label: "Parts readiness", state: hasPartsBlock(job) ? "warning" : "ready", detail: hasPartsBlock(job) ? "Parts demand, reservation, or issue still needs review" : "No parts blocker detected" },
    { label: "Unused parts return control", state: hasPartsActivity(job) ? "warning" : "ready", detail: hasPartsActivity(job) ? "Verify installed vs unused/return/core disposition before release" : "No repair-linked parts demand" },
    { label: "Road test", state: needsRoadTest(job, order) ? "warning" : "ready", detail: needsRoadTest(job, order) ? "Road-test evidence expected" : "Not automatically required" },
    { label: "Peer review", state: needsPeer(job) ? "warning" : "ready", detail: needsPeer(job) ? "Independent verification recommended/required for heavy work" : "Standard QC applies" }
  ];
}

function releaseLocks(order: Order) {
  const locks = order.repairJobs.flatMap((job) => [
    ...(job.status !== "QC_PASSED" || job.qualityInspections[0]?.disposition !== "PASSED" ? [`${job.jobNumber}: latest QC pass required`] : []),
    ...(hasOpenLabor(job) ? [`${job.jobNumber}: close running/paused labor`] : []),
    ...(hasPartsBlock(job) ? [`${job.jobNumber}: resolve parts custody/readiness`] : [])
  ]);
  return order.releaseAuthorization ? [] : locks;
}

function advisorSafeStatus(order: Order, job: Job) {
  if (order.releaseAuthorization) return "Vehicle passed QC and has been authorized for handoff.";
  if (job.status === "QC_PASSED") return "This repair passed QC. We are waiting for the full repair order release gate.";
  if (isFailed(job)) return "QC found an item that must be corrected before release. The vehicle is not ready for delivery yet.";
  if (job.status === "READY_FOR_QC") return "The repair is complete and waiting for final quality verification.";
  return "The repair is not yet ready for final quality verification.";
}

function customerReadySummary(order: Order, job: Job) {
  if (order.releaseAuthorization) return `Final quality control passed for ${vehicleName(order)}. The repair order has been authorized for handoff.`;
  if (job.status === "QC_PASSED") return `${job.description} passed final quality inspection. The vehicle is waiting for remaining repair-order release checks.`;
  if (isFailed(job)) return `QC found an item needing correction on ${job.description}. We are routing it back for rework before delivery.`;
  if (job.status === "READY_FOR_QC") return `${job.description} is complete and waiting for final quality verification.`;
  return `${job.description} is still in repair workflow and is not ready for final QC yet.`;
}

function scorecardRows(jobs: Array<{ order: Order; job: Job }>) {
  const byTech = new Map<string, { failed: number; passed: number; total: number }>();
  for (const { job } of jobs) {
    const tech = job.dispatches[0]?.technicianUser.name ?? "Unassigned";
    const row = byTech.get(tech) ?? { failed: 0, passed: 0, total: 0 };
    row.total += 1;
    if (job.status === "QC_PASSED") row.passed += 1;
    if (isFailed(job)) row.failed += 1;
    byTech.set(tech, row);
  }
  return [...byTech.entries()].map(([name, row]) => ({ name, ...row }));
}

export function QualityControlWorkspace({ initial, initialRepairOrderId, returnLabel, returnTo }: { initial: Model; initialRepairOrderId?: string; returnLabel?: string; returnTo?: string }) {
  const initialOrder = initial.repairOrders.find((order) => order.id === initialRepairOrderId) ?? initial.repairOrders[0];
  const [model, setModel] = useState(initial);
  const [orderId, setOrderId] = useState(initialOrder?.id ?? "");
  const [jobId, setJobId] = useState(initialOrder?.repairJobs.find((job) => job.status === "READY_FOR_QC")?.id ?? initialOrder?.repairJobs[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [frontlineResults, setFrontlineResults] = useState<Record<string, FrontlineResult>>({});
  const [frontlineNotes, setFrontlineNotes] = useState<Record<string, string>>({});
  const [quickChecks, setQuickChecks] = useState({ repair: false, finish: false, safety: false });
  const [quickNote, setQuickNote] = useState("");
  const [vendorQcNote, setVendorQcNote] = useState("");
  const [qc, setQc] = useState({
    templateCode: "FINAL_QC",
    templateVersion: 1,
    completionResult: "PASS",
    safetyResult: "PASS",
    completionEvidence: "",
    roadTestRequired: false,
    roadTestOutcome: "NOT_REQUIRED",
    roadTestEvidence: "",
    peerVerificationPassed: false,
    peerVerifierUserId: initial.users[0]?.id ?? "",
    reworkRoute: "TECHNICIAN",
    reworkInstructions: ""
  });
  const [release, setRelease] = useState({ keysVerified: false, releaseEvidence: "", openExceptions: "" });
  const [checkResults, setCheckResults] = useState<Record<string, "PASS" | "FAIL" | "NOT_APPLICABLE">>({});

  const jobs = useMemo(() => model.repairOrders.flatMap((order) => order.repairJobs.map((job) => ({ order, job }))), [model]);
  const vendorQcRows = model.repairOrders.map((queueOrder) => ({ order: queueOrder, work: activeVendorQcWork(queueOrder) })).filter((row): row is { order: Order; work: VendorWork } => Boolean(row.work));
  const readyJobs = jobs.filter(({ job }) => job.status === "READY_FOR_QC");
  const failedJobs = jobs.filter(({ job }) => isFailed(job));
  const passedOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED"));
  const releaseReadyOrders = model.repairOrders.filter((order) => order.repairJobs.length && order.repairJobs.every((job) => job.status === "QC_PASSED" && job.qualityInspections[0]?.disposition === "PASSED") && !order.releaseAuthorization);
  const evidenceBlocked = readyJobs.filter(({ job }) => !job.executionEvidence?.length || !job.qcHandoffNotes);
  const partsBlocked = jobs.filter(({ job }) => hasPartsBlock(job));
  const inspectedJobs = jobs.filter(({ job }) => job.qualityInspections.length);
  const firstPassRate = inspectedJobs.length ? Math.round((inspectedJobs.filter(({ job }) => job.qualityInspections.at(-1)?.disposition === "PASSED").length / inspectedJobs.length) * 100) : 0;
  const order = model.repairOrders.find((item) => item.id === orderId) ?? model.repairOrders[0];
  const job = order?.repairJobs.find((item) => item.id === jobId) ?? order?.repairJobs[0];
  const vendorQcWork = activeVendorQcWork(order);
  const allPassed = Boolean(order?.repairJobs.length) && order.repairJobs.every((item) => item.status === "QC_PASSED" && item.qualityInspections[0]?.disposition === "PASSED");
  const latestInspection = job?.qualityInspections[0];
  const checklist = order && job ? generatedChecklist(order, job) : [];
  const gates = order && job ? gateRows(order, job) : [];
  const locks = order ? releaseLocks(order) : [];
  const technicianScorecard = scorecardRows(jobs);
  const safetyEscalation = Boolean(order && job && isSafetyCritical(job, order));
  const comebackCount = job?.comebackCases?.filter((item) => item.status !== "CLOSED").length ?? 0;
  const frontlineCounts = frontlineQcItems.reduce<Record<FrontlineResult, number>>((counts, item) => {
    const result = frontlineResults[item.code];
    if (result) counts[result] += 1;
    return counts;
  }, { FAIL: 0, REVIEW: 0, PASS: 0 });
  const frontlineInspected = frontlineCounts.FAIL + frontlineCounts.REVIEW + frontlineCounts.PASS;
  const frontlineRemaining = frontlineQcItems.length - frontlineInspected;
  const frontlineReady = allPassed && frontlineRemaining === 0 && frontlineCounts.FAIL === 0 && frontlineCounts.REVIEW === 0;
  const showVendorReturnQc = Boolean(order && vendorQcWork && !order.releaseAuthorization && (!job || order.stage === "QUALITY_CONTROL"));
  const showFrontlineQc = Boolean(order && job && !showVendorReturnQc && !order.releaseAuthorization && allPassed);

  useEffect(() => {
    if (!orderId) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(`frontline-qc:${orderId}`);
        if (!saved) {
          setFrontlineResults({});
          setFrontlineNotes({});
          return;
        }
        const draft = JSON.parse(saved) as { results?: Record<string, FrontlineResult>; notes?: Record<string, string> };
        setFrontlineResults(draft.results ?? {});
        setFrontlineNotes(draft.notes ?? {});
      } catch {
        setFrontlineResults({});
        setFrontlineNotes({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [orderId]);

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Quality-control request failed.");
    return body;
  }

  async function refresh() {
    const next = await request("/api/quality-control") as Model;
    setModel(next);
  }

  async function submit(url: string, value: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, idempotencyKey: crypto.randomUUID() }) });
      setNotice(success);
      await refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Quality-control request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function chooseJob(nextOrder: Order, nextJob: Job) {
    setOrderId(nextOrder.id);
    setJobId(nextJob.id);
  }

  function chooseVendorReturn(nextOrder: Order) {
    setOrderId(nextOrder.id);
    setJobId("");
  }

  function resultFor(label: string) {
    return checkResults[label] ?? "PASS";
  }

  async function recordQuickQc(result: "PASS" | "FAIL") {
    if (!order || !job) return;
    const evidence = quickNote.trim() || `Final QC ${result === "PASS" ? "completed" : "failed"} for ${job.description}.`;
    if (result === "FAIL" && quickNote.trim().length < 10) {
      setNotice("Briefly explain what failed so the repair can be corrected.");
      return;
    }
    const passed = result === "PASS";
    const saved = await submit(`/api/repair-jobs/${job.id}/quality-inspection`, {
      templateCode: "QUICK_REPAIR_QC",
      templateVersion: 1,
      checks: [
        { category: "COMPLETION", code: "REPAIR_COMPLETE", label: "Repair matches approved work", result, evidence: [evidence] },
        { category: "SAFETY", code: "FINAL_SAFETY_CHECK", label: "Visible safety and function check", result: passed ? "PASS" : "FAIL", evidence: [evidence] },
        { category: "OTHER", code: "FIT_FINISH", label: "Fit and finish acceptable", result: passed ? "PASS" : "FAIL", evidence: [evidence] }
      ],
      completionEvidence: [evidence],
      roadTestRequired: false,
      roadTestOutcome: "NOT_REQUIRED",
      roadTestEvidence: [],
      peerVerificationPassed: false,
      peerVerifierUserId: null,
      reworkInstructions: passed ? null : `Return for correction: ${quickNote.trim()}`,
      inspectedAt: new Date().toISOString(),
      reason: passed ? "Record quick repair QC pass and open Final Frontline QC." : "Record quick repair QC failure and return for correction."
    }, passed ? "Repair QC passed. Complete Final Frontline QC to clear the vehicle for frontline readiness." : "Repair QC failed. The repair was returned for correction.");
    if (saved) {
      setQuickChecks({ repair: false, finish: false, safety: false });
      setQuickNote("");
    }
  }

  async function recordVendorQc(result: "PASS" | "FAIL") {
    if (!order || !vendorQcWork) return;
    const note = vendorQcNote.trim();
    if (result === "FAIL" && note.length < 10) {
      setNotice("Briefly describe what the vendor did not complete so the follow-up repair can be created.");
      return;
    }
    const passed = result === "PASS";
    setBusy(true);
    setNotice("");
    try {
      const postVendorStatus = (status: string, summary: string, nextAction: string, reason: string) => request(`/api/repair-orders/${order.id}/vendor-work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          vendorWorkId: vendorQcWork.id,
          approvalStatus: vendorQcWork.approvalStatus,
          currentLocation: order.location.name,
          customerVisibleSummary: passed
            ? `The returned outside-vendor repair from ${vendorQcWork.vendorName} passed dealership QC.`
            : `The returned outside-vendor repair from ${vendorQcWork.vendorName} needs follow-up correction before handoff.`,
          evidence: [note || "Dealership QC passed the returned outside-vendor repair."],
          idempotencyKey: crypto.randomUUID(),
          internalNotes: passed ? null : `Incomplete vendor scope: ${note}`,
          lastUpdateSummary: summary,
          nextAction,
          occurredAt: new Date().toISOString(),
          reason,
          scope: vendorQcWork.scope,
          sentFrom: vendorQcWork.sentFrom,
          status,
          transportMethod: vendorQcWork.transportMethod
        })
      });
      if (passed && vendorQcWork.status === "RETURNED") {
        await postVendorStatus("QC_REQUIRED", "Dealership QC started for the returned outside-vendor repair.", "Complete dealership QC pass/fail decision.", "Open dealership QC review for returned outside-vendor repair.");
      }
      await postVendorStatus(
        passed ? "COMPLETED" : "QC_REQUIRED",
        passed ? "Dealership QC passed the returned outside-vendor repair." : `Dealership QC failed the returned outside-vendor repair: ${note}`,
        passed ? "Continue inventory/customer handoff after vendor repair QC." : "Create a follow-up repair scope for the incomplete vendor work.",
        passed ? "Pass returned outside-vendor repair through dealership QC." : "Fail returned outside-vendor repair and route missing work to follow-up repair planning."
      );
      setNotice(passed ? "Vendor repair passed dealership QC. Continue handoff/frontline readiness." : "Vendor repair failed dealership QC. Open repair planning to create the follow-up repair scope.");
      setVendorQcNote("");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vendor QC decision could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function saveFrontlineDraft(showConfirmation = true) {
    if (!order) return;
    window.localStorage.setItem(`frontline-qc:${order.id}`, JSON.stringify({ results: frontlineResults, notes: frontlineNotes }));
    if (showConfirmation) setNotice("Final Frontline QC draft saved. You can finish it later on this vehicle.");
  }

  function setFrontlineResult(codeValue: string, result: FrontlineResult) {
    const next = { ...frontlineResults, [codeValue]: result };
    setFrontlineResults(next);
    if (order) window.localStorage.setItem(`frontline-qc:${order.id}`, JSON.stringify({ results: next, notes: frontlineNotes }));
  }

  function setFrontlineNote(codeValue: string, note: string) {
    const next = { ...frontlineNotes, [codeValue]: note };
    setFrontlineNotes(next);
    if (order) window.localStorage.setItem(`frontline-qc:${order.id}`, JSON.stringify({ results: frontlineResults, notes: next }));
  }

  async function completeFrontlineQc() {
    if (!order || !frontlineReady) {
      setNotice("Resolve every failed or review item and complete all checks before marking the vehicle Frontline Ready.");
      return;
    }
    const evidence = frontlineQcSections.flatMap((section) => section.items.map((item) => {
      const note = frontlineNotes[item.code]?.trim();
      return `${section.title} — ${item.label}: PASS${note ? ` — ${note}` : ""}`;
    }));
    const saved = await submit(`/api/repair-orders/${order.id}/release-authorization`, {
      keysVerified: frontlineResults.KEYS_DOCUMENTS === "PASS",
      releaseEvidence: evidence,
      openExceptions: [],
      authorizedAt: new Date().toISOString(),
      reason: "Final Frontline QC completed with every vehicle check passed and no unresolved exceptions."
    }, "Final Frontline QC passed. The vehicle now shows green in the QC list and is cleared for photos, merchandising, and the next frontline-readiness handoff.");
    if (saved) {
      window.localStorage.removeItem(`frontline-qc:${order.id}`);
    }
  }

  return (
    <section className="qc-workspace-home">
      <header className="qc-hero">
        <div>
          {returnTo ? <Link href={returnTo}>← {returnLabel ?? "Return to source workspace"}</Link> : null}
          <p>Quality Control Workspace</p>
          <h1>Verify completed repairs before they leave the shop.</h1>
          <span>One inspector queue for ready work, failed rechecks, evidence gaps, release decisions, and repair-order context.</span>
        </div>
        <nav aria-label="Quality control primary actions">
          <Link className="primary" href="#ready-for-qc"><ClipboardCheck /> Ready for QC</Link>
          <Link href="#qc-review"><ShieldCheck /> Inspect Selected</Link>
          <Link href={order ? workbenchHref(order) : "/vehicles/repair-workbench"}><FileText /> Repair Order</Link>
          <Link href="/my-tasks"><BadgeCheck /> My Work</Link>
        </nav>
      </header>

      {notice ? (
        <div className={/blocked|required|must|cannot|failed|only|different/i.test(notice) ? "notice notice-danger" : "notice notice-success"}>
          <p>{notice}</p>
        </div>
      ) : null}

      {order && vendorQcWork && showVendorReturnQc ? (
        <section className="qc-quick vendor-return-qc" aria-label="Vendor Return QC">
          <header>
            <div>
              <span>Vendor Return QC</span>
              <h2>{vehicleName(order)} · {order.repairOrderNumber}</h2>
              <p>Pass if {vendorQcWork.vendorName} completed the approved scope. Fail if any item is incomplete, then create the follow-up repair scope.</p>
            </div>
            <strong>{vendorQcWork.status.replaceAll("_", " ")}</strong>
          </header>
          <div className="vendor-qc-facts">
            <article><span>Vendor</span><strong>{vendorQcWork.vendorName}</strong><small>{vendorQcWork.currentLocation ?? order.location.name}</small></article>
            <article><span>Approved scope</span><strong>{vendorQcWork.scope || order.serviceVisit.concernSummary || "Vendor scope not recorded"}</strong><small>{vendorQcWork.lastUpdateSummary}</small></article>
            <article><span>Next action</span><strong>{vendorQcWork.nextAction}</strong><small>Returned: {dateTime(vendorQcWork.expectedReturnAt)}</small></article>
          </div>
          <label className="qc-quick-note"><span>QC note <small>(required when failing vendor work)</small></span><textarea placeholder="Example: Simba did not replace the outer door handle or upper/lower steering column covers." value={vendorQcNote} onChange={(event) => setVendorQcNote(event.target.value)} /></label>
          <footer>
            <Link className="qc-quick-link" href={vendorFollowUpHref(order)}>Create follow-up repair scope</Link>
            <button className="qc-quick-fail" disabled={busy} onClick={() => void recordVendorQc("FAIL")} type="button">Fail vendor repair</button>
            <button className="qc-quick-pass" disabled={busy} onClick={() => void recordVendorQc("PASS")} type="button">Pass vendor repair</button>
          </footer>
          <button className="qc-advanced-toggle" onClick={() => setShowAdvanced((value) => !value)} type="button">{showAdvanced ? "Hide detailed QC tools" : "Show queue and detailed QC tools"}</button>
        </section>
      ) : null}

      {order && job && !showVendorReturnQc && !showFrontlineQc && !order.releaseAuthorization ? (
        <section className="qc-quick" aria-label="Quick Repair QC">
          <header>
            <div>
              <span>Quick Repair QC</span>
              <h2>{vehicleName(order)} · {order.repairOrderNumber}</h2>
              <p>{job.description} — confirm three items, then pass or return the repair.</p>
            </div>
            <strong>{job.status.replaceAll("_", " ")}</strong>
          </header>
          <div className="qc-quick-checks">
            <label><input checked={quickChecks.repair} onChange={(event) => setQuickChecks((value) => ({ ...value, repair: event.target.checked }))} type="checkbox" /><span><b>Repair completed</b><small>Matches the approved work.</small></span></label>
            <label><input checked={quickChecks.finish} onChange={(event) => setQuickChecks((value) => ({ ...value, finish: event.target.checked }))} type="checkbox" /><span><b>Fit and finish acceptable</b><small>No visible defect or loose item.</small></span></label>
            <label><input checked={quickChecks.safety} onChange={(event) => setQuickChecks((value) => ({ ...value, safety: event.target.checked }))} type="checkbox" /><span><b>Safety/function check passed</b><small>No warning or functional concern.</small></span></label>
          </div>
          <label className="qc-quick-note"><span>Note <small>(optional for pass; required for failure)</small></span><textarea placeholder="Example: Fender alignment, attachment, and finish verified." value={quickNote} onChange={(event) => setQuickNote(event.target.value)} /></label>
          <footer>
            <button className="qc-quick-fail" disabled={busy || job.status !== "READY_FOR_QC"} onClick={() => void recordQuickQc("FAIL")} type="button">QC failed — return for correction</button>
            <button className="qc-quick-pass" disabled={busy || job.status !== "READY_FOR_QC" || !quickChecks.repair || !quickChecks.finish || !quickChecks.safety} onClick={() => void recordQuickQc("PASS")} type="button">Pass Repair QC</button>
          </footer>
          <button className="qc-advanced-toggle" onClick={() => setShowAdvanced((value) => !value)} type="button">{showAdvanced ? "Hide detailed QC tools" : "Show queue and detailed QC tools"}</button>
        </section>
      ) : null}

      {order && job && showFrontlineQc ? (
        <section className="frontline-final-qc" aria-label="Final Frontline QC">
          <header className="frontline-final-header">
            <div>
              <p className="frontline-breadcrumb">Repair QC <span>/</span> Final Frontline QC</p>
              <p className="frontline-repair-passed"><CheckCircle2 /> Repair QC passed — {job.description}</p>
              <h2>Final Frontline QC</h2>
              <span>Inspect the whole vehicle before marking it Frontline Ready.</span>
              <strong>{vehicleName(order)} · {order.repairOrderNumber} · {order.inventoryUnit?.inventoryNumber ?? order.vehicle.vehicleNumber}</strong>
            </div>
            <Link className="frontline-return" href={manageRepairHref(order)}>← Return to repair</Link>
          </header>

          <div className="frontline-progress-row">
            <div>
              <strong>{frontlineInspected} of {frontlineQcItems.length} inspected</strong>
              <span><i style={{ width: `${Math.round((frontlineInspected / frontlineQcItems.length) * 100)}%` }} /></span>
            </div>
            <div className="frontline-legend" aria-label="Inspection result legend"><b className="fail">● Fail</b><b className="review">● Review</b><b className="pass">● Pass</b></div>
          </div>

          <div className="frontline-summary" aria-label="Final Frontline QC summary">
            <article className="fail"><AlertTriangle /><strong>{frontlineCounts.FAIL}</strong><span>Failed</span></article>
            <article className="review"><RotateCcw /><strong>{frontlineCounts.REVIEW}</strong><span>Needs Review</span></article>
            <article className="pass"><CheckCircle2 /><strong>{frontlineCounts.PASS}</strong><span>Passed</span></article>
            <article><Gauge /><strong>{frontlineRemaining}</strong><span>Remaining</span></article>
          </div>

          <div className="frontline-checklist-columns">
            {frontlineQcSections.map((section, sectionIndex) => (
              <section className="frontline-checklist-section" key={section.title}>
                <h3>{sectionIndex + 1}. {section.title}</h3>
                <div>
                  {section.items.map((item, itemIndex) => {
                    const result = frontlineResults[item.code];
                    const exception = result === "FAIL" || result === "REVIEW";
                    return (
                      <article className={exception ? `has-${result.toLowerCase()}` : ""} key={item.code}>
                        <div className="frontline-item-copy"><b>{sectionIndex + 1}.{itemIndex + 1}</b><span><strong>{item.label}</strong><small>{item.hint}</small></span></div>
                        <div className="frontline-result-options" role="group" aria-label={`${item.label} result`}>
                          {(["FAIL", "REVIEW", "PASS"] as FrontlineResult[]).map((choice) => (
                            <button aria-pressed={result === choice} className={choice.toLowerCase()} key={choice} onClick={() => setFrontlineResult(item.code, choice)} type="button">{choice === "FAIL" ? "×" : choice === "REVIEW" ? "!" : "✓"} {choice[0]}{choice.slice(1).toLowerCase()}</button>
                          ))}
                        </div>
                        {exception ? <label className="frontline-exception-note"><span>{result === "FAIL" ? "Failure" : "Review"} note</span><input onChange={(event) => setFrontlineNote(item.code, event.target.value)} placeholder="Describe what needs attention" value={frontlineNotes[item.code] ?? ""} /></label> : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <footer className="frontline-final-actions">
            <p><AlertTriangle /> {frontlineReady ? "Every check passed. This vehicle can be cleared for frontline readiness." : "Resolve failed and review items, then complete all checks."}</p>
            <button className="secondary" disabled={busy} onClick={() => saveFrontlineDraft()} type="button">Save &amp; finish later</button>
            <button className="primary" disabled={busy || !frontlineReady} onClick={() => void completeFrontlineQc()} type="button">Mark Frontline Ready</button>
          </footer>
        </section>
      ) : null}

      {order?.releaseAuthorization ? (
        <section className="frontline-qc-complete"><CheckCircle2 /><div><strong>Final Frontline QC complete</strong><span>This repair order is cleared for photos, merchandising, and its next frontline-readiness handoff.</span></div></section>
      ) : null}

      <div className="qc-advanced-workspace" hidden={!showAdvanced && Boolean((order && job) || showVendorReturnQc)}>
      <section className="qc-kpis" aria-label="Quality control snapshot">
        <article><ClipboardCheck /><span>Ready for QC</span><strong>{readyJobs.length + vendorQcRows.length}</strong><small>Awaiting inspection</small></article>
        <article><RotateCcw /><span>Recheck / Rework</span><strong>{failedJobs.length}</strong><small>Failed or returned</small></article>
        <article><AlertTriangle /><span>Evidence Gaps</span><strong>{evidenceBlocked.length}</strong><small>Missing proof or notes</small></article>
        <article><PackageCheck /><span>Parts Blocks</span><strong>{partsBlocked.length}</strong><small>Custody/readiness</small></article>
        <article><CheckCircle2 /><span>Release Ready</span><strong>{releaseReadyOrders.length}</strong><small>All jobs passed</small></article>
        <article><Gauge /><span>First Pass</span><strong>{firstPassRate}%</strong><small>{passedOrders.length} passed order(s)</small></article>
      </section>

      <div className="qc-layout">
        <section className="qc-panel qc-queue" id="ready-for-qc">
          <header>
            <div>
              <strong>Inspector queue</strong>
              <span>Prioritize ready work, failed rechecks, and evidence-blocked repairs.</span>
            </div>
            <Link href="/vehicles/shop-recon">Shop picture</Link>
          </header>
          <div>
            {vendorQcRows.map(({ order: queueOrder, work }) => (
              <button aria-pressed={orderId === queueOrder.id && !jobId} className="qc-row ready vendor" key={work.id} onClick={() => chooseVendorReturn(queueOrder)} type="button">
                <span>
                  <strong>{queueOrder.repairOrderNumber} · Vendor return</strong>
                  <small className="qc-row-vehicle"><Car /><span>{vehicleName(queueOrder)} · {queueOrder.customer?.displayName ?? queueOrder.inventoryUnit?.inventoryNumber ?? queueOrder.origin}</span></small>
                </span>
                <span>
                  <b>DEALERSHIP QC</b>
                  <small>{work.vendorName} · {work.status.replaceAll("_", " ")}</small>
                </span>
                <ArrowRight />
              </button>
            ))}
            {jobs.length ? jobs.map(({ order: queueOrder, job: queueJob }) => {
              const cleared = isFrontlineCleared(queueOrder);
              const statusClass = cleared ? "cleared" : queueJob.status === "READY_FOR_QC" ? "ready" : isFailed(queueJob) ? "danger" : queueJob.status === "QC_PASSED" ? "review" : "neutral";
              return (
                <button aria-pressed={orderId === queueOrder.id && jobId === queueJob.id} className={`qc-row ${statusClass}`} key={queueJob.id} onClick={() => chooseJob(queueOrder, queueJob)} type="button">
                  <span>
                    <strong>{queueOrder.repairOrderNumber} · {queueJob.jobNumber}</strong>
                    <small className="qc-row-vehicle"><Car className={cleared ? "is-cleared" : undefined} /><span>{vehicleName(queueOrder)} · {queueOrder.customer?.displayName ?? queueOrder.inventoryUnit?.inventoryNumber ?? queueOrder.origin}</span></small>
                  </span>
                  <span>
                    <b>{cleared ? "QC CLEARED" : queueJob.status === "QC_PASSED" ? "REPAIR QC PASSED" : queueJob.status.replaceAll("_", " ")}</b>
                    <small>{cleared ? "Green vehicle · ready for photos and frontline merchandising" : queueJob.dispatches[0]?.technicianUser.name ?? "Technician not recorded"}</small>
                  </span>
                  <ArrowRight />
                </button>
              );
            }) : vendorQcRows.length ? null : (
              <div className="qc-empty-state">
                <CheckCircle2 />
                <strong>No vehicles ready for QC right now.</strong>
                <span>{evidenceBlocked.length} evidence-blocked · {partsBlocked.length} parts-blocked · {failedJobs.length} recheck item(s)</span>
                <Link href="/vehicles/shop-recon">Review shop flow</Link>
              </div>
            )}
          </div>
        </section>

        <aside className="qc-panel qc-selected">
          <header>
            <div>
              <strong>Selected repair</strong>
              <span>Canonical repair-order context</span>
            </div>
            {order ? <Link href={workbenchHref(order)}>Open RO</Link> : null}
          </header>
          {order && vendorQcWork && !job ? (
            <div className="qc-selected-body">
              <p><Car /><span><strong>{vehicleName(order)}</strong><small>{order.vehicle.vehicleNumber} · {order.location.name}</small></span></p>
              <p><FileText /><span><strong>{order.repairOrderNumber}</strong><small>{order.serviceVisit.concernSummary || "No concern summary"}</small></span></p>
              <p><Wrench /><span><strong>{vendorQcWork.vendorName}</strong><small>{vendorQcWork.scope || "Vendor scope not recorded"}</small></span></p>
              <p><ShieldCheck /><span><strong>{vendorQcWork.status.replaceAll("_", " ")}</strong><small>{vendorQcWork.nextAction}</small></span></p>
              <p><BadgeCheck /><span><strong>Vendor-return decision</strong><small>Pass to continue handoff, or fail and create follow-up repair scope.</small></span></p>
            </div>
          ) : order && job ? (
            <div className="qc-selected-body">
              <p className={order.releaseAuthorization ? "is-cleared" : undefined}><Car /><span><strong>{vehicleName(order)}</strong><small>{order.releaseAuthorization ? `${order.vehicle.vehicleNumber} · ${order.location.name} · Green in QC list / ready for photos` : `${order.vehicle.vehicleNumber} · ${order.location.name}`}</small></span></p>
              <p><FileText /><span><strong>{order.repairOrderNumber}</strong><small>{order.serviceVisit.concernSummary || "No concern summary"}</small></span></p>
              <p><Wrench /><span><strong>{job.description}</strong><small>{job.plannedCorrection || "No planned correction"}</small></span></p>
              <p><ShieldCheck /><span><strong>{latestInspection?.disposition ?? "No QC result yet"}</strong><small>Promise: {dateTime(order.serviceVisit.promisedAt ?? order.targetAt)}</small></span></p>
              <p><BadgeCheck /><span><strong>Advisor-safe status</strong><small>{advisorSafeStatus(order, job)}</small></span></p>
              <p><AlertTriangle /><span><strong>{safetyEscalation ? "Safety escalation applies" : "Standard QC"}</strong><small>{safetyEscalation ? "Peer/road-test attention is expected before release." : "No automatic safety escalation detected."}</small></span></p>
            </div>
          ) : (
            <p className="qc-empty"><ShieldCheck /> Select a repair job to inspect.</p>
          )}
        </aside>
      </div>

      {order && job ? (
        <div className="qc-review-grid" id="qc-review">
          <section className="qc-panel qc-gates">
            <header>
              <div>
                <strong>Enterprise release gates</strong>
                <span>Error-proof checks before QC pass or vehicle release.</span>
              </div>
            </header>
            <div>
              {gates.map((gate) => (
                <p className={gate.state} key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.state === "ready" ? "Ready" : gate.state === "warning" ? "Review" : "Blocked"}</strong>
                  <small>{gate.detail}</small>
                </p>
              ))}
            </div>
          </section>

          <section className="qc-panel">
            <header>
              <div>
                <strong>Repair handoff evidence</strong>
                <span>QC starts from the completed repair result and supporting notes.</span>
              </div>
              <Link href={manageRepairHref(order)}>Manage repair</Link>
            </header>
            <div className="qc-evidence-grid">
              <article>
                <span>Procedure</span>
                <strong>{job.procedureVersion ? `${job.procedureVersion.title} · v${job.procedureVersion.version}` : "No procedure attached"}</strong>
                <small>{job.procedureVersion?.qcRules.join(" · ") || "Use the generated Final QC checklist below."}</small>
              </article>
              <article>
                <span>Completion evidence</span>
                <strong>{job.executionEvidence?.length ?? 0} item(s)</strong>
                <small>{job.executionEvidence?.join(" · ") || "Missing technician proof"}</small>
              </article>
              <article>
                <span>QC handoff notes</span>
                <strong>{job.qcHandoffNotes ? "Provided" : "Missing"}</strong>
                <small>{job.qcHandoffNotes ?? "Ask technician for what QC should verify."}</small>
              </article>
            </div>
          </section>

          <section className="qc-panel qc-checklist">
            <header>
              <div>
                <strong>Generated QC checklist</strong>
                <span>Context-aware checklist from concern, correction, procedure, parts, and repair lane.</span>
              </div>
            </header>
            <div>
              {checklist.map((item, index) => (
                <p key={`${item.label}-${index}`}>
                  <CheckCircle2 />
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <select aria-label={`${item.label} result`} value={resultFor(item.label)} onChange={(event) => setCheckResults((value) => ({ ...value, [item.label]: event.target.value as "PASS" | "FAIL" | "NOT_APPLICABLE" }))}>
                    <option>PASS</option>
                    <option>FAIL</option>
                    <option>NOT_APPLICABLE</option>
                  </select>
                </p>
              ))}
            </div>
          </section>

          <section className="qc-panel qc-summary-panel">
            <header>
              <div>
                <strong>Customer-ready completion summary</strong>
                <span>Advisor-safe language after QC state changes.</span>
              </div>
            </header>
            <p>{customerReadySummary(order, job)}</p>
          </section>

          <section className="qc-panel qc-upload-panel">
            <header>
              <div>
                <strong>QC photo / evidence staging</strong>
                <span>Attach references now; direct upload storage can plug into the same canonical evidence trail later.</span>
              </div>
            </header>
            <p><ImagePlus /> Use the evidence field below for photo, video, scan, torque, road-test, or measurement references. These references become immutable QC evidence when the inspection is recorded.</p>
          </section>

          <form
            className="qc-panel qc-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const heavy = job.lane === "DIAGNOSTIC_HEAVY";
              submit(`/api/repair-jobs/${job.id}/quality-inspection`, {
                templateCode: qc.templateCode,
                templateVersion: qc.templateVersion,
                checks: [
                  { category: "COMPLETION", code: "CORRECTION_COMPLETE", label: "Approved correction completed", result: qc.completionResult, evidence: list(qc.completionEvidence) },
                  { category: "SAFETY", code: "SAFETY_CONTROLS", label: "Applicable safety checks passed", result: qc.safetyResult, evidence: list(qc.completionEvidence) },
                  ...checklist.map((item) => ({ category: isSafetyCritical(job, order) && /safety|brake|steer|suspension|road test|wheel/i.test(item.label) ? "SAFETY" : "OTHER", code: code(item.label), label: item.label, result: resultFor(item.label), evidence: list(qc.completionEvidence) }))
                ],
                completionEvidence: list(qc.completionEvidence),
                roadTestRequired: qc.roadTestRequired,
                roadTestOutcome: qc.roadTestRequired ? qc.roadTestOutcome : "NOT_REQUIRED",
                roadTestEvidence: list(qc.roadTestEvidence),
                peerVerificationPassed: heavy || safetyEscalation ? qc.peerVerificationPassed : false,
                peerVerifierUserId: heavy || safetyEscalation ? qc.peerVerifierUserId : null,
                reworkInstructions: qc.reworkInstructions ? `Route ${qc.reworkRoute}: ${qc.reworkInstructions}` : null,
                inspectedAt: new Date().toISOString(),
                reason: "Record attributable quality inspection and enforce release gates."
              }, "Quality inspection recorded.");
            }}
          >
            <header>
              <div>
                <strong>Record QC decision</strong>
                <span>Pass, fail back to technician, or require peer/road-test evidence.</span>
              </div>
            </header>
            <div className="qc-form-grid">
              <label><span>Completion</span><select value={qc.completionResult} onChange={(event) => setQc((value) => ({ ...value, completionResult: event.target.value }))}><option>PASS</option><option>FAIL</option><option>NOT_APPLICABLE</option></select></label>
              <label><span>Safety</span><select value={qc.safetyResult} onChange={(event) => setQc((value) => ({ ...value, safetyResult: event.target.value }))}><option>PASS</option><option>FAIL</option></select></label>
              <label><span>Evidence references</span><input value={qc.completionEvidence} onChange={(event) => setQc((value) => ({ ...value, completionEvidence: event.target.value }))} placeholder="photo:final, scan:alignment" /></label>
              <label><span>Template</span><input value={qc.templateCode} onChange={(event) => setQc((value) => ({ ...value, templateCode: event.target.value }))} /></label>
              <label><span>Version</span><input min="1" type="number" value={qc.templateVersion} onChange={(event) => setQc((value) => ({ ...value, templateVersion: Number(event.target.value) }))} /></label>
              <label><span>Failed-QC route</span><select value={qc.reworkRoute} onChange={(event) => setQc((value) => ({ ...value, reworkRoute: event.target.value }))}>{["TECHNICIAN", "PARTS", "ADVISOR", "MANAGER", "HOLD"].map((route) => <option key={route}>{route}</option>)}</select></label>
              <label className="qc-checkbox"><input checked={qc.roadTestRequired} type="checkbox" onChange={(event) => setQc((value) => ({ ...value, roadTestRequired: event.target.checked, roadTestOutcome: event.target.checked ? "PASSED" : "NOT_REQUIRED" }))} /> Road test applies</label>
              {qc.roadTestRequired ? (
                <>
                  <label><span>Road-test outcome</span><select value={qc.roadTestOutcome} onChange={(event) => setQc((value) => ({ ...value, roadTestOutcome: event.target.value }))}><option>PASSED</option><option>FAILED</option></select></label>
                  <label><span>Road-test evidence</span><input value={qc.roadTestEvidence} onChange={(event) => setQc((value) => ({ ...value, roadTestEvidence: event.target.value }))} /></label>
                </>
              ) : null}
              {job.lane === "DIAGNOSTIC_HEAVY" || safetyEscalation ? (
                <>
                  <label className="qc-checkbox"><input checked={qc.peerVerificationPassed} type="checkbox" onChange={(event) => setQc((value) => ({ ...value, peerVerificationPassed: event.target.checked }))} /> Peer verification passed</label>
                  <label><span>Peer verifier</span><select value={qc.peerVerifierUserId} onChange={(event) => setQc((value) => ({ ...value, peerVerifierUserId: event.target.value }))}>{model.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                </>
              ) : null}
              <label className="wide"><span>Rework instructions when any gate fails</span><textarea value={qc.reworkInstructions} onChange={(event) => setQc((value) => ({ ...value, reworkInstructions: event.target.value }))} placeholder="Explain exactly what must be corrected before this can pass QC." /></label>
            </div>
            <button disabled={busy || job.status !== "READY_FOR_QC"} type="submit">Record immutable QC result</button>
          </form>

          <section className="qc-panel">
            <header>
              <div>
                <strong>Inspection history</strong>
                <span>Immutable QC evidence attached to this repair job.</span>
              </div>
            </header>
            {job.qualityInspections.length ? job.qualityInspections.map((inspection) => (
              <article className="qc-history-row" key={inspection.id}>
                <strong>v{inspection.version} · {inspection.disposition}</strong>
                <span>{dateTime(inspection.inspectedAt)} · {inspection.inspectorUser.name}</span>
                <small>{inspection.failureReasonCodes.join(" · ") || "All applicable gates passed"}</small>
                {inspection.reworkInstructions ? <small>Rework: {inspection.reworkInstructions}</small> : null}
              </article>
            )) : (
              <p className="qc-empty"><ShieldCheck /> No QC inspection recorded yet.</p>
            )}
          </section>

          <section className="qc-panel qc-comeback-panel">
            <header>
              <div>
                <strong>Comeback feedback loop</strong>
                <span>Links QC back to post-release repeat concerns without punitive automation.</span>
              </div>
              <Link href="/vehicles/comebacks">Open comebacks</Link>
            </header>
            {comebackCount ? (
              job.comebackCases?.filter((item) => item.status !== "CLOSED").map((item) => (
                <p key={item.id}><AlertTriangle /> <span><strong>{item.status}</strong><small>{item.reportedConcern ?? item.reasonCategory ?? "Open comeback review"}</small></span></p>
              ))
            ) : (
              <p><CheckCircle2 /> <span><strong>No open comeback linked</strong><small>QC history remains available if a future comeback is opened.</small></span></p>
            )}
          </section>

          <section className="qc-panel qc-scorecard">
            <header>
              <div>
                <strong>QC operating scorecard</strong>
                <span>Pattern visibility for coaching and process improvement, not automatic discipline.</span>
              </div>
            </header>
            <div>
              {technicianScorecard.map((row) => (
                <p key={row.name}><span>{row.name}</span><strong>{row.passed}/{row.total} passed</strong><small>{row.failed} rework item(s)</small></p>
              ))}
            </div>
          </section>

          <section className="qc-panel qc-release">
            <header>
              <div>
                <strong>Final release authorization</strong>
                <span>Vehicle cannot leave QC until every job has a latest passing inspection.</span>
              </div>
            </header>
            <div className="qc-release-list">
              {order.repairJobs.map((item) => <p key={item.id}><span>{item.jobNumber} · {item.description}</span><strong>{item.status.replaceAll("_", " ")}</strong></p>)}
            </div>
            {locks.length ? (
              <div className="qc-lock-list">
                {locks.map((lock) => <p key={lock}><AlertTriangle /> {lock}</p>)}
              </div>
            ) : null}
            {order.releaseAuthorization ? (
              <p className="qc-release-authorized"><CheckCircle2 /> Authorized for {order.releaseAuthorization.destination} on {dateTime(order.releaseAuthorization.authorizedAt)}.</p>
            ) : (
              <form
                className="qc-release-form"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  submit(`/api/repair-orders/${order.id}/release-authorization`, {
                    ...release,
                    releaseEvidence: list(release.releaseEvidence),
                    openExceptions: list(release.openExceptions),
                    authorizedAt: new Date().toISOString(),
                    reason: "Authorize vehicle handoff after every applicable quality gate passed."
                  }, "Vehicle release authorized.");
                }}
              >
                <label className="qc-checkbox"><input checked={release.keysVerified} type="checkbox" onChange={(event) => setRelease((value) => ({ ...value, keysVerified: event.target.checked }))} /> Keys verified</label>
                <label><span>Final-condition evidence</span><input value={release.releaseEvidence} onChange={(event) => setRelease((value) => ({ ...value, releaseEvidence: event.target.value }))} /></label>
                <label><span>Open exceptions</span><input value={release.openExceptions} onChange={(event) => setRelease((value) => ({ ...value, openExceptions: event.target.value }))} placeholder="Must be empty for release" /></label>
                <button disabled={busy || !allPassed} type="submit">Authorize governed handoff</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
      </div>
    </section>
  );
}
