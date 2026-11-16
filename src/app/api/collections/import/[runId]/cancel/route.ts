import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, requireSameOrigin } from "@/features/collections/server/http";
import { cancelCollectionsImport } from "@/features/collections/server/import-service";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    return collectionsJson(await cancelCollectionsImport(await getCurrentUser(), (await context.params).runId));
  } catch (error) { return collectionsErrorResponse(error); }
}
