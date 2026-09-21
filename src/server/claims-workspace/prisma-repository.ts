import type {
  ClaimActivityRecord,
  ClaimEvidenceCategory,
  ClaimEvidenceRecord,
  ClaimEvidenceStatus,
  ClaimsWorkspaceRepository,
  ClaimStage,
  ClaimWorkspaceAggregate
} from "./service";

type InsuranceClaimRow = {
  adjusterEmail: string | null;
  adjusterName: string | null;
  adjusterPhone: string | null;
  blockerReason: string | null;
  carrierName: string | null;
  claimNumber: string | null;
  closedAt: Date | null;
  createdByUserId: string;
  customerEmail: string | null;
  customerAddressLine1: string | null;
  customerAddressLine2: string | null;
  customerCity: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerPostalCode: string | null;
  customerState: string | null;
  deductible: string | null;
  description: string | null;
  duplicateExceptionReason: string | null;
  evidence: InsuranceClaimEvidenceRow[];
  id: string;
  lastActivityAt: Date;
  linkedRepairOrderId: string | null;
  lossDate: string | null;
  lossLocation: string | null;
  nextAction: string | null;
  openedAt: Date;
  ownerUserId: string;
  policyNumber: string | null;
  stage: string;
  status: string;
  vehicleColor: string | null;
  vehicleId: string | null;
  vehicleMake: string | null;
  vehicleMileage: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  vehicleStockNumber: string | null;
  vehicleVin: string | null;
  vehicleYear: string | null;
  version: number;
  activities: InsuranceClaimActivityRow[];
};

type InsuranceClaimEvidenceRow = {
  category: string;
  createdAt: Date;
  createdByUserId: string;
  documentLibraryId: string | null;
  fileName: string | null;
  id: string;
  notes: string | null;
  relationshipTargets: unknown;
  status: string;
  title: string;
};

type InsuranceClaimActivityRow = {
  action: string;
  actorUserId: string;
  at: Date;
  detail: string;
  id: string;
};

type PrismaLikeClient = {
  insuranceClaim: {
    create(input: unknown): Promise<InsuranceClaimRow>;
    findFirst(input: unknown): Promise<InsuranceClaimRow | null>;
    findMany(input: unknown): Promise<InsuranceClaimRow[]>;
    update(input: unknown): Promise<InsuranceClaimRow>;
  };
  insuranceClaimActivity: {
    create(input: unknown): Promise<unknown>;
  };
  insuranceClaimEvidence: {
    create(input: unknown): Promise<unknown>;
  };
  $transaction?<T>(callback: (tx: PrismaLikeClient) => Promise<T>): Promise<T>;
};

const includeAggregate = {
  activities: { orderBy: { at: "desc" } },
  evidence: { orderBy: { createdAt: "asc" } }
};

