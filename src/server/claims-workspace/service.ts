import { randomUUID } from "crypto";

import { INSURANCE_CLAIM_INTAKE_FORM_PACKET } from "@/lib/insurance-claim-intake-form-packet";
import type { AuthenticatedUser } from "@/server/auth/store";

export const CLAIMS_WORKSPACE_CONTRACT_VERSION = "claims-workspace/v1";
export const CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION = "claims-workspace-error/v1";

export type ClaimStage =
  | "INTAKE"
  | "EVIDENCE_NEEDED"
  | "CARRIER_PENDING"
  | "ESTIMATE_READY"
  | "REPAIR_HANDOFF"
  | "PAYMENT_FOLLOW_UP"
  | "CLOSEOUT"
  | "CLOSED";

export type ClaimEvidenceCategory =
  | "AUTHORIZATION"
  | "CLAIM_IDENTITY"
  | "DAMAGE_PHOTO"
  | "VIN_PHOTO"
  | "ODOMETER_PHOTO"
  | "INSURANCE_CARD"
  | "ESTIMATE"
  | "TOW_STORAGE"
  | "PAYMENT"
  | "REPAIR_HANDOFF"
  | "CLOSEOUT";

export type ClaimEvidenceStatus = "MISSING" | "RECEIVED" | "NOT_APPLICABLE" | "BLOCKED" | "EXCEPTION_ACCEPTED";
export type ClaimReadinessStatus = "ready" | "not_ready" | "blocked" | "exception_ready";

export type InsuranceClaimRecord = {
  adjusterEmail?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  blockerReason?: string;
  carrierName?: string;
  claimNumber?: string;
  closedAt?: string;
  createdByUserId: string;
  customerEmail?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  deductible?: string;
  description?: string;
  duplicateExceptionReason?: string;
  id: string;
  lastActivityAt: string;
  linkedRepairOrderId?: string;
  lossDate?: string;
  lossLocation?: string;
  nextAction?: string;
  openedAt: string;
  ownerUserId: string;
  policyNumber?: string;
  stage: ClaimStage;
  status: "OPEN" | "CLOSED";
  vehicleId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleStockNumber?: string;
  vehicleVin?: string;
  vehicleYear?: string;
  version: number;
};

export type ClaimEvidenceRecord = {
  category: ClaimEvidenceCategory;
  createdAt: string;
  createdByUserId: string;
  documentLibraryId?: string;
  fileName?: string;
  id: string;
  notes?: string;
  relationshipTargets: Array<"CLAIM" | "CUSTOMER" | "VEHICLE" | "REPAIR_ORDER">;
  status: Exclude<ClaimEvidenceStatus, "MISSING">;
  title: string;
};

export type ClaimActivityRecord = {
  action: string;
  actorUserId: string;
  at: string;
  detail: string;
  id: string;
};

export type ClaimWorkspaceAggregate = {
  activities: ClaimActivityRecord[];
  claim: InsuranceClaimRecord;
  evidence: ClaimEvidenceRecord[];
};

export type ClaimChecklistItem = {
  category: ClaimEvidenceCategory;
  detail: string;
  label: string;
  required: boolean;
  state: ClaimEvidenceStatus;
};

export type ClaimReadiness = {
  category: "intake" | "evidence" | "repairHandoff" | "payment" | "closeout";
  percent: number;
  reasons: string[];
  status: ClaimReadinessStatus;
  title: string;
};

export type ClaimReadModel = {
  activities: ClaimActivityRecord[];
  checklist: ClaimChecklistItem[];
  claim: InsuranceClaimRecord;
  contractVersion: typeof CLAIMS_WORKSPACE_CONTRACT_VERSION;
  duplicateWarnings: ClaimDuplicateWarning[];
  evidence: ClaimEvidenceRecord[];
  handoff: {
    allowed: boolean;
    blockers: string[];
    exceptionAllowed: boolean;
    managerApprovalRequired: boolean;
  };
  intakeForms: typeof INSURANCE_CLAIM_INTAKE_FORM_PACKET;
  nextAction: {
    dueLabel: string;
    label: string;
    ownerRole: string;
    reason: string;
  };
  primaryBlocker: string;
  readiness: ClaimReadiness[];
};

