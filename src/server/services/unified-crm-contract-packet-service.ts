import { MN_SALE_FORM_PACKET, requiredMinnesotaSaleFormIds } from "@/lib/mn-vehicle-sale-form-packet";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION,
  UnifiedCrmContractPacketError,
  type UnifiedCrmContractPacketInput,
  type UnifiedCrmContractPacketResult
} from "@/server/unified-crm/contract-packet-contract";

type Dependencies = {
  now?: () => Date;
};

const ARCHIVE = new Map<string, UnifiedCrmContractPacketResult>();

function text(value: unknown, fallback: string, max = 240) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) return fallback;
  return result.slice(0, max);
}

function formIds(value: unknown) {
  if (!Array.isArray(value)) return requiredMinnesotaSaleFormIds();
  const knownIds = new Set(MN_SALE_FORM_PACKET.map((form) => form.id));
  const requested = value.filter((item): item is string => typeof item === "string" && knownIds.has(item));
  return requested.length > 0 ? Array.from(new Set(requested)) : requiredMinnesotaSaleFormIds();
}

function vehicleFacts(value: unknown) {
  const vehicle = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    color: text(vehicle.color, "Not captured"),
    make: text(vehicle.make, "Not captured"),
    model: text(vehicle.model, "Not captured"),
    stockNumber: text(vehicle.stockNumber, "Not captured"),
    trim: text(vehicle.trim, "Not captured"),
    vin: text(vehicle.vin, "Not captured"),
    year: text(vehicle.year, "Not captured")
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function packetNumber(now: Date) {
  return `PKT-${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function buildDocumentHtml(input: {
  customerName: string;
  dealNumber: string;
  dealType: string;
  feeTotal: string;
  generatedAt: string;
  label: string;
  paymentFunding: string;
  salePrice: string;
  sourceBasis: string;
  trigger: string;
  vehicle: ReturnType<typeof vehicleFacts>;
}) {
  const rows = [
    ["Buyer", input.customerName],
    ["Deal", input.dealNumber],
    ["Deal type", input.dealType],
    ["Vehicle", `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.trim}`],
    ["Color", input.vehicle.color],
    ["VIN", input.vehicle.vin],
    ["Stock #", input.vehicle.stockNumber],
    ["Sale price", input.salePrice],
    ["Fees", input.feeTotal],
    ["Payment / funding", input.paymentFunding],
    ["Generated", input.generatedAt],
    ["Source basis", input.sourceBasis],
    ["Use when", input.trigger]
  ];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    p { color: #52647d; line-height: 1.45; margin: 0 0 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d8e4ff; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; width: 30%; }
    .signature { display: grid; gap: 28px; grid-template-columns: 1fr 1fr; margin-top: 44px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.label)}</h1>
  <p>Generated packet form for Minnesota vehicle sale processing. Confirm current legal/compliance language before customer signature.</p>
  <table>
    <tbody>
      ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="signature">
    <div class="line">Buyer signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

export async function generateUnifiedCrmContractPacket(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmContractPacketInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmContractPacketResult> {
  if (!actor) {
    throw new UnifiedCrmContractPacketError("AUTHENTICATION_REQUIRED", "Sign in before generating a contract packet.");
  }

  const now = dependencies.now?.() ?? new Date();
  const generatedAt = now.toISOString();
  const selectedIds = formIds(input.preparedFormIds);
  const selectedForms = MN_SALE_FORM_PACKET.filter((form) => selectedIds.includes(form.id));
  if (selectedForms.length === 0) {
    throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Select at least one form before generating a packet.");
  }

  const packet = packetNumber(now);
  const vehicle = vehicleFacts(input.vehicle);
  const customerName = text(input.customerName, "Customer not captured");
  const dealNumber = text(input.dealNumber, packet);
  const dealType = text(input.dealType, "Retail Sale");
  const salePrice = text(input.salePrice, "$0.00");
  const feeTotal = text(input.feeTotal, "$0.00");
  const paymentFunding = text(input.paymentFunding, "To be confirmed");
  const packetId = `contract-packet-${crypto.randomUUID()}`;

  const documents = selectedForms.map((form) => ({
    archiveStatus: "ARCHIVED" as const,
    category: form.category,
    downloadFileName: `${form.id}-${packet}.html`,
    formId: form.id,
    html: buildDocumentHtml({
      customerName,
      dealNumber,
      dealType,
      feeTotal,
      generatedAt,
      label: form.label,
      paymentFunding,
      salePrice,
      sourceBasis: form.basis,
      trigger: form.trigger,
      vehicle
    }),
    label: form.label,
    signatureStatus: "UNSIGNED" as const,
    sourceBasis: form.basis,
    trigger: form.trigger,
    version: 1
  }));

  const result: UnifiedCrmContractPacketResult = {
    auditTrail: [
      {
        action: "CONTRACT_PACKET_GENERATED",
        actorUserId: actor.id,
        at: generatedAt,
        detail: `${documents.length} Minnesota sale form(s) generated and archived.`
      }
    ],
    contractVersion: UNIFIED_CRM_CONTRACT_PACKET_CONTRACT_VERSION,
    delivery: {
      downloadReady: true,
      emailReady: true,
      eSignatureReady: false,
      printReady: true,
      providerHoldReason: "E-signature provider activation is not enabled; use manual print/download or approved CRM email/text link delivery.",
      textReady: true
    },
    documents,
    generatedAt,
    generatedByUserId: actor.id,
    packetId,
    packetNumber: packet,
    status: "ARCHIVED"
  };
  ARCHIVE.set(packetId, result);
  return result;
}

export async function getUnifiedCrmContractPacket(packetId: string) {
  const result = ARCHIVE.get(packetId);
  if (!result) {
    throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_NOT_FOUND", "Contract packet is not archived in this session.");
  }
  return result;
}
