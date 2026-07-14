import { describe, expect, it } from "vitest";
import { normalizeEvidenceUpload, scanVehicleEvidence, sortVehicleTimeline, stableEvidenceId } from "@/server/vehicle-360/domain";

const now = new Date("2026-07-14T12:00:00.000Z");
const base = { accessLevel: "INTERNAL", category: "PHOTO", contentType: "image/png", fileName: "arrival.png", idempotencyKey: "upload-1", reason: "Attach arrival condition evidence.", retentionUntil: "2029-07-14T12:00:00.000Z", subjectType: "VEHICLE", vehicleId: "vehicle-1" };
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("safe evidence")]);

describe("Vehicle 360 evidence domain", () => {
  it("normalizes a governed upload and computes server-owned integrity evidence", () => {
    const result = normalizeEvidenceUpload({ ...base, contentBase64: png.toString("base64") }, now);
    expect(result).toMatchObject({ accessLevel: "INTERNAL", category: "PHOTO", contentType: "image/png", fileName: "arrival.png", vehicleId: "vehicle-1" });
    expect(result.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.scan).toMatchObject({ malwareStatus: "CLEAN", reasonCode: "BASELINE_CLEAN" });
  });

  it("quarantines executable, active-markup, EICAR, and content-type mismatch signatures", () => {
    expect(scanVehicleEvidence(Buffer.from([0x4d, 0x5a, 0, 0]), "text/plain").malwareStatus).toBe("DETECTED");
    expect(scanVehicleEvidence(Buffer.from("<script>alert(1)</script>"), "text/plain").reasonCode).toBe("ACTIVE_MARKUP_SIGNATURE");
    expect(scanVehicleEvidence(Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"), "text/plain").reasonCode).toBe("EICAR_SIGNATURE");
    expect(scanVehicleEvidence(Buffer.from("not a png"), "image/png").reasonCode).toBe("CONTENT_TYPE_SIGNATURE_MISMATCH");
  });

  it("rejects unsafe names, unsupported content, and invalid retention", () => {
    expect(() => normalizeEvidenceUpload({ ...base, contentBase64: png.toString("base64"), fileName: "../arrival.png" }, now)).toThrow("path");
    expect(() => normalizeEvidenceUpload({ ...base, contentBase64: png.toString("base64"), contentType: "application/zip" }, now)).toThrow("Content type");
    expect(() => normalizeEvidenceUpload({ ...base, contentBase64: png.toString("base64"), retentionUntil: now.toISOString() }, now)).toThrow("at least one day");
  });

  it("uses stable idempotent evidence identities and deterministic newest-first timelines", () => {
    expect(stableEvidenceId("org", "upload-1")).toBe(stableEvidenceId("org", "upload-1"));
    const timeline = sortVehicleTimeline([
      { id: "old", occurredAt: new Date("2026-01-01"), source: "A", type: "A", title: "Old", detail: null, subjectType: "VEHICLE", subjectId: "v" },
      { id: "new", occurredAt: new Date("2026-07-01"), source: "B", type: "B", title: "New", detail: null, subjectType: "VEHICLE", subjectId: "v" }
    ]);
    expect(timeline.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
