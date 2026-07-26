"use client";

import { AlertTriangle, ArrowLeft, BookOpenCheck, Brain, Car, CheckCircle2, ClipboardCheck, ClipboardList, Database, Gauge, GraduationCap, History, Lightbulb, Link2, Lock, Ruler, SearchCheck, ShieldAlert, Sparkles, Stethoscope, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { buildTechnicianTroubleshootingConsole } from "@/server/diagnostics/technician-troubleshooting-console";
import styles from "./diagnostics.module.css";

type Model = ReturnType<typeof buildTechnicianTroubleshootingConsole> & {
  caseVersion?: number;
  permissions?: { canSaveSession: boolean };
  savedSessions?: Array<{ authorUserId: string; id: string; occurredAt: string; overrideReason: string | null; selectedTestKey: string | null; sessionChecksum: string; status: string; supersedesId: string | null; version: number }>;
};

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const clientDomainHints = [
  { id: "TRANSMISSION_DRIVETRAIN", label: "Transmission & Drivetrain", terms: ["transmission", "trans", "shift", "slip", "gear", "drivetrain"] },
  { id: "ENGINE_DRIVABILITY", label: "Engine & Drivability", terms: ["engine", "motor", "misfire", "rough", "stall", "check engine"] },
  { id: "BRAKE_ABS_STABILITY", label: "Brakes, ABS & Stability", terms: ["brake", "abs", "grind", "rotor", "caliper", "pedal"] },
  { id: "BODY_COLLISION", label: "Body, Door & Collision", terms: ["door", "body", "glass", "window", "paint", "bumper"] },
  { id: "ADAS_CALIBRATION", label: "ADAS & Calibration", terms: ["adas", "camera", "radar", "calibration", "programming"] }
];

function SourceBadge({ state }: { state: string }) {
  const icon = state === "NOT_CONNECTED" ? <Lock /> : state === "REVIEW_REQUIRED" ? <AlertTriangle /> : <CheckCircle2 />;
  return <span className={styles.ttcSourceBadge} data-state={state}>{icon}{label(state)}</span>;
}

export function TechnicianTroubleshootingConsole({ model }: { model: Model }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const context = model.caseContext;
  const latestSession = model.savedSessions?.[0] ?? null;
  const [concernDraft, setConcernDraft] = useState(context.concern);
  const [activeConcern, setActiveConcern] = useState(context.concern);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [selectedTestKey, setSelectedTestKey] = useState(model.nextTestPlan.recommendation?.key ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [trialObservation, setTrialObservation] = useState(false);
  const [trialMeasurement, setTrialMeasurement] = useState(false);

  const activeConcernText = activeConcern.trim().toLocaleLowerCase();
  const clientDomain = clientDomainHints.find((domain) => domain.terms.some((term) => activeConcernText.includes(term))) ?? null;
  const selectedTest = [model.nextTestPlan.recommendation, ...model.nextTestPlan.alternatives].filter(Boolean).find((test) => test?.key === selectedTestKey) ?? model.nextTestPlan.recommendation;
  const answeredCount = Object.keys(intakeAnswers).length;
  const acknowledgementCount = acknowledged.length;
  const trialEvidenceCount = Number(trialObservation) + Number(trialMeasurement);
  const interactiveReadiness = Math.round(([
    Boolean(activeConcern.trim()),
    answeredCount >= model.intakeRefinement.questions.length,
    acknowledgementCount >= Math.min(2, model.vehicleIntelligence.acknowledgements.length),
    Boolean(selectedTestKey),
    trialEvidenceCount > 0
  ].filter(Boolean).length / 5) * 100);

  function analyzeConcern() {
    setActiveConcern(concernDraft);
    setNotice("Pilot concern analysis refreshed on screen. No real case record was changed.");
  }

  function chooseAnswer(questionId: string, option: string) {
    setIntakeAnswers((current) => ({ ...current, [questionId]: option }));
  }

  function toggleAcknowledgement(id: string) {
    setAcknowledged((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveSession() {
    if (!model.permissions?.canSaveSession || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/diagnostics/cases/${encodeURIComponent(context.id)}/troubleshooting/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          advisorDraftPacket: { ...model.advisorHandoff.draftPacket, readiness: model.advisorHandoff.readiness },
          expectedVersion: model.caseVersion ?? context.version,
          idempotencyKey: crypto.randomUUID(),
          intakeRefinement: model.intakeRefinement,
          knownIssueSnapshot: model.vehicleIntelligence.knownIssueMatches,
          learningProposal: model.learningLoop,
          overrideReason: "",
          reason: "Record technician troubleshooting console session snapshot for trial workflow review.",
          rulePackSnapshot: model.rulePackRegistry,
          selectedTestKey: model.nextTestPlan.recommendation?.key ?? "",
          supersedesId: latestSession?.id ?? "",
          vehicleIntelligenceAcknowledgements: model.vehicleIntelligence.acknowledgements
        })
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Troubleshooting session could not be saved.");
      setNotice("Troubleshooting session snapshot saved.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Troubleshooting session could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.troubleshootingConsole} aria-label="Technician Troubleshooting Console">
    <header className={styles.ttcHero}>
      <div>
        <Link href={`/diagnostics/cases/${encodeURIComponent(context.id)}`}><ArrowLeft /> Back to diagnostic case</Link>
        <span className={styles.eyebrow}>Technician Troubleshooting Console · {model.version}</span>
        <h1>{context.vehicle.label}</h1>
        <p>{context.repairOrder.repairOrderNumber} · {context.location.code} · Case v{context.version} · {label(context.status)}</p>
      </div>
      <aside>
        <span>{context.riskTier}</span>
        <strong>{model.evidenceGate.label}</strong>
        <small>{context.assignedUser?.name ?? "Unassigned technician"}</small>
      </aside>
    </header>

    <section className={styles.ttcContextBar} aria-label="Troubleshooting case context">
      <article><Car /><span>Vehicle</span><strong>{context.vehicle.vin ?? context.vehicle.id}</strong></article>
      <article><ClipboardList /><span>Concern</span><strong>{context.concern}</strong></article>
      <article><Gauge /><span>Diagnostic state</span><strong>{label(context.stage)} · {context.ageHours}h open</strong></article>
    </section>
    <section className={styles.ttcSessionBar} aria-label="Troubleshooting session persistence">
      <div><strong>Session persistence</strong><p>{latestSession ? `Latest v${latestSession.version} · ${label(latestSession.status)} · ${new Date(latestSession.occurredAt).toLocaleString()}` : "No troubleshooting session snapshot has been saved yet."}</p>{notice ? <small>{notice}</small> : null}</div>
      <button disabled={busy || !model.permissions?.canSaveSession} onClick={() => void saveSession()} type="button">{busy ? "Saving..." : "Save session snapshot"}</button>
    </section>

    <section className={styles.ttcPilotControls} aria-label="Interactive troubleshooting pilot controls">
      <header>
        <div><span className={styles.eyebrow}>Slices 24-28 Â· Interactive pilot</span><h2>Try the troubleshooting flow</h2><p>Edit the concern, answer intake prompts, acknowledge source checks, choose a test, and watch the pilot snapshot change.</p></div>
        <strong>{interactiveReadiness}% ready</strong>
      </header>
      <div>
        <label><span>Concern to analyze</span><textarea onChange={(event) => setConcernDraft(event.target.value)} value={concernDraft} /></label>
        <button onClick={analyzeConcern} type="button"><Brain />Analyze concern</button>
      </div>
      <article>
        <strong>Live pilot result</strong>
        <p>{clientDomain ? `${clientDomain.label} detected from edited concern language.` : "No strong pilot domain detected yet. Add a system word like engine, brake, transmission, door, or calibration."}</p>
        <small>Active concern: {activeConcern || "No concern entered"}</small>
      </article>
    </section>

    <div className={styles.ttcGrid}>
      <main className={styles.ttcMain}>
        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 2 · Diagnostic intake intelligence</span><h2>Concern language interpretation</h2><p>{model.intake.summary}</p></div><Brain /></header>
          <div className={styles.ttcTextBox}><span>Normalized description</span><strong>{model.intake.normalizedText || "No concern text available"}</strong></div>
          <div className={styles.ttcChips}>
            {model.intake.detectedDomains.map((domain) => <span key={domain.id}>{domain.label}<b>{domain.score}</b></span>)}
            {!model.intake.detectedDomains.length ? <span>No domain selected<b>Hold</b></span> : null}
          </div>
          <div className={styles.ttcQuestions}>
            <h3>Focused questions to ask next</h3>
            {model.intake.missingQuestions.map((question) => <p key={question}><SearchCheck />{question}</p>)}
          </div>
          <div className={styles.ttcInteractiveIntake}>
            <h3>Interactive intake refinement</h3>
            <strong>{label(model.intakeRefinement.mode)}</strong>
            {model.intakeRefinement.questions.map((question) => <article key={question.id}>
              <span>{question.label}</span>
              <p>{question.prompt}</p>
              <div>{question.options.map((option) => <button aria-pressed={intakeAnswers[question.id] === option} key={option} onClick={() => chooseAnswer(question.id, option)} type="button">{option}</button>)}</div>
            </article>)}
            <small>{answeredCount} of {model.intakeRefinement.questions.length} intake prompts answered in this pilot session. {model.intakeRefinement.persistence}</small>
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 3 · Vehicle intelligence check</span><h2>Known information before deeper diagnosis</h2><p>These sources create clues and checklist obligations. They do not confirm the cause by themselves.</p></div><BookOpenCheck /></header>
          <div className={styles.ttcSourceList}>
            {model.vehicleIntelligence.sources.map((source) => <article key={source.label}>
              <div><strong>{source.label}</strong><p>{source.detail}</p></div>
              <SourceBadge state={source.state} />
            </article>)}
          </div>
          <div className={styles.ttcKnownIssues}>
            <h3><History /> Known issue library matches</h3>
            {model.vehicleIntelligence.knownIssueMatches.map((match) => <article key={match.domainId}><strong>{match.domainLabel}</strong><span>{label(match.matchState)}</span><p>{match.summary}</p><small>{match.source}</small></article>)}
          </div>
          <div className={styles.ttcKnowledgeCatalog}>
            <h3><Database /> Troubleshooting Knowledge Catalog</h3>
            <article>
              <strong>{model.knowledgeCatalog.coverage.completeness.replaceAll("_", " ")}</strong>
              <p>{model.knowledgeCatalog.coverage.statement}</p>
              <small>{model.knowledgeCatalog.coverage.categoryCount} categories Â· {model.knowledgeCatalog.coverage.commonCauseSeedCount} common-cause seeds Â· {model.knowledgeCatalog.coverage.vehicleKnownProblemSeedCount} known-problem seeds</small>
            </article>
            <section>
              <h4>Matched diagnostic categories</h4>
              <div>{model.knowledgeCatalog.categories.map((category) => <span key={category.id}>{category.label}<b>{label(category.rulePackStatus)}</b></span>)}</div>
            </section>
            <section>
              <h4>Common-cause catalog matches</h4>
              {model.knowledgeCatalog.commonCauseMatches.map((entry) => <article key={entry.id}><strong>{entry.failureMode}</strong><p>Evidence: {entry.evidenceRequired.join(", ")}</p><small>{entry.sourceBoundary.replaceAll("_", " ")}</small></article>)}
            </section>
            <section>
              <h4>Vehicle known-problem matches</h4>
              {model.knowledgeCatalog.vehicleKnownProblemMatches.length ? model.knowledgeCatalog.vehicleKnownProblemMatches.map((entry) => <article key={entry.id}><strong>{entry.title}</strong><p>Evidence: {entry.evidenceRequired.join(", ")}</p><small>{entry.sourceBoundary.replaceAll("_", " ")} Â· {entry.confidence.replaceAll("_", " ")}</small><b>{entry.warnings.join(" ")}</b></article>) : <p>No vehicle-specific seed match yet. Licensed connectors or shop-approved catalog entries can expand coverage.</p>}
            </section>
          </div>
          <div className={styles.ttcAcknowledgements}>
            <h3>Vehicle intelligence acknowledgement checklist</h3>
            {model.vehicleIntelligence.acknowledgements.map((item) => {
              const checked = acknowledged.includes(item.id);
              return <article key={item.id}><div><strong>{item.label}</strong><p>{item.action}</p></div><span>{checked ? "Acknowledged" : label(item.state)}</span><button aria-pressed={checked} onClick={() => toggleAcknowledgement(item.id)} type="button">{checked ? "Undo" : "Acknowledge"}</button><Link href={item.href}>Review</Link></article>;
            })}
          </div>
          <div className={styles.ttcConnectorReadiness}>
            <h3><Lock /> Licensed connector readiness</h3>
            {model.licensedConnectorInterfaces.map((connector) => <article key={connector.id}>
              <div>
                <strong>{connector.label}</strong>
                <p>{connector.capability}</p>
                <small>Required: {connector.requiredInputs.join(", ")}</small>
              </div>
              <span>{label(connector.status)}</span>
            </article>)}
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 4 · Common cause scaffolding</span><h2>Cause candidates without overclaiming</h2><p>Ranking is qualitative until evidence and validation justify stronger language.</p></div><Lightbulb /></header>
          <div className={styles.ttcRegistry}>
            <h3><Database /> Domain rule-pack registry</h3>
            <div>{model.rulePackRegistry.active.map((pack) => <article key={pack.id}><strong>{pack.label}</strong><span>{pack.domainFamily}</span><small>{pack.authority} · {pack.symptomCount} symptoms · {pack.commonCauseCount} causes · {pack.testCount} tests</small></article>)}</div>
            <p>{model.rulePackRegistry.contract}</p>
          </div>
          <div className={styles.ttcCauseList}>
            {model.commonCauses.map((cause) => <article key={`${cause.domainId}-${cause.cause}`}>
              <span>{cause.domainLabel}</span>
              <strong>{cause.cause}</strong>
              <b>{label(cause.rankState)}</b>
              <ul>{cause.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <small>Evidence needed: {cause.evidenceNeeded.join(", ")}</small>
            </article>)}
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 6 · Evidence and measurement capture</span><h2>Evidence capture plan</h2><p>Record what proves or eliminates the leading paths. Evidence remains separate from conclusions.</p></div><ClipboardCheck /></header>
          <div className={styles.ttcEvidencePlan}>
            <article><strong>{label(model.evidenceCapturePlan.captureState)}</strong><p>{model.evidenceCapturePlan.current.observations} observations · {model.evidenceCapturePlan.current.measurements} measurements · {model.evidenceCapturePlan.current.invalid} invalid · {model.evidenceCapturePlan.current.suspect} suspect</p><Link href={model.evidenceCapturePlan.entryPoint}>Open evidence capture</Link></article>
            <div>
              <section><h3><SearchCheck /> Observations to capture</h3>{model.evidenceCapturePlan.observationsToCapture.length ? model.evidenceCapturePlan.observationsToCapture.map((item) => <p key={item}>{item}</p>) : <p>Observation needs will appear after the next test path is selected.</p>}</section>
              <section><h3><Ruler /> Measurements to capture</h3>{model.evidenceCapturePlan.measurementsToCapture.length ? model.evidenceCapturePlan.measurementsToCapture.map((item) => <p key={item}>{item}</p>) : <p>Measurement needs will appear after the next test path is selected.</p>}</section>
              <section><h3><Link2 /> Attachments</h3>{model.evidenceCapturePlan.attachmentPrompts.map((item) => <p key={item}>{item}</p>)}</section>
            </div>
            <footer className={styles.ttcEvidenceToggles}>
              <button aria-pressed={trialObservation} onClick={() => setTrialObservation((current) => !current)} type="button">Mark sample observation captured</button>
              <button aria-pressed={trialMeasurement} onClick={() => setTrialMeasurement((current) => !current)} type="button">Mark sample measurement captured</button>
              <small>{trialEvidenceCount} sample evidence item(s) marked in this browser only.</small>
            </footer>
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 7 · Advisor handoff readiness</span><h2>Advisor-safe status</h2><p>The console translates diagnostic progress into safe service-advisor language without overstating certainty.</p></div><ClipboardList /></header>
          <div className={styles.ttcHandoff}>
            <strong>{label(model.advisorHandoff.readiness)}</strong>
            <p>{model.advisorHandoff.summary}</p>
            <span>Next: {model.advisorHandoff.nextAction}</span>
            <ul>{model.advisorHandoff.requiredBeforeCustomer.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 8 · Review and learning loop</span><h2>Controlled learning proposal</h2><p>Confirmed outcomes can improve the library later, but nothing teaches itself into production.</p></div><GraduationCap /></header>
          <div className={styles.ttcLearning}>
            <strong>{label(model.learningLoop.state)}</strong>
            <div>{model.learningLoop.reviewQueue.map((item) => <span key={item}>{item}</span>)}</div>
            <ul>{model.learningLoop.proposedSignals.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>{model.learningLoop.activationRule}</p>
          </div>
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slices 22-23 Â· Pilot governance</span><h2>Pilot telemetry and feature gates</h2><p>These controls show what is ready for trial use and what remains intentionally withheld.</p></div><Gauge /></header>
          <div className={styles.ttcTelemetry}>
            <article>
              <strong>{model.pilotTelemetry.overallReadiness}%</strong>
              <span>Overall pilot readiness</span>
              <p>{model.pilotTelemetry.privacyBoundary}</p>
            </article>
            <div>
              {Object.entries(model.pilotTelemetry.metrics).map(([key, value]) => <section key={key}>
                <span>{label(key)}</span>
                <b>{value}%</b>
              </section>)}
            </div>
            {model.pilotTelemetry.blockers.length ? <ul>{model.pilotTelemetry.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : null}
          </div>
          <div className={styles.ttcFeatureGates}>
            <h3><ShieldAlert /> Feature gates</h3>
            <p>{model.featureGates.policy}</p>
            {model.featureGates.gates.map((gate) => <article key={gate.id}>
              <div><strong>{gate.label}</strong><p>{gate.reason}</p></div>
              <span>{label(gate.state)}</span>
            </article>)}
          </div>
        </section>
      </main>

      <aside className={styles.ttcRail}>
        <section>
          <h2><ShieldAlert /> Evidence gate</h2>
          <strong>{model.evidenceGate.label}</strong>
          <p>{model.evidenceGate.readyForReasoning ? "Current evidence is eligible for governed reasoning review." : "The console must collect or review evidence before stronger diagnostic claims."}</p>
          <dl>
            <div><dt>Observations</dt><dd>{model.evidenceGate.counts.currentObservations}</dd></div>
            <div><dt>Measurements</dt><dd>{model.evidenceGate.counts.currentMeasurements}</dd></div>
            <div><dt>Independent groups</dt><dd>{model.evidenceGate.counts.independentGroups}</dd></div>
          </dl>
          {model.evidenceGate.reasonCodes.length ? <small>{model.evidenceGate.reasonCodes.map(label).join(" · ")}</small> : null}
        </section>

        <section>
          <h2><Stethoscope /> Next best test</h2>
          {model.nextTestPlan.recommendation ? <article className={styles.ttcRecommendedTest}>
            <strong>{model.nextTestPlan.recommendation.title}</strong>
            <p>{model.nextTestPlan.recommendation.reason}</p>
            {model.nextTestPlan.recommendation.blocked ? <b>{model.nextTestPlan.recommendation.blockedReason}</b> : null}
            <small>{model.nextTestPlan.recommendation.domainLabel} · {model.nextTestPlan.recommendation.estimatedMinutes} min · Tools: {model.nextTestPlan.recommendation.tools.join(", ")}</small>
            <ul>{model.nextTestPlan.recommendation.expectedEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
          </article> : <p>No eligible next test preview exists yet.</p>}
          {model.nextTestPlan.alternatives.length ? <div className={styles.ttcAlternatives}><h3><Wrench /> Alternatives</h3>{model.nextTestPlan.alternatives.map((test) => <article key={test.key}><strong>{test.title}</strong><small>{test.domainLabel} · {test.tools.join(", ")}</small></article>)}</div> : null}
          <div className={styles.ttcOverrideReasons}>
            <h3>Override reason capture</h3>
            {model.testOverride.options.map((option) => <span key={option}>{option}</span>)}
            <small>{model.testOverride.policy}</small>
          </div>
          <div className={styles.ttcTestSelector}>
            <h3><Wrench /> Select pilot test path</h3>
            {[model.nextTestPlan.recommendation, ...model.nextTestPlan.alternatives].filter(Boolean).map((test) => <button aria-pressed={selectedTestKey === test?.key} key={test?.key} onClick={() => setSelectedTestKey(test?.key ?? "")} type="button">{test?.title}</button>)}
          </div>
          <div className={styles.ttcTestSelector}>
            <h3>Selected override reason</h3>
            {model.testOverride.options.map((option) => <button aria-pressed={overrideReason === option} key={option} onClick={() => setOverrideReason((current) => current === option ? "" : option)} type="button">{option}</button>)}
          </div>
          <p>{model.nextTestPlan.selectionPolicy}</p>
        </section>

        <section>
          <h2><ClipboardCheck /> Pilot working snapshot</h2>
          <strong>{interactiveReadiness}% workflow readiness</strong>
          <p>This is the technician’s temporary working state. It helps evaluate the console flow before we connect every action to real case commands.</p>
          <dl>
            <div><dt>Intake answers</dt><dd>{answeredCount}</dd></div>
            <div><dt>Source checks</dt><dd>{acknowledgementCount}</dd></div>
            <div><dt>Sample evidence</dt><dd>{trialEvidenceCount}</dd></div>
          </dl>
          <article className={styles.ttcAdvisorDraft}>
            <strong>{selectedTest?.title ?? "No selected test"}</strong>
            <span>{overrideReason ? `Override: ${overrideReason}` : "Recommended path"}</span>
            <small>{clientDomain?.label ?? model.intake.detectedDomains[0]?.label ?? "Domain still needs refinement"}</small>
            <b>{interactiveReadiness >= 80 ? "Pilot workflow is ready for manager review." : "Continue intake, source review, test selection, and evidence capture before handoff."}</b>
          </article>
        </section>

        <section>
          <h2><ClipboardCheck /> Test execution bridge</h2>
          <strong>{label(model.testExecutionBridge.state)}</strong>
          <p>{model.testExecutionBridge.policy}</p>
          {model.testExecutionBridge.existingPlanNode ? <article className={styles.ttcRecommendedTest}>
            <strong>{model.testExecutionBridge.existingPlanNode.title}</strong>
            <small>Plan {model.testExecutionBridge.existingPlanNode.planVersion} Â· {model.testExecutionBridge.existingPlanNode.nodeKey}</small>
          </article> : <small>{model.testExecutionBridge.recommendedTitle ?? "No recommended test to bridge yet."}</small>}
          <Link href={model.testExecutionBridge.route}>Open technician labs</Link>
        </section>

        <section>
          <h2><ClipboardList /> Advisor draft packet</h2>
          <article className={styles.ttcAdvisorDraft}>
            <strong>{model.advisorHandoff.draftPacket.vehicleSummary}</strong>
            <p>{model.advisorHandoff.draftPacket.concernSummary}</p>
            <span>{model.advisorHandoff.draftPacket.internalDiagnosticStatus}</span>
            <small>{model.advisorHandoff.draftPacket.customerSafeStatus}</small>
            <b>{model.advisorHandoff.draftPacket.warning}</b>
          </article>
        </section>

        <section className={styles.ttcAiGate}>
          <h2><Sparkles /> Ask Master Technician</h2>
          <strong>{model.masterTechnicianGate.label}</strong>
          <p>{model.masterTechnicianGate.reason}</p>
          <div className={styles.ttcAiPacket}>
            <h3>AI-ready context packet</h3>
            <span>{model.aiContextPacket.label}</span>
            <small>Checksum: {model.aiContextPacket.contextChecksum}</small>
            <ul>{model.aiContextPacket.packet.sourceBoundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}</ul>
            <b>Forbidden: {model.aiContextPacket.packet.forbiddenUses.join(", ")}</b>
          </div>
        </section>
      </aside>
    </div>
  </section>;
}

export function TechnicianTroubleshootingUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Troubleshooting unavailable</span><h1>The troubleshooting console could not load</h1><p>{message}</p><Link href="/diagnostics">Return to Diagnostics</Link></section>;
}
