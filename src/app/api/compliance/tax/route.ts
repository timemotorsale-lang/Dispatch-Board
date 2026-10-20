import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTaxWorksheet, searchTaxLinks, taxCommand } from "@/server/compliance/service";
import { MoneyError } from "@/lib/money-resources";
import { requireMoneyOrigin } from "@/server/money-resources/http";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof MoneyError ? error.message : "Tax records are temporarily unavailable. Your entries have not been cleared. If this is first setup, ask the administrator to apply the compliance migration." }, { status: error instanceof MoneyError ? error.status : 503, headers: { "cache-control": "no-store" } });
}
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams, actor = await getCurrentUser();
    return NextResponse.json(query.has("search") ? await searchTaxLinks(actor, query.get("search") || "") : await getTaxWorksheet(actor, query.get("month")), { headers: { "cache-control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireMoneyOrigin(request);
    const actor = await getCurrentUser();
    if (!actor?.isActive) throw new MoneyError("Sign in with an active staff account.", 401);
    if (Number(request.headers.get("content-length")) > 30000) throw new MoneyError("This request is too large.", 413);
    const body = await request.text();
    if (body.length > 30000) throw new MoneyError("This request is too large.", 413);
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { throw new MoneyError("The save request is invalid."); }
    return NextResponse.json(await taxCommand(actor, payload), { headers: { "cache-control": "no-store" } });
  } catch (error) { return failure(error); }
}
