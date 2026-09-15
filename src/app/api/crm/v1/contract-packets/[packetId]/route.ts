import { NextResponse } from "next/server";

import { getUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
import {
  UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION,
  UnifiedCrmContractPacketError,
  type UnifiedCrmContractPacketFailureCode
} from "@/server/unified-crm/contract-packet-contract";

const TYPED_CODES = new Set<UnifiedCrmContractPacketFailureCode>(["CONTRACT_PACKET_NOT_FOUND"]);

function statusForCode(code: string | undefined) {
  if (code === "CONTRACT_PACKET_NOT_FOUND") return 404;
  return 500;
}

export async function GET(_request: Request, context: { params: Promise<{ packetId: string }> }) {
  const { packetId } = await context.params;
  try {
    return NextResponse.json(await getUnifiedCrmContractPacket(packetId));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmContractPacketFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Contract packet archive is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmContractPacketError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
