import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { changeCashPrintPack, listCashPrintPacks, setCashPrintPackPolicy } from "@/server/sales-documents/cash-print-packs";
import { salesDocumentsFailure } from "@/server/sales-documents/http";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function failure(error: unknown) { const response = salesDocumentsFailure(error); for (const [key, value] of Object.entries(headers)) response.headers.set(key, value); return response; }
export async function GET() {
  try { return NextResponse.json(await listCashPrintPacks(await getCurrentUser()), { headers }); }
  catch (error) { return failure(error); }
}
async function mutate(request: Request, action: "CREATE" | "UPDATE" | "ARCHIVE") {
  const origin = request.headers.get("origin"), host = request.headers.get("host") || new URL(request.url).host;
  let trusted = request.headers.get("sec-fetch-site") !== "cross-site";
  if (origin) { try { const source = new URL(origin); trusted &&= ["http:", "https:"].includes(source.protocol) && source.host === host && source.origin === origin; } catch { trusted = false; } }
  if (!trusted) return NextResponse.json({ error: "Reload this application before changing print packs." }, { status: 403, headers });
  try { const body = await request.json().catch(() => null), actor = await getCurrentUser(); return NextResponse.json(action === "UPDATE" && body?.action === "SET_POLICY" ? await setCashPrintPackPolicy(actor, body) : await changeCashPrintPack(actor, action, body), { status: action === "CREATE" ? 201 : 200, headers }); }
  catch (error) { return failure(error); }
}
export const POST = (request: Request) => mutate(request, "CREATE");
export const PATCH = (request: Request) => mutate(request, "UPDATE");
export const DELETE = (request: Request) => mutate(request, "ARCHIVE");
