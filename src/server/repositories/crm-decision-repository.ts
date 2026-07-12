import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

const crmDecisionSelect = {
  id: true,
  organizationId: true,
  decisionType: true,
  algorithmVersion: true,
  customerId: true,
  subjectType: true,
  subjectId: true,
  normalizedInput: true,
  score: true,
  priority: true,
  recommendedOwnerId: true,
  recommendedActionCode: true,
  dueAt: true,
  reasonCodes: true,
  explanation: true,
  confidence: true,
  missingInputs: true,
  managerReviewRequired: true,
  decidedAt: true,
  overriddenAt: true,
  overriddenByUserId: true,
  overrideReason: true,
  overrideSnapshot: true,
  finalOutcome: true,
  createdAt: true,
  overriddenByUser: { select: { id: true, name: true, email: true } }
} satisfies Prisma.CrmDecisionRecordSelect;

export type CrmDecisionRecord = Prisma.CrmDecisionRecordGetPayload<{
  select: typeof crmDecisionSelect;
}>;

export type CreateCrmDecisionRecordInput = {
  organizationId: string;
  decisionType: string;
  algorithmVersion: string;
  customerId: string | null;
  subjectType: string;
  subjectId: string;
  normalizedInput: Prisma.InputJsonValue;
  score: number | null;
  priority: string | null;
  recommendedOwnerId: string | null;
  recommendedActionCode: string | null;
  dueAt: Date | null;
  reasonCodes: Prisma.InputJsonValue;
  explanation: string;
  confidence: string;
  missingInputs: Prisma.InputJsonValue;
  managerReviewRequired: boolean;
  decidedAt: Date;
};

export type OverrideCrmDecisionRecordInput = {
  id: string;
  organizationId: string;
  actorUserId: string;
  reason: string;
  snapshot: Prisma.InputJsonValue;
  overriddenAt: Date;
};

export type CrmDecisionRepository = {
  create(input: CreateCrmDecisionRecordInput): Promise<CrmDecisionRecord>;
  findById(organizationId: string, id: string): Promise<CrmDecisionRecord | null>;
  override(input: OverrideCrmDecisionRecordInput): Promise<CrmDecisionRecord>;
};

export function createCrmDecisionRepository(
  database: Pick<PrismaClient, "crmDecisionRecord"> = prisma
): CrmDecisionRepository {
  return {
    create(input) {
      return database.crmDecisionRecord.create({ data: input, select: crmDecisionSelect });
    },
    findById(organizationId, id) {
      return database.crmDecisionRecord.findFirst({
        where: { id, organizationId },
        select: crmDecisionSelect
      });
    },
    override(input) {
      return database.crmDecisionRecord.update({
        where: { id: input.id, organizationId: input.organizationId },
        data: {
          overriddenAt: input.overriddenAt,
          overriddenByUserId: input.actorUserId,
          overrideReason: input.reason,
          overrideSnapshot: input.snapshot
        },
        select: crmDecisionSelect
      });
    }
  };
}
