import { Prisma } from "@prisma/client";
import { runCompactPartsEntry, type CompactPartsEntryInput, type CompactPartsEntryModel, type CompactPartsEntryProgress } from "@/lib/compact-parts-entry";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { createPart, createRepairPartDemand } from "@/server/parts-ledger/service";
import { executeServiceClosePartsCommand } from "@/server/service-close-parts/service";
import { PartsQuoteError, quotePurchaseNumber, quotePurchaseState, readPartsQuote, readQuotePurchaseDate } from "./domain";

const organizationId = INITIAL_ORGANIZATION.id;


async function access(actor: AuthenticatedUser | null, repairOrderId: string, write = false) {
  if (!actor) throw new PartsQuoteError("Sign in to open parts quotes.", 401);
  const foundation = createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(actor.id, organizationId);
  const can = (capability: VehicleCapability, locationId: string | null) => evaluateVehicleCapability({ actor, capability, grants, locationId }).allowed;
  if (!can("PARTS_VIEW", null) || !can("REPAIR_ORDER_VIEW", null)) throw new PartsQuoteError("Your role cannot view parts quotes.", 403);
  const order = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, organizationId },
    select: { id: true, locationId: true, closedAt: true, repairOrderNumber: true, vehicle: { select: { year: true, make: true, model: true, vin: true, stockNumber: true } } },
  });
  if (!order || !can("PARTS_VIEW", order.locationId) || !can("REPAIR_ORDER_VIEW", order.locationId)) throw new PartsQuoteError("This repair order is unavailable for your role or location.", 404);
  const canWrite = !order.closedAt && can("PARTS_MANAGE", order.locationId);
  if (write && !canWrite) throw new PartsQuoteError(order.closedAt ? "This repair order is closed." : "Your role cannot save or check out parts quotes at this location.", 403);
  return { actor, order, canWrite };
}

const purchaseWhere = (repairOrderId: string): Prisma.PartPurchaseOrderWhereInput => ({ organizationId, requisition: { demand: { repairOrderId } } });

