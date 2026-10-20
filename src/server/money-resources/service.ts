import { createHash } from "node:crypto";
import { Prisma, type MoneyEntry } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { advanceBalance, businessDate, cashExpected, cents, MONEY_CATEGORIES, moneyToday, MoneyError, parseCardCsv, PAYMENT_METHODS, receiptPending, text } from "@/lib/money-resources";
import { purchasingCommand, purchasingData, purchasingPolicy, purchaseSnapshot, type PurchasingData } from "./purchasing";

type Database = Prisma.TransactionClient;
export async function moneyAccess(actor: AuthenticatedUser | null, database: Database = prisma) {
  if (!actor?.isActive) throw new MoneyError("Sign in with an active staff account.", 401);
  const now = new Date();
  const grants = await database.userLocationAccess.findMany({ where: { userId: actor.id, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] }, select: { location: { select: { organizationId: true } } } });
  const organizations = [...new Set(grants.map(grant => grant.location.organizationId))];
  if (organizations.length !== 1) throw new MoneyError("Select one authorized organization before recording money.", 403);
  return { actor, organizationId: organizations[0], manager: isManager(actor) };
}
type Access = Awaited<ReturnType<typeof moneyAccess>>;
function management(access: Access) { if (!access.manager) throw new MoneyError("An authorized manager must complete this action.", 403); }
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)); }
async function staff(database: Database, access: Access, id: string) {
  const now = new Date();
  const found = await database.user.findFirst({ where: { id, isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId }, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] } } }, select: { id: true } });
  if (!found) throw new MoneyError("Choose active staff in this organization.");
}
async function entry(database: Database, access: Access, id: unknown, version?: unknown) {
  const found = await database.moneyEntry.findFirst({ where: { id: text(id), organizationId: access.organizationId, ...(!access.manager ? { employeeId: access.actor.id } : {}) } });
  if (!found) throw new MoneyError("This money record is not available.", 404);
  if (version !== undefined && found.version !== version) throw new MoneyError("Another person changed this record. Refresh and review it before saving.", 409);
  return found;
}
async function account(database: Database, access: Access, id: unknown, includeInactive = false) {
  const found = await database.moneyAccount.findFirst({ where: { id: text(id), organizationId: access.organizationId, ...(!includeInactive ? { active: true } : {}), ...(!access.manager ? { OR: [{ assignedUserId: access.actor.id }, { assignedUserId: null, kind: { not: "CARD" } }] } : {}) } });
  if (!found) throw new MoneyError("Choose an available funding source.");
  return found;
}
async function advanceChildren(database: Database, parent: MoneyEntry) {
  const children = await database.moneyEntry.findMany({ where: { organizationId: parent.organizationId, parentId: parent.id } });
  const refunds = await database.moneyEntry.findMany({ where: { organizationId: parent.organizationId, kind: "REFUND", parentId: { in: children.filter(child => child.kind === "EXPENSE").map(child => child.id) } } });
  return [...children, ...refunds];
}
async function links(database: Database, access: Access, value: Record<string, unknown>) {
  let vehicleId = text(value.vehicleId) || null, inventoryUnitId = text(value.inventoryUnitId) || null;
  const repairOrderId = text(value.repairOrderId) || null, vendorId = text(value.vendorId) || null, inventoryCostId = text(value.inventoryCostId) || null;
  if (repairOrderId) {
    const order = await database.repairOrder.findFirst({ where: { id: repairOrderId, organizationId: access.organizationId }, select: { vehicleId: true, inventoryUnitId: true } });
    if (!order || (vehicleId && vehicleId !== order.vehicleId)) throw new MoneyError("Choose a repair order for the same vehicle.");
    vehicleId = order.vehicleId; inventoryUnitId = order.inventoryUnitId;
  }
  if (vehicleId) {
    const vehicle = await database.vehicle.findFirst({ where: { id: vehicleId, organizationId: access.organizationId }, select: { id: true } });
    if (!vehicle) throw new MoneyError("Vehicle is not available in this organization.");
    const unit = await database.inventoryUnit.findFirst({ where: { organizationId: access.organizationId, vehicleId, ...(inventoryUnitId ? { id: inventoryUnitId } : { closedAt: null }) }, select: { id: true } });
    if (inventoryUnitId && !unit) throw new MoneyError("Inventory unit does not belong to this vehicle.");
    inventoryUnitId = unit?.id ?? null;
  } else if (inventoryUnitId) throw new MoneyError("Choose the canonical vehicle for this inventory unit.");
  if (vendorId && !await database.vendor.findFirst({ where: { id: vendorId, organizationId: access.organizationId }, select: { id: true } })) throw new MoneyError("Vendor is not available.");
  if (inventoryCostId) {
    const cost = await database.inventoryUnitCost.findFirst({ where: { id: inventoryCostId, organizationId: access.organizationId, inventoryUnitId: inventoryUnitId ?? "", status: "INCURRED" }, select: { amountCents: true, currency: true } });
    if (!cost || cost.currency !== "USD" || cost.amountCents !== cents(value.amount)) throw new MoneyError("Select the matching incurred inventory cost and amount. Do not record a second cost.");
  }
  return { vehicleId, inventoryUnitId, repairOrderId, vendorId, inventoryCostId };
}

