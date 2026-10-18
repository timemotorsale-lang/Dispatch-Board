import Link from "next/link";
import styles from "./estimate-workflow-next-step.module.css";

export function EstimateWorkflowNextStep({ repairOrderId, estimateId, reviewWorkflow = false }: { reviewWorkflow?: boolean; repairOrderId: string; estimateId: string }) {
  return <section className={styles.saved} aria-label="Estimate saved — next step"><p role="status"><strong>Estimate saved to this RO.</strong> Next: review / authorize the estimate.</p><p>Saving or printing does not authorize repairs. Continue through authorization, parts and assignment, repair, QC and closeout.</p><Link href={`/repair-estimate?${new URLSearchParams({ repairOrderId, estimateId, ...(reviewWorkflow ? { workflow: "review" } : {}) })}`}>View / Print saved estimate</Link><Link href={`/service-documents?${new URLSearchParams({ repairOrderId })}`}>Documents & approvals</Link></section>;
}
