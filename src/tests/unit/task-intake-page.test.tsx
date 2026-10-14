import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  EnterpriseTaskIntakePrototype: vi.fn(),
  listActiveUserSummaries: vi.fn(),
  requireCurrentUser: vi.fn()
}));

vi.mock("@/features/prototype/enterprise-task-intake-prototype", () => ({
  EnterpriseTaskIntakePrototype: mocks.EnterpriseTaskIntakePrototype
}));
vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));
vi.mock("@/server/services/user-summary", () => ({
  listActiveUserSummaries: mocks.listActiveUserSummaries
}));

import TaskIntakePage from "@/app/(app)/tasks/intake/page";

describe("Task intake page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "manager-1",
      name: "Manager",
      email: "manager@example.test",
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    });
    mocks.listActiveUserSummaries.mockResolvedValue([]);
    mocks.EnterpriseTaskIntakePrototype.mockImplementation((props: { returnTo: string }) => <div data-return-to={props.returnTo}>Task intake</div>);
  });

  it("forwards only safe CRM handoff defaults and preserves a local return path", async () => {
    renderToStaticMarkup(await TaskIntakePage({
      searchParams: Promise.resolve({
        brief: "Document the promised customer follow-up.",
        customerReference: "Alex Morgan · CUS-001",
        dueDate: "2026-08-15",
        dueTime: "10:30",
        expectedOutcome: "The customer follow-up and next step are recorded.",
        intakeType: "Customer Issue",
        returnTo: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers",
        title: "Follow up with Alex Morgan",
        workflowArea: "SALES"
      })
    }));

    expect(mocks.EnterpriseTaskIntakePrototype).toHaveBeenCalledWith(expect.objectContaining({
      initialDraft: {
        brief: "Document the promised customer follow-up.",
        customerReference: "Alex Morgan · CUS-001",
        dueDate: "2026-08-15",
        dueTime: "10:30",
        expectedOutcome: "The customer follow-up and next step are recorded.",
        intakeType: "Customer Issue",
        title: "Follow up with Alex Morgan",
        workflowArea: "SALES"
      },
      returnTo: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    }), undefined);
  });

  it("rejects unsafe return paths and unsupported handoff values", async () => {
    renderToStaticMarkup(await TaskIntakePage({
      searchParams: Promise.resolve({
        dueDate: "2026-99-99",
        intakeType: "Hack",
        returnTo: "https://evil.example",
        workflowArea: "DROP_TABLE"
      })
    }));

    expect(mocks.EnterpriseTaskIntakePrototype).toHaveBeenCalledWith(expect.objectContaining({
      initialDraft: {
        brief: undefined,
        customerReference: undefined,
        dueDate: undefined,
        dueTime: undefined,
        expectedOutcome: undefined,
        intakeType: undefined,
        title: undefined,
        workflowArea: undefined
      },
      returnTo: "/tasks"
    }), undefined);
  });
});
