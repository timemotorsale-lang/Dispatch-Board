import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { OPERATIONAL_VALIDATION_GATES, PROGRAM_JOURNEYS, PROGRAM_RELEASES } from "./catalog";
import { getVerticalSliceClassificationIndex } from "./vertical-slice-audit";

export function getProgramIntegrationValidation(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor); if (!isManager(user)) throw new Error("Program integration validation requires manager privileges.");
  return {
    contractVersion: "inventory-console-program-validation/v1",
    generatedAt: new Date().toISOString(),
    repositoryValidation: { command: "npm run validate:inventory-console", evidenceClass: "REPOSITORY_CONFORMANCE", persistedResult: false },
    operationalValidation: { disposition: "EVIDENCE_REQUIRED" as const, gates: OPERATIONAL_VALIDATION_GATES },
    totals: { releases: PROGRAM_RELEASES.length, milestones: new Set(PROGRAM_RELEASES.map((release) => release.milestone)).size, slices: PROGRAM_RELEASES.reduce((sum, release) => sum + release.slices.length, 0), journeys: PROGRAM_JOURNEYS.length },
    releases: PROGRAM_RELEASES,
    journeys: PROGRAM_JOURNEYS,
    verticalSlices: getVerticalSliceClassificationIndex()
  };
}
