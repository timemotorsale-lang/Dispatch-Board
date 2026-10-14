import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { isGeneralManager, assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeAuthorityCommand, stableAuthoritySubjectId } from "./authority-domain";
import { createAuthorityRepository, type AuthorityRepository } from "./authority-repository";
type Dependencies = { now?: () => Date; organizationId?: string; repository?: AuthorityRepository };
export async function executeAuthorityCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor); if (!isGeneralManager(user)) throw new Error("Only the General Manager can administer capability authority.");
  const now = input.now?.() ?? new Date(), organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, repository = input.repository ?? createAuthorityRepository(), data = normalizeAuthorityCommand(value, now), subjectId = stableAuthoritySubjectId(organizationId, data.userId, data.locationId, data.capability);
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, commandType: data.action, domain: "CAPABILITY_AUTHORITY", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, locationId: data.locationId, organizationId, payload: { capability: data.capability, effect: data.effect, fieldAllowlist: data.fieldAllowlist, maxAmountCents: data.maxAmountCents, maxCumulativeAmountCents: data.maxCumulativeAmountCents, ownResourcesOnly: data.ownResourcesOnly, requiresIndependentApproval: data.requiresIndependentApproval, userId: data.userId, validFrom: data.validFrom.toISOString(), validTo: data.validTo?.toISOString() ?? null }, reason: data.reason, subjectId, subjectType: "CAPABILITY_AUTHORITY" });
  return repository.upsert(command, data);
}
