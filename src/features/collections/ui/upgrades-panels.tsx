"use client";

import { useState } from "react";

import { formatCents } from "../domain/money-dates";
import { SKIP_STEP_LABELS, SKIP_STEPS } from "../domain/upgrades";
import type { getAccountUpgrades } from "../server/upgrades-service";
import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Upgrades = Awaited<ReturnType<typeof getAccountUpgrades>>;

const URGENCY_CLASS: Record<string, string> = { NOW: "badgeBad", TODAY: "badgeWarn", SOON: "", NONE: "badgeGood" };
const ADJ_TYPES = ["REPO_FEE", "STORAGE_FEE", "RETURNED_PAYMENT_FEE", "OTHER_FEE", "LATE_FEE_WAIVER", "GOODWILL_CREDIT", "OTHER_CREDIT"];
const STATUS_BADGE: Record<string, string> = { APPROVED: "badgeGood", APPLIED: "badgeGood", CONFIRMED_BY_IMPORT: "badgeGood", DECLINED: "badgeBad", NOT_FOUND_IN_IMPORT: "badgeBad", PENDING_APPROVAL: "badgeWarn", REQUESTED: "badgeWarn", POSTED_IN_DMS: "" };

function Badge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status];
  return <span className={`${styles.badge} ${cls ? styles[cls] : ""}`}>{label(status)}</span>;
}

/** "Do this next" and the risk score, shown at the top of the account page (spec 22.2). */
export function DoThisNext({ u }: { u: Upgrades }) {
  if (!u.insight) return null;
  const { next, score, factors } = u.insight;
  return (
    <section className={styles.panel} aria-labelledby="next-h">
      <div className={styles.split}>
        <div>
          <h2 id="next-h">Do this next</h2>
          <p><span className={`${styles.badge} ${URGENCY_CLASS[next.urgency] ? styles[URGENCY_CLASS[next.urgency]] : ""}`}>{next.urgency === "NONE" ? "No rush" : label(next.urgency)}</span> <strong>{next.action}</strong></p>
          <p className={styles.muted}>Why: {next.reason}</p>
        </div>
        <div>
          <h2>Risk score: {score} / 100</h2>
          {factors.length ? (
            <details><summary>What makes up the score</summary>
              <ul className={styles.timeline}>{factors.map(f => <li key={f.key}><strong>+{f.points}</strong> {f.label}: {f.detail}</li>)}</ul>
            </details>
          ) : <p className={styles.muted}>Nothing raising the risk right now.</p>}
        </div>
      </div>
    </section>
  );
}

