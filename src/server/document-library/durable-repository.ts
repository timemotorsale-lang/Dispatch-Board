import type { DocumentLibraryState } from "./repository";
import { buildDocumentLibraryPersistencePlan, defaultDocumentPacketTemplates } from "./storage-platform";
import { evaluateDocumentStorageReleaseGate, type DocumentStorageRolloutEvidence } from "./storage-rollout";

export const DOCUMENT_LIBRARY_DURABLE_REPOSITORY_VERSION = "document-library.durable-repository/v1";

type CreateManyInput = { data: unknown[]; skipDuplicates?: boolean };
type DeleteManyInput = { where: Record<string, unknown> };
type UpsertInput = { create: Record<string, unknown>; update: Record<string, unknown>; where: Record<string, unknown> };

type CreateManyDelegate = {
  createMany(input: CreateManyInput): Promise<unknown>;
  deleteMany?(input: DeleteManyInput): Promise<unknown>;
};

type UpsertDelegate = {
  upsert(input: UpsertInput): Promise<unknown>;
};

export type DocumentLibraryDurableDatabase = {
  documentLibraryAuditEvent: CreateManyDelegate;
  documentLibraryDocument: UpsertDelegate;
  documentLibraryPacket: UpsertDelegate;
  documentLibraryPacketDocument: CreateManyDelegate;
  documentLibraryPacketRequirement: CreateManyDelegate;
  documentLibraryPacketTemplate: UpsertDelegate;
  documentLibraryProviderReference: CreateManyDelegate;
  documentLibraryReleaseGate: UpsertDelegate;
  $transaction?<T>(callback: (tx: DocumentLibraryDurableDatabase) => Promise<T>): Promise<T>;
};

export type DocumentLibraryDurableRepository = {
  persistReleaseGate(input: {
    evaluatedByUserId: string;
    evidence: DocumentStorageRolloutEvidence;
  }): Promise<{ blockerCount: number; readyForRelease: boolean }>;
  persistSnapshot(input: {
    state: DocumentLibraryState;
  }): Promise<{
    auditEvents: number;
    documents: number;
    packetDocuments: number;
    packetRequirements: number;
    packets: number;
    providerReferences: number;
  }>;
  seedPacketTemplates(input: { actorId: string }): Promise<{ templates: number }>;
};

export function isDocumentLibraryDurableRepositoryEnabled(
  env: { DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED?: string | undefined } = {
    DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED: process.env.DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED
  }
) {
  return env.DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED === "true";
}

function cleanUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function auditSubjectLinks(subjectType: "DOCUMENT" | "PACKET" | "REQUIREMENT", subjectId: string) {
  return {
    documentId: subjectType === "DOCUMENT" ? subjectId : null,
    packetId: subjectType === "PACKET" ? subjectId : null
  };
}

