import { allowPreviewRequest } from "../../../server/preview-security";
import { decodeVin, normalizeVin } from "../../../server/vin-decoder";

export const dynamic = "force-dynamic";
let windowStarted = 0;
let count = 0;
let active = 0;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: Request) {
  if (!allowPreviewRequest(request, process.env)) return Response.json({ error: "VIN lookup is available only in the protected appraisal preview." }, { status: 503, headers });
  if (!allowPreviewRequest(request, process.env, true) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Use this site's VIN form." }, { status: 403, headers });
  let vin: string;
  try {
    const input = await request.text();
    if (input.length > 256) return Response.json({ error: "VIN request too large." }, { status: 413, headers });
    vin = normalizeVin(JSON.parse(input).vin);
  } catch { return Response.json({ error: "Enter a complete 17-character VIN without I, O or Q." }, { status: 400, headers }); }
  if (Date.now() - windowStarted > 60000) { windowStarted = Date.now(); count = 0; }
  if (count >= 30 || active >= 3) return Response.json({ error: "VIN lookup is busy. Try again shortly or enter details manually." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  count += 1;
  active += 1;
  try { return Response.json(await decodeVin(vin), { headers }); }
  catch { return Response.json({ error: "We could not confirm vehicle details. Retry or enter them manually; no facts have been substituted." }, { status: 503, headers }); }
  finally { active -= 1; }
}
