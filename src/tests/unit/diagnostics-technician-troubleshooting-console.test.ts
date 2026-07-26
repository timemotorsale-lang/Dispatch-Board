import { describe, expect, it } from "vitest";

import { buildTechnicianTroubleshootingConsole, normalizeDiagnosticTroubleshootingSessionCommand, TECHNICIAN_TROUBLESHOOTING_CONSOLE_VERSION } from "@/server/diagnostics/technician-troubleshooting-console";

function buildInput(concern: string, overrides: Partial<Parameters<typeof buildTechnicianTroubleshootingConsole>[0]> = {}) {
  return {
    generatedAt: "2026-07-25T12:00:00.000Z",
    diagnosticCase: {
      ageHours: 1,
      assignedUser: { id: "tech-1", name: "Walter Mechanic" },
      concern,
      id: "dgc_case_1",
      location: { code: "MAIN", id: "loc-1", name: "Main Shop" },
      measurements: [],
      observations: [],
      repairOrder: { id: "ro-1", repairOrderNumber: "RO-1042" },
      riskTier: "R2",
      stage: "CONCERN",
      status: "TRIAGE",
      vehicle: { id: "vehicle-1", label: "2010 Mazda 3", make: "Mazda", model: "3", vin: "JM1BL1SF3A1257561", year: 2010 },
      version: 3
    },
    qualitySafetyGates: {
      counts: { currentMeasurements: 0, currentObservations: 0, independentGroups: 0, invalid: 0, suspect: 0 },
      readyForReasoning: false,
      reasonCodes: ["REASONING_INSUFFICIENT_EVIDENCE"]
    },
    ...overrides
  };
}

