import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";

describe("EnterpriseTaskIntakePrototype", () => {
  it("renders the isolated intake contract and its two modes", () => {
    const markup = renderToStaticMarkup(<EnterpriseTaskIntakePrototype />);

    expect(markup).toContain("Enterprise Task Intake");
    expect(markup).toContain("Quick Intake");
    expect(markup).toContain("Guided Intake");
    expect(markup).toContain("Vehicle / Service");
    expect(markup).toContain("Task Readiness");
    expect(markup).toContain("Collaborators");
    expect(markup).toContain("Choose a staff member");
    expect(markup).toContain("Add collaborator");
    expect(markup).toContain("Production intake");
    expect(markup).toContain("Accountable owner");
    expect(markup).toContain("Save Draft");
    expect(markup).toContain("Create Task");
    expect(markup).not.toContain("Production phase");
  });

  it("returns users to the console that opened intake", () => {
    const markup = renderToStaticMarkup(<EnterpriseTaskIntakePrototype returnTo="/customers/resolutions" />);
    expect(markup).toContain('href="/customers/resolutions"');
    expect(markup).toContain("Return to source console");
  });
});
