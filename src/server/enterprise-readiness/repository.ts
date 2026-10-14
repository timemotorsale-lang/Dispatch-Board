import type { PrismaClient } from "@prisma/client";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";

type PilotCreate = { code: string; name: string; ownerUserId: string; supportOwnerUserId: string | null; scope: unknown; thresholds: unknown; pauseCriteria: unknown; rollbackPlan: unknown; baseline: unknown };
type EvidenceWrite = { gateCode: string; status: "IN_PROGRESS" | "SUBMITTED"; summary: string; evidenceReferences: unknown; measurements: unknown; submittedByUserId: string; expiresAt: Date | null };
type EvidenceReview = { gateCode: string; status: "PASSED" | "FAILED" | "WAIVED"; reviewerUserId: string; waiverAuthority?: string | null; waiverReason?: string | null };
type SignoffWrite = { dimension: string; decision: "APPROVE" | "REJECT"; signerUserId: string; reason: string; evidenceRefs: unknown };

export function createEnterpriseReadinessRepository(database: PrismaClient) {
  const execute = (command: EnterpriseCommandCommitInput, mutate: Parameters<typeof executeAggregateMutation>[3]) => executeAggregateMutation(database, command, "vehicle-operations.enterprise-readiness", mutate);
  return {
    aggregateVersion: async (organizationId: string, pilotId: string) => (await database.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { organizationId, domain: "ENTERPRISE_READINESS", subjectType: "INVENTORY_CONSOLE_PILOT", subjectId: pilotId } }, select: { version: true } }))?.version ?? 0,
    get: (organizationId: string, pilotId: string) => database.inventoryConsolePilot.findFirst({ where: { id: pilotId, organizationId }, include: { evidence: { orderBy: { gateCode: "asc" } }, signoffs: { orderBy: { dimension: "asc" } } } }),
    list: (organizationId: string) => database.inventoryConsolePilot.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" }, include: { evidence: { orderBy: { gateCode: "asc" } }, signoffs: { orderBy: { dimension: "asc" } } } }),
    create: (command: EnterpriseCommandCommitInput, data: PilotCreate) => execute(command, async (tx, version) => {
      const pilot = await tx.inventoryConsolePilot.create({ data: { id: command.subjectId, organizationId: command.organizationId, code: data.code, name: data.name, ownerUserId: data.ownerUserId, supportOwnerUserId: data.supportOwnerUserId, scopeSnapshot: toJson(data.scope), thresholdSnapshot: toJson(data.thresholds), pauseCriteriaSnapshot: toJson(data.pauseCriteria), rollbackPlanSnapshot: toJson(data.rollbackPlan), baselineSnapshot: toJson(data.baseline), outcomeSnapshot: {}, version } });
      return { result: pilot };
    }),
    writeEvidence: (command: EnterpriseCommandCommitInput, data: EvidenceWrite) => execute(command, async (tx, version) => {
      const currentPilot = await tx.inventoryConsolePilot.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId }, select: { status: true } });
      if (!currentPilot) throw new Error("Inventory Console pilot was not found.");
      const prior = await tx.inventoryConsoleReadinessEvidence.findUnique({ where: { pilotId_gateCode: { pilotId: command.subjectId, gateCode: data.gateCode } } });
      const evidence = await tx.inventoryConsoleReadinessEvidence.upsert({ where: { pilotId_gateCode: { pilotId: command.subjectId, gateCode: data.gateCode } }, create: { organizationId: command.organizationId, pilotId: command.subjectId, gateCode: data.gateCode, status: data.status, summary: data.summary, evidenceReferences: toJson(data.evidenceReferences), measurementSnapshot: toJson(data.measurements), submittedByUserId: data.status === "SUBMITTED" ? data.submittedByUserId : null, submittedAt: data.status === "SUBMITTED" ? new Date() : null, expiresAt: data.expiresAt, version: 1 }, update: { status: data.status, summary: data.summary, evidenceReferences: toJson(data.evidenceReferences), measurementSnapshot: toJson(data.measurements), submittedByUserId: data.status === "SUBMITTED" ? data.submittedByUserId : null, submittedAt: data.status === "SUBMITTED" ? new Date() : null, reviewedByUserId: null, reviewedAt: null, waiverAuthority: null, waiverReason: null, expiresAt: data.expiresAt, version: { increment: 1 } } });
      await tx.inventoryConsolePilot.update({ where: { id: command.subjectId }, data: { status: ["DRAFT", "EVIDENCE_IN_PROGRESS"].includes(currentPilot.status) ? "EVIDENCE_IN_PROGRESS" : currentPilot.status, version } });
      return { result: evidence, previous: prior };
    }),
    reviewEvidence: (command: EnterpriseCommandCommitInput, data: EvidenceReview) => execute(command, async (tx, version) => {
      const prior = await tx.inventoryConsoleReadinessEvidence.findUnique({ where: { pilotId_gateCode: { pilotId: command.subjectId, gateCode: data.gateCode } } });
      if (!prior || prior.status !== "SUBMITTED") throw new Error("Only submitted readiness evidence can be reviewed.");
      if (prior.submittedByUserId === data.reviewerUserId) throw new Error("Readiness evidence requires an independent reviewer.");
      if (data.status === "WAIVED" && (!data.waiverAuthority?.trim() || !data.waiverReason?.trim())) throw new Error("A waiver requires named authority and a reason.");
      const evidence = await tx.inventoryConsoleReadinessEvidence.update({ where: { id: prior.id }, data: { status: data.status, reviewedByUserId: data.reviewerUserId, reviewedAt: new Date(), waiverAuthority: data.waiverAuthority ?? null, waiverReason: data.waiverReason ?? null, version: { increment: 1 } } });
      await tx.inventoryConsolePilot.update({ where: { id: command.subjectId }, data: { version } });
      return { result: evidence, previous: prior };
    }),
    writeSignoff: (command: EnterpriseCommandCommitInput, data: SignoffWrite) => execute(command, async (tx, version) => {
      const prior = await tx.inventoryConsoleSignoff.findUnique({ where: { pilotId_dimension: { pilotId: command.subjectId, dimension: data.dimension } } });
      const signoff = await tx.inventoryConsoleSignoff.upsert({ where: { pilotId_dimension: { pilotId: command.subjectId, dimension: data.dimension } }, create: { organizationId: command.organizationId, pilotId: command.subjectId, dimension: data.dimension, decision: data.decision, signerUserId: data.signerUserId, reason: data.reason, evidenceRefs: toJson(data.evidenceRefs), decidedAt: new Date() }, update: { decision: data.decision, signerUserId: data.signerUserId, reason: data.reason, evidenceRefs: toJson(data.evidenceRefs), decidedAt: new Date(), version: { increment: 1 } } });
      await tx.inventoryConsolePilot.update({ where: { id: command.subjectId }, data: { version } });
      return { result: signoff, previous: prior };
    }),
    recordOutcomes: (command: EnterpriseCommandCommitInput, outcomeSnapshot: unknown) => execute(command, async (tx, version) => {
      const prior = await tx.inventoryConsolePilot.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
      if (!prior) throw new Error("Inventory Console pilot was not found.");
      const pilot = await tx.inventoryConsolePilot.update({ where: { id: prior.id }, data: { outcomeSnapshot: toJson(outcomeSnapshot), version } });
      return { result: pilot, previous: prior };
    }),
    transition: (command: EnterpriseCommandCommitInput, status: "READY_FOR_AUTHORIZATION" | "AUTHORIZED" | "ACTIVE" | "PAUSED" | "ROLLED_BACK" | "COMPLETED" | "REJECTED", actorUserId: string, note: string) => execute(command, async (tx, version) => {
      const prior = await tx.inventoryConsolePilot.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
      if (!prior) throw new Error("Inventory Console pilot was not found.");
      const pilot = await tx.inventoryConsolePilot.update({ where: { id: prior.id }, data: { status, version, authorizationNote: status === "AUTHORIZED" ? note : prior.authorizationNote, authorizedByUserId: status === "AUTHORIZED" ? actorUserId : prior.authorizedByUserId, authorizedAt: status === "AUTHORIZED" ? new Date() : prior.authorizedAt, activatedByUserId: status === "ACTIVE" ? actorUserId : prior.activatedByUserId, activatedAt: status === "ACTIVE" && !prior.activatedAt ? new Date() : prior.activatedAt, pausedAt: status === "PAUSED" ? new Date() : prior.pausedAt, completedAt: status === "COMPLETED" ? new Date() : prior.completedAt } });
      return { result: pilot, previous: prior };
    })
  };
}
