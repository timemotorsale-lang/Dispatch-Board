"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatCents } from "../domain/money-dates";
import type { getDashboard } from "../server/dashboard-service";
import { formatWhen } from "./client-api";
import styles from "./collections.module.css";

type Data = Awaited<ReturnType<typeof getDashboard>>;

function Tile({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const body = <><span>{label}</span><strong>{value}</strong></>;
  return href ? <Link className={styles.tile} href={href}>{body}</Link> : <div className={styles.tile}>{body}</div>;
}

function CsvLink({ table }: { table: string }) {
  return <a className={styles.hideOnPrint} href={`/api/collections/dashboard?format=csv&table=${table}`}>Download CSV</a>;
}

/** Simple, accessible bar: the numbers are always in the table too. */
function Bar({ value, max }: { value: number; max: number }) {
  return <div aria-hidden="true" className={styles.bar} style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%` }} />;
}

/** Small SVG line chart with a text table beside it for screen readers and printing. */
function Line({ points, label, format }: { points: Array<{ x: string; y: number }>; label: string; format: (n: number) => string }) {
  if (points.length < 2) return <p className={styles.muted}>Trends appear after a couple of weeks of imports.</p>;
  const w = 320, h = 90, max = Math.max(...points.map(p => p.y), 1);
  const path = points.map((p, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * (w - 10) + 5},${h - 5 - (p.y / max) * (h - 15)}`).join(" ");
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`${label}: from ${format(points[0].y)} to ${format(points.at(-1)!.y)}`}>
        <path d={path} fill="none" stroke="#315bcb" strokeWidth="2" />
      </svg>
      <figcaption className={styles.muted}>{label}: {format(points[0].y)} → {format(points.at(-1)!.y)}</figcaption>
    </figure>
  );
}

export function DashboardScreen({ data }: { data: Data }) {
  const t = data.tiles;
  const maxCount = Math.max(...data.buckets.map(b => b.count), 1);
  const maxDue = Math.max(...data.buckets.map(b => b.amountDueCents), 1);
  const pct = (n: number) => `${n}%`;
  return (
    <>
      <div className={`${styles.actions} ${styles.hideOnPrint}`}><button type="button" onClick={() => window.print()}>Print this page</button></div>

      <section className={styles.panel} aria-label="Today at a glance">
        <div className={styles.tiles}>
          <Tile label="Accounts" value={t.totalAccounts} href="/collections/accounts" />
          <Tile label="Total balance" value={formatCents(t.totalBalanceCents)} />
          <Tile label="Past due" value={`${t.pastDueAccounts} · ${formatCents(t.pastDueAmountCents)}`} href="/collections?tab=PAST_DUE" />
          <Tile label="Broken promises today" value={t.brokenPromisesToday} href="/collections?tab=BROKEN" />
          <Tile label="Disable eligible" value={t.disableEligible} href="/collections?tab=DISABLE" />
          <Tile label="Starter disabled" value={t.starterDisabled} />
          <Tile label="Repo review" value={t.repoReview} href="/collections?tab=REPO" />
          <Tile label="Repo assigned" value={t.repoAssigned} />
          <Tile label="Repo recovered / storage" value={t.repoInStorage} />
          <Tile label="Insurance problems" value={t.insuranceProblems} href="/collections?tab=INSURANCE" />
          <Tile label="Unread texts" value={t.unreadMessages} href="/collections/inbox" />
          <Tile label="Last import" value={t.lastImportAt ? formatWhen(t.lastImportAt) : "Never"} href="/collections/import" />
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="buckets-h">
        <div className={styles.header}><h2 id="buckets-h">Past due by bucket</h2><CsvLink table="buckets" /></div>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Bucket</th><th scope="col">Accounts</th><th scope="col" className={styles.hideOnPhone}>Chart</th><th scope="col">Amount due</th><th scope="col" className={styles.hideOnPhone}>Chart</th><th scope="col">Balance</th></tr></thead>
          <tbody>
            {data.buckets.map(b => (
              <tr key={b.bucket}>
                <th scope="row">{b.label}</th>
                <td>{b.count}</td><td className={styles.hideOnPhone} style={{ width: "20%" }}><Bar value={b.count} max={maxCount} /></td>
                <td>{formatCents(b.amountDueCents)}</td><td className={styles.hideOnPhone} style={{ width: "20%" }}><Bar value={b.amountDueCents} max={maxDue} /></td>
                <td>{formatCents(b.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className={styles.panel} aria-labelledby="promises-h">
        <div className={styles.header}><h2 id="promises-h">Promises</h2><CsvLink table="promises" /></div>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th scope="col">Period</th><th scope="col">Made</th><th scope="col">Kept</th><th scope="col">Partly kept</th><th scope="col">Broken</th><th scope="col">Keep rate</th></tr></thead>
          <tbody>{data.promises.map(p => <tr key={p.days}><th scope="row">Last {p.days} days</th><td>{p.made}</td><td>{p.kept}</td><td>{p.partial}</td><td>{p.broken}</td><td>{p.keepRate === null ? "—" : `${p.keepRate}%`}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className={styles.panel} aria-labelledby="trends-h">
        <div className={styles.header}><h2 id="trends-h">Weekly trends</h2><CsvLink table="trends" /></div>
        <div className={styles.tiles}>
          <Line label="Past due %" points={data.trends.map(p => ({ x: p.week, y: p.pastDuePercent }))} format={pct} />
          <Line label="$ past due" points={data.trends.map(p => ({ x: p.week, y: p.pastDueAmountCents }))} format={formatCents} />
          <Line label="31–60 accounts" points={data.trends.map(p => ({ x: p.week, y: p.count31to60 }))} format={String} />
          <Line label="61+ accounts" points={data.trends.map(p => ({ x: p.week, y: p.count61plus }))} format={String} />
        </div>
        {data.trends.length ? (
          <details><summary>Show the numbers</summary>
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Week of</th><th scope="col">Past due %</th><th scope="col">$ past due</th><th scope="col">31–60</th><th scope="col">61+</th></tr></thead>
              <tbody>{data.trends.map(p => <tr key={p.week}><th scope="row">{p.week}</th><td>{p.pastDuePercent}%</td><td>{formatCents(p.pastDueAmountCents)}</td><td>{p.count31to60}</td><td>{p.count61plus}</td></tr>)}</tbody></table></div>
          </details>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="activity-h">
        <div className={styles.header}><h2 id="activity-h">Activity (last 14 days)</h2><CsvLink table="activity" /></div>
        {data.activity.length ? (
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th scope="col">Date</th><th scope="col">Staff</th><th scope="col">Contacts logged</th><th scope="col">Texts / emails</th></tr></thead>
            <tbody>{data.activity.map(a => <tr key={`${a.date}-${a.collector}`}><th scope="row">{a.date}</th><td>{a.collector}</td><td>{a.contacts}</td><td>{a.messages}</td></tr>)}</tbody>
          </table></div>
        ) : <p className={styles.empty}>No contacts or messages logged in the last 14 days.</p>}
      </section>
    </>
  );
}
