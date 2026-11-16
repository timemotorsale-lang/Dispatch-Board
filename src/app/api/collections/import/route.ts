import { getCurrentUser } from "@/server/auth/current-user";
import { CollectionsError } from "@/features/collections/config/permissions";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, requireSameOrigin } from "@/features/collections/server/http";
import { listCollectionsImports, previewCollectionsImport } from "@/features/collections/server/import-service";

export async function GET() {
  try {
    assertModuleOn();
    return collectionsJson({ imports: await listCollectionsImports(await getCurrentUser()) });
  } catch (error) { return collectionsErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw new CollectionsError("The file is larger than 10 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new CollectionsError("Choose the DealerCenter file to upload.");
    const asOfDate = typeof form.get("asOfDate") === "string" ? String(form.get("asOfDate")) : null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    return collectionsJson(await previewCollectionsImport(await getCurrentUser(), { fileName: file.name, bytes, asOfDate: asOfDate || null }));
  } catch (error) { return collectionsErrorResponse(error); }
}
