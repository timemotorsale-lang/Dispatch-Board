/**
 * Starter disable/enable (spec section 10), repossession with TLC Recovery and repo letters
 * (section 11). Every step here is a person's decision. Nothing in the automations calls these:
 * the board tasks only remind someone to decide.
 *
 * Bankruptcy freeze blocks disabling, every repo step except cancel, and letters.
 * Re-enabling a starter is always allowed.
 */
import type { Prisma, RepossessionCaseStatus, StarterWarningMethod } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError, type CollectionsPermission } from "../config/permissions";
import { chicagoToday, formatCents, parseBusinessDate, parseMoneyToCents } from "../domain/money-dates";
import { collectionsAccess, recordAccountEvent, type CollectionsAccess } from "./access";
import { findAccount, text } from "./account-service";
import { recalculateAccounts } from "./account-state";
import { storeRestrictedDocument } from "./documents";
import { gpsClientFor } from "./gps-client";
import { buildLetterPdf, LETTER_TITLES, type LetterKey } from "./letter-pdf";
import { sendManualTemplateMessage } from "./messaging-service";
import { loadCollectionsSettings } from "./settings-store";

type Db = Prisma.TransactionClient;

export const STARTER_ACTIONS = ["REQUEST_STARTER", "APPROVE_STARTER", "STARTER_DONE_IN_PORTAL", "CANCEL_STARTER", "SEND_DISABLE_WARNING"] as const;
export const REPO_ACTIONS = ["START_REPO_REVIEW", "APPROVE_REPO", "ASSIGN_REPO_TLC", "UPDATE_REPO", "REPO_OUTCOME", "CANCEL_REPO"] as const;
export const LETTER_ACTIONS = ["GENERATE_LETTER", "RECORD_LETTER_SENT"] as const;
export const RECOVERY_ACTIONS = [...STARTER_ACTIONS, ...REPO_ACTIONS, ...LETTER_ACTIONS] as const;

const REQUEST_ACTIONS = new Set(["REQUEST_STARTER", "START_REPO_REVIEW", "CANCEL_STARTER"]);
const WARNING_METHODS: StarterWarningMethod[] = ["TEXT", "CALL", "DEVICE_BEEP", "NONE"];
const OPEN_REPO: RepossessionCaseStatus[] = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"];
const REPO_ORDER: RepossessionCaseStatus[] = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"];
export const TLC_VENDOR_NAME = "TLC Recovery";

function reason(value: unknown, min = 5) {
  const r = text(value, 1000);
  if (r.length < min) throw new CollectionsError(min > 5 ? `Explain the reason (at least ${min} characters).` : "Give a short reason.");
  return r;
}

async function isFrozen(db: Db, accountId: string) {
  return Boolean(await db.collectionFlag.findFirst({ where: { accountId, type: "BANKRUPTCY", clearedAt: null }, select: { id: true } }));
}
async function assertNotFrozen(db: Db, accountId: string, what: string) {
  if (await isFrozen(db, accountId)) throw new CollectionsError(`Bankruptcy freeze: no ${what}. Review with your bankruptcy attorney.`, 409);
}

