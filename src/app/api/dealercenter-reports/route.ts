import { Prisma } from "@prisma/client";
import { parseInventoryCsv, MAX_CSV_BYTES } from "@/lib/inventory-transfer";
import { suggestDealerCenterMapping, type DealerCenterMapping } from "@/features/dealercenter-reporting/import-format";
import { getCurrentUser } from "@/server/auth/current-user";
import { confirmDealerCenterReport, dealerCenterLocations, DealerCenterReportError, previewDealerCenterReport } from "@/server/dealercenter-reporting/service";
import { purchaseXlsxCsv } from "@/server/inventory-transfer/purchase-xlsx";

const responseHeaders = { "Cache-Control": "no-store" };
const maxRequestBytes = MAX_CSV_BYTES + 32 * 1024;

async function boundedForm(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestBytes) {
    throw new DealerCenterReportError("Choose a report 2 MB or smaller.", 413);
  }
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data;")) throw new DealerCenterReportError("Choose a report using the upload form.");
  const reader = request.body?.getReader();
  if (!reader) throw new DealerCenterReportError("The upload request is empty.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxRequestBytes) {
      await reader.cancel();
      throw new DealerCenterReportError("Choose a report 2 MB or smaller.", 413);
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new DealerCenterReportError("Could not read the upload. Select the file again.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.isActive) throw new DealerCenterReportError("Sign in to review a DealerCenter report.", 401);
    const locations = await dealerCenterLocations(user);
    if (!locations.length) throw new DealerCenterReportError("A manager assigned to a location must review the report.", 403);
    const form = await boundedForm(request);
    const action = String(form.get("action") ?? "");
    if (action === "confirm") {
      return Response.json(await confirmDealerCenterReport(user, String(form.get("draftId") ?? "")), { headers: responseHeaders });
    }
    if (action !== "inspect" && action !== "preview") throw new DealerCenterReportError("Choose a valid import action.");
    const locationId = String(form.get("locationId") ?? "");
    if (!locations.some(location => location.id === locationId)) {
      throw new DealerCenterReportError("Choose a location you are assigned to.", 403);
    }
    const kind = form.get("kind");
    if (kind !== "INVENTORY" && kind !== "SALES") throw new DealerCenterReportError("Choose Inventory or Completed Sales.");
    const file = form.get("report");
    if (!(file instanceof File) || !file.size || file.size > MAX_CSV_BYTES || !/\.(csv|xlsx)$/i.test(file.name)) {
      throw new DealerCenterReportError("Choose a CSV or Excel (.xlsx) report 2 MB or smaller.");
    }
    let csv: string;
    try {
      csv = /\.xlsx$/i.test(file.name) ? await purchaseXlsxCsv(Buffer.from(await file.arrayBuffer())) : await file.text();
    } catch (error) {
      throw new DealerCenterReportError(error instanceof Error ? error.message : "Could not read this report.");
    }
    if (action === "inspect") {
      try {
        const { headers } = parseInventoryCsv(csv);
        return Response.json({ headers, mapping: suggestDealerCenterMapping(kind, headers) }, { headers: responseHeaders });
      } catch (error) {
        throw new DealerCenterReportError(error instanceof Error ? error.message : "Could not read the report columns.");
      }
    }
    let mapping: DealerCenterMapping;
    try {
      const raw: unknown = JSON.parse(String(form.get("mapping") ?? "{}"));
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.values(raw).some(value => typeof value !== "string")) throw new Error();
      mapping = raw as DealerCenterMapping;
    } catch {
      throw new DealerCenterReportError("Review the column mapping and try again.");
    }
    const result = await previewDealerCenterReport(user, { kind, locationId, fileName: file.name, dataAsOf: String(form.get("dataAsOf") ?? ""), csv, mapping, completedOnly: form.get("completedOnly") === "true" });
    return Response.json(result, { headers: responseHeaders });
  } catch (error) {
    const missingStorage = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
    const unavailable = "DealerCenter reporting is temporarily unavailable. Ask your administrator to check the reporting setup.";
    return Response.json({ error: error instanceof DealerCenterReportError ? error.message : unavailable }, {
      status: error instanceof DealerCenterReportError ? error.status : missingStorage ? 503 : 500,
      headers: responseHeaders,
    });
  }
}
