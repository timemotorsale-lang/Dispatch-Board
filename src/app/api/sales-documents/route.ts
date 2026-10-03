import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createSalesDocumentJacket, listSalesDocumentJackets } from "@/server/sales-documents/service";
import { salesDocumentsFailure } from "@/server/sales-documents/http";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return NextResponse.json(await listSalesDocumentJackets(await getCurrentUser(), query.get("q") ?? "", query.get("pathway") ?? "", query.get("customerId") ?? ""));
  } catch (error) { return salesDocumentsFailure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await createSalesDocumentJacket(await getCurrentUser(), await request.json()), { status: 201 }); }
  catch (error) { return salesDocumentsFailure(error); }
}
