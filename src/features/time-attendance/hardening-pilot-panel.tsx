import type { TimeAttendanceHardeningPilotReadiness } from "@/server/time-attendance/hardening-pilot-service";

import styles from "./time-attendance-console.module.css";

type HardeningPilotPanelProps = {
  readiness: TimeAttendanceHardeningPilotReadiness;
};

function statusClass(status: string) {
  if (status === "BLOCKED") return styles.chipDanger;
  if (status === "EVIDENCE_REQUIRED") return styles.chipWarning;
  return styles.chipGood;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export function HardeningPilotPanel({ readiness }: HardeningPilotPanelProps) {
  if (!readiness.permitted) {
    return (
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Hardening and pilot</span>
            <h2>Pilot readiness is protected</h2>
            <p>Managers can review security, reliability, restore, accessibility, pilot, training, and rollback evidence gates.</p>
          </div>
          <span className={styles.chipNeutral}>Manager only</span>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>TA-G5 hardening and pilot</span>
          <h2>Evidence gates before pilot or production</h2>
          <p>This panel shows what is source-ready, what still needs evidence, and what blocks pilot readiness.</p>
        </div>
        <span className={readiness.pilotEligible ? styles.chipGood : styles.chipDanger}>
          {readiness.pilotEligible ? "Pilot eligible" : "Pilot blocked"}
        </span>
      </div>

      <div className={styles.hardeningMetrics}>
        <div><span>Gates</span><strong>{readiness.totals.gates}</strong></div>
        <div><span>Evidence needed</span><strong>{readiness.totals.evidenceRequired}</strong></div>
        <div><span>Blocked</span><strong>{readiness.totals.blocked}</strong></div>
        <div><span>Production</span><strong>{readiness.productionEligible ? "Yes" : "No"}</strong></div>
      </div>

      <div className={styles.hardeningGateList}>
        {readiness.gates.map((gate) => (
          <div className={styles.hardeningGate} key={gate.id}>
            <div>
              <strong>{gate.id} · {gate.name}</strong>
              <p>{gate.summary}</p>
              <small>Next evidence: {gate.requiredEvidence[0]}</small>
            </div>
            <span className={statusClass(gate.status)}>{statusLabel(gate.status)}</span>
          </div>
        ))}
      </div>

      <p className={styles.attestationStatement}>
        Source implementation does not equal pilot approval. TA-G5 remains blocked until required runtime, privacy,
        restore, accessibility, reconciliation, training, and rollback evidence is attached and accepted.
      </p>
    </article>
  );
}
