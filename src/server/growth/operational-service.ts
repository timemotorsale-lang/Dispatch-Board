import { CustomerStatus, TaskStatus, type GrowthCampaignPlan as PrismaGrowthCampaignPlan, type Prisma, type PrismaClient } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { evaluateGrowthApprovalGates, type GrowthCampaignType, type GrowthRole } from "./approval-gates";
import { validateGrowthCommandBoundary, type GrowthCommandScope } from "./command-boundary";
import { type GrowthChannel } from "./domain-engine";
import { buildGrowthConsoleReadModelFromSignals, type GrowthAudienceRow, type GrowthConsoleReadModel, type GrowthOpportunityReadModel } from "./read-model";
import { classifyGrowthAttribution, normalizeGrowthResultEvents, type GrowthRawResultEvent } from "./results-attribution";
import { type GrowthSourceName, type GrowthSourceReadSignal } from "./source-adapters";

type GrowthDatabase = PrismaClient;

type GrowthCommandInput<TPayload extends Record<string, unknown>> = {
  actor?: AuthenticatedUser | null;
  idempotencyKey: string;
  payload: TPayload;
  reason: string;
  scope: GrowthCommandScope;
};

type SourceRecordRef = {
  entityId: string;
  source: GrowthSourceName;
};

export type GrowthOperationalHome = GrowthConsoleReadModel & {
  activeCampaigns: GrowthCampaignSummary[];
  operationalStatus: {
    apiRoutesGuarded: true;
    durableRecordsEnabled: true;
    liveSendLocked: true;
    paidSpendLocked: true;
    sourceMutationLocked: true;
  };
};

export type GrowthCampaignSummary = {
  approvalCount: number;
  audienceSnapshotCount: number;
  budgetCents: number;
  channel: string;
  id: string;
  launchLocked: boolean;
  messageDraftCount: number;
  nextAction: string;
  opportunityTitle: string;
  ownerRole: string;
  status: string;
  version: number;
};

function jsonArray(value: unknown): Prisma.InputJsonValue {
  return Array.isArray(value) ? (value as Prisma.InputJsonArray) : [];
}

function jsonObject(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonObject;
}

function assertUser(user: AuthenticatedUser | null | undefined): AuthenticatedUser {
  if (!user) throw new Error("Authentication required.");
  if (!user.isActive) throw new Error("Active user is required.");
  return user;
}

export function growthRoleForUser(user: AuthenticatedUser): GrowthRole {
  const labels = [...user.roles, ...user.duties.all].join(" ").toLowerCase();
  if (labels.includes("owner") || labels.includes("general manager") || labels.includes("admin")) return "GM/Admin";
  if (labels.includes("marketing")) return "Marketing Manager";
  if (labels.includes("inventory")) return "Inventory Manager";
  if (labels.includes("service")) return "Service Manager";
  if (labels.includes("sales")) return "Sales Manager";
  return "Staff";
}

