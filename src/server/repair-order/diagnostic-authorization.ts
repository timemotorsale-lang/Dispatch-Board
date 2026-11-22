import type { Prisma } from "@prisma/client";

export const diagnosticAuthorizationMessage = "Record customer diagnostic authorization before starting inspection, diagnosis, or estimating.";

export function requiresDiagnosticAuthorization(source: unknown) {
  return Boolean(source && typeof source === "object" && "diagnosticAuthorizationRequired" in source && source.diagnosticAuthorizationRequired === true);
}

export async function readDiagnosticConsent(database: Prisma.TransactionClient, organizationId: string, repairOrderId: string) {
  const entry = await database.enterpriseCommandLedger.findFirst({
    where: { organizationId, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: repairOrderId, commandType: "RECORD_INSPECTION_CONSENT", status: "SUCCEEDED" },
    orderBy: { resultingVersion: "desc" },
    select: { resultSnapshot: true }
  });
  const result = entry?.resultSnapshot;
  if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.consentReference !== "string") return null;
  return {
    reference: result.consentReference,
    concern: typeof result.concernSummary === "string" ? result.concernSummary : undefined,
    feeCents: typeof result.diagnosticFeeCents === "number" ? result.diagnosticFeeCents : undefined,
    consentedAt: typeof result.consentedAt === "string" ? result.consentedAt : undefined,
    customerName: typeof result.customerName === "string" ? result.customerName : undefined,
    channel: typeof result.channel === "string" ? result.channel : undefined
  };
}

export async function assertDiagnosticAuthorization(
  tx: Prisma.TransactionClient,
  order: { id: string; organizationId: string; origin: string; serviceVisit: { sourceSnapshot: unknown; concernSummary: string } }
) {
  if (order.origin !== "CUSTOMER_REPAIR" || !requiresDiagnosticAuthorization(order.serviceVisit.sourceSnapshot)) return;
  const consent = await readDiagnosticConsent(tx, order.organizationId, order.id);
  if (consent?.feeCents == null || consent.concern !== order.serviceVisit.concernSummary) throw new Error(diagnosticAuthorizationMessage);
}
