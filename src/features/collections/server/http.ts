import { NextResponse } from "next/server";

import { isCollectionsEnabled } from "../config/flags";
import { CollectionsError } from "../config/permissions";

const NO_STORE = { "cache-control": "no-store" };

/** Plain-English JSON error. Unknown errors never leak details. */
export function collectionsErrorResponse(error: unknown) {
  if (error instanceof CollectionsError) return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  return NextResponse.json({ error: "Collections is temporarily unavailable. Nothing was changed. Try again in a minute." }, { status: 503, headers: NO_STORE });
}

export function collectionsJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: NO_STORE });
}

/** When the module is OFF, every Collections API behaves as if it doesn't exist. */
export function assertModuleOn() {
  if (!isCollectionsEnabled()) throw new CollectionsError("Not found.", 404);
}

/** Same-origin check for state-changing requests (matches Money & Resources). */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new CollectionsError("Open this action from the application before saving.", 403);
  if (origin) {
    let source: URL;
    try { source = new URL(origin); } catch { throw new CollectionsError("This request has an invalid origin.", 403); }
    if (!["http:", "https:"].includes(source.protocol) || source.host !== host) throw new CollectionsError("Open this action from the application before saving.", 403);
  }
}

export async function readJsonBody(request: Request, maxBytes = 200_000): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > maxBytes) throw new CollectionsError("This request is too large.", 413);
  try {
    const value = text ? JSON.parse(text) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("bad");
    return value as Record<string, unknown>;
  } catch {
    throw new CollectionsError("The request is invalid. Refresh the page and try again.");
  }
}
