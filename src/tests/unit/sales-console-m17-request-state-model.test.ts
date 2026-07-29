import { describe, expect, it } from "vitest";

import {
  salesConsoleM17RequestStateModel,
  salesConsoleM17StateModelBlocksSubmitWithoutBackend,
  salesConsoleM17StateModelDefinesStatuses,
  salesConsoleM17StateModelKeepsWorkflowInternal
} from "@/features/sales/sales-console-m17-request-state-model";

describe("Sales Console M17 request state model", () => {
  it("defines controlled manager review request transitions", () => {
    expect(salesConsoleM17StateModelDefinesStatuses()).toBe(true);
    expect(salesConsoleM17RequestStateModel.allowedTransitions[0]?.from).toBe("draft");
  });

  it("blocks submit without a dedicated backend destination", () => {
    expect(salesConsoleM17StateModelBlocksSubmitWithoutBackend()).toBe(true);
  });

  it("keeps the workflow internal and not live", () => {
    expect(salesConsoleM17StateModelKeepsWorkflowInternal()).toBe(true);
    expect(salesConsoleM17RequestStateModel.workflowLive).toBe(false);
  });
});
