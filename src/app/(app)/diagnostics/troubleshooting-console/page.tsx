import { TechnicianTroubleshootingConsole } from "@/features/diagnostics/technician-troubleshooting-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { buildTechnicianTroubleshootingConsole } from "@/server/diagnostics/technician-troubleshooting-console";

export default async function TechnicianTroubleshootingConsoleTrialPage() {
  const user = await requireCurrentUser();
  const model = buildTechnicianTroubleshootingConsole({
    generatedAt: new Date().toISOString(),
    diagnosticCase: {
      ageHours: 2,
      assignedUser: { id: user.id, name: user.name },
      concern: "transmission issues after replacement estimate request",
      id: "trial-troubleshooting-console",
      location: { code: "TRIAL", id: "trial-location", name: "Trial Shop" },
      measurements: [],
      observations: [],
      repairOrder: { id: "trial-ro", repairOrderNumber: "TRIAL-RO" },
      riskTier: "R2",
      stage: "CONCERN",
      status: "TRIAGE",
      testPlans: [{
        id: "trial-test-plan",
        nodes: [{
          id: "trial-trans-fluid-node",
          nodeKey: "TRANS_FLUID_CHECK",
          title: "Check transmission fluid level, condition, and leaks",
          definition: { tools: ["lift", "fluid temperature source"] }
        }],
        status: "ACTIVE",
        version: 1
      }],
      vehicle: { id: "trial-vehicle", label: "2010 Mazda 3", make: "Mazda", model: "3", vin: "JM1BL1SF3A1257561", year: 2010 },
      version: 1
    },
    qualitySafetyGates: {
      counts: { currentMeasurements: 0, currentObservations: 0, independentGroups: 0, invalid: 0, suspect: 0 },
      readyForReasoning: false,
      reasonCodes: ["TRIAL_SAMPLE_DATA", "REASONING_INSUFFICIENT_EVIDENCE"]
    }
  });

  return <TechnicianTroubleshootingConsole
    model={{
      ...model,
      caseVersion: 1,
      permissions: { canSaveSession: false },
      savedSessions: []
    }}
  />;
}
