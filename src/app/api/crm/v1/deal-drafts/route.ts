import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { listDealDrafts, readDealDeskDraft, saveDealDeskDraft } from "@/server/sales-documents/deal-drafts";
import { SalesDocumentsError } from "@/server/sales-documents/domain";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof SalesDocumentsError ? error.message : "The draft could not be saved or opened. Your entries remain on this screen. Ask an administrator to check the saved-deal database." }, { status: error instanceof SalesDocumentsError ? error.status : 503 });
}
export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser(), params = new URL(request.url).searchParams;
    return NextResponse.json(params.get("id") ? await readDealDeskDraft(actor, params.get("id")!) : await listDealDrafts(actor, params.get("customerId") ?? ""));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await saveDealDeskDraft(await getCurrentUser(), await request.json())); }
  catch (error) { return failure(error); }
}
