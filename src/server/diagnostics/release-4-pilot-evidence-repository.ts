import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, canReviewWorkflows } from "@/server/policies/access";

import type { DiagnosticRelease4OperationalReadinessResult } from "./release-4-operational-readiness-domain";
import { evaluateDiagnosticRelease4PilotGate, type DiagnosticPilotGateMode, type DiagnosticPilotRiskDisposition, type DiagnosticRelease4PilotGateResult } from "./release-4-pilot-gate-domain";
import type { DiagnosticRelease4PilotReplayResult } from "./release-4-pilot-replay-domain";
import type { DiagnosticRelease4ReviewApprovalResult } from "./release-4-review-approval-domain";

export const DIAGNOSTIC_DG_G6_PILOT_EVIDENCE_REPOSITORY_VERSION = "DG-G6/PILOT-EVIDENCE-REPOSITORY/1.0.0";

export type DiagnosticPilotEvidenceStatus = "ACCEPTED" | "MISSING" | "REJECTED";

export type DiagnosticPilotEvidenceRecord = {
  key: "RUNTIME_WORKFLOW_ACCEPTANCE" | "ROLE_TRAINING" | "MONITORING_PLAN" | "ROLLBACK_PLAN" | "PAUSE_CONTROL";
  status: DiagnosticPilotEvidenceStatus;
  evidenceReference: string;
  reviewedBy: string;
  reviewedAt: string;
  evidenceChecksum: string;
  note: string;
};

export type DiagnosticPilotEvidenceSnapshot = {
  evidenceSetId: string;
  organizationId: string;
  recordedAt: string;
  recordedBy: string;
  requestedMode: DiagnosticPilotGateMode;
  operationalReadiness: Pick<DiagnosticRelease4OperationalReadinessResult, "status" | "resultChecksum" | "packets"> | null;
  reviewApproval: Pick<DiagnosticRelease4ReviewApprovalResult, "status" | "resultChecksum"> | null;
  replay: Pick<DiagnosticRelease4PilotReplayResult, "status" | "resultChecksum" | "caseCount" | "metrics" | "warningCodes"> | null;
  evidenceRecords: DiagnosticPilotEvidenceRecord[];
  acceptanceSignedBy: string[];
  unresolvedRisks: DiagnosticPilotRiskDisposition[];
  repositoryChecksum: string;
};

export type DiagnosticPilotEvidenceRepository = {
  getLatestEvidenceSnapshot(organizationId: string): Promise<DiagnosticPilotEvidenceSnapshot | null>;
  recordEvidenceSnapshot?(snapshot: DiagnosticPilotEvidenceSnapshot): Promise<DiagnosticPilotEvidenceSnapshot>;
};

export type DiagnosticPilotReadinessModel = {
  version: string;
  generatedAt: string;
  evidenceSetId: string | null;
  evidenceRepositoryStatus: "EMPTY" | "LOADED";
  evidenceRepositoryChecksum: string | null;
  result: DiagnosticRelease4PilotGateResult;
};

const zeroMetrics = {
  meanGuideVsActualLaborVariancePercent: 0,
  meanConsoleVsActualLaborVariancePercent: 0,
  meanEstimateVariancePercent: 0,
  overrideRatePercent: 0,
  missedItemRatePercent: 0,
  abstentionQualityPercent: 0
};

const missingOperationalReadiness = { status: "BLOCKED" as const, resultChecksum: "", packets: [] };
const missingReviewApproval = { status: "BLOCKED" as const, resultChecksum: "" };
const missingReplay = { status: "BLOCKED" as const, resultChecksum: "", caseCount: 0, metrics: zeroMetrics, warningCodes: ["DGG6_PILOT_EVIDENCE_REPOSITORY_EMPTY"] };
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

type DiagnosticPilotEvidenceSnapshotRow = {
  id: string;
  organizationId: string;
  evidenceSetId: string;
  recordedAt: Date;
  recordedBy: string;
  requestedMode: DiagnosticPilotGateMode;
  operationalReadiness: unknown;
  reviewApproval: unknown;
  replay: unknown;
  evidenceRecords: unknown;
  acceptanceSignedBy: unknown;
  unresolvedRisks: unknown;
  repositoryChecksum: string;
};

