import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { archiveDuplicateDealDraft, listDealDrafts, listSavedDealLibrary, readDealDeskDraft, saveDealDeskDraft } from "@/server/sales-documents/deal-drafts";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { listDealWorkbench } from "@/server/sales-documents/deal-workbench";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof SalesDocumentsError ? error.message : "The draft could not be saved or opened. Your entries remain on this screen. Ask an administrator to check the saved-deal database." }, { status: error instanceof SalesDocumentsError ? error.status : 503 });
}
export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser(), params = new URL(request.url).searchParams;
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
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Use this app to archive the deal." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || body.action !== "ARCHIVE_DUPLICATE") throw new SalesDocumentsError("Choose the archive duplicate action.");
    return NextResponse.json(await archiveDuplicateDealDraft(await getCurrentUser(), body));
  } catch (error) { return failure(error); }
}
