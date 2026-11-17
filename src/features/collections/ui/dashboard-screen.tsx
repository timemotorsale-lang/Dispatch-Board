"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatCents } from "../domain/money-dates";
import type { getDashboard, getKpis } from "../server/dashboard-service";
import { formatWhen } from "./client-api";
import styles from "./collections.module.css";
import { formatDay } from "../domain/account-ref";

type Data = Awaited<ReturnType<typeof getDashboard>>;
type Kpis = Awaited<ReturnType<typeof getKpis>>;

function Tile({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const body = <><span>{label}</span><strong>{value}</strong></>;
  return href ? <Link className={styles.tile} href={href}>{body}</Link> : <div className={styles.tile}>{body}</div>;
}

function CsvLink({ table }: { table: string }) {
  return <a className={styles.hideOnPrint} href={`/api/collections/dashboard?format=csv&table=${table}`}>Download CSV</a>;
}

/** Simple, accessible bar: the numbers are always in the table too. */
function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  return <div aria-hidden="true" className={styles.bucketTrack}><div className={styles.bucketFill} style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%`, background: color ?? "#315bcb" }} /></div>;
}

/** Small SVG line chart with a text table beside it for screen readers and printing. */
function Line({ points, label, format }: { points: Array<{ x: string; y: number }>; label: string; format: (n: number) => string }) {
  if (points.length < 2) return <div className={styles.trend}><span className={styles.stripLabel}>{label}</span><p className={styles.muted} style={{ margin: "6px 0 0", fontSize: 13 }}>Appears after a couple of weeks of imports.</p></div>;
  const w = 320, h = 90, max = Math.max(...points.map(p => p.y), 1);
  const path = points.map((p, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * (w - 10) + 5},${h - 5 - (p.y / max) * (h - 15)}`).join(" ");
  return (
    <figure className={styles.trend}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`${label}: from ${format(points[0].y)} to ${format(points.at(-1)!.y)}`}>
        <path d={`${path} L${w - 5},${h - 5} L5,${h - 5} Z`} fill="#315bcb" opacity="0.08" />
        <path d={path} fill="none" stroke="#315bcb" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <figcaption><span className={styles.stripLabel}>{label}</span><strong>{format(points.at(-1)!.y)}</strong> <span className={styles.callSub}>from {format(points[0].y)}</span></figcaption>
    </figure>
  );
}

const BUCKET_COLORS: Record<string, string> = { CURRENT: "#4f8a2b", GRACE_1_5: "#d9a12a", LATE_6_14: "#d97a1e", D15_30: "#cf5a2b", D31_60: "#c03a3a", D61_PLUS: "#8f1f1f" };

