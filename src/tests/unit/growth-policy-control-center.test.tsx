import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GrowthPolicyControlCenter } from "@/features/growth/growth-policy-control-center";
import { buildGrowthPolicyControlCenterModel } from "@/server/growth/policy-control-center";

describe("Growth Policy Control Center", () => {
  it("builds a locked-by-default policy model", () => {
    const model = buildGrowthPolicyControlCenterModel(new Date("2026-09-08T20:00:00.000Z"));

    expect(model.launchPosture).toBe("Locked by default");
    expect(model.policyVersion.source).toBe("Default review model");
    expect(model.summary.total).toBeGreaterThanOrEqual(8);
    expect(model.summary.locked).toBeGreaterThan(0);
    expect(model.controls.some((control) => control.area === "Live customer sends" && control.state === "Locked")).toBe(true);
    expect(model.controls.some((control) => control.area === "CRM and source record mutation" && control.state === "Locked")).toBe(true);
    expect(model.budgetPolicies.some((policy) => policy.channel === "Paid ads" && policy.currentLimit === "$0 live spend")).toBe(true);
  });

  it("renders manager-visible policy controls without enabling live actions", () => {
    const markup = renderToStaticMarkup(
      <GrowthPolicyControlCenter model={buildGrowthPolicyControlCenterModel(new Date("2026-09-08T20:00:00.000Z"))} />
    );

    expect(markup).toContain("Policy control mode");
    expect(markup).toContain("Control Center");
    expect(markup).toContain("Policy version");
    expect(markup).toContain("What Growth is allowed to do");
    expect(markup).toContain("Live customer sends");
    expect(markup).toContain("Paid advertising spend");
    expect(markup).toContain("CRM and source record mutation");
    expect(markup).toContain("No hidden spend");
    expect(markup).toContain("Policy Audit");
    expect(markup).not.toContain("Schedule launch");
  });
});
