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
    expect(markup).toContain("No database writes");
    expect(markup).toContain("Create Task");
    expect(markup).not.toContain("action=\"");
  });
});
