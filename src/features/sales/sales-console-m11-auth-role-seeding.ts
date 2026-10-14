import { resolveSalesConsoleAccess } from "./sales-console-m10-auth-access";
import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleDogfoodAuthFixture = {
  appRoleNames: readonly string[];
  expectedAccess: "allowed" | "restricted";
  expectedStaffRole: SalesConsoleDogfoodStaffRole | null;
  fixtureOnly: true;
  label: string;
  seedAction: "mapping-evidence-only";
  userId: string;
};

export const salesConsoleM11DogfoodAuthFixtures = [
  {
    appRoleNames: ["Salesperson"],
    expectedAccess: "allowed",
    expectedStaffRole: "salesperson",
    fixtureOnly: true,
    label: "Dogfood Salesperson",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-salesperson"
  },
  {
    appRoleNames: ["Sales Manager"],
    expectedAccess: "allowed",
    expectedStaffRole: "sales-manager",
    fixtureOnly: true,
    label: "Dogfood Sales Manager",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-sales-manager"
  },
  {
    appRoleNames: ["Operations Coordinator"],
    expectedAccess: "allowed",
    expectedStaffRole: "bdc-lead-coordinator",
    fixtureOnly: true,
    label: "Dogfood BDC / Lead Coordinator",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-bdc"
  },
  {
    appRoleNames: ["General Manager"],
    expectedAccess: "allowed",
    expectedStaffRole: "admin-owner",
    fixtureOnly: true,
    label: "Dogfood Admin / Owner",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-admin-owner"
  },
  {
    appRoleNames: ["Finance Manager"],
    expectedAccess: "allowed",
    expectedStaffRole: "finance-visibility",
    fixtureOnly: true,
    label: "Dogfood Finance Visibility",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-finance"
  },
  {
    appRoleNames: ["Marketing/Advertisement Manager"],
    expectedAccess: "restricted",
    expectedStaffRole: "marketing-advertising-visibility",
    fixtureOnly: true,
    label: "Dogfood Marketing Visibility",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-marketing"
  },
  {
    appRoleNames: ["Office Staff"],
    expectedAccess: "restricted",
    expectedStaffRole: "office-operations-visibility",
    fixtureOnly: true,
    label: "Dogfood Office / Operations Visibility",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-office"
  },
  {
    appRoleNames: ["Mechanic"],
    expectedAccess: "restricted",
    expectedStaffRole: null,
    fixtureOnly: true,
    label: "Unknown Sales Console Role",
    seedAction: "mapping-evidence-only",
    userId: "dogfood-unknown"
  }
] as const satisfies readonly SalesConsoleDogfoodAuthFixture[];

export const salesConsoleM11AuthRoleSeedingPlan = {
  boundary: "Milestone 11 uses fixture-only mapping evidence first. Real seed/user changes should happen only after owner review.",
  fixtures: salesConsoleM11DogfoodAuthFixtures,
  guardrails: [
    "No existing staff user is overwritten.",
    "No broad admin access is created for dogfooding.",
    "Unknown roles remain restricted by default.",
    "Finance, marketing, and office visibility roles are mapping evidence only until dogfood release gates approve them."
  ],
  seedMode: "non-destructive mapping evidence"
} as const;

export function salesConsoleM11DogfoodFixturesAreNonDestructive() {
  return salesConsoleM11DogfoodAuthFixtures.every((fixture) =>
    fixture.fixtureOnly && fixture.seedAction === "mapping-evidence-only"
  );
}

export function salesConsoleM11CoreDogfoodRolesResolve() {
  const coreFixtures = salesConsoleM11DogfoodAuthFixtures.filter((fixture) =>
    ["salesperson", "sales-manager", "bdc-lead-coordinator", "admin-owner"].includes(fixture.expectedStaffRole ?? "")
  );

  return coreFixtures.every((fixture) => {
    const decision = resolveSalesConsoleAccess("authenticated", {
      isActive: true,
      roleNames: fixture.appRoleNames,
      userId: fixture.userId
    });

    return decision.canAccessSalesConsole && decision.resolvedRole === fixture.expectedStaffRole;
  });
}

export function salesConsoleM11UnknownRolesRemainRestricted() {
  const unknownFixture = salesConsoleM11DogfoodAuthFixtures.find((fixture) => fixture.expectedStaffRole === null);
  const decision = resolveSalesConsoleAccess("authenticated", {
    isActive: true,
    roleNames: unknownFixture?.appRoleNames ?? [],
    userId: unknownFixture?.userId ?? "dogfood-unknown"
  });

  return decision.canAccessSalesConsole === false && decision.sourceAuth === "role-unmapped";
}

export function salesConsoleM11OptionalVisibilityRolesAreFixtureOnly() {
  return salesConsoleM11DogfoodAuthFixtures
    .filter((fixture) => ["finance-visibility", "marketing-advertising-visibility", "office-operations-visibility"].includes(fixture.expectedStaffRole ?? ""))
    .every((fixture) => fixture.fixtureOnly && fixture.seedAction === "mapping-evidence-only");
}
