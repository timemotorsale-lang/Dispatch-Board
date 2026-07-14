import { describe, expect, it } from "vitest";
import { buildScorecard, cohortAverages, findBottlenecks, materializeDailyFacts } from "@/server/reporting";

describe("enterprise reporting metrics", () => {
  const facts = materializeDailyFacts([{ tenantId: "t", metric: "throughput", day: "2026-07-13", numerator: 8, denominator: 10, source: "daily-job", definitionVersion: "v1" }, { tenantId: "t", metric: "throughput", day: "2026-07-14", value: 0.9, source: "daily-job", definitionVersion: "v1" }], new Date("2026-07-15T00:00:00Z"));
  it("materializes governed facts and scorecards", () => expect(buildScorecard(facts, "t", "2026-07-13", "2026-07-14").metrics.throughput.value).toBeCloseTo(.85));
  it("ranks blocked stages", () => expect(findBottlenecks([{ stage: "title", ageHours: 10 }, { stage: "title", ageHours: 4 }, { stage: "recon", ageHours: 20 }])[0].key).toBe("title"));
  it("calculates cohort averages", () => expect(cohortAverages([{ cohort: "A", days: 2 }, { cohort: "A", days: 4 }, { cohort: "B", days: 9 }], "days")[0].average).toBe(3));
});
