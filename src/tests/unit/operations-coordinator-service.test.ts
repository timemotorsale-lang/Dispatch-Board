import { describe, expect, it } from "vitest";

import {
  rankCoordinatorActions,
  resolveCoordinatorAction
} from "@/server/operations-coordinator/service";

describe("operations coordinator workspace algorithms", () => {
  it("ranks customer waiting, promise risk, blockers, and missing documents ahead of ordinary tasks", () => {
    const now = new Date("2026-07-20T14:00:00.000Z");
    const ranked = rankCoordinatorActions([
      {
        id: "ordinary-task",
        type: "TASK",
        label: "File completed packet",
        detail: "Office task",
        href: "/tasks/ordinary-task",
        source: "Tasks"
      },
      {
        id: "waiting-customer",
        type: "CUSTOMER_WAITING",
        label: "Customer at counter",
        detail: "Waiting now",
        href: "/appointments",
        source: "Appointments",
        customerWaiting: true,
        appointmentAt: "2026-07-20T14:05:00.000Z"
      },
      {
        id: "promise-risk",
        type: "PROMISE_RISK",
        label: "RO promise risk",
        detail: "Target passed",
        href: "/vehicles/repair-workbench",
        source: "Repair Orders",
        dueAt: "2026-07-20T13:30:00.000Z",
        promiseRisk: true,
        blockerSeverity: "HIGH"
      },
      {
        id: "missing-document",
        type: "MISSING_DOCUMENT",
        label: "Insurance missing",
        detail: "Proof needed",
        href: "/tasks?department=SALES",
        source: "Paperwork",
        missingDocument: true
      }
    ], now);

    expect(ranked.map((item) => item.id).slice(0, 3)).toEqual([
      "waiting-customer",
      "promise-risk",
      "missing-document"
    ]);
    expect(ranked[0].rank).toBeGreaterThan(ranked[3].rank);
  });

  it("resolves actions into safe coordinator outcomes", () => {
    expect(resolveCoordinatorAction({ type: "MISSING_DOCUMENT" })).toBe("COMPLETE_SAFELY");
    expect(resolveCoordinatorAction({ type: "ARRIVAL" })).toBe("PREPARE_CANONICAL_WORKFLOW");
    expect(resolveCoordinatorAction({ type: "PROMISE_RISK" })).toBe("ROUTE_TO_AUTHORITY");
    expect(resolveCoordinatorAction({ type: "PAYMENT_RISK" })).toBe("READ_ONLY_PEEK");
  });
});
