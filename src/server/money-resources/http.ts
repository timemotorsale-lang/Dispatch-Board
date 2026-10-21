import { NextResponse } from "next/server";
import { MoneyError } from "@/lib/money-resources";

export function moneyError(error: unknown) {
  return NextResponse.json({ error: error instanceof MoneyError ? error.message : "Money records are temporarily unavailable. Your form has not been cleared." }, { status: error instanceof MoneyError ? error.status : 503, headers: { "cache-control": "no-store" } });
}

export function requireMoneyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new MoneyError("Open this action from the application before saving.", 403);
  if (origin) {
    let source: URL;
    try { source = new URL(origin); } catch { throw new MoneyError("This request has an invalid origin.", 403); }
    if (!["http:", "https:"].includes(source.protocol) || source.host !== host) throw new MoneyError("Open this action from the application before saving.", 403);
  }
}
