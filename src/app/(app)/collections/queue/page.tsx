import { parseQueueDateFilters, QUEUE_TABS, type QueueTab } from "@/features/collections/domain/queue";
import { getQueue } from "@/features/collections/server/account-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { QueueScreen } from "@/features/collections/ui/queue-screen";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CollectionsQueuePage({ searchParams }: { searchParams?: Search }) {
  const user = await requireCollectionsPage("VIEW");
  const query = (await searchParams) ?? {};
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const dates = parseQueueDateFilters(value);
  // A date search on its own looks at every open account (current ones too), unless a tab was picked.
  const tab = QUEUE_TABS.some(item => item.key === value("tab")) ? (value("tab") as QueueTab) : dates.dateField && dates.when ? "ALL" : "PAST_DUE";
  const filters = { bucket: value("bucket"), type: value("type"), q: value("q"), status: value("status"), sort: value("sort") === "RISK" ? "RISK" : "", ...dates };
  const queue = await getQueue(user, { tab, bucket: filters.bucket as never, type: filters.type as never, q: filters.q, status: filters.status, sort: filters.sort as "" | "RISK", ...dates });
  return (
    <CollectionsFrame section="queue" title="Today's collections queue" description="Broken promises first, then reported payments not found, then the most days past due.">
      <QueueScreen tab={queue.tab} counts={queue.counts} rows={queue.rows} totalRows={queue.totalRows} filters={filters} lastImport={queue.lastImport} importedToday={queue.importedToday} summary={queue.summary} />
    </CollectionsFrame>
  );
}
