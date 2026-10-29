import { allowPreviewRequest } from "../../../server/preview-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!allowPreviewRequest(request, process.env)) return new Response(null, { status: 404 });
  return Response.json({ application: "tms-dealership-review", syntheticData: true, revision: process.env.APP_RELEASE_SHA || "local" }, {
    headers: { "Cache-Control": "no-store, private" }
  });
}
