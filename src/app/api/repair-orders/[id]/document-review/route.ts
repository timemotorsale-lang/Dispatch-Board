import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getServiceDocumentReview, updateServiceDocumentCustomer, reviseServiceDocumentCharges } from "@/server/repair-order/document-review-service";
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Document review could not be saved.";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const conflict = error instanceof EnterpriseCommandConflictError || ["P2002", "P2025", "P2034"].includes(code);
  const uncertain = error instanceof Error && error.name.startsWith("Prisma") && !conflict;
  return NextResponse.json({ error: uncertain ? "Save outcome is uncertain. Retry the unchanged request to recover its saved document." : message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : conflict ? 409 : uncertain ? 503 : 400, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getServiceDocumentReview(await getCurrentUser(), (await context.params).id, new URL(request.url).searchParams.get("documentId") ?? ""), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Document review request is required.");
    const user = await getCurrentUser(), id = (await context.params).id;
    if (body.action === "CUSTOMER_DETAILS") return NextResponse.json(await updateServiceDocumentCustomer(user, id, body), { headers: { "Cache-Control": "no-store" } });
    if (body.action === "CHARGES") return NextResponse.json(await reviseServiceDocumentCharges(user, id, body), { headers: { "Cache-Control": "no-store" } });
    throw new Error("Unsupported document review action.");
  } catch (error) { return failure(error); }
}
