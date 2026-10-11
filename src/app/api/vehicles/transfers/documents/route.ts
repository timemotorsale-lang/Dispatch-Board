import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { applyPurchaseDocument, readPurchaseDocument, readPurchaseSpreadsheet, reviewPurchaseDocument, purchaseImportHistory, resumePurchaseImport, savePurchaseCorrections, recordPurchaseImportFailure } from "@/server/inventory-transfer/purchase-service";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_REQUEST = 11 * 1024 * 1024;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const url = new URL(request.url);
    return NextResponse.json(await purchaseImportHistory(await getCurrentUser(), url.searchParams.get("locationId") ?? "", url.searchParams.get("cursor") ?? undefined), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import history unavailable.";
    return NextResponse.json({ error: message.includes("prisma.") ? "Import history is temporarily unavailable." : message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400, headers });
  }
}
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = assertAuthenticatedUser(await getCurrentUser());
    if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST) return NextResponse.json({ error: "Document request is too large." }, { status: 413, headers });
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Choose a purchase document.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > MAX_REQUEST) { await reader.cancel(); return NextResponse.json({ error: "Document request is too large." }, { status: 413, headers }); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    const parsed = new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body });
    if (request.headers.get("content-type")?.includes("application/json")) {
      const input = JSON.parse(body.toString("utf8"));
      if (input?.action === "save-corrections") return NextResponse.json(await savePurchaseCorrections(user, input), { headers });
      if (input?.action && input.action !== "review") throw new Error("Choose a valid document action.");
      try { return NextResponse.json(await reviewPurchaseDocument(user, input), { headers }); }
      catch (error) { await recordPurchaseImportFailure(user, input?.readId, undefined).catch(() => undefined); throw error; }
    }
    const form = await parsed.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a purchase document.");
    const csv = file.name.toLowerCase().endsWith(".csv");
    const input = { bytes: Buffer.from(await file.arrayBuffer()), fileName: file.name, contentType: csv ? "text/plain" : file.type || (file.name.toLowerCase().endsWith(".txt") ? "text/plain" : "") };
    if (form.get("action") === "resume") return NextResponse.json(await resumePurchaseImport(user, String(form.get("readId") ?? ""), input), { headers });
    if (form.get("action") === "apply") {
      const previewId = String(form.get("previewId") ?? "");
      try { return NextResponse.json(await applyPurchaseDocument(user, previewId, input), { headers }); }
      catch (error) { await recordPurchaseImportFailure(user, undefined, previewId).catch(() => undefined); throw error; }
    }
    if (form.get("action") !== "read") throw new Error("Choose a valid document action.");
    if (csv) return NextResponse.json(await readPurchaseSpreadsheet(user, String(form.get("locationId") ?? ""), input), { headers });
    return NextResponse.json(await readPurchaseDocument(user, String(form.get("locationId") ?? ""), input), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document import failed.";
    const safe = error instanceof SyntaxError ? "Invalid purchase request." : message.includes("prisma.") ? "Purchase import is temporarily unavailable." : message;
    return NextResponse.json({ error: safe }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400, headers });
  }
}
