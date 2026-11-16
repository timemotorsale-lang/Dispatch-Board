"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { formatCents } from "../domain/money-dates";
import { BUCKET_LABELS, STATUS_LABELS, type AccountStatus, type Bucket } from "../domain/status";
import { accountAction, callCollections, formatWhen, label, uploadAccountDocument } from "./client-api";
import styles from "./collections.module.css";

// The detail shape comes from getAccountDetail(); kept loose here so later stages can add fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AccountDetail = any;

const CHANNELS = ["CALL_OUT", "CALL_IN", "TEXT_OUT", "TEXT_IN", "EMAIL_OUT", "EMAIL_IN", "IN_PERSON", "LETTER", "VOICEMAIL"];
const OUTCOMES = ["NO_ANSWER", "LEFT_MESSAGE", "SPOKE_WITH_CUSTOMER", "WRONG_NUMBER", "DISCONNECTED", "PROMISE_MADE", "PLAN_MADE", "PAYMENT_REPORTED", "REFUSED", "DISPUTE", "HARDSHIP", "REQUESTED_NO_CONTACT", "ATTORNEY_REFERRED", "BANKRUPTCY_REPORTED", "OTHER"];
const FLAGS = ["BANKRUPTCY", "ATTORNEY_REPRESENTED", "CONTACT_RESTRICTED", "DISPUTE", "DECEASED", "SKIP", "DO_NOT_REPO_REVIEW_HOLD"];
const SCOPES = ["NO_TEXT", "NO_CALL", "NO_EMAIL", "NO_CONTACT", "ATTORNEY_ONLY"];

/** Small hook: run an action, show the result, refresh server data. */
export function useAccountAction(accountId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(action: string, values: Record<string, unknown>, onDone?: () => void) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await accountAction(accountId, action, values);
      setMessage(result.message);
      onDone?.();
      router.refresh();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally { setBusy(false); }
  }
  const feedback = <>{error ? <p className={styles.error} role="alert">{error}</p> : null}{message ? <p className={styles.notice} role="status">{message}</p> : null}</>;
  return { busy, run, feedback, setError };
}

export function formValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
}

