import { AlertTriangle, CheckCircle2, Gauge, LockKeyhole, ShieldAlert } from "lucide-react";

import styles from "./diagnostics.module.css";

type Phase8ElectricalShadowTest = {
  testKey: string;
  name?: string;
  rank?: number;
  score?: number;
  estimatedMinutes?: number;
  reasonCodes?: string[];
  explanationCodes?: string[];
};

type Phase8ElectricalShadowReadiness = {
  status: "READY" | "BLOCKED" | "ESCALATED" | "NO_FAULT_FOUND";
  shadowOnly: boolean;
  liveExecutionAuthorized: boolean;
  recommendedTestKey: string | null;
  reasonCodes: string[];
  resultChecksum: string;
  proofCorpusVersion: string;
  adaptiveEvaluation: null | {
    eligibleTests: Phase8ElectricalShadowTest[];
    excludedTests: Phase8ElectricalShadowTest[];
    alternatives: string[];
    abstentionRequired: boolean;
  };
};

const familyLabel: Record<string, string> = {
  ELECTRICAL_CIRCUIT: "Electrical circuit",
  WAVEFORM_ANALYSIS: "Waveform analysis",
  INTERMITTENT_FAULT: "Intermittent fault"
};

const label = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function statusCopy(readiness: Phase8ElectricalShadowReadiness) {
  if (readiness.status === "READY") return { icon: CheckCircle2, title: "Shadow next test is ready for review", detail: "A qualified technician can review why this Phase 8 test is suggested, but execution remains locked." };
  if (readiness.status === "ESCALATED") return { icon: ShieldAlert, title: "Escalation required", detail: "The proof result contains a safety or out-of-scope authority escalation. Do not continue from this shadow panel." };
  if (readiness.status === "NO_FAULT_FOUND") return { icon: LockKeyhole, title: "No-fault-found hold", detail: "The concern was not reproduced with qualified evidence. The panel preserves the hold instead of creating more work." };
  return { icon: AlertTriangle, title: "Next test is blocked", detail: "One or more source, safety, capability, tool, qualification, prerequisite, or vehicle-state gates failed closed." };
}

function familyFromReadiness(readiness: Phase8ElectricalShadowReadiness) {
  const code = readiness.reasonCodes.find((reason) => reason.includes("_NEXT_TEST_") || reason.includes("_PROOF_") || reason.includes("_NO_FAULT_FOUND"))?.split("_NEXT_TEST_")[0]?.split("_PROOF_")[0]?.split("_NO_FAULT_FOUND")[0] ?? "";
  if (code === "ELECTRICAL_CIRCUIT" || code === "WAVEFORM_ANALYSIS" || code === "INTERMITTENT_FAULT") return code;
  return null;
}

export function Phase8ElectricalShadowReviewPanel({ readiness }: { readiness: Phase8ElectricalShadowReadiness }) {
  const copy = statusCopy(readiness);
  const Icon = copy.icon;
  const recommended = readiness.adaptiveEvaluation?.eligibleTests.find((test) => test.testKey === readiness.recommendedTestKey) ?? null;
  const alternatives = readiness.adaptiveEvaluation?.eligibleTests.filter((test) => test.testKey !== readiness.recommendedTestKey).slice(0, 3) ?? [];
  const blocked = readiness.adaptiveEvaluation?.excludedTests.slice(0, 5) ?? [];
  const family = familyFromReadiness(readiness);

  return <section className={styles.coolingShadowPanel} aria-label="Phase 8 electrical shadow review">
    <header>
      <div>
        <span className={styles.eyebrow}>Phase 8 · Electrical shadow review</span>
        <h2><Gauge />{family ? `${familyLabel[family]} recommendation` : "Electrical, waveform, and intermittent recommendation"}</h2>
        <p>{copy.detail}</p>
      </div>
      <strong data-status={readiness.status}><Icon />{label(readiness.status)}</strong>
    </header>

    <div className={styles.coolingShadowBoundary}>
      <LockKeyhole />
      <span><b>Review only</b>This panel cannot start a test, probe unsafe circuits, authorize road testing, approve a repair, present a customer conclusion, activate pilot behavior, or authorize Phase 8 execution.</span>
      <em>{readiness.shadowOnly && !readiness.liveExecutionAuthorized ? "Live execution locked" : "Authority mismatch"}</em>
    </div>

    <div className={styles.coolingShadowGrid}>
      <article className={styles.coolingRecommended}>
        <span>Recommended shadow test</span>
        <strong>{recommended?.name ?? readiness.recommendedTestKey ?? "No eligible Phase 8 test"}</strong>
        <p>{recommended ? `Rank ${recommended.rank ?? 1} · ${recommended.estimatedMinutes ?? "unknown"} min · score ${recommended.score ?? "n/a"}` : copy.title}</p>
        <small>{readiness.reasonCodes.map(label).join(" · ")}</small>
      </article>

      <article>
        <span>Why this test</span>
        {recommended?.explanationCodes?.length ? <ul>{recommended.explanationCodes.map((code) => <li key={code}>{label(code)}</li>)}</ul> : <p>No eligible explanation package is available.</p>}
      </article>

      <article>
        <span>Alternatives still visible</span>
        {alternatives.length ? <ul>{alternatives.map((test) => <li key={test.testKey}>{test.name ?? test.testKey}</li>)}</ul> : <p>No alternate eligible Phase 8 tests.</p>}
      </article>
    </div>

    <section className={styles.coolingBlockedList}>
      <h3>Blocked or held-back tests</h3>
      {blocked.length ? blocked.map((test) => <article key={test.testKey}>
        <strong>{test.name ?? test.testKey}</strong>
        <span>{(test.reasonCodes ?? []).map(label).join(" · ") || "Excluded by readiness policy"}</span>
      </article>) : <p>No blocked Phase 8 tests in this shadow result.</p>}
    </section>

    <section className={styles.coolingAcknowledgement}>
      <h3>Technician acknowledgement</h3>
      <p>Not captured in this slice. This panel presents the recommendation and blockers only; acknowledgement capture remains a separate governed step.</p>
      <small>Review visibility is not test execution authority.</small>
    </section>

    <footer>
      <span>Proof corpus {readiness.proofCorpusVersion}</span>
      <code>{readiness.resultChecksum.slice(0, 16)}…</code>
    </footer>
  </section>;
}
