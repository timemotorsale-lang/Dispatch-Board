import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("EnterpriseTaskIntakePrototype", () => {
  it("renders the simplified intake contract and enterprise tool selector", () => {
    const markup = renderToStaticMarkup(<EnterpriseTaskIntakePrototype />);

    expect(markup).toContain("Task Intake");
    expect(markup).toContain('alt="Time Motor Sales"');
    expect(markup).toContain("time-motor-sales-horizontal");
    expect(markup).toContain("Simple capture");
    expect(markup).toContain("Task tools");
    expect(markup).toContain("Intake type");
    expect(markup).toContain("Assignee and collaborators");
    expect(markup).toContain("Task context");
    expect(markup).toContain("Controls");
    expect(markup).toContain("Uploads");
    expect(markup).toContain("Checklist");
    expect(markup).toContain("Subtasks");
    expect(markup).toContain("Vehicle / Service");
    expect(markup).toContain("Task description");
    expect(markup).toContain("Assign to staff");
    expect(markup).toContain("Choose task owner");
    expect(markup).toContain("Production intake");
    expect(markup).toContain("Save Draft");
    expect(markup).toContain("Create Task");
    expect(markup).toContain("Review &amp; Create");
    expect(markup).not.toContain("Enterprise Task Intake");
    expect(markup).not.toContain("Guided Intake");
    expect(markup).not.toContain("Task Readiness");
    expect(markup).not.toContain("Production phase");
  });

  it("returns users to the console that opened intake", () => {
    const markup = renderToStaticMarkup(<EnterpriseTaskIntakePrototype returnTo="/customers/resolutions" />);
    expect(markup).toContain('href="/customers/resolutions"');
    expect(markup).toContain("Return to source console");
  });
  it("shows the context opt-out directly for manager planning tasks", () => {
    const markup = renderToStaticMarkup(<EnterpriseTaskIntakePrototype canAssignOthers currentUserId="manager" initialDraft={{ intakeType: "Manager Decision", title: "November 2026 action plans", brief: "Review and assign the main operating goals for November." }} />);
    expect(markup).toContain("Task scope and context");
    expect(markup).toContain("No customer or vehicle is needed for this task");
    expect(markup).toContain('id="task-intake-context"');
    expect(markup).toContain("Inventory / multiple vehicles");
    expect(markup).toContain("Operations / action plan");
  });

});
