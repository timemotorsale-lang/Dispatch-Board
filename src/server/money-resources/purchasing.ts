import { Prisma } from "@prisma/client";
import { businessDate, cents, MONEY_CATEGORIES, moneyToday, MoneyError, text } from "@/lib/money-resources";
import { purchasingFlags } from "@/lib/money-purchasing";

type Access = { organizationId: string; actor: { id: string }; manager: boolean };
type Database = Prisma.TransactionClient;
export async function purchasingData(database: Database, access: Access) {
  const scope = { organizationId: access.organizationId, ...(!access.manager ? { employeeId: access.actor.id } : {}) };
  const authorizations = await database.moneyPurchasingAuthorization.findMany({ where: scope, include: { employee: { select: { name: true } }, vendor: { select: { name: true } }, account: { select: { label: true, lastFour: true, active: true } } }, orderBy: { createdAt: "desc" }, take: 1001 });
  const approvals = await database.moneyPurchaseApproval.findMany({ where: scope, include: { employee: { select: { name: true } }, entry: { select: { id: true } }, authorization: { select: { vendor: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 1001 });
  return { authorizations: authorizations.slice(0, 1000), purchaseApprovals: approvals.slice(0, 1000), purchasingLimited: authorizations.length > 1000 || approvals.length > 1000 };
}
export type PurchasingData = Awaited<ReturnType<typeof purchasingData>>;

export async function purchasingCommand(database: Database, access: Access, action: string, value: Record<string, unknown>) {
  const manager = () => { if (!access.manager) throw new MoneyError("An authorized manager must complete this action.", 403); };
  if (action === "AUTHORIZE_PURCHASING") {
    manager();
    const employeeId = text(value.employeeId), vendorId = text(value.vendorId), accountId = text(value.accountId);
    const now = new Date();
    if (!await database.user.findFirst({ where: { id: employeeId, isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId }, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] } } } })) throw new MoneyError("Choose authorized staff in this organization.");
    if (!await database.vendor.findFirst({ where: { id: vendorId, organizationId: access.organizationId, status: "ACTIVE" } })) throw new MoneyError("Choose an active vendor in this organization.");
    if (!await database.moneyAccount.findFirst({ where: { id: accountId, organizationId: access.organizationId, kind: "CARD", active: true } })) throw new MoneyError("Choose an active company card.");
    const startsOn = businessDate(value.startsOn), expiresOn = businessDate(value.expiresOn), purposeScope = text(value.purposeScope, 1000);
    const categories = Array.isArray(value.categories) ? [...new Set(value.categories.map(category => text(category)))] : [];
    if (startsOn > expiresOn || expiresOn < moneyToday() || !purposeScope || !categories.length || categories.some(category => !MONEY_CATEGORIES.includes(category as typeof MONEY_CATEGORIES[number]))) throw new MoneyError("Enter valid authorization dates, permitted purposes and categories.");
    if (await database.moneyPurchasingAuthorization.findFirst({ where: { organizationId: access.organizationId, employeeId, vendorId, accountId, revokedAt: null, startsOn: { lte: expiresOn }, expiresOn: { gte: startsOn } } })) throw new MoneyError("An overlapping authorization already exists. Revoke it before replacing its policy.", 409);
    return database.moneyPurchasingAuthorization.create({ data: { organizationId: access.organizationId, employeeId, vendorId, accountId, startsOn, expiresOn, purposeScope, categories, perPurchaseLimitCents: cents(value.limit), requiresPriorApproval: value.requiresPriorApproval === true || value.requiresPriorApproval === "on", createdByUserId: access.actor.id } });
  }
  if (action === "REVOKE_PURCHASING") {
    manager();
    const policy = await database.moneyPurchasingAuthorization.findFirst({ where: { id: text(value.id), organizationId: access.organizationId } });
    if (!policy || policy.revokedAt || policy.version !== value.version) throw new MoneyError("Authorization changed. Refresh before revoking it.", 409);
    const note = text(value.note, 1000); if (!note) throw new MoneyError("Briefly explain the revocation.");
    return database.moneyPurchasingAuthorization.update({ where: { id: policy.id }, data: { revokedAt: new Date(), revocationReason: note, version: { increment: 1 } } });
  }
  if (action === "REQUEST_PURCHASE_APPROVAL") {
    const policy = await purchasingPolicy(database, access, value.authorizationId);
    const date = businessDate(value.businessDate), amountCents = cents(value.amount), purpose = text(value.purpose, 1000), category = text(value.category);
    if (policy.revokedAt || date < moneyToday() || date < policy.startsOn || date > policy.expiresOn || !policy.account.active || !policy.categories.includes(category) || !purpose) throw new MoneyError("Request approval before the purchase, within an active authorization and permitted category.");
    return database.moneyPurchaseApproval.create({ data: { organizationId: access.organizationId, authorizationId: policy.id, employeeId: policy.employeeId, amountCents, purpose, category, businessDate: date, createdByUserId: access.actor.id } });
  }
  if (action === "REVIEW_PURCHASE_APPROVAL") {
    manager();
    const request = await database.moneyPurchaseApproval.findFirst({ where: { id: text(value.id), organizationId: access.organizationId }, include: { authorization: { include: { account: true } } } });
    if (!request || request.status !== "PENDING" || request.version !== value.version) throw new MoneyError("Only a current pending purchase request can be reviewed.", 409);
    if ([request.employeeId, request.createdByUserId].includes(access.actor.id)) throw new MoneyError("A different manager must review this purchase request.", 403);
    const decision = text(value.decision), reviewNote = text(value.note, 1000);
    if (!["APPROVED", "REJECTED"].includes(decision) || !reviewNote) throw new MoneyError("Record the decision and a brief reason.");
    if (decision === "APPROVED" && (request.businessDate < moneyToday() || request.authorization.revokedAt || !request.authorization.account.active)) throw new MoneyError("This purchase request has expired or its authorization is no longer active.");
    return database.moneyPurchaseApproval.update({ where: { id: request.id }, data: { status: decision, reviewNote, reviewedByUserId: access.actor.id, reviewedAt: new Date(), version: { increment: 1 } } });
  }
  return undefined;
}

