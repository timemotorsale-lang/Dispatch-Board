import Link from "next/link";
import { WalletCards } from "lucide-react";

import { formatDay } from "../domain/account-ref";
import { formatCents } from "../domain/money-dates";
import type { CustomerCollectionsAccount } from "../server/customer-card";

/**
 * Read-only Collections summary for the customer page. Payments, promises and notes are
 * recorded in the Collections account workspace, which the button opens.
 */
export function CustomerCollectionsPanel({ accounts, className }: { accounts: CustomerCollectionsAccount[]; className?: string }) {
  if (!accounts.length) return null;
  return (
    <article className={className} aria-labelledby="customer-collections-title">
      <header><h2 id="customer-collections-title"><WalletCards size={18} aria-hidden="true" /> Collections</h2></header>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
        {accounts.map(account => (
          <li key={account.id} style={{ display: "grid", gap: 4 }}>
            <strong>{account.refs || (account.accountType === "BHPH" ? "BHPH account" : "Lease-to-own account")}</strong>
            <span>
              {account.frozen ? "Bankruptcy freeze: don't collect" : account.daysPastDue > 0 ? `${account.daysPastDue} day${account.daysPastDue === 1 ? "" : "s"} late · ${formatCents(account.amountDueCents)} due` : "Current"}
              {" · "}{account.statusLabel}
            </span>
            <small>Balance {formatCents(account.totalBalanceCents)}{account.nextDueDate ? ` · Next due ${formatDay(account.nextDueDate)}` : ""}</small>
            <Link href={account.href}>Open collections account</Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
