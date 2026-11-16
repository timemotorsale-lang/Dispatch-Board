import { getCurrentUser } from "@/server/auth/current-user";
import { getAccountDetail } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";

export async function GET(_request: Request, context: { params: Promise<{ accountId: string }> }) {
  try {
    assertModuleOn();
    return collectionsJson(await getAccountDetail(await getCurrentUser(), (await context.params).accountId));
  } catch (error) { return collectionsErrorResponse(error); }
}
