"use client";

import { Activity, AlertTriangle, ArrowLeft, Camera, CarFront, Check, ClipboardList, Eye, Gauge, Link2, PackageCheck, Plus, RefreshCw, Ruler, ScanLine, ShieldAlert, Stethoscope, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DiagnosticCaseWorkspaceModel } from "@/server/diagnostics/service";
import { DiagnosticEvidenceReview, DiagnosticLabWorkspace } from "./diagnostic-lab-workspace";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const stages = ["CONCERN", "EVIDENCE", "TEST", "CAUSE", "VERIFY"] as const;
type DiagnosticCaptureMode = "NONE" | "INSPECTION" | "OBSERVATION" | "SCAN" | "TEST" | "PRIOR_MEASUREMENT" | "LINK";
type SimpleEstimateLine = { id: string; description: string; labor: string; parts: string; other: string };
const inspectionPhotoEvidenceOptions = ["Dash / warning lights", "Exterior damage", "Mechanical condition", "Mileage / cluster", "Underbody or leak"] as const;
const initialInspectionChecklist = [
  { key: "DASH_CODES", label: "Dash lights / diagnostic codes", help: "Warning lights, stored codes, scan-needed condition" },
  { key: "BODY_DAMAGE", label: "Body / exterior damage", help: "Broken panels, cracked bumper, glass, trim, paint concern" },
  { key: "BRAKES_SAFETY", label: "Brakes / safety", help: "Brake vibration, low pedal, warning light, unsafe stop" },
  { key: "TIRES_WHEELS", label: "Tires / wheels", help: "Low tread, damage, wheel concern, vibration clue" },
  { key: "DRIVABILITY", label: "Drivability / running", help: "No start, misfire, overheating, transmission behavior" },
  { key: "UNDERHOOD_FLUIDS", label: "Underhood / fluids", help: "Oil, coolant, belts, battery, obvious underhood issue" },
  { key: "LEAKS_UNDERBODY", label: "Leaks / underbody", help: "Fluid leak, impact damage, loose shield, exhaust concern" },
  { key: "INTERIOR_ELECTRICAL", label: "Interior / electrical", help: "Controls, windows, infotainment, seat, SRS, cluster" },
] as const;
type InitialInspectionKey = typeof initialInspectionChecklist[number]["key"];
type InitialInspectionStatus = "GREEN" | "YELLOW" | "RED";
const initialInspectionStatusCopy: Record<InitialInspectionStatus, { label: string; meaning: string }> = {
  GREEN: { label: "Green", meaning: "OK / no issue seen" },
  YELLOW: { label: "Yellow", meaning: "Needs review" },
  RED: { label: "Red", meaning: "Repair or safety issue" },
};
const emptyEstimateLine = (id = "LINE-1", description = ""): SimpleEstimateLine => ({ id, description, labor: "", parts: "", other: "" });

function greenInspectionChecklist() {
  return Object.fromEntries(initialInspectionChecklist.map((item) => [item.key, "GREEN"])) as Record<InitialInspectionKey, InitialInspectionStatus>;
}

function emptyInspectionNotes() {
  return Object.fromEntries(initialInspectionChecklist.map((item) => [item.key, ""])) as Record<InitialInspectionKey, string>;
}

function buildInitialInspectionSeed(concern: string) {
  const checklist = greenInspectionChecklist();
  const notes = emptyInspectionNotes();
  const photoGroups = new Set<string>(["Mileage / cluster"]);
  const normalized = concern.toLocaleLowerCase();
  const intakeNote = concern.length > 180 ? `${concern.slice(0, 177)}…` : concern;

  function flag(key: InitialInspectionKey, status: InitialInspectionStatus, note: string, photoGroup?: string) {
    checklist[key] = status;
    notes[key] = note;
    if (photoGroup) photoGroups.add(photoGroup);
  }

  if (/(abs|code|dtc|check engine|warning|dash|light|srs|airbag|tpms)/i.test(normalized)) {
    flag("DASH_CODES", "RED", `Intake concern already mentions warning lights, dash indicators, or codes: ${intakeNote}`, "Dash / warning lights");
  }
  if (/(body|bumper|broken|crack|damage|dent|glass|paint|panel|cover)/i.test(normalized)) {
    flag("BODY_DAMAGE", "RED", `Intake concern already mentions visible body or exterior damage: ${intakeNote}`, "Exterior damage");
  }
  if (/(brake|rotor|pad|pulsat|vibrat|stop|pedal)/i.test(normalized)) {
    flag("BRAKES_SAFETY", "RED", `Intake concern already mentions brake or stopping behavior: ${intakeNote}`, "Mechanical condition");
  }
  if (/(tire|wheel|rim|tread|flat|alignment|balance|vibrat)/i.test(normalized)) {
    flag("TIRES_WHEELS", "YELLOW", `Intake concern already mentions a tire, wheel, or vibration clue: ${intakeNote}`, "Mechanical condition");
  }
  if (/(no[- ]?start|misfire|overheat|transmission|engine|stall|rough|driv)/i.test(normalized)) {
    flag("DRIVABILITY", "YELLOW", `Intake concern already mentions drivability behavior: ${intakeNote}`, "Mechanical condition");
  }
  if (/(battery|coolant|belt|hose|underhood|oil|fluid|charging|alternator|starter)/i.test(normalized)) {
    flag("UNDERHOOD_FLUIDS", "YELLOW", `Intake concern already mentions underhood, fluid, battery, or charging behavior: ${intakeNote}`, "Mechanical condition");
  }
  if (/(leak|underbody|fluid|oil|coolant|exhaust)/i.test(normalized)) {
    flag("LEAKS_UNDERBODY", "YELLOW", `Intake concern already mentions leak, underbody, fluid, or exhaust concern: ${intakeNote}`, "Underbody or leak");
  }
  if (/(window|seat|cluster|interior|radio|screen|infotainment|electrical)/i.test(normalized)) {
    flag("INTERIOR_ELECTRICAL", "YELLOW", `Intake concern already mentions interior or electrical behavior: ${intakeNote}`, "Dash / warning lights");
  }

  const highestSeverity: InitialInspectionStatus = Object.values(checklist).includes("RED") ? "RED" : Object.values(checklist).includes("YELLOW") ? "YELLOW" : "GREEN";
  return {
    checklist,
    notes,
    photoGroups: Array.from(photoGroups),
    sellabilityGate: highestSeverity === "RED" ? "REPAIR_REQUIRED_BEFORE_READY" : highestSeverity === "YELLOW" ? "DIAGNOSIS_REQUIRED" : "READY_WITH_DISCLOSURE",
  };
}

function operatingConditionSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  return ["frequency", "operability", "symptomCategory", "arrivalSource"].flatMap((key) => {
    const condition = record[key];
    if (typeof condition !== "string" && typeof condition !== "number" && typeof condition !== "boolean") return [];
    const title = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
    return [`${title}: ${String(condition).replaceAll("_", " ").toLocaleLowerCase()}`];
  });
}
function dollarsToCents(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
}
function centsFromLine(line: SimpleEstimateLine) {
  return dollarsToCents(line.labor) + dollarsToCents(line.parts) + dollarsToCents(line.other);
}
function moneyFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
const measurementUnits: Record<string, string[]> = { VOLTAGE: ["V", "mV"], CURRENT: ["A", "mA"], RESISTANCE: ["ohm", "kohm", "Mohm"], PRESSURE: ["kPa", "psi", "bar"], TEMPERATURE: ["°C", "°F"], ROTATIONAL_SPEED: ["rpm"], TIME: ["s", "ms"], FREQUENCY: ["Hz", "kHz"], PERCENT: ["%"], DISTANCE: ["mm", "in"], MASS_FLOW: ["g/s"] };

