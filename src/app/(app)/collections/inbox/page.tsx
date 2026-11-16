import { getInbox } from "@/features/collections/server/messaging-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { InboxScreen } from "@/features/collections/ui/inbox-screen";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CollectionsInboxPage({ searchParams }: { searchParams?: Search }) {
  const user = await requireCollectionsPage("VIEW");
  const query = (await searchParams) ?? {};
  const inbox = await getInbox(user, { thread: typeof query.thread === "string" ? query.thread : null });
  return (
    <CollectionsFrame section="inbox" title="Inbox" description="Customer texts, newest and unread first.">
      <InboxScreen inbox={inbox} />
    </CollectionsFrame>
  );
}
