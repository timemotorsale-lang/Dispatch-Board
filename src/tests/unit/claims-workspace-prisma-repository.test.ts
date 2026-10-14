import { describe, expect, it } from "vitest";

import { createPrismaClaimsWorkspaceRepository } from "@/server/claims-workspace/prisma-repository";
import type { InsuranceClaimRecord } from "@/server/claims-workspace/service";

type ClaimRow = InsuranceClaimRecord & {
  activities: ActivityRow[];
  createdAt: Date;
  evidence: EvidenceRow[];
  organizationId: string;
  updatedAt: Date;
};
type ActivityRow = { action: string; actorUserId: string; at: Date; claimId: string; detail: string; id: string };
type EvidenceRow = {
  category: string;
  claimId: string;
  createdAt: Date;
  createdByUserId: string;
  documentLibraryId?: string | null;
  extractedText?: string | null;
  fileName?: string | null;
  id: string;
  notes?: string | null;
  relationshipTargets: string[];
  status: string;
  title: string;
};
type ClaimCreateInput = { data: InsuranceClaimRecord & { organizationId: string } };
type ClaimFindInput = { where: { id?: string; organizationId: string } };
type ClaimUpdateInput = { data: Partial<ClaimRow> & { version?: { increment: number } }; where: { id: string } };
type ActivityCreateInput = { data: ActivityRow };
type EvidenceCreateInput = { data: EvidenceRow };
type TaskRow = {
  customerReference: string | null;
  description: string;
  id: string;
  status: string;
  title: string;
  updatedAt: Date;
  vehicleReference: string | null;
  workflowArea: string;
};
type FakePrisma = ReturnType<typeof fakePrisma>;

function fakePrisma() {
  const claims: ClaimRow[] = [];
  const evidence: EvidenceRow[] = [];
  const activities: ActivityRow[] = [];
  const tasks: TaskRow[] = [];
  const hydrate = (claim: ClaimRow) => ({
    ...claim,
    activities: activities.filter((item) => item.claimId === claim.id).sort((left, right) => right.at.getTime() - left.at.getTime()),
    evidence: evidence.filter((item) => item.claimId === claim.id).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
  });

  const prisma = {
    $transaction: async <T>(callback: (tx: FakePrisma) => Promise<T>) => callback(prisma),
    insuranceClaim: {
      create: async ({ data }: ClaimCreateInput) => {
        const row = {
          ...data,
          activities: [],
          createdAt: new Date("2026-09-17T20:00:00.000Z"),
          evidence: [],
          updatedAt: new Date("2026-09-17T20:00:00.000Z")
        };
        claims.push(row);
        return hydrate(row);
      },
      findFirst: async ({ where }: ClaimFindInput) => {
        const row = claims.find((claim) => claim.id === where.id && claim.organizationId === where.organizationId);
        return row ? hydrate(row) : null;
      },
      findMany: async ({ where }: ClaimFindInput) => claims.filter((claim) => claim.organizationId === where.organizationId).map(hydrate),
      update: async ({ data, where }: ClaimUpdateInput) => {
        const row = claims.find((claim) => claim.id === where.id);
        if (!row) throw new Error("missing claim");
        Object.assign(row, {
          ...data,
          lastActivityAt: data.lastActivityAt ?? row.lastActivityAt,
          version: data.version?.increment ? row.version + data.version.increment : row.version
        });
        return hydrate(row);
      }
    },
    insuranceClaimActivity: {
      create: async ({ data }: ActivityCreateInput) => {
        activities.push(data);
        return data;
      }
    },
    insuranceClaimEvidence: {
      create: async ({ data }: EvidenceCreateInput) => {
        evidence.push(data);
        return data;
      }
    },
    task: {
      create: (data: TaskRow) => {
        tasks.push(data);
        return data;
      },
      findMany: async () =>
        tasks.filter((task) => task.status !== "COMPLETED" && task.workflowArea === "SERVICE_ADVISOR")
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    }
  };
  return prisma;
}

describe("Prisma claims workspace repository", () => {
  it("persists and rehydrates claim aggregates with evidence and activity", async () => {
    const prisma = fakePrisma();
    const repository = createPrismaClaimsWorkspaceRepository({ organizationId: "org-1", prisma });
    const claim: InsuranceClaimRecord = {
      carrierName: "State Farm",
      claimNumber: "DB-10001",
      createdByUserId: "advisor-1",
      customerName: "Database Customer",
      description: "Front damage.",
      id: "claim-db-1",
      lastActivityAt: "2026-09-17T20:00:00.000Z",
      openedAt: "2026-09-17T20:00:00.000Z",
      ownerUserId: "advisor-1",
      stage: "INTAKE",
      status: "OPEN",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleVin: "VIN-DB-1",
      vehicleYear: "2018",
      version: 1
    };

    const created = await repository.createClaim(claim);
    expect(created.claim).toMatchObject({ claimNumber: "DB-10001", customerName: "Database Customer" });

    const withEvidence = await repository.addEvidence(claim.id, {
      category: "DAMAGE_PHOTO",
      createdAt: "2026-09-17T20:05:00.000Z",
      createdByUserId: "advisor-1",
      id: "evidence-db-1",
      relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
      status: "RECEIVED",
      title: "Damage photos"
    }, {
      approvedAmountCents: 481244,
      approvedAmountConfidence: "HIGH",
      approvedAmountRecordedAt: "2026-09-17T20:05:00.000Z",
      approvedAmountSourceDocumentId: "doc-estimate-1",
      approvedAmountSourceEvidenceId: "evidence-db-1"
    });
    expect(withEvidence.evidence).toHaveLength(1);
    expect(withEvidence.evidence[0]).toMatchObject({ category: "DAMAGE_PHOTO", relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"] });
    expect(withEvidence.claim).toMatchObject({
      approvedAmountCents: 481244,
      approvedAmountConfidence: "HIGH",
      approvedAmountSourceDocumentId: "doc-estimate-1",
      approvedAmountSourceEvidenceId: "evidence-db-1"
    });

    await repository.addActivity(claim.id, {
      action: "CLAIM_NOTE",
      actorUserId: "advisor-1",
      at: "2026-09-17T20:06:00.000Z",
      detail: "Customer called with claim number.",
      id: "activity-db-1"
    });

    const reloaded = await repository.findClaimById(claim.id);
    expect(reloaded?.activities[0]).toMatchObject({ action: "CLAIM_NOTE" });
    expect((await repository.listClaims())[0].claim.version).toBeGreaterThan(1);

    prisma.task.create({
      customerReference: "Database Customer",
      description: "Open the repair-start task for claim DB-10001 after authorization.",
      id: "task-claim-repair",
      status: "IN_PROGRESS",
      title: "Start approved repairs for Database Customer",
      updatedAt: new Date("2026-09-17T20:07:00.000Z"),
      vehicleReference: "2018 Toyota Camry",
      workflowArea: "SERVICE_ADVISOR"
    });
    await expect(repository.findAssociatedRepairTask?.(created)).resolves.toMatchObject({
      href: "/tasks/task-claim-repair",
      id: "task-claim-repair",
      title: "Start approved repairs for Database Customer"
    });
  });
});