export function DiagnosticCaseWorkspace({ model }: { model: DiagnosticCaseWorkspaceModel }) {
  const router = useRouter();
  const initialInspectionSeed = useMemo(() => buildInitialInspectionSeed(model.diagnosticCase.concern), [model.diagnosticCase.concern]);
  const [owner, setOwner] = useState(model.diagnosticCase.assignedUser?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [optimisticObservations, setOptimisticObservations] = useState<Array<DiagnosticCaseWorkspaceModel["diagnosticCase"]["observations"][number]>>([]);
  const [captureMode, setCaptureMode] = useState<DiagnosticCaptureMode>("INSPECTION");
  const [observationStatement, setObservationStatement] = useState("");
  const [observationConditions, setObservationConditions] = useState("");
  const [reproductionStatus, setReproductionStatus] = useState("REPRODUCED");
  const [inspectionPrimaryObservation, setInspectionPrimaryObservation] = useState(model.diagnosticCase.concern);
  const [inspectionCode, setInspectionCode] = useState("");
  const [inspectionChecklist, setInspectionChecklist] = useState<Record<InitialInspectionKey, InitialInspectionStatus>>(() => initialInspectionSeed.checklist);
  const [inspectionNotes, setInspectionNotes] = useState<Record<InitialInspectionKey, string>>(() => initialInspectionSeed.notes);
  const [inspectionPartsNeeded, setInspectionPartsNeeded] = useState("");
  const [inspectionSellabilityGate, setInspectionSellabilityGate] = useState(initialInspectionSeed.sellabilityGate);
  const [inspectionPhotoGroups, setInspectionPhotoGroups] = useState<string[]>(() => initialInspectionSeed.photoGroups);
  const [scanModule, setScanModule] = useState("All modules");
  const [scanCodes, setScanCodes] = useState("");
  const [freezeFrame, setFreezeFrame] = useState("");
  const [measurementQuantity, setMeasurementQuantity] = useState("VOLTAGE");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("V");
  const [instrumentName, setInstrumentName] = useState("");
  const [measurementConditions, setMeasurementConditions] = useState("");
  const [evidenceObjectId, setEvidenceObjectId] = useState("");
  const [evidenceTarget, setEvidenceTarget] = useState(`CASE:${model.diagnosticCase.id}`);
  const [conclusionAction, setConclusionAction] = useState<"PROPOSE" | "CONFIRM" | "REJECT" | "SUPERSEDE" | "ABSTAIN" | "ESCALATE">("PROPOSE");
  const [conclusionHypothesisId, setConclusionHypothesisId] = useState("");
  const [causeStatement, setCauseStatement] = useState("");
  const [conclusionReason, setConclusionReason] = useState("");
  const [conclusionReviewerId, setConclusionReviewerId] = useState("");
  const [handoffType, setHandoffType] = useState<"PUBLISH_DIAGNOSIS" | "REPAIR_RECOMMENDATION" | "ESTIMATE_AUTHORIZATION" | "DISPATCH_REQUIREMENTS" | "PARTS_READINESS">("PUBLISH_DIAGNOSIS");
  const [repairRecommendation, setRepairRecommendation] = useState("");
  const [proposedCorrection, setProposedCorrection] = useState("");
  const [estimateStrategy, setEstimateStrategy] = useState<"STANDARD_SHOP_MODEL" | "THREE_TIER_LABOR_GUIDE_MODEL" | "ELITE_ENTERPRISE_MODEL">("STANDARD_SHOP_MODEL");
  const [estimateLaborRate, setEstimateLaborRate] = useState("16500");
  const [estimateAdvisorSummary, setEstimateAdvisorSummary] = useState("");
  const [estimateAssumptions, setEstimateAssumptions] = useState("Advisor must review labor guide, part pricing, taxes, and customer authorization before presentation.");
  const [simpleEstimateLines, setSimpleEstimateLines] = useState<SimpleEstimateLine[]>(() => [emptyEstimateLine()]);
  const [verificationAction, setVerificationAction] = useState<"PLAN" | "PASS" | "FAIL" | "INCONCLUSIVE" | "UNSAFE">("PLAN");
  const [verificationRepairSummary, setVerificationRepairSummary] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const item = model.diagnosticCase;
  const latestReasoning = item.reasoningEvaluations?.[0] ?? null;
  const latestAdaptiveTests = item.adaptiveTestEvaluations?.[0] ?? null;
  const latestConclusion = item.conclusionVersions?.[0] ?? null;
  const latestHandoff = item.repairHandoffVersions?.[0] ?? null;
  const publishedDiagnosis = item.repairHandoffVersions?.find((entry) => entry.handoffType === "PUBLISH_DIAGNOSIS" && entry.repairDiagnosisVersionId) ?? null;
  const latestEstimateDraft = item.estimateDraftVersions?.[0] ?? null;
  const latestVerification = item.verificationVersions?.[0] ?? null;
  const commandEnabled = model.rollout.executable;
  const observations = [...optimisticObservations, ...item.observations];
  const activeTestPlan = item.testPlans.find((plan) => plan.status === "ACTIVE") ?? item.testPlans.find((plan) => plan.status !== "SUPERSEDED") ?? null;
  const recommendedTestKey = latestAdaptiveTests?.recommendedTestKey ?? null;
  const nextTestNode = activeTestPlan?.nodes.find((node) => recommendedTestKey && (node.nodeKey === recommendedTestKey || node.definition.definitionKey === recommendedTestKey))
    ?? activeTestPlan?.nodes.find((node) => !item.testExecutions.some((execution) => execution.planNode.id === node.id && execution.state === "COMPLETED"))
    ?? null;
  const requiredTestEvidence = nextTestNode && Array.isArray(nextTestNode.definition.requiredEvidence) ? nextTestNode.definition.requiredEvidence as Array<Record<string, unknown>> : [];
  const requestedMeasurement = requiredTestEvidence.find((entry) => String(entry.type ?? "").toUpperCase() === "MEASUREMENT" && typeof entry.quantity === "string") ?? null;
  const requestedQuantity = requestedMeasurement ? String(requestedMeasurement.quantity).toUpperCase() : null;
  const requestedUnit = requestedMeasurement && typeof requestedMeasurement.normalizedUnit === "string" ? requestedMeasurement.normalizedUnit : requestedQuantity ? measurementUnits[requestedQuantity]?.[0] ?? null : null;
  const repairWorkbenchHref = `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrder.id)}`;
  const estimateWorkbenchHref = `${repairWorkbenchHref}#estimate`;
  const troubleshootingHref = `/diagnostics/cases/${encodeURIComponent(item.id)}/troubleshooting`;
  const hasScanEvidence = observations.some((fact) => fact.structuredValue && typeof fact.structuredValue === "object" && !Array.isArray(fact.structuredValue) && (fact.structuredValue as Record<string, unknown>).evidenceType === "SCAN_RESULT");
  const evidenceGuidance = observations.length === 0
    ? { mode: "OBSERVATION" as const, step: "Step 1", title: "Record what the vehicle actually did", instruction: "Describe what you saw, heard, felt, or reproduced. Do not enter a suspected part or cause.", why: "This establishes the real symptom so a code or vendor recommendation is not mistaken for a diagnosis.", action: "Record the symptom" }
    : !hasScanEvidence
      ? { mode: "SCAN" as const, step: "Step 2", title: "Add the complete scan results", instruction: "Enter the module, every current or pending code, and freeze-frame details. Do not clear codes first.", why: "Codes identify where the vehicle detected a problem; freeze frame tells us the conditions when it happened.", action: "Add scan results" }
      : nextTestNode
        ? { mode: "TEST" as const, step: "Step 3", title: `Run: ${nextTestNode.title}`, instruction: nextTestNode.definition.purpose, why: "This test was selected because its result should separate the remaining possibilities. Follow the approved procedure and record exactly what happened.", action: "Review test instructions" }
        : { mode: "TEST" as const, step: "Step 3", title: "Select the next test before measuring", instruction: "The Master Technician needs an approved test plan before asking you to measure anything.", why: "A measurement is useful only when it answers a specific diagnostic question and can be compared with a known expectation.", action: "Open test planning" };

  function focusEvidence(mode: DiagnosticCaptureMode) {
    setCaptureMode(mode);
    requestAnimationFrame(() => document.getElementById("master-technician-evidence")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openInitialInspectionForm() {
    focusEvidence("INSPECTION");
  }

  async function execute(url: string, body: Record<string, unknown>, options?: { action?: string; onSuccess?: () => void; successMessage?: string }) {
    setBusy(true); setPendingAction(options?.action ?? null); setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, expectedVersion: item.version, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "The diagnostic command could not be completed.");
      options?.onSuccess?.();
      setNotice(options?.successMessage ?? "Command recorded. Loading the authoritative case version.");
      router.refresh();
    } catch (error) { setNotice(`${error instanceof Error ? error.message : "The command failed."} Refresh before retrying if another technician changed this case.`); }
    finally { setBusy(false); setPendingAction(null); }
  }

  function splitLines(value: string) {
    return value.split(/\n+/).map((entry) => entry.trim()).filter(Boolean);
  }

  function toggleInspectionPhotoGroup(option: string) {
    setInspectionPhotoGroups((current) => current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option]);
  }

  function setInspectionItemStatus(key: InitialInspectionKey, status: InitialInspectionStatus) {
    setInspectionChecklist((current) => ({ ...current, [key]: status }));
  }

  function setInspectionItemNote(key: InitialInspectionKey, note: string) {
    setInspectionNotes((current) => ({ ...current, [key]: note }));
  }

  function updateEstimateLine(id: string, patch: Partial<SimpleEstimateLine>) {
    setSimpleEstimateLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }

  function addEstimateLine(description = "") {
    setSimpleEstimateLines((current) => [...current, emptyEstimateLine(`LINE-${current.length + 1}`, description)]);
  }

  const usableEstimateLines = simpleEstimateLines.filter((line) => line.description.trim() && centsFromLine(line) > 0);
  const simpleEstimateTotalCents = usableEstimateLines.reduce((sum, line) => sum + centsFromLine(line), 0);
  const estimateDraftExpiresAt = new Date(new Date(model.generatedAt).getTime() + 7 * 86_400_000).toISOString();
  const simpleEstimateSummary = usableEstimateLines.length
    ? usableEstimateLines.map((line) => `${line.description.trim()} (${moneyFromCents(centsFromLine(line))})`).join("; ")
    : "Advisor should price the needed repair lines before presentation.";
  const simpleEstimateDraftLines = usableEstimateLines.flatMap((line) => {
    const description = line.description.trim();
    return [
      { type: "LABOR", amount: dollarsToCents(line.labor), label: "Labor" },
      { type: "PART", amount: dollarsToCents(line.parts), label: "Parts" },
      { type: "FEE", amount: dollarsToCents(line.other), label: "Other" },
    ].filter((entry) => entry.amount > 0).map((entry) => ({
      key: `${line.id}_${entry.type}`,
      type: entry.type,
      description: `${description} — ${entry.label}`,
      quantity: 1,
      unitPriceCents: entry.amount,
      taxable: entry.type !== "LABOR",
      workTypeCode: entry.type === "LABOR" ? "GENERAL_REPAIR" : entry.type,
      laborGuideMinutes: 0,
      plannedCorrection: description,
      sourceOperationKey: null,
      advisorNote: "Simple draft line entered from the advisor estimate screen; review labor guide, parts fitment, tax, and approval before presentation.",
    }));
  });

  return <section className={styles.workspace} aria-label="Diagnostic case workspace">
    <header className={styles.caseHeader}>
      <div>
        <Link href="/diagnostics"><ArrowLeft size={15} /> Case queue</Link>
        <span className={styles.eyebrow}>Technician diagnostic workspace</span>
        <h1>{item.vehicle.label}</h1>
        <p>{item.repairOrder.repairOrderNumber} · Case {item.id.slice(-8)} · Concern v{item.concernVersion}</p>
        <nav className={styles.headerTaskLinks} aria-label="Diagnostic task shortcuts">
          <a aria-disabled={!model.permissions.canRecordEvidence} href="#master-technician-evidence" onClick={(event) => { if (!model.permissions.canRecordEvidence) { event.preventDefault(); return; } openInitialInspectionForm(); }}>Inspection checklist</a>
          <Link href={repairWorkbenchHref}>Workbench</Link>
          <Link href={estimateWorkbenchHref}>Estimate</Link>
        </nav>
      </div>
      <dl><div><dt>Status</dt><dd>{label(item.status)}</dd></div><div><dt>Risk</dt><dd>{item.riskTier}</dd></div><div><dt>Owner</dt><dd>{item.assignedUser?.name ?? "Unassigned"}</dd></div><div><dt>Record</dt><dd>Version {item.version}</dd></div></dl>
    </header>

    <nav className={styles.stages} aria-label="Diagnostic stages">{stages.map((stage, index) => { const active = stages.indexOf(item.stage) === index; const reached = stages.indexOf(item.stage) >= index; return <span aria-current={active ? "step" : undefined} className={active ? styles.activeStage : reached ? styles.reachedStage : ""} key={stage}><i>{reached ? <Check /> : index + 1}</i>{label(stage)}</span>; })}</nav>
    {!commandEnabled ? <div className={styles.hold}><ShieldAlert size={18} /><span><strong>Read-only rollout hold.</strong> Review is available; case commands are disabled ({label(model.rollout.reason)}).</span></div> : null}
    {notice ? <div className={styles.notice} role="status">{notice}<button onClick={() => router.refresh()} type="button"><RefreshCw size={14} /> Refresh</button></div> : null}

    <div className={styles.workspaceGrid}>
      <main className={styles.caseMain}>
        <section className={styles.concernCard}><header><span><ClipboardList /> Authoritative concern</span><b>{label(item.concernSource)}</b></header><h2>{item.concern}</h2><dl><div><dt>Reproduction</dt><dd>Not yet recorded</dd></div><div><dt>Operating conditions</dt><dd>{operatingConditionSummary(item.operatingConditions).length ? <ul className={styles.conditionSummary}>{operatingConditionSummary(item.operatingConditions).map((condition) => <li key={condition}>{condition}</li>)}</ul> : "No conditions recorded"}</dd></div><div><dt>Confidence</dt><dd>Not assessed</dd></div></dl></section>

        <section className={styles.evidenceFoundation} id="master-technician-evidence">
          <header><div><span className={styles.eyebrow}>Smart initial inspection</span><h2>One quick form feeds the diagnostic intelligence</h2><p>Mark green, yellow, or red. Add notes only where something is wrong. Codes, visible damage, observations, and estimate hints are saved together as one diagnostic evidence package.</p></div><span>{observations.length + item.measurements.length} saved fact(s)</span></header>
          {!model.evidenceRollout.executable ? <div className={styles.hold}><ShieldAlert size={17} /><span><strong>Evidence commands are held.</strong> Existing facts remain reviewable ({label(model.evidenceRollout.reason)}).</span></div> : null}
          <section className={styles.diagnosticIntelligenceCard}>
            <ScanLine />
            <div>
              <strong>This one form teaches the diagnostic tool what matters first.</strong>
              <p>It captures the primary concern, codes, stoplight inspection areas, obvious parts, and photo needs in one saved observation so the next diagnostic guidance can focus on the real issue.</p>
            </div>
          </section>
          {captureMode === "INSPECTION" ? <form className={`${styles.captureForm} ${styles.initialInspectionForm}`} aria-label="Initial Recon Inspection Checklist" onSubmit={(event) => {
            event.preventDefault();
            const checklistResults = initialInspectionChecklist.map((entry) => ({ ...entry, status: inspectionChecklist[entry.key], note: inspectionNotes[entry.key].trim() || null }));
            const flaggedResults = checklistResults.filter((entry) => entry.status !== "GREEN" || entry.note);
            const highestSeverity = checklistResults.some((entry) => entry.status === "RED") ? "RED" : checklistResults.some((entry) => entry.status === "YELLOW") ? "YELLOW" : "GREEN";
            const partsNeeded = splitLines(inspectionPartsNeeded);
            const primaryObservation = inspectionPrimaryObservation.trim() || item.concern;
            const statement = `Initial recon checklist ${label(highestSeverity)}. Primary observation: ${primaryObservation}. Diagnostic codes: ${inspectionCode.trim() || "not recorded"}. ${flaggedResults.length ? flaggedResults.map((entry) => `${entry.label}: ${initialInspectionStatusCopy[entry.status].meaning}${entry.note ? ` (${entry.note})` : ""}`).join(" · ") : "All checklist areas marked green with no issue observed."} Obvious parts / estimate hints: ${partsNeeded.length ? partsNeeded.join("; ") : "not recorded"}. Sellability gate: ${label(inspectionSellabilityGate)}. Photo evidence groups: ${inspectionPhotoGroups.length ? inspectionPhotoGroups.join(", ") : "not selected"}.`;
            void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/observations`, {
              factClass: "OBSERVED",
              independenceGroup: "TECHNICIAN_DIRECT",
              operatingConditions: item.operatingConditions,
              qualityReasonCode: "DATA_VALID",
              qualityStatus: "VALID",
              rawSource: { kind: "INITIAL_RECON_INSPECTION_FORM" },
              reason: "Recorded initial recon inspection observation in the diagnostic case.",
              reliability: "UNASSESSED",
              source: "TECHNICIAN",
              statement,
              structuredValue: {
                evidenceType: "INITIAL_RECON_INSPECTION_CHECKLIST",
                primaryObservation,
                diagnosticCodes: inspectionCode.trim() || null,
                checklistResults,
                highestSeverity,
                obviousPartsNeeded: partsNeeded,
                sellabilityGate: inspectionSellabilityGate,
                photoEvidenceGroups: inspectionPhotoGroups,
              },
            }, {
              action: "INITIAL_RECON_INSPECTION",
              onSuccess: () => {
                setInspectionPrimaryObservation(item.concern);
                setInspectionCode("");
                setInspectionChecklist(initialInspectionSeed.checklist);
                setInspectionNotes(initialInspectionSeed.notes);
                setInspectionPartsNeeded("");
                setInspectionSellabilityGate(initialInspectionSeed.sellabilityGate);
                setInspectionPhotoGroups(initialInspectionSeed.photoGroups);
                setCaptureMode("INSPECTION");
              },
              successMessage: "Initial inspection checklist saved to the diagnostic case.",
            });
          }}>
            <div className={styles.formIntroduction}><strong>Initial QC inspection checklist</strong><p>One short inspection package: confirm the concern, mark the vehicle areas, add codes or obvious estimate hints only when they help, then save.</p></div>
            <label className={styles.wideField}><span>Primary concern / observation</span><textarea maxLength={700} onChange={(event) => setInspectionPrimaryObservation(event.target.value)} placeholder="What did staff actually see, hear, feel, smell, or confirm?" required rows={3} value={inspectionPrimaryObservation} /><small>This is the concern the diagnostic intelligence should focus on first.</small></label>
            <label className={styles.wideField}><span>Diagnostic code / module notes</span><input maxLength={220} onChange={(event) => setInspectionCode(event.target.value)} placeholder="Example: ABS C0035 current; PCM P0300 history; or no codes checked yet" value={inspectionCode} /><small>Optional. Leave blank if codes were not checked yet.</small></label>
            <section className={styles.inspectionChecklistGrid} aria-label="Initial inspection checklist">
              {initialInspectionChecklist.map((entry) => <article className={styles.inspectionChecklistItem} data-status={inspectionChecklist[entry.key].toLocaleLowerCase()} key={entry.key}>
                <header>
                  <div><strong>{entry.label}</strong><small>{entry.help}</small></div>
                  <span>{initialInspectionStatusCopy[inspectionChecklist[entry.key]].label}</span>
                </header>
                <fieldset className={styles.stoplightGroup}>
                  <legend>{entry.label} status</legend>
                  {(Object.keys(initialInspectionStatusCopy) as InitialInspectionStatus[]).map((status) => <label data-status={status.toLocaleLowerCase()} key={status}>
                    <input checked={inspectionChecklist[entry.key] === status} name={`inspection-${entry.key}`} onChange={() => setInspectionItemStatus(entry.key, status)} type="radio" value={status} />
                    <span>{initialInspectionStatusCopy[status].label}</span>
                  </label>)}
                </fieldset>
                {inspectionChecklist[entry.key] === "GREEN" && !inspectionNotes[entry.key] ? <small className={styles.greenNoteHint}>No note needed when green.</small> : <label className={styles.quickNote}><span>Quick note</span><input maxLength={220} onChange={(event) => setInspectionItemNote(entry.key, event.target.value)} placeholder="What did staff observe?" value={inspectionNotes[entry.key]} /></label>}
              </article>)}
            </section>
            <fieldset className={styles.inspectionPhotoChecklist}>
              <legend><Camera /> Photo evidence groups</legend>
              {inspectionPhotoEvidenceOptions.map((option) => <label key={option}><input checked={inspectionPhotoGroups.includes(option)} onChange={() => toggleInspectionPhotoGroup(option)} type="checkbox" /> {option}</label>)}
              <small>Photo upload is still a separate evidence step; this records which photo groups staff should attach or verify.</small>
            </fieldset>
            <label className={styles.wideField}><span>Obvious parts needed / estimate hints</span><textarea maxLength={700} onChange={(event) => setInspectionPartsNeeded(event.target.value)} placeholder="Example: Rear bumper cover; front brake pads/rotors; ABS sensor diagnosis needed. This does not order parts." rows={3} value={inspectionPartsNeeded} /><small>Use this for visible or obvious estimate hints only. Parts ordering and approval still happen later.</small></label>
            <label><span>Sellability / readiness gate</span><select onChange={(event) => setInspectionSellabilityGate(event.target.value)} value={inspectionSellabilityGate}><option value="REPAIR_REQUIRED_BEFORE_READY">Repair required before ready</option><option value="DIAGNOSIS_REQUIRED">Diagnosis required before estimate</option><option value="COSMETIC_REVIEW">Cosmetic review only</option><option value="READY_WITH_DISCLOSURE">Ready with disclosure</option></select></label>
            <div className={styles.inspectionSummary}><ScanLine /><span><strong>Saved as diagnostic evidence</strong><small>This creates a technician observation tied to this case, keeping intake facts, diagnosis, estimate, repair, and final QC connected.</small></span></div>
            <button disabled={busy || !model.evidenceRollout.executable} type="submit"><CarFront /> Save checklist observation</button>
            <nav className={styles.inspectionNextSteps} aria-label="After inspection">
              <Link href="/diagnostics">Back to intake / case queue</Link>
              <Link href={estimateWorkbenchHref}>Continue to estimate</Link>
              <Link href={repairWorkbenchHref}>Open workbench</Link>
              <Link href={troubleshootingHref}>Deep troubleshooting</Link>
            </nav>
          </form> : null}
          {captureMode === "OBSERVATION" ? <form className={`${styles.captureForm} ${styles.observationForm}`} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/observations`, { factClass: "OBSERVED", independenceGroup: "TECHNICIAN_DIRECT", operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", rawSource: { kind: "MANUAL_ENTRY" }, reason: "Recorded direct technician observation in the diagnostic case.", reliability: "UNASSESSED", source: "TECHNICIAN", statement: `${observationStatement} Conditions: ${observationConditions}. Reproduction: ${label(reproductionStatus)}.`, structuredValue: { evidenceType: "DIRECT_OBSERVATION", symptom: observationStatement, conditions: observationConditions, reproductionStatus } }); }}>
            <div className={styles.formIntroduction}><strong>Record the symptom</strong><p>Example: “The engine rattles for two seconds during the first cold start, then runs normally.”</p></div>
            <label className={styles.wideField}><span>What did you directly observe?</span><textarea maxLength={1400} onChange={(event) => setObservationStatement(event.target.value)} placeholder="Describe the sound, warning light, behavior, smell, leak, or symptom—without guessing the cause." required rows={7} value={observationStatement} /><small>This becomes the symptom we are trying to reproduce and explain.</small></label>
            <label className={styles.wideField}><span>When and under what conditions?</span><textarea maxLength={500} onChange={(event) => setObservationConditions(event.target.value)} placeholder="Example: Cold start after sitting overnight; outside temperature about 40°F." required rows={3} value={observationConditions} /><small>Conditions make the symptom repeatable and help compare future test results.</small></label>
            <label><span>Could you reproduce it?</span><select onChange={(event) => setReproductionStatus(event.target.value)} value={reproductionStatus}><option value="REPRODUCED">Yes, reproduced</option><option value="INTERMITTENT">Intermittent</option><option value="NOT_REPRODUCED">No, not reproduced</option><option value="UNSAFE_TO_REPRODUCE">Unsafe to reproduce</option></select></label>
            <button disabled={busy || !model.evidenceRollout.executable || observationStatement.trim().length < 3 || observationConditions.trim().length < 3} type="submit"><Plus /> Save symptom</button>
          </form> : null}
          {captureMode === "SCAN" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); const statement = `${scanModule}: ${scanCodes}${freezeFrame.trim() ? `. Freeze frame: ${freezeFrame}` : ". No freeze-frame details entered."}`; void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/observations`, { factClass: "OBSERVED", independenceGroup: "SCAN_TOOL", operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", rawSource: { kind: "SCAN_TOOL_MANUAL_ENTRY" }, reason: "Recorded scan-tool codes and freeze-frame evidence in the diagnostic case.", reliability: "UNASSESSED", source: "TEST_EQUIPMENT", statement, structuredValue: { evidenceType: "SCAN_RESULT", module: scanModule, codes: scanCodes, freezeFrame: freezeFrame || null } }, { action: "SCAN_RESULT", onSuccess: () => { const observedAt = new Date().toISOString(); setOptimisticObservations((current) => [{ id: `optimistic-scan-${observedAt}`, statement, factClass: "OBSERVED", source: "TEST_EQUIPMENT", reliability: "UNASSESSED", qualityStatus: "VALID", correctedById: null, authorUser: { id: model.viewer.id, name: model.viewer.name }, observedAt, structuredValue: { evidenceType: "SCAN_RESULT", module: scanModule, codes: scanCodes, freezeFrame: freezeFrame || null } } as unknown as DiagnosticCaseWorkspaceModel["diagnosticCase"]["observations"][number], ...current]); setScanModule("All modules"); setScanCodes(""); setFreezeFrame(""); setCaptureMode("NONE"); requestAnimationFrame(() => document.getElementById("diagnostic-fact-columns")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, successMessage: "Scan results saved. Loading the authoritative case version." }); }}>
            <div className={styles.formIntroduction}><strong>Add the complete scan results</strong><p>Record current, pending, permanent, and history codes before clearing anything.</p></div>
            <label><span>Module scanned</span><input maxLength={100} onChange={(event) => setScanModule(event.target.value)} placeholder="Example: PCM or All modules" required value={scanModule} /><small>Identifies which controller reported the concern.</small></label>
            <label className={styles.wideField}><span>Codes and status</span><textarea maxLength={900} onChange={(event) => setScanCodes(event.target.value)} placeholder="Example: PCM P0016 current; P0300 history. ABS and TCM: no codes." required rows={2} value={scanCodes} /><small>Include whether each code is current, pending, permanent, or history.</small></label>
            <label className={styles.wideField}><span>Freeze-frame or captured conditions</span><textarea maxLength={700} onChange={(event) => setFreezeFrame(event.target.value)} placeholder="Example: 1,120 rpm, coolant 72°F, vehicle speed 0 mph, commanded intake cam 0°, actual 18°." rows={2} value={freezeFrame} /><small>This shows what the vehicle was doing when the fault was detected.</small></label>
            <button disabled={busy || !model.evidenceRollout.executable || scanModule.trim().length < 2 || scanCodes.trim().length < 3} type="submit">{busy && pendingAction === "SCAN_RESULT" ? "Saving scan results..." : <><Plus /> Save scan results</>}</button>
          </form> : null}
          {captureMode === "TEST" ? <section className={styles.guidedTest}>
            {nextTestNode ? <><header><div><span>Master Technician assigned test</span><h3>{nextTestNode.title}</h3><p>{nextTestNode.definition.purpose}</p></div><b>{nextTestNode.definition.estimatedMinutes} min · {label(nextTestNode.definition.riskTier)}</b></header>
              <div className={styles.testPreparation}><section><strong>Tool needed</strong><p>{Array.isArray(nextTestNode.definition.tools) && nextTestNode.definition.tools.length ? nextTestNode.definition.tools.map(String).join(", ") : "Use the tool specified by the approved service procedure."}</p></section><section><strong>Before you begin</strong><p>{Array.isArray(nextTestNode.definition.prerequisites) && nextTestNode.definition.prerequisites.length ? nextTestNode.definition.prerequisites.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).join(" · ") : "Confirm the vehicle is stable and safe to test."}</p></section><section><strong>Safety / stop conditions</strong><p>{Array.isArray(nextTestNode.definition.hazards) && nextTestNode.definition.hazards.length ? nextTestNode.definition.hazards.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).join(" · ") : "Stop if the approved procedure cannot be followed or the vehicle becomes unsafe."}</p></section></div>
              <section className={styles.testSteps}><strong>Perform the test</strong><ol>{Array.isArray(nextTestNode.definition.procedure) && nextTestNode.definition.procedure.length ? nextTestNode.definition.procedure.map((entry, index) => { const instruction = typeof entry === "string" ? entry : entry && typeof entry === "object" && "instruction" in entry ? String((entry as Record<string, unknown>).instruction) : JSON.stringify(entry); return <li key={`${nextTestNode.id}-${index}`}>{instruction}</li>; }) : <li>Open the approved service procedure before performing this test.</li>}</ol></section>
              {requestedQuantity && requestedUnit ? <form className={styles.guidedResultForm} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/measurements`, { independenceGroup: `INSTRUMENT:${instrumentName.trim().toUpperCase()}`, instrument: { name: instrumentName, calibrationStatus: "UNKNOWN" }, operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", quantity: requestedQuantity, rawSource: { kind: "MASTER_TECHNICIAN_ASSIGNED_TEST", testPlanNodeId: nextTestNode.id }, reason: "Recorded the result requested by the assigned Master Technician test.", reliability: "UNASSESSED", setup: { entry: "ASSIGNED_TEST", conditions: measurementConditions, testPlanNodeId: nextTestNode.id }, source: "TEST_EQUIPMENT", tolerance: {}, unit: requestedUnit, value: measurementValue }); }}><div><strong>Enter only the requested result</strong><p>{label(requestedQuantity)} in {requestedUnit}{requestedMeasurement?.referenceMinimum != null || requestedMeasurement?.referenceMaximum != null ? ` · expected ${String(requestedMeasurement.referenceMinimum ?? "—")} to ${String(requestedMeasurement.referenceMaximum ?? "—")} ${requestedUnit}` : ""}</p></div><label><span>Measured result</span><input inputMode="decimal" onChange={(event) => setMeasurementValue(event.target.value)} required value={measurementValue} /></label><label><span>Tool used</span><input onChange={(event) => setInstrumentName(event.target.value)} placeholder="Exact tool used" required value={instrumentName} /></label><label className={styles.wideField}><span>Conditions during test</span><textarea onChange={(event) => setMeasurementConditions(event.target.value)} placeholder="Confirm how the vehicle and tool were configured during the test." required rows={2} value={measurementConditions} /></label><button disabled={busy || !measurementValue || !instrumentName.trim() || measurementConditions.trim().length < 3} type="submit">Save requested result</button></form> : <div className={styles.testExecutionHandoff}><strong>This test does not request a simple numeric measurement.</strong><p>Use the troubleshooting console to start the test and record its required structured result.</p><Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}/troubleshooting`}>Open guided test execution</Link></div>}
            </> : <div className={styles.noAssignedTest}><Gauge /><h3>No instructed test has been assigned yet</h3><p>The next diagnostic step has not been selected yet. Review the current evidence and choose the test that best separates the remaining possibilities before recording a result.</p><Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}/troubleshooting`}>Open Master Technician test planning</Link></div>}
          </section> : null}
          {captureMode === "PRIOR_MEASUREMENT" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/measurements`, { independenceGroup: `INSTRUMENT:${instrumentName.trim().toUpperCase()}`, instrument: { name: instrumentName, calibrationStatus: "UNKNOWN" }, operatingConditions: item.operatingConditions, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", quantity: measurementQuantity, rawSource: { kind: "PRIOR_TEST_MANUAL_ENTRY" }, reason: "Recorded a test result that was completed before the current Master Technician instruction.", reliability: "UNASSESSED", setup: { entry: "PRIOR_TEST", conditions: measurementConditions }, source: "TEST_EQUIPMENT", tolerance: {}, unit: measurementUnit, value: measurementValue }); }}>
            <div className={styles.formIntroduction}><strong>Record a test that was already performed</strong><p>Use this only for an existing technician or vendor result. Include enough detail for another technician to repeat it.</p></div>
            <label><span>What was measured?</span><select onChange={(event) => { const quantity = event.target.value; setMeasurementQuantity(quantity); setMeasurementUnit(measurementUnits[quantity][0]); }} value={measurementQuantity}>{Object.keys(measurementUnits).map((value) => <option key={value}>{label(value)}</option>)}</select></label>
            <label><span>Measured value</span><input inputMode="decimal" onChange={(event) => setMeasurementValue(event.target.value)} placeholder="Example: 9.4" required value={measurementValue} /></label>
            <label><span>Unit</span><select onChange={(event) => setMeasurementUnit(event.target.value)} value={measurementUnit}>{measurementUnits[measurementQuantity].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label><span>Tool used</span><input maxLength={120} onChange={(event) => setInstrumentName(event.target.value)} placeholder="DVOM, scan tool, scope, gauge…" required value={instrumentName} /></label>
            <label className={styles.wideField}><span>Conditions during the test</span><input maxLength={500} onChange={(event) => setMeasurementConditions(event.target.value)} placeholder="Example: Engine cranking; meter connected directly at battery posts." required value={measurementConditions} /><small>This makes the result repeatable and tells us whether it can be compared with the specification.</small></label>
            <button disabled={busy || !model.evidenceRollout.executable || !measurementValue || !instrumentName.trim() || measurementConditions.trim().length < 3} type="submit"><Plus /> Save prior result</button>
          </form> : null}
          <details className={styles.advancedEvidence}><summary>Existing tests, photos, scan reports, and vendor documents</summary><p>Use these options only when the work or source file already exists.</p><div><button disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "PRIOR_MEASUREMENT" ? "NONE" : "PRIOR_MEASUREMENT")} type="button"><Ruler /> Record a test already performed</button><button disabled={!model.permissions.canLinkEvidence} onClick={() => setCaptureMode(captureMode === "LINK" ? "NONE" : "LINK")} type="button"><Link2 /> Choose an existing file</button></div></details>
          {captureMode === "LINK" ? <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); const separator = evidenceTarget.indexOf(":"); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/evidence`, { evidenceObjectId, purpose: "Supports diagnostic fact review and reproducibility.", reason: "Linked governed Vehicle Evidence to the diagnostic case record.", relationship: "SUPPORTS", subjectType: evidenceTarget.slice(0, separator), subjectId: evidenceTarget.slice(separator + 1) }); }}>
            <label className={styles.wideField}><span>Vehicle Evidence object</span><select onChange={(event) => setEvidenceObjectId(event.target.value)} required value={evidenceObjectId}><option value="">Select an available, malware-clean object</option>{model.evidenceCandidates.map((candidate) => <option disabled={!candidate.linkable} key={candidate.id} value={candidate.id}>{candidate.fileName} · {label(candidate.accessLevel)} · {candidate.linkable ? "Available" : label(candidate.status)}</option>)}</select><small>{model.evidenceCandidates.length ? "Restricted objects appear only with explicit restricted-evidence access." : "No permitted Vehicle Evidence objects are available for this vehicle."}</small></label>
            <label className={styles.wideField}><span>Link to</span><select onChange={(event) => setEvidenceTarget(event.target.value)} value={evidenceTarget}><option value={`CASE:${item.id}`}>Diagnostic case</option>{item.concernVersionId ? <option value={`CONCERN:${item.concernVersionId}`}>Current concern</option> : null}{item.observations.map((fact) => <option key={fact.id} value={`OBSERVATION:${fact.id}`}>Observation · {fact.statement.slice(0, 70)}</option>)}{item.measurements.map((fact) => <option key={fact.id} value={`MEASUREMENT:${fact.id}`}>Measurement · {fact.quantity} {fact.value} {fact.unit}</option>)}{item.testExecutions.map((execution) => <option key={execution.id} value={`TEST_EXECUTION:${execution.id}`}>Test · {execution.planNode.title} · {label(execution.state)}</option>)}</select></label>
            <button disabled={busy || !model.evidenceRollout.executable || !evidenceObjectId.trim()} type="submit"><Link2 /> Link governed evidence</button>
          </form> : null}
          <div className={styles.factColumns} id="diagnostic-fact-columns">
            <section><header><Eye /><h3>What the vehicle did</h3><span>{observations.length}</span></header>{observations.length ? observations.map((fact) => <article className={fact.correctedById ? styles.supersededFact : ""} key={fact.id}><div><strong>{fact.statement}</strong><small>{label(fact.factClass)} · {label(fact.source)} · {label(fact.reliability)}</small></div><span>{label(fact.qualityStatus)}</span><footer>{fact.authorUser.name} · {new Date(fact.observedAt).toLocaleString()}{fact.correctedById ? " · Corrected" : ""}</footer></article>) : <div className={styles.moduleEmpty}><p>No symptom or scan result has been recorded.</p><small>Start by documenting what the vehicle actually did.</small></div>}</section>
            <section><header><Ruler /><h3>What testing proved</h3><span>{item.measurements.length}</span></header>{item.measurements.length ? item.measurements.map((fact) => <article className={fact.supersededById ? styles.supersededFact : ""} key={fact.id}><div><strong>{label(fact.quantity)}: {fact.value} {fact.unit}</strong><small>Normalized {fact.normalizedValue} {fact.normalizedUnit} · {label(fact.plausibilityStatus)}</small></div><span>{label(fact.qualityStatus)}</span><footer>{fact.authorUser.name} · {new Date(fact.measuredAt).toLocaleString()}{fact.supersededById ? " · Superseded" : ""}</footer></article>) : <div className={styles.moduleEmpty}><p>No objective test result has been recorded.</p><small>Enter a measurement after the Master Technician recommends a test.</small></div>}</section>
          </div>
          {item.evidenceLinks.length ? <section className={styles.attachments}><header><Link2 /><h3>Photos and reports</h3><span>{item.evidenceLinks.length}</span></header>{item.evidenceLinks.map((link) => <article key={link.id}><div><strong>{link.evidence.status === "DELETED" ? "Deleted evidence object" : link.evidence.fileName}</strong><small>{label(link.subjectType)} · {label(link.relationship)} · SHA-256 {link.evidence.checksumSha256.slice(0, 12)}…</small></div><span>{label(link.evidence.accessLevel)} · {label(link.evidence.status)}</span>{link.evidence.downloadUrl ? <a href={link.evidence.downloadUrl}>Open</a> : <b>Unavailable</b>}</article>)}</section> : null}
        </section>

        <DiagnosticEvidenceReview model={model} />

        <div className={styles.evidenceGrid}><section><header><Stethoscope /><h2>Hypotheses</h2><span>{latestReasoning ? `${latestReasoning.hypotheses.length} candidates` : "Not assessed"}</span></header>{latestReasoning ? <div className={styles.reasoningList}>{latestReasoning.hypotheses.map((hypothesis) => <article key={hypothesis.id}><div><strong>{hypothesis.hypothesisKey.replaceAll("HYP_", "").replaceAll("_", " ")}</strong><small>{label(hypothesis.status)} · {label(hypothesis.causalState)} · rank {hypothesis.rank}</small></div><span>{(hypothesis.supportingEvidenceKeys as string[]).length} support · {(hypothesis.contradictingEvidenceKeys as string[]).length} contradiction</span></article>)}</div> : <div className={styles.moduleEmpty}><p>No governed reasoning evaluation is available.</p><small>Facts do not automatically become a diagnosis.</small></div>}</section><section><header><Gauge /><h2>Next test</h2><span>{latestAdaptiveTests?.recommendedTestKey ?? "Not ranked"}</span></header>{latestAdaptiveTests ? <div className={styles.reasoningList}><article><div><strong>{latestAdaptiveTests.recommendedTestKey ?? "Engine abstained"}</strong><small>{latestAdaptiveTests.optimizationPolicyVersion} · {latestAdaptiveTests.abstentionRequired ? "No eligible test" : "Recommended eligible discriminator"}</small></div><span>{(latestAdaptiveTests.alternatives as string[]).length} alternatives</span></article>{(latestAdaptiveTests.excludedTests as Array<{ testKey: string; reasonCodes: string[] }>).slice(0, 3).map((test) => <article key={test.testKey}><div><strong>{test.testKey}</strong><small>Excluded · {test.reasonCodes.join(" · ")}</small></div></article>)}</div> : <div className={styles.moduleEmpty}><p>No adaptive test evaluation has consumed the current hypotheses.</p><small>Only eligible tests may be recommended or selected.</small></div>}</section></div>

        <section className={styles.conclusionPanel}><header><div><span className={styles.eyebrow}>DGN-026 · Human technical authority</span><h2>Diagnostic conclusion</h2><p>Reasoning proposes possibilities. A qualified person must make and own the conclusion.</p></div><span>{latestConclusion ? label(latestConclusion.status) : "No decision"}</span></header>{latestConclusion ? <article className={styles.conclusionRecord}><strong>{latestConclusion.causeStatement ?? label(latestConclusion.status)}</strong><p>{label(latestConclusion.action)} by {latestConclusion.authorUser.name} · uncertainty {label(latestConclusion.uncertainty)}</p><small>Policy {latestConclusion.policyVersion} · checksum {latestConclusion.conclusionChecksum.slice(0, 12)}…{latestConclusion.reviewerUser ? ` · independently reviewed by ${latestConclusion.reviewerUser.name}` : ""}</small></article> : null}
          <form className={styles.conclusionForm} onSubmit={(event) => { event.preventDefault(); const hypotheses = latestReasoning?.hypotheses ?? []; const selected = hypotheses.find((entry) => entry.id === conclusionHypothesisId); const evidenceBasisKeys = selected ? selected.supportingEvidenceKeys as string[] : []; const addressedAlternativeHypothesisKeys = hypotheses.filter((entry) => entry.id !== conclusionHypothesisId && !["CONTRADICTED", "OUT_OF_MODEL"].includes(entry.status)).map((entry) => entry.hypothesisKey); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/conclusions`, { action: conclusionAction, hypothesisId: conclusionHypothesisId || null, causeStatement: causeStatement || null, uncertainty: conclusionAction === "ABSTAIN" || conclusionAction === "ESCALATE" ? "UNKNOWN" : "MEDIUM", evidenceBasisKeys, addressedAlternativeHypothesisKeys, limitations: conclusionReason ? [conclusionReason] : [], reviewerUserId: conclusionReviewerId || null, supersedesId: latestConclusion?.id ?? null, abstentionDisposition: conclusionAction === "ABSTAIN" ? "INCONCLUSIVE" : undefined, reason: conclusionReason }); }}>
            <label><span>Decision</span><select onChange={(event) => setConclusionAction(event.target.value as typeof conclusionAction)} value={conclusionAction}><option value="PROPOSE">Propose cause</option><option value="CONFIRM">Confirm proposed cause</option><option value="REJECT">Reject proposal</option><option value="SUPERSEDE">Supersede confirmed cause</option><option value="ABSTAIN">Inconclusive / abstain</option><option value="ESCALATE">Escalate</option></select></label>
            <label><span>Hypothesis</span><select disabled={["ABSTAIN", "ESCALATE", "REJECT"].includes(conclusionAction)} onChange={(event) => setConclusionHypothesisId(event.target.value)} value={conclusionHypothesisId}><option value="">Select from current reasoning</option>{latestReasoning?.hypotheses.filter((entry) => !["CONTRADICTED", "OUT_OF_MODEL"].includes(entry.status)).map((entry) => <option key={entry.id} value={entry.id}>{entry.hypothesisKey} · {label(entry.status)}</option>)}</select></label>
            <label className={styles.wideField}><span>Cause statement</span><textarea disabled={["ABSTAIN", "ESCALATE", "REJECT"].includes(conclusionAction)} onChange={(event) => setCauseStatement(event.target.value)} placeholder="State the physical or logical cause supported by evidence—not a trouble code or replacement instruction." rows={2} value={causeStatement} /></label>
            <label className={styles.wideField}><span>Technical rationale or limitation</span><textarea maxLength={500} onChange={(event) => setConclusionReason(event.target.value)} placeholder="Explain the decision, remaining limitation, or escalation question." required rows={2} value={conclusionReason} /></label>
            {["CONFIRM", "SUPERSEDE"].includes(conclusionAction) && item.riskTier === "R3" ? <label><span>Independent reviewer</span><select onChange={(event) => setConclusionReviewerId(event.target.value)} value={conclusionReviewerId}><option value="">Select a different qualified reviewer</option>{model.assignableUsers.filter((entry) => entry.id !== model.viewer.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label> : null}
            <button disabled={busy || !model.reasoningRollout?.executable || !model.permissions.canProposeConclusion || conclusionReason.trim().length < 10 || (!["ABSTAIN", "ESCALATE", "REJECT"].includes(conclusionAction) && (!conclusionHypothesisId || causeStatement.trim().length < 10)) || (["CONFIRM", "SUPERSEDE"].includes(conclusionAction) && !model.permissions.canConfirmConclusion)} type="submit">Record governed decision</button>
          </form>
        </section>

        <section className={styles.handoffPanel}><header><div><span className={styles.eyebrow}>DGN-028-032 · Repair handoff</span><h2>Controlled repair package</h2><p>Publish the confirmed diagnosis, then hand recommendation, estimate, dispatch, and parts requirements to their owning consoles.</p></div><span>{latestHandoff ? label(latestHandoff.status) : "Not handed off"}</span></header>
          {latestHandoff ? <article className={styles.handoffRecord}><PackageCheck /><div><strong>{label(latestHandoff.handoffType)}</strong><p>{latestHandoff.recommendation}</p><small>Handoff v{latestHandoff.version} · checksum {latestHandoff.handoffChecksum.slice(0, 12)}…{latestHandoff.repairDiagnosisVersion ? ` · repair diagnosis v${latestHandoff.repairDiagnosisVersion}` : ""}</small></div></article> : null}
          {!model.publishingRollout?.executable ? <div className={styles.hold}><ShieldAlert size={17} /><span><strong>Publishing commands are held.</strong> Review is available ({label(model.publishingRollout?.reason ?? "FEATURE_DISABLED")}).</span></div> : null}
          <form className={styles.handoffForm} onSubmit={(event) => { event.preventDefault(); const operationKey = (latestConclusion?.hypothesisId ?? "confirmed-cause").replaceAll("_", "-").toLocaleLowerCase(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/repair-handoffs`, { handoffType, conclusionId: latestConclusion?.id ?? null, recommendation: repairRecommendation, proposedCorrection, operations: [{ key: operationKey, description: proposedCorrection, workTypeCode: "DIAGNOSTIC_REPAIR", minimumMinutes: 30, likelyMinutes: 60, maximumMinutes: 120, requiredSkills: ["DIAGNOSTIC_REPAIR"], requiredCertifications: [], bayRequirements: ["SERVICE_BAY"], toolRequirements: ["STANDARD_REPAIR_TOOLS"], parts: [], hazards: item.riskTier === "R3" ? ["HIGH_RISK_REVIEW"] : [], procedures: ["Follow approved service information and shop repair procedure."], qcChecks: ["Verify the original concern no longer reproduces after repair."] }], advisorReviewRequired: true, customerAuthorizationRequired: true, changedScopeReturnPath: "Return changed scope to Diagnostics for superseding conclusion or limitation.", resourceRequirementOnly: true, demandSignalOnly: true, purchaseMutationProhibited: true, sourceVersions: latestConclusion?.sourceVersions ?? [], supersedesId: latestHandoff?.id ?? null, reason: `Record ${label(handoffType)} handoff from confirmed diagnostic conclusion.` }); }}>
            <label><span>Handoff</span><select onChange={(event) => setHandoffType(event.target.value as typeof handoffType)} value={handoffType}><option value="PUBLISH_DIAGNOSIS">Publish repair diagnosis</option><option value="REPAIR_RECOMMENDATION">Repair recommendation</option><option value="ESTIMATE_AUTHORIZATION">Estimate / authorization</option><option value="DISPATCH_REQUIREMENTS">Dispatch requirements</option><option value="PARTS_READINESS">Parts readiness</option></select></label>
            <label className={styles.wideField}><span>Recommendation</span><textarea onChange={(event) => setRepairRecommendation(event.target.value)} placeholder="Summarize what repair path should be reviewed next." required rows={2} value={repairRecommendation} /></label>
            <label className={styles.wideField}><span>Proposed correction</span><textarea onChange={(event) => setProposedCorrection(event.target.value)} placeholder="Describe the correction package without creating an estimate, job, or parts order." required rows={2} value={proposedCorrection} /></label>
            <button disabled={busy || !model.publishingRollout?.executable || !model.permissions.canRepairHandoff || latestConclusion?.status !== "CONFIRMED" || repairRecommendation.trim().length < 10 || proposedCorrection.trim().length < 10 || (handoffType !== "PUBLISH_DIAGNOSIS" && !publishedDiagnosis)} type="submit">Record repair handoff</button>
          </form>
        </section>

        <section className={styles.estimatePanel}><header><div><span className={styles.eyebrow}>Estimate draft</span><h2>What needs to be fixed, and what will it cost?</h2><p>Build simple repair lines first. The full Labor Guide stays available when staff need deeper research.</p></div><span>{latestEstimateDraft ? label(latestEstimateDraft.status) : "No draft"}</span></header>
          {latestEstimateDraft ? <article className={styles.handoffRecord}><ClipboardList /><div><strong>{label(latestEstimateDraft.selectedStrategy)}</strong><p>{latestEstimateDraft.advisorSummary}</p><small>Draft v{latestEstimateDraft.version} · repair diagnosis v{latestEstimateDraft.repairDiagnosisVersion} · checksum {latestEstimateDraft.draftChecksum.slice(0, 12)}…</small></div></article> : null}
          <form className={styles.simpleEstimateForm} onSubmit={(event) => { event.preventDefault(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/advisor-estimate`, { repairHandoffId: publishedDiagnosis?.id ?? null, selectedStrategy: estimateStrategy, advisorSummary: estimateAdvisorSummary.trim() || `Draft estimate lines: ${simpleEstimateSummary}`, customerConcernSummary: item.concern, customerCauseSummary: latestConclusion?.causeStatement ?? "Diagnosis is not fully confirmed yet; this estimate remains a draft and cannot be presented.", customerCorrectionSummary: publishedDiagnosis?.proposedCorrection ?? simpleEstimateSummary, assumptions: estimateAssumptions.split(/\n+/).map((entry) => entry.trim()).filter(Boolean), notIncluded: ["Final taxes, fees, discounts, parts availability, customer authorization, job creation, and dispatch remain owned by their existing authorities."], draftLines: simpleEstimateDraftLines, laborRateCents: Number(estimateLaborRate), partPlaceholderUnitCents: 0, taxBoundary: "Existing Repair Estimate authority must calculate final tax before presentation.", expiresAt: estimateDraftExpiresAt, supersedesId: latestEstimateDraft?.id ?? null, reason: "Create a simple advisor repair-line estimate draft. Presentation remains gated by diagnosis, approval, tax, and estimate authority." }); }}>
            <div className={styles.simpleEstimateToolbar}>
              <Link href="/diagnostics/labor-guide">Open full Labor Guide</Link>
              <button onClick={() => addEstimateLine(inspectionPartsNeeded.split(/\n+/).map((entry) => entry.trim()).filter(Boolean)[0] ?? publishedDiagnosis?.proposedCorrection ?? "")} type="button">Use inspection findings</button>
              <button onClick={() => addEstimateLine()} type="button">Add repair line</button>
            </div>
            <div className={styles.simpleEstimateLines} aria-label="Simple estimate lines">
              {simpleEstimateLines.map((line, index) => <article key={line.id}>
                <b>{index + 1}</b>
                <label className={styles.simpleEstimateDescription}><span>What needs to be fixed?</span><input onChange={(event) => updateEstimateLine(line.id, { description: event.target.value })} placeholder="Example: Replace front bumper cover" value={line.description} /></label>
                <label><span>Labor $</span><input inputMode="decimal" onChange={(event) => updateEstimateLine(line.id, { labor: event.target.value })} placeholder="0.00" value={line.labor} /></label>
                <label><span>Parts $</span><input inputMode="decimal" onChange={(event) => updateEstimateLine(line.id, { parts: event.target.value })} placeholder="0.00" value={line.parts} /></label>
                <label><span>Other $</span><input inputMode="decimal" onChange={(event) => updateEstimateLine(line.id, { other: event.target.value })} placeholder="0.00" value={line.other} /></label>
                <strong>{moneyFromCents(centsFromLine(line))}</strong>
              </article>)}
            </div>
            <section className={styles.simpleEstimateTotal}><span>Draft total</span><strong>{moneyFromCents(simpleEstimateTotalCents)}</strong><small>You can save this draft now. Presenting/sending still requires the evidence-backed diagnosis and approval gate.</small></section>
            <label className={styles.wideField}><span>Advisor note</span><textarea onChange={(event) => setEstimateAdvisorSummary(event.target.value)} placeholder="Optional note for the advisor or manager before presentation." rows={2} value={estimateAdvisorSummary} /></label>
            <details className={styles.estimateAdvancedDetails}><summary>Advanced / Labor Guide details</summary><div><label><span>Estimate model</span><select onChange={(event) => setEstimateStrategy(event.target.value as typeof estimateStrategy)} value={estimateStrategy}><option value="STANDARD_SHOP_MODEL">DispatchBoard standard</option><option value="THREE_TIER_LABOR_GUIDE_MODEL">Three-tier labor guide</option><option value="ELITE_ENTERPRISE_MODEL">Elite enterprise</option></select></label><label><span>Draft labor rate / hr in cents</span><input inputMode="numeric" onChange={(event) => setEstimateLaborRate(event.target.value)} value={estimateLaborRate} /></label><label className={styles.wideField}><span>Assumptions and boundaries</span><textarea onChange={(event) => setEstimateAssumptions(event.target.value)} rows={2} value={estimateAssumptions} /></label></div></details>
            {!publishedDiagnosis || latestConclusion?.status !== "CONFIRMED" ? <p className={styles.estimatePresentationGate}>Draft can be saved, but an evidence-backed confirmed diagnosis is required before this estimate can be presented.</p> : null}
            <button disabled={busy || !model.publishingRollout?.executable || !model.permissions.canAdvisorEstimate || !usableEstimateLines.length} type="submit">Save draft estimate lines</button>
          </form>
        </section>

        <section className={styles.verificationPanel}><header><div><span className={styles.eyebrow}>DGN-033-034 · Verification Lab</span><h2>Closed-loop repair proof</h2><p>Close the diagnostic case only after the original concern and regression checks are verified against the repair package.</p></div><span>{latestVerification ? label(latestVerification.status) : "No verification"}</span></header>
          {latestVerification ? <article className={styles.handoffRecord}><Check /><div><strong>{latestVerification.outcomeSummary ?? label(latestVerification.status)}</strong><p>{latestVerification.repairSummary}</p><small>Verification v{latestVerification.version} · checksum {latestVerification.verificationChecksum.slice(0, 12)}…{latestVerification.reviewerUser ? ` · reviewed by ${latestVerification.reviewerUser.name}` : ""}</small></div></article> : null}
          <form className={styles.handoffForm} onSubmit={(event) => { event.preventDefault(); const checks = [{ key: "ORIGINAL_CONCERN", label: "Original concern reproduction", method: "CUSTOMER_CONCERN_REPRODUCTION", expectedResult: "Original concern no longer reproduces under documented conditions.", required: true, safetyCritical: false }, { key: "POST_REPAIR_FUNCTION", label: "Post-repair function test", method: "FUNCTION_TEST", expectedResult: "System operates normally after repair.", required: true, safetyCritical: false }]; const performedChecks = verificationAction === "PLAN" ? [] : checks.map((check) => ({ checkKey: check.key, result: verificationAction === "PASS" ? "PASS" : verificationAction === "FAIL" && check.key === "ORIGINAL_CONCERN" ? "FAIL" : "NOT_PERFORMED", evidenceKeys: [], notes: verificationNotes || null })); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/verification`, { action: verificationAction, conclusionId: latestConclusion?.id ?? null, repairHandoffId: publishedDiagnosis?.id ?? null, originalConcern: item.concern, repairSummary: verificationRepairSummary, checks, performedChecks, regressionChecks: verificationAction === "PASS" ? ["POST_REPAIR_FUNCTION"] : [], roadTestSafety: verificationAction === "UNSAFE" ? "UNSAFE" : "NOT_REQUIRED", limitations: verificationNotes ? [verificationNotes] : [], reviewerUserId: null, supersedesId: latestVerification?.id ?? null, reason: `Record ${label(verificationAction)} verification for the diagnostic case.` }); }}>
            <label><span>Verification action</span><select onChange={(event) => setVerificationAction(event.target.value as typeof verificationAction)} value={verificationAction}><option value="PLAN">Create verification plan</option><option value="PASS">Pass and close case</option><option value="FAIL">Fail and reopen testing</option><option value="INCONCLUSIVE">Inconclusive</option><option value="UNSAFE">Unsafe / escalate</option></select></label>
            <label className={styles.wideField}><span>Repair summary</span><textarea onChange={(event) => setVerificationRepairSummary(event.target.value)} placeholder="State the repair actually being verified." required rows={2} value={verificationRepairSummary} /></label>
            <label className={styles.wideField}><span>Verification notes</span><textarea onChange={(event) => setVerificationNotes(event.target.value)} placeholder="Record pass evidence, failed symptom, limitation, or unsafe condition." rows={2} value={verificationNotes} /></label>
            <button disabled={busy || !model.publishingRollout?.executable || !model.permissions.canVerifyRepair || !publishedDiagnosis || verificationRepairSummary.trim().length < 10 || (verificationAction !== "PLAN" && latestVerification?.status !== "PLANNED")} type="submit">Record verification</button>
          </form>
        </section>

        <DiagnosticLabWorkspace busy={busy} execute={execute} model={model} />
      </main>

      <aside className={styles.caseRail}>
        <section className={styles.masterTechRail}><span className={styles.eyebrow}>Master Technician</span><h2><Stethoscope /> What to do now</h2><b>{evidenceGuidance.title}</b><p>{evidenceGuidance.instruction}</p><div><strong>How this helps</strong><small>{evidenceGuidance.why}</small></div><button disabled={!model.permissions.canRecordEvidence} onClick={() => focusEvidence(evidenceGuidance.mode)} type="button">{evidenceGuidance.action}</button></section>
        <section><h2><UserRound /> Ownership</h2>{model.permissions.canAssign ? <><label><span>Accountable technician</span><select onChange={(event) => setOwner(event.target.value)} value={owner}><option value="">Select technician</option>{model.assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button disabled={busy || !commandEnabled || !owner || owner === item.assignedUser?.id} onClick={() => void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/assignment`, { assignedUserId: owner, reasonCode: item.assignedUser ? "CASE_REASSIGNED_LOAD" : "CASE_INITIAL_ASSIGNMENT", reason: "Assigned accountable technician from diagnostic workspace." })} type="button">Save assignment</button></> : <p>{item.assignedUser?.name ?? "No technician assigned"}</p>}<small>{item.location.name}</small></section>
        <section><h2><ShieldAlert /> Quality &amp; safety gates</h2><p><i className={styles[item.riskTier.toLocaleLowerCase()]}>{item.riskTier}</i>{label(model.qualitySafetyGates.disposition)} under {model.qualitySafetyGates.policyVersion}</p><p><i>{model.qualitySafetyGates.readyForReasoning ? <Check /> : <AlertTriangle />}</i>{model.qualitySafetyGates.readyForReasoning ? "Current evidence is eligible for reasoning." : "Reasoning must abstain until evidence gates are resolved."}</p><p><i><Check /></i>{model.qualitySafetyGates.counts.independentGroups} independent evidence group(s) · {model.qualitySafetyGates.counts.invalid} invalid · {model.qualitySafetyGates.counts.suspect} suspect</p>{model.qualitySafetyGates.reasonCodes.length ? <small>{model.qualitySafetyGates.reasonCodes.map(label).join(" · ")}</small> : null}</section>
        <section><h2><Activity /> Case timeline</h2>{item.timeline.map((event) => <article className={styles.timelineItem} key={event.id}><i /><div><strong>{label(event.eventType)}</strong><span>{label(event.toStatus)} · v{event.version}</span><p>{event.reason}</p><small>{new Date(event.occurredAt).toLocaleString()}</small></div></article>)}</section>
        <section className={styles.trace}><h2>Source traceability</h2><Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.repairOrder.id)}`}>{item.repairOrder.repairOrderNumber}</Link><span>{item.vehicle.vin ?? item.vehicle.vehicleNumber}</span><span>Case record v{item.version}</span></section>
      </aside>
    </div>
  </section>;
}

export function DiagnosticCaseUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Case unavailable</span><h1>The diagnostic workspace could not load</h1><p>{message}</p><Link href="/diagnostics">Return to the case queue</Link></section>;
}
