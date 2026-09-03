import Link from "next/link";
import styles from "./expandable-focus-details.module.css";

type FocusDetails = {
  outcome: string;
  priority: string;
  mustCloseToday: boolean;
  riskNote?: string | null;
  supportNeeded?: string | null;
  progressUpdate?: string | null;
  convertedTaskId?: string | null;
};

export function ExpandableFocusDetails({ item }: { item: FocusDetails }) {
  return <details className={styles.details}>
    <summary aria-label={`Read details: ${item.outcome}`} title={item.outcome}>
      <strong>{item.outcome}</strong>
      <small>{item.priority.toLocaleLowerCase()} · {item.mustCloseToday ? "must close" : "flexible"} · <em>Read details</em></small>
    </summary>
    <div className={styles.body}>
      <dl>
        <dt>Full outcome</dt><dd>{item.outcome}</dd>
        <dt>Latest saved progress</dt><dd>{item.progressUpdate || "No progress update saved yet."}</dd>
        {item.riskNote ? <><dt>Risk / blocker</dt><dd>{item.riskNote}</dd></> : null}
        {item.supportNeeded ? <><dt>Support needed</dt><dd>{item.supportNeeded}</dd></> : null}
      </dl>
      {item.convertedTaskId ? <Link href={`/tasks/${encodeURIComponent(item.convertedTaskId)}`}>Open linked task</Link> : null}
    </div>
  </details>;
}
