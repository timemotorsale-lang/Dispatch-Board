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

type FocusSource = {
  actionLabel: string;
  description: string;
  href?: string | null;
  isOperationalRecord: boolean;
  label: string;
};

function getFallbackSource(item: FocusDetails): FocusSource {
  if (item.convertedTaskId) {
    return {
      actionLabel: "Open linked task",
      description: "Converted task workspace record.",
      href: `/tasks/${encodeURIComponent(item.convertedTaskId)}`,
      isOperationalRecord: true,
      label: "Task"
    };
  }

  return {
    actionLabel: "Convert to task",
    description: "Manual daily focus item.",
    href: null,
    isOperationalRecord: false,
    label: "Manual"
  };
}

export function ExpandableFocusDetails({ converting = false, disabled = false, item, onConvertToTask, source }: { converting?: boolean; disabled?: boolean; item: FocusDetails; onConvertToTask?: () => void; source?: FocusSource }) {
  const resolvedSource = source ?? getFallbackSource(item);
  return <details className={styles.details}>
    <summary aria-label={`Read details: ${item.outcome}`} title={item.outcome}>
      <strong>{item.outcome}</strong>
      <small>{item.priority.toLocaleLowerCase()} · {item.mustCloseToday ? "must close" : "flexible"} · <span className={resolvedSource.isOperationalRecord ? styles.linked : styles.manual}>{resolvedSource.label}</span> · <em>Read details</em></small>
    </summary>
    <div className={styles.body}>
      <dl>
        <dt>Source</dt><dd>{resolvedSource.description}</dd>
        <dt>Full outcome</dt><dd>{item.outcome}</dd>
        <dt>Latest saved progress</dt><dd>{item.progressUpdate || "No progress update saved yet."}</dd>
        {item.riskNote ? <><dt>Risk / blocker</dt><dd>{item.riskNote}</dd></> : null}
        {item.supportNeeded ? <><dt>Support needed</dt><dd>{item.supportNeeded}</dd></> : null}
      </dl>
      {resolvedSource.href ? <Link href={resolvedSource.href}>{resolvedSource.actionLabel}</Link> : onConvertToTask ? <button disabled={disabled || converting} onClick={onConvertToTask} type="button">{converting ? "Creating task…" : "Convert to task"}</button> : null}
    </div>
  </details>;
}
