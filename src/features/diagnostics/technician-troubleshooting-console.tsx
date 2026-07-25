"use client";

import { AlertTriangle, ArrowLeft, BookOpenCheck, Brain, Car, CheckCircle2, ClipboardCheck, ClipboardList, Gauge, GraduationCap, History, Lightbulb, Link2, Lock, Ruler, SearchCheck, ShieldAlert, Sparkles, Stethoscope, Wrench } from "lucide-react";
import Link from "next/link";

import type { buildTechnicianTroubleshootingConsole } from "@/server/diagnostics/technician-troubleshooting-console";
import styles from "./diagnostics.module.css";

type Model = ReturnType<typeof buildTechnicianTroubleshootingConsole>;

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function SourceBadge({ state }: { state: string }) {
  const icon = state === "NOT_CONNECTED" ? <Lock /> : state === "REVIEW_REQUIRED" ? <AlertTriangle /> : <CheckCircle2 />;
  return <span className={styles.ttcSourceBadge} data-state={state}>{icon}{label(state)}</span>;
}

export function TechnicianTroubleshootingConsole({ model }: { model: Model }) {
  const context = model.caseContext;
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
        </section>

        <section className={styles.ttcPanel}>
          <header><div><span className={styles.eyebrow}>Slice 4 · Common cause scaffolding</span><h2>Cause candidates without overclaiming</h2><p>Ranking is qualitative until evidence and validation justify stronger language.</p></div><Lightbulb /></header>
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
          <p>{model.nextTestPlan.selectionPolicy}</p>
        </section>

        <section className={styles.ttcAiGate}>
          <h2><Sparkles /> Ask Master Technician</h2>
          <strong>{model.masterTechnicianGate.label}</strong>
          <p>{model.masterTechnicianGate.reason}</p>
        </section>
      </aside>
    </div>
  </section>;
}

export function TechnicianTroubleshootingUnavailable({ message }: { message: string }) {
  return <section className={styles.unavailable}><AlertTriangle /><span className={styles.eyebrow}>Troubleshooting unavailable</span><h1>The troubleshooting console could not load</h1><p>{message}</p><Link href="/diagnostics">Return to Diagnostics</Link></section>;
}
