import type { Prisma } from "@prisma/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { authorizedCommercialLedger, commercialLines, type CommercialEstimate } from "@/lib/service-commercial-ledger";

export const SERVICE_DOCUMENT_TEMPLATE = "service-document-v2";
export type ServiceIdentity = { customer: string; vehicle: string; vin: string; vehicleNumber: string; concern: string; repairOrderNumber: string; store: string; address: string; timezone: string; color?: string | null; stockNumber?: string | null; licensePlate?: string | null; licensePlateState?: string | null; odometer?: { reading: number; unit: "MILES" | "KILOMETERS"; observedAt: string } | null };
export type ServiceDocumentContent = {
  title: string; number: string; issuedAt: string; identity: ServiceIdentity;
  lines: { key: string; description: string; quantity: number; unitPriceCents: number; totalCents: number; hours?: number; planningHourlyRateCents?: number }[];
  totals?: { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number };
  decision?: { disposition: string; actor: string; channel: string; approvedLineKeys: string[]; declinedLineKeys: string[]; undecidedLineKeys: string[]; reference?: string | null };
  notes: string[];
};
export async function serviceIdentity(database: Prisma.TransactionClient, organizationId: string, repairOrderId: string, asOf = new Date()): Promise<ServiceIdentity> {
  const order = await database.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, include: { customer: true, vehicle: { include: { odometerObservations: { where: { organizationId, status: "ACCEPTED", observedAt: { lte: asOf } }, orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 1 } } }, serviceVisit: true, location: true, organization: true } });
  if (!order) throw new Error("Repair order was not found.");
  const odometer = order.vehicle.odometerObservations[0];
  return { customer: order.customer?.displayName ?? "Internal work", vehicle: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" "), vin: order.vehicle.vin ?? "Not recorded", vehicleNumber: order.vehicle.vehicleNumber, color: order.vehicle.color, stockNumber: order.vehicle.stockNumber, licensePlate: order.vehicle.licensePlate, licensePlateState: order.vehicle.licensePlateState, odometer: odometer ? { reading: odometer.reading, unit: odometer.unit, observedAt: odometer.observedAt.toISOString() } : null, concern: order.serviceVisit.concernSummary, repairOrderNumber: order.repairOrderNumber, store: `${order.organization.name} · ${order.location.name}`, address: [order.location.addressLine1, order.location.addressLine2, order.location.city, order.location.region, order.location.postalCode].filter(Boolean).join(", "), timezone: order.location.timezone };
}
export async function recordServiceDocument(database: Prisma.TransactionClient, input: { organizationId: string; repairOrderId: string; kind: string; sourceId: string; sourceVersion: number; createdByUserId: string; content: ServiceDocumentContent }) {
  const content = JSON.parse(JSON.stringify(input.content)) as Prisma.InputJsonValue;
  const sha256 = hashEnterpriseCommand({ templateVersion: SERVICE_DOCUMENT_TEMPLATE, content });
  return database.serviceDocument.create({ data: { ...input, content, templateVersion: SERVICE_DOCUMENT_TEMPLATE, sha256 } });
}
export async function recordEstimateDocument(database: Prisma.TransactionClient, organizationId: string, repairOrderId: string, estimate: CommercialEstimate & { id: string; version: number; presentedAt: Date; expiresAt: Date }, createdByUserId: string) {
  const identity = await serviceIdentity(database, organizationId, repairOrderId, estimate.presentedAt);
  const ledger = authorizedCommercialLedger(estimate, commercialLines(estimate.lineItems).map(line => line.key));
  return recordServiceDocument(database, { organizationId, repairOrderId, kind: "ESTIMATE", sourceId: estimate.id, sourceVersion: estimate.version, createdByUserId, content: { title: "Official repair estimate — not an authorization", number: `${identity.repairOrderNumber} / v${estimate.version}`, issuedAt: estimate.presentedAt.toISOString(), identity, lines: ledger.lines.map(line => ({ ...line, ...(line.type === "LABOR" && line.laborGuideMinutes ? { hours: line.laborGuideMinutes / 60, planningHourlyRateCents: Math.round(line.unitPriceCents * 60 / line.laborGuideMinutes) } : {}) })), totals: ledger, notes: [`Valid until ${estimate.expiresAt.toISOString()}.`, "Labor hours are provisional planning allowances, not validated vehicle-specific standards.", "Only separately recorded exact-version customer authorization permits repair execution."] } });
}
export async function recordAuthorizationDocument(database: Prisma.TransactionClient, input: { organizationId: string; repairOrderId: string; estimateVersionId: string; authorizationId: string; createdByUserId: string; disposition: string; actor: string; channel: string; decidedAt: Date; approvedLineKeys: string[]; declinedLineKeys?: string[]; reference?: string | null }) {
  const estimate = await database.repairEstimateVersion.findFirst({ where: { id: input.estimateVersionId, organizationId: input.organizationId, repairOrderId: input.repairOrderId } });
  if (!estimate) throw new Error("Recorded estimate is unavailable for the authorization receipt.");
  const document = await database.serviceDocument.findFirst({ where: { organizationId: input.organizationId, kind: "ESTIMATE", sourceId: estimate.id, sourceVersion: estimate.version } });
  if (!document) throw new Error("This legacy estimate needs a newly reviewed document version before customer authorization.");
  const source = document.content as unknown as ServiceDocumentContent;
  const ledger = authorizedCommercialLedger(estimate, input.approvedLineKeys);
  const declinedLineKeys = input.declinedLineKeys ?? (input.disposition === "DECLINED" ? commercialLines(estimate.lineItems).map(line => line.key) : []);
  const undecidedLineKeys = commercialLines(estimate.lineItems).filter(line => !input.approvedLineKeys.includes(line.key) && !declinedLineKeys.includes(line.key)).map(line => line.key);
  return recordServiceDocument(database, { organizationId: input.organizationId, repairOrderId: input.repairOrderId, kind: "AUTHORIZATION", sourceId: input.authorizationId, sourceVersion: 1, createdByUserId: input.createdByUserId, content: { title: "Repair authorization decision receipt", number: input.authorizationId, issuedAt: input.decidedAt.toISOString(), identity: source.identity, lines: ledger.lines, totals: ledger, decision: { disposition: input.disposition, actor: input.actor, channel: input.channel, approvedLineKeys: input.approvedLineKeys, declinedLineKeys, undecidedLineKeys, reference: input.reference }, notes: ["This receipt records the exact estimate version and selected lines. Unapproved scope cannot be executed or billed.", `Source estimate ${estimate.id}, version ${estimate.version}; ${ledger.version}.`] } });
}