function snapshotFromRow(row: DiagnosticPilotEvidenceSnapshotRow): DiagnosticPilotEvidenceSnapshot {
  return {
    evidenceSetId: row.evidenceSetId,
    organizationId: row.organizationId,
    recordedAt: row.recordedAt.toISOString(),
    recordedBy: row.recordedBy,
    requestedMode: row.requestedMode,
    operationalReadiness: row.operationalReadiness as DiagnosticPilotEvidenceSnapshot["operationalReadiness"],
    reviewApproval: row.reviewApproval as DiagnosticPilotEvidenceSnapshot["reviewApproval"],
    replay: row.replay as DiagnosticPilotEvidenceSnapshot["replay"],
    evidenceRecords: Array.isArray(row.evidenceRecords) ? row.evidenceRecords as DiagnosticPilotEvidenceRecord[] : [],
    acceptanceSignedBy: Array.isArray(row.acceptanceSignedBy) ? row.acceptanceSignedBy.map(String) : [],
    unresolvedRisks: Array.isArray(row.unresolvedRisks) ? row.unresolvedRisks as DiagnosticPilotRiskDisposition[] : [],
    repositoryChecksum: row.repositoryChecksum
  };
}

export function createEmptyDiagnosticPilotEvidenceRepository(): DiagnosticPilotEvidenceRepository {
  return {
    async getLatestEvidenceSnapshot() {
      return null;
    }
  };
}

export function createDiagnosticPilotEvidenceRepository(database: PrismaClient = prisma): DiagnosticPilotEvidenceRepository {
  return {
    async getLatestEvidenceSnapshot(organizationId) {
      const rows = await database.$queryRaw<DiagnosticPilotEvidenceSnapshotRow[]>`
        SELECT
          "id",
          "organizationId",
          "evidenceSetId",
          "recordedAt",
          "recordedBy",
          "requestedMode",
          "operationalReadiness",
          "reviewApproval",
          "replay",
          "evidenceRecords",
          "acceptanceSignedBy",
          "unresolvedRisks",
          "repositoryChecksum"
        FROM "DiagnosticPilotEvidenceSnapshot"
        WHERE "organizationId" = ${organizationId}
        ORDER BY "recordedAt" DESC, "createdAt" DESC
        LIMIT 1
      `;
      return rows[0] ? snapshotFromRow(rows[0]) : null;
    },
    async recordEvidenceSnapshot(snapshot) {
      const existing = await database.$queryRaw<DiagnosticPilotEvidenceSnapshotRow[]>`
        SELECT
          "id",
          "organizationId",
          "evidenceSetId",
          "recordedAt",
          "recordedBy",
          "requestedMode",
          "operationalReadiness",
          "reviewApproval",
          "replay",
          "evidenceRecords",
          "acceptanceSignedBy",
          "unresolvedRisks",
          "repositoryChecksum"
        FROM "DiagnosticPilotEvidenceSnapshot"
        WHERE "organizationId" = ${snapshot.organizationId}
          AND "evidenceSetId" = ${snapshot.evidenceSetId}
        LIMIT 1
      `;
      if (existing[0]) {
        if (existing[0].repositoryChecksum !== snapshot.repositoryChecksum) {
          throw new Error("DG-G6 evidence set id was reused with a different checksum.");
        }
        return snapshotFromRow(existing[0]);
      }
      const id = randomUUID();
      await database.$executeRaw`
        INSERT INTO "DiagnosticPilotEvidenceSnapshot" (
          "id",
          "organizationId",
          "evidenceSetId",
          "recordedAt",
          "recordedBy",
          "requestedMode",
          "operationalReadiness",
          "reviewApproval",
          "replay",
          "evidenceRecords",
          "acceptanceSignedBy",
          "unresolvedRisks",
          "repositoryChecksum",
          "createdAt"
        ) VALUES (
          ${id},
          ${snapshot.organizationId},
          ${snapshot.evidenceSetId},
          ${new Date(snapshot.recordedAt)},
          ${snapshot.recordedBy},
          ${snapshot.requestedMode},
          ${snapshot.operationalReadiness === null ? null : json(snapshot.operationalReadiness)},
          ${snapshot.reviewApproval === null ? null : json(snapshot.reviewApproval)},
          ${snapshot.replay === null ? null : json(snapshot.replay)},
          ${json(snapshot.evidenceRecords)},
          ${json(snapshot.acceptanceSignedBy)},
          ${json(snapshot.unresolvedRisks)},
          ${snapshot.repositoryChecksum},
          NOW()
        )
      `;
      return snapshot;
    }
  };
}

