"use client";

import { useState } from "react";

import { MESSAGE_RULE_KEYS } from "../domain/settings";
import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Preview = { to: string | null; body: string; subject: string | null; length: number; maxLength: number; allowed: boolean; reason: string | null; warnings: string[]; languageFallback: boolean; sendingMode: string };

/** Account page: send a text or email (with preview and rule check), and record new consent. */
export function MessagesPanel({ d }: { d: AccountDetail }) {
  const isAdmin = Boolean(d.permissions?.isAdmin);
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [templateKey, setTemplateKey] = useState("");
  const [body, setBody] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const attorney = d.activeFlags.some((f: { type: string }) => f.type === "ATTORNEY_REPRESENTED");
  const smsConsents = (d.consents as Array<{ channel: string; status: string; recordedAt: string }>).filter(c => c.channel === "SMS").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const optedOut = smsConsents[0]?.status === "REVOKED";
  const values = { channel, templateKey, body, overrideReason };

  async function showPreview() {
    const result = await run("PREVIEW_MESSAGE", values) as { preview?: Preview } | null;
    if (result?.preview) { setPreview(result.preview); if (!body) setBody(result.preview.body); }
  }

  return (
    <Panel id="message" title="Text or email the customer">
      {feedback}
      {preview?.sendingMode === "DRY_RUN" || !preview ? <p className={styles.muted}>Test mode: messages are saved as &quot;dry run&quot; and nothing is actually sent until sending is turned on.</p> : null}
      {optedOut ? <p className={styles.warning}>This customer texted STOP. Texts are blocked until a new consent from the customer is recorded below.</p> : null}
      <div className={styles.form}>
        <label>Send by<select value={channel} onChange={e => { setChannel(e.target.value as "SMS" | "EMAIL"); setPreview(null); }}><option value="SMS">Text</option><option value="EMAIL">Email</option></select></label>
        <label>Template<select value={templateKey} onChange={e => { setTemplateKey(e.target.value); setBody(""); setPreview(null); }}>
          <option value="">Write my own</option>
          {MESSAGE_RULE_KEYS.map(key => <option key={key} value={key}>{label(key)}</option>)}
        </select></label>
        <label className={styles.wide}>Message<textarea rows={4} value={body} onChange={e => { setBody(e.target.value); setPreview(null); }} placeholder={templateKey ? "Leave empty to use the template, or press Preview to edit it." : "Type your message"} /></label>
        {attorney ? <label className={styles.wide}>Attorney represented: reason for contacting the customer directly<input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} minLength={5} /></label> : null}
        <div className={`${styles.actions} ${styles.wide}`}>
          <button type="button" onClick={() => void showPreview()} disabled={busy}>Preview</button>
          <button type="button" className={styles.primary} disabled={busy || !preview || !preview.allowed} onClick={() => void run("SEND_MESSAGE", { ...values, body: body || preview?.body }, () => { setPreview(null); setBody(""); })}>
            {preview?.sendingMode === "LIVE" ? "Send" : "Save (dry run)"}
          </button>
        </div>
      </div>
      {preview ? (
        <div className={styles.card} aria-live="polite">
          <p><strong>To:</strong> {preview.to ?? "—"}{preview.subject ? <> · <strong>Subject:</strong> {preview.subject}</> : null}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{preview.body}</p>
          {channel === "SMS" ? <p className={styles.muted}>{preview.length} of {preview.maxLength} characters</p> : null}
          {!preview.allowed ? <p className={styles.error}>Can&apos;t send: {preview.reason}</p> : null}
          {preview.warnings.map(w => <p key={w} className={styles.warning}>{w}</p>)}
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <h3>Record new consent from the customer</h3>
          <form className={styles.form} onSubmit={event => { const form = event.currentTarget; void run("RECORD_CONSENT", formValues(event), () => form.reset()); }}>
            <label>For<select name="channel"><option value="SMS">Texts</option><option value="EMAIL">Email</option></select></label>
            <label>How<select name="source"><option value="VERBAL">Verbal (phone or in person)</option><option value="WRITTEN">Written</option></select></label>
            <label className={styles.wide}>Details (who, when, how)<input name="evidence" required minLength={10} placeholder="Customer asked by phone on 11/16 to start texts again" /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Record consent</button></div>
          </form>
        </>
      ) : null}
      {d.consents.length ? (
        <ul className={styles.timeline}>
          {d.consents.map((c: { channel: string; address: string; status: string; source: string; recordedAt: string }, i: number) => (
            <li key={i}>{c.channel === "SMS" ? "Texts" : "Email"}: <span className={`${styles.badge} ${c.status === "REVOKED" ? styles.badgeBad : styles.badgeGood}`}>{label(c.status)}</span> by {label(c.source)} · {formatWhen(c.recordedAt)}</li>
          ))}
        </ul>
      ) : <p className={styles.muted}>Consent: from the contract (no changes recorded).</p>}
    </Panel>
  );
}
