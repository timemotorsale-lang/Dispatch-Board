/**
 * Insurance (spec section 9). Records are append-only: every change saves a new version,
 * and the newest one is the current insurance.
 *
 * - ADD_INSURANCE: enter carrier / policy / dates / lienholder, with an optional proof file.
 * - MARK_INSURANCE_MISSING: the customer has no current insurance.
 * - VERIFY_INSURANCE (admin): marks the proof VERIFIED after confirming the lienholder is listed.
 * - SAVE_TEXTED_PHOTO: saves a photo the customer texted in as a private account document,
 *   so it can be used as proof. Only possible once real texting is turned on.
 */
import type { CollectionInsuranceSource, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { resolveSendingMode } from "../config/flags";
import { CollectionsError } from "../config/permissions";
import { chicagoToday, dateOnly, parseBusinessDate, toYmd } from "../domain/money-dates";
import { collectionsAccess, recordAccountEvent } from "./access";
import { findAccount, text } from "./account-service";
import { recalculateAccounts } from "./account-state";
import { assertAccountDocument, COLLECTIONS_UPLOAD_TYPES, storeRestrictedDocument } from "./documents";
import { loadCollectionsSettings } from "./settings-store";


export const INSURANCE_ACTIONS = ["ADD_INSURANCE", "MARK_INSURANCE_MISSING", "VERIFY_INSURANCE", "SAVE_TEXTED_PHOTO"] as const;
const SOURCES: CollectionInsuranceSource[] = ["CARD_PHOTO", "INSURER_DOCUMENT", "PHONE"];

function optionalDate(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return null;
  const ymd = parseBusinessDate(value);
  if (!ymd) throw new CollectionsError(`Choose a valid ${label}.`);
  return ymd;
}

function lienValue(value: unknown) {
  if (value === true || value === "true" || value === "YES" || value === "on") return true;
  if (value === false || value === "false" || value === "NO") return false;
  return null;
}

export async function insuranceAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 40);
  if (action === "SAVE_TEXTED_PHOTO") return saveTextedPhoto(actor, accountId, input);
  const access = await collectionsAccess(actor, action === "VERIFY_INSURANCE" ? "CLEAR_FLAG" : "LOG_ACTIVITY");
  const settings = await loadCollectionsSettings(access.organizationId);
  const today = chicagoToday();
  return prisma.$transaction(async tx => {
    await findAccount(tx, access, accountId);
    const event = (type: string, after: unknown, reason = "") => recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type, userId: access.actor.id, after, reason });
    switch (action) {
      case "ADD_INSURANCE": {
        const effectiveDate = optionalDate(input.effectiveDate, "start date");
        const expirationDate = optionalDate(input.expirationDate, "expiration date");
        if (!expirationDate) throw new CollectionsError("Enter the expiration date from the card or policy.");
        if (effectiveDate && expirationDate <= effectiveDate) throw new CollectionsError("The expiration date must be after the start date.");
        const proofDocumentId = text(input.proofDocumentId, 100) || null;
        if (proofDocumentId) await assertAccountDocument(access.organizationId, accountId, proofDocumentId);
        const source = (SOURCES as string[]).includes(String(input.source)) ? (input.source as CollectionInsuranceSource) : proofDocumentId ? "CARD_PHOTO" : "PHONE";
        const record = await tx.insuranceRecord.create({
          data: {
            organizationId: access.organizationId, accountId, carrier: text(input.carrier, 120) || null, policyNumber: text(input.policyNumber, 60) || null,
            effectiveDate: effectiveDate ? dateOnly(effectiveDate) : null, expirationDate: dateOnly(expirationDate), lienholderListed: lienValue(input.lienholderListed),
            proofDocumentId, source, status: expirationDate < today ? "EXPIRED" : "UNKNOWN", notes: text(input.notes, 1000), enteredByUserId: access.actor.id
          }
        });
        await event("INSURANCE_ADDED", { recordId: record.id, carrier: record.carrier, expirationDate, hasProof: Boolean(proofDocumentId) });
        return { ok: true as const, message: expirationDate < today ? "Saved. This policy has already expired." : "Saved. An admin can now verify it." };
      }
      case "MARK_INSURANCE_MISSING": {
        const notes = text(input.notes, 1000);
        if (notes.length < 5) throw new CollectionsError("Say what happened (for example: customer says the policy lapsed).");
        const record = await tx.insuranceRecord.create({ data: { organizationId: access.organizationId, accountId, source: "PHONE", status: "MISSING", notes, enteredByUserId: access.actor.id } });
        await event("INSURANCE_MISSING", { recordId: record.id }, notes);
        return { ok: true as const, message: "Marked as missing. A \"Get proof of insurance\" task will be created." };
      }
      case "VERIFY_INSURANCE": {
        const current = await tx.insuranceRecord.findFirst({ where: { accountId, organizationId: access.organizationId }, orderBy: { createdAt: "desc" } });
        if (!current || current.id !== text(input.recordId, 100)) throw new CollectionsError("Verify the newest insurance record (it may have changed; refresh the page).", 409);
        if (current.status === "MISSING" || !current.expirationDate) throw new CollectionsError("There's no policy to verify yet.");
        if (toYmd(current.expirationDate)! < today) throw new CollectionsError("This policy has expired, so it can't be verified.");
        if (!current.proofDocumentId) throw new CollectionsError("Upload the proof (card photo or insurer document) before verifying.");
        if (lienValue(input.lienholderConfirmed) !== true) throw new CollectionsError("Confirm that the dealership is listed as lienholder / loss payee.");
        const now = new Date();
        const verified = await tx.insuranceRecord.create({
          data: {
            organizationId: access.organizationId, accountId, carrier: current.carrier, policyNumber: current.policyNumber, effectiveDate: current.effectiveDate,
            expirationDate: current.expirationDate, lienholderListed: true, proofDocumentId: current.proofDocumentId, source: current.source,
            status: "VERIFIED", verifiedByUserId: access.actor.id, verifiedAt: now, notes: current.notes, enteredByUserId: access.actor.id
          }
        });
        await event("INSURANCE_VERIFIED", { recordId: verified.id, previousRecordId: current.id });
        await recalculateAccounts(tx, access.organizationId, settings, [accountId]);
        return { ok: true as const, message: "Insurance verified." };
      }
      default:
        throw new CollectionsError("Unknown insurance action.");
    }
  });
}