export function createInMemoryDiagnosticPilotEvidenceRepository(initialSnapshots: DiagnosticPilotEvidenceSnapshot[] = []): DiagnosticPilotEvidenceRepository {
  const snapshots = [...initialSnapshots];
  return {
    async getLatestEvidenceSnapshot(organizationId) {
      return snapshots
        .filter((snapshot) => snapshot.organizationId === organizationId)
        .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))[0] ?? null;
    },
    async recordEvidenceSnapshot(snapshot) {
      snapshots.push(snapshot);
      return snapshot;
    }
  };
}

export function buildDiagnosticPilotEvidenceSnapshot(input: Omit<DiagnosticPilotEvidenceSnapshot, "repositoryChecksum">): DiagnosticPilotEvidenceSnapshot {
  return { ...input, repositoryChecksum: hashEnterpriseCommand({ version: DIAGNOSTIC_DG_G6_PILOT_EVIDENCE_REPOSITORY_VERSION, input }) };
}

function acceptedEvidence(snapshot: DiagnosticPilotEvidenceSnapshot | null, key: DiagnosticPilotEvidenceRecord["key"]) {
  const record = snapshot?.evidenceRecords.find((item) => item.key === key);
  return Boolean(record
    && record.status === "ACCEPTED"
    && record.evidenceReference.trim()
    && record.reviewedBy.trim()
    && record.reviewedAt.trim()
    && record.note.trim().length >= 10
    && validChecksum(record.evidenceChecksum));
}

function blockedGate(actor: AuthenticatedUser, generatedAt: Date): DiagnosticRelease4PilotGateResult {
  return evaluateDiagnosticRelease4PilotGate({
    occurredAt: generatedAt.toISOString(),
    requestedMode: "CONTROLLED_PILOT",
    requestedBy: actor.id,
    operationalReadiness: missingOperationalReadiness,
    reviewApproval: missingReviewApproval,
    replay: missingReplay,
    runtimeWorkflowAcceptanceComplete: false,
    roleTrainingComplete: false,
    monitoringPlanDocumented: false,
    rollbackPlanDocumented: false,
    pauseControlVerified: false,
    acceptanceSignedBy: [],
    unresolvedRisks: []
  });
}

export async function getDiagnosticRelease4PilotReadiness(actor: AuthenticatedUser | null, input: {
  now?: () => Date;
  organizationId?: string;
  repository?: DiagnosticPilotEvidenceRepository;
} = {}): Promise<DiagnosticPilotReadinessModel> {
  const user = assertAuthenticatedUser(actor);
  if (!canReviewWorkflows(user)) throw new Error("Manager access is required.");
  const now = input.now ?? (() => new Date());
  const generatedAt = now();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const repository = input.repository ?? createDiagnosticPilotEvidenceRepository();
  const snapshot = await repository.getLatestEvidenceSnapshot(organizationId);

  if (!snapshot) {
    return {
      version: DIAGNOSTIC_DG_G6_PILOT_EVIDENCE_REPOSITORY_VERSION,
      generatedAt: generatedAt.toISOString(),
      evidenceSetId: null,
      evidenceRepositoryStatus: "EMPTY",
      evidenceRepositoryChecksum: null,
      result: blockedGate(user, generatedAt)
    };
  }

  const result = evaluateDiagnosticRelease4PilotGate({
    occurredAt: snapshot.recordedAt || generatedAt.toISOString(),
    requestedMode: snapshot.requestedMode,
    requestedBy: snapshot.recordedBy || user.id,
    operationalReadiness: snapshot.operationalReadiness ?? missingOperationalReadiness,
    reviewApproval: snapshot.reviewApproval ?? missingReviewApproval,
    replay: snapshot.replay ?? missingReplay,
    runtimeWorkflowAcceptanceComplete: acceptedEvidence(snapshot, "RUNTIME_WORKFLOW_ACCEPTANCE"),
    roleTrainingComplete: acceptedEvidence(snapshot, "ROLE_TRAINING"),
    monitoringPlanDocumented: acceptedEvidence(snapshot, "MONITORING_PLAN"),
    rollbackPlanDocumented: acceptedEvidence(snapshot, "ROLLBACK_PLAN"),
    pauseControlVerified: acceptedEvidence(snapshot, "PAUSE_CONTROL"),
    acceptanceSignedBy: snapshot.acceptanceSignedBy,
    unresolvedRisks: snapshot.unresolvedRisks
  });

  return {
    version: DIAGNOSTIC_DG_G6_PILOT_EVIDENCE_REPOSITORY_VERSION,
    generatedAt: generatedAt.toISOString(),
    evidenceSetId: snapshot.evidenceSetId,
    evidenceRepositoryStatus: "LOADED",
    evidenceRepositoryChecksum: snapshot.repositoryChecksum,
    result
  };
}
