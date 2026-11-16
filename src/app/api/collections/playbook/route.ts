import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";
import { getPlaybookPage, playbookAction } from "@/features/collections/server/playbook-service";

export async function GET() {
  try {
    assertModuleOn();
    return collectionsJson(await getPlaybookPage(await getCurrentUser()));
  } catch (error) { return collectionsErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    return collectionsJson(await playbookAction(await getCurrentUser(), await readJsonBody(request)));
  } catch (error) { return collectionsErrorResponse(error); }
}
