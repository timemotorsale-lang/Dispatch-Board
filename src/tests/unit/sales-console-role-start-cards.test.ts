import { describe, expect, it } from "vitest";

import {
  getSalesConsoleM12StartCard,
  salesConsoleM12RoleStartCards,
  salesConsoleM12StartCardsCoverEveryLanding,
  salesConsoleM12StartCardsRemainReadOnly
} from "@/features/sales/sales-console-m12-role-start-cards";

describe("Sales Console M12 role start cards", () => {
  it("covers every role landing experience", () => {
    expect(salesConsoleM12StartCardsCoverEveryLanding()).toBe(true);
    expect(salesConsoleM12RoleStartCards).toHaveLength(7);
  });

  it("keeps start cards read-only", () => {
    expect(salesConsoleM12StartCardsRemainReadOnly()).toBe(true);
  });

  it("returns a start card for a specific role", () => {
    expect(getSalesConsoleM12StartCard("salesperson")?.title).toBe("Start with Today");
  });
});
