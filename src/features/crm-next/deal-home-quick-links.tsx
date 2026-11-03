"use client";
import Link from "next/link";
import styles from "./deal-workspace-overview.module.css";
export function DealHomeQuickLinks({ onContinue, onPaperwork, onReturns, onSummary }: { onContinue: () => void; onPaperwork: () => void; onReturns: () => void; onSummary: () => void }) {
 return <section className={styles.panel} aria-label="Deal quick actions"><h2>Quick actions</h2><div className={styles.actions}>
  <Link className={styles.primary} href="/crm-next/deals/start?new=1">Start Deal</Link>
  <button type="button" onClick={onContinue}>Resume Deal</button>
  <Link href="/crm-next/customers">Find Customer / Prospect</Link>
  <button type="button" onClick={onContinue}>Prepare Packet</button>
  <button type="button" onClick={onContinue}>Upload Signed Documents</button>
  <button type="button" onClick={onPaperwork}>Sold · paperwork pending</button>
  <button type="button" onClick={onReturns}>Rental / loaner returns</button>
  <button type="button" onClick={onSummary}>Period summary</button>
 </div></section>;
}
