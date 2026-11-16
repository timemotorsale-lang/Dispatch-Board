import { getCurrentUser } from "@/server/auth/current-user";
import { CollectionsError } from "@/features/collections/config/permissions";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, requireSameOrigin } from "@/features/collections/server/http";
import { importHistory } from "@/features/collections/server/migration-service";

/** Upload a DealerCenter contracts or payment-history file. dryRun=1 only checks it. */
export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw new CollectionsError("The file is larger than 10 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new CollectionsError("Choose a file.");
    const kind = form.get("kind") === "PAYMENTS" ? "PAYMENTS" : "CONTRACTS";
    let columnMap: Record<string, string> = {};
    try { columnMap = JSON.parse(String(form.get("columnMap") ?? "{}")); } catch { throw new CollectionsError("The column choices couldn't be read. Reload and try again."); }
    return collectionsJson(await importHistory(await getCurrentUser(), { kind, fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()), columnMap, dryRun: form.get("dryRun") !== "0" }));
  } catch (error) { return collectionsErrorResponse(error); }
}
