export const UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION = "ucrm.contract-packet/v1";
export const UNIFIED_CRM_CONTRACT_PACKET_ERROR_CONTRACT_VERSION = "ucrm.contract-packet-error/v1";

export type UnifiedCrmContractPacketFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CONTRACT_PACKET_INVALID"
  | "CONTRACT_PACKET_NOT_FOUND";

export class UnifiedCrmContractPacketError extends Error {
  code: UnifiedCrmContractPacketFailureCode;
  retryable: boolean;

  constructor(code: UnifiedCrmContractPacketFailureCode, message: string, options: { cause?: unknown; retryable?: boolean } = {}) {
    super(message, { cause: options.cause });
    this.name = "UnifiedCrmContractPacketError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

export type UnifiedCrmContractPacketInput = {
  customerName?: unknown;
  dealNumber?: unknown;
  dealType?: unknown;
  feeTotal?: unknown;
  idempotencyKey?: unknown;
  paymentFunding?: unknown;
  preparedFormIds?: unknown;
  salePrice?: unknown;
  vehicle?: unknown;
};

export type UnifiedCrmGeneratedContractDocument = {
  archiveStatus: "ARCHIVED";
  category: "Required" | "Conditional";
  downloadFileName: string;
  formId: string;
  html: string;
  label: string;
  signatureStatus: "UNSIGNED";
  sourceBasis: string;
  trigger: string;
  version: number;
};

export type UnifiedCrmContractPacketResult = {
  auditTrail: Array<{
    action: string;
    actorUserId: string;
    at: string;
    detail: string;
  }>;
  contractVersion: typeof UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION;
  delivery: {
    downloadReady: boolean;
    emailReady: boolean;
    eSignatureReady: boolean;
    printReady: boolean;
    providerHoldReason: string;
    textReady: boolean;
  };
  documents: UnifiedCrmGeneratedContractDocument[];
  generatedAt: string;
  generatedByUserId: string;
  packetId: string;
  packetNumber: string;
  status: "ARCHIVED";
};
