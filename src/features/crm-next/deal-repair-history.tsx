"use client";

import { RepairHistorySearch } from "@/features/repair-history/repair-history-search";

export function DealRepairHistory({ customerId, requireCustomer = false }: { customerId?: string; requireCustomer?: boolean }) {
  if (requireCustomer && !customerId) return <p>Select a shared customer to find their saved repair work.</p>;
  return <div>
    <p>{customerId ? "Search this customer's saved repair work, including closed repairs and records without a deal." : "Search saved repair drafts, estimates, invoices and receipts, including closed repairs without a deal. Deal filters and counts are separate."}</p>
    <RepairHistorySearch initialCustomerId={customerId} />
  </div>;
}
