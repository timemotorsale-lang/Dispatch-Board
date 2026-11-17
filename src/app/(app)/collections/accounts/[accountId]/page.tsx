import { notFound } from "next/navigation";

import { CollectionsError } from "@/features/collections/config/permissions";
import { QUEUE_TABS, type QueueTab } from "@/features/collections/domain/queue";
import { getAccountDetail, getQueue } from "@/features/collections/server/account-service";
import { getAccountLedger } from "@/features/collections/server/ledger-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { getAccountUpgrades } from "@/features/collections/server/upgrades-service";
import { ACCOUNT_VIEWS, AccountShell, type AccountView } from "@/features/collections/ui/account-shell";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";

type Props = { params: Promise<{ accountId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** Older links used #message / #promise / ?log=…; they map onto the new tabs. */
function viewFrom(query: Record<string, string | string[] | undefined>): AccountView {
  const v = typeof query.view === "string" ? query.view : "";
  if ((ACCOUNT_VIEWS.map(([key]) => key) as string[]).includes(v)) return v as AccountView;
  if (typeof query.log === "string") return "contact";
  return "overview";
}

export default async function CollectionsAccountPage({ params, searchParams }: Props) {
  const user = await requireCollectionsPage("VIEW");
  const { accountId } = await params;
  const query = (await searchParams) ?? {};
  const fromRaw = typeof query.from === "string" ? query.from : "PAST_DUE";
  const from: QueueTab = QUEUE_TABS.some(t => t.key === fromRaw) ? (fromRaw as QueueTab) : "PAST_DUE";
  let detail, upgrades, ledger, queue;
  try {
    [detail, upgrades, ledger, queue] = await Promise.all([getAccountDetail(user, accountId), getAccountUpgrades(user, accountId), getAccountLedger(user, accountId), getQueue(user, { tab: from })]);
  } catch (error) {
    if (error instanceof CollectionsError && error.status === 404) notFound();
    throw error;
  }
  const index = queue.orderIds.indexOf(accountId);
  const nav = {
    from, total: queue.orderIds.length, position: index >= 0 ? index + 1 : null,
    prevId: index > 0 ? queue.orderIds[index - 1] : null, nextId: index >= 0 && index < queue.orderIds.length - 1 ? queue.orderIds[index + 1] : null
  };
  const log = typeof query.log === "string" ? (query.log === "1" ? "CALL_OUT" : query.log) : "";
  return (
    <CollectionsFrame section="accounts" title={detail.customer?.displayName ?? detail.account.buyerNameRaw} description={`${detail.account.vehicleDescriptionRaw ?? "Vehicle not listed"}${detail.snapshot?.asOfDate ? ` · DealerCenter data as of ${detail.snapshot.asOfDate}` : ""}`}>
      <AccountShell d={detail} u={upgrades} l={ledger} initialView={viewFrom(query)} initialLog={log} nav={nav} />
    </CollectionsFrame>
  );
}