export async function getRepairPartsQuotes(actor: AuthenticatedUser | null, repairOrderId: string) {
  const { order, canWrite } = await access(actor, repairOrderId);
  const quotes = await prisma.repairPartQuote.findMany({ where: { repairOrderId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const orders = quotes.length ? await prisma.partPurchaseOrder.findMany({
    where: { ...purchaseWhere(repairOrderId), purchaseOrderNumber: { in: quotes.map(quote => quotePurchaseNumber(quote.id)) } },
    select: { purchaseOrderNumber: true, status: true },
  }) : [];
  const purchases = new Map(orders.map(purchase => [purchase.purchaseOrderNumber, purchase.status]));
  return {
    order, canWrite, quotes: quotes.map(quote => ({
      id: quote.id, part: quote.part, partNumber: quote.partNumber, supplier: quote.supplier, supplierPhone: quote.supplierPhone,
      supplierContact: quote.supplierContact, supplierLink: quote.supplierLink, quantity: quote.quantity,
      unitPriceCents: quote.unitPriceCents, reference: quote.reference, createdAt: quote.createdAt.toISOString(),
      state: quotePurchaseState(purchases.get(quotePurchaseNumber(quote.id)), Boolean(quote.checkoutProgress)),
    })),
  };
}

export async function saveRepairPartsQuote(actor: AuthenticatedUser | null, repairOrderId: string, raw: Record<string, unknown>) {
  const context = await access(actor, repairOrderId, true);
  const data = readPartsQuote(raw);
  const { count } = await prisma.repairPartQuote.createMany({ data: { ...data, repairOrderId, createdByUserId: context.actor.id }, skipDuplicates: true });
  if (!count) {
    const existing = await prisma.repairPartQuote.findFirst({ where: { id: data.id, repairOrderId, createdByUserId: context.actor.id } });
    if (!existing || Object.entries(data).some(([key, value]) => existing[key as keyof typeof data] !== value)) {
      throw new PartsQuoteError("This quote request was already used. Reload the workbook and review the saved quotes.", 409);
    }
  }
}

function resultObject(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("The saved parts result could not be read.");
  return result as Record<string, unknown>;
}

type RepairPartOrder = Awaited<ReturnType<typeof access>>["order"];

async function checkoutModel(order: RepairPartOrder): Promise<CompactPartsEntryModel> {
  const [catalog, vendors, demands, requisitions, purchaseOrders, jobs] = await Promise.all([
    prisma.part.findMany({ where: { organizationId, status: "ACTIVE" }, select: { id: true, partNumber: true, description: true, status: true } }),
    prisma.partVendor.findMany({ where: { organizationId, status: "ACTIVE" }, select: { id: true, name: true, status: true } }),
    prisma.repairPartDemand.findMany({ where: { organizationId, repairOrderId: order.id }, select: { id: true, repairOrderId: true, repairJobId: true, partId: true, quantityRequired: true, quantityReserved: true, status: true } }),
    prisma.partRequisition.findMany({ where: { organizationId, demand: { repairOrderId: order.id } }, select: { id: true, demandId: true, status: true } }),
    prisma.partPurchaseOrder.findMany({ where: purchaseWhere(order.id), select: { id: true, locationId: true, status: true, lines: true } }),
    prisma.repairJob.findMany({ where: { repairOrderId: order.id, status: { notIn: ["CANCELLED", "QC_PASSED"] } }, select: { id: true }, take: 2 }),
  ]);
  return {
    repairOrders: [{ id: order.id, locationId: order.locationId, closedAt: order.closedAt?.toISOString() }],
    catalog, vendors, demands, requisitions, stockLocations: [], receipts: [],
    purchaseOrders: purchaseOrders.map(({ lines, ...purchase }) => ({
      ...purchase, repairOrderId: order.id, lines: Array.isArray(lines) ? lines.flatMap(line => {
        if (!line || typeof line !== "object" || Array.isArray(line)) return [];
        const { partId, quantity, unitCostCents } = line;
        return typeof partId === "string" && typeof quantity === "number" && typeof unitCostCents === "number" ? [{ partId, quantity, unitCostCents }] : [];
      }) : [],
    })),
    repairJobs: jobs.map(job => ({ ...job, repairOrderId: order.id, status: "ACTIVE" })),
  };
}

export async function checkoutRepairPartsQuote(actor: AuthenticatedUser | null, repairOrderId: string, quoteId: string, purchasedOn: unknown) {
  // Serialize quote checkouts on this repair order. Procurement commands and
  // checkpoints commit separately, so a closed tab cannot erase progress.
  return prisma.$transaction(async lock => {
    const [row] = await lock.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${"parts-quote:" + repairOrderId}, 0)) AS acquired`;
    if (!row?.acquired) throw new PartsQuoteError("A checkout is already running for this repair. Wait a moment and try again.", 409);
    const { order, actor: user } = await access(actor, repairOrderId, true);
    const quote = await prisma.repairPartQuote.findFirst({ where: { id: quoteId, repairOrderId } });
    if (!quote) throw new PartsQuoteError("This quote is not on the selected repair order.", 404);
    const recorded = await prisma.partPurchaseOrder.findFirst({
      where: { ...purchaseWhere(repairOrderId), purchaseOrderNumber: quotePurchaseNumber(quote.id) }, select: { status: true },
    });
    if (recorded) return { message: quotePurchaseState(recorded.status, false) + ". View the existing order in Parts Operations." };

    const model = await checkoutModel(order);
    const progress = quote.checkoutProgress as CompactPartsEntryProgress | null;
    // Match the regular Parts Operations entry. Resuming never changes the
    // supplier, price, part, or purchase date from the original submission.
    const input: CompactPartsEntryInput = progress?.input ?? {
      mode: "PURCHASED", repairOrderId, locationId: order.locationId, description: quote.part,
      quantity: quote.quantity, partNumber: quote.partNumber ?? undefined, vendorName: quote.supplier,
      unitPriceCents: quote.unitPriceCents, purchasedAt: readQuotePurchaseDate(purchasedOn),
      repairJobId: model.repairJobs?.length === 1 ? model.repairJobs[0].id : undefined,
      note: `Record a staff-confirmed purchase from quote ${quote.id}.`,
    };

    const result = await runCompactPartsEntry(input, model, {
      progress: progress ?? { input, submissionId: quote.id, startedAt: new Date().toISOString(), steps: {} },
      onProgress: async checkpoint => {
        if (progress || Object.keys(checkpoint.steps).length) {
          await prisma.repairPartQuote.update({ where: { id: quote.id }, data: { checkoutProgress: checkpoint as unknown as Prisma.InputJsonValue } });
        }
      },
      request: async (path, body) => {
        const part = path === "/api/parts";
        const demand = path === `/api/repair-orders/${encodeURIComponent(repairOrderId)}/parts`;
        if (!part && !demand && path !== "/api/service-close-parts") throw new Error("Unsupported quote checkout operation.");
        const commandType = part ? "CREATE_PART" : demand ? "CREATE_REPAIR_PART_DEMAND" : String(body.action);
        // If a command committed but the checkpoint did not, recover only this
        // quote's own receipt even when a different authorized staffer resumes.
        const receipt = await prisma.enterpriseCommandLedger.findFirst({
          where: { organizationId, domain: "PARTS_OPERATIONS", commandType, idempotencyKey: String(body.idempotencyKey), status: "SUCCEEDED" },
          select: { resultSnapshot: true },
        });
        if (receipt) return { result: resultObject(receipt.resultSnapshot) };
        const policy = { enforceRollout: false };
        const response = part ? await createPart(user, body, policy)
          : demand ? await createRepairPartDemand(user, repairOrderId, body, policy)
            : await executeServiceClosePartsCommand(user, body, policy);
        return { result: resultObject(response.result) };
      },
    });

    if (result.status === "BLOCKED" || result.status === "RETRY") {
      throw new PartsQuoteError(`${result.message} ${result.nextAction}`, 409);
    }
    return { message: result.message };
  }, { timeout: 45_000 });
}
