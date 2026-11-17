"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { formatCents } from "../domain/money-dates";
import { STATUS_LABELS, type AccountStatus } from "../domain/status";
import type { getAccountLedger } from "../server/ledger-service";
import type { getAccountUpgrades } from "../server/upgrades-service";
import { ACCOUNT_VIEWS, type AccountView } from "./account-views";
import { DetailsPanel, FlagsPanel, InTabContext, LogContactPanel, MoneyPanel, Timeline, type AccountDetail } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import { accountRefs, formatDay, formatPhone } from "../domain/account-ref";
import styles from "./collections.module.css";
import { InsurancePanel } from "./insurance-panel";
import { LedgerPanel } from "./ledger-panel";
import { MessagesPanel } from "./messages-panel";
import { PromisesPanel } from "./promises-panel";
import { RecoveryPanel } from "./recovery-panel";
import { ChargeOffPanel, ExtensionsAndFeesPanel, SkipPanel } from "./upgrades-panels";


type Nav = { from: string; position: number | null; total: number; prevId: string | null; nextId: string | null };

const INSURANCE_TONE: Record<string, string> = { VERIFIED: "chipGood", EXPIRING_SOON: "chipWarn", EXPIRED: "chipDanger", MISSING: "chipDanger" };

export function AccountShell({ d, u, l, initialView, initialLog, nav }: {
  d: AccountDetail; u: Awaited<ReturnType<typeof getAccountUpgrades>>; l: Awaited<ReturnType<typeof getAccountLedger>>;
  initialView: AccountView; initialLog: string; nav: Nav;
}) {
  const [view, setView] = useState<AccountView>(initialView);
  const [logChannel, setLogChannel] = useState(initialLog);
  const a = d.account;
  const name = d.customer?.displayName ?? a.buyerNameRaw;
  const frozen = d.activeFlags.some((f: { type: string }) => f.type === "BANKRUPTCY");
  const dpd: number = d.snapshot?.daysPastDue ?? a.daysPastDue ?? 0;
  const due: number = d.snapshot?.amountDueCents ?? a.amountDueCents ?? 0;
  const insurance: string = d.insurance?.effectiveStatus ?? (d.insurance ? d.insurance.status : "NONE");
  const phone: string | null = a.primaryPhone ?? null;
  const collector = d.collectors.find((c: { id: string }) => c.id === a.assignedCollectorUserId)?.name ?? "Unassigned";
  const smsConsents = (d.consents as Array<{ channel: string; status: string; recordedAt: string }>).filter(c => c.channel === "SMS").sort((x, y) => y.recordedAt.localeCompare(x.recordedAt));
  const textsAllowed = smsConsents[0]?.status !== "REVOKED";
  const qs = (id: string) => `/collections/accounts/${id}?from=${encodeURIComponent(nav.from)}`;
  const go = (next: AccountView, anchor?: string) => {
    setView(next);
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const next = u.insight?.next;
  const score = u.insight?.score ?? null;

  const panels: Record<AccountView, ReactNode> = {
    overview: (
      <>
        <MoneyPanel d={d} />
        <section className={styles.panel} aria-labelledby="recent-h">
          <h2 id="recent-h">Recent activity</h2>
          {d.timeline.length ? (
            <ol className={styles.timeline}>
              {d.timeline.slice(0, 6).map((t: { id: string; at: string; title: string; by?: string | null }) => <li key={t.id}><time dateTime={t.at}>{formatWhen(t.at)}</time> · {t.title}{t.by ? <small> · {t.by}</small> : null}</li>)}
            </ol>
          ) : <p className={styles.muted}>Nothing has happened on this account yet.</p>}
          {d.timeline.length > 6 ? <button type="button" className={styles.linkButton} onClick={() => go("history")}>See full history</button> : null}
        </section>
      </>
    ),
    contact: <><LogContactPanel key={logChannel} d={d} initialChannel={logChannel || "CALL_OUT"} /><MessagesPanel d={d} /></>,
    promises: <><PromisesPanel d={d} /><ExtensionsAndFeesPanel d={d} u={u} /></>,
    insurance: <InsurancePanel d={d} />,
    recovery: <><RecoveryPanel d={d} /><SkipPanel d={d} u={u} /><ChargeOffPanel d={d} u={u} /></>,
    ledger: <LedgerPanel d={d} l={l} />,
    details: <><FlagsPanel d={d} /><DetailsPanel d={d} /></>,
    history: <Timeline d={d} />
  };

  return (
    <>
      <div className={styles.topbar}>
        <Link href={`/collections/queue?tab=${encodeURIComponent(nav.from)}`}>← Back to queue</Link>
        {nav.position ? (
          <span className={styles.actions}>
            <span className={styles.muted}>{nav.position} of {nav.total} in this queue</span>
            {nav.prevId ? <Link className={styles.button} href={qs(nav.prevId)} aria-label="Previous account">↑ Previous</Link> : null}
            {nav.nextId ? <Link className={`${styles.button} ${styles.primary}`} href={qs(nav.nextId)} aria-label="Next account">Next account ↓</Link> : null}
          </span>
        ) : null}
      </div>

      {frozen ? <p className={styles.freeze} role="alert">Bankruptcy freeze: no texts, emails, starter disables, repossession steps or letters. Review with your bankruptcy attorney before doing anything.</p> : null}
      {a.missingFromImportAt ? <p className={styles.warning}>This account wasn&apos;t in the latest DealerCenter import. <button type="button" className={styles.linkButton} onClick={() => go("details")}>Confirm whether it was paid off, closed, or is still active</button>.</p> : null}

      <section className={styles.strip} aria-label="Account summary">
        <div className={styles.nameBlock}>
          <strong>{name}</strong>
          {[accountRefs(a), a.accountType === "BHPH" ? "BHPH" : "Lease-to-own"].filter(Boolean).join(" · ")}
        </div>
        <div><span className={styles.stripLabel}>Status</span><span className={`${styles.chip} ${dpd >= 30 ? styles.chipDanger : dpd > 0 ? styles.chipWarn : styles.chipGood}`}>{dpd > 0 ? `${dpd} days late` : "Current"}</span><div className={styles.callSub}>{STATUS_LABELS[a.status as AccountStatus] ?? a.status}</div></div>
        <div><span className={styles.stripLabel}>Amount due</span><span className={styles.stripValue}>{formatCents(due)}</span></div>
        <div><span className={styles.stripLabel}>Next due</span><span className={styles.stripValue} style={{ fontSize: 15 }}>{formatDay(d.snapshot?.paymentDueDate)}</span></div>
        <div><span className={styles.stripLabel}>Insurance</span><span className={`${styles.chip} ${INSURANCE_TONE[insurance] ? styles[INSURANCE_TONE[insurance]] : styles.chipNeutral}`}>{insurance === "NONE" || insurance === "UNKNOWN" ? "Not on file" : label(insurance)}</span></div>
      </section>

      <div className={styles.actionBar} role="toolbar" aria-label="Account actions">
        {phone && !frozen ? <a className={`${styles.button} ${styles.primary}`} href={`tel:${phone}`} onClick={() => { setLogChannel("CALL_OUT"); go("contact", "log"); }}>Call</a> : null}
        {!frozen ? <button type="button" onClick={() => go("contact", "message")}>Text</button> : null}
        <button type="button" onClick={() => { setLogChannel("CALL_OUT"); go("contact", "log"); }}>Log contact</button>
        {!frozen ? <button type="button" onClick={() => go("promises", "promise")}>Promise</button> : null}
        <button type="button" onClick={() => go("promises", "promise")}>Customer paid</button>
        <details className={styles.menu}>
          <summary>More actions ▾</summary>
          <div className={styles.menuList}>
            <button type="button" onClick={() => go("insurance")}>Insurance</button>
            <button type="button" onClick={() => go("promises", "extensions")}>Extension, fee or credit</button>
            <button type="button" onClick={() => go("recovery")}>Starter disable or repo</button>
            <button type="button" onClick={() => go("recovery", "skip")}>Skip-trace checklist</button>
            <button type="button" onClick={() => go("details")}>Flags and contact details</button>
            <button type="button" onClick={() => go("ledger")}>Servicing ledger</button>
            <button type="button" onClick={() => go("history")}>Full history</button>
          </div>
        </details>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.aside} aria-label="Customer and vehicle">
          <h2>Customer</h2>
          <dl>
            <dt>Mobile</dt><dd>{phone ? <a href={`tel:${phone}`}>{formatPhone(phone)}</a> : "Not on file"}</dd>
            <dt>Email</dt><dd>{a.primaryEmail ?? "Not on file"}</dd>
            <dt>Language</dt><dd>{({ EN: "English", ES: "Spanish", SO: "Somali", SW: "Swahili" } as Record<string, string>)[a.preferredLanguage] ?? a.preferredLanguage}</dd>
            <dt>Texts</dt><dd>{textsAllowed ? "Allowed" : <span className={styles.reasonDanger}>Opted out (STOP)</span>}</dd>
            <dt>Collector</dt><dd>{collector}</dd>
            <dt>Last contact</dt><dd>{formatWhen(a.lastContactAt)}</dd>
            {d.customer ? null : <><dt>Customer record</dt><dd><button type="button" className={styles.linkButton} onClick={() => go("details")}>Not linked: link now</button></dd></>}
          </dl>
          <h2>Vehicle</h2>
          <dl>
            <dt>Vehicle</dt><dd>{d.vehicle ? <Link href={`/vehicles/360/${d.vehicle.id}`}>{[d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(" ") || d.vehicle.vehicleNumber}</Link> : a.vehicleDescriptionRaw ?? "—"}</dd>
            <dt>Stock / VIN</dt><dd>{a.stockNumberRaw ?? "—"}{a.vin ? ` · ${a.vin}` : ""}</dd>
            <dt>GPS</dt><dd>{a.gpsDeviceSerial ? `Device ${a.gpsDeviceSerial}` : "Serial not on file"} · {a.gpsDisclosedInContract === true ? "disclosed" : a.gpsDisclosedInContract === false ? "not disclosed" : "disclosure not checked"}</dd>
          </dl>
          {d.activeFlags.length ? (
            <>
              <h2>Flags</h2>
              <p>{d.activeFlags.map((f: { id: string; type: string; scope: string | null }) => <span key={f.id} className={`${styles.badge} ${f.type === "BANKRUPTCY" ? styles.badgePurple : styles.badgeWarn}`} style={{ margin: 2 }}>{label(f.type)}{f.scope ? `: ${label(f.scope)}` : ""}</span>)}</p>
            </>
          ) : null}
          <button type="button" onClick={() => go("details")}>Edit details</button>
        </aside>

        <div style={{ minWidth: 0 }}>
          {next ? (
            <section className={styles.nextCard} aria-label="Do this next">
              <div>
                <small>Do this next</small>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{next.action}</div>
                <div className={styles.callSub}>{next.reason}</div>
              </div>
              {score !== null ? (
                <div>
                  <small>Risk</small>
                  <div className={`${styles.riskBig} ${score >= 60 ? styles.riskHigh : score >= 30 ? styles.riskMid : styles.riskLow}`}>{score}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          <div role="tablist" aria-label="Account sections" className={styles.tabbar}>
            {ACCOUNT_VIEWS.map(([key, text]) => (
              <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={view === key} aria-controls={`view-${key}`} tabIndex={view === key ? 0 : -1} onClick={() => setView(key)}>{text}</button>
            ))}
          </div>
          <InTabContext.Provider value={true}>
            {ACCOUNT_VIEWS.map(([key]) => (
              <div key={key} role="tabpanel" id={`view-${key}`} aria-labelledby={`tab-${key}`} hidden={view !== key} className={styles.tabPanel}>
                {view === key ? panels[key] : null}
              </div>
            ))}
          </InTabContext.Provider>
        </div>
      </div>
    </>
  );
}
