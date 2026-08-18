"use client";

import { Activity, AlertTriangle, ArrowLeft, Check, ClipboardList, Eye, Gauge, Link2, PackageCheck, Plus, RefreshCw, Ruler, ShieldAlert, Stethoscope, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DiagnosticCaseWorkspaceModel } from "@/server/diagnostics/service";
import { DiagnosticEvidenceReview, DiagnosticLabWorkspace } from "./diagnostic-lab-workspace";
import styles from "./diagnostics.module.css";

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const stages = ["CONCERN", "EVIDENCE", "TEST", "CAUSE", "VERIFY"] as const;
const defaultRapidReconRecommendation = "Proceed to the estimate step with the current technician update so the next repair decision can continue.";

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
const measurementUnits: Record<string, string[]> = { VOLTAGE: ["V", "mV"], CURRENT: ["A", "mA"], RESISTANCE: ["ohm", "kohm", "Mohm"], PRESSURE: ["kPa", "psi", "bar"], TEMPERATURE: ["°C", "°F"], ROTATIONAL_SPEED: ["rpm"], TIME: ["s", "ms"], FREQUENCY: ["Hz", "kHz"], PERCENT: ["%"], DISTANCE: ["mm", "in"], MASS_FLOW: ["g/s"] };

function primaryTransition(model: DiagnosticCaseWorkspaceModel) {
  const item = model.diagnosticCase;
  if (item.status === "DRAFT") return { targetStatus: "TRIAGE", reasonCode: "CASE_TRIAGE_STARTED", title: "Begin triage", reason: "Technician began safety and operability triage." };
  if (item.status === "REOPENED") return { targetStatus: "TRIAGE", reasonCode: "CASE_REOPEN_TRIAGE_STARTED", title: "Return to triage", reason: "Reopened concern returned to technician triage." };
  if (item.status === "ESCALATED" && item.resumeStatus) return { targetStatus: item.resumeStatus, reasonCode: "CASE_ESCALATION_RESOLVED", title: "Resume case", reason: "Escalation review completed and diagnostic work resumed." };
  if (item.status.startsWith("WAITING_FOR_") && item.resumeStatus) return { targetStatus: item.resumeStatus, reasonCode: "CASE_WAITING_RESOLVED", title: "Resume case", reason: "Recorded diagnostic blocker was resolved and work resumed." };
  if (["INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED", "VERIFIED_CLOSED"].includes(item.status)) return { targetStatus: "REOPENED", reasonCode: "CASE_REOPENED_RECURRENCE", title: "Reopen concern", reason: "Concern recurred or new evidence requires governed review." };
  return null;
}