export function createPrismaClaimsWorkspaceRepository(input: {
  organizationId: string;
  prisma: PrismaLikeClient;
}): ClaimsWorkspaceRepository {
  const { organizationId, prisma } = input;

  async function withTx<T>(callback: (tx: PrismaLikeClient) => Promise<T>) {
    return prisma.$transaction ? prisma.$transaction(callback) : callback(prisma);
  }

  async function findRequired(claimId: string, tx: PrismaLikeClient = prisma) {
    const row = await tx.insuranceClaim.findFirst({
      include: includeAggregate,
      where: { id: claimId, organizationId }
    });
    if (!row) throw new Error("Insurance claim was not found.");
    return row;
  }

  return {
    async addActivity(claimId, activity) {
      await withTx(async (tx) => {
        await findRequired(claimId, tx);
        await tx.insuranceClaimActivity.create({
          data: {
            action: activity.action,
            actorUserId: activity.actorUserId,
            at: new Date(activity.at),
            claimId,
            detail: activity.detail,
            id: activity.id,
            organizationId
          }
        });
        await tx.insuranceClaim.update({
          data: {
            lastActivityAt: new Date(activity.at),
            version: { increment: 1 }
          },
          include: includeAggregate,
          where: { id: claimId }
        });
      });
    },
    async addEvidence(claimId, evidence) {
      return withTx(async (tx) => {
        await findRequired(claimId, tx);
        await tx.insuranceClaimEvidence.create({
          data: {
            category: evidence.category,
            claimId,
            createdAt: new Date(evidence.createdAt),
            createdByUserId: evidence.createdByUserId,
            documentLibraryId: evidence.documentLibraryId || null,
            fileName: evidence.fileName || null,
            id: evidence.id,
            notes: evidence.notes || null,
            organizationId,
            relationshipTargets: evidence.relationshipTargets,
            status: evidence.status,
            title: evidence.title
          }
        });
        return toAggregate(await tx.insuranceClaim.update({
          data: {
            lastActivityAt: new Date(evidence.createdAt),
            version: { increment: 1 }
          },
          include: includeAggregate,
          where: { id: claimId }
        }));
      });
    },
    async createClaim(claim) {
      return toAggregate(await prisma.insuranceClaim.create({
        data: {
          adjusterEmail: claim.adjusterEmail || null,
          adjusterName: claim.adjusterName || null,
          adjusterPhone: claim.adjusterPhone || null,
          blockerReason: claim.blockerReason || null,
          carrierName: claim.carrierName || null,
          claimNumber: claim.claimNumber || null,
          closedAt: claim.closedAt ? new Date(claim.closedAt) : null,
          createdByUserId: claim.createdByUserId,
          customerAddressLine1: claim.customerAddressLine1 || null,
          customerAddressLine2: claim.customerAddressLine2 || null,
          customerCity: claim.customerCity || null,
          customerEmail: claim.customerEmail || null,
          customerId: claim.customerId || null,
          customerName: claim.customerName,
          customerPhone: claim.customerPhone || null,
          customerPostalCode: claim.customerPostalCode || null,
          customerState: claim.customerState || null,
          deductible: claim.deductible || null,
          description: claim.description || null,
          duplicateExceptionReason: claim.duplicateExceptionReason || null,
          id: claim.id,
          lastActivityAt: new Date(claim.lastActivityAt),
          linkedRepairOrderId: claim.linkedRepairOrderId || null,
          lossDate: claim.lossDate || null,
          lossLocation: claim.lossLocation || null,
          nextAction: claim.nextAction || null,
          openedAt: new Date(claim.openedAt),
          organizationId,
          ownerUserId: claim.ownerUserId,
          policyNumber: claim.policyNumber || null,
          stage: claim.stage,
          status: claim.status,
          vehicleColor: claim.vehicleColor || null,
          vehicleId: claim.vehicleId || null,
          vehicleMake: claim.vehicleMake || null,
          vehicleMileage: claim.vehicleMileage || null,
          vehicleModel: claim.vehicleModel || null,
          vehiclePlate: claim.vehiclePlate || null,
          vehicleStockNumber: claim.vehicleStockNumber || null,
          vehicleVin: claim.vehicleVin || null,
          vehicleYear: claim.vehicleYear || null,
          version: claim.version
        },
        include: includeAggregate
      }));
    },
    async findClaimById(claimId) {
      const row = await prisma.insuranceClaim.findFirst({
        include: includeAggregate,
        where: { id: claimId, organizationId }
      });
      return row ? toAggregate(row) : null;
    },
    async listClaims() {
      const rows = await prisma.insuranceClaim.findMany({
        include: includeAggregate,
        orderBy: [{ status: "asc" }, { lastActivityAt: "desc" }],
        where: { organizationId }
      });
      return rows.map(toAggregate);
    },
    async updateClaim(claimId, update) {
      return toAggregate(await prisma.insuranceClaim.update({
        data: {
          adjusterEmail: update.adjusterEmail,
          adjusterName: update.adjusterName,
          adjusterPhone: update.adjusterPhone,
          blockerReason: update.blockerReason,
          carrierName: update.carrierName,
          claimNumber: update.claimNumber,
          customerAddressLine1: update.customerAddressLine1,
          customerAddressLine2: update.customerAddressLine2,
          customerCity: update.customerCity,
          customerEmail: update.customerEmail,
          customerName: update.customerName,
          customerPhone: update.customerPhone,
          customerPostalCode: update.customerPostalCode,
          customerState: update.customerState,
          deductible: update.deductible,
          description: update.description,
          lastActivityAt: update.lastActivityAt ? new Date(update.lastActivityAt) : undefined,
          lossDate: update.lossDate,
          lossLocation: update.lossLocation,
          nextAction: update.nextAction,
          policyNumber: update.policyNumber,
          stage: update.stage,
          vehicleColor: update.vehicleColor,
          vehicleMake: update.vehicleMake,
          vehicleMileage: update.vehicleMileage,
          vehicleModel: update.vehicleModel,
          vehiclePlate: update.vehiclePlate,
          vehicleStockNumber: update.vehicleStockNumber,
          vehicleVin: update.vehicleVin,
          vehicleYear: update.vehicleYear,
          version: { increment: 1 }
        },
        include: includeAggregate,
        where: { id: claimId }
      }));
    }
  };
}

