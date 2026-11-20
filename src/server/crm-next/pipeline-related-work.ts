import { Prisma } from "@prisma/client";
import { pipelineLabel, type PipelineActivity, type PipelineRelatedWork } from "@/lib/crm-pipeline";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { canUseOwnDeals } from "@/server/policies/access";
import { canManageDeals } from "@/server/sales-documents/dashboard-operations";

const pageSize = 250;
export const latestPipelineInteraction = {
  select: { channel: true, direction: true, occurredAt: true },
  orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  take: 1,
} satisfies Prisma.Customer$interactionsArgs;

export function pipelineInteraction(interaction?: { channel: string; direction: string; occurredAt: Date }): PipelineActivity | null {
  return interaction ? { label: `${pipelineLabel(interaction.direction)} ${pipelineLabel(interaction.channel)}`, at: interaction.occurredAt.toISOString() } : null;
}

export function pipelineDealScope(actor: AuthenticatedUser, organizationId: string, canManage: boolean): Prisma.DealDeskDraftWhereInput | null {
  if (!canUseOwnDeals(actor) || dealOrganization() !== organizationId) return null;
  return { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, ...(canManage && canManageDeals(actor) ? {} : { ownerUserId: actor.id }) };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

type PipelineDealJacket = { id: string; dealReference: string; pathway: string; customerId: string | null; state: string; updatedAt: Date };
export async function readPipelineDealJackets(organizationId: string, deals: { id: string; customerId: string | null; pathway: string; snapshot: unknown }[]): Promise<Map<string, PipelineDealJacket>> {
  const links = deals.map(deal => {
    const snapshot = object(deal.snapshot);
    const id = object(snapshot.jackets)[deal.pathway];
    const references = Object.values(object(snapshot.references)).filter((value): value is string => typeof value === "string" && Boolean(value));
    return { deal, id: typeof id === "string" ? id : null, references };
  });
  if (!links.some(link => link.id || link.references.length)) return new Map();
  const jackets = await prisma.salesDocumentJacket.findMany({
    where: {
      organizationId, OR: [
        { id: { in: links.flatMap(link => link.id ? [link.id] : []) } },
        { dealReference: { in: links.flatMap(link => link.references) } },
      ],
    },
    select: { id: true, dealReference: true, pathway: true, customerId: true, state: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  return new Map(links.flatMap(({ deal, id, references }) => {
    const matches = jackets.filter(jacket => jacket.pathway === deal.pathway && jacket.customerId === deal.customerId);
    const jacket = matches.find(item => item.id === id) ?? matches.find(item => references.includes(item.dealReference));
    return jacket ? [[deal.id, jacket] as const] : [];
  }));
}

export async function readPipelineRelatedWork(actor: AuthenticatedUser, organizationId: string, canManage: boolean, page: number, opportunityScope: Prisma.UnifiedCrmOpportunityRecordWhereInput) {
  const customerScope = { organizationId, archivedAt: null, mergedIntoCustomerId: null, ...(canManage ? {} : { ownerUserId: actor.id }) };
  const dealScope = pipelineDealScope(actor, organizationId, canManage);
  const storageOrganization = resolveDocumentStorageRuntimeFromEnv().organizationId;
  const paging = { take: pageSize + 1, skip: page * pageSize, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] } as const;
  const [customers, drafts, reminders] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...customerScope,
        status: "ACTIVE",
        OR: [
          { nextActionAt: { not: null } },
          { leads: { none: {} }, unifiedCrmOpportunities: { none: {} } },
        ],
      },
      select: {
        id: true, displayName: true, customerNumber: true, ownerUserId: true, nextActionAt: true, updatedAt: true,
        ownerUser: { select: { name: true } }, interactions: latestPipelineInteraction,
      },
      ...paging, orderBy: [...paging.orderBy],
    }),
    dealScope ? prisma.dealDeskDraft.findMany({
      where: { ...dealScope, status: { in: ["IN_PROGRESS", "PENDING", "SOLD", "COMPLETED"] } },
      select: { id: true, customerId: true, customerName: true, dealNumber: true, ownerUserId: true, status: true, pathway: true, vehicleReference: true, updatedAt: true, statusHistory: true, snapshot: true },
      ...paging, orderBy: [...paging.orderBy],
    }) : [],
    prisma.$queryRaw<Array<{ taskId: string; customerId: string; name: string; reference: string; title: string; dueAt: Date; updatedAt: Date; ownerId: string; ownerName: string }>>(Prisma.sql`
      WITH task_customers AS (
        SELECT t.id AS "taskId", t."customerId" FROM "Task" t
        WHERE t."customerId" IS NOT NULL AND t.status <> 'COMPLETED' AND t."workflowArea" = 'SALES'
        UNION
        SELECT e.payload ->> 'taskId', e."aggregateId" FROM "EnterpriseDomainEvent" e
        WHERE e."organizationId" = ${organizationId} AND e.domain = 'UNIFIED_CRM'
          AND e."aggregateType" = 'CUSTOMER' AND e."eventType" = 'CRM_CUSTOMER_TASK_BRIDGE_CREATED'
      )
      SELECT t.id AS "taskId", c.id AS "customerId", c."displayName" AS name, c."customerNumber" AS reference,
        t.title, t."dueAt", t."updatedAt", u.id AS "ownerId", u.name AS "ownerName"
      FROM task_customers source
      JOIN "Task" t ON t.id = source."taskId"
      JOIN "Customer" c ON c.id = source."customerId" AND c."organizationId" = ${organizationId}
      JOIN "User" u ON u.id = t."assignedUserId"
      WHERE c."archivedAt" IS NULL AND c."mergedIntoCustomerId" IS NULL AND c.status <> 'MERGED'
        AND t.status <> 'COMPLETED' AND t."workflowArea" = 'SALES'
        AND NOT EXISTS (SELECT 1 FROM "CustomerLeadTaskLink" l WHERE l."taskId" = t.id)
        AND NOT EXISTS (SELECT 1 FROM "UnifiedCrmOpportunityTaskLink" l WHERE l."taskId" = t.id AND l."organizationId" = ${organizationId} AND l."archivedAt" IS NULL)
        ${canManage ? Prisma.empty : Prisma.sql`AND c."ownerUserId" = ${actor.id} AND t."assignedUserId" = ${actor.id}`}
      ORDER BY t."dueAt", t.id LIMIT ${paging.take} OFFSET ${paging.skip}
    `),
  ]);
  const deals = drafts.slice(0, pageSize);
  const jackets = await readPipelineDealJackets(storageOrganization, deals);
  const jacketIds = [...new Set([...jackets.values()].map(jacket => jacket.id))];
  const dealIds = deals.map(deal => deal.id);
  const customerIds = [...new Set(deals.flatMap(deal => deal.customerId ? [deal.customerId] : []))];
  const draftLink = dealIds.length ? Prisma.sql`t."templateSnapshot" -> 'dealDashboard' ->> 'draftId' IN (${Prisma.join(dealIds)})` : Prisma.sql`FALSE`;
  const jacketLink = jacketIds.length ? Prisma.sql`t."templateSnapshot" -> 'dealDashboard' ->> 'jacketId' IN (${Prisma.join(jacketIds)})` : Prisma.sql`FALSE`;
  const [owners, linked, dealCustomers, dealTasks] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...new Set(deals.map(deal => deal.ownerUserId))] } }, select: { id: true, name: true } }),
    prisma.crmPipelineState.findMany({
      where: { organizationId, dealId: { in: dealIds }, opportunity: { AND: [opportunityScope, { stage: { not: "LOST" } }] } },
      select: { dealId: true, opportunity: { select: { customerId: true } } },
    }),
    prisma.customer.findMany({ where: { ...customerScope, id: { in: customerIds } }, select: { id: true, interactions: latestPipelineInteraction } }),
    dealIds.length ? prisma.$queryRaw<Array<{ id: string; draftId: string | null; jacketId: string | null; title: string; dueAt: Date }>>(Prisma.sql`
      SELECT DISTINCT ON (d."draftId", d."jacketId") t.id, d."draftId", d."jacketId", t.title, t."dueAt"
      FROM "Task" t
      CROSS JOIN LATERAL (SELECT t."templateSnapshot" -> 'dealDashboard' ->> 'draftId' AS "draftId",
        t."templateSnapshot" -> 'dealDashboard' ->> 'jacketId' AS "jacketId") d
      WHERE t.status <> 'COMPLETED' AND t."templateSnapshot" -> 'dealDashboard' ->> 'organizationId' = ${storageOrganization}
        AND (${draftLink} OR ${jacketLink})
        ${dealScope?.ownerUserId ? Prisma.sql`AND t."assignedUserId" = ${actor.id}` : Prisma.empty}
      ORDER BY d."draftId", d."jacketId", t."dueAt", t.id
    `) : [],
  ]);
  const ownerNames = new Map(owners.map(owner => [owner.id, owner.name]));
  const customersByDeal = new Map(deals.map(deal => [deal.id, deal.customerId]));
  const linkedIds = new Set(linked.filter(item => item.dealId && customersByDeal.get(item.dealId) === item.opportunity.customerId).map(item => item.dealId));
  const activityByCustomer = new Map(dealCustomers.map(customer => [customer.id, pipelineInteraction(customer.interactions[0])]));
  const work: PipelineRelatedWork[] = customers.slice(0, pageSize).map(customer => ({
      id: customer.id, kind: "customer", customerId: customer.id,
      name: customer.displayName, reference: customer.customerNumber, vehicle: "", stage: customer.nextActionAt ? "Customer follow-up" : "Customer profile",
      ownerId: customer.ownerUserId, ownerName: customer.ownerUser?.name ?? "Unassigned",
      nextAction: customer.nextActionAt ? "Review scheduled customer follow-up" : "Set a next action if follow-up is needed",
      dueAt: customer.nextActionAt?.toISOString() ?? null, updatedAt: customer.updatedAt.toISOString(),
      activity: pipelineInteraction(customer.interactions[0]), href: `/crm-next/customers/${encodeURIComponent(customer.id)}`,
  }));
  for (const reminder of reminders.slice(0, pageSize)) work.push({
    id: reminder.taskId, kind: "customer", customerId: reminder.customerId,
    name: reminder.name, reference: reminder.reference, vehicle: "", stage: "Customer reminder",
    ownerId: reminder.ownerId, ownerName: reminder.ownerName, nextAction: reminder.title,
    dueAt: reminder.dueAt.toISOString(), updatedAt: reminder.updatedAt.toISOString(), href: `/tasks/${encodeURIComponent(reminder.taskId)}`, taskId: reminder.taskId,
  });
  for (const deal of deals) {
    if (linkedIds.has(deal.id)) continue;
    const jacket = jackets.get(deal.id);
    const sold = deal.status === "SOLD";
    const completed = deal.status === "COMPLETED" || sold && jacket?.state === "CLOSED";
    const unwind = jacket?.state === "UNWIND_PENDING";
    const funding = jacket?.state === "DELIVERED_FUNDING_PENDING";
    const task = dealTasks.filter(item => item.draftId === deal.id || jacket && item.jacketId === jacket.id).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];
    const nextAction = unwind ? "Review unwind with manager" : task?.title ?? (funding ? "Confirm funding" : completed ? "Review completed deal" : sold ? "Review paperwork and delivery" : "Review deal and confirm next step");
    const stage = unwind ? "Unwind review" : funding ? "Awaiting funding" : sold ? completed ? "Sold · finalized" : "Sold · paperwork pending" : completed ? "Completed" : deal.status === "PENDING" ? "Pending deal" : "Working deal";
    const events = Array.isArray(deal.statusHistory) ? deal.statusHistory.map(object) : [];
    const event = events.at(-1);
    const dealActivity = typeof event?.at === "string" && typeof event.to === "string" ? { label: pipelineLabel(event.to), at: event.at } : null;
    const customerActivity = deal.customerId ? activityByCustomer.get(deal.customerId) : null;
    work.push({
      id: deal.id, kind: "deal", customerId: deal.customerId, name: deal.customerName, reference: `Deal #${deal.dealNumber}`, vehicle: deal.vehicleReference,
      stage, pathway: deal.pathway, ownerId: deal.ownerUserId, ownerName: ownerNames.get(deal.ownerUserId) ?? "Assigned owner",
      nextAction, dueAt: task?.dueAt.toISOString() ?? null, taskId: task?.id, updatedAt: (jacket && jacket.updatedAt > deal.updatedAt ? jacket.updatedAt : deal.updatedAt).toISOString(),
      activity: customerActivity && (!dealActivity || customerActivity.at > dealActivity.at) ? customerActivity : dealActivity,
      href: deal.ownerUserId === actor.id ? `/crm-next/deals/start?draftId=${encodeURIComponent(deal.id)}` : `/crm-next/deals?${new URLSearchParams({ workspace: "TEAM", area: "all", search: String(deal.dealNumber) })}`,
      sold, completed: completed && !task,
    });
  }
  return { work, more: customers.length > pageSize || drafts.length > pageSize || reminders.length > pageSize };
}
