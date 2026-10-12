import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { applyPurchaseDocument, readPurchaseDocument, readPurchaseSpreadsheet, reviewPurchaseDocument, purchaseImportHistory, resumePurchaseImport, savePurchaseCorrections, recordPurchaseImportFailure, downloadPurchaseSource, undoPurchaseImport, purchaseSpreadsheetHeaders } from "@/server/inventory-transfer/purchase-service";
import { purchaseJobQueue, purchaseReviewers, reassignPurchaseImport } from "@/server/inventory-transfer/purchase-team";
import { purchaseTemplates, savePurchaseTemplate } from "@/server/inventory-transfer/purchase-templates";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_REQUEST = 11 * 1024 * 1024;
function purchaseImportDisabled(headers: HeadersInit) {
  if (process.env.NODE_ENV !== "production") return null;
  if (process.env.PURCHASE_IMPORT_RELEASE_ENABLED === "true") return null;
  return NextResponse.json(
    { error: "Purchase document imports are not enabled for this deployment." },
    { status: 403, headers }
  );
}
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const disabled = purchaseImportDisabled(headers);
  if (disabled) return disabled;
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("templates") === "1") return NextResponse.json(await purchaseTemplates(assertAuthenticatedUser(await getCurrentUser()), url.searchParams.get("locationId") ?? ""), { headers });
    if (url.searchParams.get("queue") === "1") return NextResponse.json(await purchaseJobQueue(assertAuthenticatedUser(await getCurrentUser()), url.searchParams.get("locationId") ?? "", url.searchParams.get("q") ?? "", url.searchParams.get("status") ?? "", url.searchParams.get("cursor") ?? undefined), { headers });
    if (url.searchParams.get("reviewers") === "1") return NextResponse.json(await purchaseReviewers(assertAuthenticatedUser(await getCurrentUser()), url.searchParams.get("locationId") ?? ""), { headers });
    if (url.searchParams.has("source")) {
      const source = await downloadPurchaseSource(await getCurrentUser(), url.searchParams.get("source") ?? "");
      return new Response(new Uint8Array(source.bytes), { headers: { ...headers, "Content-Type": source.contentType, "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(source.fileName)}` } });
    }
    return NextResponse.json(await purchaseImportHistory(await getCurrentUser(), url.searchParams.get("locationId") ?? "", url.searchParams.get("cursor") ?? undefined), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import history unavailable.";
    return NextResponse.json({ error: message.includes("prisma.") ? "Import history is temporarily unavailable." : message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400, headers });
  }
}
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const disabled = purchaseImportDisabled(headers);
  if (disabled) return disabled;
  try {
    const user = assertAuthenticatedUser(await getCurrentUser());
    if (request.headers.get("sec-fetch-site") === "cross-site" || request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Cross-site purchase requests are not allowed." }, { status: 403, headers });
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
      if (input?.action === "save-template") return NextResponse.json(await savePurchaseTemplate(user, input), { headers });
      if (input?.action === "assign") return NextResponse.json(await reassignPurchaseImport(user, String(input.readId ?? ""), String(input.assignedToUserId ?? ""), input.expectedVersion), { headers });
      if (input?.action === "undo") return NextResponse.json(await undoPurchaseImport(user, String(input.readId ?? ""), input.reason), { headers });
      if (input?.action === "resume") return NextResponse.json(await resumePurchaseImport(user, String(input.readId ?? "")), { headers });
      if (input?.action === "save-corrections") return NextResponse.json(await savePurchaseCorrections(user, input), { headers });
      if (input?.action && input.action !== "review") throw new Error("Choose a valid document action.");
      try { return NextResponse.json(await reviewPurchaseDocument(user, input), { headers }); }
      catch (error) { await recordPurchaseImportFailure(user, input?.readId, undefined).catch(() => undefined); throw error; }
    }
    const form = await parsed.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a purchase document.");
    const csv = file.name.toLowerCase().endsWith(".csv"), xlsx = file.name.toLowerCase().endsWith(".xlsx");
    const input = { bytes: Buffer.from(await file.arrayBuffer()), fileName: file.name, contentType: xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : csv ? "text/plain" : file.type || (file.name.toLowerCase().endsWith(".txt") ? "text/plain" : "") };
    if (form.get("action") === "inspect-columns" && (csv || xlsx)) return NextResponse.json(await purchaseSpreadsheetHeaders(user, String(form.get("locationId") ?? ""), input), { headers });
    if (form.get("action") === "resume") return NextResponse.json(await resumePurchaseImport(user, String(form.get("readId") ?? ""), input), { headers });
    if (form.get("action") === "apply") {
      const previewId = String(form.get("previewId") ?? "");
      try { return NextResponse.json(await applyPurchaseDocument(user, previewId, input), { headers }); }
      catch (error) { await recordPurchaseImportFailure(user, undefined, previewId).catch(() => undefined); throw error; }
    }
    if (form.get("action") !== "read") throw new Error("Choose a valid document action.");
    if (csv || xlsx) return NextResponse.json(await readPurchaseSpreadsheet(user, String(form.get("locationId") ?? ""), input, form.get("mapping") ? JSON.parse(String(form.get("mapping"))) : undefined), { headers });
    return NextResponse.json(await readPurchaseDocument(user, String(form.get("locationId") ?? ""), input), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document import failed.";
    const safe = error instanceof SyntaxError ? "Invalid purchase request." : message.includes("prisma.") ? "Purchase import is temporarily unavailable." : message;
    return NextResponse.json({ error: safe }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400, headers });
  }
}
