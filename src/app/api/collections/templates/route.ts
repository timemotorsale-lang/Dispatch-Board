import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";
import { templateAction } from "@/features/collections/server/settings-service";

export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    return collectionsJson(await templateAction(await getCurrentUser(), await readJsonBody(request)));
  } catch (error) { return collectionsErrorResponse(error); }
}