export type ClaimsDeskReadModel = {
  claims: Array<{
    action: "Open" | "Resume" | "Assign";
    blocker: string;
    blockerTone: "info" | "good" | "warning" | "danger";
    claim: string;
    customer: string;
    detail: string;
    href: string;
    provider: string;
  }>;
  contractVersion: typeof CLAIMS_WORKSPACE_CONTRACT_VERSION;
  intakeForms: typeof INSURANCE_CLAIM_INTAKE_FORM_PACKET;
  metrics: {
    openClaims: number;
    paymentWatch: number;
    readyHandoff: number;
    waitingCarrier: number;
  };
};

export type ClaimDuplicateWarning = {
  existingClaimId: string;
  level: "possible_duplicate" | "strong_duplicate" | "exact_claim_number_duplicate";
  reason: string;
};

export type ClaimsWorkspaceRepository = {
  addActivity(claimId: string, activity: ClaimActivityRecord): Promise<void>;
  addEvidence(claimId: string, evidence: ClaimEvidenceRecord): Promise<ClaimWorkspaceAggregate>;
  createClaim(claim: InsuranceClaimRecord): Promise<ClaimWorkspaceAggregate>;
  findClaimById(claimId: string): Promise<ClaimWorkspaceAggregate | null>;
  listClaims(): Promise<ClaimWorkspaceAggregate[]>;
  updateClaim(claimId: string, update: Partial<InsuranceClaimRecord>): Promise<ClaimWorkspaceAggregate>;
};

export type ClaimCreateInput = {
  adjusterEmail?: unknown;
  adjusterName?: unknown;
  adjusterPhone?: unknown;
  carrierName?: unknown;
  claimNumber?: unknown;
  customerEmail?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  deductible?: unknown;
  description?: unknown;
  duplicateExceptionReason?: unknown;
  idempotencyKey?: unknown;
  lossDate?: unknown;
  lossLocation?: unknown;
  ownerUserId?: unknown;
  policyNumber?: unknown;
  vehicleMake?: unknown;
  vehicleModel?: unknown;
  vehiclePlate?: unknown;
  vehicleStockNumber?: unknown;
  vehicleVin?: unknown;
  vehicleYear?: unknown;
};

export type ClaimEvidenceInput = {
  category?: unknown;
  documentLibraryId?: unknown;
  fileName?: unknown;
  notes?: unknown;
  relationshipTargets?: unknown;
  status?: unknown;
  title?: unknown;
};

export type ClaimHandoffInput = {
  target?: unknown;
  exceptionReason?: unknown;
};

export class ClaimsWorkspaceError extends Error {
  code: "AUTHENTICATION_REQUIRED" | "CLAIM_INVALID" | "CLAIM_NOT_FOUND" | "CLAIM_HANDOFF_BLOCKED";
  retryable: boolean;

