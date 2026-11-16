import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";
import { getImportPreview } from "@/features/collections/server/import-service";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    assertModuleOn();
    return collectionsJson(await getImportPreview(await getCurrentUser(), (await context.params).runId));
  } catch (error) { return collectionsErrorResponse(error); }
}
