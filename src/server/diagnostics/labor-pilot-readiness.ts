import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { LIGHT_DUTY_SYSTEMS } from "@/lib/light-duty-baseline";

export async function getLaborPilotReadiness(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager access required.");
  const checks: { code: string; status: "PASS" | "HOLD"; detail: string; href?: string }[] = [];
  const [rate, flags] = await Promise.allSettled([getActiveLaborRate(user), createEnterpriseCommandRepository().listFeatureFlags(INITIAL_ORGANIZATION.id)]);
  checks.push(rate.status === "fulfilled" ? { code: "LABOR_RATE_POLICY", status: rate.value.policyVersion > 0 ? "PASS" : "HOLD", detail: rate.value.policyVersion > 0 ? `Active policy version ${rate.value.policyVersion}: $${rate.value.laborRate.toFixed(2)}/hour.` : "Shop-requested default is available, but no independently activated rate policy is recorded. Review settings before production sign-off.", href: "/settings/labor-rate" } : { code: "LABOR_RATE_POLICY", status: "HOLD", detail: "Rate policy could not be verified. Official presentation remains blocked when rate settings fail.", href: "/settings/labor-rate" });
  if (flags.status === "fulfilled") {
    const decision = evaluateVehicleOperationsFeature(flags.value, "SHOP_OPERATIONS", user.id, null);
    checks.push({ code: "SHOP_ROLLOUT", status: decision.executable ? "PASS" : "HOLD", detail: `Current actor rollout: ${decision.reason}. Location-specific capability checks still apply to each mutation.` });
  } else checks.push({ code: "SHOP_ROLLOUT", status: "HOLD", detail: "Shop rollout state could not be verified." });
  checks.push({ code: "EXTERNAL_RELEASE_EVIDENCE", status: "HOLD", detail: "Staging upgrade, backup/restore, rollback, security/permission rehearsal, business-policy review, alerts and independent operator sign-off must be supplied for the exact release revision. This page does not grant deployment approval." });
  return { status: "HOLD" as const, checks, auditedSystems: ["Brakes", "Steering & suspension"], pendingSystemApprovals: LIGHT_DUTY_SYSTEMS.length };
}