export async function getMoneyResources(actor: AuthenticatedUser | null, query = new URLSearchParams()) {
  const access = await moneyAccess(actor);
  const scope = { organizationId: access.organizationId, ...(!access.manager ? { employeeId: access.actor.id } : {}) };
  const day = query.get("date") ? businessDate(query.get("date")) : moneyToday();
  const [accounts, entries, advances, requests, charges, users, vehicles, orders, vendors, closes, purchasing] = await Promise.all([
    prisma.moneyAccount.findMany({ where: { organizationId: access.organizationId, ...(!access.manager ? { OR: [{ assignedUserId: access.actor.id }, { assignedUserId: null, kind: { not: "CARD" } }, { purchasingAuthorizations: { some: { employeeId: access.actor.id, organizationId: access.organizationId } } }, { entries: { some: { employeeId: access.actor.id, kind: "ADVANCE_ISSUE", approvalStatus: { not: "SETTLED" } } } }] } : {}) }, include: { assignedUser: { select: { name: true } } }, orderBy: { label: "asc" } }),
    prisma.moneyEntry.findMany({ where: { ...scope, OR: [{ businessDate: day }, { approvalStatus: "PENDING" }, { kind: "EXPENSE", approvalStatus: { not: "SUPERSEDED" }, purchasingSnapshot: { path: ["flags"], not: [] } }, { kind: "EXPENSE", approvalStatus: { not: "SUPERSEDED" }, receiptDocumentId: null, receiptExplanation: null }, { kind: "EXPENSE", paymentMethod: "PERSONAL", approvalStatus: "APPROVED" }, { approvalStatus: "APPROVED", reconciledAt: null, account: { kind: "CARD" } }] }, include: { employee: { select: { name: true } }, account: { select: { label: true, lastFour: true } }, matchedCharge: { select: { id: true } } }, orderBy: { createdAt: "desc" }, take: 501 }),
    prisma.moneyEntry.findMany({ where: { ...scope, kind: "ADVANCE_ISSUE", approvalStatus: { not: "SETTLED" } }, include: { employee: { select: { name: true } } }, take: 201 }),
    prisma.moneyEntry.findMany({ where: { ...scope, kind: "FUNDS_REQUEST", approvalStatus: "APPROVED", children: { none: { kind: "ADVANCE_ISSUE" } } }, include: { employee: { select: { name: true } } }, take: 201 }),
    prisma.moneyCardCharge.findMany({ where: { organizationId: access.organizationId, ...(!access.manager ? { account: { assignedUserId: access.actor.id } } : {}), OR: [{ matchedEntryId: null }, { businessDate: day }] }, include: { account: { select: { label: true } } }, orderBy: { businessDate: "desc" }, take: 501 }),
    access.manager ? prisma.user.findMany({ where: { isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId }, validFrom: { lte: new Date() }, OR: [{ validTo: null }, { validTo: { gte: new Date() } }] } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([{ id: access.actor.id, name: access.actor.name }]),
    prisma.vehicle.findMany({ where: { organizationId: access.organizationId, mergedIntoVehicleId: null }, select: { id: true, vehicleNumber: true, stockNumber: true, year: true, make: true, model: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.repairOrder.findMany({ where: { organizationId: access.organizationId, closedAt: null }, select: { id: true, vehicleId: true, repairOrderNumber: true }, take: 200 }),
    prisma.vendor.findMany({ where: { organizationId: access.organizationId }, select: { id: true, name: true }, take: 200 }),
    access.manager ? prisma.moneyDailyClose.findMany({ where: { organizationId: access.organizationId, businessDate: day }, include: { account: { select: { label: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([]),
    purchasingData(prisma, access)
  ]);
  const balances = await Promise.all(advances.slice(0, 200).map(async issued => ({ ...issued, balanceCents: advanceBalance(issued.amountCents, await advanceChildren(prisma, issued)) })));
  return JSON.parse(JSON.stringify({ ...purchasing, manager: access.manager, actorId: access.actor.id, day, accounts, entries: entries.slice(0, 500), advances: balances, requests, charges: charges.slice(0, 500), users, vehicles, orders, vendors, closes, limited: purchasing.purchasingLimited || entries.length > 500 || advances.length > 200 || charges.length > 500 })) as MoneyResourcesModel;
}
export type MoneyResourcesModel = PurchasingData & {
  manager: boolean; actorId: string; day: string; limited: boolean;
  accounts: Array<{ id: string; label: string; kind: string; assignedUserId: string | null; lastFour: string | null; active: boolean; limitCents: number | null; openingBalanceCents: number }>;
  entries: Array<Omit<MoneyEntry, "createdAt" | "reconciledAt"> & { createdAt: string; reconciledAt: string | null; employee: { name: string }; account: { label: string; lastFour: string | null } | null; matchedCharge: { id: string } | null }>;
  advances: Array<MoneyEntry & { employee: { name: string }; balanceCents: number }>;
  requests: Array<MoneyEntry & { employee: { name: string } }>;
  charges: Array<{ id: string; accountId: string; merchant: string; amountCents: number; businessDate: string; externalId: string; matchedEntryId: string | null; version: number; account: { label: string } }>;
  users: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; vehicleNumber: string; stockNumber: string | null; year: number | null; make: string | null; model: string | null }>;
  orders: Array<{ id: string; vehicleId: string; repairOrderNumber: string }>;
  vendors: Array<{ id: string; name: string }>;
  closes: Array<{ id: string; accountId: string; differenceCents: number; expectedCents: number; countedCents: number; unresolvedCount: number; note: string; account: { label: string } }>;
};

export async function moneyCommand(actor: AuthenticatedUser | null, raw: unknown) {
  const access = await moneyAccess(actor);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new MoneyError("Choose a money action.");
  const value = raw as Record<string, unknown>, action = text(value.action, 40), key = text(value.idempotencyKey, 150);
  if (!key) throw new MoneyError("A save reference is required. Refresh and try again.");
  const hash = createHash("sha256").update(JSON.stringify({ actor: access.actor.id, value })).digest("hex");
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`money:${access.organizationId}`}))`;
    const replay = await database.moneyAudit.findUnique({ where: { organizationId_idempotencyKey: { organizationId: access.organizationId, idempotencyKey: key } } });
    if (replay) { if (replay.requestHash !== hash || replay.actorUserId !== access.actor.id) throw new MoneyError("This save reference belongs to a different action.", 409); return replay.result; }
    let result: unknown;
    let subjectId = text(value.id) || "resources";
    if (["AUTHORIZE_PURCHASING", "REVOKE_PURCHASING", "REQUEST_PURCHASE_APPROVAL", "REVIEW_PURCHASE_APPROVAL"].includes(action)) {
      result = await purchasingCommand(database, access, action, value);
    } else if (action === "CREATE_ACCOUNT") {
      management(access);
      const kind = text(value.kind), label = text(value.label, 100), assignedUserId = text(value.employeeId) || null, lastFour = text(value.lastFour, 4) || null;
      if (!["CARD", "CASH", "BANK"].includes(kind) || !label) throw new MoneyError("Name the funding source and choose its type.");
      if (assignedUserId) await staff(database, access, assignedUserId);
      if (kind === "CARD" && (!assignedUserId || !lastFour || !/^\d{4}$/.test(lastFour))) throw new MoneyError("Assign the card to staff and enter only its last four digits.");
      result = await database.moneyAccount.create({ data: { organizationId: access.organizationId, label, kind, assignedUserId, lastFour, limitCents: value.limit ? cents(value.limit) : null, openingBalanceCents: kind === "CASH" ? cents(value.opening || "0", true) : 0 } });
    } else if (action === "RECORD" || action === "REQUEST") {
      const purpose = text(value.purpose, 1000), paymentMethod = action === "REQUEST" ? "CASH" : text(value.paymentMethod), amountCents = cents(value.amount);
      if (!purpose || !PAYMENT_METHODS.includes(paymentMethod as typeof PAYMENT_METHODS[number])) throw new MoneyError("Enter the business purpose and payment method.");
      const issued = value.advanceId ? await entry(database, access, value.advanceId) : null;
      if (issued && (issued.kind !== "ADVANCE_ISSUE" || issued.employeeId !== access.actor.id || issued.approvalStatus === "SETTLED" || issued.accountId !== text(value.accountId))) throw new MoneyError("Choose your own unsettled advance and its funding source.");
      const policy = action === "RECORD" && value.authorizationId ? await purchasingPolicy(database, access, value.authorizationId) : null;
      if (policy && (paymentMethod !== "CARD" || issued || text(value.accountId) !== policy.accountId)) throw new MoneyError("Choose the card on this purchasing authorization, without an unrelated advance.");
      const selected = policy ? policy.account : value.accountId ? issued ? await database.moneyAccount.findFirstOrThrow({ where: { id: text(value.accountId), organizationId: access.organizationId } }) : await account(database, access, value.accountId) : null;
      if (selected && selected.kind !== paymentMethod) throw new MoneyError("The funding source must match the payment method.");
      const employeeId = policy?.employeeId ?? (action === "RECORD" && access.manager && selected?.kind === "CARD" ? selected.assignedUserId! : access.actor.id);
      if (!policy && !issued && selected?.assignedUserId && selected.assignedUserId !== access.actor.id && !(access.manager && selected.kind === "CARD")) throw new MoneyError("Record spending against your own assigned card or funds.");
      if (value.employeeId && text(value.employeeId) !== employeeId) throw new MoneyError("The responsible employee must match the selected card or your own funds.");
      if (employeeId !== access.actor.id) await staff(database, access, employeeId);
      if (paymentMethod === "CARD" && !selected) throw new MoneyError(access.manager ? "Select a company card or add it below the funding source." : "Select your assigned company card. Ask a manager to add or assign it if missing.");
      const linked = await links(database, access, value);
      let parentId: string | null = null;
      if (value.advanceId) {
        const advance = await entry(database, access, value.advanceId);
        if (advance.kind !== "ADVANCE_ISSUE" || advance.employeeId !== access.actor.id || advance.approvalStatus === "SETTLED" || advance.accountId !== selected?.id) throw new MoneyError("Choose your unsettled advance and its funding source.");
        parentId = advance.id;
      }
      const category = text(value.category) || "Other";
      if (!MONEY_CATEGORIES.includes(category as typeof MONEY_CATEGORIES[number])) throw new MoneyError("Choose a spending category.");
      const date = businessDate(value.businessDate || moneyToday());
      const purchasing = action === "RECORD" && paymentMethod === "CARD" ? await purchaseSnapshot(database, access, value, { ...linked, employeeId, accountId: selected?.id ?? null, amountCents, category, purpose, businessDate: date }) : {};
      result = await database.moneyEntry.create({ data: { ...linked, ...purchasing, organizationId: access.organizationId, employeeId, kind: action === "REQUEST" ? "FUNDS_REQUEST" : "EXPENSE", amountCents, businessDate: date, merchant: text(value.merchant, 200), purpose, category, paymentMethod, accountId: selected?.id ?? null, parentId, reference: text(value.reference, 150) || null } });
    } else if (action === "IMPORT") {
      management(access); const selected = await account(database, access, value.accountId, true);
      if (selected.kind !== "CARD") throw new MoneyError("Choose an assigned company card for the statement.");
      const rows = parseCardCsv(text(value.csv, 1_000_000)); let imported = 0;
      for (const row of rows) {
        const existing = await database.moneyCardCharge.findUnique({ where: { accountId_externalId: { accountId: selected.id, externalId: row.externalId } } });
        if (existing) { if (existing.amountCents !== row.amountCents || existing.businessDate !== row.businessDate || existing.merchant !== row.merchant) throw new MoneyError("An existing statement ID has changed details. Review the source file.", 409); continue; }
        await database.moneyCardCharge.create({ data: { ...row, organizationId: access.organizationId, accountId: selected.id } }); imported++;
      }
      result = { imported, skipped: rows.length - imported }; subjectId = selected.id;
    } else if (action === "MATCH") {
      management(access);
      const charge = await database.moneyCardCharge.findFirst({ where: { id: text(value.chargeId), organizationId: access.organizationId } });
      const spending = await entry(database, access, value.id, value.version);
      if (!charge || charge.version !== value.chargeVersion || charge.matchedEntryId || spending.reconciledAt) throw new MoneyError("This match changed. Refresh before matching.", 409);
      if (!["EXPENSE", "REFUND", "CARD_PAYMENT"].includes(spending.kind) || spending.approvalStatus !== "APPROVED" || spending.accountId !== charge.accountId || spending.amountCents * (spending.kind === "EXPENSE" ? 1 : -1) !== charge.amountCents) throw new MoneyError("Match the same card, approved amount and purchase/refund/payment type.");
      await database.moneyCardCharge.update({ where: { id: charge.id }, data: { matchedEntryId: spending.id, version: { increment: 1 } } });
      result = await database.moneyEntry.update({ where: { id: spending.id }, data: { reconciledAt: new Date(), version: { increment: 1 } } });
    } else if (action === "CLOSE") {
      management(access); const selected = await account(database, access, value.accountId, true);
      if (selected.kind !== "CASH") throw new MoneyError("Physical cash counts apply only to cash funding sources.");
      const day = businessDate(value.businessDate), entries = await database.moneyEntry.findMany({ where: { organizationId: access.organizationId, accountId: selected.id, businessDate: { lte: day } } });
      const expectedCents = cashExpected(selected.openingBalanceCents, entries), countedCents = cents(value.amount, true);
      const unresolvedCount = entries.filter(row => receiptPending(row) || row.approvalStatus === "PENDING").length;
      result = await database.moneyDailyClose.create({ data: { organizationId: access.organizationId, accountId: selected.id, businessDate: day, expectedCents, countedCents, differenceCents: countedCents - expectedCents, unresolvedCount, note: text(value.note, 1000), actorUserId: access.actor.id } });
      subjectId = selected.id;
    } else if (action === "CARD_PAYMENT") {
      management(access); const selected = await account(database, access, value.accountId, true);
      if (selected.kind !== "CARD" || !selected.assignedUserId || !text(value.reference, 150)) throw new MoneyError("Select a company card and the actual statement payment reference.");
      result = await database.moneyEntry.create({ data: { organizationId: access.organizationId, employeeId: selected.assignedUserId, kind: "CARD_PAYMENT", amountCents: cents(value.amount), businessDate: businessDate(value.businessDate || moneyToday()), merchant: "Card issuer", purpose: "Statement payment recorded, not executed by this app.", category: "Other", paymentMethod: "BANK", accountId: selected.id, reference: text(value.reference, 150), approvalStatus: "APPROVED" } });
    } else if (action === "DEACTIVATE") {
      management(access); const selected = await account(database, access, value.accountId);
      result = await database.moneyAccount.update({ where: { id: selected.id }, data: { active: false } }); subjectId = selected.id;
    } else {
      if (!Number.isSafeInteger(value.version) || Number(value.version) < 1) throw new MoneyError("Refresh the current record before changing it.", 409);
      const original = await entry(database, access, value.id, value.version); subjectId = original.id;
      if (original.approvalStatus === "SUPERSEDED") throw new MoneyError("This record was replaced by a documented correction. Open its history.", 409);
      if (action === "EXPLAIN") {
        const explanation = text(value.note, 1000);
        if (!explanation) throw new MoneyError("Add a brief explanation or follow-up.");
        if (original.reconciledAt) throw new MoneyError("Reconciled evidence cannot be overwritten. Ask management to investigate a correction.", 409);
        result = await database.moneyEntry.update({ where: { id: original.id }, data: { receiptExplanation: explanation, approvalStatus: "PENDING", reviewedById: null, version: { increment: 1 } } });
      } else if (action === "REVIEW") {
        management(access);
        if (original.employeeId === access.actor.id) throw new MoneyError("A different manager must review your own spending or returned funds.", 403);
        if (original.kind === "EXPENSE" && await database.moneyAudit.findFirst({ where: { organizationId: access.organizationId, action: { in: ["RECORD", "CORRECT"] }, result: { path: ["id"], equals: original.id }, actorUserId: access.actor.id }, select: { id: true } })) throw new MoneyError("A different manager must review spending you recorded on behalf of staff.", 403);
        if (original.approvalStatus !== "PENDING" || !["APPROVED", "REJECTED"].includes(text(value.decision))) throw new MoneyError("Only pending records can be reviewed.", 409);
        if (value.decision === "APPROVED" && receiptPending(original)) throw new MoneyError("Attach the receipt or record a missing-receipt explanation before approval.");
        if (!text(value.note, 1000)) throw new MoneyError("Record the review decision briefly.");
        result = await database.moneyEntry.update({ where: { id: original.id }, data: { approvalStatus: text(value.decision), reviewedById: access.actor.id, version: { increment: 1 } } });
      } else if (action === "CORRECT") {
        management(access);
        const note = text(value.note, 1000);
        if (original.kind !== "EXPENSE" || original.approvalStatus === "SUPERSEDED" || original.reconciledAt || original.inventoryCostId || !note || await database.moneyEntry.findFirst({ where: { parentId: original.id, kind: { in: ["REFUND", "REIMBURSEMENT"] } } })) throw new MoneyError("Use a documented correction only for an unmatched purchase without linked costs, refunds or reimbursements. Investigate other records through their original workflow.");
        await database.moneyEntry.update({ where: { id: original.id }, data: { approvalStatus: "SUPERSEDED", version: { increment: 1 } } });
        const { id: _id, createdAt: _date, version: _version, ...copy } = original;
        void _id; void _date; void _version;
        const funding = value.accountId ? await account(database, access, value.accountId) : null;
        if (funding && (funding.kind !== original.paymentMethod || (funding.assignedUserId && funding.assignedUserId !== original.employeeId))) throw new MoneyError("Use a matching funding source assigned to the original employee.");
        const corrected = { ...original, accountId: funding?.id ?? copy.accountId, amountCents: cents(value.amount), purpose: `${original.purpose}\nCorrection: ${note}`.slice(0, 1000) };
        const purchasing = original.paymentMethod === "CARD" ? await purchaseSnapshot(database, access, { authorizationId: original.purchasingAuthorizationId }, corrected) : { purchasingAuthorizationId: null, purchaseApprovalId: null, purchasingSnapshot: Prisma.DbNull };
        result = await database.moneyEntry.create({ data: { ...copy, ...purchasing, accountId: corrected.accountId, amountCents: corrected.amountCents, purpose: corrected.purpose, approvalStatus: "PENDING", reviewedById: null, reconciledAt: null, reference: `Correction of ${original.id}` } });
      } else if (action === "ISSUE") {
        management(access);
        if (original.kind !== "FUNDS_REQUEST" || original.approvalStatus !== "APPROVED" || original.employeeId === access.actor.id) throw new MoneyError("Issue funds against another staff member’s approved request.");
        if (await database.moneyEntry.findFirst({ where: { parentId: original.id, kind: "ADVANCE_ISSUE" } })) throw new MoneyError("Funds were already issued for this request.", 409);
        const selected = await account(database, access, value.accountId);
        if (selected.kind === "CARD") throw new MoneyError("A card assignment is not a cash advance.");
        if (!text(value.reference, 150)) throw new MoneyError("Record the actual cash handover or transfer reference.");
        result = await database.moneyEntry.create({ data: { organizationId: access.organizationId, employeeId: original.employeeId, kind: "ADVANCE_ISSUE", amountCents: original.amountCents, businessDate: moneyToday(), merchant: "Staff advance", purpose: original.purpose, category: original.category, paymentMethod: selected.kind, accountId: selected.id, parentId: original.id, approvalStatus: "APPROVED", reference: text(value.reference, 150) } });
      } else if (action === "RETURN") {
        if (original.kind !== "ADVANCE_ISSUE" || original.approvalStatus === "SETTLED" || original.employeeId !== access.actor.id) throw new MoneyError("Choose your own unsettled advance.");
        const amountCents = cents(value.amount), children = await advanceChildren(database, original);
        const alreadyReturned = children.filter(row => row.kind === "ADVANCE_RETURN" && row.approvalStatus !== "REJECTED").reduce((sum, row) => sum + row.amountCents, 0);
        if (amountCents + alreadyReturned > original.amountCents) throw new MoneyError("The return exceeds the funds issued. Review prior returns.");
        result = await database.moneyEntry.create({ data: { organizationId: access.organizationId, employeeId: original.employeeId, kind: "ADVANCE_RETURN", amountCents, businessDate: moneyToday(), merchant: "Returned funds", purpose: text(value.note, 1000) || "Unused funds returned; custodian confirmation pending.", category: "Other", paymentMethod: original.paymentMethod, accountId: original.accountId, parentId: original.id } });
      } else if (action === "SETTLE") {
        management(access);
        const children = await advanceChildren(database, original);
        if (original.kind !== "ADVANCE_ISSUE" || original.employeeId === access.actor.id || advanceBalance(original.amountCents, children) !== 0 || children.filter(row => row.approvalStatus !== "SUPERSEDED").some(row => row.approvalStatus !== "APPROVED" || receiptPending(row))) throw new MoneyError("A different manager can settle only after every purchase and return is approved and the balance is zero.");
        result = await database.moneyEntry.update({ where: { id: original.id }, data: { approvalStatus: "SETTLED", version: { increment: 1 } } });
      } else if (action === "REFUND" || action === "REIMBURSE") {
        const refund = action === "REFUND";
        if (!refund) management(access);
        if (original.kind !== "EXPENSE" || original.approvalStatus === "SUPERSEDED" || (!refund && (original.employeeId === access.actor.id || original.paymentMethod !== "PERSONAL" || original.approvalStatus !== "APPROVED"))) throw new MoneyError("Reimburse only another employee’s approved personal-funds expense; refunds must link to a purchase.");
        const amountCents = cents(value.amount), reference = text(value.reference, 150);
        if (!reference) throw new MoneyError("Record the actual refund or reimbursement payment reference.");
        const children = await database.moneyEntry.findMany({ where: { parentId: original.id, kind: { in: ["REFUND", "REIMBURSEMENT"] } } });
        if (amountCents + children.reduce((sum, row) => sum + row.amountCents, 0) > original.amountCents) throw new MoneyError("The recorded refunds and reimbursements would exceed the original purchase.");
        result = await database.moneyEntry.create({ data: { organizationId: access.organizationId, employeeId: original.employeeId, kind: refund ? "REFUND" : "REIMBURSEMENT", amountCents, businessDate: moneyToday(), merchant: original.merchant, purpose: reference, category: original.category, paymentMethod: original.paymentMethod, accountId: original.accountId, parentId: original.id, vehicleId: original.vehicleId, inventoryUnitId: original.inventoryUnitId, repairOrderId: original.repairOrderId, vendorId: original.vendorId, approvalStatus: refund ? "PENDING" : "APPROVED", reference } });
        if (!refund && amountCents + children.reduce((sum, child) => sum + child.amountCents, 0) === original.amountCents) await database.moneyEntry.update({ where: { id: original.id }, data: { approvalStatus: "SETTLED", version: { increment: 1 } } });
      } else throw new MoneyError("Choose a supported money action.");
    }
    if (result && typeof result === "object" && "id" in result && action !== "CORRECT") subjectId = String(result.id);
    const snapshot = json(result);
    await database.moneyAudit.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, action, subjectId, idempotencyKey: key, requestHash: hash, details: json({ ...value, csv: action === "IMPORT" ? "statement rows validated; raw file not retained" : undefined }), result: snapshot } });
    return snapshot;
  }, { timeout: 30000 });
}
