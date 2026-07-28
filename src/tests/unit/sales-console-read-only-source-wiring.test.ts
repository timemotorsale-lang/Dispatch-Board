import { describe, expect, it } from "vitest";

import {
  m10ReadOnlySourcesHaveHonestFallbackLabels,
  m10ReadOnlySourcesPreserveSystemOfRecord,
  m10SourceWiringExtendsMvpRealDataSources,
  m10UnavailableSourcesRemainBlocked,
  m10WiredSourcesUseNamedReadServices,
  salesConsoleM10ReadOnlySourceWiring
} from "@/features/sales/sales-console-m10-read-only-source-wiring";

describe("Sales Console M10 read-only source wiring", () => {
  it("extends the MVP real-data wiring sources", () => {
    expect(m10SourceWiringExtendsMvpRealDataSources()).toBe(true);
  });

  it("preserves source systems as read-only systems of record", () => {
    expect(m10ReadOnlySourcesPreserveSystemOfRecord()).toBe(true);
    expect(salesConsoleM10ReadOnlySourceWiring.every((wire) => wire.writeEnabled === false)).toBe(true);
  });

  it("labels current, fallback, verify-first, and unavailable source states honestly", () => {
    expect(m10ReadOnlySourcesHaveHonestFallbackLabels()).toBe(true);
    expect(salesConsoleM10ReadOnlySourceWiring.some((wire) => wire.freshnessLabel === "current")).toBe(true);
    expect(salesConsoleM10ReadOnlySourceWiring.some((wire) => wire.freshnessLabel === "placeholder")).toBe(true);
    expect(salesConsoleM10ReadOnlySourceWiring.some((wire) => wire.freshnessLabel === "verify-first")).toBe(true);
    expect(salesConsoleM10ReadOnlySourceWiring.some((wire) => wire.freshnessLabel === "unavailable")).toBe(true);
  });

  it("keeps unavailable marketing and finance sources blocked", () => {
    expect(m10UnavailableSourcesRemainBlocked()).toBe(true);
    expect(
      salesConsoleM10ReadOnlySourceWiring
        .filter((wire) => wire.status === "unavailable")
        .map((wire) => wire.sourceSystem)
    ).toEqual(["Marketing attribution", "Finance handoff"]);
  });

  it("uses named read services for wired sources", () => {
    expect(m10WiredSourcesUseNamedReadServices()).toBe(true);
  });
});
