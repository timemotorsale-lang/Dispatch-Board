import fs from "node:fs/promises";
import path from "node:path";
import { allowPreviewRequest } from "../../../../server/preview-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
  if (!allowPreviewRequest(request, process.env)) return new Response(null, { status: 404, headers });
  try {
    const image = await fs.readFile(path.join(process.cwd(), "fixtures", "media", "sample-rav4.png"));
    return new Response(image, { headers: { ...headers, "Content-Type": "image/png" } });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
