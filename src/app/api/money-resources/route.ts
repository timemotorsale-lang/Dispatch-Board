import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getMoneyResources, moneyCommand } from "@/server/money-resources/service";
import { MoneyError } from "@/lib/money-resources";
import { moneyError, requireMoneyOrigin } from "@/server/money-resources/http";
export async function GET(request: Request) {
  try { return NextResponse.json(await getMoneyResources(await getCurrentUser(), new URL(request.url).searchParams), { headers: { "cache-control": "no-store" } }); }
  catch (error) { return moneyError(error); }
}
export async function POST(request: Request) {
  try {
    requireMoneyOrigin(request);
    const actor = await getCurrentUser();
    if (!actor?.isActive) throw new MoneyError("Sign in with an active staff account.", 401);
    if (Number(request.headers.get("content-length")) > 1_100_000) throw new MoneyError("This request is too large.", 413);
    const body = await request.text();
    if (body.length > 1_100_000) throw new MoneyError("This request is too large.", 413);
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { throw new MoneyError("The save request is invalid. Refresh and try again."); }
    return NextResponse.json(await moneyCommand(actor, payload), { headers: { "cache-control": "no-store" } });
  } catch (error) { return moneyError(error); }
}