describe("technician troubleshooting console intelligence", () => {
  it("routes broad engine language to guided questions instead of no-match behavior", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("engine issue"));
    expect(model.version).toBe(TECHNICIAN_TROUBLESHOOTING_CONSOLE_VERSION);
    expect(model.intake.concernType).toBe("BROAD_CONCERN");
    expect(model.intake.detectedDomains.map((domain) => domain.id)).toContain("ENGINE_DRIVABILITY");
    expect(model.intake.missingQuestions.join(" ")).toContain("Which engine symptom");
    expect(model.commonCauses.length).toBeGreaterThan(0);
    expect(model.evidenceGate.state).toBe("INTAKE_NEEDED");
    expect(model.intakeRefinement.mode).toBe("INTERACTIVE_REFINEMENT_REQUIRED");
    expect(model.intakeRefinement.questions[0]?.options).toContain("misfire");
  });

  it("routes transmission issues to transmission/drivetrain common-cause scaffolding", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("transmission issues"));
    expect(model.intake.detectedDomains[0]?.id).toBe("TRANSMISSION_DRIVETRAIN");
    expect(model.intake.missingQuestions.join(" ")).toContain("slip");
    expect(model.commonCauses.map((cause) => cause.cause)).toContain("Low/contaminated fluid or leak path");
    expect(model.nextTestPreview.map((test) => test.key)).toContain("TRANS_FLUID_CHECK");
    expect(model.nextTestPlan.recommendation?.key).toBe("TRANS_FLUID_CHECK");
    expect(model.nextTestPlan.recommendation?.expectedEvidence).toContain("fluid level");
    expect(model.evidenceCapturePlan.measurementsToCapture).toContain("fluid level");
    expect(model.rulePackRegistry.active[0]?.id).toBe("TRANSMISSION_DRIVETRAIN");
    expect(model.testOverride.options).toContain("tool unavailable");
    expect(model.vehicleIntelligence.knownIssueMatches[0]?.issueId).toBe("known-trans-fluid-leak-shift-quality");
    expect(model.licensedConnectorInterfaces.map((connector) => connector.id)).toContain("OEM_TSB");
    expect(model.licensedConnectorInterfaces.find((connector) => connector.id === "OEM_PARTS_DIAGRAM")?.prohibitedUses.join(" ")).toContain("invent OEM part numbers");
    expect(model.testExecutionBridge.state).toBe("READY_TO_CREATE_GOVERNED_TEST");
    expect(model.aiContextPacket.enabled).toBe(false);
    expect(model.aiContextPacket.contextChecksum.length).toBeGreaterThan(20);
    expect(model.aiContextPacket.packet.forbiddenUses).toContain("authorize repair");
    expect(model.featureGates.gates.find((gate) => gate.id === "aiAssistant")?.state).toBe("WITHHELD_SAFETY_GATE");
    expect(model.pilotTelemetry.blockers.join(" ")).toContain("Recall/TSB/OEM connectors");
    expect(model.knowledgeCatalog.coverage.completeness).toBe("SEED_CATALOG_NOT_EXHAUSTIVE");
    expect(model.knowledgeCatalog.categories.map((category) => category.id)).toContain("automatic-transmission");
    expect(model.knowledgeCatalog.commonCauseMatches.map((entry) => entry.id)).toContain("cc-trans-fluid-control-baseline");
    expect(model.knowledgeCatalog.vehicleKnownProblemMatches.map((entry) => entry.id)).toContain("vkp-mazda3-2010-trans-shift-fluid-control");
    expect(model.knowledgeCatalog.sourcePolicy.prohibited.join(" ")).toContain("inventing recalls");
  });

  it("bridges a recommended troubleshooting test to an existing governed test-lab node when available", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("transmission issues", {
      diagnosticCase: {
        ...buildInput("transmission issues").diagnosticCase,
        testPlans: [{
          id: "plan-trans-1",
          status: "ACTIVE",
          version: 2,
          nodes: [{ id: "node-trans-fluid", nodeKey: "TRANS_FLUID_CHECK", title: "Check transmission fluid level, condition, and leaks" }]
        }]
      }
    }));
    expect(model.testExecutionBridge.state).toBe("EXISTING_PLAN_NODE_AVAILABLE");
    expect(model.testExecutionBridge.existingPlanNode?.nodeId).toBe("node-trans-fluid");
    expect(model.testExecutionBridge.mutationAllowed).toBe(false);
  });

  it("keeps recall and service-bulletin sources visible as unavailable rather than silently pretending", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("grinding noise from front passenger side"));
    expect(model.vehicleIntelligence.sources.find((source) => source.label === "Safety recall / campaign")?.state).toBe("NOT_CONNECTED");
    expect(model.vehicleIntelligence.sources.find((source) => source.label === "Service bulletin / warranty extension")?.state).toBe("NOT_CONNECTED");
    expect(model.vehicleIntelligence.acknowledgements.map((item) => item.id)).toContain("service_bulletin");
    expect(model.licensedConnectorInterfaces.find((connector) => connector.id === "OEM_TSB")?.status).toBe("LICENSE_REQUIRED");
    expect(model.masterTechnicianGate.enabled).toBe(false);
  });

  it("moves from evidence-needed to suspected-cause review only when evidence gates are ready", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("brake grinding", {
      diagnosticCase: {
        ...buildInput("brake grinding").diagnosticCase,
        observations: [{ id: "obs-1", qualityStatus: "VALID", statement: "Front pads are metal-to-metal." }],
        measurements: [{ id: "msr-1", plausibilityStatus: "PLAUSIBLE", qualityStatus: "VALID", quantity: "DISTANCE", unit: "mm", value: "0" }]
      },
      qualitySafetyGates: {
        counts: { currentMeasurements: 1, currentObservations: 1, independentGroups: 2, invalid: 0, suspect: 0 },
        readyForReasoning: true,
        reasonCodes: []
      }
    }));
    expect(model.evidenceGate.state).toBe("SUSPECTED_CAUSE_REVIEW");
    expect(model.commonCauses[0]?.rankState).toBe("SUPPORTED");
    expect(model.advisorHandoff.readiness).toBe("SUSPECTED_CAUSE_REVIEW");
    expect(model.learningLoop.state).toBe("WAITING_FOR_VERIFIED_OUTCOME");
  });

  it("creates advisor handoff and learning readiness once a case is verified closed", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("brake grinding", {
      diagnosticCase: {
        ...buildInput("brake grinding").diagnosticCase,
        status: "VERIFIED_CLOSED",
        observations: [{ id: "obs-1", qualityStatus: "VALID", statement: "Front pads are metal-to-metal." }],
        measurements: [{ id: "msr-1", plausibilityStatus: "PLAUSIBLE", qualityStatus: "VALID", quantity: "DISTANCE", unit: "mm", value: "0" }]
      },
      qualitySafetyGates: {
        counts: { currentMeasurements: 1, currentObservations: 1, independentGroups: 2, invalid: 0, suspect: 0 },
        readyForReasoning: true,
        reasonCodes: []
      }
    }));
    expect(model.advisorHandoff.readiness).toBe("CONFIRMED_CAUSE_REPAIR_RECOMMENDED");
    expect(model.advisorHandoff.draftPacket.warning).toContain("Do not present suspected causes");
    expect(model.learningLoop.state).toBe("OUTCOME_REVIEW_READY");
    expect(model.learningLoop.activationRule).toContain("reviewed");
  });

  it("normalizes troubleshooting session commands with governed override reasons", () => {
    const model = buildTechnicianTroubleshootingConsole(buildInput("transmission issues"));
    const command = normalizeDiagnosticTroubleshootingSessionCommand({
      advisorDraftPacket: model.advisorHandoff.draftPacket,
      expectedVersion: 3,
      idempotencyKey: "ttc-session-1",
      intakeRefinement: model.intakeRefinement,
      knownIssueSnapshot: model.vehicleIntelligence.knownIssueMatches,
      learningProposal: model.learningLoop,
      overrideReason: "tool unavailable",
      reason: "Record troubleshooting session from console review.",
      rulePackSnapshot: model.rulePackRegistry,
      selectedTestKey: model.nextTestPlan.recommendation?.key,
      supersedesId: "",
      vehicleIntelligenceAcknowledgements: model.vehicleIntelligence.acknowledgements
    });
    expect(command.expectedVersion).toBe(3);
    expect(command.overrideReason).toBe("tool unavailable");
    expect(command.knownIssueSnapshot).toHaveLength(1);
  });
});