function Card({ id, title, csv, children, wide }: { id: string; title: string; csv?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`${styles.card2} ${wide ? styles.span2 : ""}`} aria-labelledby={id}>
      <div className={styles.cardHead}><h2 id={id}>{title}</h2>{csv ? <CsvLink table={csv} /> : null}</div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

export function DashboardScreen({ data, kpis }: { data: Data; kpis: Kpis }) {
  const t = data.tiles;
  const maxCount = Math.max(...data.buckets.map(b => b.count), 1);
  const maxDue = Math.max(...data.buckets.map(b => b.amountDueCents), 1);
  const pct = (n: number) => `${n}%`;
  const orNone = (n: number | null, suffix = "%") => (n === null ? "—" : `${n}${suffix}`);
  return (
    <>
      <div className={`${styles.actions} ${styles.hideOnPrint}`} style={{ marginBottom: 12 }}>
        <span className={styles.muted} style={{ marginRight: "auto" }}>Last import: {t.lastImportAt ? formatWhen(t.lastImportAt) : "never"} · <Link href="/collections/import">Import</Link></span>
        <button type="button" onClick={() => window.print()}>Print this page</button>
      </div>

      <div className={styles.kpis} role="group" aria-label="Headline numbers">
        <Link className={`${styles.kpi} ${styles.kpiAccent}`} href="/collections/accounts"><strong>{t.totalAccounts}</strong><span>Accounts · {formatCents(t.totalBalanceCents)} balance</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiDanger}`} href="/collections/queue?tab=PAST_DUE"><strong>{formatCents(t.pastDueAmountCents)}</strong><span>Past due · {t.pastDueAccounts} accounts</span></Link>
        <Link className={`${styles.kpi} ${styles.kpiWarn}`} href="/collections/queue?tab=BROKEN"><strong>{t.brokenPromisesToday}</strong><span>Broken promises today</span></Link>
        <div className={`${styles.kpi} ${styles.kpiGood}`}><strong>{orNone(kpis.promisesKeptPercent)}</strong><span>Promises kept · 30 days</span></div>
      </div>

      <section className={styles.statGrid} aria-label="Today at a glance">
        <Tile label="Disable eligible" value={t.disableEligible} href="/collections/queue?tab=DISABLE" />
        <Tile label="Starter disabled" value={t.starterDisabled} />
        <Tile label="Repo review" value={t.repoReview} href="/collections/queue?tab=REPO" />
        <Tile label="Repo assigned" value={t.repoAssigned} />
        <Tile label="Recovered / storage" value={t.repoInStorage} />
        <Tile label="Insurance problems" value={t.insuranceProblems} href="/collections/queue?tab=INSURANCE" />
        <Tile label="Unread texts" value={t.unreadMessages} href="/collections/inbox" />
      </section>

      <div className={styles.dashGrid}>
        <Card id="buckets-h" title="Past due by bucket" csv="buckets" wide>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Bucket</th><th scope="col" className={styles.num}>Accounts</th><th scope="col" className={styles.hideOnPhone}><span className={styles.srOnly}>Accounts chart</span></th><th scope="col" className={styles.num}>Amount due</th><th scope="col" className={styles.hideOnPhone}><span className={styles.srOnly}>Amount chart</span></th><th scope="col" className={styles.num}>Balance</th></tr></thead>
            <tbody>
              {data.buckets.map(b => (
                <tr key={b.bucket}>
                  <th scope="row"><span className={styles.swatch} style={{ background: BUCKET_COLORS[b.bucket] }} aria-hidden="true" />{b.label}</th>
                  <td className={styles.num}>{b.count}</td><td className={styles.hideOnPhone} style={{ width: "18%" }}><Bar value={b.count} max={maxCount} color={BUCKET_COLORS[b.bucket]} /></td>
                  <td className={styles.num}>{formatCents(b.amountDueCents)}</td><td className={styles.hideOnPhone} style={{ width: "18%" }}><Bar value={b.amountDueCents} max={maxDue} color={BUCKET_COLORS[b.bucket]} /></td>
                  <td className={styles.num}>{formatCents(b.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>

        <Card id="promises-h" title="Promises" csv="promises">
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Period</th><th scope="col" className={styles.num}>Made</th><th scope="col" className={styles.num}>Kept</th><th scope="col" className={styles.num}>Partly</th><th scope="col" className={styles.num}>Broken</th><th scope="col" className={styles.num}>Keep rate</th></tr></thead>
            <tbody>{data.promises.map(p => <tr key={p.days}><th scope="row">Last {p.days} days</th><td className={styles.num}>{p.made}</td><td className={styles.num}>{p.kept}</td><td className={styles.num}>{p.partial}</td><td className={styles.num}>{p.broken}</td><td className={styles.num}><strong>{p.keepRate === null ? "—" : `${p.keepRate}%`}</strong></td></tr>)}</tbody>
          </table></div>
        </Card>

        <Card id="kpi-h" title="How collections is working" csv="rollrates">
          <dl className={styles.metricList}>
            <div><dt>Contact rate (past due, 30 days)</dt><dd>{orNone(kpis.contactRatePercent)}</dd></div>
            <div><dt>Reached the customer</dt><dd>{kpis.rightPartyContactPercent === null ? "—" : `${kpis.rightPartyContactPercent}% of tries`}</dd></div>
            <div><dt>Days to first contact</dt><dd>{kpis.avgDaysToFirstContact ?? "—"}</dd></div>
            <div><dt>Promises kept / broken (30 days)</dt><dd>{kpis.promisesKeptPercent ?? "—"}% / {kpis.brokenPromisePercent ?? "—"}%</dd></div>
            <div><dt>Cure rate (past due → current, 30 days)</dt><dd>{orNone(kpis.cureRatePercent)}</dd></div>
            <div><dt>Cured after an extension</dt><dd>{kpis.extensionCureRatePercent === null ? "—" : `${kpis.extensionCureRatePercent}% of ${kpis.extensionsMeasured}`}</dd></div>
            <div><dt>Charge-off rate (12 months)</dt><dd>{orNone(kpis.chargeOffRatePercent)}</dd></div>
            <div><dt>Net loss / recovered</dt><dd>{formatCents(kpis.netLossCents)} · {kpis.recoveryPercent ?? "—"}%</dd></div>
          </dl>
        </Card>

        <Card id="roll-h" title="Roll rates (bucket 30 days ago → today)" wide>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Was in</th><th scope="col" className={styles.num}>Accounts</th><th scope="col" className={styles.num}>Got worse</th><th scope="col" className={styles.num}>Improved</th></tr></thead>
            <tbody>{kpis.rollRates.map(r => <tr key={r.bucket}><th scope="row">{r.label}</th><td className={styles.num}>{r.accounts}</td><td className={styles.num}>{orNone(r.rolledWorsePercent)}</td><td className={styles.num}>{orNone(r.improvedPercent)}</td></tr>)}</tbody>
          </table></div>
          <p className={styles.muted} style={{ fontSize: 13 }}>Roll rates and cure rate need imports from at least 30 days ago. Ledger-based measures come once the servicing ledger is running.</p>
        </Card>

        <Card id="trends-h" title="Weekly trends" csv="trends" wide>
          <div className={styles.trendGrid}>
            <Line label="Past due %" points={data.trends.map(p => ({ x: p.week, y: p.pastDuePercent }))} format={pct} />
            <Line label="$ past due" points={data.trends.map(p => ({ x: p.week, y: p.pastDueAmountCents }))} format={formatCents} />
            <Line label="31–60 accounts" points={data.trends.map(p => ({ x: p.week, y: p.count31to60 }))} format={String} />
            <Line label="61+ accounts" points={data.trends.map(p => ({ x: p.week, y: p.count61plus }))} format={String} />
          </div>
          {data.trends.length ? (
            <details><summary>Show the numbers</summary>
              <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Week of</th><th scope="col" className={styles.num}>Past due %</th><th scope="col" className={styles.num}>$ past due</th><th scope="col" className={styles.num}>31–60</th><th scope="col" className={styles.num}>61+</th></tr></thead>
                <tbody>{data.trends.map(p => <tr key={p.week}><th scope="row">{p.week}</th><td className={styles.num}>{p.pastDuePercent}%</td><td className={styles.num}>{formatCents(p.pastDueAmountCents)}</td><td className={styles.num}>{p.count31to60}</td><td className={styles.num}>{p.count61plus}</td></tr>)}</tbody></table></div>
            </details>
          ) : null}
        </Card>

        <Card id="activity-h" title="Activity (last 14 days)" csv="activity" wide>
          {data.activity.length ? (
            <div className={styles.tableWrap}><table className={styles.table}>
              <thead><tr><th scope="col">Date</th><th scope="col">Staff</th><th scope="col" className={styles.num}>Contacts logged</th><th scope="col" className={styles.num}>Texts / emails</th></tr></thead>
              <tbody>{data.activity.map(a => <tr key={`${a.date}-${a.collector}`}><th scope="row">{formatDay(a.date)}</th><td>{a.collector}</td><td className={styles.num}>{a.contacts}</td><td className={styles.num}>{a.messages}</td></tr>)}</tbody>
            </table></div>
          ) : <p className={styles.empty}>No contacts or messages logged in the last 14 days.</p>}
        </Card>
      </div>
    </>
  );
}