export function DiagnosticCaseWorkspace({ model }: { model: DiagnosticCaseWorkspaceModel }) {
  const router = useRouter();
  const [owner, setOwner] = useState(model.diagnosticCase.assignedUser?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [optimisticObservations, setOptimisticObservations] = useState<Array<DiagnosticCaseWorkspaceModel["diagnosticCase"]["observations"][number]>>([]);
  const [captureMode, setCaptureMode] = useState<"NONE" | "OBSERVATION" | "SCAN" | "TEST" | "PRIOR_MEASUREMENT" | "LINK">(model.diagnosticCase.observations.length ? "NONE" : "OBSERVATION");
  const [observationStatement, setObservationStatement] = useState("");
  const [observationConditions, setObservationConditions] = useState("");
  const [reproductionStatus, setReproductionStatus] = useState("REPRODUCED");
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
  const [verificationAction, setVerificationAction] = useState<"PLAN" | "PASS" | "FAIL" | "INCONCLUSIVE" | "UNSAFE">("PLAN");
  const [verificationRepairSummary, setVerificationRepairSummary] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rapidOutcome, setRapidOutcome] = useState<"SUPPORTED_CAUSE" | "CONTROLLED_NEXT_STEP">("SUPPORTED_CAUSE");
  const [rapidSymptom, setRapidSymptom] = useState("");
  const [rapidUpdate, setRapidUpdate] = useState("");
  const [rapidEvidence, setRapidEvidence] = useState("");
  const [rapidNextStep, setRapidNextStep] = useState("");
  const [rapidUncertainty, setRapidUncertainty] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [showRapidNextActions, setShowRapidNextActions] = useState(false);
  const action = useMemo(() => primaryTransition(model), [model]);
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
  const assignedTechnicianId = item.assignedUser?.id ?? owner ?? model.viewer.id;
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

  function focusEvidence(mode: typeof evidenceGuidance.mode | "PRIOR_MEASUREMENT" | "LINK") {
    setCaptureMode(mode);
    requestAnimationFrame(() => document.getElementById("master-technician-evidence")?.scrollIntoView({ behavior: "smooth", block: "start" }));
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

  function resetRapidReconUpdate() {
    setRapidSymptom("");
    setRapidUpdate("");
    setRapidEvidence("");
    setRapidNextStep("");
    setRapidUncertainty("MEDIUM");
    setRapidOutcome("SUPPORTED_CAUSE");
  }

  return <section className={styles.workspace} aria-label="Diagnostic case workspace">
    <header className={styles.caseHeader}>
      <div><Link href="/diagnostics"><ArrowLeft size={15} /> Case queue</Link><span className={styles.eyebrow}>Technician diagnostic workspace</span><h1>{item.vehicle.label}</h1><p>{item.repairOrder.repairOrderNumber} · Case {item.id.slice(-8)} · Concern v{item.concernVersion}</p><Link className={styles.troubleshootingLink} href={`/diagnostics/cases/${encodeURIComponent(item.id)}/troubleshooting`}>Open troubleshooting console</Link></div>
      <dl><div><dt>Status</dt><dd>{label(item.status)}</dd></div><div><dt>Risk</dt><dd>{item.riskTier}</dd></div><div><dt>Owner</dt><dd>{item.assignedUser?.name ?? "Unassigned"}</dd></div><div><dt>Record</dt><dd>Version {item.version}</dd></div></dl>
    </header>

    <nav className={styles.stages} aria-label="Diagnostic stages">{stages.map((stage, index) => { const active = stages.indexOf(item.stage) === index; const reached = stages.indexOf(item.stage) >= index; return <span aria-current={active ? "step" : undefined} className={active ? styles.activeStage : reached ? styles.reachedStage : ""} key={stage}><i>{reached ? <Check /> : index + 1}</i>{label(stage)}</span>; })}</nav>
    {!commandEnabled ? <div className={styles.hold}><ShieldAlert size={18} /><span><strong>Read-only rollout hold.</strong> Review is available; case commands are disabled ({label(model.rollout.reason)}).</span></div> : null}
    {notice ? <div className={styles.notice} role="status">{notice}<button onClick={() => router.refresh()} type="button"><RefreshCw size={14} /> Refresh</button></div> : null}

    <div className={styles.workspaceGrid}>
      <main className={styles.caseMain}>
        <section className={styles.concernCard}><header><span><ClipboardList /> Authoritative concern</span><b>{label(item.concernSource)}</b></header><h2>{item.concern}</h2><dl><div><dt>Reproduction</dt><dd>Not yet recorded</dd></div><div><dt>Operating conditions</dt><dd>{operatingConditionSummary(item.operatingConditions).length ? <ul className={styles.conditionSummary}>{operatingConditionSummary(item.operatingConditions).map((condition) => <li key={condition}>{condition}</li>)}</ul> : "No conditions recorded"}</dd></div><div><dt>Confidence</dt><dd>Not assessed</dd></div></dl></section>

        <section className={styles.primaryAction}><div><span className={styles.eyebrow}>Next required step</span><h2>{item.nextAction}</h2><p>{item.blocker ? `Blocked: ${item.blocker}` : "Complete this step, then follow the Master Technician guidance below."}</p></div>{action ? <button disabled={busy || !commandEnabled || !model.permissions.canTransition} onClick={() => void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/transition`, action)} type="button">{busy ? "Recording…" : action.title}</button> : <span className={styles.readOnlyAction}>Continue with the guidance below</span>}</section>

        <section className={styles.handoffPanel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Diagnosis options at this stage</span>
              <h2>Quick diagnostic update</h2>
              <p>Staff can use the simple Rapid Recon update below to keep the repair moving, or go deeper in the troubleshooting console when a more detailed diagnostic workflow is needed.</p>
            </div>
            <span>Simple or detailed</span>
          </header>
          <div className={styles.reasoningList}>
            <article>
              <div>
                <strong>Option 1: Quick update and continue</strong>
                <small>Fastest path for Rapid Recon execution</small>
              </div>
              <span>Record the issue, evidence, and next estimate-ready repair step without opening the deeper console.</span>
            </article>
            <article>
              <div>
                <strong>Option 2: Detailed troubleshooting</strong>
                <small>Use when the technician needs guided deeper diagnostics</small>
              </div>
              <span>Open the troubleshooting console for structured test planning, measurements, and more detailed diagnostic evidence.</span>
            </article>
          </div>
          <div className={styles.evidenceActions}>
            <button onClick={() => requestAnimationFrame(() => document.getElementById("rapid-recon-update-form")?.scrollIntoView({ behavior: "smooth", block: "start" }))} type="button">
              <Wrench />
              <span>
                <strong>Use quick update</strong>
                <small>Simple Rapid Recon path</small>
              </span>
            </button>
            <Link className={styles.troubleshootingLink} href={troubleshootingHref}>
              Open detailed troubleshooting
            </Link>
          </div>
          {showRapidNextActions ? <section className={styles.handoffRecord} id="rapid-recon-next-step">
            <PackageCheck />
            <div>
              <strong>Quick update saved. Estimate is the next released step.</strong>
              <p>The vehicle is ready to continue into the estimate step now, or reopen the detailed diagnostic path if the technician needs deeper guided troubleshooting first.</p>
              <small>This simple update is one valid option at this diagnosis stage, and it now releases the estimate step as the next action.</small>
            </div>
            <div className={styles.documentActions}>
              <Link href={estimateWorkbenchHref}>Open estimate step</Link>
              <Link href={troubleshootingHref}>Continue detailed diagnosis</Link>
            </div>
          </section> : null}
          <form className={styles.handoffForm} id="rapid-recon-update-form" onSubmit={(event) => {
            event.preventDefault();
            const symptomLines = splitLines(rapidSymptom);
            const evidenceLines = splitLines(rapidEvidence);
            const nextStep = rapidNextStep.trim();
            const update = rapidUpdate.trim();
            const supportedCause = rapidOutcome === "SUPPORTED_CAUSE"
              ? update
              : `Controlled next step required before a fully confirmed cause: ${update}`;
            const recommendation = rapidOutcome === "SUPPORTED_CAUSE"
              ? `Proceed to the estimate step. ${nextStep}`
              : `Proceed with a controlled next diagnostic or teardown step. ${nextStep || defaultRapidReconRecommendation}`;
            void execute(
              `/api/repair-orders/${encodeURIComponent(item.repairOrder.id)}/planning`,
              {
                action: "RECORD_DIAGNOSIS",
                cause: supportedCause,
                concern: item.concern,
                diagnosedAt: new Date().toISOString(),
                evidence: evidenceLines.length ? evidenceLines : [update],
                proposedCorrection: nextStep,
                reason: "Recorded a simplified Rapid Recon diagnostic update so the vehicle can continue to the next step without waiting on the full troubleshooting console.",
                recommendation,
                symptoms: symptomLines.length ? symptomLines : [item.concern],
                technicianUserId: assignedTechnicianId,
                tests: [{ name: "Rapid Recon diagnostic update", result: update }],
                uncertainty: rapidUncertainty,
              },
              {
                action: "RAPID_RECON_DIAGNOSIS",
                onSuccess: () => {
                  setRepairRecommendation(recommendation);
                  setProposedCorrection(nextStep);
                  setShowRapidNextActions(true);
                  resetRapidReconUpdate();
                  requestAnimationFrame(() => document.getElementById("rapid-recon-next-step")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                },
                successMessage: "Rapid Recon diagnostic update saved. The diagnosis record is now ready for the estimate step.",
              },
            );
          }}>
            <label>
              <span>Update type</span>
              <select onChange={(event) => setRapidOutcome(event.target.value as typeof rapidOutcome)} value={rapidOutcome}>
                <option value="SUPPORTED_CAUSE">Supported cause found</option>
                <option value="CONTROLLED_NEXT_STEP">Not fully confirmed, but enough to continue</option>
              </select>
            </label>
            <label className={styles.wideField}>
              <span>What symptom or complaint are you carrying forward?</span>
              <textarea onChange={(event) => setRapidSymptom(event.target.value)} placeholder="Example: No brakes on initial lot move; ABS light on; front brake pulsation." required rows={2} value={rapidSymptom} />
            </label>
            <label className={styles.wideField}>
              <span>Technician update</span>
              <textarea onChange={(event) => setRapidUpdate(event.target.value)} placeholder="State what you found or what the next controlled diagnostic step needs to be." required rows={3} value={rapidUpdate} />
            </label>
            <label className={styles.wideField}>
              <span>Evidence or test result</span>
              <textarea onChange={(event) => setRapidEvidence(event.target.value)} placeholder="Examples: ABS codes stored; front pads at 3mm; rotor pulsation verified; leak not observed during inspection." required rows={2} value={rapidEvidence} />
            </label>
            <label className={styles.wideField}>
              <span>Recommended next step</span>
              <textarea onChange={(event) => setRapidNextStep(event.target.value)} placeholder="Example: Open estimate and build front brake, rotor, and ABS diagnosis follow-up." required rows={2} value={rapidNextStep} />
            </label>
            <label>
              <span>Confidence</span>
              <select onChange={(event) => setRapidUncertainty(event.target.value as typeof rapidUncertainty)} value={rapidUncertainty}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <button disabled={busy || !commandEnabled || rapidSymptom.trim().length < 5 || rapidUpdate.trim().length < 8 || rapidEvidence.trim().length < 5 || rapidNextStep.trim().length < 8} type="submit">
              <Wrench /> Save quick update and release estimate
            </button>
          </form>
        </section>

        <section className={styles.evidenceFoundation} id="master-technician-evidence">
          <header><div><span className={styles.eyebrow}>Master Technician guidance</span><h2>Tell me what the vehicle proves</h2><p>Enter facts, not a suspected repair. I will use each fact to narrow the next best test.</p></div><span>{observations.length + item.measurements.length} facts · {item.evidenceLinks.length} attachments</span></header>
          {!model.evidenceRollout.executable ? <div className={styles.hold}><ShieldAlert size={17} /><span><strong>Evidence commands are held.</strong> Existing facts remain reviewable ({label(model.evidenceRollout.reason)}).</span></div> : null}
          <section className={styles.masterTechPrompt}>
            <div><span>{evidenceGuidance.step}</span><h3>{evidenceGuidance.title}</h3><p>{evidenceGuidance.instruction}</p><small><strong>Why I need this:</strong> {evidenceGuidance.why}</small></div>
            <button disabled={!model.permissions.canRecordEvidence} onClick={() => focusEvidence(evidenceGuidance.mode)} type="button">{evidenceGuidance.action}</button>
          </section>
          <div className={styles.evidenceActions}>
            <button aria-pressed={captureMode === "OBSERVATION"} disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "OBSERVATION" ? "NONE" : "OBSERVATION")} type="button"><Eye /><span><strong>What did it do?</strong><small>What you saw, heard, felt, or reproduced</small></span></button>
            <button aria-pressed={captureMode === "SCAN"} disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "SCAN" ? "NONE" : "SCAN")} type="button"><Gauge /><span><strong>What did the scan show?</strong><small>Codes, modules, and freeze-frame data</small></span></button>
            <button aria-pressed={captureMode === "TEST"} disabled={!model.permissions.canRecordEvidence} onClick={() => setCaptureMode(captureMode === "TEST" ? "NONE" : "TEST")} type="button"><Ruler /><span><strong>{nextTestNode ? "Run the instructed test" : "Choose the next test"}</strong><small>{nextTestNode ? nextTestNode.title : "Open Master Technician test planning"}</small></span></button>
          </div>
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

        <section className={styles.estimatePanel}><header><div><span className={styles.eyebrow}>DGN-035-037 · Advisor estimate foundation</span><h2>Advisor repair estimate draft</h2><p>Create a controlled draft package from the confirmed diagnosis. This does not present a customer estimate, authorize work, order parts, or dispatch a technician.</p></div><span>{latestEstimateDraft ? label(latestEstimateDraft.status) : "No draft"}</span></header>
          {latestEstimateDraft ? <article className={styles.handoffRecord}><ClipboardList /><div><strong>{label(latestEstimateDraft.selectedStrategy)}</strong><p>{latestEstimateDraft.advisorSummary}</p><small>Draft v{latestEstimateDraft.version} · repair diagnosis v{latestEstimateDraft.repairDiagnosisVersion} · checksum {latestEstimateDraft.draftChecksum.slice(0, 12)}…</small></div></article> : null}
          <form className={styles.handoffForm} onSubmit={(event) => { event.preventDefault(); const expiry = new Date(Date.now() + 7 * 86_400_000).toISOString(); void execute(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/advisor-estimate`, { repairHandoffId: publishedDiagnosis?.id ?? null, selectedStrategy: estimateStrategy, advisorSummary: estimateAdvisorSummary, customerConcernSummary: item.concern, customerCauseSummary: latestConclusion?.causeStatement ?? "Confirmed diagnostic cause requires advisor review before customer presentation.", customerCorrectionSummary: publishedDiagnosis?.proposedCorrection ?? proposedCorrection, assumptions: estimateAssumptions.split(/\n+/).map((entry) => entry.trim()).filter(Boolean), notIncluded: ["Final taxes, fees, discounts, parts availability, customer authorization, job creation, and dispatch remain owned by their existing authorities."], laborRateCents: Number(estimateLaborRate), partPlaceholderUnitCents: 0, taxBoundary: "Existing Repair Estimate authority must calculate final taxes before customer presentation.", expiresAt: expiry, supersedesId: latestEstimateDraft?.id ?? null, reason: "Create advisor-review diagnostic estimate draft from the published diagnosis handoff." }); }}>
            <label><span>Estimate model</span><select onChange={(event) => setEstimateStrategy(event.target.value as typeof estimateStrategy)} value={estimateStrategy}><option value="STANDARD_SHOP_MODEL">DispatchBoard standard</option><option value="THREE_TIER_LABOR_GUIDE_MODEL">Three-tier labor guide</option><option value="ELITE_ENTERPRISE_MODEL">Elite enterprise</option></select></label>
            <label><span>Draft labor rate / hr</span><input inputMode="numeric" onChange={(event) => setEstimateLaborRate(event.target.value)} value={estimateLaborRate} /></label>
            <label className={styles.wideField}><span>Advisor summary</span><textarea onChange={(event) => setEstimateAdvisorSummary(event.target.value)} placeholder="Explain what the advisor should review before creating the official customer estimate." required rows={2} value={estimateAdvisorSummary} /></label>
            <label className={styles.wideField}><span>Assumptions and boundaries</span><textarea onChange={(event) => setEstimateAssumptions(event.target.value)} rows={2} value={estimateAssumptions} /></label>
            <button disabled={busy || !model.publishingRollout?.executable || !model.permissions.canAdvisorEstimate || !publishedDiagnosis || latestConclusion?.status !== "CONFIRMED" || estimateAdvisorSummary.trim().length < 10 || !Number.isInteger(Number(estimateLaborRate)) || Number(estimateLaborRate) < 1} type="submit">Create advisor draft</button>
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
