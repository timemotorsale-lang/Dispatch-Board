import Link from "next/link";
import type { PersonalTimeCardPeriods } from "@/server/time-attendance/personal-periods";
import styles from "./time-attendance-console.module.css";

const dayLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", weekday: "short", timeZone: "UTC",
}).format(new Date(value + "T00:00:00Z"));
const minutes = (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`;
const status = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function PersonalPeriodPanel({ history, hasRequestedPeriod }: { history: PersonalTimeCardPeriods; hasRequestedPeriod: boolean }) {
  const period = history.selected;
  const clock = period ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: period.timezone }) : null;
  const csv = period?.days?.length ? [
    "Date,Attendance minutes,Meal minutes,Paid minutes",
    ...period.days.map(day => `${day.date},${day.span},${day.meal},${day.paid}`),
  ].join("\r\n") : null;
  return <section id="pay-periods" className={styles.panel} aria-label="My pay periods">
    <div className={styles.panelHeader}><div>
      <h2>My pay periods</h2>
    </div></div>
    {history.unavailable ? <p role="alert">Pay-period history is temporarily unavailable.</p> : <>
      {history.periods.length > 0 && <form method="get" action="/time-attendance" className={styles.periodPicker}>
        <input name="view" type="hidden" value="my-time" />
        <label>Pay period <select name="period" defaultValue={period?.key ?? ""}>
          {!period && <option value="" disabled>Choose a pay period</option>}
          {history.periods.map(item => <option value={item.key} key={item.key}>{item.start} – {item.end}{item.current ? " · Current" : ""} · {status(item.status)}</option>)}
        </select></label>
        <button className={styles.ghostAction}>View period</button>
      </form>}
      {period ? <>
        <div className={styles.cardContextLine}>
          <span>{period.start} – {period.end}</span><span>{period.policy}</span><span>{period.timezone}</span><span>Version {period.version} · {status(period.status)}</span>
        </div>
        {period.days?.length ? <div className={styles.periodTable}>
          <table>
            <thead><tr><th scope="col">Day</th><th scope="col">Recorded spans</th><th scope="col">Attendance</th><th scope="col">Meal</th><th scope="col">Paid</th></tr></thead>
            <tbody>{period.days.map(day => <tr key={day.date}>
              <th scope="row">{dayLabel(day.date)}<small className={styles.periodDayAction}><Link href={`/time-attendance?view=my-time&correctionDate=${day.date}#correction-request`}>Request correction<span className={styles.periodSrOnly}> for {dayLabel(day.date)}</span></Link></small></th>
              <td>{day.attendance.length ? day.attendance.map((span, index) => <div key={index}>{clock?.format(new Date(span.startAt))} – {clock?.format(new Date(span.endAt))}</div>) : "—"}</td>
              <td>{minutes(day.span)}</td><td>{minutes(day.meal)}</td><td>{minutes(day.paid)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p>{period.days ? "No completed intervals have been calculated for this period." : "Daily intervals are unavailable for this saved card."}</p>}
        {period.exceptions.length > 0 && <details>
          <summary>{period.exceptions.length} open card {period.exceptions.length === 1 ? "issue" : "issues"}</summary>
          <ul>{period.exceptions.map((issue, index) => <li key={`${issue.code}:${index}`}>{issue.blocking ? "Blocks payroll · " : ""}{issue.message}</li>)}</ul>
        </details>}
        <div className={styles.cardExecutionRow}>
          {csv && <a className={styles.ghostAction} download={`time-card-${period.start}.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Download daily totals</a>}
          {!period.current && <Link className={styles.ghostAction} href="/time-attendance?view=my-time">Return to current card</Link>}
        </div>
      </> : <p>{history.periods.length ? hasRequestedPeriod ? "That pay period is unavailable. Choose a period from your list." : "Choose a saved period to see its daily totals." : "Your pay periods will appear after a card is calculated from your recorded time."}</p>}
    </>}
  </section>;
}