  constructor(code: ClaimsWorkspaceError["code"], message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = "ClaimsWorkspaceError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

const allowedRoles = new Set([
  "General Manager",
  "Vehicle Operations Lead",
  "Service Department Manager",
  "Service Advisor",
  "Operations Coordinator",
  "Front Desk Operations Coordinator"
]);

function assertUser(actor: AuthenticatedUser | null): AuthenticatedUser {
  if (!actor) throw new ClaimsWorkspaceError("AUTHENTICATION_REQUIRED", "Sign in before working insurance claims.");
  if (!actor.roles.some((role) => allowedRoles.has(role))) {
    throw new ClaimsWorkspaceError("CLAIM_INVALID", "This user is not authorized to work insurance claims.");
  }
  return actor;
}

const seedOpenedAt = "2026-09-17T14:00:00.000Z";

function seededAggregates(): ClaimWorkspaceAggregate[] {
  return [
    {
      claim: {
        adjusterName: "",
        carrierName: "State Farm",
        claimNumber: "MN-48291",
        createdByUserId: "seed",
        customerEmail: "deqo@example.com",
        customerName: "Deqo Roble",
        customerPhone: "612-555-0184",
        deductible: "$500",
        description: "Front bumper and left fender damage. Customer reports vehicle was driveable after loss.",
        id: "claim-demo-1",
        lastActivityAt: seedOpenedAt,
        lossDate: "2026-09-15",
        lossLocation: "Minneapolis, MN",
        openedAt: seedOpenedAt,
        ownerUserId: "advisor-1",
        policyNumber: "SF-204-119",
        stage: "EVIDENCE_NEEDED",
        status: "OPEN",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehicleStockNumber: "4T1B11HK",
        vehicleVin: "4T1B11HK9JU128441",
        vehicleYear: "2018",
        version: 1
      },
      evidence: [
        evidenceSeed("ev-ins-card", "INSURANCE_CARD", "Insurance card", "RECEIVED", "Stored in document library and linked to customer and claim."),
        evidenceSeed("ev-claim-number", "CLAIM_IDENTITY", "Claim number captured", "RECEIVED", "Claim number captured from customer."),
        evidenceSeed("ev-damage-photo", "DAMAGE_PHOTO", "Initial damage photos", "RECEIVED", "3 attached. Missing left-front closeup."),
        evidenceSeed("ev-authorization", "AUTHORIZATION", "Repair authorization", "BLOCKED", "Prepared but not signed.")
      ],
      activities: [
        {
          action: "CLAIM_CREATED",
          actorUserId: "seed",
          at: seedOpenedAt,
          detail: "Insurance claim workspace opened from Claims Desk.",
          id: "activity-demo-1"
        }
      ]
    },
    {
      claim: {
        carrierName: "",
        createdByUserId: "seed",
        customerName: "Abdi Hassan",
        id: "claim-demo-2",
        lastActivityAt: seedOpenedAt,
        openedAt: seedOpenedAt,
        ownerUserId: "",
        stage: "INTAKE",
        status: "OPEN",
        vehicleMake: "Honda",
        vehicleModel: "Accord",
        vehiclePlate: "HJA-221",
        vehicleYear: "2016",
        version: 1
      },
      evidence: [],
      activities: []
    },
    {
      claim: {
        carrierName: "Progressive",
        claimNumber: "IL-22804",
        createdByUserId: "seed",
        customerName: "Maria Lopez",
        id: "claim-demo-3",
        lastActivityAt: seedOpenedAt,
        linkedRepairOrderId: "RO-10482",
        lossDate: "2026-09-16",
        openedAt: seedOpenedAt,
        ownerUserId: "advisor-2",
        stage: "REPAIR_HANDOFF",
        status: "OPEN",
        vehicleMake: "Nissan",
        vehicleModel: "Rogue",
        vehicleYear: "2020",
        version: 1
      },
      evidence: [
        evidenceSeed("ev-auth-3", "AUTHORIZATION", "Customer authorization", "RECEIVED", "Signed."),
        evidenceSeed("ev-photo-3", "DAMAGE_PHOTO", "Damage photo set", "RECEIVED", "Required photos received."),
        evidenceSeed("ev-vin-3", "VIN_PHOTO", "VIN photo", "RECEIVED", "Received."),
        evidenceSeed("ev-odo-3", "ODOMETER_PHOTO", "Odometer photo", "RECEIVED", "Received."),
        evidenceSeed("ev-ins-3", "INSURANCE_CARD", "Insurance card", "RECEIVED", "Received."),
        evidenceSeed("ev-claim-3", "CLAIM_IDENTITY", "Claim number", "RECEIVED", "Received.")
      ],
      activities: []
    }
  ];
}

function evidenceSeed(
  id: string,
  category: ClaimEvidenceCategory,
  title: string,
  status: Exclude<ClaimEvidenceStatus, "MISSING">,
  notes: string
): ClaimEvidenceRecord {
  return {
    category,
    createdAt: seedOpenedAt,
    createdByUserId: "seed",
    documentLibraryId: `doc-${id}`,
    id,
    notes,
    relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
    status,
    title
  };
}

export function createInMemoryClaimsWorkspaceRepository(seed = seededAggregates()): ClaimsWorkspaceRepository {
  const claims = new Map(seed.map((aggregate) => [aggregate.claim.id, structuredClone(aggregate)]));
  return {
    async addActivity(claimId, activity) {
      const aggregate = claims.get(claimId);
      if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
      aggregate.activities.unshift(activity);
      aggregate.claim.lastActivityAt = activity.at;
      aggregate.claim.version += 1;
    },
    async addEvidence(claimId, evidence) {
      const aggregate = claims.get(claimId);
      if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
      aggregate.evidence.push(evidence);
      aggregate.claim.lastActivityAt = evidence.createdAt;
      aggregate.claim.version += 1;
      return structuredClone(aggregate);
    },
    async createClaim(claim) {
      const aggregate = { activities: [], claim, evidence: [] };
      claims.set(claim.id, structuredClone(aggregate));
      return structuredClone(aggregate);
    },
    async findClaimById(claimId) {
      const aggregate = claims.get(claimId);
      return aggregate ? structuredClone(aggregate) : null;
    },
    async listClaims() {
      return [...claims.values()].map((aggregate) => structuredClone(aggregate));
    },
    async updateClaim(claimId, update) {
      const aggregate = claims.get(claimId);
      if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
      aggregate.claim = { ...aggregate.claim, ...update, version: aggregate.claim.version + 1 };
      claims.set(claimId, aggregate);
      return structuredClone(aggregate);
    }
  };
}

const defaultRepository = createInMemoryClaimsWorkspaceRepository();

type Dependencies = {
  now?: () => Date;
  repository?: ClaimsWorkspaceRepository;
};

function deps(input: Dependencies = {}) {
  return {
    now: input.now ?? (() => new Date()),
    repository: input.repository ?? defaultRepository
  };
}

export async function getClaimsDeskReadModel(actor: AuthenticatedUser | null, input: Dependencies = {}): Promise<ClaimsDeskReadModel> {
  assertUser(actor);
  const repository = deps(input).repository;
  const aggregates = await repository.listClaims();
  const readModels = aggregates.map((aggregate) => toClaimReadModel(aggregate, aggregates));
  return {
    claims: readModels.map((model) => ({
      action: model.claim.ownerUserId ? (model.claim.stage === "INTAKE" ? "Resume" : "Open") : "Assign",
      blocker: model.primaryBlocker,
      blockerTone: blockerTone(model.primaryBlocker),
      claim: model.claim.claimNumber || "Draft",
      customer: model.claim.customerName,
      detail: vehicleSummary(model.claim),
      href: `/vehicles/claims-workspace?claimId=${encodeURIComponent(model.claim.id)}`,
      provider: model.claim.carrierName || "Carrier unknown"
    })),
    contractVersion: CLAIMS_WORKSPACE_CONTRACT_VERSION,
    intakeForms: INSURANCE_CLAIM_INTAKE_FORM_PACKET,
    metrics: {
      openClaims: readModels.filter((model) => model.claim.status === "OPEN").length,
      paymentWatch: readModels.filter((model) => model.claim.stage === "PAYMENT_FOLLOW_UP").length,
      readyHandoff: readModels.filter((model) => model.handoff.allowed).length,
      waitingCarrier: readModels.filter((model) => model.primaryBlocker.includes("carrier") || model.primaryBlocker.includes("adjuster")).length
    }
  };
}

export async function getClaimWorkspaceReadModel(
  actor: AuthenticatedUser | null,
  claimId?: string | null,
  input: Dependencies = {}
): Promise<ClaimReadModel> {
  assertUser(actor);
  const repository = deps(input).repository;
  const aggregate = claimId
    ? await repository.findClaimById(claimId)
    : (await repository.listClaims())[0] ?? null;
  if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
  return toClaimReadModel(aggregate, await repository.listClaims());
}

export async function createInsuranceClaim(
  actor: AuthenticatedUser | null,
  raw: ClaimCreateInput,
  input: Dependencies = {}
) {
  const user = assertUser(actor);
  const context = deps(input);
  const now = context.now().toISOString();
  const normalized = normalizeClaimCreate(raw);
  const existingClaims = await context.repository.listClaims();
  const duplicateWarnings = detectDuplicates(normalized, existingClaims);
  if (duplicateWarnings.some((warning) => warning.level === "exact_claim_number_duplicate") && !normalized.duplicateExceptionReason) {
    throw new ClaimsWorkspaceError("CLAIM_INVALID", "A claim with this claim number is already open. Review the existing claim or record a duplicate exception reason.");
  }

  const claim: InsuranceClaimRecord = {
    ...normalized,
    createdByUserId: user.id,
    id: `claim-${randomUUID()}`,
    lastActivityAt: now,
    openedAt: now,
    ownerUserId: normalized.ownerUserId || user.id,
    stage: "INTAKE",
    status: "OPEN",
    version: 1
  };

  const aggregate = await context.repository.createClaim(claim);
  await context.repository.addActivity(claim.id, {
    action: "CLAIM_CREATED",
    actorUserId: user.id,
    at: now,
    detail: "Insurance claim created from Claims Desk intake.",
    id: `claim-activity-${randomUUID()}`
  });
  return { duplicateWarnings, readModel: toClaimReadModel(aggregate, existingClaims) };
}

export async function attachClaimEvidence(
  actor: AuthenticatedUser | null,
  claimId: string,
  raw: ClaimEvidenceInput,
  input: Dependencies = {}
) {
  const user = assertUser(actor);
  const context = deps(input);
  const now = context.now().toISOString();
  const normalized = normalizeEvidence(raw);
  const evidence: ClaimEvidenceRecord = {
    ...normalized,
    createdAt: now,
    createdByUserId: user.id,
    id: `claim-evidence-${randomUUID()}`
  };
  const aggregate = await context.repository.addEvidence(claimId, evidence);
  await context.repository.addActivity(claimId, {
    action: "CLAIM_EVIDENCE_ATTACHED",
    actorUserId: user.id,
    at: now,
    detail: `${evidence.title} attached as ${evidence.category.toLowerCase().replaceAll("_", " ")}.`,
    id: `claim-activity-${randomUUID()}`
  });
  return toClaimReadModel(aggregate);
}

export async function requestClaimHandoff(
  actor: AuthenticatedUser | null,
  claimId: string,
  raw: ClaimHandoffInput,
  input: Dependencies = {}
) {
  const user = assertUser(actor);
  const context = deps(input);
  const aggregate = await context.repository.findClaimById(claimId);
  if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
  const readModel = toClaimReadModel(aggregate);
  const exceptionReason = text(raw.exceptionReason);
  if (!readModel.handoff.allowed && !exceptionReason) {
    throw new ClaimsWorkspaceError("CLAIM_HANDOFF_BLOCKED", `Repair handoff is blocked: ${readModel.handoff.blockers.join("; ")}.`);
  }
  const now = context.now().toISOString();
  const nextStage: ClaimStage = readModel.handoff.allowed ? "REPAIR_HANDOFF" : "ESTIMATE_READY";
  const updated = await context.repository.updateClaim(claimId, {
    blockerReason: readModel.handoff.allowed ? undefined : readModel.handoff.blockers.join("; "),
    lastActivityAt: now,
    nextAction: readModel.handoff.allowed ? "Open or link repair order" : "Manager exception review",
    stage: nextStage
  });
  await context.repository.addActivity(claimId, {
    action: readModel.handoff.allowed ? "CLAIM_HANDOFF_READY" : "CLAIM_HANDOFF_EXCEPTION_REQUESTED",
    actorUserId: user.id,
    at: now,
    detail: readModel.handoff.allowed ? "Repair handoff gate passed." : `Exception requested: ${exceptionReason}`,
    id: `claim-activity-${randomUUID()}`
  });
  return toClaimReadModel(updated);
}

function toClaimReadModel(aggregate: ClaimWorkspaceAggregate, allClaims: ClaimWorkspaceAggregate[] = [aggregate]): ClaimReadModel {
  const checklist = buildChecklist(aggregate);
  const handoffBlockers = repairHandoffBlockers(aggregate, checklist);
  const primaryBlocker = classifyPrimaryBlocker(aggregate, checklist, handoffBlockers);
  const readiness = buildReadiness(aggregate, checklist, handoffBlockers);
  return {
    activities: aggregate.activities,
    checklist,
    claim: aggregate.claim,
    contractVersion: CLAIMS_WORKSPACE_CONTRACT_VERSION,
    duplicateWarnings: detectDuplicates(aggregate.claim, allClaims.filter((item) => item.claim.id !== aggregate.claim.id)),
    evidence: aggregate.evidence,
    handoff: {
      allowed: handoffBlockers.length === 0,
      blockers: handoffBlockers,
      exceptionAllowed: handoffBlockers.length > 0,
      managerApprovalRequired: handoffBlockers.some((blocker) => blocker.includes("authorization") || blocker.includes("photo"))
    },
    intakeForms: INSURANCE_CLAIM_INTAKE_FORM_PACKET,
    nextAction: nextBestAction(aggregate, checklist, primaryBlocker),
    primaryBlocker,
    readiness
  };
}

function buildChecklist(aggregate: ClaimWorkspaceAggregate): ClaimChecklistItem[] {
  const evidence = aggregate.evidence;
  const claim = aggregate.claim;
  return [
    checklistItem("CLAIM_IDENTITY", "Claim number", "Claim number or documented duplicate/manual exception.", Boolean(claim.claimNumber || claim.duplicateExceptionReason), evidence),
    checklistItem("INSURANCE_CARD", "Carrier and policy", "Insurance carrier and policy reference.", Boolean(claim.carrierName || claim.policyNumber), evidence),
    checklistItem("AUTHORIZATION", "Customer authorization", "Signed authorization before repair handoff.", false, evidence),
    checklistItem("DAMAGE_PHOTO", "Damage photos", "Visible damage photos and closeups.", false, evidence),
    checklistItem("VIN_PHOTO", "VIN photo", "VIN photo or verified VIN capture.", Boolean(claim.vehicleVin), evidence),
    checklistItem("ODOMETER_PHOTO", "Odometer photo", "Odometer photo or verified mileage capture.", false, evidence),
    checklistItem("ESTIMATE", "Estimate or appraisal", "Needed before repair handoff unless exception approved.", aggregate.claim.stage === "REPAIR_HANDOFF", evidence)
  ];
}

function checklistItem(
  category: ClaimEvidenceCategory,
  label: string,
  detail: string,
  factComplete: boolean,
  evidence: ClaimEvidenceRecord[]
): ClaimChecklistItem {
  const existing = evidence.find((item) => item.category === category);
  return {
    category,
    detail,
    label,
    required: true,
    state: existing?.status ?? (factComplete ? "RECEIVED" : "MISSING")
  };
}

function repairHandoffBlockers(aggregate: ClaimWorkspaceAggregate, checklist: ClaimChecklistItem[]) {
  const blockers: string[] = [];
  const claim = aggregate.claim;
  if (!claim.customerName) blockers.push("customer information missing");
  if (!claim.vehicleVin && !(claim.vehicleYear && claim.vehicleMake && claim.vehicleModel)) blockers.push("vehicle information missing");
  if (!claim.description) blockers.push("loss description missing");
  if (!claim.claimNumber && !claim.duplicateExceptionReason) blockers.push("claim number or exception missing");
  if (!claim.carrierName && !claim.duplicateExceptionReason) blockers.push("carrier or manual exception missing");
  for (const item of checklist) {
    if (["AUTHORIZATION", "DAMAGE_PHOTO", "VIN_PHOTO", "ODOMETER_PHOTO"].includes(item.category) && item.state !== "RECEIVED" && item.state !== "EXCEPTION_ACCEPTED") {
      blockers.push(`${item.label.toLowerCase()} missing`);
    }
  }
  if (!claim.ownerUserId) blockers.push("next owner missing");
  return [...new Set(blockers)];
}

function buildReadiness(aggregate: ClaimWorkspaceAggregate, checklist: ClaimChecklistItem[], handoffBlockers: string[]): ClaimReadiness[] {
  const complete = checklist.filter((item) => item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED").length;
  const percent = Math.round((complete / checklist.length) * 100);
  const intakeReasons = [
    ...(!aggregate.claim.customerName ? ["customer missing"] : []),
    ...(!aggregate.claim.vehicleVin && !aggregate.claim.vehicleMake ? ["vehicle missing"] : []),
    ...(!aggregate.claim.lossDate ? ["loss date missing"] : [])
  ];
  return [
    readiness("intake", "Intake readiness", intakeReasons.length ? "not_ready" : "ready", 100 - intakeReasons.length * 25, intakeReasons),
    readiness("evidence", "Evidence readiness", percent >= 80 ? "ready" : percent >= 45 ? "not_ready" : "blocked", percent, checklist.filter((item) => item.state === "MISSING").map((item) => `${item.label} missing`)),
    readiness("repairHandoff", "Repair-order handoff", handoffBlockers.length ? "blocked" : "ready", handoffBlockers.length ? 56 : 100, handoffBlockers),
    readiness("payment", "Payment follow-up", aggregate.claim.deductible ? "not_ready" : "not_ready", aggregate.claim.deductible ? 45 : 20, aggregate.claim.deductible ? ["deductible captured; payment status pending"] : ["deductible/payment status pending"]),
    readiness("closeout", "Closeout", aggregate.claim.stage === "CLOSED" ? "ready" : "not_ready", aggregate.claim.stage === "CLOSED" ? 100 : 18, ["claim still active"])
  ];
}

function readiness(category: ClaimReadiness["category"], title: string, status: ClaimReadinessStatus, percent: number, reasons: string[]): ClaimReadiness {
  return { category, percent: Math.max(0, Math.min(percent, 100)), reasons, status, title };
}

function nextBestAction(aggregate: ClaimWorkspaceAggregate, checklist: ClaimChecklistItem[], primaryBlocker: string): ClaimReadModel["nextAction"] {
  const missingAuthorization = checklist.find((item) => item.category === "AUTHORIZATION" && item.state === "MISSING");
  const missingPhoto = checklist.find((item) => item.category === "DAMAGE_PHOTO" && item.state === "MISSING");
  if (!aggregate.claim.ownerUserId) return { dueLabel: "Today", label: "Assign claim owner", ownerRole: "Manager", reason: "Claim has no accountable owner." };
  if (!aggregate.claim.claimNumber && !aggregate.claim.duplicateExceptionReason) return { dueLabel: "Today", label: "Capture claim number", ownerRole: "Intake staff", reason: "Minimum claim identity is incomplete." };
  if (missingAuthorization) return { dueLabel: "Today", label: "Get authorization signed", ownerRole: "Service advisor", reason: "Repair handoff is blocked until authorization is complete." };
  if (missingPhoto) return { dueLabel: "Today", label: "Upload damage photos", ownerRole: "Intake staff", reason: "Required photo evidence is missing." };
  if (aggregate.claim.carrierName && !aggregate.claim.adjusterName) return { dueLabel: "Today, 4:00 PM", label: "Contact adjuster", ownerRole: "Service advisor", reason: "Carrier is captured, but adjuster contact and approval status are missing." };
  if (primaryBlocker === "Ready for repair order") return { dueLabel: "Today", label: "Open or link repair order", ownerRole: "Service advisor", reason: "Required intake and evidence gates are satisfied." };
  return { dueLabel: "Today", label: "Review claim", ownerRole: "Service advisor", reason: primaryBlocker };
}

function classifyPrimaryBlocker(aggregate: ClaimWorkspaceAggregate, checklist: ClaimChecklistItem[], handoffBlockers: string[]) {
  if (!aggregate.claim.ownerUserId) return "Missing owner";
  if (!aggregate.claim.customerName) return "Missing customer information";
  if (!aggregate.claim.vehicleVin && !aggregate.claim.vehicleMake) return "Missing vehicle information";
  if (checklist.some((item) => item.category === "AUTHORIZATION" && item.state === "MISSING")) return "Missing authorization";
  if (checklist.some((item) => ["DAMAGE_PHOTO", "VIN_PHOTO", "ODOMETER_PHOTO"].includes(item.category) && item.state === "MISSING")) return "Missing photos";
  if (handoffBlockers.length === 0) return "Ready for repair order";
  if (aggregate.claim.carrierName && !aggregate.claim.adjusterName) return "Waiting on adjuster";
  return handoffBlockers[0] ?? "Review needed";
}

function detectDuplicates(candidate: Pick<InsuranceClaimRecord, "claimNumber" | "vehicleVin" | "customerPhone" | "customerName" | "lossDate" | "carrierName">, aggregates: ClaimWorkspaceAggregate[]): ClaimDuplicateWarning[] {
  return aggregates.flatMap((aggregate): ClaimDuplicateWarning[] => {
    const claim = aggregate.claim;
    if (candidate.claimNumber && claim.claimNumber && candidate.claimNumber.toLowerCase() === claim.claimNumber.toLowerCase()) {
      return [{ existingClaimId: claim.id, level: "exact_claim_number_duplicate" as const, reason: `Claim number ${claim.claimNumber} is already open.` }];
    }
    if (candidate.vehicleVin && claim.vehicleVin && candidate.vehicleVin.toLowerCase() === claim.vehicleVin.toLowerCase()) {
      return [{ existingClaimId: claim.id, level: "strong_duplicate" as const, reason: "Same VIN already has an open claim." }];
    }
    if (candidate.customerName && claim.customerName && candidate.lossDate && claim.lossDate && candidate.customerName.toLowerCase() === claim.customerName.toLowerCase() && candidate.lossDate === claim.lossDate) {
      return [{ existingClaimId: claim.id, level: "possible_duplicate" as const, reason: "Same customer and loss date already exist." }];
    }
    return [];
  });
}

function normalizeClaimCreate(raw: ClaimCreateInput): Omit<InsuranceClaimRecord, "createdByUserId" | "id" | "lastActivityAt" | "openedAt" | "stage" | "status" | "version"> {
  const customerName = text(raw.customerName);
  if (!customerName) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Customer name is required to start an insurance claim.");
  const hasVehicle = text(raw.vehicleVin) || text(raw.vehicleMake) || text(raw.vehicleModel) || text(raw.vehiclePlate);
  if (!hasVehicle) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Vehicle identity, VIN, plate, or vehicle description is required.");
  return {
    adjusterEmail: text(raw.adjusterEmail),
    adjusterName: text(raw.adjusterName),
    adjusterPhone: text(raw.adjusterPhone),
    carrierName: text(raw.carrierName),
    claimNumber: text(raw.claimNumber),
    customerEmail: text(raw.customerEmail),
    customerName,
    customerPhone: text(raw.customerPhone),
    deductible: text(raw.deductible),
    description: text(raw.description),
    duplicateExceptionReason: text(raw.duplicateExceptionReason),
    lossDate: text(raw.lossDate),
    lossLocation: text(raw.lossLocation),
    ownerUserId: text(raw.ownerUserId),
    policyNumber: text(raw.policyNumber),
    vehicleMake: text(raw.vehicleMake),
    vehicleModel: text(raw.vehicleModel),
    vehiclePlate: text(raw.vehiclePlate),
    vehicleStockNumber: text(raw.vehicleStockNumber),
    vehicleVin: text(raw.vehicleVin),
    vehicleYear: text(raw.vehicleYear)
  };
}

function normalizeEvidence(raw: ClaimEvidenceInput): Omit<ClaimEvidenceRecord, "createdAt" | "createdByUserId" | "id"> {
  const category = choice(raw.category, ["AUTHORIZATION", "CLAIM_IDENTITY", "DAMAGE_PHOTO", "VIN_PHOTO", "ODOMETER_PHOTO", "INSURANCE_CARD", "ESTIMATE", "TOW_STORAGE", "PAYMENT", "REPAIR_HANDOFF", "CLOSEOUT"] as const, "Evidence category");
  const title = text(raw.title);
  if (!title) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Evidence title is required.");
  const status = choice(raw.status ?? "RECEIVED", ["RECEIVED", "NOT_APPLICABLE", "BLOCKED", "EXCEPTION_ACCEPTED"] as const, "Evidence status");
  return {
    category,
    documentLibraryId: text(raw.documentLibraryId),
    fileName: text(raw.fileName),
    notes: text(raw.notes),
    relationshipTargets: relationshipTargets(raw.relationshipTargets),
    status,
    title
  };
}

function relationshipTargets(value: unknown): ClaimEvidenceRecord["relationshipTargets"] {
  if (!Array.isArray(value)) return ["CLAIM"];
  const allowed = new Set(["CLAIM", "CUSTOMER", "VEHICLE", "REPAIR_ORDER"]);
  const targets = value.filter((item): item is ClaimEvidenceRecord["relationshipTargets"][number] => typeof item === "string" && allowed.has(item));
  return targets.length ? targets : ["CLAIM"];
}

function choice<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value === "string" && allowed.includes(value)) return value as T[number];
  throw new ClaimsWorkspaceError("CLAIM_INVALID", `${label} is invalid.`);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function vehicleSummary(claim: InsuranceClaimRecord) {
  const vehicle = [claim.vehicleYear, claim.vehicleMake, claim.vehicleModel].filter(Boolean).join(" ") || "Vehicle not captured";
  const secondary = claim.vehicleVin || claim.vehiclePlate || claim.vehicleStockNumber || "identity pending";
  return `${vehicle} - ${secondary}`;
}

function blockerTone(blocker: string): "info" | "good" | "warning" | "danger" {
  if (blocker.includes("Ready")) return "good";
  if (blocker.includes("Missing owner") || blocker.includes("Missing customer") || blocker.includes("Missing vehicle")) return "danger";
  if (blocker.includes("Missing") || blocker.includes("Waiting")) return "warning";
  return "info";
}
