import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";
import { getInbox } from "@/features/collections/server/messaging-service";

export async function GET(request: Request) {
  try {
    assertModuleOn();
    const thread = new URL(request.url).searchParams.get("thread");
    return collectionsJson(await getInbox(await getCurrentUser(), { thread }));
  } catch (error) { return collectionsErrorResponse(error); }
}
