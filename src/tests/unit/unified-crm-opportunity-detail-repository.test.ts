import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmOpportunityDetailRepository } from "@/server/repositories/unified-crm-opportunity-detail-repository";

describe("Unified CRM opportunity detail repository", () => {
  it("guards joined customer and lead rows to the same organization before projecting nested detail", async () => {
    const captured: unknown[] = [];
    const repository = createUnifiedCrmOpportunityDetailRepository({
      $queryRaw: vi.fn(async (query) => {
        captured.push(query);
        return [];
      })
    } as never);

    await repository.findOpportunityDetail({
      opportunityId: "opp_123456",
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    const query = captured[0] as { strings?: string[]; values?: unknown[] };
    const sql = (query.strings ?? []).join(" ");
    expect(sql).toContain('customer."organizationId" = record."organizationId"');
    expect(sql).toContain('source_lead."organizationId" = record."organizationId"');
  });

  it("maps nested detail only from guarded joined rows", async () => {
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{
        id: "db-opp-1",
        organizationId: "org-a",
        opportunityNumber: "opp_123456",
        title: "Alex Morgan renewal review",
        summary: "Read-only source projection",
        stage: "NEW_INQUIRY",
        nextActionLabel: "Call customer",
        nextActionDueAt: new Date("2026-08-15T18:30:00.000Z"),
        version: 2,
        customerId: null,
        customerDisplayName: null,
        customerNumber: null,
        ownerUserId: "user-1",
        ownerUserName: "CRM Manager",
        sourceLeadId: null,
        sourceLeadNumber: null,
        sourceLeadStage: null,
        createdAt: new Date("2026-08-15T01:00:00.000Z"),
        updatedAt: new Date("2026-08-15T02:00:00.000Z")
      }])
      .mockResolvedValueOnce([{
        actorLabel: "CRM Manager",
        fromStage: null,
        occurredAt: new Date("2026-08-15T01:00:00.000Z"),
        reason: "Create CRM opportunity.",
        toStage: "NEW_INQUIRY"
      }])
      .mockResolvedValueOnce([{
        actorLabel: "CRM Manager",
        archivedAt: null,
        brief: "Document the opportunity follow-up and next operational step.",
        createdAt: new Date("2026-08-15T02:15:00.000Z"),
        dueAt: new Date("2026-08-15T18:30:00.000Z"),
        relationship: "FOLLOW_UP",
        taskId: "task-1",
        title: "Follow up with Alex Morgan"
      }])
      .mockResolvedValueOnce([{
        actorLabel: "CRM Manager",
        appointmentNumber: "APT-1001",
        archivedAt: null,
        createdAt: new Date("2026-08-15T02:20:00.000Z"),
        endsAt: null,
        relationship: "DRAFT_APPOINTMENT",
        startsAt: null,
        title: "Appointment with Alex Morgan",
        version: 1
      }])
      .mockResolvedValueOnce([{
        actorLabel: "CRM Manager",
        archivedAt: null,
        createdAt: new Date("2026-08-15T02:25:00.000Z"),
        repairJobId: "job-1",
        repairJobNumber: "JOB-01",
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_JOB",
        title: "Diagnose Accord lighting concern",
        version: 2
      }]);
    const repository = createUnifiedCrmOpportunityDetailRepository({
      $queryRaw: queryRaw
    } as never);

    const record = await repository.findOpportunityDetail({
      opportunityId: "opp_123456",
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(record).toMatchObject({
      opportunityNumber: "opp_123456",
      customer: null,
      ownerUser: { id: "user-1", name: "CRM Manager" },
      sourceLead: null,
      stage: "NEW_INQUIRY",
      version: 2,
      stageHistory: [{
        actorLabel: "CRM Manager",
        fromStage: null,
        reason: "Create CRM opportunity.",
        toStage: "NEW_INQUIRY"
      }],
      taskLinks: [{
        actorLabel: "CRM Manager",
        relationship: "FOLLOW_UP",
        taskId: "task-1",
        title: "Follow up with Alex Morgan"
      }],
      appointmentLinks: [{
        actorLabel: "CRM Manager",
        appointmentNumber: "APT-1001",
        relationship: "DRAFT_APPOINTMENT",
        title: "Appointment with Alex Morgan",
        version: 1
      }],
      dispatchLinks: [{
        actorLabel: "CRM Manager",
        repairJobId: "job-1",
        repairJobNumber: "JOB-01",
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_JOB",
        title: "Diagnose Accord lighting concern",
        version: 2
      }]
    });
    expect(queryRaw).toHaveBeenCalledTimes(5);
  });
});
