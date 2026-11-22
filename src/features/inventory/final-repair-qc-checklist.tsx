import { useId, useState, type FormEvent } from "react";

import { FINAL_REPAIR_QC_TEMPLATE, repairChecklistItems } from "@/lib/final-repair-qc";
import styles from "./final-repair-qc-checklist.module.css";

type Result = "PASS" | "FAIL";

export function FinalRepairQcChecklist({ evidence, roadTestNeeded, peerRequired, peers, procedureRules, busy, onSave }: {
  evidence: string[];
  roadTestNeeded: boolean;
  peerRequired: boolean;
  peers: { id: string; name: string }[];
  procedureRules: unknown;
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const id = useId();
  const checklist = repairChecklistItems(procedureRules);
  const [results, setResults] = useState<Partial<Record<string, Result>>>({});
  const [roadTest, setRoadTest] = useState("");
  const [roadEvidence, setRoadEvidence] = useState("");
  const [peer, setPeer] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const failed = Object.values(results).includes("FAIL") || roadTest === "FAILED";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (failed && note.trim().length < 10) {
      setError("Describe what needs correction or give the shop a next step (at least 10 characters).");
      return;
    }
    if (!failed && checklist.some(item => results[item.code] !== "PASS")) {
      setError("Mark every checklist item before saving a pass.");
      return;
    }
    if (!failed && peerRequired && !peer) {
      setError("Choose the peer who verified this repair.");
      return;
    }
    if ((!failed && roadTestNeeded && !roadTest) || (roadTest && !roadEvidence.trim())) {
      setError("Record the road-test outcome and what you observed.");
      return;
    }

    await onSave({
      templateCode: FINAL_REPAIR_QC_TEMPLATE,
      templateVersion: 1,
      checks: checklist.map(item => ({ ...item, result: results[item.code] ?? "NOT_APPLICABLE" })),
      completionEvidence: [...evidence, note.trim()].filter(Boolean),
      peerVerifierUserId: failed ? null : peer || null,
      peerVerificationPassed: Boolean(!failed && peer),
      roadTestRequired: Boolean(roadTest),
      roadTestOutcome: roadTest || "NOT_REQUIRED",
      roadTestEvidence: roadTest ? [roadEvidence.trim()] : [],
      reworkInstructions: failed ? note.trim() : null,
      inspectedAt: new Date().toISOString(),
      reason: failed ? "Return failed final QC to the shop." : "Record passed final repair QC."
    });
  }

  return (
    <form className={styles.form} onSubmit={save} onChange={() => setError("")}>
      {checklist.map(item => (
        <fieldset className={styles.check} key={item.code}>
          <legend>{item.label}</legend>
          <div className={styles.options}>
            {(["PASS", "FAIL"] as const).map(result => (
              <label key={result}>
                <input
                  type="radio"
                  name={`${id}-${item.code}`}
                  checked={results[item.code] === result}
                  onChange={() => setResults(previous => ({ ...previous, [item.code]: result }))}
                />
                {result === "PASS" ? "Pass" : "Fail"}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {roadTestNeeded && <div className={styles.fields}>
        <label>Road test
          <select value={roadTest} onChange={event => setRoadTest(event.target.value)}>
            <option value="">Select outcome</option>
            <option value="PASSED">Pass</option>
            <option value="FAILED">Fail</option>
          </select>
        </label>
        {roadTest && <label>Road-test observations
          <input value={roadEvidence} onChange={event => setRoadEvidence(event.target.value)} />
        </label>}
      </div>}
      {peerRequired && !failed && <label className={styles.field}>Peer who verified the repair
        <select value={peer} onChange={event => setPeer(event.target.value)}>
          <option value="">Choose verifier</option>
          {peers.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>}
      <label className={styles.field}>{failed ? "Correction or recommended next step" : "Inspection note (optional)"}
        <textarea rows={2} value={note} onChange={event => setNote(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      {!evidence.length && <p>Record repair completion evidence in the shop before saving QC.</p>}
      <div className={styles.actions}>
        <button className={failed ? "qc-quick-fail" : "qc-quick-pass"} disabled={busy || !evidence.length} type="submit">
          {busy ? "Saving…" : failed ? "Return to shop" : "Save QC pass"}
        </button>
      </div>
    </form>
  );
}