export async function getGrowthOperationalHome(
  user: AuthenticatedUser | null,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
): Promise<GrowthOperationalHome> {
  assertUser(user);
  const database = input.database ?? prisma;
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const now = input.now ?? new Date();
  const signals = await readGrowthSourceSignals(database, organizationId, now);
  const model = buildGrowthConsoleReadModelFromSignals(signals, now);
  const opportunities = await ensureGrowthOpportunities(database, organizationId, model.opportunities, signals);
  const activeCampaigns = await database.growthCampaignPlan.findMany({
    include: {
      _count: { select: { approvals: true, audienceSnapshots: true, launchLocks: true, messageDrafts: true } }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 12,
    where: { organizationId, status: { in: ["DRAFT", "APPROVAL_REQUESTED", "LAUNCH_LOCKED"] } }
  });

  return {
    ...model,
    opportunities: opportunities.map(toReadModelOpportunity),
    activeCampaigns: activeCampaigns.map((campaign) => ({
      approvalCount: campaign._count.approvals,
      audienceSnapshotCount: campaign._count.audienceSnapshots,
      budgetCents: campaign.budgetCents,
      channel: campaign.channel,
      id: campaign.id,
      launchLocked: campaign._count.launchLocks > 0,
      messageDraftCount: campaign._count.messageDrafts,
      nextAction: campaign._count.launchLocks > 0 ? "Review launch lock" : campaign.status === "APPROVAL_REQUESTED" ? "Review approval" : "Continue campaign setup",
      opportunityTitle: campaign.opportunityTitle,
      ownerRole: campaign.ownerRole,
      status: campaign.status,
      version: campaign.version
    })),
    operationalStatus: {
      apiRoutesGuarded: true,
      durableRecordsEnabled: true,
      liveSendLocked: true,
      paidSpendLocked: true,
      sourceMutationLocked: true
    }
  };
}

export async function createGrowthCampaign(
  command: GrowthCommandInput<{
    budgetCents?: number;
    campaignType?: GrowthCampaignType;
    channel?: GrowthChannel;
    objective?: string;
    opportunityId: string;
  }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand(command, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  const database = input.database ?? prisma;
  const prior = await database.growthCampaignPlan.findUnique({
    where: { organizationId_idempotencyKey: { idempotencyKey: command.idempotencyKey, organizationId } }
  });
  if (prior) return getGrowthCampaign(prior.id, { database, organizationId });
  const opportunity = await database.growthOpportunity.findFirst({
    where: { id: command.payload.opportunityId, organizationId, status: "OPEN" }
  });
  if (!opportunity) throw new Error("Growth opportunity was not found.");
  if (opportunity.readiness === "Blocked") throw new Error("Blocked opportunities cannot become campaign plans.");
  const channel = command.payload.channel ?? "Internal task";
  const campaignType = command.payload.campaignType ?? campaignTypeForOpportunity(opportunity.opportunityType);

  const campaign = await database.$transaction(async (tx) => {
    const plan = await tx.growthCampaignPlan.create({
      data: {
        budgetCents: command.payload.budgetCents ?? 0,
        campaignType,
        channel,
        createdByUserId: user.id,
        createdReason: command.reason,
        idempotencyKey: command.idempotencyKey,
        objective: command.payload.objective?.trim() || opportunity.reason,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        organizationId,
        ownerRole: opportunity.ownerRole,
        sourceRecordRefs: jsonArray(opportunity.sourceRecordRefs),
        status: "DRAFT",
        version: 1
      }
    });
    await tx.growthCampaignLedgerEvent.create({
      data: {
        actorRole,
        actorUserId: user.id,
        campaignPlanId: plan.id,
        commandHash: validation.commandHash,
        eventType: "CAMPAIGN_CREATED",
        idempotencyKey: `${command.idempotencyKey}:ledger`,
        organizationId,
        payload: jsonObject({ opportunityId: opportunity.id, sourceRecordRefs: jsonArray(opportunity.sourceRecordRefs) }),
        reason: command.reason,
        version: 1
      }
    });
    return plan;
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function getGrowthCampaign(
  campaignId: string,
  input: { database?: GrowthDatabase; organizationId?: string } = {}
) {
  const database = input.database ?? prisma;
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const campaign = await database.growthCampaignPlan.findFirst({
    include: {
      approvals: { orderBy: { requestedAt: "desc" } },
      audienceSnapshots: { include: { rows: true }, orderBy: { version: "desc" } },
      ledgerEvents: { orderBy: { occurredAt: "asc" } },
      launchLocks: { orderBy: { createdAt: "desc" } },
      messageDrafts: { orderBy: { version: "desc" } },
      resultEvents: { orderBy: { occurredAt: "desc" } },
      writebackPreviews: { orderBy: { createdAt: "desc" } }
    },
    where: { id: campaignId, organizationId }
  });
  if (!campaign) throw new Error("Growth campaign was not found.");
  return campaign;
}

export async function saveGrowthAudienceSnapshot(
  command: GrowthCommandInput<{ campaignId: string; rows?: GrowthAudienceRow[] }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand(command, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  const database = input.database ?? prisma;
  const prior = await database.growthAudienceSnapshot.findUnique({
    where: { organizationId_idempotencyKey: { idempotencyKey: command.idempotencyKey, organizationId } }
  });
  if (prior) return getGrowthCampaign(prior.campaignPlanId, { database, organizationId });
  const campaign = await database.growthCampaignPlan.findFirst({ where: { id: command.payload.campaignId, organizationId } });
  if (!campaign) throw new Error("Growth campaign was not found.");
  const rows = command.payload.rows?.length ? command.payload.rows : defaultAudienceRows();
  const nextVersion = await nextChildVersion(database, "audience", campaign.id);

  await database.$transaction(async (tx) => {
    const snapshot = await tx.growthAudienceSnapshot.create({
      data: {
        campaignPlanId: campaign.id,
        createdByUserId: user.id,
        idempotencyKey: command.idempotencyKey,
        organizationId,
        reason: command.reason,
        summary: Object.fromEntries(rows.map((row) => [row.label, row.count])),
        version: nextVersion
      }
    });
    await tx.growthAudienceSnapshotRow.createMany({
      data: rows.map((row) => ({
        audienceSnapshotId: snapshot.id,
        count: row.count,
        label: row.label,
        organizationId,
        reason: row.reason,
        sourceRecordRefs: []
      }))
    });
    await bumpCampaignVersion(tx, campaign.id, organizationId, "AUDIENCE_SNAPSHOT_SAVED", user.id, actorRole, command, validation.commandHash);
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function saveGrowthMessageDraft(
  command: GrowthCommandInput<{ body: string; callToAction: string; campaignId: string; subject: string }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand(command, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  if (command.payload.subject.trim().length < 4) throw new Error("Message subject is required.");
  if (command.payload.body.trim().length < 20) throw new Error("Message body must explain the customer value.");
  if (command.payload.callToAction.trim().length < 4) throw new Error("Call to action is required.");
  const database = input.database ?? prisma;
  const prior = await database.growthMessageDraft.findUnique({
    where: { organizationId_idempotencyKey: { idempotencyKey: command.idempotencyKey, organizationId } }
  });
  if (prior) return getGrowthCampaign(prior.campaignPlanId, { database, organizationId });
  const campaign = await database.growthCampaignPlan.findFirst({ where: { id: command.payload.campaignId, organizationId } });
  if (!campaign) throw new Error("Growth campaign was not found.");
  const nextVersion = await nextChildVersion(database, "message", campaign.id);

  await database.$transaction(async (tx) => {
    await tx.growthMessageDraft.create({
      data: {
        body: command.payload.body.trim(),
        callToAction: command.payload.callToAction.trim(),
        campaignPlanId: campaign.id,
        createdByUserId: user.id,
        idempotencyKey: command.idempotencyKey,
        organizationId,
        reason: command.reason,
        subject: command.payload.subject.trim(),
        version: nextVersion
      }
    });
    await bumpCampaignVersion(tx, campaign.id, organizationId, "MESSAGE_DRAFT_SAVED", user.id, actorRole, command, validation.commandHash);
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function requestGrowthApproval(
  command: GrowthCommandInput<{ approvalType?: string; campaignId: string; requestedRole?: GrowthRole }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand(command, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  const database = input.database ?? prisma;
  const prior = await database.growthApproval.findUnique({
    where: { organizationId_idempotencyKey: { idempotencyKey: command.idempotencyKey, organizationId } }
  });
  if (prior) return getGrowthCampaign(prior.campaignPlanId, { database, organizationId });
  const campaign = await getGrowthCampaign(command.payload.campaignId, { database, organizationId });
  if (campaign.audienceSnapshots.length === 0) throw new Error("Audience snapshot is required before approval.");
  if (campaign.messageDrafts.length === 0) throw new Error("Message or ad draft is required before approval.");
  const requestedRole = command.payload.requestedRole ?? (campaign.ownerRole as GrowthRole);

  await database.$transaction(async (tx) => {
    await tx.growthApproval.create({
      data: {
        approvalType: command.payload.approvalType ?? "CAMPAIGN_REVIEW",
        campaignPlanId: campaign.id,
        idempotencyKey: command.idempotencyKey,
        organizationId,
        requestedByUserId: user.id,
        requestedRole,
        status: "REQUESTED"
      }
    });
    await tx.growthCampaignPlan.update({
      data: { approvalRequestedAt: now, status: "APPROVAL_REQUESTED", version: { increment: 1 } },
      where: { id: campaign.id }
    });
    await tx.growthCampaignLedgerEvent.create({
      data: {
        actorRole,
        actorUserId: user.id,
        campaignPlanId: campaign.id,
        commandHash: validation.commandHash,
        eventType: "APPROVAL_REQUESTED",
        idempotencyKey: `${command.idempotencyKey}:ledger`,
        organizationId,
        payload: jsonObject({ requestedRole }),
        reason: command.reason,
        version: campaign.version + 1
      }
    });
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function createGrowthLaunchLock(
  command: GrowthCommandInput<{ campaignId: string }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand(command, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  const database = input.database ?? prisma;
  const prior = await database.growthLaunchLock.findUnique({
    where: { organizationId_idempotencyKey: { idempotencyKey: command.idempotencyKey, organizationId } }
  });
  if (prior) return getGrowthCampaign(prior.campaignPlanId, { database, organizationId });
  const campaign = await getGrowthCampaign(command.payload.campaignId, { database, organizationId });
  const decision = evaluateGrowthApprovalGates({
    actorRole,
    budgetCents: campaign.budgetCents,
    campaignType: campaign.campaignType as GrowthCampaignType,
    channel: campaign.channel as GrowthChannel,
    offerSourceVerified: false,
    planStatus: campaign.status === "APPROVAL_REQUESTED" ? "Approval requested" : "Draft",
    providerReady: false,
    requestedApprovals: campaign.approvals.map((approval) => approval.requestedRole as GrowthRole)
  });

  await database.$transaction(async (tx) => {
    await tx.growthLaunchLock.create({
      data: {
        actorRole,
        actorUserId: user.id,
        campaignPlanId: campaign.id,
        idempotencyKey: command.idempotencyKey,
        lockedReason: decision.lockedReason,
        lockState: "LOCKED",
        nextAction: `Request ${decision.nextApproval} approval`,
        organizationId
      }
    });
    await tx.growthCampaignPlan.update({ data: { status: "LAUNCH_LOCKED", version: { increment: 1 } }, where: { id: campaign.id } });
    await tx.growthCampaignLedgerEvent.create({
      data: {
        actorRole,
        actorUserId: user.id,
        campaignPlanId: campaign.id,
        commandHash: validation.commandHash,
        eventType: "LAUNCH_LOCKED",
        idempotencyKey: `${command.idempotencyKey}:ledger`,
        organizationId,
        payload: jsonObject({ lockedReason: decision.lockedReason, nextApproval: decision.nextApproval }),
        reason: command.reason,
        version: campaign.version + 1
      }
    });
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function importGrowthResultPreview(
  command: GrowthCommandInput<{ campaignId: string; events: GrowthRawResultEvent[] }>,
  input: { database?: GrowthDatabase; now?: Date; organizationId?: string } = {}
) {
  const user = assertUser(command.actor);
  const actorRole = growthRoleForUser(user);
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const validation = validateOperationalCommand({ ...command, scope: "launch_lock" }, actorRole, user.id, now);
  if (!validation.allowed) throw new Error(validation.nextAction);
  const database = input.database ?? prisma;
  const campaign = await getGrowthCampaign(command.payload.campaignId, { database, organizationId });
  const normalized = normalizeGrowthResultEvents(command.payload.events);

  await database.$transaction(async (tx) => {
    for (const event of normalized) {
      const tier = classifyGrowthAttribution(event, campaign.createdAt.toISOString());
      const sourceEventId = [
        event.campaignId,
        event.source,
        event.eventType,
        event.occurredAt,
        event.customerId ?? "anonymous"
      ].join(":");
      await tx.growthResultEvent.upsert({
        create: {
          attributionTier: tier,
          campaignPlanId: campaign.id,
          customerId: event.customerId ?? null,
          eventType: event.eventType,
          idempotencyKey: `${command.idempotencyKey}:${sourceEventId}`,
          occurredAt: new Date(event.occurredAt),
          organizationId,
          payload: event as unknown as Prisma.InputJsonValue,
          proofEvent: event.proofEvent,
          recordedByUserId: user.id,
          source: event.source,
          sourceEventId,
          valueCents: event.valueCents ?? 0
        },
        update: {},
        where: { organizationId_source_sourceEventId: { organizationId, source: event.source, sourceEventId } }
      });
    }
  });

  return getGrowthCampaign(campaign.id, { database, organizationId });
}

export async function createGrowthWritebackPreviews(
  actor: AuthenticatedUser | null,
  campaignId: string,
  input: { database?: GrowthDatabase; organizationId?: string } = {}
) {
  const user = assertUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const database = input.database ?? prisma;
  const campaign = await getGrowthCampaign(campaignId, { database, organizationId });
  const existing = await database.growthCrmWritebackPreview.findMany({ where: { campaignPlanId: campaign.id, organizationId }, orderBy: { createdAt: "desc" } });
  if (existing.length) return existing;
  const rows = [
    { eventType: "Campaign prepared", targetSystem: "CRM", reason: "Campaign plan is ready to show in CRM after mutation approval." },
    { eventType: "Audience approved", targetSystem: "CRM", reason: "Audience snapshot can be referenced after approval." },
    { eventType: "Message approved", targetSystem: "CRM", reason: "Reviewed message language can be attached to CRM activity after approval." },
    { eventType: "Approval requested", targetSystem: "Tasks", reason: "Manager review task can be prepared after task writeback approval." },
    { eventType: "Launch locked", targetSystem: "CRM", reason: "Launch lock should be visible before live activation." }
  ];

  await database.growthCrmWritebackPreview.createMany({
    data: rows.map((row, index) => ({
      approvalNeeded: "CRM/task mutation approval",
      campaignPlanId: campaign.id,
      createdByUserId: user.id,
      eventType: row.eventType,
      idempotencyKey: `writeback:${campaign.id}:${index + 1}`,
      locked: true,
      nextAction: "Review before enabling writeback",
      organizationId,
      reason: row.reason,
      sourceEvidence: jsonObject({ campaignId: campaign.id, version: campaign.version }),
      targetSystem: row.targetSystem,
      valueCents: 0
    }))
  });

  return database.growthCrmWritebackPreview.findMany({ where: { campaignPlanId: campaign.id, organizationId }, orderBy: { createdAt: "desc" } });
}

async function readGrowthSourceSignals(database: GrowthDatabase, organizationId: string, now: Date): Promise<GrowthSourceReadSignal[]> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const [tasks, customers, inventory, repairOrders, appointments] = await Promise.all([
    database.task.findMany({
      orderBy: [{ dueAt: "asc" }],
      select: { createdAt: true, dueAt: true, id: true, priority: true, status: true, title: true, workflowArea: true },
      take: 20,
      where: { status: { not: TaskStatus.COMPLETED } }
    }),
    database.customer.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: { displayName: true, id: true, lastInteractionAt: true, nextActionAt: true, updatedAt: true },
      take: 20,
      where: { archivedAt: null, mergedIntoCustomerId: null, organizationId, status: CustomerStatus.ACTIVE }
    }),
    database.inventoryUnit.findMany({
      orderBy: [{ targetAt: "asc" }],
      select: { id: true, inventoryNumber: true, lifecycleStage: true, nextAction: true, operatingState: true, targetAt: true, updatedAt: true },
      take: 20,
      where: { closedAt: null, organizationId }
    }),
    database.repairOrder.findMany({
      orderBy: [{ targetAt: "asc" }],
      select: { id: true, nextAction: true, operatingState: true, repairOrderNumber: true, stage: true, targetAt: true, updatedAt: true },
      take: 20,
      where: { closedAt: null, organizationId }
    }),
    database.appointment.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: { attendanceStatus: true, bookingStatus: true, id: true, startsAt: true, title: true, updatedAt: true },
      take: 20,
      where: { organizationId, updatedAt: { gte: since } }
    })
  ]);

  return [
    ...tasks.map((task): GrowthSourceReadSignal => ({
      confidence: task.status === "BLOCKED" ? 62 : 78,
      entityId: task.id,
      generatedAt: task.createdAt.toISOString(),
      source: "Tasks",
      summary: `${task.title} task is ${String(task.status).toLowerCase()} in ${String(task.workflowArea).toLowerCase()}.`,
      valueCents: task.priority === "HIGH" ? 180000 : 90000
    })),
    ...customers.filter((customer) => customer.nextActionAt || customer.lastInteractionAt).map((customer): GrowthSourceReadSignal => ({
      confidence: customer.nextActionAt ? 82 : 70,
      entityId: customer.id,
      generatedAt: (customer.nextActionAt ?? customer.lastInteractionAt ?? customer.updatedAt).toISOString(),
      source: "CRM",
      summary: `${customer.displayName} has a CRM follow-up or lifecycle signal.`,
      valueCents: 140000
    })),
    ...inventory.map((unit): GrowthSourceReadSignal => ({
      confidence: unit.operatingState === "ACTIVE" ? 75 : 58,
      entityId: unit.id,
      generatedAt: unit.updatedAt.toISOString(),
      source: "Inventory",
      summary: `${unit.inventoryNumber} ${String(unit.lifecycleStage).toLowerCase()} needs ${unit.nextAction}.`,
      valueCents: 280000
    })),
    ...repairOrders.map((order): GrowthSourceReadSignal => ({
      confidence: order.operatingState === "BLOCKED" ? 56 : 72,
      entityId: order.id,
      generatedAt: order.updatedAt.toISOString(),
      source: "Service",
      summary: `${order.repairOrderNumber} ${String(order.stage).toLowerCase()} needs ${order.nextAction}.`,
      valueCents: 160000
    })),
    ...appointments.map((appointment): GrowthSourceReadSignal => ({
      confidence: appointment.attendanceStatus === "NO_SHOW" ? 74 : 67,
      entityId: appointment.id,
      generatedAt: appointment.updatedAt.toISOString(),
      source: "Appointments",
      summary: `${appointment.title} appointment is ${String(appointment.bookingStatus).toLowerCase()}.`,
      valueCents: 120000
    }))
  ];
}

async function ensureGrowthOpportunities(
  database: GrowthDatabase,
  organizationId: string,
  opportunities: GrowthOpportunityReadModel[],
  signals: GrowthSourceReadSignal[]
) {
  const records = [];
  for (const opportunity of opportunities) {
    const sourceRefs = signals
      .filter((signal) => opportunity.sourceSystems.includes(signal.source))
      .map((signal): SourceRecordRef => ({ entityId: signal.entityId, source: signal.source }));
    const existing = await database.growthOpportunity.findFirst({
      where: { organizationId, status: "OPEN", title: opportunity.title }
    });
    const data = {
      audienceLabel: opportunity.audience,
      estimatedValueCents: opportunity.estimatedValue * 100,
      nextAction: opportunity.nextAction,
      opportunityType: opportunity.type,
      organizationId,
      ownerRole: opportunity.owner,
      priorityScore: opportunity.priorityScore,
      readiness: opportunity.readiness,
      reason: opportunity.reason,
      sourceRecordRefs: sourceRefs,
      sourceSummary: opportunity.sourceSummary,
      sourceSystems: opportunity.sourceSystems,
      title: opportunity.title
    };
    records.push(existing
      ? await database.growthOpportunity.update({ data, where: { id: existing.id } })
      : await database.growthOpportunity.create({ data }));
  }
  return records;
}

type PrismaGrowthOpportunity = Prisma.GrowthOpportunityGetPayload<Record<string, never>>;

function toReadModelOpportunity(opportunity: PrismaGrowthCampaignPlan | PrismaGrowthOpportunity): GrowthOpportunityReadModel {
  if ("opportunityTitle" in opportunity) {
    return {
      audience: "Campaign plan",
      estimatedValue: 0,
      impact: "$0",
      nextAction: "Continue campaign setup",
      owner: opportunity.ownerRole,
      priorityScore: 0,
      readiness: "Review needed",
      reason: opportunity.objective,
      sourceSystems: [],
      sourceSummary: "Growth campaign plan",
      title: opportunity.opportunityTitle,
      type: opportunity.campaignType
    };
  }
  return {
    audience: opportunity.audienceLabel,
    estimatedValue: Math.round(opportunity.estimatedValueCents / 100),
    impact: `$${Math.round(opportunity.estimatedValueCents / 100000)}K`,
    nextAction: opportunity.nextAction,
    owner: opportunity.ownerRole,
    priorityScore: opportunity.priorityScore,
    readiness: opportunity.readiness as GrowthOpportunityReadModel["readiness"],
    reason: opportunity.reason,
    sourceSystems: Array.isArray(opportunity.sourceSystems) ? opportunity.sourceSystems as GrowthSourceName[] : [],
    sourceSummary: opportunity.sourceSummary,
    title: opportunity.title,
    type: opportunity.opportunityType
  };
}

function validateOperationalCommand<TPayload extends Record<string, unknown>>(
  command: GrowthCommandInput<TPayload>,
  actorRole: GrowthRole,
  actorId: string,
  now: Date
) {
  return validateGrowthCommandBoundary({
    actorId,
    actorRole,
    idempotencyKey: command.idempotencyKey,
    payload: command.payload,
    reason: command.reason,
    requestedAt: now.toISOString(),
    scope: command.scope
  });
}

async function nextChildVersion(database: GrowthDatabase, kind: "audience" | "message", campaignPlanId: string) {
  if (kind === "audience") {
    const latest = await database.growthAudienceSnapshot.findFirst({ orderBy: { version: "desc" }, select: { version: true }, where: { campaignPlanId } });
    return (latest?.version ?? 0) + 1;
  }
  const latest = await database.growthMessageDraft.findFirst({ orderBy: { version: "desc" }, select: { version: true }, where: { campaignPlanId } });
  return (latest?.version ?? 0) + 1;
}

async function bumpCampaignVersion(
  tx: Prisma.TransactionClient,
  campaignPlanId: string,
  organizationId: string,
  eventType: string,
  actorUserId: string,
  actorRole: GrowthRole,
  command: GrowthCommandInput<Record<string, unknown>>,
  commandHash: string
) {
  const campaign = await tx.growthCampaignPlan.update({
    data: { version: { increment: 1 } },
    where: { id: campaignPlanId }
  });
  await tx.growthCampaignLedgerEvent.create({
    data: {
      actorRole,
      actorUserId,
      campaignPlanId,
      commandHash,
      eventType,
      idempotencyKey: `${command.idempotencyKey}:ledger`,
      organizationId,
      payload: jsonObject(command.payload),
      reason: command.reason,
      version: campaign.version
    }
  });
}

function campaignTypeForOpportunity(type: string): GrowthCampaignType {
  if (type === "Advertising") return "Aged inventory";
  if (type === "Retention") return "Service reminder";
  if (type === "Lead nurture") return "Lead nurture";
  return "Quote recovery";
}

function defaultAudienceRows(): GrowthAudienceRow[] {
  return [
    { count: 1, label: "Included", reason: "Source-backed record is eligible for manager review." },
    { count: 0, label: "Excluded", reason: "No excluded records in this snapshot." },
    { count: 0, label: "Suppressed", reason: "No suppressed records in this snapshot." },
    { count: 0, label: "Needs cleanup", reason: "No cleanup records in this snapshot." }
  ];
}
