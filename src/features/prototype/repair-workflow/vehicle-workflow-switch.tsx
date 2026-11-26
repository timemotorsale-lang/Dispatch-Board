import Link from "next/link";
import styles from "./repair-workflow.module.css";

export function VehicleWorkflowSwitch({ inventoryHref, shopHref, active, overviewStages, inventoryUnavailableReason }: {
  inventoryHref?: string;
  shopHref?: string;
  active?: "inventory" | "shop";
  overviewStages?: { inventory?: string; shop: string };
  inventoryUnavailableReason?: string;
}) {
  const unavailable = inventoryUnavailableReason && <span className={styles.unavailableLifecycle} aria-disabled="true">
    <strong>Inventory Lifecycle</strong><small>{inventoryUnavailableReason}</small>
  </span>;
  if (overviewStages && !inventoryHref && inventoryUnavailableReason && shopHref) {
    return <nav className={styles.workflowCards} aria-label="Vehicle workflows">
      <div className={styles.shopOnlyCard}>
        <Link href={shopHref}>Open Shop &amp; Recon</Link>
        <small>{overviewStages.shop} · {inventoryUnavailableReason}</small>
      </div>
    </nav>;
  }
  if (overviewStages) {
    return <nav className={styles.workflowCards} aria-label="Vehicle workflows">
      <details>
        <summary aria-label="Choose lifecycle" aria-describedby="current-shop-stage">
          <strong>Vehicle lifecycle</strong>
          <small id="current-shop-stage">{overviewStages.shop}</small>
        </summary>
        <div>
          {inventoryHref ? <Link href={inventoryHref} aria-label="Inventory Lifecycle" aria-describedby="inventory-stage-summary">
            <strong>Inventory Lifecycle</strong>
            <small id="inventory-stage-summary">{overviewStages.inventory ?? "View inventory status"}</small>
          </Link> : unavailable}
          {shopHref && <Link href={shopHref}>Shop &amp; Recon</Link>}
        </div>
      </details>
    </nav>;
  }

  return <nav className={styles.workflowSwitch} aria-label="Vehicle workflows">
    {active === "inventory" ? <span aria-current="page">Inventory Lifecycle</span>
      : inventoryHref ? <Link href={inventoryHref}>Inventory Lifecycle</Link>
        : unavailable ?? <span aria-disabled="true">Inventory Lifecycle</span>}
    {active === "shop" ? <span aria-current="page">Shop &amp; Recon</span>
      : shopHref ? <Link href={shopHref}>Shop &amp; Recon</Link>
        : <span aria-disabled="true" title="Open a repair order to enter Shop & Recon">Shop &amp; Recon</span>}
  </nav>;
}
