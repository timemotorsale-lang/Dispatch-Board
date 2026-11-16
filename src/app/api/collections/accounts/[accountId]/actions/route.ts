import { getCurrentUser } from "@/server/auth/current-user";
import { runAccountAction } from "@/features/collections/server/action-router";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";

export async function POST(request: Request, context: { params: Promise<{ accountId: string }> }) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    return collectionsJson(await runAccountAction(await getCurrentUser(), (await context.params).accountId, await readJsonBody(request)));
  } catch (error) { return collectionsErrorResponse(error); }
}