export async function purchasingPolicy(database: Database, access: Access, id: unknown) {
  const policy = await database.moneyPurchasingAuthorization.findFirst({ where: { id: text(id), organizationId: access.organizationId, ...(!access.manager ? { employeeId: access.actor.id } : {}) }, include: { account: true, vendor: { select: { name: true } } } });
  if (!policy) throw new MoneyError("This purchasing authorization is not available.", 403);
  return policy;
}

export async function purchaseSnapshot(database: Database, access: Access, value: Record<string, unknown>, purchase: { employeeId: string; vendorId: string | null; accountId: string | null; amountCents: number; category: string; purpose: string; businessDate: string }) {
  if (!value.authorizationId) {
    if (value.purchaseApprovalId) throw new MoneyError("Select the purchasing authorization for this prior approval.");
    return { purchasingAuthorizationId: null, purchaseApprovalId: null, purchasingSnapshot: { flags: ["No vendor purchasing authorization selected"] } as Prisma.InputJsonValue };
  }
  const policy = await purchasingPolicy(database, access, value.authorizationId);
  if (policy.employeeId !== purchase.employeeId || policy.vendorId !== purchase.vendorId || policy.accountId !== purchase.accountId) throw new MoneyError("The employee, vendor and card must match the purchasing authorization.");
  let purchaseApprovalId: string | null = null;
  if (value.purchaseApprovalId) {
    const approval = await database.moneyPurchaseApproval.findFirst({ where: { id: text(value.purchaseApprovalId), organizationId: access.organizationId, authorizationId: policy.id, status: "APPROVED", employeeId: purchase.employeeId, amountCents: purchase.amountCents, purpose: purchase.purpose, category: purchase.category, businessDate: purchase.businessDate, entry: null } });
    if (!approval || !approval.reviewedAt || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(approval.reviewedAt) > purchase.businessDate) throw new MoneyError("Choose an unused prior approval for the exact purchase date, purpose, category and amount.");
    purchaseApprovalId = approval.id;
  }
  return { purchasingAuthorizationId: policy.id, purchaseApprovalId, purchasingSnapshot: { policyId: policy.id, purposeScope: policy.purposeScope, perPurchaseLimitCents: policy.perPurchaseLimitCents, categories: policy.categories, requiresPriorApproval: policy.requiresPriorApproval, startsOn: policy.startsOn, expiresOn: policy.expiresOn, flags: [...purchasingFlags(policy, purchase, !!purchaseApprovalId), ...(!policy.account.active ? ["Company card is inactive — investigate actual purchase"] : [])] } as Prisma.InputJsonValue };
}
