import {
  getSalesConsoleProductionView,
  type SalesConsoleProductionSurface
} from "./sales-console-m10-production-views";
import type { SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleAuthStatus = "authenticated" | "unauthenticated" | "unknown";

export type SalesConsoleProtectedRouteState = "allowed" | "blocked" | "verify-first";

export type SalesConsoleAuthSnapshot = {
  duties?: readonly string[];
  email?: string;
  isActive?: boolean;
  name?: string;
  ownershipIds?: readonly string[];
  roleNames?: readonly string[];
  storeIds?: readonly string[];
  teamIds?: readonly string[];
  userId?: string;
};

export type SalesConsoleAccessDecision = {
  canAccessSalesConsole: boolean;
  denyByDefault: true;
  fallbackLabel: "blocked" | "current" | "placeholder" | "verify-first";
  protectedRouteState: SalesConsoleProtectedRouteState;
  reason: string;
  resolvedRole: SalesConsoleEnterpriseRole | null;
  sourceAuth: "app-session" | "missing-session" | "role-unmapped";
  status: SalesConsoleAuthStatus;
  visibleSurfaces: readonly SalesConsoleProductionSurface[];
  scope: {
    ownership: string;
    store: string;
    team: string;
  };
};

const appRoleToSalesConsoleRole = [
  { appRoles: ["General Manager", "Owner", "Admin", "Office Manager"], role: "admin-owner" },
  { appRoles: ["Sales Manager"], role: "sales-manager" },
  { appRoles: ["BDC", "Lead Coordinator", "Operations Coordinator", "Front Desk Operations Coordinator"], role: "bdc-lead-coordinator" },
  { appRoles: ["Finance", "Finance Manager", "Collections Manager"], role: "finance" },
  { appRoles: ["Salesperson"], role: "salesperson" }
] as const satisfies Array<{ appRoles: readonly string[]; role: SalesConsoleEnterpriseRole }>;

function resolveRole(roleNames: readonly string[] = []) {
  return appRoleToSalesConsoleRole.find((mapping) =>
    mapping.appRoles.some((roleName) => roleNames.includes(roleName))
  )?.role ?? null;
}

function scopeLabel(values: readonly string[] | undefined, fallback: string) {
  return values && values.length > 0 ? values.join(", ") : fallback;
}

export function resolveSalesConsoleAccess(
  status: SalesConsoleAuthStatus,
  snapshot: SalesConsoleAuthSnapshot | null | undefined
): SalesConsoleAccessDecision {
  if (status !== "authenticated" || !snapshot?.userId || snapshot.isActive === false) {
    return {
      canAccessSalesConsole: false,
      denyByDefault: true,
      fallbackLabel: "blocked",
      protectedRouteState: "blocked",
      reason: "Sales Console requires an active authenticated app session.",
      resolvedRole: null,
      scope: {
        ownership: "No ownership scope until authenticated.",
        store: "No store scope until authenticated.",
        team: "No team scope until authenticated."
      },
      sourceAuth: "missing-session",
      status,
      visibleSurfaces: []
    };
  }

  const resolvedRole = resolveRole(snapshot.roleNames);

  if (!resolvedRole) {
    return {
      canAccessSalesConsole: false,
      denyByDefault: true,
      fallbackLabel: "verify-first",
      protectedRouteState: "verify-first",
      reason: "Authenticated user has no mapped Sales Console production role.",
      resolvedRole: null,
      scope: {
        ownership: scopeLabel(snapshot.ownershipIds, "Ownership mapping missing."),
        store: scopeLabel(snapshot.storeIds, "Store mapping missing."),
        team: scopeLabel(snapshot.teamIds, "Team mapping missing.")
      },
      sourceAuth: "role-unmapped",
      status,
      visibleSurfaces: []
    };
  }

  const productionView = getSalesConsoleProductionView(resolvedRole);

  return {
    canAccessSalesConsole: true,
    denyByDefault: true,
    fallbackLabel: snapshot.storeIds?.length || snapshot.teamIds?.length || snapshot.ownershipIds?.length ? "current" : "placeholder",
    protectedRouteState: productionView ? "allowed" : "verify-first",
    reason: productionView
      ? "Mapped to a read-only Sales Console production view."
      : "Role is known, but production view is not configured.",
    resolvedRole,
    scope: {
      ownership: scopeLabel(snapshot.ownershipIds, "Ownership scope pending CRM/DMS mapping."),
      store: scopeLabel(snapshot.storeIds, "Store scope pending auth mapping."),
      team: scopeLabel(snapshot.teamIds, "Team scope pending manager mapping.")
    },
    sourceAuth: "app-session",
    status,
    visibleSurfaces: productionView?.visibleSurfaces ?? []
  };
}

export const salesConsoleAuthAccessExamples = [
  resolveSalesConsoleAccess("unauthenticated", null),
  resolveSalesConsoleAccess("authenticated", {
    email: "unknown@timemotorsales.example",
    isActive: true,
    name: "Mapped Later",
    roleNames: ["Marketing/Advertisement Manager"],
    userId: "user-auth-unknown"
  }),
  resolveSalesConsoleAccess("authenticated", {
    email: "salesperson@timemotorsales.example",
    isActive: true,
    name: "Salesperson",
    ownershipIds: ["crm-owner-sp-1"],
    roleNames: ["Salesperson"],
    storeIds: ["TMS"],
    teamIds: ["sales-team-a"],
    userId: "user-auth-salesperson"
  }),
  resolveSalesConsoleAccess("authenticated", {
    email: "manager@timemotorsales.example",
    isActive: true,
    name: "Sales Manager",
    roleNames: ["Sales Manager"],
    storeIds: ["TMS"],
    teamIds: ["sales-team-a"],
    userId: "user-auth-manager"
  }),
  resolveSalesConsoleAccess("authenticated", {
    email: "owner@timemotorsales.example",
    isActive: true,
    name: "Admin Owner",
    roleNames: ["General Manager"],
    storeIds: ["all-stores"],
    teamIds: ["all-sales-teams"],
    userId: "user-auth-admin-owner"
  })
] as const satisfies readonly SalesConsoleAccessDecision[];

export function unauthenticatedUsersAreBlocked() {
  return resolveSalesConsoleAccess("unauthenticated", null).protectedRouteState === "blocked";
}

export function unknownRolesAreDeniedByDefault() {
  const decision = resolveSalesConsoleAccess("authenticated", {
    isActive: true,
    roleNames: ["Marketing/Advertisement Manager"],
    userId: "user-auth-unknown"
  });

  return decision.canAccessSalesConsole === false && decision.denyByDefault && decision.sourceAuth === "role-unmapped";
}

export function mappedRolesResolveProductionViews() {
  return salesConsoleAuthAccessExamples
    .filter((decision) => decision.canAccessSalesConsole)
    .every((decision) => decision.visibleSurfaces.length > 0 && decision.protectedRouteState === "allowed");
}

export function adminReviewRequiresAdminOwnerAccess() {
  return salesConsoleAuthAccessExamples.every((decision) =>
    decision.visibleSurfaces.includes("Admin Review") ? decision.resolvedRole === "admin-owner" : true
  );
}
