import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";
import { resolveCrmNextAccess, resolveCrmNextMode } from "@/server/crm-next/access";
import { getCrmNextCommandCenter } from "@/server/crm-next/read-model";

function user(roles: string[], isActive = true): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Next User",
    email: "crm-next@example.test",
    isActive,
    roles,
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

describe("CRM Next access and safe bridge", () => {
  const originalFlag = process.env.CRM_NEXT;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.CRM_NEXT;
    else process.env.CRM_NEXT = originalFlag;
  });

  it("keeps CRM Next off unless the CRM_NEXT flag is explicitly enabled", () => {
    expect(resolveCrmNextMode({ flag: undefined })).toBe("OFF");
    expect(resolveCrmNextMode({ flag: "false" })).toBe("OFF");
    expect(resolveCrmNextMode({ flag: "REVIEW" })).toBe("REVIEW");
    expect(resolveCrmNextMode({ flag: "true" })).toBe("REVIEW");
  });

  it("allows an enabled manager without granting live task writes", () => {
    const access = resolveCrmNextAccess(user(["General Manager"]), { flag: "CRM_NEXT" });
    expect(access.allowed).toBe(false);

    const enabled = resolveCrmNextAccess(user(["General Manager"]), { flag: "REVIEW" });
    expect(enabled.allowed).toBe(true);

    process.env.CRM_NEXT = "REVIEW";
    const model = getCrmNextCommandCenter(user(["General Manager"]));
    expect(model.bridge.liveTaskCreationEnabled).toBe(false);
    expect(model.bridge.previewEnabled).toBe(true);
    expect(model.progress.envelopeCount).toBe(20);
    expect(model.progress.nextMilestone).toBe("Pilot approval");
    expect(model.search.groups).toHaveLength(5);
    expect(model.ownershipSupport.map((record) => record.domain)).toEqual(
      expect.arrayContaining(["Vehicle", "Finance", "Payment", "Case", "Title/Document", "Service", "Rental/Loaner", "Customer Issue", "Insurance"])
    );
    expect(model.ownershipSupport.find((record) => record.domain === "Payment")?.permission).toBe("Held");
    expect(model.timeline.map((event) => event.source)).toContain("Opportunity");
    const implementedEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-0(1[7-9]|2[0-9]|3[0-5])$/.test(milestone.id)
    );
    expect(implementedEnvelope).toHaveLength(19);
    expect(implementedEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    const ownershipSupportEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-04[0-8]$/.test(milestone.id)
    );
    expect(ownershipSupportEnvelope).toHaveLength(9);
    expect(ownershipSupportEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    expect(model.sharedExecution).toHaveLength(5);
    expect(model.sharedExecution.map((record) => record.milestone)).toEqual(["CRMN-050", "CRMN-051", "CRMN-052", "CRMN-053", "CRMN-054"]);
    expect(model.sharedExecution.find((record) => record.milestone === "CRMN-050")?.state).toBe("Preview only");
    const sharedExecutionEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-05[0-4]$/.test(milestone.id)
    );
    expect(sharedExecutionEnvelope).toHaveLength(5);
    expect(sharedExecutionEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    expect(model.intelligence).toHaveLength(8);
    expect(model.intelligence.map((record) => record.milestone)).toEqual(["CRMN-060", "CRMN-061", "CRMN-062", "CRMN-063", "CRMN-064", "CRMN-065", "CRMN-066", "CRMN-067"]);
    expect(model.intelligence.find((record) => record.milestone === "CRMN-062")?.confidence).toBe("Human decides");
    expect(model.intelligence.find((record) => record.milestone === "CRMN-067")?.safety).toContain("No reassignment");
    const intelligenceEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-06[0-7]$/.test(milestone.id)
    );
    expect(intelligenceEnvelope).toHaveLength(8);
    expect(intelligenceEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    expect(model.commandCenter.headline).toBe("Who needs attention?");
    expect(model.commandCenter.modes.map((mode) => mode.milestone)).toEqual(["CRMN-068", "CRMN-069", "CRMN-070", "CRMN-071", "CRMN-072", "CRMN-073", "CRMN-074"]);
    expect(model.commandCenter.modes.find((mode) => mode.milestone === "CRMN-071")?.state).toBe("Preview only");
    const commandCenterEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-0(6[8-9]|7[0-4])$/.test(milestone.id)
    );
    expect(commandCenterEnvelope).toHaveLength(7);
    expect(commandCenterEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    expect(model.pilotScenarios).toHaveLength(5);
    expect(model.pilotScenarios.map((scenario) => scenario.milestone)).toEqual(["CRMN-075", "CRMN-076", "CRMN-077", "CRMN-078", "CRMN-079"]);
    expect(model.pilotScenarios.find((scenario) => scenario.milestone === "CRMN-077")?.sourceOfTruth).toContain("Customer 360 read model");
    const pilotScenarioEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-07[5-9]$/.test(milestone.id)
    );
    expect(pilotScenarioEnvelope).toHaveLength(5);
    expect(pilotScenarioEnvelope.every((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toBe(true);
    expect(model.hardeningGates).toHaveLength(7);
    expect(model.hardeningGates.map((gate) => gate.milestone)).toEqual(["CRMN-080", "CRMN-081", "CRMN-082", "CRMN-083", "CRMN-084", "CRMN-085", "CRMN-086"]);
    expect(model.hardeningGates.find((gate) => gate.milestone === "CRMN-080")?.status).toBe("HELD");
    expect(model.hardeningGates.find((gate) => gate.milestone === "CRMN-084")?.riskControl).toContain("No sensitive write");
    const hardeningEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-08[0-6]$/.test(milestone.id)
    );
    expect(hardeningEnvelope).toHaveLength(7);
    expect(hardeningEnvelope.find((milestone) => milestone.id === "CRMN-080")?.status).toBe("HELD");
    expect(hardeningEnvelope.filter((milestone) => milestone.status === "IMPLEMENTED_UNVERIFIED")).toHaveLength(6);
    expect(model.coexistenceGates).toHaveLength(4);
    expect(model.coexistenceGates.map((gate) => gate.milestone)).toEqual(["CRMN-087", "CRMN-088", "CRMN-089", "CRMN-090"]);
    expect(model.coexistenceGates.find((gate) => gate.milestone === "CRMN-090")?.status).toBe("HELD");
    expect(model.coexistenceGates.find((gate) => gate.milestone === "CRMN-088")?.legacyOwner).toContain("Existing backend models");
    const coexistenceEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-09[0]$|^CRMN-08[7-9]$/.test(milestone.id)
    );
    expect(coexistenceEnvelope).toHaveLength(4);
    expect(coexistenceEnvelope.find((milestone) => milestone.id === "CRMN-090")?.status).toBe("HELD");
    expect(model.pilotReleaseGates).toHaveLength(4);
    expect(model.pilotReleaseGates.map((gate) => gate.milestone)).toEqual(["CRMN-091", "CRMN-092", "CRMN-093", "CRMN-094"]);
    expect(model.pilotReleaseGates.find((gate) => gate.milestone === "CRMN-094")?.status).toBe("HELD");
    expect(model.pilotReleaseGates.find((gate) => gate.milestone === "CRMN-093")?.requirement).toContain("typecheck");
    const pilotReleaseEnvelope = model.progress.milestones.filter((milestone) =>
      /^CRMN-09[1-4]$/.test(milestone.id)
    );
    expect(pilotReleaseEnvelope).toHaveLength(4);
    expect(pilotReleaseEnvelope.find((milestone) => milestone.id === "CRMN-094")?.status).toBe("HELD");
  });

  it("rejects ineligible users and does not create a dispatch task from the bridge", () => {
    const denied = resolveCrmNextAccess(user(["Mechanic"]), { flag: "REVIEW" });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("WORKSPACE_NOT_ELIGIBLE");

    process.env.CRM_NEXT = "REVIEW";
    const preview = previewCrmNextActionToTaskBridge(user(["General Manager"]), {
      attentionItemId: "attn-michael-overdue-follow-up"
    });

    expect(preview.state).toBe("PREVIEW_ONLY");
    expect(preview.liveTaskCreated).toBe(false);
    expect(preview.dispatchPreview?.customer360Update).toContain("would receive");
  });
});
