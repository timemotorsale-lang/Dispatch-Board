import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, requireSameOrigin } from "@/features/collections/server/http";
import { commitCollectionsImport } from "@/features/collections/server/import-service";
import { afterImportCommitted } from "@/features/collections/server/after-import";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    const actor = await getCurrentUser();
    const result = await commitCollectionsImport(actor, (await context.params).runId);
    const automation = await afterImportCommitted(actor, result);
    return collectionsJson({ ...result, accountIds: undefined, automation });
  } catch (error) { return collectionsErrorResponse(error); }
}
