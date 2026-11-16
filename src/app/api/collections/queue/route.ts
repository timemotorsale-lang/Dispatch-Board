import { getCurrentUser } from "@/server/auth/current-user";
import { QUEUE_TABS, type QueueTab } from "@/features/collections/domain/queue";
import { getQueue } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";

export async function GET(request: Request) {
  try {
    assertModuleOn();
    const params = new URL(request.url).searchParams;
    const tab = QUEUE_TABS.some(item => item.key === params.get("tab")) ? params.get("tab") as QueueTab : "PAST_DUE";
    return collectionsJson(await getQueue(await getCurrentUser(), {
      tab,
      bucket: (params.get("bucket") ?? "") as never,
      type: (params.get("type") ?? "") as never,
      collector: params.get("collector") ?? "",
      status: params.get("status") ?? "",
      q: params.get("q") ?? "",
      sort: params.get("sort") === "RISK" ? "RISK" : ""
    }));
  } catch (error) { return collectionsErrorResponse(error); }
}
