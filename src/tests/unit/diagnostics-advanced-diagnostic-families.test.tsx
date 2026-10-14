import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdvancedDiagnosticsLab } from "@/features/diagnostics/diagnostic-lab-workspace";
import { ADVANCED_DIAGNOSTIC_FAMILIES, ADVANCED_DIAGNOSTIC_FAMILY_LIST } from "@/server/diagnostics/advanced-diagnostic-families";

describe("advanced diagnostic families", () => {
  it("defines six complete evidence-gated specialty pathways", () => {
    expect(ADVANCED_DIAGNOSTIC_FAMILY_LIST.map((family) => family.key)).toEqual([
      "TRANSMISSION", "ADAS", "NETWORK_COMMUNICATION", "DIESEL", "HYBRID_EV", "INTERMITTENT"
    ]);

    for (const family of ADVANCED_DIAGNOSTIC_FAMILY_LIST) {
      expect(family.stages).toHaveLength(6);
      expect(family.qualification).toBeTruthy();
      expect(family.sourceBoundary).toBeTruthy();
      for (const stage of family.stages) {
        expect(stage.checks.length).toBeGreaterThan(0);
        expect(stage.requiredEvidence.length).toBeGreaterThan(0);
        expect(stage.exitCriteria.length).toBeGreaterThan(0);
        expect(stage.stopConditions.length).toBeGreaterThan(0);
      }
    }
  });

  it("preserves the critical specialty safety and diagnostic boundaries", () => {
    expect(ADVANCED_DIAGNOSTIC_FAMILIES.ADAS.sourceBoundary).toContain("generic values are prohibited");
    expect(JSON.stringify(ADVANCED_DIAGNOSTIC_FAMILIES.ADAS.stages)).toMatch(/geometry|environment|calibration/i);
    expect(JSON.stringify(ADVANCED_DIAGNOSTIC_FAMILIES.NETWORK_COMMUNICATION.stages)).toMatch(/topology|physical-layer|isolation/i);
    expect(JSON.stringify(ADVANCED_DIAGNOSTIC_FAMILIES.HYBRID_EV.stages)).toMatch(/high-voltage|isolation|thermal/i);
    expect(JSON.stringify(ADVANCED_DIAGNOSTIC_FAMILIES.INTERMITTENT.stages)).toMatch(/capture|not found|NFF/i);
  });

  it("renders a simple clickable specialty and stage review surface", () => {
    const html = renderToStaticMarkup(<AdvancedDiagnosticsLab caseReference="RO-1042 · v2" />);
    expect(html).toContain("Advanced diagnostics");
    expect(html).toContain("Transmission &amp; driveline");
    expect(html).toContain("ADAS &amp; calibration");
    expect(html).toContain("Hybrid &amp; electric vehicle");
    expect(html).toContain("Stage 1 of 6");
    expect(html).toContain("What to check");
    expect(html).toContain("Required evidence");
    expect(html).toContain("Exit criteria");
    expect(html).toContain("Stop &amp; escalate");
    expect(html).toContain("Exact procedure required");
  });
});
