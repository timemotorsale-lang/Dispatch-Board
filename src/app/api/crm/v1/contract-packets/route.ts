import { validateDealDocumentContext } from "@/server/deal-continuity/service";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { generateUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
import { archiveGeneratedSalesPacket, readLatestSalesPacket } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import {
  UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION,
  UnifiedCrmContractPacketError,
  type UnifiedCrmContractPacketFailureCode
} from "@/server/unified-crm/contract-packet-contract";

const TYPED_CODES = new Set<UnifiedCrmContractPacketFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CONTRACT_PACKET_INVALID"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CONTRACT_PACKET_INVALID") return 400;
  return 500;
}

export async function GET(request: Request) {
  try { return NextResponse.json(await readLatestSalesPacket(await getCurrentUser(), new URL(request.url).searchParams), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof SalesDocumentsError ? error.message : "The saved packet archive is unavailable. Retry opening it before generating another packet." }, { status: error instanceof SalesDocumentsError ? error.status : 503 }); }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  let stage: "generation" | "archive" = "generation";
  try {
    const actor = await getCurrentUser();
    const context = await validateDealDocumentContext(actor, payload ?? {});
    const input = { ...(payload ?? {}), ...(context?.dealNumber ? { dealNumber: String(context.dealNumber) } : {}) };
    const result = await generateUnifiedCrmContractPacket(actor, input);
    stage = "archive";
    return NextResponse.json(await archiveGeneratedSalesPacket(actor, input, result), { status: 201 });
  } catch (error) {
    if (error instanceof SalesDocumentsError) return NextResponse.json({ error: error.message, stage, retryable: error.status === 503 }, { status: error.status });
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmContractPacketFailureCode);
    const reference = !typed ? crypto.randomUUID().slice(0, 8) : undefined;
    if (!typed) console.error("Contract packet failed", { reference, stage, error });
    const message = stage === "archive"
      ? code === "P2021" || code === "P2022"
        ? "The forms were generated, but the Sales Documents database needs an update before the packet can be saved. Ask an administrator to apply the document update and restart the application. Your deal details do not need to be changed."
        : "The forms were generated, but saving the packet to Sales Documents failed. Some working forms may already be saved. Check Sales Documents before retrying; if this continues, ask an administrator to check document storage and database availability."
      : "Document generation failed before the packet could be saved. Retry once; if it continues, ask an administrator to check the document templates and document service. No specific deal-field correction has been identified.";
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : `${message} Support reference: ${reference}.`,
      stage,
      reference,
      retryable: error instanceof UnifiedCrmContractPacketError ? error.retryable : true
    }, { status: typed ? statusForCode(code) : 503 });
  }
}
