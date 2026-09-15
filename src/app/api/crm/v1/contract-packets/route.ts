import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { generateUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
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

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  try {
    const result = await generateUnifiedCrmContractPacket(await getCurrentUser(), payload ?? {});
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmContractPacketFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Contract packet could not be generated right now.",
      retryable: error instanceof UnifiedCrmContractPacketError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
