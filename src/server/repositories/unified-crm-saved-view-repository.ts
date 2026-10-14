import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmSavedViewVisibility } from "@/server/unified-crm/saved-view-contract";

export type UnifiedCrmSavedViewRecord = {
  config: unknown;
  configSchemaVersion: number;
  createdAt: Date;
  createdByUser: { id: string; name: string };
  id: string;
  name: string;
  updatedAt: Date;
  version: number;
  visibility: UnifiedCrmSavedViewVisibility;
};

export type UnifiedCrmSavedViewRepository = {
  create(input: {
    config: Record<string, unknown>;
    configSchemaVersion: number;
    createdByUserId: string;
    name: string;
    organizationId: string;
    visibility: UnifiedCrmSavedViewVisibility;
  }): Promise<UnifiedCrmSavedViewRecord>;
  find(input: { id: string; organizationId: string; userId: string }): Promise<UnifiedCrmSavedViewRecord | null>;
  list(input: { organizationId: string; userId: string }): Promise<UnifiedCrmSavedViewRecord[]>;
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  remove(input: { id: string; organizationId: string }): Promise<void>;
};

type UnifiedCrmSavedViewDatabase = Pick<PrismaClient, "$executeRaw" | "$queryRaw" | "userLocationAccess">;

type SavedViewRow = {
  config: unknown;
  configSchemaVersion: number;
  createdAt: Date;
  createdByUserId: string;
  createdByUserName: string | null;
  id: string;
  name: string;
  updatedAt: Date;
  version: number;
  visibility: UnifiedCrmSavedViewVisibility;
};

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapRow(row: SavedViewRow): UnifiedCrmSavedViewRecord {
  return {
    config: row.config,
    configSchemaVersion: row.configSchemaVersion,
    createdAt: row.createdAt,
    createdByUser: { id: row.createdByUserId, name: row.createdByUserName ?? "Unknown user" },
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    version: row.version,
    visibility: row.visibility
  };
}

const rowSelect = Prisma.sql`
  SELECT
    sv.id,
    sv.name,
    sv.visibility::text AS visibility,
    sv.config,
    sv."configSchemaVersion",
    sv.version,
    sv."createdAt",
    sv."updatedAt",
    sv."createdByUserId",
    u.name AS "createdByUserName"
  FROM "UnifiedCrmSavedView" sv
  LEFT JOIN "User" u ON u.id = sv."createdByUserId"
`;

export function createUnifiedCrmSavedViewRepository(
  database: UnifiedCrmSavedViewDatabase = prisma
): UnifiedCrmSavedViewRepository {
  return {
    async create(input) {
      const id = randomUUID();
      const rows = await database.$queryRaw<SavedViewRow[]>(Prisma.sql`
        INSERT INTO "UnifiedCrmSavedView" (
          id, "organizationId", "createdByUserId", name, visibility, config, "configSchemaVersion"
        )
        VALUES (
          ${id}, ${input.organizationId}, ${input.createdByUserId}, ${input.name},
          ${input.visibility}::"UnifiedCrmSavedViewVisibility",
          CAST(${json(input.config)} AS jsonb),
          ${input.configSchemaVersion}
        )
        RETURNING
          id,
          name,
          visibility::text AS visibility,
          config,
          "configSchemaVersion",
          version,
          "createdAt",
          "updatedAt",
          "createdByUserId",
          (SELECT name FROM "User" WHERE id = ${input.createdByUserId}) AS "createdByUserName"
      `);
      return mapRow(rows[0]!);
    },
    async find(input) {
      const rows = await database.$queryRaw<SavedViewRow[]>(Prisma.sql`
        ${rowSelect}
        WHERE sv.id = ${input.id}
          AND sv."organizationId" = ${input.organizationId}
          AND (sv."createdByUserId" = ${input.userId} OR sv.visibility = 'TEAM')
        LIMIT 1
      `);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async list(input) {
      const rows = await database.$queryRaw<SavedViewRow[]>(Prisma.sql`
        ${rowSelect}
        WHERE sv."organizationId" = ${input.organizationId}
          AND (sv."createdByUserId" = ${input.userId} OR sv.visibility = 'TEAM')
        ORDER BY sv.visibility ASC, sv."updatedAt" DESC, sv.name ASC
        LIMIT 50
      `);
      return rows.map(mapRow);
    },
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
    async remove(input) {
      await database.$executeRaw`
        DELETE FROM "UnifiedCrmSavedView"
        WHERE id = ${input.id}
          AND "organizationId" = ${input.organizationId}
      `;
    }
  };
}