export function ExtensionsAndFeesPanel({ d, u }: { d: AccountDetail; u: Upgrades }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const [adjType, setAdjType] = useState("REPO_FEE");
  const defaultFee = (u.feeDefaults as Record<string, number>)[adjType] ?? 0;
  return (
    <Panel id="extensions" title="Extensions, fees and credits">
      {feedback}
      <h3>Extension, deferral or due-date change</h3>
      <p className={styles.muted}>Anyone working Collections can request one. The owner approves, then it&apos;s entered in DealerCenter (a board task reminds you) and marked applied here.</p>
      {u.extensions.length ? (
        <ul className={styles.timeline}>
          {u.extensions.map(e => (
            <li key={e.id}>
              <Badge status={e.status} /> <strong>{label(e.type)}</strong>: {e.requestedTerms}{e.newDueDate ? ` (new due date ${e.newDueDate})` : ""} · {formatWhen(e.createdAt)}
              {!e.eligible ? <p className={styles.warning}>Doesn&apos;t meet the rules: {e.eligibilityNotes.join(" ")}</p> : null}
              {e.decisionReason ? <p className={styles.muted}>Decision: {e.decisionReason}{e.overrideReason ? ` · Override: ${e.overrideReason}` : ""}</p> : null}
              {u.canApproveMoney && e.status === "REQUESTED" ? (
                <form className={styles.form} onSubmit={event => void run("DECIDE_EXTENSION", { requestId: e.id, ...formValues(event) })}>
                  <label>Decision<select name="decision"><option value="APPROVE">Approve</option><option value="DECLINE">Decline</option></select></label>
                  <label>Reason<input name="reason" required minLength={3} /></label>
                  {!e.eligible ? <label className={styles.wide}>Why approve anyway (if approving)<input name="overrideReason" /></label> : null}
                  <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save decision</button></div>
                </form>
              ) : null}
              {u.canApproveMoney && e.status === "APPROVED" ? <div className={styles.actions}><button disabled={busy} onClick={() => void run("MARK_EXTENSION_APPLIED", { requestId: e.id })}>Entered in DealerCenter: mark applied</button></div> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void run("REQUEST_EXTENSION", formValues(event), () => f.reset()); }}>
        <label>Type<select name="type"><option value="EXTENSION">Extension</option><option value="DEFERRAL">Deferral</option><option value="DUE_DATE_CHANGE">Due-date change</option></select></label>
        <label>New due date (if any)<input type="date" name="newDueDate" /></label>
        <label className={styles.wide}>Requested terms<input name="requestedTerms" required minLength={5} placeholder="Move one payment to the end of the contract" /></label>
        <label className={styles.wide}>Reason<input name="reason" required minLength={5} placeholder="Customer was in the hospital" /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Request</button></div>
      </form>

      <h3>Fees and credits</h3>
      <p className={styles.muted}>{u.adjustmentApprovalThresholdCents > 0 ? `Amounts over ${formatCents(u.adjustmentApprovalThresholdCents)} need the owner's approval.` : "Every fee and credit needs the owner's approval."} DealerCenter is still the official record: after approval, post it there and mark it posted; the next imports confirm it. Minnesota fee limits: ask your attorney.</p>
      {u.adjustments.length ? (
        <ul className={styles.timeline}>
          {u.adjustments.map(a => (
            <li key={a.id}>
              <Badge status={a.status} /> <strong>{label(a.type)}</strong> {formatCents(a.amountCents)} · {a.reason} · {formatWhen(a.createdAt)}
              {a.resolutionNote ? <p className={a.status === "NOT_FOUND_IN_IMPORT" ? styles.warning : styles.muted}>{a.resolutionNote}</p> : null}
              {u.canApproveMoney && a.status === "PENDING_APPROVAL" ? (
                <form className={styles.actions} onSubmit={event => void run("DECIDE_ADJUSTMENT", { adjustmentId: a.id, ...formValues(event) })}>
                  <label>Decision<select name="decision"><option value="APPROVE">Approve</option><option value="DECLINE">Decline</option></select></label>
                  <label>Reason<input name="reason" required minLength={3} /></label>
                  <button className={styles.primary} disabled={busy}>Save</button>
                </form>
              ) : null}
              {u.canApproveMoney && a.status === "APPROVED" ? <div className={styles.actions}><button disabled={busy} onClick={() => void run("MARK_ADJUSTMENT_POSTED", { adjustmentId: a.id })}>Posted in DealerCenter</button></div> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void run("ADD_ADJUSTMENT", formValues(event), () => f.reset()); }}>
        <label>Kind<select name="type" value={adjType} onChange={e => setAdjType(e.target.value)}>{ADJ_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}</select></label>
        <label>Amount ($)<input name="amount" inputMode="decimal" required key={adjType} defaultValue={defaultFee ? (defaultFee / 100).toFixed(2) : ""} /></label>
        <label className={styles.wide}>Reason<input name="reason" required minLength={5} /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Add {adjType.endsWith("CREDIT") || adjType === "LATE_FEE_WAIVER" ? "credit" : "fee"}</button></div>
      </form>
    </Panel>
  );
}

export function SkipPanel({ d, u }: { d: AccountDetail; u: Upgrades }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const open = u.skipAlerts.find(s => s.status === "OPEN");
  return (
    <Panel id="skip" title="Possible skip and skip-trace checklist" open={Boolean(open) || d.activeFlags.some((f: { type: string }) => f.type === "SKIP")}>
      {feedback}
      {open ? (
        <div className={styles.card}>
          <p className={styles.warning}><strong>Possible skip:</strong> {open.reasons.join("; ")} (raised {formatWhen(open.raisedAt)})</p>
          <form className={styles.form} onSubmit={event => { event.preventDefault(); const v = new FormData(event.currentTarget); void run(String(v.get("decision")), { note: v.get("note") }); }}>
            <label>Decision<select name="decision"><option value="CONFIRM_SKIP">Confirm: it&apos;s a skip (sets the Skip flag)</option><option value="DISMISS_SKIP">Dismiss: not a skip</option></select></label>
            <label>Note<input name="note" required minLength={3} /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save</button></div>
          </form>
        </div>
      ) : <p className={styles.muted}>No open possible-skip alert. Alerts are raised automatically (no conversation with the customer for a while, disconnected or wrong number, returned mail, GPS no signal); a person always decides.</p>}
      <h3>Checklist</h3>
      <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void run("LOG_SKIP_TRACE", formValues(event), () => f.reset()); }}>
        <label>Step<select name="step">{SKIP_STEPS.map(s => <option key={s} value={s}>{SKIP_STEP_LABELS[s]}</option>)}</select></label>
        <label>Result<select name="result"><option value="DONE">Done</option><option value="FOUND">Found something</option><option value="NOTHING">Nothing found</option></select></label>
        <label className={styles.wide}>Notes (new phone or address go in Contact details too)<input name="notes" /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Save step</button></div>
      </form>
      {u.skipTrace.length ? <ul className={styles.timeline}>{u.skipTrace.map(s => <li key={s.id}>{SKIP_STEP_LABELS[s.step as keyof typeof SKIP_STEP_LABELS] ?? s.step} · {label(s.result)} · {formatWhen(s.createdAt)}{s.notes ? ` · ${s.notes}` : ""}</li>)}</ul> : null}
    </Panel>
  );
}

export function ChargeOffPanel({ d, u }: { d: AccountDetail; u: Upgrades }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const soldOrReturned = (d.repoCases as Array<{ status: string }>).some(c => ["SENT_TO_AUCTION", "RETURNED_TO_INVENTORY"].includes(c.status));
  const relevant = soldOrReturned || u.chargeOffs.length > 0 || u.recoveryOutcomes.length > 0 || d.account.daysPastDue >= u.chargeOffMinDaysPastDue;
  if (!relevant) return null;
  const openChargeOff = u.chargeOffs.find(c => c.status === "REQUESTED" || c.status === "APPROVED");
  return (
    <Panel id="chargeoff" title="Charge-off and recovery">
      {feedback}
      <p className={styles.muted}>Deficiency and surplus notices follow Minnesota rules: confirm with your attorney before contacting the customer about money owed after a repossession.</p>
      {u.recoveryOutcomes.map(o => (
        <p key={o.id}>Repo sale {formatCents(o.salePriceCents)} · costs {formatCents(o.costsCents)} · balance then {formatCents(o.balanceAtRepoCents)} → <strong>{o.deficiencyCents >= 0 ? `deficiency ${formatCents(o.deficiencyCents)}` : `surplus ${formatCents(-o.deficiencyCents)}`}</strong> ({formatWhen(o.createdAt)})</p>
      ))}
      {u.canApproveMoney && soldOrReturned ? (
        <details><summary>Record the sale and costs</summary>
          <form className={styles.form} onSubmit={event => void run("RECORD_RECOVERY_OUTCOME", formValues(event))}>
            <label>Sale price ($)<input name="salePrice" inputMode="decimal" required /></label>
            <label>Balance at repo ($, blank = latest import)<input name="balanceAtRepo" inputMode="decimal" /></label>
            <label>Repo cost ($)<input name="repoCost" inputMode="decimal" /></label>
            <label>Storage cost ($)<input name="storageCost" inputMode="decimal" /></label>
            <label>Auction cost ($)<input name="auctionCost" inputMode="decimal" /></label>
            <label>Other cost ($)<input name="otherCost" inputMode="decimal" /></label>
            <label className={styles.wide}>Notes<input name="notes" /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save</button></div>
          </form>
        </details>
      ) : null}
      {u.chargeOffs.map(c => (
        <div key={c.id} className={styles.card}>
          <p><Badge status={c.status} /> Charge-off {formatCents(c.amountCents)} · recovered {formatCents(c.recoveredCents)} · {c.reason}</p>
          {u.canApproveMoney && c.status === "REQUESTED" ? (
            <form className={styles.actions} onSubmit={event => void run("DECIDE_CHARGE_OFF", { chargeOffId: c.id, ...formValues(event) })}>
              <label>Decision<select name="decision"><option value="APPROVE">Approve</option><option value="DECLINE">Decline</option></select></label>
              <label>Reason<input name="reason" required minLength={3} /></label>
              <button className={styles.primary} disabled={busy}>Save</button>
            </form>
          ) : null}
          {c.status === "APPROVED" ? (
            <>
              {c.payments.length ? <ul>{c.payments.map(p => <li key={p.id}>{formatCents(p.amountCents)} on {p.receivedDate} ({label(p.method)})</li>)}</ul> : null}
              {u.canApproveMoney ? (
                <form className={styles.actions} onSubmit={event => { const f = event.currentTarget; void run("RECORD_RECOVERY_PAYMENT", { chargeOffId: c.id, ...formValues(event) }, () => f.reset()); }}>
                  <label>Recovery payment ($)<input name="amount" inputMode="decimal" required /></label>
                  <label>Received<input type="date" name="receivedDate" /></label>
                  <label>How<input name="method" placeholder="Cash, check, Zelle" /></label>
                  <button disabled={busy}>Record</button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      ))}
      {!openChargeOff ? (
        <form className={styles.form} onSubmit={event => void run("REQUEST_CHARGE_OFF", formValues(event))}>
          <label>Amount ($, blank = deficiency or balance)<input name="amount" inputMode="decimal" /></label>
          <label>Reason<input name="reason" required minLength={5} /></label>
          {d.account.daysPastDue < u.chargeOffMinDaysPastDue ? <label className={styles.wide}>Why before {u.chargeOffMinDaysPastDue} days past due<input name="overrideReason" required minLength={10} /></label> : null}
          <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Request charge-off</button></div>
        </form>
      ) : null}
    </Panel>
  );
}
