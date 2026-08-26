import { createHash, randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import type {
  UnifiedCrmForecastCategory,
  UnifiedCrmForecastSnapshot,
  UnifiedCrmForecastSource,
  UnifiedCrmForecastSubmission
} from "@/server/unified-crm/forecast-contract";
import { UnifiedCrmForecastError } from "@/server/unified-crm/forecast-contract";

export type UnifiedCrmForecastOpportunityRecord = {
  id: string;
  organizationId: string;
  opportunityNumber: string;
  title: string;
  stage: string;
  estimatedValueCents: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
  version: number;
  updatedAt: Date;
};

export type UnifiedCrmForecastRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  findOpportunity(input: {
    opportunityId: string;
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<UnifiedCrmForecastOpportunityRecord | null>;
  listSnapshots(input: {
    opportunityId: string;
    organizationId: string;
  }): Promise<UnifiedCrmForecastSnapshot[]>;
  appendSnapshot(input: {
    actorUserId: string;
    baselineSnapshot: UnifiedCrmForecastSnapshot;
    command: UnifiedCrmForecastSubmission;
    opportunity: UnifiedCrmForecastOpportunityRecord;
  }): Promise<{ duplicate: boolean; snapshot: UnifiedCrmForecastSnapshot }>;
};

type UnifiedCrmForecastDatabase = Pick<PrismaClient, "$queryRaw" | "$transaction" | "enterpriseCommandLedger" | "userLocationAccess">;

type SnapshotRow = {
  amountCents: number;
  category: UnifiedCrmForecastCategory;
  createdAt: Date;
  createdByName: string | null;
  createdByUserId: string;
  id: string;
  inputSnapshot: unknown;
  opportunityId: string;
  probabilityBasisPts: number;
  reason: string;
  source: UnifiedCrmForecastSource;
};

function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function json(value: unknown) {
  return value === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(value));
}

function inputSummary(value: unknown) {
  if (!value || typeof value !== "object") return "Forecast inputs were not recorded.";
  const row = value as Record<string, unknown>;
  return String(row.inputSummary ?? "Forecast inputs were recorded.");
}

function mapSnapshot(row: SnapshotRow): UnifiedCrmForecastSnapshot {
  return {
    amountCents: row.amountCents,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdByName ?? "Unknown",
    createdByUserId: row.createdByUserId,
    id: row.id,
    inputSummary: inputSummary(row.inputSnapshot),
    opportunityId: row.opportunityId,
    probabilityBasisPts: row.probabilityBasisPts,
    reason: row.reason,
    source: row.source
  };
}

export function createUnifiedCrmForecastRepository(
  database: UnifiedCrmForecastDatabase = prisma
): UnifiedCrmForecastRepository {
  return {
    async listActiveOrganizationIds(userId, at) {
      const grants = await database.userLocationAccess.findMany({
        where: {
          userId,
          validFrom: { lte: at },
          OR: [{ validTo: null }, { validTo: { gte: at } }]
        },
        select: { location: { select: { organizationId: true } } }
      });
      return [...new Set(grants.map((grant) => grant.location.organizationId))].sort();
    },
    async findOpportunity(input) {
      const ownerScope = input.recordScope.kind === "ORGANIZATION"
        ? Prisma.sql`TRUE`
        : Prisma.sql`o."ownerUserId" = ${input.recordScope.ownerUserId}`;
      const rows = await database.$queryRaw<UnifiedCrmForecastOpportunityRecord[]>(Prisma.sql`
        SELECT
          o.id,
          o."organizationId",
          o."opportunityNumber",
          o.title,
          o.stage::text AS stage,
          o."estimatedValueCents",
          o."ownerUserId",
          u.name AS "ownerName",
          o.version,
          o."updatedAt"
        FROM "UnifiedCrmOpportunityRecord" o
        LEFT JOIN "User" u ON u.id = o."ownerUserId"
        WHERE o.id = ${input.opportunityId}
          AND o."organizationId" = ${input.organizationId}
          AND o."archivedAt" IS NULL
          AND ${ownerScope}
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
    async listSnapshots(input) {
      const rows = await database.$queryRaw<SnapshotRow[]>(Prisma.sql`
        SELECT
          s.id,
          s."opportunityId",
          s.source::text AS source,
          s.category::text AS category,
          s."amountCents",
          s."probabilityBasisPts",
          s.reason,
          s."inputSnapshot",
          s."createdByUserId",
          u.name AS "createdByName",
          s."createdAt"
        FROM "UnifiedCrmForecastSnapshot" s
        LEFT JOIN "User" u ON u.id = s."createdByUserId"
        WHERE s."organizationId" = ${input.organizationId}
          AND s."opportunityId" = ${input.opportunityId}
        ORDER BY s."createdAt" DESC, s.id DESC
      `);
      return rows.map(mapSnapshot);
    },
    appendSnapshot(input) {
      const payload = {
        amountCents: input.command.amountCents,
        baselineSnapshotId: input.baselineSnapshot.id,
        category: input.command.category,
        expectedVersion: input.command.expectedVersion,
        opportunityId: input.opportunity.id,
        probabilityBasisPts: input.command.probabilityBasisPts,
        reason: input.command.reason,
        source: input.command.source
      };
      const hash = requestHash(payload);
      return database.$transaction(async (tx) => {
        const existing = await tx.enterpriseCommandLedger.findFirst({
          where: {
            commandType: "CRM_FORECAST_SUBMIT",
            idempotencyKey: input.command.idempotencyKey,
            organizationId: input.opportunity.organizationId
          },
          select: { requestHash: true, resultSnapshot: true }
        });
        if (existing) {
          if (existing.requestHash !== hash) {
            throw new UnifiedCrmForecastError("IDEMPOTENCY_KEY_REUSED", "Forecast idempotency key was reused with different input.");
          }
          return {
            duplicate: true,
            snapshot: existing.resultSnapshot as UnifiedCrmForecastSnapshot
          };
        }
        if (input.opportunity.version !== input.command.expectedVersion) {
          throw new UnifiedCrmForecastError("FORECAST_VERSION_CONFLICT", "Opportunity forecast inputs changed. Reload and try again.");
        }
        const snapshotId = randomUUID();
        const rows = await tx.$queryRaw<SnapshotRow[]>(Prisma.sql`
          INSERT INTO "UnifiedCrmForecastSnapshot" (
            "id", "organizationId", "opportunityId", "source", "category", "amountCents",
            "probabilityBasisPts", "reason", "inputSnapshot", "createdByUserId"
          )
          VALUES (
            ${snapshotId}, ${input.opportunity.organizationId}, ${input.opportunity.id},
            ${input.command.source}::"UnifiedCrmForecastSource", ${input.command.category}::"UnifiedCrmForecastCategory",
            ${input.command.amountCents}, ${input.command.probabilityBasisPts}, ${input.command.reason},
            CAST(${json({
              baselineSnapshotId: input.baselineSnapshot.id,
              inputSummary: `Human judgment recorded against baseline ${input.baselineSnapshot.category} at ${input.baselineSnapshot.probabilityBasisPts / 100}% probability.`,
              opportunityVersion: input.opportunity.version
            })} AS jsonb),
            ${input.actorUserId}
          )
          RETURNING
            "id", "opportunityId", source::text AS source, category::text AS category, "amountCents",
            "probabilityBasisPts", reason, "inputSnapshot", "createdByUserId", NULL::text AS "createdByName", "createdAt"
        `);
        const snapshot = mapSnapshot(rows[0]!);
        await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.actorUserId,
            commandType: "CRM_FORECAST_SUBMIT",
            completedAt: new Date(),
            correlationId: input.command.idempotencyKey,
            domain: "UNIFIED_CRM",
            expectedVersion: input.command.expectedVersion,
            idempotencyKey: input.command.idempotencyKey,
            organizationId: input.opportunity.organizationId,
            requestHash: hash,
            resultSnapshot: json(snapshot),
            resultingVersion: null,
            status: "SUCCEEDED",
            subjectId: input.opportunity.id,
            subjectType: "UnifiedCrmOpportunityRecord"
          }
        });
        return { duplicate: false, snapshot };
      });
    }
  };
}
