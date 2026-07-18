import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramIntegrationValidationWorkspace } from "@/features/inventory/program-integration-validation-workspace";
import { getProgramIntegrationValidation } from "@/server/program-integration-validation/service";

describe("program integration validation workspace", () => {
  it("separates repository conformance from operational evidence", () => {
    const actor = { id: "manager", name: "Manager", email: "manager@example.com", roles: ["General Manager"], duties: { all: [], byRole: {} } } as never;
    const html = renderToStaticMarkup(<ProgramIntegrationValidationWorkspace model={getProgramIntegrationValidation(actor)} />);
    expect(html).toContain("Program conformance");
    expect(html).toContain("Roadmap releases</span><strong>13");
    expect(html).toContain("Milestone groups</span><strong>13");
    expect(html).toContain("Vertical slices</span><strong>121");
    expect(html).toContain("No production-readiness shortcut");
    expect(html).toContain("EVIDENCE_REQUIRED");
    expect(html).toContain("Vertical slices");
  });
});
