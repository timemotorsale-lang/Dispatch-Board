import { CalendarClock, CarFront, CircleAlert, CircleCheck, Clock, Gavel, Inbox, PhoneCall, Play, Receipt, Truck, Upload, UserSearch } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

import { formatCents } from "../domain/money-dates";
import type { getHome } from "../server/home-service";
import styles from "./collections.module.css";

type Home = Awaited<ReturnType<typeof getHome>>;

const DECISION_ICONS = { starter: CarFront, repo: Truck, extensions: CalendarClock, adjustments: Receipt, chargeoffs: Gavel, skips: UserSearch } as const;
const BUCKET_COLORS: Record<string, string> = { CURRENT: "#4f8a2b", GRACE_1_5: "#d9a12a", LATE_6_14: "#d97a1e", D15_30: "#cf5a2b", D31_60: "#c03a3a", D61_PLUS: "#8f1f1f" };

function time(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function HomeScreen({ h }: { h: Home }) {
  const maxBucket = Math.max(1, ...h.buckets.map(b => b.count));
  return (
    <>

      <ul className={styles.checklist} aria-label="Today's checklist">
        {h.checklist.map(c => {
          const Icon = c.state === "done" ? CircleCheck : c.state === "problem" ? CircleAlert : Clock;
          const cls = c.state === "done" ? styles.checkDone : c.state === "problem" ? styles.checkProblem : styles.checkWaiting;
          return <li key={c.key} className={cls}><Icon size={17} aria-hidden="true" />{c.href ? <Link href={c.href} className={cls}>{c.text}</Link> : c.text}</li>;
        })}
      </ul>

      <div className={styles.kpis}>
        <Link className={`${styles.kpi} ${styles.kpiDanger}`} href="/collections/queue"><strong>{h.toCall}</strong><span>To call today</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiWarn}`} href="/collections/queue?tab=PROMISES_TODAY"><strong>{h.summary.promisesDueToday}</strong><span>Promises due today</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiAccent}`} href="/collections/queue?tab=PAST_DUE"><strong>{formatCents(h.summary.pastDueCents)}</strong><span>Past due · {h.summary.pastDueAccounts} accounts</span></Link>
        <div className={`${styles.kpi} ${styles.kpiGood}`}><strong>{h.keepRatePercent === null ? "—" : `${h.keepRatePercent}%`}</strong><span>Promises kept · last 30 days</span></div>
      </div>

      <div className={styles.homeGrid}>
        <section className={styles.card2} aria-labelledby="callfirst-h">
          <div className={styles.cardHead}><h2 id="callfirst-h"><PhoneCall size={17} aria-hidden="true" />Call first</h2><Link href="/collections/queue">Open call list</Link></div>
          <div className={styles.cardBody}>
            {h.callFirst.length ? h.callFirst.map(r => (
              <Link key={r.id} className={styles.rowLink} href={`/collections/accounts/${r.id}?from=PAST_DUE`}>
                <span><strong>{r.name}</strong><br /><span className={r.reason.tone === "danger" ? styles.reasonDanger : r.reason.tone === "warning" ? styles.reasonWarn : styles.reasonNeutral}>{r.reason.text}</span></span>
                <span className={`${styles.chip} ${r.daysPastDue >= 30 ? styles.chipDanger : styles.chipWarn}`}>{r.daysPastDue} days</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatCents(r.amountDueCents)}</span>
              </Link>
            )) : <p className={styles.empty}>No one is past due. Nice work.</p>}
          </div>
        </section>

        <section className={styles.card2} aria-labelledby="decide-h">
          <div className={styles.cardHead}><h2 id="decide-h"><Gavel size={17} aria-hidden="true" />{h.isAdmin ? "Waiting for your decision" : "Your requests"}</h2><Link href="/collections/approvals">See all</Link></div>
          <div className={styles.cardBody}>
            {h.decisions.map(d => {
              const Icon = DECISION_ICONS[d.key as keyof typeof DECISION_ICONS];
              return (
                <Link key={d.key} className={styles.decision} href="/collections/approvals">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon size={16} aria-hidden="true" />{h.isAdmin ? d.label : d.label.replace(" to approve", "").replace(" to confirm", "")}</span>
                  <span className={`${styles.decisionCount} ${d.count ? styles.decisionCountHot : ""}`}>{d.count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className={styles.homeGrid} style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)" }}>
        <section className={styles.card2} aria-labelledby="inbox-h">
          <div className={styles.cardHead}><h2 id="inbox-h"><Inbox size={17} aria-hidden="true" />Inbox {h.unreadCount ? <span className={`${styles.chip} ${styles.chipDanger}`}>{h.unreadCount} unread</span> : null}</h2><Link href="/collections/inbox">Open inbox</Link></div>
          <div className={styles.cardBody}>
            {h.inbox.length ? h.inbox.map(m => (
              <Link key={m.id} className={styles.rowLink} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }} href={m.accountId ? `/collections/inbox?thread=${m.accountId}` : "/collections/inbox"}>
                <span><strong>{m.who}</strong><br /><span className={styles.callSub}>{m.text || "(no text)"}</span></span>
                <span className={styles.callSub}>{time(m.at)}</span>
              </Link>
            )) : <p className={styles.empty}>No unread texts.</p>}
          </div>
        </section>

        <section className={styles.card2} aria-labelledby="portfolio-h">
          <div className={styles.cardHead}><h2 id="portfolio-h">Portfolio by bucket</h2><Link href="/collections/dashboard">Dashboard</Link></div>
          <div className={styles.cardBody} style={{ paddingTop: 10 }}>
            {h.buckets.map(b => (
              <div key={b.bucket} className={styles.bucketRow}>
                <span>{b.label}</span>
                <div className={styles.bucketTrack} aria-hidden="true"><div className={styles.bucketFill} style={{ width: `${(b.count / maxBucket) * 100}%`, background: BUCKET_COLORS[b.bucket] }} /></div>
                <span style={{ textAlign: "right", fontWeight: 700 }}>{b.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <nav aria-label="Quick links" className={styles.quickLinks}>
        {h.links.map(l => <Link key={l.href} className={styles.button} href={l.href}>{l.label}</Link>)}
      </nav>
    </>
  );
}

/** Header buttons for the home page (shown in the page header, next to the greeting). */
export function HomeActions({ h }: { h: Home }): ReactNode {
  const startHref = h.firstAccountId ? `/collections/accounts/${h.firstAccountId}?from=PAST_DUE` : "/collections/queue";
  return (
    <>
      <Link className={`${styles.button} ${styles.primary}`} href={startHref}><Play size={16} aria-hidden="true" />Start calling ({h.toCall})</Link>
      <Link className={styles.button} href="/collections/import"><Upload size={16} aria-hidden="true" />Import</Link>
    </>
  );
}
