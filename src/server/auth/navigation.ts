import type { AuthenticatedUser } from "./store";
import { canOpenDocumentLibrary } from "@/server/document-library/permission-policy";

const TECHNICIAN_ROLE_NAMES = new Set(["Mechanic", "Technician"]);

export const WORKSPACE_KEYS = [
  "MANAGEMENT",
  "VEHICLE_OPERATIONS_LEAD",
  "SERVICE",
  "INVENTORY",
  "ADVISOR",
  "TECHNICIAN",
  "PARTS",
  "QUALITY",
  "OPERATIONS_COORDINATOR",
  "SALES",
  "MARKETING",
  "OFFICE",
  "COLLECTIONS",
  "GENERAL_STAFF"
] as const;

export type WorkspaceKey = (typeof WORKSPACE_KEYS)[number];

export type WorkspaceDefinition = {
  description: string;
  key: WorkspaceKey;
  label: string;
  landingRoute: string;
  roleNames: string[];
  dutyTerms: string[];
};

export const WORKSPACE_DEFINITIONS: readonly WorkspaceDefinition[] = [
  {
    key: "MANAGEMENT",
    label: "Management",
    description: "Company-wide operating command, decisions, and review.",
    landingRoute: "/manager-workspace",
    roleNames: ["General Manager"],
    dutyTerms: ["delegated manager capabilities"]
  },
  {
    key: "VEHICLE_OPERATIONS_LEAD",
    label: "Vehicle Operations Lead",
    description: "Multi-hat personal operations workspace for advisor, inventory, technician, parts, lot, and detail execution.",
    landingRoute: "/vehicles?workspace=vehicle-operations-lead",
    roleNames: ["Vehicle Operations Lead"],
    dutyTerms: ["vehicle operations lead", "shop/parts support", "lot/detail support"]
  },
  {
    key: "SERVICE",
    label: "Service Operations",
    description: "Shop production, dispatch, repair orders, parts, and quality.",
    landingRoute: "/vehicles/recon-repair-advisor",
    roleNames: ["Service Department Manager"],
    dutyTerms: ["service production", "shop management", "shop dispatch"]
  },
  {
    key: "INVENTORY",
    label: "Inventory Operations",
    description: "Inventory lifecycle, readiness, recon, and disposition.",
    landingRoute: "/vehicles",
    roleNames: ["Inventory Manager"],
    dutyTerms: ["inventory management", "inventory lifecycle", "vehicle readiness"]
  },
  {
    key: "ADVISOR",
    label: "Advisor Workspace",
    description: "Appointments, check-in, customers, and repair-order coordination.",
    landingRoute: "/vehicles/advisor",
    roleNames: ["Service Advisor", "Vehicle Operations Lead"],
    dutyTerms: ["service advisor", "vehicle intake", "customer intake"]
  },
  {
    key: "TECHNICIAN",
    label: "Technician Workspace",
    description: "Assigned repairs, available work, and diagnostic tools.",
    landingRoute: "/my-tasks",
    roleNames: ["Mechanic", "Technician", "Vehicle Operations Lead"],
    dutyTerms: ["mechanic", "repair execution", "diagnostic execution"]
  },
  {
    key: "PARTS",
    label: "Parts Workspace",
    description: "Parts demand, receiving, issue, return, and repair readiness.",
    landingRoute: "/vehicles/parts-operations",
    roleNames: ["Parts", "Parts Manager", "Parts Specialist"],
    dutyTerms: ["parts operations", "parts counter", "parts readiness"]
  },
  {
    key: "QUALITY",
    label: "Quality Workspace",
    description: "Quality inspections, rework, evidence, and release readiness.",
    landingRoute: "/vehicles/quality-control",
    roleNames: ["Quality Control", "Quality Inspector"],
    dutyTerms: ["quality control", "quality inspection", "vehicle release"]
  },
  {
    key: "OPERATIONS_COORDINATOR",
    label: "Operations Coordinator",
    description: "Front-door operating loop for appointments, intake, paperwork, payments, documents, and safe routing.",
    landingRoute: "/operations-coordinator",
    roleNames: ["Operations Coordinator", "Front Desk Operations Coordinator"],
    dutyTerms: ["front-desk operating loop", "operations coordinator", "office/front desk", "paperwork coordination"]
  },
  {
    key: "SALES",
    label: "Sales Workspace",
    description: "Lead follow-up, deal desk, vehicle match, appointments, customers, and delivery work.",
    landingRoute: "/tasks?department=SALES",
    roleNames: ["Salesperson", "Sales Manager"],
    dutyTerms: ["sales", "lead follow-up", "sold vehicle prep"]
  },
  {
    key: "MARKETING",
    label: "Marketing Workspace",
    description: "Marketing, advertising, listings, photos, and campaigns.",
    landingRoute: "/tasks?department=MARKETING",
    roleNames: ["Marketing/Advertisement Manager", "Marketing", "Advertising"],
    dutyTerms: ["marketing", "advertising", "vehicle listings", "vehicle photos"]
  },
  {
    key: "OFFICE",
    label: "Office Workspace",
    description: "Office support, documentation, customers, and assigned work.",
    landingRoute: "/my-tasks",
    roleNames: ["Office Manager", "Office Staff"],
    dutyTerms: ["office", "documentation", "administrative support"]
  },
  {
    key: "COLLECTIONS",
    label: "Collections Workspace",
    description: "Assigned collections work and minimum authorized account context.",
    landingRoute: "/my-tasks?workspace=collections",
    roleNames: ["Collections", "Collections Manager"],
    dutyTerms: ["collections", "payment follow-up", "payment received"]
  },
  {
    key: "GENERAL_STAFF",
    label: "My Work",
    description: "Assigned work and next actions.",
    landingRoute: "/my-tasks",
    roleNames: [],
    dutyTerms: []
  }
] as const;

