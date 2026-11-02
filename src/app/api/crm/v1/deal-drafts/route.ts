import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { archiveDuplicateDealDraft, listDealDrafts, listSavedDealLibrary, readDealDeskDraft, saveDealDeskDraft } from "@/server/sales-documents/deal-drafts";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { listDealWorkbench } from "@/server/sales-documents/deal-workbench";
import { manageDealLifecycle } from "@/server/sales-documents/deal-lifecycle";
import { manageDealOperations, readDealOperations } from "@/server/sales-documents/dashboard-operations";

function failure(error: unknown) {
  if (error instanceof SalesDocumentsError) return NextResponse.json({ error: error.message }, { status: error.status });
  const reference = crypto.randomUUID().slice(0, 8);
  const details = error && typeof error === "object" ? error as { code?: string; name?: string; meta?: { table?: string; column?: string; modelName?: string; error?: string } } : {};
  const code = typeof details.code === "string" ? details.code : "DRAFT_SAVE_FAILED";
  const explanation = code === "P2021" || code === "P2022" ? "The saved-deal database is missing a required table or column. An administrator must apply the pending database updates; changing deal fields will not fix this."
    : code === "P2028" || code === "P2024" ? "Saving timed out while checking the deal. Retry saving this same deal; do not create another deal."
    : code === "P2003" ? "A linked customer, vehicle or source record is no longer available. Re-select the linked record in this deal and retry saving."
    : code === "P1001" || code === "P1002" ? "The saved-deal database could not be reached. Retry saving when the connection is restored."
    : "An unexpected error prevented this deal from saving. Retry saving this same deal. If it continues, give the support reference below to your administrator.";
  console.error("Saved deal request failed", JSON.stringify({ reference, code, name: details.name, model: details.meta?.modelName, table: details.meta?.table, column: details.meta?.column, detail: code === "P2028" ? details.meta?.error : undefined, runtime: error instanceof TypeError ? error.message : undefined, validation: error instanceof Error ? error.message.split("\n").filter(line => /Unknown argument|Argument .+ is missing|Invalid value for argument|Expected .+, provided/.test(line)).join(" ") : undefined, location: error instanceof Error ? error.stack?.split("\n").filter(line => /^\s+at /.test(line)).slice(0, 4) : undefined }));
  return NextResponse.json({ error: `${explanation} Your entries remain on this screen. Support reference: ${reference} (${code}).`, code, reference }, { status: 503 });
}
export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser(), params = new URL(request.url).searchParams;
    if (params.get("view") === "operations") return NextResponse.json(await readDealOperations(actor, Object.fromEntries(params)));
    if (params.get("view") === "workbench") return NextResponse.json(await listDealWorkbench(actor, params));
    if (params.get("view") === "library") return NextResponse.json(await listSavedDealLibrary(actor, params));
    return NextResponse.json(params.get("id") ? await readDealDeskDraft(actor, params.get("id")!) : await listDealDrafts(actor, params.get("customerId") ?? ""));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await saveDealDeskDraft(await getCurrentUser(), await request.json())); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  // TLS terminates at the production proxy; request.url can have an internal HTTP origin.
  const host = request.headers.get("host") || new URL(request.url).host;
  let trustedOrigin = request.headers.get("sec-fetch-site") !== "cross-site";
  if (origin) {
    try {
      const source = new URL(origin);
      trustedOrigin &&= ["http:", "https:"].includes(source.protocol) && source.host === host && source.origin === origin;
    } catch { trustedOrigin = false; }
  }
  if (!trustedOrigin) return NextResponse.json({ error: "Reload this deal from the application, then try the action again. The request did not match this website." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null);
    if (!body) throw new SalesDocumentsError("Choose a deal action.");
    if (["DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE"].includes(body.action)) return NextResponse.json(await manageDealOperations(await getCurrentUser(), body));
    if (["MARK_SOLD", "PREPARE_PAPERWORK", "FINISH", "REOPEN", "REQUEST_UNWIND"].includes(body.action)) return NextResponse.json(await manageDealLifecycle(await getCurrentUser(), body));
    if (body.action !== "ARCHIVE_DUPLICATE") throw new SalesDocumentsError("Choose the archive duplicate action.");
    return NextResponse.json(await archiveDuplicateDealDraft(await getCurrentUser(), body));
  } catch (error) { return failure(error); }
}
