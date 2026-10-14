import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
// Public library code only. No uploaded documents or staff data are served here.
export async function GET() {
  const worker = await readFile(join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"));
  return new Response(worker, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
}
