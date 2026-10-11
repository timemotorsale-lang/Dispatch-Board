import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature, type VehicleOperationsFeatureCode } from "@/server/enterprise-command/service";
import { isValidVin, normalizeVehicleIdentity, normalizeVinValue } from "@/server/vehicle-registry/domain";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";
import { getVehicleIntake, saveVehicleIntake } from "@/server/inventory-unit/intake-service";
import { INTAKE_SOURCES, normalizeIntake, type IntakeDetails } from "@/server/inventory-unit/intake-domain";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { scanVehicleEvidence } from "@/server/vehicle-360/domain";
import { uploadVehicleEvidence } from "@/server/vehicle-360/service";
import { PURCHASE_FIELDS, PURCHASE_HEADER_ALIASES, purchaseAmount, readPurchaseText, type PurchaseRead, type PurchaseReview, type PurchaseValues } from "@/lib/inventory-purchase-import";
import { parseInventoryCsv } from "@/lib/inventory-transfer";

const organizationId = INITIAL_ORGANIZATION.id;
const foundation = createEnterpriseCommandRepository();
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
type StoredRead = PurchaseRead & { checksum: string; sourceKey?: string; contentType: string; expiresAt: string };
type StoredReview = PurchaseReview & { readId: string; values: PurchaseValues; fields: string[]; details: IntakeDetails; version: number; unitVersion: number | null; expiresAt: string; vehicleNumber: string; newVehicleId: string };
async function authorize(actor: AuthenticatedUser | null, locationId: string, create = false, requestedFields?: string[], amountCents?: number | null) {
  const user = assertAuthenticatedUser(actor);
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  for (const capability of ["VEHICLE_OPERATIONS_VIEW", "INVENTORY_INTAKE_EDIT", "VEHICLE_EVIDENCE_MANAGE", ...(create ? ["VEHICLE_IDENTITY_CREATE"] : [])] as VehicleCapability[]) {
    assertVehicleCapability({ actor: user, capability, grants, locationId, now: new Date(), ...(capability === "INVENTORY_INTAKE_EDIT" ? { requestedFields, amountCents } : {}) });
  }
  if (!locationId || !await prisma.location.findFirst({ where: { organizationId, id: locationId }, select: { id: true } })) throw new Error("Select a valid location.");
  const flags = await foundation.listFeatureFlags(organizationId);
  for (const feature of ["INVENTORY_INTAKE", "VEHICLE_360", ...(create ? ["VEHICLE_REGISTRY"] : [])] as VehicleOperationsFeatureCode[]) {
    const decision = evaluateVehicleOperationsFeature(flags, feature, user.id, locationId);
    if (!decision.executable) throw new Error(`Purchase import is not enabled (${feature}: ${decision.reason}).`);
  }
  return user;
}
async function audit(user: AuthenticatedUser, locationId: string, subjectId: string, eventType: string, metadata: unknown) {
  await prisma.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: user.id, locationId, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT", subjectId, eventType, reason: "Reviewed purchase document import", metadata: json(metadata), correlationId: subjectId } });
}
async function load<T>(user: AuthenticatedUser, id: unknown, eventType: string) {
  if (typeof id !== "string" || id.length > 100) throw new Error("Read and review the document first.");
  const saved = await prisma.enterpriseAuditEvent.findFirst({ where: { organizationId, actorUserId: user.id, subjectType: "PURCHASE_IMPORT", subjectId: id, eventType } });
  if (!saved?.locationId) throw new Error("Purchase preview was not found for this staff account.");
  const data = saved.metadata as unknown as T & { expiresAt: string };
  if (Date.parse(data.expiresAt) <= Date.now()) throw new Error("Purchase preview expired. Read the document again.");
  await authorize(user, saved.locationId);
  return { data, locationId: saved.locationId };
}
export function validatePurchaseFile(file: { bytes: Buffer; fileName: string; contentType: string }) {
  if (!file.bytes.length || file.bytes.length > 10 * 1024 * 1024) throw new Error("Choose a purchase document of 10 MB or smaller.");
  if (!file.fileName || file.fileName.length > 240 || /[\\/\x00-\x1f]/.test(file.fileName)) throw new Error("Invalid document name.");
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"].includes(file.contentType)) throw new Error("Choose a PDF, JPEG, PNG, WebP or text document.");
  if (scanVehicleEvidence(file.bytes, file.contentType).malwareStatus !== "CLEAN") throw new Error("Document failed file safety validation.");
}
export async function readPurchaseDocument(actor: AuthenticatedUser | null, locationId: string, file: { bytes: Buffer; fileName: string; contentType: string }): Promise<PurchaseRead> {
  const user = await authorize(actor, locationId);
  validatePurchaseFile(file);
  const extraction = await extractDocumentText(file);
  if (!extraction.text.trim()) throw new Error("No readable text found. Try a clearer document or use spreadsheet import. Scanned PDFs require the configured PDF OCR renderer.");
  const reading = readPurchaseText(extraction.text);
  if (reading.values.vin && !isValidVin(normalizeVinValue(reading.values.vin))) reading.warnings.push("The extracted VIN failed its check digit. Verify and correct it from the original document before importing.");
  if (/\b(?:CAD|EUR|GBP|AUD)\b/.test(extraction.text)) throw new Error("This document identifies a non-USD currency. Use the purchase workflow to review currency conversion; automatic USD allocation is blocked.");
  if (reading.warnings.some(warning => warning.startsWith("Multiple VINs"))) throw new Error("Multiple VINs found. Upload one vehicle's purchase document at a time.");
  const data: StoredRead = { ...reading, warnings: [...reading.warnings, ...extraction.warnings.map(() => "Some document text could not be read; verify the original.")], readId: randomUUID(), fileName: file.fileName, method: extraction.method, text: extraction.text, checksum: hash(file.bytes), contentType: file.contentType, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() };
  await audit(user, locationId, data.readId, "PURCHASE_DOCUMENT_READ", data);
  // Source bytes stay in the browser until confirmation; the original is then stored as governed evidence.
  return { readId: data.readId, fileName: data.fileName, method: data.method, text: data.text, values: data.values, evidence: data.evidence, warnings: data.warnings, category: data.category };
}
export async function readPurchaseSpreadsheet(actor: AuthenticatedUser | null, locationId: string, file: { bytes: Buffer; fileName: string; contentType: string }) {
  const user = await authorize(actor, locationId);
  validatePurchaseFile(file);
  const parsed = parseInventoryCsv(file.bytes.toString("utf8"));
  const currencyColumn = parsed.headers.findIndex(header => /^(?:currency|currency code)$/i.test(header.trim()));
  if (currencyColumn !== -1 && parsed.rows.some(row => row[currencyColumn].trim() && row[currencyColumn].trim().toUpperCase() !== "USD")) throw new Error("Purchase spreadsheet contains a non-USD currency. Review currency conversion before importing.");
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const columns = PURCHASE_FIELDS.map(([key, label]) => {
    const aliases = [key, label.replace(/ \(USD\)$/, ""), label, ...(PURCHASE_HEADER_ALIASES[key] ?? [])].map(compact);
    const matches = parsed.headers.filter(header => aliases.includes(compact(header)));
    if (matches.length > 1) throw new Error(`Multiple columns match ${label}. Rename or remove the ambiguous column.`);
    return { key, index: matches.length ? parsed.headers.indexOf(matches[0]) : -1 };
  });
  if (columns.find(column => column.key === "vin")?.index === -1) throw new Error("Purchase spreadsheet needs a VIN column.");
  const rows: PurchaseRead[] = [];
  const checksum = hash(file.bytes);
  for (const [index, row] of parsed.rows.entries()) {
    const values: PurchaseValues = {}, evidence: PurchaseRead["evidence"] = {};
    for (const column of columns) if (column.index !== -1) { values[column.key] = row[column.index].trim(); evidence[column.key] = `${parsed.headers[column.index]}: ${row[column.index]}`; }
    const normalized = readPurchaseText(Object.entries(values).map(([key, value]) => `${key === "acquiredOn" ? "Purchase date" : key === "odometer" ? "Odometer" : key}: ${value}`).join("\n"));
    if (normalized.values.acquiredOn) values.acquiredOn = normalized.values.acquiredOn;
    if (normalized.values.odometer) values.odometer = normalized.values.odometer;
    if (values.source) values.source = values.source.toUpperCase().replace(/[ -]+/g, "_");
    const reading: PurchaseRead = { readId: randomUUID(), fileName: file.fileName, method: "CSV_ROW", category: "VEHICLE_RECORD", values, evidence, text: Object.values(evidence).join("\n"), warnings: [`Spreadsheet row ${index + 2}. Review vehicle and purchase amounts before saving.`] };
    if (values.vin && !isValidVin(normalizeVinValue(values.vin))) reading.warnings.push("The VIN failed its check digit. Correct this row before importing.");
    const data: StoredRead = { ...reading, checksum, sourceKey: hash(`${checksum}:${index + 2}`), contentType: "text/plain", expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() };
    await audit(user, locationId, reading.readId, "PURCHASE_DOCUMENT_READ", data);
    rows.push(reading);
  }
  return { rows };
}
const emptyDetails = (): IntakeDetails => ({ source: "", seller: "", boughtFrom: "", buyer: "", acquiredOn: "", reference: "", priceStatus: "PENDING", purchaseCents: null, proposedPriceCents: null, whereabouts: "", odometer: null, odometerUnit: "MILES", condition: "", keys: null, titleStatus: "PENDING", documents: "", pendingNotes: "" });
export async function reviewPurchaseDocument(actor: AuthenticatedUser | null, value: unknown): Promise<PurchaseReview> {
  const user = assertAuthenticatedUser(actor), input = record(value);
  const { data: source, locationId } = await load<StoredRead>(user, input.readId, "PURCHASE_DOCUMENT_READ");
  const raw = record(input.values), values: PurchaseValues = {};
  for (const [key] of PURCHASE_FIELDS) {
    if (raw[key] != null && (typeof raw[key] !== "string" || (raw[key] as string).length > 500)) throw new Error("Purchase field is invalid or too long.");
    values[key] = typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
  }
  if (!values.vin) throw new Error("A valid VIN is required for purchase matching.");
  const identity = normalizeVehicleIdentity({ ...values, vehicleNumber: "PURCHASE-PREVIEW", reason: "Reviewed purchase import", idempotencyKey: source.readId });
  values.vin = identity.vin!;
  const matches = await prisma.vehicle.findMany({ where: { organizationId, mergedIntoVehicleId: null, OR: [{ vin: identity.vin }, ...(identity.stockNumberNormalized ? [{ stockNumberNormalized: identity.stockNumberNormalized }] : [])] }, take: 3, select: { id: true, vin: true, vehicleNumber: true, status: true, year: true, make: true, model: true, stockNumber: true } });
  const existing = matches.find(item => item.vin === identity.vin);
  if (matches.some(item => item.id !== existing?.id)) throw new Error("Stock number conflicts with another vehicle. Resolve the identity conflict before importing.");
  if (existing && existing.status !== "ACTIVE") throw new Error("The matched vehicle is inactive. Review its record before importing.");
  await authorize(user, locationId, !existing);
  const intake = existing ? await getVehicleIntake(user, existing.id) : null;
  if (intake?.status === "CONFIRMED") throw new Error("This vehicle's intake is already confirmed. Review purchase changes in its existing intake and costs workspace.");
  const details = intake ? { ...intake.details } : emptyDetails();
  const amount = purchaseAmount(values);
  if (values.source && !(INTAKE_SOURCES as readonly string[]).includes(values.source)) throw new Error("Choose a supported acquisition source before allocating this purchase.");
  const proposals: Partial<IntakeDetails> = { seller: values.seller, boughtFrom: values.boughtFrom, buyer: values.buyer, acquiredOn: values.acquiredOn, reference: values.reference, condition: values.condition,
    ...(values.odometer ? { odometer: Number(values.odometer) } : {}), ...(amount !== null ? { purchaseCents: amount, priceStatus: "INCURRED" } : {}),
    ...(values.source ? { source: values.source } : source.category === "AUCTION_INVOICE" ? { source: "AUCTION" } : source.category === "BILL_OF_SALE" ? { source: "DIRECT_PURCHASE" } : {}) };
  const selected = Array.isArray(input.fields) ? input.fields : [];
  const allowed = ["source", "seller", "boughtFrom", "buyer", "acquiredOn", "reference", "condition", "odometer", "purchaseCents"];
  if (selected.some(key => typeof key !== "string" || !allowed.includes(key))) throw new Error("Choose valid acquisition fields.");
  await authorize(user, locationId, !existing, selected as string[], selected.includes("purchaseCents") ? amount : null);
  const allocations: PurchaseReview["allocations"] = [];
  let allocated = 0;
  for (const [field, proposed] of Object.entries(proposals)) {
    if (proposed == null || proposed === "") continue;
    const current = details[field as keyof IntakeDetails];
    const vacant = current === null || current === "" || field === "priceStatus" && current === "PENDING";
    const conflict = !vacant && current !== proposed;
    allocations.push({ field, current: current === null ? "" : String(current), proposed: String(proposed), conflict });
    if (selected.includes(field) && !conflict) { Object.assign(details, { [field]: proposed }); allocated++; }
  }
  if (selected.includes("purchaseCents") && amount !== null) {
    if (intake?.details.reference && values.reference && intake.details.reference.toUpperCase() !== values.reference.toUpperCase()) throw new Error("This document has a different purchase reference from the existing intake. Reconcile the purchase in that vehicle's intake workspace.");
    if (!details.reference) throw new Error("Select an invoice / sale reference before allocating purchase amounts.");
    if (details.purchaseCents !== null && details.priceStatus === "PENDING") details.priceStatus = "INCURRED";
  }
  normalizeIntake({ details, status: "DRAFT", expectedVersion: intake?.version ?? 0, expectedUnitVersion: intake?.unit?.version ?? null, reason: "Reviewed purchase document allocation", idempotencyKey: source.readId }, new Date());
  if (!allocated) throw new Error("Select at least one non-conflicting acquisition value to allocate.");
  const warnings = [...source.warnings, "Saves an acquisition draft only. No costs, approval, retail readiness or publishing changes."];
  if (existing && (["year", "make", "model", "stockNumber"] as const).some(key => values[key] && String(existing[key] ?? "").toUpperCase() !== values[key]!.toUpperCase())) warnings.push("Document identity details differ from the existing vehicle. Canonical identity will not be overwritten.");
  const previewId = randomUUID();
  const preview: StoredReview = { previewId, readId: source.readId, vehicleId: existing?.id ?? null, vehicleLabel: existing?.vehicleNumber ?? identity.vin!, existing: !!existing, allocations, warnings, values, fields: selected as string[], details, version: intake?.version ?? 0, unitVersion: intake?.unit?.version ?? null, expiresAt: source.expiresAt, vehicleNumber: `DOC-${hash(source.checksum).slice(0, 12).toUpperCase()}`, newVehicleId: randomUUID() };
  await audit(user, locationId, previewId, "PURCHASE_DOCUMENT_REVIEW", preview);
  return { previewId, vehicleId: preview.vehicleId, vehicleLabel: preview.vehicleLabel, existing: preview.existing, allocations, warnings };
}
export async function applyPurchaseDocument(actor: AuthenticatedUser | null, previewId: string, file: { bytes: Buffer; fileName: string; contentType: string }) {
  const user = assertAuthenticatedUser(actor);
  const { data: preview, locationId } = await load<StoredReview>(user, previewId, "PURCHASE_DOCUMENT_REVIEW");
  const { data: source } = await load<StoredRead>(user, preview.readId, "PURCHASE_DOCUMENT_READ");
  validatePurchaseFile(file);
  if (hash(file.bytes) !== source.checksum || file.contentType !== source.contentType) throw new Error("Document changed. Read and review it again.");
  await authorize(user, locationId, !preview.existing, preview.fields, preview.fields.includes("purchaseCents") ? preview.details.purchaseCents : null);
  const already = await prisma.enterpriseAuditEvent.findFirst({ where: { organizationId, subjectType: "PURCHASE_IMPORT", subjectId: source.sourceKey ?? source.checksum, eventType: "PURCHASE_DOCUMENT_ALLOCATED" }, select: { metadata: true } });
  if (already) {
    const priorVehicleId = (already.metadata as { vehicleId: string }).vehicleId;
    await getVehicleIntake(user, priorVehicleId);
    return { vehicleId: priorVehicleId, duplicate: true };
  }
  const transactionKey = hash(`${preview.values.vin?.toUpperCase()}:${preview.details.reference.trim().toUpperCase() || source.checksum}`);
  const key = `purchase-document:${transactionKey}`;
  const prior = await prisma.enterpriseCommandLedger.findFirst({ where: { organizationId, domain: "RETAIL_INVENTORY", commandType: "SAVE_INVENTORY_INTAKE", idempotencyKey: key }, select: { resultSnapshot: true } });
  if (prior) {
    const priorVehicleId = (prior.resultSnapshot as { vehicleId: string }).vehicleId;
    await getVehicleIntake(user, priorVehicleId);
    return { vehicleId: priorVehicleId, duplicate: true };
  }
  let vehicleId = preview.vehicleId;
  if (!vehicleId) {
    const nowExisting = await prisma.vehicle.findFirst({ where: { organizationId, vin: preview.values.vin?.toUpperCase(), mergedIntoVehicleId: null }, select: { id: true } });
    if (nowExisting && nowExisting.id !== preview.newVehicleId) throw new Error("A matching vehicle was added since review. Review this document again to use that record.");
    const creation = await createRegistryVehicle(user, { ...preview.values, vehicleNumber: source.sourceKey ? `DOC-${source.sourceKey.slice(0, 12).toUpperCase()}` : preview.vehicleNumber, locationId, reason: "Reviewed purchase document identity", idempotencyKey: `purchase-vehicle:${source.sourceKey ?? source.checksum}` }, {}, { vehicleId: preview.newVehicleId, canonicalOrigins: { purchaseDocument: source.checksum } });
    const created = creation.result as { id: string; duplicateReviewId?: string };
    if (created.duplicateReviewId) throw new Error("Vehicle identity needs duplicate review. No acquisition values were saved.");
    vehicleId = created.id;
  }
  const current = await getVehicleIntake(user, vehicleId);
  if (current.version !== preview.version || (current.unit?.version ?? null) !== preview.unitVersion || current.status === "CONFIRMED") throw new Error("Vehicle intake changed since review. Review the document again.");
  const retention = new Date(); retention.setUTCFullYear(retention.getUTCFullYear() + 7);
  await uploadVehicleEvidence(user, { vehicleId, fileName: source.fileName, contentType: source.contentType, contentBase64: file.bytes.toString("base64"), category: "OTHER", subjectType: "VEHICLE", accessLevel: "INTERNAL", retentionUntil: retention.toISOString(), idempotencyKey: `purchase-source:${source.checksum}:${vehicleId}`, reason: "Original reviewed purchase document" });
  const details = { ...preview.details, documents: [preview.details.documents, `Purchase document: ${source.fileName}`].filter(Boolean).join("; ").slice(0, 1000), pendingNotes: [preview.details.pendingNotes, `Document breakdown (USD): vehicle ${preview.values.purchasePrice || "pending"}; buyer fee ${preview.values.buyerFee || "pending"}; transport ${preview.values.transportFee || "pending"}; other ${preview.values.otherFees || "pending"}.`].filter(Boolean).join("\n").slice(0, 1000) };
  const result = await saveVehicleIntake(user, vehicleId, { details, status: "DRAFT", expectedVersion: preview.version, expectedUnitVersion: preview.unitVersion, idempotencyKey: key, reason: "Reviewed purchase document allocation" });
  await audit(user, locationId, source.sourceKey ?? source.checksum, "PURCHASE_DOCUMENT_ALLOCATED", { vehicleId, previewId, category: source.category, allocations: preview.allocations });
  return { vehicleId, duplicate: false, result };
}
