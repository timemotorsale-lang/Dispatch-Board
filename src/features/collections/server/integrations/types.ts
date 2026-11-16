/**
 * Integration adapter interfaces (spec section 24). Each outside service sits behind one of
 * these, so a real vendor can be plugged in later without changing the screens.
 *
 * Release 1 ships only TEST (fake) implementations. Nothing here contacts a real vendor.
 * Human-only decisions stay human: adapters that move money, disable a starter, or search
 * personal data require the person who decided (and their approval) on every call.
 */

/** Who is making a call. Money, starter and skip-trace calls require a real person. */
export type CallContext = { organizationId: string; initiatedByUserId: string | null; accountId?: string | null };

export type PaymentResult = { id: string; status: "SUCCEEDED" | "DECLINED" | "PENDING"; message: string };
export interface PaymentProcessor {
  chargeCard(ctx: CallContext, input: { amountCents: number; cardToken: string; approvalId: string }): Promise<PaymentResult>;
  achDebit(ctx: CallContext, input: { amountCents: number; bankToken: string; approvalId: string }): Promise<PaymentResult>;
  textToPayLink(ctx: CallContext, input: { amountCents: number; description: string }): Promise<{ url: string; expiresAt: string }>;
  refund(ctx: CallContext, input: { paymentId: string; amountCents: number; approvalId: string }): Promise<PaymentResult>;
}

/** Matches are only *proposals*: a person sets the bankruptcy flag. */
export interface BankruptcyMonitor {
  submitPortfolio(ctx: CallContext, input: { accounts: Array<{ accountId: string; name: string; last4Ssn?: string | null }> }): Promise<{ submitted: number }>;
  dailyMatches(ctx: CallContext): Promise<Array<{ accountId: string; caseNumber: string; chapter: string; filedOn: string; court: string }>>;
}

export interface ReassignedNumberCheck {
  check(ctx: CallContext, input: { phoneE164: string; consentDate: string }): Promise<{ reassigned: boolean | null; checkedAt: string }>;
}

export interface InsuranceVerifier {
  verify(ctx: CallContext, input: { policyNumber: string; carrier: string; vin?: string | null }): Promise<{ status: "ACTIVE" | "LAPSED" | "NOT_FOUND"; expirationDate: string | null; lienholderListed: boolean | null }>;
}

/** Disable/enable require an owner-approved starter action. */
export interface GpsDevice {
  locate(ctx: CallContext, input: { deviceSerial: string }): Promise<{ latitude: number; longitude: number; at: string }>;
  disable(ctx: CallContext, input: { deviceSerial: string; approvedActionId: string }): Promise<{ done: boolean; reference: string }>;
  enable(ctx: CallContext, input: { deviceSerial: string; approvedActionId: string }): Promise<{ done: boolean; reference: string }>;
  status(ctx: CallContext, input: { deviceSerial: string }): Promise<{ starter: "ENABLED" | "DISABLED" | "UNKNOWN"; tamper: boolean }>;
}

export interface MailSender {
  verifyAddress(ctx: CallContext, input: { address: string }): Promise<{ deliverable: boolean; normalized: string }>;
  sendCertified(ctx: CallContext, input: { letterId: string; pdfDocumentId: string; address: string }): Promise<{ trackingNumber: string }>;
}

export interface RepoNetwork {
  sendAssignment(ctx: CallContext, input: { repoCaseId: string; vin: string | null; address: string | null }): Promise<{ assignmentId: string }>;
  statusUpdates(ctx: CallContext, input: { assignmentId: string }): Promise<Array<{ status: string; at: string; note: string }>>;
}

export interface PhoneSystem {
  clickToCall(ctx: CallContext, input: { toE164: string }): Promise<{ callId: string }>;
}

export interface ESign {
  sendForSignature(ctx: CallContext, input: { documentId: string; signerName: string; signerEmail: string }): Promise<{ envelopeId: string }>;
}

/** Every search must record a permissible purpose (FCRA/GLBA). */
export interface SkipTrace {
  search(ctx: CallContext, input: { name: string; lastKnownAddress: string | null; permissiblePurpose: string }): Promise<{ phones: string[]; addresses: string[] }>;
}

/** Replaces the file import if DealerCenter grants API access; same column mapping. */
export interface DmsSource {
  fetchActiveAccounts(ctx: CallContext): Promise<{ rows: Array<Record<string, string>>; asOfDate: string }>;
}

export type AdapterMap = {
  PAYMENTS: PaymentProcessor; BANKRUPTCY: BankruptcyMonitor; REASSIGNED_NUMBERS: ReassignedNumberCheck; INSURANCE: InsuranceVerifier;
  GPS: GpsDevice; MAIL: MailSender; REPO_NETWORK: RepoNetwork; PHONE: PhoneSystem; ESIGN: ESign; SKIP_TRACE: SkipTrace; DMS: DmsSource;
};
export type IntegrationKey = keyof AdapterMap;
