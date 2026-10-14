import { AlertTriangle, CheckCircle2, Gauge, LockKeyhole, ShieldAlert } from "lucide-react";

import styles from "./diagnostics.module.css";

type CoolingShadowTest = {
  testKey: string;
  name?: string;
  rank?: number;
  score?: number;
  estimatedMinutes?: number;
  reasonCodes?: string[];
  explanationCodes?: string[];
};

type CoolingShadowReadiness = {
  status: "READY" | "BLOCKED" | "ESCALATED" | "NO_FAULT_FOUND";
  shadowOnly: boolean;
  liveExecutionAuthorized: boolean;
  recommendedTestKey: string | null;
  reasonCodes: string[];
  resultChecksum: string;
  adaptiveEvaluation: null | {
    eligibleTests: CoolingShadowTest[];
    excludedTests: CoolingShadowTest[];
    alternatives: string[];
    abstentionRequired: boolean;
  };
};

type CoolingShadowAcknowledgement = {
  decision: "REVIEWED" | "ESCALATION_REQUESTED" | "BLOCKER_ACKNOWLEDGED";
  actorUserId: string;
  acknowledgedAt: string;
  selectedTestKey: string | null;
  reason: string;
  acknowledgementChecksum: string;
  executionAuthorized: boolean;
};

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function statusCopy(readiness: CoolingShadowReadiness) {
  if (readiness.status === "READY") return { icon: CheckCircle2, title: "Shadow next test is ready for review", detail: "A qualified technician can review why this cooling-system test is suggested, but execution remains locked." };
  if (readiness.status === "ESCALATED") return { icon: ShieldAlert, title: "Escalation required", detail: "The cooling proof result contains a safety or scope escalation. Do not continue in this shadow panel." };
  if (readiness.status === "NO_FAULT_FOUND") return { icon: LockKeyhole, title: "No-fault-found hold", detail: "The concern was not reproduced with qualified evidence. The panel preserves the hold instead of creating more work." };
  return { icon: AlertTriangle, title: "Next test is blocked", detail: "One or more source, safety, capability, tool, qualification, or vehicle-state gates failed closed." };
}

export function CoolingOverheatingShadowReviewPanel({ acknowledgement, readiness }: { acknowledgement?: CoolingShadowAcknowledgement | null; readiness: CoolingShadowReadiness }) {
  const copy = statusCopy(readiness);
  const Icon = copy.icon;
  const recommended = readiness.adaptiveEvaluation?.eligibleTests.find((test) => test.testKey === readiness.recommendedTestKey) ?? null;
  const alternatives = readiness.adaptiveEvaluation?.eligibleTests.filter((test) => test.testKey !== readiness.recommendedTestKey).slice(0, 3) ?? [];
  const blocked = readiness.adaptiveEvaluation?.excludedTests.slice(0, 4) ?? [];

  return <section className={styles.coolingShadowPanel} aria-label="Cooling and overheating shadow review">
    <header>
      <div>
        <span className={styles.eyebrow}>DGN-060 · Cooling shadow review</span>
        <h2><Gauge />Advanced cooling recommendation</h2>
        <p>{copy.detail}</p>
      </div>
      <strong data-status={readiness.status}><Icon />{label(readiness.status)}</strong>
    </header>

    <div className={styles.coolingShadowBoundary}>
      <LockKeyhole />
      <span><b>Review only</b>This panel cannot start a test, dispatch work, approve a repair, present a customer conclusion, or activate pilot behavior.</span>
      <em>{readiness.shadowOnly && !readiness.liveExecutionAuthorized ? "Live execution locked" : "Authority mismatch"}</em>
    </div>

    <div className={styles.coolingShadowGrid}>
      <article className={styles.coolingRecommended}>
        <span>Recommended shadow test</span>
        <strong>{recommended?.name ?? readiness.recommendedTestKey ?? "No eligible cooling test"}</strong>
        <p>{recommended ? `Rank ${recommended.rank ?? 1} · ${recommended.estimatedMinutes ?? "unknown"} min · score ${recommended.score ?? "n/a"}` : copy.title}</p>
        <small>{readiness.reasonCodes.map(label).join(" · ")}</small>
      </article>

      <article>
        <span>Why this test</span>
        {recommended?.explanationCodes?.length ? <ul>{recommended.explanationCodes.map((code) => <li key={code}>{label(code)}</li>)}</ul> : <p>No eligible explanation package is available.</p>}
      </article>

      <article>
        <span>Alternatives still visible</span>
        {alternatives.length ? <ul>{alternatives.map((test) => <li key={test.testKey}>{test.name ?? test.testKey}</li>)}</ul> : <p>No alternate eligible cooling tests.</p>}
      </article>
    </div>

    <section className={styles.coolingBlockedList}>
      <h3>Blocked or held-back tests</h3>
      {blocked.length ? blocked.map((test) => <article key={test.testKey}>
        <strong>{test.name ?? test.testKey}</strong>
        <span>{(test.reasonCodes ?? []).map(label).join(" · ") || "Excluded by readiness policy"}</span>
      </article>) : <p>No blocked cooling tests in this shadow result.</p>}
    </section>

    <section className={styles.coolingAcknowledgement}>
      <h3>Technician acknowledgement</h3>
      {acknowledgement ? <article>
        <CheckCircle2 />
        <span><strong>{label(acknowledgement.decision)}</strong><small>{acknowledgement.actorUserId} · {new Date(acknowledgement.acknowledgedAt).toLocaleString()} · {acknowledgement.selectedTestKey ?? "No selected test"}</small><p>{acknowledgement.reason}</p></span>
        <em>{acknowledgement.executionAuthorized ? "Authority mismatch" : "Acknowledgement only"}</em>
      </article> : <p>No technician acknowledgement has been recorded for this shadow result.</p>}
      <small>Acknowledgement records review, blockers, or escalation intent. It is not test execution authority.</small>
    </section>

    <footer>
      <span>Result checksum</span>
      <code>{readiness.resultChecksum.slice(0, 16)}…</code>
    </footer>
  </section>;
}