export async function recoveryAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 40);
  const permission: CollectionsPermission = REQUEST_ACTIONS.has(action) ? "REQUEST_DISABLE_OR_REPO" : "APPROVE_DISABLE_OR_REPO";
  const access = await collectionsAccess(actor, permission);
  const settings = await loadCollectionsSettings(access.organizationId);
  // Letters are built (and stored) before the transaction so file storage never holds a database lock.
  if (action === "GENERATE_LETTER") return generateLetter(access, accountId, input, settings);
  return prisma.$transaction(async tx => {
    const account = await findAccount(tx, access, accountId);
    const event = (type: string, before: unknown, after: unknown, why = "") => recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type, userId: access.actor.id, before, after, reason: why });
    const done = async (message: string, extra: Record<string, unknown> = {}) => {
      await recalculateAccounts(tx, access.organizationId, settings, [accountId]);
      return { ok: true as const, message, ...extra };
    };
    const starterAction = async () => {
      const found = await tx.starterDisableAction.findFirst({ where: { id: text(input.actionId, 100), accountId, organizationId: access.organizationId } });
      if (!found) throw new CollectionsError("That request isn't on this account.", 404);
      return found;
    };
    const repoCase = async () => {
      const found = await tx.repossessionCase.findFirst({ where: { id: text(input.caseId, 100), accountId, organizationId: access.organizationId } });
      if (!found) throw new CollectionsError("That repo case isn't on this account.", 404);
      return found;
    };

    switch (action) {
      // ---------------- Starter disable / enable ----------------
      case "REQUEST_STARTER": {
        const kind = input.kind === "ENABLE" ? "ENABLE" : "DISABLE";
        const open = await tx.starterDisableAction.findFirst({ where: { accountId, status: { in: ["REQUESTED", "APPROVED"] } }, select: { id: true } });
        if (open) throw new CollectionsError("There's already an open starter request on this account. Finish or cancel it first.", 409);
        const latestDone = await tx.starterDisableAction.findFirst({ where: { accountId, status: "DONE_IN_PORTAL" }, orderBy: [{ performedInPortalAt: "desc" }, { updatedAt: "desc" }], select: { action: true } });
        const disabled = latestDone?.action === "DISABLE";
        if (kind === "DISABLE" && disabled) throw new CollectionsError("The starter is already disabled.", 409);
        if (kind === "ENABLE" && !disabled) throw new CollectionsError("The starter isn't disabled.", 409);
        const warnings: string[] = [];
        let warningMethod: StarterWarningMethod | null = null, warningSentAt: Date | null = null;
        let why = text(input.reason, 1000);
        if (kind === "DISABLE") {
          await assertNotFrozen(tx, accountId, "starter disables");
          warningMethod = (WARNING_METHODS as string[]).includes(String(input.warningMethod)) ? (input.warningMethod as StarterWarningMethod) : null;
          if (!warningMethod) throw new CollectionsError("Choose how the customer was (or will be) warned.");
          if (warningMethod === "NONE") {
            why = reason(input.reason, 10);
            warnings.push("No warning: check Minnesota notice requirements with your attorney.");
          } else {
            const date = parseBusinessDate(input.warningDate);
            if (!date) throw new CollectionsError("Enter the date of the warning.");
            warningSentAt = new Date(`${date}T12:00:00Z`);
            if (!why) why = `Past due ${account.daysPastDue} days`;
          }
          if (account.gpsDisclosedInContract !== true) warnings.push("The contract isn't marked as disclosing the GPS starter interrupt. Check the contract before disabling.");
          if (account.daysPastDue < settings.thresholds.disableReview) warnings.push(`The account is ${account.daysPastDue} days past due, below the ${settings.thresholds.disableReview}-day review point.`);
        } else if (!why) why = "Payment or arrangement made";
        const created = await tx.starterDisableAction.create({ data: { organizationId: access.organizationId, accountId, action: kind, requestedByUserId: access.actor.id, reason: why, warningMethod, warningSentAt, deviceSerial: account.gpsDeviceSerial, notes: text(input.notes, 1000) } });
        await event(kind === "DISABLE" ? "DISABLE_REQUESTED" : "ENABLE_REQUESTED", null, { actionId: created.id, warningMethod }, why);
        return done(`${kind === "DISABLE" ? "Disable" : "Enable"} requested. An admin approves it next.`, { warnings });
      }
      case "APPROVE_STARTER": {
        const a = await starterAction();
        if (a.status !== "REQUESTED") throw new CollectionsError("Only a new request can be approved.", 409);
        if (a.action === "DISABLE") await assertNotFrozen(tx, accountId, "starter disables");
        await tx.starterDisableAction.update({ where: { id: a.id }, data: { status: "APPROVED", approvedByUserId: access.actor.id, approvedAt: new Date() } });
        await event("STARTER_APPROVED", { status: a.status }, { status: "APPROVED", action: a.action });
        const gps = await gpsClientFor(settings.dealership.advantageGpsPortalUrl)[a.action === "DISABLE" ? "disable" : "enable"](a.deviceSerial ?? account.gpsDeviceSerial);
        return done(`Approved. ${gps.instructions}`, { portalUrl: gps.portalUrl });
      }
      case "STARTER_DONE_IN_PORTAL": {
        const a = await starterAction();
        if (a.status !== "APPROVED") throw new CollectionsError("Approve the request first.", 409);
        if (a.action === "DISABLE") await assertNotFrozen(tx, accountId, "starter disables");
        if (input.confirmed !== true && input.confirmed !== "true") throw new CollectionsError(`Confirm you ${a.action === "DISABLE" ? "disabled" : "enabled"} the starter in the Advantage portal.`);
        const serial = text(input.deviceSerial, 100) || a.deviceSerial || account.gpsDeviceSerial;
        await tx.starterDisableAction.update({ where: { id: a.id }, data: { status: "DONE_IN_PORTAL", performedInPortalAt: new Date(), performedByUserId: access.actor.id, deviceSerial: serial, notes: [a.notes, text(input.notes, 1000)].filter(Boolean).join("\n") } });
        await event(a.action === "DISABLE" ? "STARTER_DISABLED" : "STARTER_ENABLED", null, { actionId: a.id, deviceSerial: serial });
        return done(a.action === "DISABLE" ? "Recorded: starter disabled." : "Recorded: starter enabled.");
      }
      case "CANCEL_STARTER": {
        const a = await starterAction();
        if (!["REQUESTED", "APPROVED"].includes(a.status)) throw new CollectionsError("This request is already finished.", 409);
        const why = reason(input.reason);
        await tx.starterDisableAction.update({ where: { id: a.id }, data: { status: "CANCELLED", notes: [a.notes, `Cancelled: ${why}`].filter(Boolean).join("\n") } });
        await event("STARTER_CANCELLED", { status: a.status }, { status: "CANCELLED" }, why);
        return done("Request cancelled.");
      }
      case "SEND_DISABLE_WARNING": {
        const a = await starterAction();
        if (a.action !== "DISABLE" || !["REQUESTED", "APPROVED"].includes(a.status)) throw new CollectionsError("Warnings go with an open disable request.", 409);
        await assertNotFrozen(tx, accountId, "starter disables or messages");
        const { message, warnings } = await sendManualTemplateMessage(tx, accountId, access.actor.id, settings, { channel: "SMS", templateKey: "DISABLE_WARNING", body: text(input.body, 2000) || null });
        const reallySent = message.status === "SENT" || message.status === "DELIVERED";
        await tx.starterDisableAction.update({ where: { id: a.id }, data: { warningMessageId: message.id, warningMethod: "TEXT", ...(reallySent ? { warningSentAt: new Date() } : {}) } });
        await event("DISABLE_WARNING_SENT", null, { actionId: a.id, messageId: message.id, status: message.status });
        const words = message.status === "BLOCKED" ? `Not sent: ${message.blockedReason}` : message.status === "DRY_RUN" ? "Saved as a dry run (test mode). Nothing was actually sent, so don't count it as the warning." : message.status === "FAILED" ? `Sending failed: ${message.errorMessage}` : "Warning text sent.";
        return { ok: true as const, message: words, warnings };
      }

      // ---------------- Repossession ----------------
      case "START_REPO_REVIEW": {
        await assertNotFrozen(tx, accountId, "repossession steps");
        if (await tx.repossessionCase.findFirst({ where: { accountId, status: { in: OPEN_REPO } }, select: { id: true } })) throw new CollectionsError("There's already an open repo case.", 409);
        const why = reason(input.reason);
        const created = await tx.repossessionCase.create({ data: { organizationId: access.organizationId, accountId, openedByUserId: access.actor.id, status: "REVIEW", outcomeNotes: null } });
        await event("REPO_REVIEW_STARTED", null, { caseId: created.id }, why);
        return done("Repo review started. An admin approves it next.");
      }
      case "APPROVE_REPO":
      case "ASSIGN_REPO_TLC": {
        await assertNotFrozen(tx, accountId, "repossession steps");
        const c = await repoCase();
        const assign = action === "ASSIGN_REPO_TLC";
        if (assign ? !["REVIEW", "APPROVED"].includes(c.status) : c.status !== "REVIEW") throw new CollectionsError(assign ? "Only a case in review or approved can be assigned." : "Only a case in review can be approved.", 409);
        const now = new Date();
        const data: Prisma.RepossessionCaseUpdateInput = { status: assign ? "ASSIGNED" : "APPROVED", version: { increment: 1 } };
        if (c.status === "REVIEW") { data.approvedByUserId = access.actor.id; data.approvedAt = now; }
        if (assign) { data.assignedAt = now; data.vendor = { connect: { id: await tlcVendorId(tx, access) } }; }
        await tx.repossessionCase.update({ where: { id: c.id }, data });
        await event("REPO_STATUS", { status: c.status }, { status: data.status, caseId: c.id });
        return done(assign ? `Assigned to ${TLC_VENDOR_NAME}. A board task tracks it.` : "Repo approved.");
      }
      case "UPDATE_REPO": {
        const c = await repoCase();
        const next = String(input.status) as RepossessionCaseStatus;
        if (!["LOCATED", "RECOVERED", "IN_STORAGE"].includes(next)) throw new CollectionsError("Choose Located, Recovered or In storage.");
        if (REPO_ORDER.indexOf(next) <= REPO_ORDER.indexOf(c.status) || REPO_ORDER.indexOf(c.status) < REPO_ORDER.indexOf("ASSIGNED")) throw new CollectionsError(`A case that is ${c.status.toLowerCase().replaceAll("_", " ")} can't move to ${next.toLowerCase().replaceAll("_", " ")}.`, 409);
        const fee = (v: unknown, label: string) => { if (v === undefined || v === "") return undefined; const cents = parseMoneyToCents(v); if (cents === null || cents === undefined || cents < 0) throw new CollectionsError(`Enter a valid ${label}.`); return cents; };
        const now = new Date();
        const notes = text(input.notes, 1000);
        await tx.repossessionCase.update({ where: { id: c.id }, data: {
          status: next, version: { increment: 1 },
          ...(next === "LOCATED" ? { locatedAt: now } : {}), ...(next === "RECOVERED" ? { recoveredAt: now } : {}),
          storageLocation: text(input.storageLocation, 300) || c.storageLocation, storageFeeCents: fee(input.storageFee, "storage fee") ?? c.storageFeeCents,
          repoFeeCents: fee(input.repoFee, "repo fee") ?? c.repoFeeCents, personalPropertyNotes: text(input.personalPropertyNotes, 2000) || c.personalPropertyNotes
        } });
        await event("REPO_STATUS", { status: c.status }, { status: next, caseId: c.id }, notes);
        if (c.taskId) await tx.taskComment.create({ data: { taskId: c.taskId, authorUserId: access.actor.id, body: `Repo status: ${next.toLowerCase().replaceAll("_", " ")}${notes ? `. ${notes}` : ""}` } });
        return done("Repo status updated.");
      }
      case "REPO_OUTCOME": {
        const c = await repoCase();
        const outcome = String(input.outcome) as RepossessionCaseStatus;
        if (!["REDEEMED", "RETURNED_TO_INVENTORY", "SENT_TO_AUCTION"].includes(outcome)) throw new CollectionsError("Choose Redeemed, Returned to inventory or Sent to auction.");
        if (!["RECOVERED", "IN_STORAGE"].includes(c.status)) throw new CollectionsError("Record the outcome after the vehicle is recovered. (If the customer paid before recovery, cancel the case instead.)", 409);
        const notes = text(input.notes, 2000);
        let inventoryTaskId: string | null = null;
        const warnings: string[] = [];
        if (outcome === "RETURNED_TO_INVENTORY") {
          if (!account.vehicleId) warnings.push("This account isn't linked to a dispatch board vehicle yet. Link it so the inventory task points to the right car.");
          const date = new Date(`${chicagoToday()}T00:00:00.000Z`);
          const boardDay = await tx.boardDay.upsert({ where: { date }, update: {}, create: { date }, select: { id: true } });
          const task = await tx.task.create({ data: {
            boardDayId: boardDay.id, title: `Repo returned to inventory: check in and recon${account.stockNumberRaw ? ` (stock ${account.stockNumberRaw})` : ""}`,
            description: `Recovered by ${TLC_VENDOR_NAME}. ${c.storageLocation ? `Storage: ${c.storageLocation}. ` : ""}${c.personalPropertyNotes ? `Personal property: ${c.personalPropertyNotes}. ` : ""}Collections account: /collections/accounts/${accountId}`,
            assignedUserId: access.actor.id, createdByUserId: access.actor.id, priority: "HIGH", dueAt: new Date(Date.now() + 2 * 86_400_000),
            sourceType: "COLLECTIONS", workflowArea: "INVENTORY", vehicleId: account.vehicleId, vehicleReference: account.stockNumberRaw ?? account.vehicleDescriptionRaw,
            templateSnapshot: { source: "COLLECTIONS", reason: "REPO_RETURNED_TO_INVENTORY", accountId, repoCaseId: c.id }
          }, select: { id: true } });
          inventoryTaskId = task.id;
        }
        await tx.repossessionCase.update({ where: { id: c.id }, data: { status: outcome, outcomeAt: new Date(), outcomeNotes: notes || null, inventoryTaskId, version: { increment: 1 } } });
        await event("REPO_OUTCOME", { status: c.status }, { status: outcome, caseId: c.id, inventoryTaskId }, notes);
        const message = outcome === "REDEEMED" ? "Recorded as redeemed. The account goes back to its DealerCenter status; a re-enable task is created if the starter is disabled."
          : outcome === "RETURNED_TO_INVENTORY" ? "Recorded. An inventory check-in task was added to the board." : "Recorded as sent to auction.";
        return done(message, { warnings });
      }
      case "CANCEL_REPO": {
        const c = await repoCase();
        if (!OPEN_REPO.includes(c.status)) throw new CollectionsError("This case is already finished.", 409);
        const why = reason(input.reason);
        await tx.repossessionCase.update({ where: { id: c.id }, data: { status: "CANCELLED", outcomeAt: new Date(), outcomeNotes: why, version: { increment: 1 } } });
        await event("REPO_STATUS", { status: c.status }, { status: "CANCELLED", caseId: c.id }, why);
        return done("Repo case cancelled.");
      }

      // ---------------- Letters ----------------
      case "RECORD_LETTER_SENT": {
        const letter = await tx.collectionLetter.findFirst({ where: { id: text(input.letterId, 100), accountId, organizationId: access.organizationId } });
        if (!letter) throw new CollectionsError("That letter isn't on this account.", 404);
        if (letter.isDraftWording) throw new CollectionsError("This letter has DRAFT placeholder wording. Add attorney-approved wording in Settings, generate it again, then record it as sent.", 409);
        if (letter.sentAt) throw new CollectionsError("This letter is already recorded as sent.", 409);
        const method = ["FIRST_CLASS", "CERTIFIED", "HAND_DELIVERED", "EMAIL"].includes(String(input.sentMethod)) ? (input.sentMethod as "FIRST_CLASS" | "CERTIFIED" | "HAND_DELIVERED" | "EMAIL") : null;
        if (!method) throw new CollectionsError("Choose how it was sent.");
        const tracking = text(input.trackingNumber, 60);
        if (method === "CERTIFIED" && tracking.length < 8) throw new CollectionsError("Enter the certified mail tracking number.");
        const date = parseBusinessDate(input.sentDate) ?? chicagoToday();
        await tx.collectionLetter.update({ where: { id: letter.id }, data: { sentMethod: method, certifiedTrackingNumber: tracking || null, sentAt: new Date(`${date}T12:00:00Z`) } });
        await event("LETTER_SENT", null, { letterId: letter.id, templateKey: letter.templateKey, method, tracking: tracking || null });
        return { ok: true as const, message: "Recorded as sent." };
      }
      default:
        throw new CollectionsError("Unknown action.");
    }
  }, { timeout: 30_000 });
}

