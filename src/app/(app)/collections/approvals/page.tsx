import Link from "next/link";

import { formatCents } from "@/features/collections/domain/money-dates";
import { getApprovals } from "@/features/collections/server/home-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import styles from "@/features/collections/ui/collections.module.css";

export default async function CollectionsApprovalsPage() {
  const user = await requireCollectionsPage("VIEW");
  const { isAdmin, items } = await getApprovals(user);
  return (
    <CollectionsFrame section="home" title={isAdmin ? "Waiting for your decision" : "Your requests"} description={isAdmin ? "Oldest first. Open an item to approve or decline it on the account." : "What you've asked for and where each request stands."}>
      {items.length === 0 ? <p className={styles.empty}>Nothing is waiting. You&apos;re all caught up.</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">Request</th><th scope="col">Account</th><th scope="col">Details</th><th scope="col">Status</th><th scope="col">Since</th></tr></thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={`${i.kind}-${n}`}>
                  <th scope="row"><Link href={i.href}>{i.kind}</Link>{i.amountCents != null ? <><br /><small>{formatCents(i.amountCents)}</small></> : null}</th>
                  <td>{i.name}<br /><small>Deal {i.deal ?? "—"} · {i.daysPastDue} days late</small></td>
                  <td>{i.what}</td>
                  <td><span className={`${styles.chip} ${i.status.startsWith("Waiting") || i.status.startsWith("Confirm") ? styles.chipWarn : i.status.startsWith("Not found") ? styles.chipDanger : styles.chipGood}`}>{i.status}</span></td>
                  <td>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }).format(new Date(i.at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollectionsFrame>
  );
}
