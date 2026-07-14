import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { canExploreAudit } from "@/server/policies/administration";
import { prisma } from "@/server/db/client";

export type AuditExplorerQuery = {
  domain?: string;
  subjectType?: string;
  subjectId?: string;
  actorUserId?: string;
  eventType?: string;
  correlationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export async function exploreEnterpriseAudit(actor: AuthenticatedUser | null, query: AuditExplorerQuery = {}, organizationId = INITIAL_ORGANIZATION.id) {
  const user = assertAuthenticatedUser(actor);
  if (!canExploreAudit(user)) throw new Error("Audit explorer access requires manager privileges.");
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
  const events = await prisma.enterpriseAuditEvent.findMany({
    where: {
      organizationId,
      ...(query.domain ? { domain: query.domain } : {}),
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(query.from || query.to ? { occurredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {})
    },
    orderBy: { occurredAt: "desc" }, take: limit,
    include: { actorUser: { select: { id: true, name: true, email: true } }, location: { select: { id: true, code: true, name: true } } }
  });
  return { generatedAt: new Date().toISOString(), count: events.length, limit, events };
}
