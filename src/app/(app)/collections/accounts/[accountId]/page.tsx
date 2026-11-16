import { notFound } from "next/navigation";

import { CollectionsError } from "@/features/collections/config/permissions";
import { getAccountDetail } from "@/features/collections/server/account-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { AccountWorkspace } from "@/features/collections/ui/account-workspace";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { MessagesPanel } from "@/features/collections/ui/messages-panel";
import { PromisesPanel } from "@/features/collections/ui/promises-panel";

type Props = { params: Promise<{ accountId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function CollectionsAccountPage({ params, searchParams }: Props) {
  const user = await requireCollectionsPage("VIEW");
  const { accountId } = await params;
  const query = (await searchParams) ?? {};
  let detail;
  try {
    detail = await getAccountDetail(user, accountId);
  } catch (error) {
    if (error instanceof CollectionsError && error.status === 404) notFound();
    throw error;
  }
  const log = typeof query.log === "string" ? (query.log === "1" ? "CALL_OUT" : query.log) : "";
  return (
    <CollectionsFrame section="accounts" title={detail.customer?.displayName ?? detail.account.buyerNameRaw} description={`Deal ${detail.account.dealNumber ?? "—"} · ${detail.account.vehicleDescriptionRaw ?? ""}`}>
      <AccountWorkspace detail={detail} initialLog={log} extraPanels={<><PromisesPanel d={detail} /><MessagesPanel d={detail} /></>} />
    </CollectionsFrame>
  );
}
