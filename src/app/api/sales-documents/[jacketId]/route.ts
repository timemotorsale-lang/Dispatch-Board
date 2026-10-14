import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSalesDocumentJacket, updateSalesDocumentJacket } from "@/server/sales-documents/service";
import { salesDocumentsFailure } from "@/server/sales-documents/http";

type Context = { params: Promise<{ jacketId: string }> };
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json(await getSalesDocumentJacket(await getCurrentUser(), (await context.params).jacketId)); }
  catch (error) { return salesDocumentsFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { return NextResponse.json(await updateSalesDocumentJacket(await getCurrentUser(), (await context.params).jacketId, await request.json())); }
  catch (error) { return salesDocumentsFailure(error); }
}
