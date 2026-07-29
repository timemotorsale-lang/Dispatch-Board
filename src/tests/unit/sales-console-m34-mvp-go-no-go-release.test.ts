import { describe, expect, it } from "vitest";

import {
  salesConsoleM34BlocksReleaseOnKnownNoGoRisks,
  salesConsoleM34DefinesFinalGoDecision,
  salesConsoleM34MvpGoNoGoRelease,
  salesConsoleM34ProvidesImmediateLaunchSequence,
  salesConsoleM34RequiresAllCriticalVerification
} from "@/features/sales/sales-console-m34-mvp-go-no-go-release";

describe("Sales Console M34 MVP go/no-go release", () => {
  it("defines the final MVP release decision", () => {
    expect(salesConsoleM34DefinesFinalGoDecision()).toBe(true);
    expect(salesConsoleM34MvpGoNoGoRelease.releaseDecision).toBe("go-after-environment-verification");
  });

  it("requires all critical verification gates", () => {
    expect(salesConsoleM34RequiresAllCriticalVerification()).toBe(true);
  });

  it("blocks release on known no-go risks", () => {
    expect(salesConsoleM34BlocksReleaseOnKnownNoGoRisks()).toBe(true);
  });

  it("provides the immediate launch sequence", () => {
    expect(salesConsoleM34ProvidesImmediateLaunchSequence()).toBe(true);
  });
});
