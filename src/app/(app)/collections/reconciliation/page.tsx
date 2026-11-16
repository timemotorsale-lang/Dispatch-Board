import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { getReconciliation } from "@/features/collections/server/reconciliation-service";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { ReconciliationScreen } from "@/features/collections/ui/reconciliation-screen";

type Search = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["ALL", "DIFFERENT", "MATCHED", "NO_CONTRACT"] as const;

export default async function CollectionsReconciliationPage({ searchParams }: { searchParams?: Search }) {
  const user = await requireCollectionsPage("VIEW_DASHBOARD");
  const f = (await searchParams)?.filter;
  const filter = typeof f === "string" && (FILTERS as readonly string[]).includes(f) ? (f as (typeof FILTERS)[number]) : "DIFFERENT";
  const data = await getReconciliation(user, filter);
  return (
    <CollectionsFrame section="reconciliation" title="Reconciliation" description="Does the app's shadow ledger match DealerCenter, account by account?">
      <ReconciliationScreen data={data} />
    </CollectionsFrame>
  );
}
