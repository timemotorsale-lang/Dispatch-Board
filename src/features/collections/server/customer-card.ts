/**
 * The small "Collections" card on the customer page: this customer's collections accounts,
 * read-only, with a link into the Collections module. Shows nothing at all when the module is
 * off, the person has no Collections access, or the customer has no collections account.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { hasCollectionsPermission } from "../config/permissions";
import { accountRefs } from "../domain/account-ref";
import { toYmd } from "../domain/money-dates";
import { STATUS_LABELS, type AccountStatus } from "../domain/status";
import { collectionsAccess } from "./access";
import { visibilityWhere } from "./account-service";

export type CustomerCollectionsAccount = {
  id: string;
  href: string;
  refs: string;
  accountType: "LEASE_TO_OWN" | "BHPH";
  statusLabel: string;
  daysPastDue: number;
  amountDueCents: number;
  totalBalanceCents: number;
  nextDueDate: string | null;
  frozen: boolean;
};

export async function getCustomerCollectionsCard(actor: AuthenticatedUser | null, customerId: string): Promise<CustomerCollectionsAccount[]> {
  if (!actor || !hasCollectionsPermission(actor, "VIEW")) return [];
  let access;
  try {
    access = await collectionsAccess(actor, "VIEW");
  } catch {
    return [];
  }
  const accounts = await prisma.collectionAccount.findMany({
    where: { organizationId: access.organizationId, customerId, archivedAt: null, ...(await visibilityWhere(access)) },
    orderBy: [{ closedStatus: { sort: "asc", nulls: "first" } }, { daysPastDue: "desc" }],
    take: 10,
    select: {
      id: true, dealNumber: true, stockNumberRaw: true, vin: true, accountType: true, status: true, daysPastDue: true, amountDueCents: true, totalBalanceCents: true,
      flags: { where: { clearedAt: null, type: "BANKRUPTCY" }, select: { id: true } },
      snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1, select: { paymentDueDate: true } }
    }
  });
  return accounts.map(account => ({
    id: account.id,
    href: `/collections/accounts/${account.id}`,
    refs: accountRefs(account),
    accountType: account.accountType,
    statusLabel: STATUS_LABELS[account.status as AccountStatus] ?? account.status,
    daysPastDue: account.daysPastDue,
    amountDueCents: account.amountDueCents,
    totalBalanceCents: account.totalBalanceCents,
    nextDueDate: toYmd(account.snapshots[0]?.paymentDueDate ?? null),
    frozen: account.status === "BANKRUPTCY_FROZEN" || account.flags.length > 0
  }));
}
