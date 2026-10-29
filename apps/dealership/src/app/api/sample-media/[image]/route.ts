import fs from "node:fs/promises";
import path from "node:path";
import { sampleMedia } from "../../../../lib/sample-media";
import { allowPreviewRequest } from "../../../../server/preview-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ image: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
  if (!allowPreviewRequest(request, process.env)) return new Response(null, { status: 404, headers });
  const { image } = await params;
  if (!Object.hasOwn(sampleMedia, image)) return new Response(null, { status: 404, headers });
  const media = sampleMedia[image];
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "fixtures", "media", media.file));
    return new Response(bytes, { headers: { ...headers, "Content-Type": media.type } });
  } catch { return new Response(null, { status: 404, headers }); }
}
