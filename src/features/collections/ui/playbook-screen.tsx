"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PLAYBOOK_LABELS, PLAYBOOK_TASKS, THRESHOLD_TASKS, type PlaybookRules } from "../domain/playbook";
import type { getPlaybookPage } from "../server/playbook-service";
import { callCollections, formatWhen } from "./client-api";
import styles from "./collections.module.css";

type Page = Awaited<ReturnType<typeof getPlaybookPage>>;
const MESSAGE_HELP: Record<string, string> = {
  DUE_SOON: "days relative to the due date (negative = before)", PAST_DUE_DAY1: "days past due", PAST_DUE_LATE_FEE: "days past due",
  PROMISE_REMINDER: "days relative to the promise date (negative = before)", INSURANCE_NEEDED: "days between reminders (max 3)"
};

export function PlaybookScreen({ page }: { page: Page }) {
  const router = useRouter();
  const [rules, setRules] = useState<PlaybookRules>(page.rules);
  const [name, setName] = useState(page.name);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const patch = (fn: (r: PlaybookRules) => void) => setRules(prev => { const next = structuredClone(prev); fn(next); return next; });

  async function send(values: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try { const r = await callCollections<{ message: string }>("/api/collections/playbook", { ...values, expectedVersion: page.activeVersion, reason }); setMessage(r.message); setReason(""); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby="stages-h">
        <h2 id="stages-h">Active playbook: {page.name} (version {page.activeVersion})</h2>
        <p className={styles.muted}>What happens at each stage, in order. Texts follow the send rules and quiet hours; reviews only create a board task, and a person decides.</p>
        <div className={styles.tiles}>
          {page.stages.map(stage => (
            <div key={stage.bucket} className={styles.tile}>
              <span>{stage.label}</span>
              {stage.steps.length ? <ol style={{ paddingLeft: 18, margin: "6px 0 0" }}>{stage.steps.map(s => <li key={s.key} style={{ opacity: s.enabled ? 1 : 0.55 }}>{s.label}{s.enabled ? "" : " (off)"}<br /><small>{s.when}</small></li>)}</ol> : <p className={styles.muted}>No steps</p>}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="edit-h">
        <h2 id="edit-h">Change the playbook</h2>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {message ? <p className={styles.notice} role="status">{message}</p> : null}
        <h3>Automatic texts</h3>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Text</th><th scope="col">On</th><th scope="col">Timing</th></tr></thead>
          <tbody>
            {(Object.keys(rules.messages) as Array<keyof PlaybookRules["messages"]>).map(key => (
              <tr key={key}>
                <th scope="row">{PLAYBOOK_LABELS[key === "INSURANCE_NEEDED" ? "INSURANCE_NEEDED_MSG" : key]}</th>
                <td><input type="checkbox" aria-label={`${key} on`} checked={rules.messages[key].enabled} onChange={e => patch(r => { r.messages[key].enabled = e.target.checked; })} /></td>
                <td><label>{MESSAGE_HELP[key]}<input type="number" value={rules.messages[key].dayOffset} onChange={e => patch(r => { r.messages[key].dayOffset = Number(e.target.value); })} style={{ width: 90 }} /></label></td>
              </tr>
            ))}
            <tr><th scope="row">Text: starter-disable warning</th><td>—</td><td className={styles.muted}>Never automatic (a person reviews and sends it). Can&apos;t be changed here.</td></tr>
          </tbody>
        </table></div>
        <h3>Board tasks and reviews</h3>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Task</th><th scope="col">On</th><th scope="col">When</th></tr></thead>
          <tbody>
            {PLAYBOOK_TASKS.map(key => (
              <tr key={key}>
                <th scope="row">{PLAYBOOK_LABELS[key]}</th>
                <td><input type="checkbox" aria-label={`${key} on`} checked={rules.tasks[key].enabled} onChange={e => patch(r => { r.tasks[key].enabled = e.target.checked; })} /></td>
                <td>{key in THRESHOLD_TASKS ? <label>days past due<input type="number" min={1} value={rules.tasks[key].atDays} onChange={e => patch(r => { r.tasks[key].atDays = Number(e.target.value); })} style={{ width: 90 }} /></label> : <span className={styles.muted}>when it happens</span>}</td>
              </tr>
            ))}
            <tr><th scope="row">Re-enable starter, repo with TLC, bankruptcy review, import reminder</th><td>—</td><td className={styles.muted}>Safety tasks: always on.</td></tr>
          </tbody>
        </table></div>
        <div className={styles.form}>
          <label>Playbook name<input value={name} onChange={e => setName(e.target.value)} /></label>
          <label>What changed and why<input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Disable review at 10 days instead of 7" /></label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.primary} disabled={busy} onClick={() => void send({ action: "SAVE_PLAYBOOK", rules, name })}>Save as new version and use it</button>
            <button type="button" disabled={busy} onClick={() => { setRules(page.rules); setName(page.name); }}>Undo my changes</button>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="versions-h">
        <h2 id="versions-h">Versions</h2>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Version</th><th scope="col">Name</th><th scope="col">Saved</th><th scope="col">Why</th><th scope="col">Action</th></tr></thead>
          <tbody>
            {page.versions.map(v => (
              <tr key={v.version}>
                <th scope="row">{v.version}{v.isActive ? " (active)" : ""}</th><td>{v.name}</td><td>{formatWhen(v.createdAt)} · {v.createdBy}</td><td>{v.reason}</td>
                <td>{v.isActive ? "—" : <button disabled={busy || reason.trim().length < 3} title={reason.trim().length < 3 ? "Fill in 'What changed and why' first" : undefined} onClick={() => void send({ action: "RESTORE_PLAYBOOK", version: v.version })}>Restore</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
