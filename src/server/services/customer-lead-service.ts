import { createHash } from "node:crypto";
import { CustomerLeadStage, Prisma, type TaskTemplatePriority } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeDecisionResult, type CrmDecisionEvaluationRequest } from "@/server/customers/decisions/crm-decision-domain";
import { crmDecisionRegistry, type CrmDecisionRegistry } from "@/server/customers/decisions/crm-decision-registry";
import { LEAD_ASSIGNMENT_DECISION_TYPE, LEAD_ASSIGNMENT_VERSION, LEAD_PRIORITY_DECISION_TYPE, LEAD_PRIORITY_VERSION } from "@/server/customers/decisions/lead-decision-evaluators";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { createCustomerLeadRepository, type CustomerLeadRecord, type CustomerLeadRepository } from "@/server/repositories/customer-lead-repository";

const allowedTransitions: Record<CustomerLeadStage, CustomerLeadStage[]> = {
  NEW: [CustomerLeadStage.CONTACT_ATTEMPTED, CustomerLeadStage.ENGAGED, CustomerLeadStage.NURTURE, CustomerLeadStage.LOST],
  CONTACT_ATTEMPTED: [CustomerLeadStage.ENGAGED, CustomerLeadStage.NURTURE, CustomerLeadStage.LOST],
  ENGAGED: [CustomerLeadStage.APPOINTMENT_SET, CustomerLeadStage.QUALIFIED, CustomerLeadStage.NURTURE, CustomerLeadStage.LOST],
  APPOINTMENT_SET: [CustomerLeadStage.ON_SITE, CustomerLeadStage.ENGAGED, CustomerLeadStage.LOST],
  ON_SITE: [CustomerLeadStage.QUALIFIED, CustomerLeadStage.NEGOTIATION, CustomerLeadStage.LOST],
  QUALIFIED: [CustomerLeadStage.NEGOTIATION, CustomerLeadStage.APPOINTMENT_SET, CustomerLeadStage.NURTURE, CustomerLeadStage.LOST],
  NEGOTIATION: [CustomerLeadStage.WON, CustomerLeadStage.LOST, CustomerLeadStage.NURTURE],
  NURTURE: [CustomerLeadStage.ENGAGED, CustomerLeadStage.LOST], WON: [], LOST: []
};

type Dependencies = { repository?: CustomerLeadRepository; registry?: CrmDecisionRegistry; now?: () => Date; organizationId?: string };
type LeadIntake = { idempotencyKey: string; customerId: string; sourceCode: string; vehicleInterest?: string | null; qualification: Record<string, unknown> };

