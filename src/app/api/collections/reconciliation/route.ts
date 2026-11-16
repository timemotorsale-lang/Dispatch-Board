import { getCurrentUser } from "@/server/auth/current-user";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, readJsonBody, requireSameOrigin } from "@/features/collections/server/http";
import { loadOpeningBalances } from "@/features/collections/server/migration-service";
import { addReconciliationNote, getReconciliation, runReconciliationNow } from "@/features/collections/server/reconciliation-service";

const FILTERS = ["ALL", "DIFFERENT", "MATCHED", "NO_CONTRACT"] as const;

export async function GET(request: Request) {
  try {
    assertModuleOn();
    const f = new URL(request.url).searchParams.get("filter");
    return collectionsJson(await getReconciliation(await getCurrentUser(), (FILTERS as readonly string[]).includes(f ?? "") ? (f as (typeof FILTERS)[number]) : "DIFFERENT"));
  } catch (error) { return collectionsErrorResponse(error); }
}

/** Actions: RUN (check now), NOTE (explain a difference), OPENING_BALANCES (dry run or load). */
export async function POST(request: Request) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    const body = await readJsonBody(request);
    const user = await getCurrentUser();
    if (body.action === "RUN") return collectionsJson(await runReconciliationNow(user));
    if (body.action === "NOTE") return collectionsJson(await addReconciliationNote(user, String(body.accountId ?? ""), String(body.note ?? "")));
    if (body.action === "OPENING_BALANCES") return collectionsJson(await loadOpeningBalances(user, { dryRun: body.dryRun !== false }));
    return collectionsJson({ error: "Unknown action." }, 400);
  } catch (error) { return collectionsErrorResponse(error); }
}
