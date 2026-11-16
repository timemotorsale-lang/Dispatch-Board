import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";
import { getSettingsPage, saveSettings } from "@/features/collections/server/settings-service";

export async function GET() {
  try {
    assertModuleOn();
    return collectionsJson(await getSettingsPage(await getCurrentUser()));
  } catch (error) { return collectionsErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    const body = await readJsonBody(request);
    return collectionsJson(await saveSettings(await getCurrentUser(), { values: body.values, version: Number(body.version), reason: typeof body.reason === "string" ? body.reason : "" }));
  } catch (error) { return collectionsErrorResponse(error); }
}
