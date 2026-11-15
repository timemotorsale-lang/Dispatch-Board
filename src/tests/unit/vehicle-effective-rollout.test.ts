import { describe, expect, it } from "vitest";
import { evaluateDiagnosticsFeature, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";

type Flag = Parameters<typeof evaluateVehicleOperationsFeature>[0][number];
const master = "VEHICLE_OPERATIONS_MASTER";
const site = "shop-a";
const other = "shop-b";
const user = "staff-1";

function flag(code: string, mode: Flag["mode"], locationId: string | null = null, allowedUserIds: string[] = []): Flag {
  return { id: code + (locationId ?? ""), code, mode, locationId, allowedUserIds, rolloutPercent: 0, organizationId: "org-1", targetAt: null, updatedAt: new Date(0), version: 1 };
}

describe.each(["SHOP_OPERATIONS", "PARTS_OPERATIONS"] as const)("%s effective rollout", (domain) => {
  it("fails closed when the master or domain is missing", () => {
    expect(evaluateVehicleOperationsFeature([flag(domain, "GENERAL", site)], domain, user, site)).toMatchObject({ executable: false, reason: "MASTER_DISABLED" });
    expect(evaluateVehicleOperationsFeature([flag(master, "GENERAL"), flag(domain, "GENERAL", other)], domain, user, site)).toMatchObject({ executable: false, reason: "FEATURE_DISABLED" });
  });

  it("honors a site pause over organization defaults without affecting another site", () => {
    const defaults = [flag(master, "GENERAL"), flag(domain, "GENERAL")];
    expect(evaluateVehicleOperationsFeature([...defaults, flag(master, "OFF", site)], domain, user, site)).toMatchObject({ executable: false, reason: "MASTER_DISABLED" });
    const flags = [...defaults, flag(domain, "OFF", site)];
    expect(evaluateVehicleOperationsFeature(flags, domain, user, site)).toMatchObject({ executable: false, reason: "FEATURE_DISABLED" });
    expect(evaluateVehicleOperationsFeature(flags, domain, user, other)).toMatchObject({ executable: true, reason: "GENERAL_RELEASE" });
  });

  it("uses the site's pilot allowlist and keeps shadow mode read-only", () => {
    const defaults = [flag(master, "GENERAL"), flag(domain, "GENERAL")];
    const flags = [...defaults, flag(domain, "PILOT", site, [user])];
    expect(evaluateVehicleOperationsFeature(flags, domain, user, site)).toMatchObject({ executable: true, reason: "PILOT_ELIGIBLE" });
    expect(evaluateVehicleOperationsFeature(flags, domain, "staff-2", site)).toMatchObject({ executable: false, reason: "OUTSIDE_PILOT" });
    expect(evaluateVehicleOperationsFeature([...defaults, flag(domain, "SHADOW", site)], domain, user, site)).toMatchObject({ executable: false, reason: "SHADOW_ONLY" });
  });

  it("prevents writes under a shadow master even when the domain is general", () => {
    const flags = [flag(master, "GENERAL"), flag(master, "SHADOW", site), flag(domain, "GENERAL")];
    expect(evaluateVehicleOperationsFeature(flags, domain, user, site).executable).toBe(false);
  });

  it("requires master and domain pilot eligibility independently", () => {
    const flags = [flag(master, "GENERAL"), flag(master, "PILOT", site, ["staff-2"]), flag(domain, "PILOT", site, [user, "staff-2"])];
    expect(evaluateVehicleOperationsFeature(flags, domain, "staff-2", site).executable).toBe(true);
    expect(evaluateVehicleOperationsFeature(flags, domain, user, site).executable).toBe(false);
  });
});

describe("Diagnostics effective rollout", () => {
  const diagnosticMaster = "DIAGNOSTICS_MASTER";
  const domain = "DIAGNOSTIC_CASES";

  it("uses the site master shadow override while retaining the organization default elsewhere", () => {
    const flags = [flag(diagnosticMaster, "GENERAL"), flag(diagnosticMaster, "SHADOW", site), flag(domain, "GENERAL")];
    expect(evaluateDiagnosticsFeature(flags, domain, user, site)).toMatchObject({ enabled: true, executable: false, reason: "SHADOW_ONLY" });
    expect(evaluateDiagnosticsFeature(flags, domain, user, other)).toMatchObject({ executable: true, reason: "GENERAL_RELEASE" });
  });

  it("requires each pilot gate to admit the user", () => {
    const flags = [flag(diagnosticMaster, "PILOT", site, [user, "master-only"]), flag(domain, "PILOT", site, [user, "domain-only"])];
    expect(evaluateDiagnosticsFeature(flags, domain, user, site)).toMatchObject({ executable: true, reason: "PILOT_ELIGIBLE" });
    for (const userId of ["master-only", "domain-only"]) {
      expect(evaluateDiagnosticsFeature(flags, domain, userId, site)).toMatchObject({ executable: false, reason: "OUTSIDE_PILOT" });
    }
  });
});
