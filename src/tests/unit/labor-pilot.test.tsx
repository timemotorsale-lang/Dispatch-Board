import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectedRepairCatalog } from "@/features/diagnostics/connected-repair-catalog";
import { connectedLaborSelection, laborOperationForLineKey } from "@/lib/labor-catalog-selection";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { assertCurrentRepairAuthorization, assertLaborChronology } from "@/lib/repair-authorization-current";
import { actualLaborEvidence, type ActualLaborJob } from "@/lib/labor-actual-evidence";
import { evaluateLaborPilotRelease, LABOR_RELEASE_GATES, type LaborReleaseEvidence } from "@/lib/labor-pilot-release";

describe("connected labor pilot", () => {
  const catalog = flattenLaborOperationTaxonomy();
  it("maps preview identity to canonical labor without importing illustrative prices", () => {
    const operation = connectedLaborSelection({ id: "front-pads-rotors" }, catalog);
    expect(operation.id).toBe("front-brake-pads-rotors");
    expect(operation.hours).toBe(2.1);
    expect(operation).not.toHaveProperty("parts");
    expect(() => connectedLaborSelection({ id: "engine-misfire" }, catalog)).toThrow("not completed");
  });
  it("preserves position identity through draft and server line keys", () => {
    const operation = connectedLaborSelection({ id: "wheel-speed-sensor:front-left", catalogOperationId: "wheel-speed-sensor", position: "front-left" }, catalog);
    expect(laborOperationForLineKey("labor-wheel-speed-sensor-front-left", catalog)?.id).toBe(operation.id);
    expect(laborOperationForLineKey("labor-wheel-speed-sensor-rear-left", catalog)).toBeNull();
    expect(() => connectedLaborSelection({ id: "wheel-speed-sensor:front-right", catalogOperationId: "wheel-speed-sensor", position: "front-left" }, catalog)).toThrow("Invalid selected position");
  });
  it("renders real context, inherited rate and pending system audits without preview draft actions", () => {
    const html = renderToStaticMarkup(<ConnectedRepairCatalog vehicle="Actual selected vehicle" concern="Reported concern" selected={[]} laborRate={125} onSelect={() => undefined} onReview={() => undefined} />);
    expect(html).toContain("Actual selected vehicle"); expect(html).toContain("125.00"); expect(html).toContain("approval pending");
    expect(html).not.toContain("Reference vehicle: 2019"); expect(html).not.toContain("Load saved draft");
  });
});

describe("authorization and actual labor safety", () => {
  it("requires current accepted/partial line authority", () => {
    const input = { authorizationId: "current", authorizedLineKey: "labor-one" };
    expect(() => assertCurrentRepairAuthorization(input, { id: "current", disposition: "PARTIAL", authorizedLineKeys: ["labor-one"] })).not.toThrow();
    for (const latest of [null, { id: "other", disposition: "ACCEPTED", authorizedLineKeys: ["labor-one"] }, { id: "current", disposition: "REVOKED", authorizedLineKeys: ["labor-one"] }, { id: "current", disposition: "ACCEPTED", authorizedLineKeys: [] }]) expect(() => assertCurrentRepairAuthorization(input, latest)).toThrow("authorization");
  });
  it("rejects reverse chronology and corrections below zero rather than clamping history", () => {
    expect(() => assertLaborChronology(new Date("2026-10-16T10:00Z"), new Date("2026-10-16T11:00Z"), 10, null)).toThrow("precede");
    expect(() => assertLaborChronology(new Date(), null, 10, -11)).toThrow("negative");
    expect(() => assertLaborChronology(new Date(), null, 10, -10)).not.toThrow();
  });
  const sample: ActualLaborJob = { id: "job", operationId: "front-pads", catalogVersion: "brakes-light-duty-v1", vehicleConfiguration: "Reviewed VIN/configuration and scope", plannedMinutes: 72, qcPassedAt: "2026-10-16T12:00:00.000Z", latestQcPassed: true, rework: false, clocks: [{ state: "FINISHED", accumulatedMinutes: 65, finishedAt: "2026-10-16T11:00:00.000Z", technicianUserId: "tech" }], events: [{ eventType: "FINISH", occurredAt: "2026-10-16T11:00:00.000Z", technicianUserId: "tech" }] };
  it("distinguishes measured clocks from planned minutes and never publishes a standard", () => { expect(actualLaborEvidence(sample)).toMatchObject({ measuredTechnicianMinutes: 65, plannedMinutes: 72, eligibleForStudy: true, validatedStandard: false }); });
  it("excludes unmapped, unfinished, reworked, unmeasured and post-QC-corrected work", () => {
    for (const job of [{ ...sample, clocks: [] }, { ...sample, latestQcPassed: false }, { ...sample, rework: true }, { ...sample, catalogVersion: null }, { ...sample, events: [] }, { ...sample, events: [...sample.events, { eventType: "CORRECTION", occurredAt: "2026-10-16T13:00:00.000Z", technicianUserId: "tech" }] }]) expect(actualLaborEvidence(job).eligibleForStudy).toBe(false);
  });
});

describe("manual release evidence gate", () => {
  const revision = "a".repeat(40);
  const evidence: LaborReleaseEvidence = { revision, stagingOrigin: "https://staging.example.test", productionOrigin: "https://shop.example.test", recordedAt: "2026-10-16T10:00:00Z", signoff: { owner: "Owner", reviewer: "Independent reviewer" }, gates: Object.fromEntries(LABOR_RELEASE_GATES.map(key => [key, { status: "PASS", artifact: `evidence/${key}.json`, sha256: "a".repeat(64), reviewer: "Reviewer" }])) };
  it("requires current, isolated, independently signed evidence for every gate", () => {
    expect(evaluateLaborPilotRelease(evidence, revision, new Date("2026-10-16T12:00Z")).status).toBe("ELIGIBLE_FOR_MANUAL_PROMOTION");
    for (const changed of [{ ...evidence, gates: {} }, { ...evidence, revision: "b".repeat(40) }, { ...evidence, stagingOrigin: evidence.productionOrigin }, { ...evidence, recordedAt: "2026-09-01" }, { ...evidence, signoff: { owner: "Owner", reviewer: "owner" } }]) expect(evaluateLaborPilotRelease(changed, revision, new Date("2026-10-16T12:00Z")).status).toBe("HOLD");
  });
});