function deps(input: Dependencies) { return { repository: input.repository ?? createCustomerLeadRepository(), registry: input.registry ?? crmDecisionRegistry, now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id }; }
function text(value: unknown, label: string, max = 120) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`); return value.trim().slice(0, max); }
function view(lead: CustomerLeadRecord) { return { id: lead.id, leadNumber: lead.leadNumber, customer: lead.customer, owner: lead.ownerUser, sourceCode: lead.sourceCode, stage: lead.stage, vehicleInterest: lead.vehicleInterest, nextActionCode: lead.nextActionCode, nextActionAt: lead.nextActionAt.toISOString(), priority: lead.priority, score: lead.score, confidence: lead.confidence, task: lead.taskLinks[0]?.task ?? null, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() }; }
function taskPriority(priority: string | null): TaskTemplatePriority { return priority === "P1" ? "HIGH" : priority === "P2" ? "MEDIUM" : "LOW"; }
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function createCustomerLead(actor: AuthenticatedUser | null, raw: LeadIntake, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor); const d = deps(input); const now = d.now();
  const idempotencyKey = text(raw.idempotencyKey, "Lead idempotency key");
  const customerId = text(raw.customerId, "Lead customer id"); const sourceCode = text(raw.sourceCode, "Lead source code", 80).toUpperCase().replaceAll(" ", "_");
  const qualification = raw.qualification && typeof raw.qualification === "object" ? structuredClone(raw.qualification) : {};
  const requestHash = createHash("sha256").update(stableJson({ customerId, sourceCode, vehicleInterest: raw.vehicleInterest ?? null, qualification })).digest("hex");
  const existing = await d.repository.findByIdempotency(d.organizationId, idempotencyKey);
  if (existing) { if (existing.requestHash !== requestHash) throw new Error("Lead idempotency key was already used with different input."); return { lead: view(existing), replayed: true }; }
  const customer = await d.repository.findCustomer(d.organizationId, customerId); if (!customer) throw new Error("Customer not found.");
  const leadId = `pending-${requestHash.slice(0, 16)}`;
  const priorityRequest: CrmDecisionEvaluationRequest = { decisionType: LEAD_PRIORITY_DECISION_TYPE, algorithmVersion: LEAD_PRIORITY_VERSION, subject: { type: "LEAD", id: leadId }, customerId, facts: { ...qualification, evaluatedAt: now.toISOString() } };
  const priority = normalizeDecisionResult(priorityRequest, d.registry.evaluate(priorityRequest));
  const candidates = (await d.repository.listAssignmentCandidates()).map((candidate) => { const sales = candidate.userRoles.some(({ role }) => role.name.toLowerCase().includes("sales")) || candidate.userDuties.some(({ duty }) => duty.workflowArea === "SALES"); return { userId: candidate.id, eligible: candidate.isActive && sales, availability: 30, openHotLeadCount: candidate._count.ownedCustomerLeads, capacityLimit: 12, continuity: 0, skillFit: sales ? 15 : 0, rotation: 10, lastAssignedAt: null }; });
  const assignmentRequest: CrmDecisionEvaluationRequest = { decisionType: LEAD_ASSIGNMENT_DECISION_TYPE, algorithmVersion: LEAD_ASSIGNMENT_VERSION, subject: { type: "LEAD", id: leadId }, customerId, facts: { candidates } };
  const assignment = normalizeDecisionResult(assignmentRequest, d.registry.evaluate(assignmentRequest));
  if (!assignment.recommendedOwnerId) throw new Error("No eligible lead owner is available.");
  const lead = await d.repository.createPackage({ organizationId: d.organizationId, customerId, leadNumber: `LEAD-${now.getTime()}-${requestHash.slice(0, 8).toUpperCase()}`, idempotencyKey, requestHash, sourceCode, vehicleInterest: typeof raw.vehicleInterest === "string" ? raw.vehicleInterest.trim() || null : null, createdByUserId: user.id, qualificationSnapshot: qualification as Prisma.InputJsonValue, priorityDecision: priority, assignmentDecision: assignment, taskPriority: taskPriority(priority.priority), decidedAt: now });
  return { lead: view(lead), replayed: false };
}

export async function transitionCustomerLead(actor: AuthenticatedUser | null, id: string, raw: { stage: string; reason?: string | null }, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor); const d = deps(input); const lead = await d.repository.findById(d.organizationId, text(id, "Lead id"));
  if (!lead) throw new Error("Lead not found."); if (!isManager(user) && lead.ownerUserId !== user.id) throw new Error("You do not have permission to transition this lead.");
  if (!Object.values(CustomerLeadStage).includes(raw.stage as CustomerLeadStage)) throw new Error("Lead stage is invalid."); const stage = raw.stage as CustomerLeadStage;
  if (!allowedTransitions[lead.stage].includes(stage)) throw new Error(`Lead cannot transition from ${lead.stage} to ${stage}.`);
  const reason = raw.reason?.trim() || null; if ((stage === CustomerLeadStage.LOST || stage === CustomerLeadStage.WON) && !reason) throw new Error("Closing a lead requires an outcome reason.");
  return { lead: view(await d.repository.transition({ organizationId: d.organizationId, id: lead.id, stage, reason, occurredAt: d.now(), actorUserId: user.id })) };
}

export async function listRecentCustomerLeads(actor: AuthenticatedUser | null, limit = 5, input: Dependencies = {}) { assertAuthenticatedUser(actor); const d = deps(input); return (await d.repository.listRecent(d.organizationId, Math.max(1, Math.min(25, limit)))).map(view); }
