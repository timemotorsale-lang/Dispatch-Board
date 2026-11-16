import { notFound } from "next/navigation";

import { CollectionsError } from "@/features/collections/config/permissions";
import { getAccountDetail } from "@/features/collections/server/account-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { getAccountLedger } from "@/features/collections/server/ledger-service";
import { getAccountUpgrades } from "@/features/collections/server/upgrades-service";
import { AccountWorkspace } from "@/features/collections/ui/account-workspace";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { InsurancePanel } from "@/features/collections/ui/insurance-panel";
import { LedgerPanel } from "@/features/collections/ui/ledger-panel";
import { MessagesPanel } from "@/features/collections/ui/messages-panel";
import { PromisesPanel } from "@/features/collections/ui/promises-panel";
import { RecoveryPanel } from "@/features/collections/ui/recovery-panel";
import { ChargeOffPanel, DoThisNext, ExtensionsAndFeesPanel, SkipPanel } from "@/features/collections/ui/upgrades-panels";

type Props = { params: Promise<{ accountId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function CollectionsAccountPage({ params, searchParams }: Props) {
  const user = await requireCollectionsPage("VIEW");
  const { accountId } = await params;
  const query = (await searchParams) ?? {};
  let detail, upgrades, ledger;
  try {
    [detail, upgrades, ledger] = await Promise.all([getAccountDetail(user, accountId), getAccountUpgrades(user, accountId), getAccountLedger(user, accountId)]);
  } catch (error) {
    if (error instanceof CollectionsError && error.status === 404) notFound();
    throw error;
  }
  const log = typeof query.log === "string" ? (query.log === "1" ? "CALL_OUT" : query.log) : "";
  return (
    <CollectionsFrame section="accounts" title={detail.customer?.displayName ?? detail.account.buyerNameRaw} description={`Deal ${detail.account.dealNumber ?? "—"} · ${detail.account.vehicleDescriptionRaw ?? ""}`}>
      <DoThisNext u={upgrades} />
      <AccountWorkspace detail={detail} initialLog={log} extraPanels={<>
        <PromisesPanel d={detail} />
        <MessagesPanel d={detail} />
        <InsurancePanel d={detail} />
        <ExtensionsAndFeesPanel d={detail} u={upgrades} />
        <SkipPanel d={detail} u={upgrades} />
        <RecoveryPanel d={detail} />
        <ChargeOffPanel d={detail} u={upgrades} />
        <LedgerPanel d={detail} l={ledger} />
      </>} />
    </CollectionsFrame>
  );
}