export function createDocumentLibraryDurableRepository(input: {
  database: DocumentLibraryDurableDatabase;
  locationId?: string | null;
  now?: () => Date;
  organizationId: string;
}): DocumentLibraryDurableRepository {
  const { database, locationId = null, organizationId } = input;
  const now = input.now ?? (() => new Date());

  async function withTransaction<T>(callback: (tx: DocumentLibraryDurableDatabase) => Promise<T>) {
    return database.$transaction ? database.$transaction(callback) : callback(database);
  }

  return {
    async persistReleaseGate({ evaluatedByUserId, evidence }) {
      const gate = evaluateDocumentStorageReleaseGate(evidence);
      const evaluatedAt = now();
      await database.documentLibraryReleaseGate.upsert({
        create: {
          checklist: gate.milestones,
          evidence,
          evaluatedAt,
          evaluatedByUserId,
          gateKey: "document-library.release-rollout",
          id: `document-library-release-${organizationId}`,
          organizationId,
          status: gate.readyForRelease ? "READY" : "BLOCKED"
        },
        update: {
          checklist: gate.milestones,
          evidence,
          evaluatedAt,
          evaluatedByUserId,
          status: gate.readyForRelease ? "READY" : "BLOCKED"
        },
        where: {
          organizationId_gateKey: {
            gateKey: "document-library.release-rollout",
            organizationId
          }
        }
      });
      return { blockerCount: gate.blockers.length, readyForRelease: gate.readyForRelease };
    },
    async persistSnapshot({ state }) {
      const plan = buildDocumentLibraryPersistencePlan(state);
      await withTransaction(async (tx) => {
        for (const document of plan.documents) {
          const row = {
            archivedAt: document.status === "ARCHIVED" ? now() : null,
            classificationSnapshot: { source: "document-library-snapshot" },
            contentType: document.contentType ?? null,
            createdByUserId: null,
            documentType: document.documentType,
            fileName: document.fileName,
            id: document.id,
            legalHold: document.legalHold,
            locationId,
            organizationId,
            ownerId: document.ownerId,
            ownerLabel: document.ownerLabel,
            ownerType: document.ownerType,
            retentionCategory: document.retentionCategory,
            sensitivity: document.sensitivity,
            source: document.source,
            status: document.status,
            storageProvider: document.storageProvider,
            storageReference: document.storageReference,
            storageVersion: document.storageVersion,
            updatedByUserId: null
          };
          await tx.documentLibraryDocument.upsert({
            create: cleanUndefined(row),
            update: cleanUndefined({ ...row, id: undefined, organizationId: undefined }),
            where: { id: document.id }
          });
        }

        for (const packet of plan.packets) {
          const row = {
            createdByUserId: null,
            id: packet.id,
            locationId,
            organizationId,
            ownerId: packet.ownerId,
            ownerLabel: packet.ownerLabel,
            ownerType: packet.ownerType,
            packetType: packet.packetType,
            status: packet.status,
            title: packet.title,
            updatedByUserId: null,
            workflow: packet.workflow
          };
          await tx.documentLibraryPacket.upsert({
            create: cleanUndefined(row),
            update: cleanUndefined({ ...row, id: undefined, organizationId: undefined }),
            where: { id: packet.id }
          });
        }

        await tx.documentLibraryPacketRequirement.deleteMany?.({ where: { organizationId } });
        await tx.documentLibraryPacketDocument.deleteMany?.({ where: { organizationId } });
        await tx.documentLibraryProviderReference.deleteMany?.({ where: { organizationId } });

        await tx.documentLibraryPacketRequirement.createMany({
          data: plan.packetRequirements.map((requirement) => ({
            documentType: requirement.documentType,
            id: `${requirement.packetId}-${requirement.documentType}`,
            label: requirement.label,
            organizationId,
            packetId: requirement.packetId,
            required: requirement.required,
            status: requirement.status,
            waiverReason: requirement.waiverReason
          })),
          skipDuplicates: true
        });
        await tx.documentLibraryPacketDocument.createMany({
          data: plan.packetDocuments.map((link) => ({
            documentId: link.documentId,
            id: `${link.packetId}-${link.documentId}`,
            organizationId,
            packetId: link.packetId,
            relationship: link.relationship
          })),
          skipDuplicates: true
        });
        await tx.documentLibraryProviderReference.createMany({
          data: plan.providerReferences.map((reference) => ({
            documentId: reference.documentId,
            externalId: reference.externalId,
            family: reference.family,
            health: reference.health,
            id: `${reference.documentId}-${reference.provider}-${reference.externalId}`,
            organizationId,
            provider: reference.provider,
            readOnly: reference.readOnly,
            url: reference.url
          })),
          skipDuplicates: true
        });
        await tx.documentLibraryAuditEvent.createMany({
          data: plan.auditEvents.map((event) => ({
            ...auditSubjectLinks(event.subjectType, event.subjectId),
            action: event.action,
            actorUserId: event.actorUserId,
            id: `${event.action}-${event.idempotencyKey}`,
            idempotencyKey: event.idempotencyKey,
            locationId,
            metadata: { source: DOCUMENT_LIBRARY_DURABLE_REPOSITORY_VERSION },
            note: event.note,
            organizationId,
            subjectId: event.subjectId,
            subjectType: event.subjectType
          })),
          skipDuplicates: true
        });
      });

      return {
        auditEvents: plan.auditEvents.length,
        documents: plan.documents.length,
        packetDocuments: plan.packetDocuments.length,
        packetRequirements: plan.packetRequirements.length,
        packets: plan.packets.length,
        providerReferences: plan.providerReferences.length
      };
    },
    async seedPacketTemplates({ actorId }) {
      for (const template of defaultDocumentPacketTemplates) {
        await database.documentLibraryPacketTemplate.upsert({
          create: {
            createdByUserId: actorId,
            id: `${organizationId}-${template.templateKey}`,
            organizationId,
            packetType: template.packetType,
            requirements: template.requirements,
            status: "ACTIVE",
            templateKey: template.templateKey,
            title: template.title,
            updatedByUserId: actorId,
            workflow: template.workflow
          },
          update: {
            packetType: template.packetType,
            requirements: template.requirements,
            status: "ACTIVE",
            title: template.title,
            updatedByUserId: actorId,
            workflow: template.workflow
          },
          where: {
            organizationId_templateKey: {
              organizationId,
              templateKey: template.templateKey
            }
          }
        });
      }

      return { templates: defaultDocumentPacketTemplates.length };
    }
  };
}