const WORKSPACE_BY_KEY = Object.fromEntries(
  WORKSPACE_DEFINITIONS.map((definition) => [definition.key, definition])
) as Record<WorkspaceKey, WorkspaceDefinition>;

function hasOperationsCoordinatorDefaultRoles(user: AuthenticatedUser) {
  return user.roles.includes("Operations Coordinator") ||
    user.roles.includes("Front Desk Operations Coordinator") ||
    (user.roles.includes("Office Manager") && user.roles.includes("Marketing/Advertisement Manager"));
}

const ROUTE_WORKSPACES: Array<{ prefix: string; workspaces: WorkspaceKey[] }> = [
  { prefix: "/manager-workspace", workspaces: ["MANAGEMENT"] },
  { prefix: "/administration", workspaces: ["MANAGEMENT"] },
  { prefix: "/settings/password", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/settings", workspaces: ["MANAGEMENT"] },
  { prefix: "/integrations", workspaces: ["MANAGEMENT"] },
  { prefix: "/documents", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/reports", workspaces: ["MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "INVENTORY", "SERVICE"] },
  { prefix: "/manager-review", workspaces: ["MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "INVENTORY", "SERVICE"] },
  { prefix: "/staff", workspaces: ["MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "SERVICE"] },
  { prefix: "/today", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/board", workspaces: ["MANAGEMENT"] },
  { prefix: "/command-center", workspaces: ["MANAGEMENT"] },
  { prefix: "/vehicles/coo-workbook", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/vehicles/parts", workspaces: ["PARTS", "VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/quality-control", workspaces: ["QUALITY", "VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/recon-repair-advisor", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "ADVISOR", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop-recon", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop-planning", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/outside-vendors", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop-dispatch", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop-production", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop-metrics", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/shop", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/repair-jobs", workspaces: ["TECHNICIAN", "SERVICE", "ADVISOR", "QUALITY", "PARTS", "MANAGEMENT"] },
  { prefix: "/vehicles/claims-desk", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "ADVISOR", "OPERATIONS_COORDINATOR", "MANAGEMENT"] },
  { prefix: "/vehicles/claims-workspace", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "ADVISOR", "OPERATIONS_COORDINATOR", "MANAGEMENT"] },
  { prefix: "/vehicles/repair-workbench", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "ADVISOR", "QUALITY", "PARTS", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/repair-orders", workspaces: ["VEHICLE_OPERATIONS_LEAD", "SERVICE", "ADVISOR", "QUALITY", "PARTS", "INVENTORY", "MANAGEMENT"] },
  { prefix: "/vehicles/360", workspaces: ["VEHICLE_OPERATIONS_LEAD", "INVENTORY", "SERVICE", "ADVISOR", "TECHNICIAN", "PARTS", "QUALITY", "SALES", "MARKETING", "MANAGEMENT"] },
  { prefix: "/vehicles", workspaces: ["VEHICLE_OPERATIONS_LEAD", "INVENTORY", "SERVICE", "ADVISOR", "PARTS", "QUALITY", "SALES", "MARKETING", "OPERATIONS_COORDINATOR", "MANAGEMENT"] },
  { prefix: "/operations-coordinator", workspaces: ["OPERATIONS_COORDINATOR", "MANAGEMENT"] },
  { prefix: "/crm", workspaces: ["MANAGEMENT", "SALES"] },
  { prefix: "/sales", workspaces: ["SALES", "MANAGEMENT"] },
  { prefix: "/appointments", workspaces: ["ADVISOR", "SERVICE", "SALES", "OPERATIONS_COORDINATOR", "OFFICE", "MANAGEMENT"] },
  { prefix: "/customers", workspaces: ["ADVISOR", "SALES", "OPERATIONS_COORDINATOR", "OFFICE", "COLLECTIONS", "MANAGEMENT"] },
  { prefix: "/diagnostics", workspaces: ["TECHNICIAN", "ADVISOR", "SERVICE", "MANAGEMENT"] },
  { prefix: "/projects", workspaces: ["MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "OPERATIONS_COORDINATOR", "OFFICE"] },
  { prefix: "/activity", workspaces: ["MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "SERVICE", "INVENTORY", "ADVISOR", "OPERATIONS_COORDINATOR", "OFFICE"] },
  { prefix: "/tasks", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/my-tasks", workspaces: [...WORKSPACE_KEYS] },
  { prefix: "/time-attendance", workspaces: [...WORKSPACE_KEYS] }
];

function normalizedPath(value: string) {
  return value.split(/[?#]/, 1)[0] || "/";
}

function hasRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`) || (
    prefix.endsWith("s") && pathname.startsWith(prefix)
  );
}

function matchesDefinition(user: AuthenticatedUser, definition: WorkspaceDefinition) {
  if (definition.key === "GENERAL_STAFF") return false;
  if (
    definition.key === "ADVISOR" &&
    hasOperationsCoordinatorDefaultRoles(user) &&
    !user.roles.includes("Service Advisor")
  ) {
    return false;
  }
  if (
    definition.key === "VEHICLE_OPERATIONS_LEAD" &&
    user.roles.includes("Inventory Manager") &&
    user.roles.includes("Service Department Manager")
  ) {
    return true;
  }
  if (
    definition.key === "ADVISOR" &&
    user.roles.includes("Inventory Manager") &&
    user.roles.includes("Service Department Manager")
  ) {
    return true;
  }
  if (
    definition.key === "OPERATIONS_COORDINATOR" &&
    hasOperationsCoordinatorDefaultRoles(user)
  ) {
    return true;
  }
  const normalizedDuties = user.duties.all.map((duty) => duty.toLowerCase());
  return definition.roleNames.some((role) => user.roles.includes(role)) ||
    definition.dutyTerms.some((term) => normalizedDuties.some((duty) => duty.includes(term)));
}

export function isWorkspaceKey(value: unknown): value is WorkspaceKey {
  return typeof value === "string" && WORKSPACE_KEYS.includes(value as WorkspaceKey);
}

export function getWorkspaceDefinition(key: WorkspaceKey) {
  return WORKSPACE_BY_KEY[key];
}

export function getWorkspaceWorkbookLabel(key: WorkspaceKey) {
  const labels = {
    ADVISOR: "Service Advisor Workbook",
    COLLECTIONS: "Collections Workbook",
    GENERAL_STAFF: "General Staff Workbook",
    INVENTORY: "Inventory Workbook",
    MANAGEMENT: "COO Workbook",
    MARKETING: "Marketing Workbook",
    OFFICE: "Office Workbook",
    OPERATIONS_COORDINATOR: "Operations Coordinator Workbook",
    PARTS: "Parts Workbook",
    QUALITY: "Quality Workbook",
    SALES: "Sales Workbook",
    SERVICE: "Service Operations Workbook",
    TECHNICIAN: "Technician Workbook",
    VEHICLE_OPERATIONS_LEAD: "Vehicle Operations Lead Workbook"
  } satisfies Record<WorkspaceKey, string>;
  return labels[key];
}

export function getPermittedWorkspaces(user: AuthenticatedUser): WorkspaceDefinition[] {
  const matched = WORKSPACE_DEFINITIONS.filter((definition) => matchesDefinition(user, definition));
  return matched.length ? matched : [WORKSPACE_BY_KEY.GENERAL_STAFF];
}

export function isTechnicianUser(user: AuthenticatedUser | null) {
  return Boolean(user?.roles.some((role) => TECHNICIAN_ROLE_NAMES.has(role)));
}

export function isTechnicianOnlyUser(user: AuthenticatedUser | null) {
  if (!user || !isTechnicianUser(user)) return false;
  return getPermittedWorkspaces(user).every((workspace) => workspace.key === "TECHNICIAN");
}

export function isOperationsCoordinatorDefaultUser(user: AuthenticatedUser | null) {
  return user ? hasOperationsCoordinatorDefaultRoles(user) : false;
}

export function getWorkspaceKey(
  user: AuthenticatedUser,
  preferredWorkspace?: WorkspaceKey | null
): WorkspaceKey {
  const permitted = getPermittedWorkspaces(user);
  if (preferredWorkspace && permitted.some((workspace) => workspace.key === preferredWorkspace)) {
    return preferredWorkspace;
  }
  return permitted[0]?.key ?? "GENERAL_STAFF";
}

export function getDefaultLandingRoute(
  user: AuthenticatedUser,
  preferredWorkspace?: WorkspaceKey | null
) {
  return getWorkspaceDefinition(getWorkspaceKey(user, preferredWorkspace)).landingRoute;
}

export function resolveWorkspaceForPath(
  user: AuthenticatedUser,
  path: string,
  preferredWorkspace?: WorkspaceKey | null
) {
  const permitted = getPermittedWorkspaces(user);
  const pathname = normalizedPath(path);
  if (pathname === "/command-center" || pathname === "/board") {
    return "MANAGEMENT";
  }
  if (
    pathname === "/vehicles/advisor" &&
    permitted.some((workspace) => workspace.key === "ADVISOR")
  ) {
    return "ADVISOR";
  }
  const matchingContract = ROUTE_WORKSPACES.find((contract) => hasRoutePrefix(pathname, contract.prefix));
  if (preferredWorkspace &&
      permitted.some((workspace) => workspace.key === preferredWorkspace) &&
      matchingContract?.workspaces.includes(preferredWorkspace)) {
    return preferredWorkspace;
  }
  return permitted.find((workspace) => matchingContract?.workspaces.includes(workspace.key))?.key ??
    getWorkspaceKey(user, preferredWorkspace);
}

export function isRoutePermittedForUser(user: AuthenticatedUser, route: string) {
  const safe = getSafePostLoginRedirect(route, "");
  if (!safe) return false;
  const pathname = normalizedPath(safe);
  if (hasRoutePrefix(pathname, "/documents")) {
    return canOpenDocumentLibrary(user);
  }
  const contract = ROUTE_WORKSPACES.find((candidate) => hasRoutePrefix(pathname, candidate.prefix));
  if (!contract) return false;
  const permittedKeys = new Set(getPermittedWorkspaces(user).map((workspace) => workspace.key));
  return contract.workspaces.some((workspace) => permittedKeys.has(workspace));
}

export function getProtectedRouteRedirect(user: AuthenticatedUser | null) {
  return user ? null : "/login";
}

export function getLoginRouteRedirect(
  user: AuthenticatedUser | null,
  preferredWorkspace?: WorkspaceKey | null
) {
  if (user?.mustChangePassword) {
    return "/settings/password";
  }

  return user ? getDefaultLandingRoute(user, preferredWorkspace) : null;
}

export function getSafePostLoginRedirect(
  returnTo: string | null | undefined,
  fallback = "/board"
) {
  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  ) {
    return fallback;
  }
  return returnTo;
}

export function resolvePostLoginRoute(
  user: AuthenticatedUser,
  returnTo: string | null | undefined,
  preferredWorkspace?: WorkspaceKey | null
) {
  if (user.mustChangePassword) {
    return "/settings/password";
  }

  const fallback = getDefaultLandingRoute(user, preferredWorkspace);
  const safe = getSafePostLoginRedirect(returnTo, fallback);
  return safe !== fallback && isRoutePermittedForUser(user, safe) ? safe : fallback;
}

export function resolveWorkRecordRoute(input: {
  taskId?: string | null;
  repairJobId?: string | null;
  diagnosticCaseId?: string | null;
  inventoryWorkPacket?: { vehicleId: string; inventoryUnitId?: string | null } | null;
  repairOrderId?: string | null;
}) {
  if (input.repairJobId) {
    return `/vehicles/repair-jobs/${encodeURIComponent(input.repairJobId)}/workbench`;
  }
  if (input.diagnosticCaseId) {
    return `/diagnostics/cases/${encodeURIComponent(input.diagnosticCaseId)}/troubleshooting`;
  }
  if (input.inventoryWorkPacket) {
    const query = input.inventoryWorkPacket.inventoryUnitId
      ? `?inventoryUnitId=${encodeURIComponent(input.inventoryWorkPacket.inventoryUnitId)}`
      : "";
    return `/vehicles/${encodeURIComponent(input.inventoryWorkPacket.vehicleId)}/workbench${query}`;
  }
  if (input.repairOrderId) {
    return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(input.repairOrderId)}`;
  }
  if (input.taskId) {
    return `/tasks/${encodeURIComponent(input.taskId)}`;
  }
  return "/my-tasks";
}
