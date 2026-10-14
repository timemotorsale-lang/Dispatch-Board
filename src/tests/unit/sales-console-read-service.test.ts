import { describe, expect, it } from "vitest";

import { getSalesConsoleReadModel } from "@/server/services/sales-console-read-service";

const actor = {
  email: "sales.manager@example.com",
  id: "user-1",
  name: "Sales Manager",
  roles: ["Sales Manager"]
};

describe("Sales Console read service", () => {
  it("maps existing read-only board, lead, and vehicle sources into the adapter model", async () => {
    const result = await getSalesConsoleReadModel(actor, {
      boardReader: async () => ({
        board: {
          date: "2026-07-28",
          generatedAt: "2026-07-28T13:00:00.000Z",
          generationStatus: "generated",
          id: "board-1",
          latestGeneration: null,
          sourceCounts: { manager: 0, staff: 0, template: 1 },
          statusCounts: {},
          taskCount: 1,
          tasks: [{
            blockerReason: "Docs missing",
            completedAt: null,
            customerReference: "Amina Yusuf",
            description: null,
            dueAt: "2026-07-28T14:00:00.000Z",
            id: "task-real-1",
            intelligenceSignalType: null,
            isClaimable: false,
            priority: "HIGH",
            readyForReviewAt: null,
            recommendation: { explanation: "Call customer with document checklist.", reasonCode: "DOCS_NEEDED" },
            recommendedUser: null,
            requiredUpdateFields: [],
            requiresManagerApproval: true,
            sourceType: "CUSTOMER_LEAD",
            status: "BLOCKED",
            title: "Lead follow-up",
            updatedAt: "2026-07-28T13:30:00.000Z",
            updateFieldValues: {},
            vehicleReference: "T25001",
            workflowArea: "SALES",
            assignedUser: { id: "user-1", name: "Sales Manager" }
          }]
        },
        date: "2026-07-28",
        schedulerHealth: {} as never
      }),
      leadReader: async () => [{
        confidence: "HIGH",
        createdAt: "2026-07-28T12:00:00.000Z",
        customer: { id: "customer-1", displayName: "Amina Yusuf" },
        id: "lead-1",
        leadNumber: "L-1001",
        nextActionAt: "2026-07-28T15:00:00.000Z",
        nextActionCode: "FOLLOW_UP",
        owner: { id: "user-1", name: "Sales Manager" },
        priority: "HIGH",
        score: 91,
        sourceCode: "WEB",
        stage: "NEGOTIATION",
        task: null,
        updatedAt: "2026-07-28T13:45:00.000Z",
        vehicleInterest: "2025 Toyota Camry"
      }],
      now: () => new Date("2026-07-28T14:00:00.000Z"),
      vehicleReader: async () => ({
        items: [{
          _count: { duplicateCasesAsCandidate: 0, duplicateCasesAsPrimary: 0 },
          color: "Blue",
          id: "vehicle-1",
          licensePlate: null,
          make: "Toyota",
          model: "Camry",
          status: "ACTIVE",
          stockNumber: "T25001",
          updatedAt: new Date("2026-07-28T13:50:00.000Z"),
          vehicleNumber: "VEH-1",
          version: 1,
          vin: null,
          vinRaw: null,
          vinState: "VALID",
          year: 2025
        }],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1
      })
    });

    expect(result.readModel.readOnly).toBe(true);
    expect(result.sourceBundle.tasks[0]?.taskId).toBe("task-real-1");
    expect(result.sourceBundle.leads[0]?.leadId).toBe("lead-1");
    expect(result.sourceBundle.vehicles[0]?.vehicleId).toBe("vehicle-1");
    expect(result.sourceBundle.deals[0]?.dealId).toBe("lead-L-1001");
    expect(result.dataSources.filter((source) => source.status === "mapped").map((source) => source.source)).toContain("Board/task read model");
    expect(result.dataSources.filter((source) => source.status === "mapped").map((source) => source.source)).toContain("Customer lead read model");
    expect(result.dataSources.filter((source) => source.status === "mapped").map((source) => source.source)).toContain("Vehicle registry read model");
  });

  it("falls back safely when real readers return no usable sales records", async () => {
    const result = await getSalesConsoleReadModel(actor, {
      boardReader: async () => ({ board: null, date: "2026-07-28", schedulerHealth: {} as never }),
      leadReader: async () => [],
      now: () => new Date("2026-07-28T14:00:00.000Z"),
      vehicleReader: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 })
    });

    expect(result.readModel.readOnly).toBe(true);
    expect(result.sourceBundle.tasks.length).toBeGreaterThan(0);
    expect(result.sourceBundle.leads.length).toBeGreaterThan(0);
    expect(result.sourceBundle.vehicles.length).toBeGreaterThan(0);
    expect(result.dataSources.some((source) => source.status === "fallback")).toBe(true);
    expect(result.dataSources.find((source) => source.source === "Appointment context")?.status).toBe("fallback");
  });
});
