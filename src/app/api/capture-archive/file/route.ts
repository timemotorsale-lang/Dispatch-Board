import { getCurrentUser } from "@/server/auth/current-user";
import { captureActor, CaptureArchiveError, readCaptureFile } from "@/server/document-library/capture-archive";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
  try {
    const actor = captureActor(await getCurrentUser());
    const params = new URL(request.url).searchParams;
    const id = params.get("id") ?? "";
    if (!/^[\da-f]{64}-\d{1,2}$/.test(id)) throw new CaptureArchiveError("Capture unavailable.", 404);
    const { bytes, contentType } = await readCaptureFile(actor, id, params.get("print") === "1");
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": contentType, "Content-Disposition": "inline" } });
  } catch (error) {
    return Response.json({ error: error instanceof CaptureArchiveError ? error.message : "This capture is temporarily unavailable." }, {
      headers, status: error instanceof CaptureArchiveError ? error.status : 503
    });
  }
}
