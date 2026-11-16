"use client";

import { useState } from "react";

import { formatCents } from "../domain/money-dates";
import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Starter = { id: string; action: string; status: string; reason: string; warningMethod: string | null; warningSentAt: string | null; warningMessageId: string | null; deviceSerial: string | null; requestedAt: string; approvedAt: string | null; performedInPortalAt: string | null };
type Letter = { id: string; templateKey: string; repoCaseId: string | null; documentId: string | null; isDraftWording: boolean; sentAt: string | null; sentMethod: string | null; certifiedTrackingNumber: string | null; createdAt: string };
type RepoCase = { id: string; status: string; vendorName: string | null; storageLocation: string | null; storageFeeCents: number | null; repoFeeCents: number | null; personalPropertyNotes: string | null; assignedAt: string | null; recoveredAt: string | null; outcomeNotes: string | null; outcomeAt: string | null; inventoryTaskId: string | null };

const OPEN_REPO = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"];

function docLink(accountId: string, documentId: string | null) {
  return documentId ? `/api/collections/accounts/${encodeURIComponent(accountId)}/documents/${encodeURIComponent(documentId)}` : null;
}

/** Account page: starter disable/enable, repo case with TLC Recovery, and repo letters. */
export function RecoveryPanel({ d }: { d: AccountDetail }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [warningMethod, setWarningMethod] = useState("TEXT");
  const a = d.account;
  const isAdmin = Boolean(d.permissions?.isAdmin);
  const frozen = d.activeFlags.some((f: { type: string }) => f.type === "BANKRUPTCY");
  const starters = d.starterActions as Starter[];
  const latestDone = starters.find(s => s.status === "DONE_IN_PORTAL");
  const disabled = latestDone?.action === "DISABLE";
  const open = starters.find(s => s.status === "REQUESTED" || s.status === "APPROVED");
  const cases = d.repoCases as RepoCase[];
  const openCase = cases.find(c => OPEN_REPO.includes(c.status));
  const letters = d.letters as Letter[];
  const act = async (action: string, values: Record<string, unknown>, after?: () => void) => {
    const result = await run(action, values, after) as { warnings?: string[]; portalUrl?: string | null } | null;
    setWarnings(result?.warnings ?? []);
    return result;
  };
  const openPromises = d.openPromises?.length ?? 0;

  return (
    <Panel id="recovery" title="Starter disable, repossession and letters">
      {feedback}
      {warnings.map(w => <p key={w} className={styles.warning}>{w}</p>)}
      {frozen ? <p className={styles.freeze}>Bankruptcy freeze: no starter disables, repossession steps or letters. Re-enabling a starter is still allowed.</p> : null}

      <h3>Starter (Advantage GPS)</h3>
      <p>
        Starter is <strong>{disabled ? "DISABLED" : "enabled"}</strong>{latestDone?.performedInPortalAt ? ` (since ${formatWhen(latestDone.performedInPortalAt)})` : ""}
        {" · "}Device: {a.gpsDeviceSerial ?? "serial not on file"}
        {" · "}GPS disclosed in contract: {a.gpsDisclosedInContract === true ? "yes" : a.gpsDisclosedInContract === false ? <strong>no</strong> : "not checked"}
      </p>
      {d.gpsPortalUrl ? <p><a href={d.gpsPortalUrl} target="_blank" rel="noreferrer noopener">Open the Advantage GPS portal ↗</a></p> : <p className={styles.muted}>Add the Advantage portal link in Collections Settings to get a button here.</p>}
      <p className={styles.muted}>Nothing here touches the device. A person approves, then disables or enables it in the Advantage portal, then records it here.</p>

      {open ? (
        <div className={styles.card}>
          <p><strong>{open.action === "DISABLE" ? "Disable" : "Enable"} request: {label(open.status)}</strong> · {open.reason} · requested {formatWhen(open.requestedAt)}</p>
          {open.action === "DISABLE" ? <p>Warning: {label(open.warningMethod)}{open.warningSentAt ? ` on ${formatWhen(open.warningSentAt)}` : ""}</p> : null}
          <div className={styles.actions}>
            {isAdmin && open.status === "REQUESTED" ? <button className={styles.primary} disabled={busy || (frozen && open.action === "DISABLE")} onClick={() => void act("APPROVE_STARTER", { actionId: open.id })}>Approve</button> : null}
            {isAdmin && open.action === "DISABLE" && !frozen ? <button disabled={busy} onClick={() => void act("SEND_DISABLE_WARNING", { actionId: open.id })}>Send warning text (review first in the Text panel)</button> : null}
          </div>
          {isAdmin && open.status === "APPROVED" ? (
            <form className={styles.form} onSubmit={event => void act("STARTER_DONE_IN_PORTAL", { actionId: open.id, ...formValues(event) })}>
              <label>Device serial<input name="deviceSerial" defaultValue={open.deviceSerial ?? a.gpsDeviceSerial ?? ""} /></label>
              <label>Notes<input name="notes" /></label>
              <label className={styles.wide}><input type="checkbox" name="confirmed" value="true" required /> I {open.action === "DISABLE" ? "disabled" : "enabled"} the starter in the Advantage portal.</label>
              <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Done in portal</button></div>
            </form>
          ) : null}
          <form className={styles.actions} onSubmit={event => void act("CANCEL_STARTER", { actionId: open.id, ...formValues(event) })}>
            <label className={styles.srOnly} htmlFor={`cancel-starter-${open.id}`}>Reason for cancelling</label>
            <input id={`cancel-starter-${open.id}`} name="reason" placeholder="Reason to cancel" minLength={5} required /><button disabled={busy}>Cancel request</button>
          </form>
        </div>
      ) : disabled ? (
        <form className={styles.form} onSubmit={event => void act("REQUEST_STARTER", { kind: "ENABLE", ...formValues(event) })}>
          <label className={styles.wide}>Why re-enable<input name="reason" placeholder="Paid $300 / new plan / redeemed" /></label>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Request re-enable</button></div>
        </form>
      ) : !frozen ? (
        <form className={styles.form} onSubmit={event => void act("REQUEST_STARTER", { kind: "DISABLE", ...formValues(event) })}>
          <div className={`${styles.card} ${styles.wide}`}>
            <strong>Before you request a disable:</strong> {a.daysPastDue} days past due · {formatCents(a.amountDueCents)} due · last contact {formatWhen(a.lastContactAt)} · {openPromises} open promise{openPromises === 1 ? "" : "s"} · insurance {label(d.insurance?.effectiveStatus ?? "UNKNOWN")}
            {a.gpsDisclosedInContract !== true ? <p className={styles.warning}>The contract isn&apos;t marked as disclosing the GPS starter interrupt. Check it first.</p> : null}
          </div>
          <label>How was the customer warned?<select name="warningMethod" value={warningMethod} onChange={e => setWarningMethod(e.target.value)}>
            <option value="TEXT">Text</option><option value="CALL">Call</option><option value="DEVICE_BEEP">Device beep</option><option value="NONE">No warning</option>
          </select></label>
          {warningMethod !== "NONE" ? <label>Warning date<input type="date" name="warningDate" required /></label> : null}
          {warningMethod === "NONE" ? <p className={`${styles.warning} ${styles.wide}`}>No warning: check Minnesota notice requirements with your attorney. A reason is required.</p> : null}
          <label className={styles.wide}>Reason{warningMethod === "NONE" ? " (required)" : ""}<input name="reason" minLength={warningMethod === "NONE" ? 10 : 0} required={warningMethod === "NONE"} /></label>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Request disable</button></div>
        </form>
      ) : null}

      <h3>Repossession (TLC Recovery)</h3>
      {openCase ? (
        <div className={styles.card}>
          <p><strong>{label(openCase.status)}</strong>{openCase.vendorName ? ` · ${openCase.vendorName}` : ""}{openCase.assignedAt ? ` · assigned ${formatWhen(openCase.assignedAt)}` : ""}{openCase.recoveredAt ? ` · recovered ${formatWhen(openCase.recoveredAt)}` : ""}</p>
          {openCase.storageLocation ? <p>Storage: {openCase.storageLocation}{openCase.storageFeeCents != null ? ` · storage fee ${formatCents(openCase.storageFeeCents)}` : ""}{openCase.repoFeeCents != null ? ` · repo fee ${formatCents(openCase.repoFeeCents)}` : ""}</p> : null}
          {openCase.personalPropertyNotes ? <p>Personal property: {openCase.personalPropertyNotes}</p> : null}
          {isAdmin ? (
            <div className={styles.actions}>
              {openCase.status === "REVIEW" ? <button disabled={busy || frozen} onClick={() => void act("APPROVE_REPO", { caseId: openCase.id })}>Approve repo</button> : null}
              {["REVIEW", "APPROVED"].includes(openCase.status) ? <button className={styles.primary} disabled={busy || frozen} onClick={() => void act("ASSIGN_REPO_TLC", { caseId: openCase.id })}>Assign to TLC Recovery</button> : null}
            </div>
          ) : null}
          {isAdmin && ["ASSIGNED", "LOCATED", "RECOVERED"].includes(openCase.status) ? (
            <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void act("UPDATE_REPO", { caseId: openCase.id, ...formValues(event) }, () => f.reset()); }}>
              <label>New status<select name="status">{["LOCATED", "RECOVERED", "IN_STORAGE"].filter(s => ["ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"].indexOf(s) > ["ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"].indexOf(openCase.status)).map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
              <label>Storage location<input name="storageLocation" /></label>
              <label>Repo fee ($)<input name="repoFee" inputMode="decimal" /></label>
              <label>Storage fee ($)<input name="storageFee" inputMode="decimal" /></label>
              <label className={styles.wide}>Personal property in the vehicle<input name="personalPropertyNotes" /></label>
              <label className={styles.wide}>Notes (also posted on the board task)<input name="notes" /></label>
              <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Update repo status</button></div>
            </form>
          ) : null}
          {isAdmin && ["RECOVERED", "IN_STORAGE"].includes(openCase.status) ? (
            <form className={styles.form} onSubmit={event => void act("REPO_OUTCOME", { caseId: openCase.id, ...formValues(event) })}>
              <label>Outcome<select name="outcome"><option value="REDEEMED">Redeemed (customer got it back)</option><option value="RETURNED_TO_INVENTORY">Returned to inventory</option><option value="SENT_TO_AUCTION">Sent to auction</option></select></label>
              <label>Notes<input name="notes" /></label>
              <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Record outcome</button></div>
            </form>
          ) : null}
          <form className={styles.actions} onSubmit={event => void act("CANCEL_REPO", { caseId: openCase.id, ...formValues(event) })}>
            <label className={styles.srOnly} htmlFor={`cancel-repo-${openCase.id}`}>Reason for cancelling the repo</label>
            <input id={`cancel-repo-${openCase.id}`} name="reason" placeholder="Reason to cancel (e.g. paid in full)" minLength={5} required disabled={!isAdmin} /><button disabled={busy || !isAdmin}>Cancel repo case</button>
          </form>
        </div>
      ) : !frozen ? (
        <form className={styles.form} onSubmit={event => void act("START_REPO_REVIEW", formValues(event))}>
          <label className={styles.wide}>Reason to start a repo review<input name="reason" required minLength={5} placeholder={`${a.daysPastDue} days past due, no contact`} /></label>
          <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Start repo review</button></div>
        </form>
      ) : null}
      {cases.filter(c => !OPEN_REPO.includes(c.status)).map(c => <p key={c.id} className={styles.muted}>Earlier case: {label(c.status)} {c.outcomeAt ? `on ${formatWhen(c.outcomeAt)}` : ""} {c.outcomeNotes ? `· ${c.outcomeNotes}` : ""}</p>)}

      <h3>Repo letters</h3>
      <p className={styles.muted}>Letters print with a red DRAFT banner until your attorney&apos;s approved wording is added in Settings. Drafts can&apos;t be recorded as sent.</p>
      {isAdmin && !frozen ? (
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => void act("GENERATE_LETTER", { templateKey: "PRE_REPO_NOTICE", repoCaseId: openCase?.id ?? "" })}>Generate pre-repo notice</button>
          <button disabled={busy} onClick={() => void act("GENERATE_LETTER", { templateKey: "POST_REPO_NOTICE", repoCaseId: openCase?.id ?? "" })}>Generate post-repo notice</button>
        </div>
      ) : null}
      {letters.length ? (
        <ul className={styles.timeline} aria-label="Letter checklist">
          {letters.map(l => {
            const href = docLink(a.id, l.documentId);
            return (
              <li key={l.id}>
                <strong>{label(l.templateKey)}</strong> · generated {formatWhen(l.createdAt)} {l.isDraftWording ? <span className={`${styles.badge} ${styles.badgeBad}`}>DRAFT wording</span> : null}
                {href ? <> · <a href={href} target="_blank" rel="noreferrer">Open PDF</a></> : null}
                {l.sentAt ? <> · <span className={`${styles.badge} ${styles.badgeGood}`}>Sent {label(l.sentMethod)} {formatWhen(l.sentAt)}{l.certifiedTrackingNumber ? ` · #${l.certifiedTrackingNumber}` : ""}</span></> : null}
                {isAdmin && !l.sentAt && !l.isDraftWording ? (
                  <form className={styles.actions} onSubmit={event => void act("RECORD_LETTER_SENT", { letterId: l.id, ...formValues(event) })}>
                    <label>Sent by<select name="sentMethod"><option value="CERTIFIED">Certified mail</option><option value="FIRST_CLASS">First class</option><option value="HAND_DELIVERED">Hand delivered</option><option value="EMAIL">Email</option></select></label>
                    <label>Tracking #<input name="trackingNumber" /></label>
                    <label>Date sent<input type="date" name="sentDate" /></label>
                    <button disabled={busy}>Record as sent</button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className={styles.muted}>No letters yet.</p>}
    </Panel>
  );
}
