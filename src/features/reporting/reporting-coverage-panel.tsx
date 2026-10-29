import { ChevronRight } from "lucide-react";
import type { reportingManagementCoverage } from "@/server/reporting/management-service";
import styles from "./reporting-console.module.css";

type Coverage = Awaited<ReturnType<typeof reportingManagementCoverage>>;
export function ReportingCoveragePanel({ coverage, busy, onOpen, reportStatus = "ALL" }: { coverage: Coverage; busy: boolean; reportStatus?: string; onOpen: (subject: string, revisionId?: string | null) => void }) {
  const summary = coverage.summary;
  return <section aria-label="Team reporting coverage">
    <h2>Team reporting coverage</h2><p>{coverage.periodStart} · {coverage.cadence.toLowerCase()}</p>
    <dl className={styles.coverage}>{([ ["Saved drafts", coverage.rows.filter(row => row.draft).length], ["Required", summary.required], ["Submitted", summary.submitted], ["Reviewed", summary.approved], ["Missing", summary.missing], ["Excused", summary.excused], ["Corrections pending", summary.correctionPending] ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>Submission coverage: {summary.submissionRate.value === null ? "Not applicable" : `${summary.submissionRate.value.toFixed(1)}%`} ({summary.submitted}/{summary.required} required reports)</p>
    <p className={styles.quality}>{coverage.limitation}</p>
    <div className={styles.tableWrap}><table><thead><tr><th>Person</th><th>Expectation</th><th>Submission</th><th>Review</th><th></th></tr></thead><tbody>{coverage.rows.filter(row => reportStatus === "ALL" || (reportStatus === "SUBMITTED" ? row.submitted : reportStatus === "DRAFT" ? row.draft : row.reportState === "NOT_SUBMITTED" || row.reportState === "NOT_YET_DUE")).map(row => <tr key={row.subjectUserId}><td>{row.subject}</td><td>{row.disposition.replaceAll("_", " ")}</td><td>{(row.reportState ?? (row.submitted ? "SUBMITTED" : "NOT_SUBMITTED")).replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase())}</td><td>{row.approved ? "Accepted" : "Not accepted"}{row.correctionPending ? <small>Correction pending</small> : null}{row.needsRevision ? <small>Needs revision</small> : null}</td><td><button disabled={busy} title="Open daily report and activity" aria-label={`Open ${row.subject} reporting history`} onClick={() => onOpen(row.subjectUserId, row.revisionId)}><ChevronRight size={17} />Open day</button></td></tr>)}</tbody></table></div>
  </section>;
}