function toAggregate(row: InsuranceClaimRow): ClaimWorkspaceAggregate {
  return {
    activities: row.activities.map(toActivity),
    claim: {
      adjusterEmail: row.adjusterEmail ?? undefined,
      adjusterName: row.adjusterName ?? undefined,
      adjusterPhone: row.adjusterPhone ?? undefined,
      blockerReason: row.blockerReason ?? undefined,
      carrierName: row.carrierName ?? undefined,
      claimNumber: row.claimNumber ?? undefined,
      closedAt: row.closedAt?.toISOString(),
      createdByUserId: row.createdByUserId,
      customerAddressLine1: row.customerAddressLine1 ?? undefined,
      customerAddressLine2: row.customerAddressLine2 ?? undefined,
      customerCity: row.customerCity ?? undefined,
      customerEmail: row.customerEmail ?? undefined,
      customerId: row.customerId ?? undefined,
      customerName: row.customerName,
      customerPhone: row.customerPhone ?? undefined,
      customerPostalCode: row.customerPostalCode ?? undefined,
      customerState: row.customerState ?? undefined,
      deductible: row.deductible ?? undefined,
      description: row.description ?? undefined,
      duplicateExceptionReason: row.duplicateExceptionReason ?? undefined,
      id: row.id,
      lastActivityAt: row.lastActivityAt.toISOString(),
      linkedRepairOrderId: row.linkedRepairOrderId ?? undefined,
      lossDate: row.lossDate ?? undefined,
      lossLocation: row.lossLocation ?? undefined,
      nextAction: row.nextAction ?? undefined,
      openedAt: row.openedAt.toISOString(),
      ownerUserId: row.ownerUserId,
      policyNumber: row.policyNumber ?? undefined,
      stage: row.stage as ClaimStage,
      status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
      vehicleColor: row.vehicleColor ?? undefined,
      vehicleId: row.vehicleId ?? undefined,
      vehicleMake: row.vehicleMake ?? undefined,
      vehicleMileage: row.vehicleMileage ?? undefined,
      vehicleModel: row.vehicleModel ?? undefined,
      vehiclePlate: row.vehiclePlate ?? undefined,
      vehicleStockNumber: row.vehicleStockNumber ?? undefined,
      vehicleVin: row.vehicleVin ?? undefined,
      vehicleYear: row.vehicleYear ?? undefined,
      version: row.version
    },
    evidence: row.evidence.map(toEvidence)
  };
}

function toEvidence(row: InsuranceClaimEvidenceRow): ClaimEvidenceRecord {
  const relationshipTargets = Array.isArray(row.relationshipTargets)
    ? row.relationshipTargets.filter((item): item is ClaimEvidenceRecord["relationshipTargets"][number] =>
        item === "CLAIM" || item === "CUSTOMER" || item === "VEHICLE" || item === "REPAIR_ORDER"
      )
    : (["CLAIM"] satisfies ClaimEvidenceRecord["relationshipTargets"]);
  return {
    category: row.category as ClaimEvidenceCategory,
    createdAt: row.createdAt.toISOString(),
    createdByUserId: row.createdByUserId,
    documentLibraryId: row.documentLibraryId ?? undefined,
    fileName: row.fileName ?? undefined,
    id: row.id,
    notes: row.notes ?? undefined,
    relationshipTargets,
    status: row.status as Exclude<ClaimEvidenceStatus, "MISSING">,
    title: row.title
  };
}

function toActivity(row: InsuranceClaimActivityRow): ClaimActivityRecord {
  return {
    action: row.action,
    actorUserId: row.actorUserId,
    at: row.at.toISOString(),
    detail: row.detail,
    id: row.id
  };
}
