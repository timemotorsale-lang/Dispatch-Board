import { describe, expect, it } from "vitest";

import { analyzeLaborLanguage, LABOR_LANGUAGE_INTELLIGENCE_VERSION } from "@/server/diagnostics/labor-language-intelligence";
import { LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";

const analyze = (input: string) => analyzeLaborLanguage(input, LABOR_OPERATION_TAXONOMY);

describe("deterministic Diagnostics labor language intelligence", () => {
  it("distinguishes an explicit transmission replacement from a vague concern", () => {
    const replacement = analyze("transmission replacement");
    const concern = analyze("transmission issues");

    expect(replacement).toMatchObject({
      intent: "REQUESTED_REPAIR",
      version: LABOR_LANGUAGE_INTELLIGENCE_VERSION
    });
    expect(replacement.candidates[0]?.operation.id).toBe("transmission-remove-install");

    expect(concern.intent).toBe("CUSTOMER_CONCERN");
    expect(concern.candidates[0]?.operation.id).toBe("transmission-concern-diagnosis");
    expect(concern.candidates.map((candidate) => candidate.operation.id)).not.toContain("transmission-remove-install");
    expect(concern.summary).toContain("diagnostic starting points");
  });

  it("treats a bare system name as browsing context rather than a failed search", () => {
    const result = analyze("engine");

    expect(result.intent).toBe("SYSTEM_BROWSE");
    expect(result.detectedSystems).toContainEqual({ id: "engine", title: "Engine Mechanical & Performance" });
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) => candidate.operation.system === "Engine Mechanical & Performance")).toBe(true);
    expect(result.clarification).toContain("What symptom or work is needed");
  });

  it("prefers diagnosis over replacement for an engine symptom", () => {
    const result = analyze("engine is shaking at idle");

    expect(result.intent).toBe("CUSTOMER_CONCERN");
    expect(result.candidates[0]?.operation.id).toBe("engine-performance-diagnosis");
    expect(result.candidates[0]?.reasons).toContain("Preferred diagnostic work for a customer concern");
  });

  it("does not offer unproven engine replacement work for a generic engine issue", () => {
    const result = analyze("engine issues");

    expect(result.intent).toBe("CUSTOMER_CONCERN");
    expect(result.candidates.map((candidate) => candidate.operation.id)).toEqual(["engine-performance-diagnosis"]);
    expect(result.clarification).toContain("Add a symptom");
  });

  it("recognizes inspection findings and ranks the observed component", () => {
    const result = analyze("technician found leaking oil pan gasket");

    expect(result.intent).toBe("INSPECTION_FINDING");
    expect(result.candidates[0]?.operation.id).toBe("oil-pan-gasket");
  });

  it("handles common spelling variance without inventing a repair", () => {
    const result = analyze("transmision issue");

    expect(result.intent).toBe("CUSTOMER_CONCERN");
    expect(result.detectedSystems[0]?.id).toBe("transmission-drivetrain");
    expect(result.candidates[0]?.operation.id).toBe("transmission-concern-diagnosis");
  });

  it("abstains safely when no governed category or operation is reliable", () => {
    const result = analyze("something feels weird");

    expect(result.intent).toBe("CUSTOMER_CONCERN");
    expect(result.confidence).toBe("ABSTAIN");
    expect(result.candidates).toEqual([]);
    expect(result.clarification).toContain("custom diagnostic investigation");
  });
});