export function Panel({ id, title, children, open = true }: { id?: string; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className={styles.panel} id={id} open={open}>
      <summary><h2 style={{ display: "inline" }}>{title}</h2></summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

function Header({ d }: { d: AccountDetail }) {
  const a = d.account;
  const frozen = d.activeFlags.some((f: { type: string }) => f.type === "BANKRUPTCY");
  return (
    <section className={styles.panel} aria-label="Account summary">
      {frozen ? <p className={styles.freeze} role="alert">BANKRUPTCY FREEZE: no texts, emails, starter disables, repossession steps or letters. Review with your bankruptcy attorney before doing anything.</p> : null}
      {a.missingFromImportAt ? <p className={styles.warning}>This account was not in the latest DealerCenter import. Confirm below whether it was paid off, closed, or is still active.</p> : null}
      <div className={styles.split}>
        <dl className={styles.dl}>
          <dt>Customer</dt><dd>{d.customer ? d.customer.displayName : a.buyerNameRaw}{!d.customer ? <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: 6 }}>not linked</span> : null}</dd>
          <dt>Vehicle</dt><dd>{d.vehicle ? <Link href={`/vehicles/360/${d.vehicle.id}`}>{[d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(" ") || d.vehicle.vehicleNumber}</Link> : a.vehicleDescriptionRaw ?? "—"} {a.stockNumberRaw ? `· Stock ${a.stockNumberRaw}` : ""}</dd>
          <dt>Deal # / Account</dt><dd>{a.dealNumber ?? "—"} · {a.externalAccountId}</dd>
          <dt>Type</dt><dd>{a.accountType === "BHPH" ? "BHPH" : "Lease-to-own"}</dd>
          <dt>Status</dt><dd>{STATUS_LABELS[a.status as AccountStatus] ?? a.status} · {BUCKET_LABELS[a.bucket as Bucket]}</dd>
          <dt>Collector</dt><dd>{d.collectors.find((c: { id: string }) => c.id === a.assignedCollectorUserId)?.name ?? "Unassigned"}</dd>
        </dl>
        <div>
          {d.activeFlags.length ? d.activeFlags.map((f: { id: string; type: string; scope: string | null }) => <span key={f.id} className={`${styles.badge} ${f.type === "BANKRUPTCY" ? styles.badgePurple : styles.badgeWarn}`} style={{ margin: 2 }}>{label(f.type)}{f.scope ? `: ${label(f.scope)}` : ""}</span>) : <span className={styles.muted}>No flags</span>}
          <p className={styles.muted}>Last contact: {formatWhen(a.lastContactAt)}</p>
        </div>
      </div>
    </section>
  );
}

function MoneyPanel({ d }: { d: AccountDetail }) {
  const s = d.snapshot;
  if (!s) return <section className={styles.panel}><h2>Money</h2><p className={styles.empty}>No DealerCenter data yet.</p></section>;
  return (
    <section className={styles.panel} aria-labelledby="money-heading">
      <h2 id="money-heading">Money</h2>
      <div className={styles.tiles}>
        <div className={styles.tile}>Total balance<strong>{formatCents(s.totalBalanceCents)}</strong></div>
        <div className={styles.tile}>Amount due<strong>{formatCents(s.amountDueCents)}</strong></div>
        <div className={styles.tile}>Days past due<strong>{s.daysPastDue}</strong></div>
        <div className={styles.tile}>Late fees<strong>{formatCents(s.lateCents)}</strong></div>
        <div className={styles.tile}>Due date<strong>{s.paymentDueDate ?? "—"}</strong></div>
        <div className={styles.tile}>Payments left<strong>{s.paymentsRemaining ?? "—"}</strong></div>
      </div>
      <details>
        <summary>Balance breakdown</summary>
        <dl className={styles.dl}>
          <dt>Down</dt><dd>{formatCents(s.downCents)}</dd><dt>Principal</dt><dd>{formatCents(s.principalCents)}</dd><dt>Interest</dt><dd>{formatCents(s.interestCents)}</dd>
          <dt>Other</dt><dd>{formatCents(s.otherCents)}</dd><dt>Late</dt><dd>{formatCents(s.lateCents)}</dd><dt>Side note</dt><dd>{formatCents(s.sideNoteCents)}</dd><dt>Credit</dt><dd>{formatCents(s.creditCents)}</dd>
          <dt>Payment</dt><dd>{formatCents(s.paymentAmountCents)}</dd><dt>Autopay</dt><dd>{s.dmsAutopayStatus ?? "—"}</dd>
        </dl>
      </details>
      <p className={styles.muted}>Data as of {s.asOfDate} (DealerCenter import). DealerCenter is still the official record.</p>
    </section>
  );
}

function LogContactPanel({ d, initialChannel }: { d: AccountDetail; initialChannel: string }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  return (
    <Panel id="log" title="Log a contact" open={Boolean(initialChannel)}>
      {feedback}
      <form className={styles.form} onSubmit={event => { const form = event.currentTarget; const v = formValues(event); void run("LOG_CONTACT", v, () => form.reset()); }}>
        <label>How<select name="channel" defaultValue={initialChannel && CHANNELS.includes(initialChannel) ? initialChannel : "CALL_OUT"}>{CHANNELS.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></label>
        <label>Result<select name="outcome" defaultValue="NO_ANSWER">{OUTCOMES.map(o => <option key={o} value={o}>{label(o)}</option>)}</select></label>
        <label>Number or email used<input name="contactPoint" defaultValue={d.account.primaryPhone ?? ""} /></label>
        <label>When<input type="datetime-local" name="occurredAt" /></label>
        <label className={styles.wide}>Notes<textarea name="notes" /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save contact</button></div>
      </form>
    </Panel>
  );
}

function FlagsPanel({ d }: { d: AccountDetail }) {
  const { busy, run, feedback, setError } = useAccountAction(d.account.id);
  const [type, setType] = useState("DISPUTE");
  const [clearing, setClearing] = useState<string | null>(null);
  async function clear(event: FormEvent<HTMLFormElement>, flag: { id: string; type: string }) {
    const form = event.currentTarget;
    const v = formValues(event);
    let documentId: string | undefined;
    const file = (form.elements.namedItem("document") as HTMLInputElement | null)?.files?.[0];
    if (flag.type === "BANKRUPTCY") {
      if (!file) { setError("Attach the court order, dismissal, discharge or attorney note."); return; }
      try { documentId = (await uploadAccountDocument(d.account.id, file, "BANKRUPTCY_CLEARANCE")).documentId; }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); return; }
    }
    await run("CLEAR_FLAG", { flagId: flag.id, reason: v.reason, documentId }, () => setClearing(null));
  }
  return (
    <Panel id="flags" title="Flags" open={d.activeFlags.length > 0}>
      {feedback}
      {d.activeFlags.length ? (
        <ul className={styles.timeline}>
          {d.activeFlags.map((f: { id: string; type: string; scope: string | null; setAt: string; setReason: string; attorneyName: string | null; bankruptcyCaseNumber: string | null }) => (
            <li key={f.id}>
              <strong>{label(f.type)}</strong>{f.scope ? ` (${label(f.scope)})` : ""} since {formatWhen(f.setAt)}. {f.setReason}
              {f.attorneyName ? <> · Attorney: {f.attorneyName}</> : null}{f.bankruptcyCaseNumber ? <> · Case {f.bankruptcyCaseNumber}</> : null}
              {d.permissions.canClearFlag ? (
                clearing === f.id ? (
                  <form className={styles.form} onSubmit={event => void clear(event, f)}>
                    <label className={styles.wide}>Why is it being cleared?<input name="reason" required minLength={10} /></label>
                    {f.type === "BANKRUPTCY" ? <label className={styles.wide}>Required document (PDF/JPEG/PNG)<input type="file" name="document" accept=".pdf,image/jpeg,image/png" /></label> : null}
                    <div className={styles.actions}><button className={styles.primary} disabled={busy}>Clear flag</button><button type="button" onClick={() => setClearing(null)}>Cancel</button></div>
                  </form>
                ) : <div className={styles.actions}><button type="button" onClick={() => setClearing(f.id)}>Clear…</button></div>
              ) : <p className={styles.muted}>Only an admin can clear flags.</p>}
            </li>
          ))}
        </ul>
      ) : <p className={styles.muted}>No active flags.</p>}
      <h3>Set a flag</h3>
      <form className={styles.form} onSubmit={event => { const form = event.currentTarget; void run("SET_FLAG", formValues(event), () => form.reset()); }}>
        <label>Flag<select name="type" value={type} onChange={event => setType(event.target.value)}>{FLAGS.map(f => <option key={f} value={f}>{label(f)}</option>)}</select></label>
        {type === "CONTACT_RESTRICTED" ? <label>Restriction<select name="scope">{SCOPES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label> : null}
        {type === "ATTORNEY_REPRESENTED" ? (
          <><label>Attorney name<input name="attorneyName" required /></label><label>Firm<input name="attorneyFirm" /></label><label>Phone<input name="attorneyPhone" /></label><label>Email<input name="attorneyEmail" type="email" /></label></>
        ) : null}
        {type === "BANKRUPTCY" ? (
          <><label>Chapter<input name="bankruptcyChapter" /></label><label>Case number<input name="bankruptcyCaseNumber" /></label><label>Filing date<input type="date" name="bankruptcyFilingDate" /></label><label>Court<input name="bankruptcyCourt" /></label></>
        ) : null}
        <label className={styles.wide}>Reason<input name="reason" required minLength={5} /></label>
        {type === "BANKRUPTCY" ? <p className={`${styles.warning} ${styles.wide}`}>Setting this freezes the account completely. Clearing it later needs a reason and an uploaded court or attorney document.</p> : null}
        <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Set flag</button></div>
      </form>
    </Panel>
  );
}

function DetailsPanel({ d }: { d: AccountDetail }) {
  const { busy, run, feedback } = useAccountAction(d.account.id);
  const a = d.account;
  const [results, setResults] = useState<Array<{ id: string; displayName: string; customerNumber: string }>>([]);
  async function search(q: string) {
    if (q.trim().length < 2) { setResults([]); return; }
    try { setResults((await callCollections<{ customers: typeof results }>(`/api/collections/customers?q=${encodeURIComponent(q)}`)).customers); } catch { setResults([]); }
  }
  return (
    <Panel id="details" title="Contact details, customer link and account type" open={false}>
      {feedback}
      {!d.customer ? (
        <>
          <h3>Link the customer</h3>
          {d.suggestedCustomer ? (
            <p>Suggested: <strong>{d.suggestedCustomer.displayName}</strong> <button type="button" disabled={busy} onClick={() => void run("LINK_CUSTOMER", { customerId: d.suggestedCustomer.id })}>Confirm this customer</button></p>
          ) : <p className={styles.muted}>No suggestion. Search for the customer below.</p>}
          <label>Find customer<input onChange={event => void search(event.target.value)} placeholder="Type a name" /></label>
          <ul>{results.map(c => <li key={c.id}>{c.displayName} ({c.customerNumber}) <button type="button" disabled={busy} onClick={() => void run("LINK_CUSTOMER", { customerId: c.id })}>Link</button></li>)}</ul>
        </>
      ) : null}
      <h3>Contact details</h3>
      <p className={styles.muted}>Only the main customer is ever contacted. Never enter co-buyers or references here.</p>
      <form className={styles.form} onSubmit={event => void run("EDIT_CONTACT", formValues(event))}>
        <label>Mobile phone<input name="primaryPhone" defaultValue={a.primaryPhone ?? ""} inputMode="tel" /></label>
        <label>Email<input name="primaryEmail" type="email" defaultValue={a.primaryEmail ?? ""} /></label>
        <label className={styles.wide}>Mailing address<input name="mailingAddress" defaultValue={a.mailingAddress ?? ""} /></label>
        <label>Language<select name="preferredLanguage" defaultValue={a.preferredLanguage}><option value="EN">English</option><option value="ES">Spanish</option><option value="SO">Somali</option><option value="SW">Swahili</option></select></label>
        <label>Payment frequency<select name="paymentFrequency" defaultValue={a.paymentFrequency}>{["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY", "UNKNOWN"].map(f => <option key={f} value={f}>{label(f)}</option>)}</select></label>
        <label>VIN<input name="vin" defaultValue={a.vin ?? ""} /></label>
        <label>GPS device serial<input name="gpsDeviceSerial" defaultValue={a.gpsDeviceSerial ?? ""} /></label>
        <label>GPS disclosed in contract?<select name="gpsDisclosedInContract" defaultValue={a.gpsDisclosedInContract === true ? "YES" : a.gpsDisclosedInContract === false ? "NO" : ""}><option value="">Not checked yet</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Save details</button></div>
      </form>
      {d.permissions.canChangeType ? (
        <>
          <h3>Account type</h3>
          <form className={styles.form} onSubmit={event => void run("CHANGE_TYPE", formValues(event))}>
            <label>Type<select name="accountType" defaultValue={a.accountType}><option value="LEASE_TO_OWN">Lease-to-own</option><option value="BHPH">BHPH</option></select></label>
            <label>Reason<input name="reason" required minLength={5} /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Change type</button></div>
          </form>
          <p className={styles.muted}>Re-imports never change the type you choose here.</p>
        </>
      ) : null}
      {d.permissions.isAdmin && a.missingFromImportAt ? (
        <>
          <h3>Not in latest import</h3>
          <form className={styles.form} onSubmit={event => void run("CONFIRM_MISSING", formValues(event))}>
            <label>What happened?<select name="resolution"><option value="PAID_OFF">Paid off</option><option value="CLOSED">Closed</option><option value="STILL_ACTIVE">Still active (keep it)</option></select></label>
            <label>Reason<input name="reason" required minLength={5} /></label>
            <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Confirm</button></div>
          </form>
        </>
      ) : null}
    </Panel>
  );
}

function Timeline({ d }: { d: AccountDetail }) {
  return (
    <section className={styles.panel} aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Timeline</h2>
      {d.timeline.length === 0 ? <p className={styles.empty}>Nothing has happened on this account yet.</p> : (
        <ol className={styles.timeline}>
          {d.timeline.map((item: { id: string; at: string; title: string; detail?: string; by?: string | null }) => (
            <li key={item.id}><time dateTime={item.at}>{formatWhen(item.at)}</time> · <strong>{item.title}</strong>{item.by ? <small> · {item.by}</small> : null}{item.detail ? <div style={{ whiteSpace: "pre-wrap" }}>{item.detail}</div> : null}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Extra panels from later stages plug in here. */
export function AccountWorkspace({ detail, initialLog, extraPanels }: { detail: AccountDetail; initialLog: string; extraPanels?: ReactNode }) {
  return (
    <>
      <Header d={detail} />
      <MoneyPanel d={detail} />
      {extraPanels}
      <LogContactPanel d={detail} initialChannel={initialLog} />
      <FlagsPanel d={detail} />
      <DetailsPanel d={detail} />
      <Timeline d={detail} />
    </>
  );
}
