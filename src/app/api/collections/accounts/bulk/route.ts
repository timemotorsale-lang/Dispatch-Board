import { getCurrentUser } from "@/server/auth/current-user";
import { bulkAccountAction } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";

export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    return collectionsJson(await bulkAccountAction(await getCurrentUser(), await readJsonBody(request)));
  } catch (error) { return collectionsErrorResponse(error); }
}
