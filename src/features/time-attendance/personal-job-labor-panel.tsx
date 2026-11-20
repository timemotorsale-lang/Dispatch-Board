import Link from "next/link";
import type { PersonalJobLabor } from "@/server/time-attendance/personal-job-labor";
import styles from "./time-attendance-console.module.css";

const clockLabels = {
  NOT_STARTED: "Ready to start",
  RUNNING: "Running",
  PAUSED: "Paused",
  FINISHED: "Finished",
};

const eventDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function PersonalJobLaborPanel({ labor }: { labor: PersonalJobLabor }) {
  if (!labor) return null;

  return <section id="personal-job-labor" className={styles.panel} aria-labelledby="personal-job-labor-heading">
    <div className={styles.panelHeader}><h2 id="personal-job-labor-heading">My repair job labor</h2></div>
    <p>Payroll time comes from your attendance card. Repair labor comes from your job clocks. Billed labor comes from the customer invoice.</p>
    {labor.status === "unavailable" ? <p role="status">Repair job labor is temporarily unavailable.</p> : labor.jobs.length ? <>
      <p>{labor.hasMore ? "Showing your 10 most recently updated job clocks." : "Showing your recently updated job clocks."} Running time is added to the recorded total when the clock is paused or finished.</p>
      <div className={styles.periodTable}>
        <table>
          <thead><tr><th scope="col">Repair job</th><th scope="col">Recorded labor</th><th scope="col">Clock</th></tr></thead>
          <tbody>{labor.jobs.map(job => <tr key={job.id}>
            <th scope="row"><Link href={job.href}>{job.repairOrderNumber} · {job.jobNumber}</Link><div>{job.description}</div></th>
            <td>{Math.floor(job.recordedMinutes / 60)}h {job.recordedMinutes % 60}m</td>
            <td>{clockLabels[job.clockState]}{job.lastEventAt && <div>Last event <time dateTime={job.lastEventAt}>{eventDate.format(new Date(job.lastEventAt))}</time> (UTC)</div>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </> : <p>No repair job clocks are recorded for you in the locations you can access.</p>}
  </section>;
}
