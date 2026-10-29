import { basePath } from "../../../lib/paths";
import { NextRequest, NextResponse } from "next/server";
import { allowPreviewRequest } from "../../../server/preview-security";
import { getListings } from "../../../server/listings";
import { mayStartPurchase } from "../../../lib/domain";
import { execute, existingSession, records, session, store, type PreviewCommand } from "../../../server/preview-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
}

export async function GET(request: NextRequest) {
  if (!allowPreviewRequest(request, process.env)) return response({ error: "Customer accounts are not connected. Live account access is not enabled." }, 503);
  const identifier = existingSession(store(), request.cookies.get("tms-preview")?.value);
  return response({ records: identifier ? records(store(), identifier) : [], preview: true });
}

export async function POST(request: NextRequest) {
  if (!allowPreviewRequest(request, process.env)) return response({ error: "Live submissions are not connected. No request has been sent." }, 503);
  if (!allowPreviewRequest(request, process.env, true) || !request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Use this site's form to submit a request." }, 403);
  const body = await request.text();
  if (Buffer.byteLength(body) > 16_000) return response({ error: "This request is too large." }, 413);
  try {
    const command = JSON.parse(body) as PreviewCommand;
    if (["SAVE", "UNSAVE"].includes(command.operation)) {
      const snapshot = await getListings();
      if (!snapshot.listings.some(listing => listing.id === command.value)) return response({ error: "This vehicle is not available." }, 409);
    }
    if (command.operation === "REQUEST" && (command.value as { vehicleId?: string })?.vehicleId) {
      const snapshot = await getListings();
      const value = command.value as { vehicleId: string; kind: string };
      const vehicle = snapshot.listings.find(listing => listing.id === value.vehicleId);
      if (!vehicle || (value.kind === "PURCHASE" && !mayStartPurchase(vehicle))) return response({ error: "Availability changed. Review the vehicle before continuing." }, 409);
    }
    const current = session(store(), request.cookies.get("tms-preview")?.value);
    const result = execute(store(), current.identifier, command);
    const output = response({ ...result, preview: true, message: "Saved in this private preview. Not delivered to staff." });
    if (current.created) output.cookies.set("tms-preview", current.token, { httpOnly: true, sameSite: "strict", path: basePath || "/", maxAge: 86400, secure: process.env.DEALERSHIP_HOSTED_REVIEW === "1" || request.nextUrl.protocol === "https:" });
    return output;
  } catch (error) {
    return response({ error: error instanceof Error && !/SQLITE|database|constraint/i.test(error.message) ? error.message : "We could not save this request. Your form has been kept." }, 400);
  }
}

export async function DELETE(request: NextRequest) {
  if (!allowPreviewRequest(request, process.env, true)) return response({ error: "Not allowed." }, 403);
  const identifier = existingSession(store(), request.cookies.get("tms-preview")?.value);
  if (identifier) store().prepare("UPDATE sessions SET expires_at = 0 WHERE token_hash = ?").run(identifier);
  const output = response({ signedOut: true });
  output.cookies.set("tms-preview", "", { path: basePath || "/", httpOnly: true, sameSite: "strict", maxAge: 0, secure: process.env.DEALERSHIP_HOSTED_REVIEW === "1" || request.nextUrl.protocol === "https:" });
  return output;
}
