import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";
import { getIntegrationsHealth, runIntegrationTestCall } from "@/features/collections/server/integrations/registry";

export async function GET() {
  try {
    assertModuleOn();
    return collectionsJson(await getIntegrationsHealth(await getCurrentUser()));
  } catch (error) { return collectionsErrorResponse(error); }
}

/** Runs a harmless sample call against one integration (TEST mode only). */
export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    const body = await readJsonBody(request);
    return collectionsJson(await runIntegrationTestCall(await getCurrentUser(), typeof body.key === "string" ? body.key : ""));
  } catch (error) { return collectionsErrorResponse(error); }
}
