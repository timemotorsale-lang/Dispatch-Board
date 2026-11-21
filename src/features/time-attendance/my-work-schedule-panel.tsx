import Link from "next/link";

import type { getMyWorkSchedule } from "@/server/time-attendance/my-work-schedule";
import styles from "./time-attendance-console.module.css";

export function MyWorkSchedulePanel({ schedule }: { schedule: Awaited<ReturnType<typeof getMyWorkSchedule>> }) {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: schedule.timezone });
  const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", timeZone: schedule.timezone });
  const week = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return <section className={styles.panel} aria-label="My Schedule">
    <div className={styles.panelHeader}>
      <div><h2>My Schedule</h2><p>{week.format(new Date(schedule.start))} – {week.format(new Date(schedule.end))}</p></div>
      <div className={styles.cardExecutionRow}>
        <Link className={styles.ghostAction} href={`/time-attendance?view=schedule&week=${schedule.previous}`}>Previous week</Link>
        <Link className={styles.ghostAction} href={`/time-attendance?view=schedule&week=${schedule.next}`}>Next week</Link>
        <Link className={styles.ghostAction} href="/time-attendance?view=my-time&action=leave#time-off-request">Request time off</Link>
      </div>
    </div>
    {!schedule.available ? <p role="alert">Your schedule is temporarily unavailable.</p> :
      schedule.entries.length ? <div className={styles.timeline}>
        {schedule.entries.map(entry => <article className={styles.timelineItem} key={entry.id}>
          <div><strong>{entry.href ? <Link href={entry.href}>{entry.title}</Link> : entry.title}</strong><p>{entry.type}</p></div>
          <span className={styles.timelineTime}>
            {day.format(new Date(entry.start))} · {clock.format(new Date(entry.start))} – {day.format(new Date(entry.end)) === day.format(new Date(entry.start)) ? "" : `${day.format(new Date(entry.end))} · `}{clock.format(new Date(entry.end))}
          </span>
        </article>)}
      </div> : <p className={styles.cardReadinessNote}>No assigned appointments, repair work, or approved time off this week.</p>}
  </section>;
}
