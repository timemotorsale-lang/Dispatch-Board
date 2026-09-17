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
  customerAddressLine1?: string;
  customerAddressLine2?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerState?: string;
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
  vehicleColor?: string;
  vehicleId?: string;
  vehicleMake?: string;
  vehicleMileage?: string;
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

export type ClaimDocumentPlanItem = {
  category: ClaimEvidenceCategory;
  detail: string;
  label: string;
  libraryTarget: "Claim jacket" | "Customer file" | "Vehicle file" | "Repair order";
  requiredBefore: "Intake" | "Repair handoff" | "Payment follow-up" | "Closeout";
  state: ClaimEvidenceStatus;
};

export type ClaimPhotoPlanItem = {
  category: ClaimEvidenceCategory;
  label: string;
  required: boolean;
  state: ClaimEvidenceStatus;
  uploadTarget: "Claim evidence" | "Vehicle evidence" | "Repair handoff";
};

export type ClaimCarrierTracker = {
  adjuster: string;
  approvalStatus: "not_started" | "needs_adjuster" | "carrier_pending" | "estimate_ready" | "handoff_ready";
  carrier: string;
  claimNumber: string;
  nextContact: string;
  policyNumber: string;
  statusLabel: string;
};

export type ClaimWorkspaceSummary = {
  ageLabel: string;
  assignedOwner: string;
  documentCount: number;
  photoCount: number;
  stageLabel: string;
};

export type ClaimExecutionTask = {
  actionLabel: string;
  detail: string;
  dueLabel: string;
  id: string;
  ownerRole: string;
  status: "ready" | "blocked" | "done";
  title: string;
};

export type ClaimReadModel = {
  activities: ClaimActivityRecord[];
  checklist: ClaimChecklistItem[];
  claim: InsuranceClaimRecord;
  carrierTracker: ClaimCarrierTracker;
  contractVersion: typeof CLAIMS_WORKSPACE_CONTRACT_VERSION;
  documentPlan: ClaimDocumentPlanItem[];
  duplicateWarnings: ClaimDuplicateWarning[];
  evidence: ClaimEvidenceRecord[];
  executionTasks: ClaimExecutionTask[];
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
  photoPlan: ClaimPhotoPlanItem[];
  primaryBlocker: string;
  readiness: ClaimReadiness[];
  summary: ClaimWorkspaceSummary;
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
    queueTags: Array<"blocked" | "waitingCarrier" | "readyHandoff" | "paymentWatch" | "aging">;
  }>;
  contractVersion: typeof CLAIMS_WORKSPACE_CONTRACT_VERSION;
  filters: Array<{
    count: number;
    id: "all" | "blocked" | "waitingCarrier" | "readyHandoff" | "paymentWatch" | "aging";
    label: string;
  }>;
  intakeForms: typeof INSURANCE_CLAIM_INTAKE_FORM_PACKET;
  metrics: {
    agingClaims: number;
    blockedClaims: number;
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
  customerAddressLine1?: unknown;
  customerAddressLine2?: unknown;
  customerCity?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  customerPostalCode?: unknown;
  customerState?: unknown;
  deductible?: unknown;
  description?: unknown;
  duplicateExceptionReason?: unknown;
  idempotencyKey?: unknown;
  lossDate?: unknown;
  lossLocation?: unknown;
  ownerUserId?: unknown;
  policyNumber?: unknown;
  vehicleColor?: unknown;
  vehicleMake?: unknown;
  vehicleMileage?: unknown;
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

export type ClaimExecutionUpdateInput = {
  adjusterEmail?: unknown;
  adjusterName?: unknown;
  adjusterPhone?: unknown;
  carrierName?: unknown;
  claimNumber?: unknown;
  deductible?: unknown;
  note?: unknown;
  policyNumber?: unknown;
};

export class ClaimsWorkspaceError extends Error {
  code: "AUTHENTICATION_REQUIRED" | "CLAIM_INVALID" | "CLAIM_NOT_FOUND" | "CLAIM_HANDOFF_BLOCKED" | "CLAIM_MANAGER_APPROVAL_REQUIRED";
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

const managerRoles = new Set([
  "General Manager",
  "Vehicle Operations Lead",
  "Service Department Manager"
]);

function assertUser(actor: AuthenticatedUser | null): AuthenticatedUser {
  if (!actor) throw new ClaimsWorkspaceError("AUTHENTICATION_REQUIRED", "Sign in before working insurance claims.");
  if (!actor.roles.some((role) => allowedRoles.has(role))) {
    throw new ClaimsWorkspaceError("CLAIM_INVALID", "This user is not authorized to work insurance claims.");
  }
  return actor;
}

function canApproveClaimException(actor: AuthenticatedUser) {
  return actor.roles.some((role) => managerRoles.has(role));
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
      provider: model.claim.carrierName || "Carrier unknown",
      queueTags: queueTags(model)
    })),
    contractVersion: CLAIMS_WORKSPACE_CONTRACT_VERSION,
    filters: [
      { count: readModels.length, id: "all", label: "All" },
      { count: readModels.filter((model) => queueTags(model).includes("blocked")).length, id: "blocked", label: "Blocked" },
      { count: readModels.filter((model) => queueTags(model).includes("waitingCarrier")).length, id: "waitingCarrier", label: "Waiting carrier" },
      { count: readModels.filter((model) => queueTags(model).includes("readyHandoff")).length, id: "readyHandoff", label: "Ready handoff" },
      { count: readModels.filter((model) => queueTags(model).includes("paymentWatch")).length, id: "paymentWatch", label: "Payment watch" },
      { count: readModels.filter((model) => queueTags(model).includes("aging")).length, id: "aging", label: "Aging" }
    ],
    intakeForms: INSURANCE_CLAIM_INTAKE_FORM_PACKET,
    metrics: {
      agingClaims: readModels.filter((model) => claimAgeDays(model.claim) >= 3).length,
      blockedClaims: readModels.filter((model) => model.primaryBlocker.startsWith("Missing") || model.primaryBlocker.includes("blocked")).length,
      openClaims: readModels.filter((model) => model.claim.status === "OPEN").length,
      paymentWatch: readModels.filter((model) => model.claim.stage === "PAYMENT_FOLLOW_UP").length,
      readyHandoff: readModels.filter((model) => model.handoff.allowed).length,
      waitingCarrier: readModels.filter((model) => model.primaryBlocker.includes("carrier") || model.primaryBlocker.includes("adjuster")).length
    }
  };
}