/** Find the TLC Recovery vendor (by category or name), creating it with the Vendors numbering if missing. */
async function tlcVendorId(db: Db, access: CollectionsAccess) {
  const existing = await db.vendor.findFirst({ where: { organizationId: access.organizationId, archivedAt: null, OR: [{ normalizedName: TLC_VENDOR_NAME.toLowerCase() }, { category: "COLLECTIONS_REPOSSESSION" }] }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existing) return existing.id;
  const count = await db.vendor.count({ where: { organizationId: access.organizationId } });
  const vendor = await db.vendor.create({ data: {
    organizationId: access.organizationId, vendorNumber: `V-${String(count + 1).padStart(5, "0")}`, name: TLC_VENDOR_NAME, normalizedName: TLC_VENDOR_NAME.toLowerCase(),
    category: "COLLECTIONS_REPOSSESSION", notes: "Created by Collections when the first repo was assigned. Add contact details in Vendors.", createdByUserId: access.actor.id, updatedByUserId: access.actor.id
  }, select: { id: true } });
  return vendor.id;
}

async function generateLetter(access: CollectionsAccess, accountId: string, input: Record<string, unknown>, settings: Awaited<ReturnType<typeof loadCollectionsSettings>>) {
  const key = input.templateKey === "POST_REPO_NOTICE" ? "POST_REPO_NOTICE" : input.templateKey === "PRE_REPO_NOTICE" ? "PRE_REPO_NOTICE" : null;
  if (!key) throw new CollectionsError("Choose which notice to generate.");
  const account = await findAccount(prisma, access, accountId);
  if (await isFrozen(prisma, accountId)) throw new CollectionsError("Bankruptcy freeze: no letters. Review with your bankruptcy attorney.", 409);
  const caseId = text(input.repoCaseId, 100) || null;
  if (caseId && !(await prisma.repossessionCase.findFirst({ where: { id: caseId, accountId }, select: { id: true } }))) throw new CollectionsError("That repo case isn't on this account.", 404);
  const customer = account.customerId ? await prisma.customer.findUnique({ where: { id: account.customerId }, select: { displayName: true } }) : null;
  const d = settings.dealership;
  const { bytes, isDraftWording } = await buildLetterPdf(key as LetterKey, {
    dealershipName: d.name, dealershipPhone: d.phone, dealershipAddress: d.address, customerName: customer?.displayName ?? account.buyerNameRaw, mailingAddress: account.mailingAddress,
    dealNumber: account.dealNumber, accountNumber: account.externalAccountId, vehicle: account.vehicleDescriptionRaw, vin: account.vin,
    date: new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Chicago" }).format(new Date()), amountDue: formatCents(account.amountDueCents)
  }, settings.letterWording[key as LetterKey] || null);
  const stored = await storeRestrictedDocument({
    organizationId: access.organizationId, actorId: access.actor.id, ownerType: "COLLECTION_ACCOUNT", ownerId: account.id, ownerLabel: `Collections · ${account.buyerNameRaw}`,
    documentType: `COLLECTIONS_${key}`, fileName: `${key.toLowerCase().replaceAll("_", "-")}-${account.externalAccountId}-${chicagoToday()}.pdf`, contentType: "application/pdf", bytes
  });
  const letter = await prisma.collectionLetter.create({ data: { organizationId: access.organizationId, accountId, repoCaseId: caseId, templateKey: key, generatedDocumentId: stored.documentId, isDraftWording, generatedByUserId: access.actor.id } });
  await recordAccountEvent(prisma, { organizationId: access.organizationId, accountId, type: "LETTER_GENERATED", userId: access.actor.id, after: { letterId: letter.id, templateKey: key, isDraftWording } });
  return { ok: true as const, message: isDraftWording ? `${LETTER_TITLES[key as LetterKey]} generated with DRAFT placeholder wording. Don't mail it until approved wording is added.` : `${LETTER_TITLES[key as LetterKey]} generated. Print it, mail it, then record how it was sent.`, letterId: letter.id, documentId: stored.documentId };
}
