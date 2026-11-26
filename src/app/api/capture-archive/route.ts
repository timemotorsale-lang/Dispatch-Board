import { getCurrentUser } from "@/server/auth/current-user";
import { captureByteLimit } from "@/features/mobile-capture/capture-archive-contract";
import { archiveCaptureBatch, captureActor, captureDealCustomerId, CaptureArchiveError, fileCapture, listCaptureArchive, searchCaptureTargets } from "@/server/document-library/capture-archive";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function fail(error: unknown) {
  return Response.json({ error: error instanceof CaptureArchiveError ? error.message : "The capture archive is temporarily unavailable. Try again." },
    { headers, status: error instanceof CaptureArchiveError ? error.status : 503 });
}

function requireApp(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (site === "cross-site" || site === "same-site") throw new CaptureArchiveError("Open capture from this app.", 403);
  if (!origin) return;
  try {
    const source = new URL(origin);
    if (source.origin === new URL(request.url).origin || (site === "same-origin" && /^https?:$/.test(source.protocol) && source.host === request.headers.get("host"))) return;
  } catch { /* Invalid or opaque origins are rejected. */ }
  throw new CaptureArchiveError("Open capture from this app.", 403);
}

export async function GET(request: Request) {
  try {
    const actor = captureActor(await getCurrentUser());
    const params = new URL(request.url).searchParams;
    if (params.has("dealId")) {
      const id = params.get("dealId")?.trim();
      if (!id || id.length > 100 || ["ownerId", "ownerType"].some(key => params.has(key))) {
        throw new CaptureArchiveError("Choose a saved deal to view customer files.");
      }
      const customerId = await captureDealCustomerId(actor, id);
      if (params.has("lookup")) {
        if (params.get("lookup") !== "1" || !customerId || params.get("type") !== "CUSTOMER" || params.get("id") !== customerId) {
          throw new CaptureArchiveError("The saved deal does not match this customer. Reopen Capture from the deal.", 409);
        }
        return Response.json({ items: await searchCaptureTargets(actor, params) }, { headers });
      }
      if (!customerId) return Response.json({ items: [], destination: null }, { headers });
      return Response.json(await listCaptureArchive(actor, new URLSearchParams({ ownerType: "CUSTOMER", ownerId: customerId })), { headers });
    }
    return Response.json(params.get("lookup") === "1" ? { items: await searchCaptureTargets(actor, params) } : await listCaptureArchive(actor, params), { headers });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const actor = captureActor(await getCurrentUser());
    requireApp(request);
    const contentType = request.headers.get("content-type");
    if (!request.body || !contentType?.startsWith("multipart/form-data")) throw new CaptureArchiveError("No capture files were provided.");
    const requestLimit = captureByteLimit + 131_072;
    if (Number(request.headers.get("content-length")) > requestLimit) throw new CaptureArchiveError("Keep the batch under 25 MB.", 413);
    let size = 0;
    const stream = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > requestLimit) controller.error(new Error("Upload too large"));
        else controller.enqueue(chunk);
      }
    }));
    let body: FormData;
    try { body = await new Response(stream, { headers: { "Content-Type": contentType } }).formData(); }
    catch {
      if (size > requestLimit) throw new CaptureArchiveError("Keep the batch under 25 MB.", 413);
      throw new CaptureArchiveError("The batch could not be read. Try a smaller batch.");
    }
    return Response.json(await archiveCaptureBatch(actor, body), { headers });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = captureActor(await getCurrentUser());
    requireApp(request);
    const body = await request.json().catch(() => null);
    return Response.json(await fileCapture(actor, body), { headers });
  } catch (error) { return fail(error); }
}