function queueTags(model: ClaimReadModel): Array<"blocked" | "waitingCarrier" | "readyHandoff" | "paymentWatch" | "aging"> {
  const tags: Array<"blocked" | "waitingCarrier" | "readyHandoff" | "paymentWatch" | "aging"> = [];
  if (model.primaryBlocker.startsWith("Missing") || model.primaryBlocker.includes("blocked")) tags.push("blocked");
  if (model.primaryBlocker.includes("carrier") || model.primaryBlocker.includes("adjuster") || model.carrierTracker.approvalStatus === "needs_adjuster") tags.push("waitingCarrier");
  if (model.handoff.allowed) tags.push("readyHandoff");
  if (model.claim.stage === "PAYMENT_FOLLOW_UP") tags.push("paymentWatch");
  if (claimAgeDays(model.claim) >= 3) tags.push("aging");
  return tags;
}

function claimAgeDays(claim: InsuranceClaimRecord) {
  const openedAt = new Date(claim.openedAt).getTime();
  return Number.isFinite(openedAt) ? Math.max(0, Math.floor((Date.now() - openedAt) / 86_400_000)) : 0;
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

export async function updateClaimExecutionDetails(
  actor: AuthenticatedUser | null,
  claimId: string,
  raw: ClaimExecutionUpdateInput,
  input: Dependencies = {}
) {
  const user = assertUser(actor);
  const context = deps(input);
  const prior = await context.repository.findClaimById(claimId);
  if (!prior) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
  const now = context.now().toISOString();
  const normalized = normalizeExecutionUpdate(raw);
  await context.repository.updateClaim(claimId, {
    ...normalized,
    lastActivityAt: now,
    nextAction: normalized.adjusterName || normalized.adjusterPhone || normalized.adjusterEmail ? "Review estimate or approval status" : prior.claim.nextAction
  });
  await context.repository.addActivity(claimId, {
    action: "CLAIM_EXECUTION_UPDATED",
    actorUserId: user.id,
    at: now,
    detail: text(raw.note) || executionUpdateDetail(normalized),
    id: `claim-activity-${randomUUID()}`
  });
  const refreshed = await context.repository.findClaimById(claimId);
  if (!refreshed) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
  return toClaimReadModel(refreshed);
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
  if (!readModel.handoff.allowed && !canApproveClaimException(user)) {
    throw new ClaimsWorkspaceError("CLAIM_MANAGER_APPROVAL_REQUIRED", "Manager approval is required to approve a blocked claim handoff exception.");
  }
  const now = context.now().toISOString();
  const exceptionApproved = !readModel.handoff.allowed && Boolean(exceptionReason);
  await context.repository.updateClaim(claimId, {
    blockerReason: exceptionApproved ? `Exception approved: ${exceptionReason}. Blockers: ${readModel.handoff.blockers.join("; ")}` : undefined,
    lastActivityAt: now,
    nextAction: "Open or link repair order",
    stage: "REPAIR_HANDOFF"
  });
  await context.repository.addActivity(claimId, {
    action: exceptionApproved ? "CLAIM_HANDOFF_EXCEPTION_APPROVED" : "CLAIM_HANDOFF_READY",
    actorUserId: user.id,
    at: now,
    detail: exceptionApproved ? `Manager exception approved: ${exceptionReason}` : "Repair handoff gate passed.",
    id: `claim-activity-${randomUUID()}`
  });
  const refreshed = await context.repository.findClaimById(claimId);
  if (!refreshed) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
  return toClaimReadModel(refreshed);
}

function toClaimReadModel(aggregate: ClaimWorkspaceAggregate, allClaims: ClaimWorkspaceAggregate[] = [aggregate]): ClaimReadModel {
  const checklist = buildChecklist(aggregate);
  const handoffBlockers = repairHandoffBlockers(aggregate, checklist);
  const primaryBlocker = classifyPrimaryBlocker(aggregate, checklist, handoffBlockers);
  const readiness = buildReadiness(aggregate, checklist, handoffBlockers);
  const documentPlan = buildDocumentPlan(checklist);
  const photoPlan = buildPhotoPlan(checklist);
  return {
    activities: aggregate.activities,
    carrierTracker: buildCarrierTracker(aggregate),
    checklist,
    claim: aggregate.claim,
    contractVersion: CLAIMS_WORKSPACE_CONTRACT_VERSION,
    documentPlan,
    duplicateWarnings: detectDuplicates(aggregate.claim, allClaims.filter((item) => item.claim.id !== aggregate.claim.id)),
    evidence: aggregate.evidence,
    executionTasks: buildExecutionTasks(aggregate, checklist, handoffBlockers, primaryBlocker),
    handoff: {
      allowed: handoffBlockers.length === 0,
      blockers: handoffBlockers,
      exceptionAllowed: handoffBlockers.length > 0,
      managerApprovalRequired: handoffBlockers.some((blocker) => blocker.includes("authorization") || blocker.includes("photo"))
    },
    intakeForms: INSURANCE_CLAIM_INTAKE_FORM_PACKET,
    nextAction: nextBestAction(aggregate, checklist, primaryBlocker),
    photoPlan,
    primaryBlocker,
    readiness,
    summary: buildWorkspaceSummary(aggregate)
  };
}

function buildDocumentPlan(checklist: ClaimChecklistItem[]): ClaimDocumentPlanItem[] {
  const state = (category: ClaimEvidenceCategory) => checklist.find((item) => item.category === category)?.state ?? "MISSING";
  return [
    {
      category: "CLAIM_IDENTITY",
      detail: "Claim number, carrier confirmation, or documented duplicate/manual exception.",
      label: "Claim identity record",
      libraryTarget: "Claim jacket",
      requiredBefore: "Intake",
      state: state("CLAIM_IDENTITY")
    },
    {
      category: "INSURANCE_CARD",
      detail: "Insurance card, policy detail, or carrier coverage confirmation.",
      label: "Insurance coverage proof",
      libraryTarget: "Customer file",
      requiredBefore: "Intake",
      state: state("INSURANCE_CARD")
    },
    {
      category: "AUTHORIZATION",
      detail: "Signed customer authorization allowing claim, estimate, repair, and carrier communication.",
      label: "Customer repair authorization",
      libraryTarget: "Claim jacket",
      requiredBefore: "Repair handoff",
      state: state("AUTHORIZATION")
    },
    {
      category: "ESTIMATE",
      detail: "Carrier estimate, internal appraisal, or supplement decision.",
      label: "Estimate and supplement packet",
      libraryTarget: "Repair order",
      requiredBefore: "Repair handoff",
      state: state("ESTIMATE")
    },
    {
      category: "PAYMENT",
      detail: "Deductible status, insurance payment, short-pay note, or accounting follow-up.",
      label: "Payment recovery record",
      libraryTarget: "Claim jacket",
      requiredBefore: "Payment follow-up",
      state: state("PAYMENT")
    },
    {
      category: "CLOSEOUT",
      detail: "Final release, final invoice, payment reconciliation, and closeout note.",
      label: "Closeout packet",
      libraryTarget: "Claim jacket",
      requiredBefore: "Closeout",
      state: state("CLOSEOUT")
    }
  ];
}

function buildPhotoPlan(checklist: ClaimChecklistItem[]): ClaimPhotoPlanItem[] {
  const state = (category: ClaimEvidenceCategory) => checklist.find((item) => item.category === category)?.state ?? "MISSING";
  return [
    {
      category: "DAMAGE_PHOTO",
      label: "Damage overview and closeups",
      required: true,
      state: state("DAMAGE_PHOTO"),
      uploadTarget: "Claim evidence"
    },
    {
      category: "VIN_PHOTO",
      label: "VIN plate or verified VIN",
      required: true,
      state: state("VIN_PHOTO"),
      uploadTarget: "Vehicle evidence"
    },
    {
      category: "ODOMETER_PHOTO",
      label: "Odometer photo",
      required: true,
      state: state("ODOMETER_PHOTO"),
      uploadTarget: "Vehicle evidence"
    },
    {
      category: "REPAIR_HANDOFF",
      label: "Repair handoff / release condition",
      required: false,
      state: state("REPAIR_HANDOFF"),
      uploadTarget: "Repair handoff"
    }
  ];
}

function buildCarrierTracker(aggregate: ClaimWorkspaceAggregate): ClaimCarrierTracker {
  const { claim } = aggregate;
  const hasEstimate = aggregate.evidence.some((item) => item.category === "ESTIMATE" && item.status !== "BLOCKED");
  const hasHandoff = claim.stage === "REPAIR_HANDOFF" || aggregate.evidence.some((item) => item.category === "REPAIR_HANDOFF" && item.status !== "BLOCKED");
  const approvalStatus = hasHandoff
    ? "handoff_ready"
    : hasEstimate
      ? "estimate_ready"
      : claim.adjusterName
        ? "carrier_pending"
        : claim.carrierName
          ? "needs_adjuster"
          : "not_started";
  return {
    adjuster: claim.adjusterName || claim.adjusterPhone || claim.adjusterEmail || "Needed",
    approvalStatus,
    carrier: claim.carrierName || "Carrier pending",
    claimNumber: claim.claimNumber || "Draft",
    nextContact: approvalStatus === "not_started" ? "Capture carrier and policy" : approvalStatus === "needs_adjuster" ? "Call carrier for adjuster" : approvalStatus === "carrier_pending" ? "Request estimate or approval" : "Confirm repair handoff",
    policyNumber: claim.policyNumber || "Pending",
    statusLabel: approvalStatus.replaceAll("_", " ")
  };
}

function buildWorkspaceSummary(aggregate: ClaimWorkspaceAggregate): ClaimWorkspaceSummary {
  const openedAt = new Date(aggregate.claim.openedAt).getTime();
  const ageDays = Number.isFinite(openedAt) ? Math.max(0, Math.floor((Date.now() - openedAt) / 86_400_000)) : 0;
  return {
    ageLabel: ageDays === 0 ? "Opened today" : `${ageDays} day${ageDays === 1 ? "" : "s"} open`,
    assignedOwner: aggregate.claim.ownerUserId || "Unassigned",
    documentCount: aggregate.evidence.filter((item) => !item.category.includes("PHOTO")).length,
    photoCount: aggregate.evidence.filter((item) => item.category.includes("PHOTO")).length,
    stageLabel: aggregate.claim.stage.toLowerCase().replaceAll("_", " ")
  };
}

function buildExecutionTasks(
  aggregate: ClaimWorkspaceAggregate,
  checklist: ClaimChecklistItem[],
  handoffBlockers: string[],
  primaryBlocker: string
): ClaimExecutionTask[] {
  const tasks: ClaimExecutionTask[] = [];
  const pushMissing = (category: ClaimEvidenceCategory, title: string, actionLabel: string, ownerRole = "Intake staff") => {
    const item = checklist.find((candidate) => candidate.category === category);
    if (item?.state === "MISSING" || item?.state === "BLOCKED") {
      tasks.push({
        actionLabel,
        detail: item.detail,
        dueLabel: "Today",
        id: `task-${category.toLowerCase()}`,
        ownerRole,
        status: item.state === "BLOCKED" ? "blocked" : "ready",
        title
      });
    }
  };

  if (!handoffBlockers.length) {
    return [{
      actionLabel: "Open repair order",
      detail: "Required gates are complete. Link or open the repair order and continue execution in service.",
      dueLabel: "Now",
      id: "task-repair-handoff",
      ownerRole: "Service advisor",
      status: "ready",
      title: "Move to repair handoff"
    }];
  }

  if (!aggregate.claim.claimNumber && !aggregate.claim.duplicateExceptionReason) {
    tasks.push({
      actionLabel: "Capture claim #",
      detail: "Record claim number or document why this claim is moving as a controlled draft.",
      dueLabel: "Now",
      id: "task-claim-number",
      ownerRole: "Intake staff",
      status: "ready",
      title: "Complete claim identity"
    });
  }

  if (aggregate.claim.carrierName && !aggregate.claim.adjusterName) {
    tasks.push({
      actionLabel: "Record carrier call",
      detail: "Call the carrier, capture adjuster name, phone, email, and approval status.",
      dueLabel: "Today",
      id: "task-adjuster",
      ownerRole: "Service advisor",
      status: "ready",
      title: "Find adjuster contact"
    });
  }

  pushMissing("AUTHORIZATION", "Get customer authorization", "Send / upload authorization", "Service advisor");
  pushMissing("DAMAGE_PHOTO", "Take damage photos", "Upload photos");
  pushMissing("VIN_PHOTO", "Verify VIN photo", "Upload VIN photo");
  pushMissing("ODOMETER_PHOTO", "Capture odometer", "Upload odometer");

  if (!tasks.length) {
    tasks.push({
      actionLabel: "Review claim",
      detail: primaryBlocker,
      dueLabel: "Today",
      id: "task-review",
      ownerRole: "Service advisor",
      status: "ready",
      title: "Review next claim action"
    });
  }

  return tasks.slice(0, 5);
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
    customerAddressLine1: text(raw.customerAddressLine1),
    customerAddressLine2: text(raw.customerAddressLine2),
    customerCity: text(raw.customerCity),
    customerEmail: text(raw.customerEmail),
    customerName,
    customerPhone: text(raw.customerPhone),
    customerPostalCode: text(raw.customerPostalCode),
    customerState: text(raw.customerState),
    deductible: text(raw.deductible),
    description: text(raw.description),
    duplicateExceptionReason: text(raw.duplicateExceptionReason),
    lossDate: text(raw.lossDate),
    lossLocation: text(raw.lossLocation),
    ownerUserId: text(raw.ownerUserId),
    policyNumber: text(raw.policyNumber),
    vehicleColor: text(raw.vehicleColor),
    vehicleMake: text(raw.vehicleMake),
    vehicleMileage: text(raw.vehicleMileage),
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

function normalizeExecutionUpdate(raw: ClaimExecutionUpdateInput): Partial<InsuranceClaimRecord> {
  const update: Partial<InsuranceClaimRecord> = {};
  for (const [field, value] of [
    ["adjusterEmail", text(raw.adjusterEmail)],
    ["adjusterName", text(raw.adjusterName)],
    ["adjusterPhone", text(raw.adjusterPhone)],
    ["carrierName", text(raw.carrierName)],
    ["claimNumber", text(raw.claimNumber)],
    ["deductible", text(raw.deductible)],
    ["policyNumber", text(raw.policyNumber)]
  ] as const) {
    if (value) update[field] = value;
  }
  if (Object.keys(update).length === 0 && !text(raw.note)) {
    throw new ClaimsWorkspaceError("CLAIM_INVALID", "Record at least one carrier, adjuster, claim, payment, or note detail.");
  }
  return update;
}

function executionUpdateDetail(update: Partial<InsuranceClaimRecord>) {
  const fields = [
    update.carrierName ? "carrier" : "",
    update.claimNumber ? "claim number" : "",
    update.policyNumber ? "policy" : "",
    update.adjusterName || update.adjusterPhone || update.adjusterEmail ? "adjuster" : "",
    update.deductible ? "deductible" : ""
  ].filter(Boolean);
  return fields.length ? `Updated ${fields.join(", ")} details.` : "Claim execution note recorded.";
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
