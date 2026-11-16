import { getCurrentUser } from "@/server/auth/current-user";
import { searchCustomers } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";

export async function GET(request: Request) {
  try {
    assertModuleOn();
    return collectionsJson({ customers: await searchCustomers(await getCurrentUser(), new URL(request.url).searchParams.get("q") ?? "") });
  } catch (error) { return collectionsErrorResponse(error); }
}
