"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { renderTemplate } from "../domain/messaging";
import { formatCents } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import type { getSettingsPage } from "../server/settings-service";
import { callCollections, formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Page = Awaited<ReturnType<typeof getSettingsPage>>;
type Template = Page["templates"][number];
const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;
const RISK_LABELS: Record<string, string> = { daysPastDue: "Days past due", dpdTrend: "Getting further behind", missedPayments: "Missed payments", brokenPromises: "Broken promises", lowContactSuccess: "Hard to reach", insurance: "Insurance problem", possibleSkip: "Possible skip", newAccount: "New account" };
const LANG_NAMES: Record<string, string> = { EN: "English", ES: "Spanish", SO: "Somali", SW: "Swahili" };

function useFeedback() {
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const node = <>{error ? <p className={styles.error} role="alert">{error}</p> : null}{message ? <p className={styles.notice} role="status">{message}</p> : null}</>;
  return { node, setError, setMessage };
}

export function SettingsScreen({ page }: { page: Page }) {
  const router = useRouter();
  const [s, setS] = useState<CollectionsSettings>(page.settings);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();
  const patch = (fn: (draft: CollectionsSettings) => void) => setS(prev => { const next = structuredClone(prev); fn(next); return next; });

  async function save() {
    setBusy(true); fb.setError(""); fb.setMessage("");
    try {
      const result = await callCollections<{ message: string }>("/api/collections/settings", { values: s, version: page.version, reason });
      fb.setMessage(result.message); setReason(""); router.refresh();
    } catch (e) { fb.setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  const field = (labelText: string, value: string | number, onChange: (v: string) => void, props: Record<string, unknown> = {}) => {
    const { key, ...rest } = props as { key?: string } & Record<string, unknown>;
    return <label key={key}>{labelText}<input value={value} onChange={e => onChange(e.target.value)} {...rest} /></label>;
  };

  return (
    <>
      <section className={styles.panel} aria-labelledby="dealer-h">
        <h2 id="dealer-h">Dealership details (used in texts and letters)</h2>
        <div className={styles.form}>
          {field("Name", s.dealership.name, v => patch(d => { d.dealership.name = v; }), { required: true })}
          {field("Phone", s.dealership.phone, v => patch(d => { d.dealership.phone = v; }), { inputMode: "tel" })}
          <label className={styles.wide}>Address<input value={s.dealership.address} onChange={e => patch(d => { d.dealership.address = e.target.value; })} /></label>
          {field("Pay-online link", s.dealership.payOnlineUrl, v => patch(d => { d.dealership.payOnlineUrl = v; }), { type: "url", placeholder: "https://" })}
          {field("Zelle recipient", s.dealership.zelleRecipient, v => patch(d => { d.dealership.zelleRecipient = v; }))}
          {field("Advantage GPS portal link", s.dealership.advantageGpsPortalUrl, v => patch(d => { d.dealership.advantageGpsPortalUrl = v; }), { type: "url", placeholder: "https://" })}
          <label className={styles.wide}>Cash-at-store instructions<input value={s.dealership.cashAtStoreInstructions} onChange={e => patch(d => { d.dealership.cashAtStoreInstructions = e.target.value; })} /></label>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="hours-h">
        <h2 id="hours-h">Business hours (Chicago time)</h2>
        <p className={styles.muted}>Automatic texts only go out during these hours and between {s.customerContactWindow.start} and {s.customerContactWindow.end}.</p>
        <div className={styles.form}>
          {DAYS.map(([day, name]) => {
            const h = s.businessHours[day];
            return (
              <fieldset key={day} className={styles.wide} style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                <legend className={styles.srOnly}>{name}</legend>
                <label style={{ minWidth: 140 }}><input type="checkbox" checked={Boolean(h)} onChange={e => patch(d => { d.businessHours[day] = e.target.checked ? { open: "09:00", close: "17:00" } : null; })} /> {name} open</label>
                {h ? <>
                  <label>Opens<input type="time" value={h.open} onChange={e => patch(d => { d.businessHours[day] = { ...d.businessHours[day]!, open: e.target.value }; })} /></label>
                  <label>Closes<input type="time" value={h.close} onChange={e => patch(d => { d.businessHours[day] = { ...d.businessHours[day]!, close: e.target.value }; })} /></label>
                </> : <span className={styles.muted}>Closed</span>}
              </fieldset>
            );
          })}
          <label>Customer texts from<input type="time" value={s.customerContactWindow.start} onChange={e => patch(d => { d.customerContactWindow.start = e.target.value; })} /></label>
          <label>Customer texts until<input type="time" value={s.customerContactWindow.end} onChange={e => patch(d => { d.customerContactWindow.end = e.target.value; })} /></label>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="rules-h">
        <h2 id="rules-h">Days and thresholds</h2>
        <div className={styles.form}>
          {field("Grace days", s.graceDays, v => patch(d => { d.graceDays = Number(v); }), { type: "number", min: 0, max: 30 })}
          {field(`Late fee shown (${formatCents(s.lateFeeDisplayCents)})`, s.lateFeeDisplayCents / 100, v => patch(d => { d.lateFeeDisplayCents = Math.round(Number(v) * 100); }), { type: "number", min: 0, step: "0.01" })}
          {field("Promise grace (days)", s.promiseGraceDays, v => patch(d => { d.promiseGraceDays = Number(v); }), { type: "number", min: 0 })}
          {field("Reported-payment window (days)", s.reportedPaymentConfirmationDays, v => patch(d => { d.reportedPaymentConfirmationDays = Number(v); }), { type: "number", min: 1 })}
          {field("Insurance 'expiring soon' (days)", s.insuranceExpiringSoonDays, v => patch(d => { d.insuranceExpiringSoonDays = Number(v); }), { type: "number", min: 1 })}
          {field("Daily automation time", s.automationRunTime, v => patch(d => { d.automationRunTime = v; }), { type: "time" })}
          {field("Import reminder time", s.importReminderTime, v => patch(d => { d.importReminderTime = v; }), { type: "time" })}
          <label>Collectors see<select value={s.collectorVisibility} onChange={e => patch(d => { d.collectorVisibility = e.target.value as CollectionsSettings["collectorVisibility"]; })}><option value="ALL_ACCOUNTS">All accounts</option><option value="ASSIGNED_ONLY">Only accounts assigned to them</option></select></label>
        </div>
        <p className={styles.muted}>Review days (starter-disable, follow-up, 30-day, repo) are set in the <a href="/collections/playbook">Playbook</a>. The Minnesota late-fee question is in the open questions list. The app only displays the fee; DealerCenter charges it.</p>
      </section>

      <section className={styles.panel} aria-labelledby="msg-h">
        <h2 id="msg-h">Automatic messages</h2>
        <div className={styles.form}>
          {field("Weekly limit per account", s.weeklyAutomaticMessageCap, v => patch(d => { d.weeklyAutomaticMessageCap = Number(v); }), { type: "number", min: 0, max: 20 })}
          <fieldset className={styles.wide} style={{ border: 0, padding: 0 }}><legend>Languages offered</legend>
            {(["EN", "ES", "SO", "SW"] as const).map(lang => (
              <label key={lang} style={{ display: "inline-flex", marginRight: 12 }}><input type="checkbox" disabled={lang === "EN"} checked={s.languagesEnabled.includes(lang)} onChange={e => patch(d => { d.languagesEnabled = e.target.checked ? [...d.languagesEnabled, lang] : d.languagesEnabled.filter(l => l !== lang); })} /> {LANG_NAMES[lang]}</label>
            ))}
          </fieldset>
        </div>
        <p className={styles.notice}>Which texts go out and when, and the review days (7 / 14 / 30 / 60), are now set in the <a href="/collections/playbook">Playbook</a>.</p>
      </section>

      <section className={styles.panel} aria-labelledby="upgrades-h">
        <h2 id="upgrades-h">Risk score, extensions, skip, charge-off, fees</h2>
        <h3>Risk score: most points each factor can add (total capped at 100)</h3>
        <div className={styles.form}>
          {(Object.keys(s.riskWeights) as Array<keyof CollectionsSettings["riskWeights"]>).map(key => field(RISK_LABELS[key], s.riskWeights[key], v => patch(d => { d.riskWeights[key] = Number(v); }), { type: "number", min: 0, max: 100, key }))}
        </div>
        <h3>Extension rules</h3>
        <div className={styles.form}>
          {field("Account at least (months old)", s.extensionRules.minAccountAgeMonths, v => patch(d => { d.extensionRules.minAccountAgeMonths = Number(v); }), { type: "number", min: 0 })}
          {field("At most per 12 months", s.extensionRules.maxPer12Months, v => patch(d => { d.extensionRules.maxPer12Months = Number(v); }), { type: "number", min: 0 })}
          <label><input type="checkbox" checked={s.extensionRules.blockWhileOpenPromise} onChange={e => patch(d => { d.extensionRules.blockWhileOpenPromise = e.target.checked; })} /> Not while a promise is open</label>
        </div>
        <h3>Skip, charge-off, fees and credits</h3>
        <div className={styles.form}>
          {field("Possible skip after (days without reaching the customer)", s.skipNoContactDays, v => patch(d => { d.skipNoContactDays = Number(v); }), { type: "number", min: 3 })}
          {field("Charge-off without an override from (days past due)", s.chargeOffMinDaysPastDue, v => patch(d => { d.chargeOffMinDaysPastDue = Number(v); }), { type: "number", min: 30 })}
          {field("Fees/credits up to this amount skip approval ($, 0 = all need approval)", s.adjustmentApprovalThresholdCents / 100, v => patch(d => { d.adjustmentApprovalThresholdCents = Math.round(Number(v) * 100); }), { type: "number", min: 0, step: "0.01" })}
          {field("Flag a posted fee/credit not seen in imports after (days)", s.adjustmentConfirmationDays, v => patch(d => { d.adjustmentConfirmationDays = Number(v); }), { type: "number", min: 1 })}
          {(["REPO_FEE", "STORAGE_FEE", "RETURNED_PAYMENT_FEE"] as const).map(key => field(`Default ${label(key).toLowerCase()} ($)`, s.feeDefaults[key] / 100, v => patch(d => { d.feeDefaults[key] = Math.round(Number(v) * 100); }), { type: "number", min: 0, step: "0.01", key }))}
        </div>
        <p className={styles.muted}>Fee amounts must stay within Minnesota limits: confirm with your attorney.</p>
      </section>

      <section className={styles.panel} aria-labelledby="letters-h">
        <h2 id="letters-h">Repo letter wording (from your attorney)</h2>
        <p className={styles.warning}>Paste only wording your Minnesota attorney approved. Until then, letters print with a red DRAFT banner and can&apos;t be recorded as sent. You can use {"{customerName}"}, {"{accountNumber}"}, {"{dealNumber}"}, {"{vehicle}"}, {"{vin}"}, {"{amountDue}"}, {"{date}"}, {"{dealershipName}"}, {"{dealershipPhone}"}.</p>
        <div className={styles.form}>
          <label className={styles.wide}>Pre-repo notice<textarea rows={6} value={s.letterWording.PRE_REPO_NOTICE} onChange={e => patch(d => { d.letterWording.PRE_REPO_NOTICE = e.target.value; })} /></label>
          <label className={styles.wide}>Post-repo notice<textarea rows={6} value={s.letterWording.POST_REPO_NOTICE} onChange={e => patch(d => { d.letterWording.POST_REPO_NOTICE = e.target.value; })} /></label>
        </div>
      </section>

      <section className={styles.panel} aria-label="Save settings">
        {fb.node}
        <div className={styles.form}>
          <label className={styles.wide}>What changed and why (saved in the history)<input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Added pay-online link" /></label>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy} onClick={() => void save()}>Save settings</button><span className={styles.muted}>Version {page.version}</span></div>
        </div>
        {page.history.length ? (
          <details><summary>Change history</summary>
            <ul className={styles.timeline}>{page.history.map(h => <li key={h.version}>Version {h.version} · {formatWhen(h.createdAt)} · {h.changedBy} · {h.reason}</li>)}</ul>
          </details>
        ) : null}
      </section>

      <Templates templates={page.templates} settings={page.settings} />
    </>
  );
}

function Templates({ templates, settings }: { templates: Template[]; settings: CollectionsSettings }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = templates.find(t => t.id === selectedId) ?? null;
  const [body, setBody] = useState(selected?.body ?? "");
  const [subject, setSubject] = useState(selected?.subject ?? "");
  const [fluent, setFluent] = useState(false);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();
  const preview = useMemo(() => renderTemplate(body, {
    firstName: "Alex", paymentAmount: "$325.00", dueDate: "Nov 30", promiseAmount: "$200.00", promiseDate: "Nov 28",
    dealershipName: settings.dealership.name, dealershipPhone: settings.dealership.phone, businessHours: "Mon–Fri 9–6, Sat 10–3",
    payOnlineUrl: settings.dealership.payOnlineUrl, zelleRecipient: settings.dealership.zelleRecipient, inPersonAddress: settings.dealership.address
  }), [body, settings]);

  function pick(id: string) {
    const t = templates.find(x => x.id === id);
    setSelectedId(id); setBody(t?.body ?? ""); setSubject(t?.subject ?? ""); setFluent(false); fb.setError(""); fb.setMessage("");
  }
  async function send(values: Record<string, unknown>) {
    setBusy(true); fb.setError(""); fb.setMessage("");
    try { const r = await callCollections<{ message: string }>("/api/collections/templates", values); fb.setMessage(r.message); router.refresh(); }
    catch (e) { fb.setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  return (
    <section className={styles.panel} aria-labelledby="tpl-h">
      <h2 id="tpl-h">Message templates</h2>
      <p className={styles.muted}>Editing saves a new draft version; approving makes it live. Spanish, Somali and Swahili need a fluent speaker&apos;s review before approval.</p>
      <div className={styles.split}>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Message</th><th scope="col">Type</th><th scope="col">Language</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id} aria-selected={t.id === selectedId}>
                <th scope="row"><button type="button" className={styles.linkButton} onClick={() => pick(t.id)} aria-pressed={t.id === selectedId}>{label(t.key)}</button></th>
                <td>{t.channel === "SMS" ? "Text" : "Email"}</td><td>{LANG_NAMES[t.language]}</td>
                <td><span className={`${styles.badge} ${t.status === "APPROVED" ? styles.badgeGood : styles.badgeWarn}`}>{label(t.status)} v{t.version}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {selected ? (
          <div>
            <h3>{label(selected.key)} · {selected.channel === "SMS" ? "Text" : "Email"} · {LANG_NAMES[selected.language]}</h3>
            {selected.reviewNote ? <p className={styles.warning}>{selected.reviewNote}</p> : null}
            {fb.node}
            {selected.channel === "EMAIL" ? <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} /></label> : null}
            <label>Message<textarea rows={6} value={body} onChange={e => setBody(e.target.value)} /></label>
            <div className={styles.card} aria-live="polite">
              <strong>Preview</strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{preview.text}</p>
              {selected.channel === "SMS" ? <p className={styles.muted}>{preview.text.length} characters (limit 320, checked with long sample details when saving)</p> : null}
              {preview.missing.length ? <p className={styles.warning}>Blank in Settings: {preview.missing.join(", ")}</p> : null}
            </div>
            <div className={styles.actions}>
              <button disabled={busy || (body === selected.body && subject === (selected.subject ?? ""))} onClick={() => void send({ action: "SAVE_TEMPLATE", key: selected.key, channel: selected.channel, language: selected.language, body, subject })}>Save as new draft</button>
              {selected.status !== "APPROVED" && body === selected.body ? <>
                {selected.language !== "EN" ? <label><input type="checkbox" checked={fluent} onChange={e => setFluent(e.target.checked)} /> A fluent speaker reviewed this</label> : null}
                <button className={styles.primary} disabled={busy || (selected.language !== "EN" && !fluent)} onClick={() => void send({ action: "APPROVE_TEMPLATE", templateId: selected.id, fluentReviewed: fluent })}>Approve</button>
              </> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
