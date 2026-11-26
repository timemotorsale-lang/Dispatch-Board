import Link from "next/link";
import styles from "./estimate-workflow-next-step.module.css";

export function EstimateWorkflowNextStep({ repairOrderId, estimateId, reviewWorkflow = false, nextHref }: { reviewWorkflow?: boolean; repairOrderId: string; estimateId: string; nextHref?: string }) {
  return <section className={styles.saved} aria-label="Estimate saved — next step"><p role="status"><strong>Estimate saved to this RO.</strong> Next: review / authorize the estimate.</p><p>Saving or printing does not authorize repairs. Continue through authorization, parts and assignment, repair, QC and closeout.</p>{nextHref && <Link className={styles.next} href={nextHref}>Continue to authorization</Link>}<Link href={`/repair-estimate?${new URLSearchParams({ repairOrderId, estimateId, ...(reviewWorkflow ? { workflow: "review" } : {}) })}`}>View / Print saved estimate</Link><Link href={`/service-documents?${new URLSearchParams({ repairOrderId })}`}>Documents & approvals</Link></section>;
}