/** Twilio media links must point at Twilio's API (never an arbitrary address). */
export function isTwilioMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.twilio.com" && url.pathname.startsWith("/2010-04-01/Accounts/");
  } catch { return false; }
}

type MediaEntry = { url: string; contentType?: string; savedDocumentId: string | null };

async function saveTextedPhoto(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>, fetcher: typeof fetch = fetch) {
  const access = await collectionsAccess(actor, "LOG_ACTIVITY");
  const account = await findAccount(prisma, access, accountId);
  const message = await prisma.inboundMessage.findFirst({ where: { id: text(input.inboundMessageId, 100), organizationId: access.organizationId, accountId } });
  if (!message) throw new CollectionsError("That text isn't on this account.", 404);
  const media = (Array.isArray(message.mediaDocumentIds) ? message.mediaDocumentIds : []) as MediaEntry[];
  const index = Number(input.mediaIndex ?? 0);
  const entry = media[index];
  if (!entry) throw new CollectionsError("That photo isn't on this message.", 404);
  if (entry.savedDocumentId) return { ok: true as const, message: "Already saved.", documentId: entry.savedDocumentId };
  if (resolveSendingMode("SMS") !== "LIVE") throw new CollectionsError("Texted photos can be saved once real texting is turned on.", 409);
  if (!isTwilioMediaUrl(entry.url)) throw new CollectionsError("That photo link isn't from Twilio, so it won't be downloaded.", 400);
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim(), token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) throw new CollectionsError("Twilio isn't set up on this server.", 503);
  const response = await fetcher(entry.url, { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` } });
  if (!response.ok) throw new CollectionsError("Couldn't download the photo from Twilio. Try again later.", 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = (response.headers.get("content-type") ?? entry.contentType ?? "").split(";")[0].trim();
  const checker = COLLECTIONS_UPLOAD_TYPES[contentType];
  if (!checker || bytes.length > 10 * 1024 * 1024 || !checker(bytes)) throw new CollectionsError("That attachment isn't a JPEG, PNG or PDF up to 10 MB.");
  const stored = await storeRestrictedDocument({
    organizationId: access.organizationId, actorId: access.actor.id, ownerType: "COLLECTION_ACCOUNT", ownerId: account.id, ownerLabel: `Collections · ${account.buyerNameRaw}`,
    documentType: "COLLECTIONS_INSURANCE_PROOF", fileName: `texted-photo-${message.receivedAt.toISOString().slice(0, 10)}.${contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : "jpg"}`, contentType, bytes
  });
  media[index] = { ...entry, savedDocumentId: stored.documentId };
  await prisma.inboundMessage.update({ where: { id: message.id }, data: { mediaDocumentIds: media as unknown as Prisma.InputJsonValue } });
  await recordAccountEvent(prisma, { organizationId: access.organizationId, accountId, type: "DOCUMENT_UPLOADED", userId: access.actor.id, after: { documentId: stored.documentId, from: "TEXTED_PHOTO" } });
  return { ok: true as const, message: "Photo saved to the account. Fill in the insurance details below.", documentId: stored.documentId };
}
export { saveTextedPhoto as _saveTextedPhotoForTests };

