import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkflowDecisionGuide } from "@/features/inventory/workflow-decision-guide";
import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateWorkEligibility, rankNextBestWork, type OrchestrationCandidate } from "@/server/inventory-execution/orchestration-domain";
import { getInventoryOrchestration } from "@/server/inventory-execution/orchestration-service";

const now = new Date("2026-07-19T18:00:00Z");
function candidate(overrides: Partial<OrchestrationCandidate> = {}): OrchestrationCandidate { return { id: "packet-1", vehicleId: "vehicle-1", taskId: "task-1", title: "Receive vehicle", state: "STAGED", urgency: "P2", readiness: "READY", readinessItems: [{ code: "VEHICLE_PRESENT", required: true, satisfied: true }], dependencyItems: [{ code: "KEYS", required: true, satisfied: true }], targetAt: new Date("2026-07-19T19:00:00Z"), createdAt: new Date("2026-07-19T16:00:00Z"), dataState: "FRESH", assignedUserId: "staff", actorHasAuthority: true, hasCompetingCurrentWork: false, ...overrides }; }

describe("Inventory EOS deterministic orchestration", () => {
  it("fails closed for readiness, dependencies, stale data, authority, and competing work", () => {
    expect(evaluateWorkEligibility(candidate({ readiness: "NOT_READY", readinessItems: [{ code: "VEHICLE_PRESENT", required: true, satisfied: false }], dependencyItems: [{ code: "KEYS", required: true, satisfied: false }], dataState: "STALE", actorHasAuthority: false, hasCompetingCurrentWork: true }), now).blockers).toEqual(["ACTOR_NOT_ASSIGNED_OR_AUTHORIZED", "READINESS_NOT_READY", "READINESS_CHECK_VEHICLE_PRESENT", "DEPENDENCY_KEYS", "DATA_STALE", "EXECUTOR_ALREADY_HAS_CURRENT_WORK"]);
  });

  it("ranks manager urgency and target proximity with stable deterministic ties", () => {
    const ranked = rankNextBestWork([candidate({ id: "p3", urgency: "P3" }), candidate({ id: "p1", urgency: "P1", targetAt: new Date("2026-07-20T18:00:00Z") }), candidate({ id: "blocked", urgency: "P0", readiness: "NOT_READY" })], now);
    expect(ranked.map(item => item.id)).toEqual(["p1", "p3", "blocked"]);
    expect(ranked[0]).toMatchObject({ recommendationType: "ADVISORY", confidence: "HIGH", eligibility: { eligible: true }, reasons: expect.arrayContaining(["MANAGER_URGENCY_P1"]) });
    expect(ranked[2].score).toBe(-1);
  });

  it("renders explanation and never claims an automatic workflow action", () => {
    const ranked = rankNextBestWork([candidate()], now), html = renderToStaticMarkup(<WorkflowDecisionGuide model={{ status: "CONNECTED", generatedAt: now.toISOString(), mode: "ADVISORY", policy: "Manager controls urgency and eligibility; the server rechecks every command.", ranked }} />);
    expect(html).toContain("What should happen next?");
    expect(html).toContain("Recommended next work");
    expect(html).toContain("MANAGER_URGENCY_P2");
    expect(html).toContain("Open Vehicle Workbench");
    expect(html).toContain("Manager controls urgency");
    expect(html).not.toContain("Auto-started");
  });

  it("shows unavailable state when the authoritative work source is absent", () => {
    const html = renderToStaticMarkup(<WorkflowDecisionGuide model={{ status: "UNAVAILABLE", generatedAt: now.toISOString(), mode: "ADVISORY", policy: "No recommendation is produced without its authoritative work source.", ranked: [], reason: "Migration not applied." }} />);
    expect(html).toContain("No recommendation available"); expect(html).toContain("Migration not applied");
  });

  it("keeps the workflow launcher available when the generated data client is stale", async () => {
    const manager: AuthenticatedUser = {
      id: "manager-1",
      name: "Manager",
      email: "manager@example.test",
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };

    const projection = await getInventoryOrchestration(manager, {}, { client: {}, now: () => now });

    expect(projection).toMatchObject({
      status: "UNAVAILABLE",
      ranked: [],
      reason: expect.stringContaining("workflow launcher remains available")
    });
  });
});
