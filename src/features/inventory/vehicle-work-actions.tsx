import Link from "next/link";
import { repairResumeHref, type RepairResume, type VehicleWorkActions } from "@/lib/repair-resume";
import { repairReviewHref, repairWorkflowLabels } from "@/lib/repair-workflow-review";
import { shopReconLifecycleHref } from "@/lib/vehicle-lifecycle-links";
import styles from "./vehicle-work-actions.module.css";

export function RepairOrderActions({ order, returnTo, returnLabel, showSummary = true, resume = true }: { order: RepairResume; returnTo?: string; returnLabel?: string; showSummary?: boolean; resume?: boolean }) {
  const repairHref = repairReviewHref(order.id, undefined, { returnTo, returnLabel });
  return <div className={styles.order}>
    {showSummary && <div className={styles.orderContext}><strong>{order.number}</strong><span>{repairWorkflowLabels[order.stage]} · {order.owner}</span>
      {order.blockedReason && <small>{order.blockedReason}</small>}
    </div>}
    <div className={styles.actions}>
      <Link prefetch={false} className={styles.primary} href={resume ? repairResumeHref(order, returnTo, returnLabel) : repairHref}>{order.action}</Link>
      <details className={styles.more}>
        <summary>More actions</summary>
        <div>
          {order.canAct && resume && <Link prefetch={false} href={repairHref}>Open repair order</Link>}
          <Link prefetch={false} href={shopReconLifecycleHref(order.id, repairHref)}>Open Shop &amp; Recon</Link>
        </div>
      </details>
    </div>
  </div>;
}

export function VehicleWorkToolkit({ work, vehicleId, returnTo, returnLabel, showDetails = true, preferSale = false }: {
  work?: VehicleWorkActions;
  vehicleId: string;
  returnTo?: string;
  returnLabel?: string;
  showDetails?: boolean;
  preferSale?: boolean;
}) {
  const details = `/vehicles/360/${encodeURIComponent(vehicleId)}`;
  const detailsHref = returnTo ? `${details}?${new URLSearchParams({ section: "identity", returnTo })}` : `${details}?section=identity`;
  const saleHref = `/vehicles/${encodeURIComponent(vehicleId)}/sale`;
  const intakeHref = `/vehicles/repair-orders?${new URLSearchParams({ intakeSource: "WALK_IN", vehicleId, ...(returnTo && { returnTo }) })}`;
  const saleFirst = preferSale && work?.canPrepareSale && !work.orders.length;
  const hasPrimary = Boolean(work?.orders.length || work?.canCheckIn || saleFirst);
  return <div className={styles.toolkit}>
    {work?.orders.length === 1 ? <RepairOrderActions order={work.orders[0]} returnTo={returnTo} returnLabel={returnLabel} />
      : work && work.orders.length > 1 ? <details className={styles.orderList}>
        <summary>Choose open work ({work.orders.length})</summary>
        {work.orders.map(order => <RepairOrderActions key={order.id} order={order} returnTo={returnTo} returnLabel={returnLabel} />)}
      </details> : saleFirst ? <Link prefetch={false} className={styles.primary} href={saleHref}>Prepare for sale</Link>
      : work?.canCheckIn ? <Link prefetch={false} className={styles.primary} href={intakeHref}>Check in for service</Link> : null}
    <div className={styles.actions}>
      {showDetails && <Link className={preferSale && !hasPrimary ? styles.primary : undefined} prefetch={false} href={detailsHref}>Vehicle details</Link>}
      {saleFirst && work.canCheckIn && <Link prefetch={false} href={intakeHref}>Check in for service</Link>}
      {work?.canPrepareSale && !work.orders.length && (!saleFirst || work.canStartAsIsSale) && <details className={styles.more}>
        <summary>Sale tools</summary>
        <div>{!saleFirst && <Link prefetch={false} href={saleHref}>Prepare for Sale</Link>}
          {work.canStartAsIsSale && <Link prefetch={false} href={`${saleHref}?mode=as-is`}>Start As-Is Sale</Link>}
        </div>
      </details>}
    </div>
  </div>;
}
