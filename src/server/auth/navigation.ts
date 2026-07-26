import type { AuthenticatedUser } from "./store";

const TECHNICIAN_ROLE_NAMES = new Set(["Mechanic", "Technician"]);

export type WorkspaceKey =
  | "MANAGEMENT"
  | "INVENTORY"
  | "SERVICE"
  | "ADVISOR"
  | "TECHNICIAN"
  | "PARTS"
  | "QUALITY"
  | "SALES"
  | "MARKETING"
  | "GENERAL_STAFF";

export function isTechnicianUser(user: AuthenticatedUser | null) {
  return Boolean(user?.roles.some((role) => TECHNICIAN_ROLE_NAMES.has(role)));
}

export function isTechnicianOnlyUser(user: AuthenticatedUser | null) {
  if (!user || !isTechnicianUser(user)) return false;
  return !user.roles.some((role) =>
    [
      "General Manager",
      "Inventory Manager",
      "Service Department Manager",
      "Service Advisor",
      "Parts",
      "Parts Manager",
      "Quality Control"
    ].includes(role)
  );
}

export function getWorkspaceKey(user: AuthenticatedUser): WorkspaceKey {
  if (user.roles.includes("General Manager") || user.duties.all.includes("Delegated manager capabilities")) return "MANAGEMENT";
  if (user.roles.includes("Service Department Manager")) return "SERVICE";
  if (user.roles.includes("Inventory Manager")) return "INVENTORY";
  if (user.roles.includes("Service Advisor")) return "ADVISOR";
  if (isTechnicianUser(user)) return "TECHNICIAN";
  if (user.roles.some((role) => ["Parts", "Parts Manager"].includes(role))) return "PARTS";
  if (user.roles.includes("Quality Control")) return "QUALITY";
  if (user.roles.includes("Salesperson")) return "SALES";
  if (user.roles.includes("Marketing/Advertisement Manager")) return "MARKETING";
  return "GENERAL_STAFF";
}

export function getDefaultLandingRoute(user: AuthenticatedUser) {
  switch (getWorkspaceKey(user)) {
    case "MANAGEMENT":
      return "/board";
    case "SERVICE":
      return "/vehicles/shop-recon";
    case "INVENTORY":
      return "/vehicles";
    case "ADVISOR":
      return "/appointments";
    case "TECHNICIAN":
      return "/my-tasks";
    case "PARTS":
      return "/vehicles/parts-operations";
    case "QUALITY":
      return "/vehicles/quality-control";
    case "SALES":
      return "/tasks?department=SALES";
    case "MARKETING":
      return "/tasks?department=MARKETING";
    default:
      return "/my-tasks";
  }
}

export function getProtectedRouteRedirect(user: AuthenticatedUser | null) {
  return user ? null : "/login";
}

export function getLoginRouteRedirect(user: AuthenticatedUser | null) {
  return user ? getDefaultLandingRoute(user) : null;
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
  returnTo: string | null | undefined
) {
  const fallback = getDefaultLandingRoute(user);
  const safe = getSafePostLoginRedirect(returnTo, fallback);

  if (!isTechnicianOnlyUser(user) || safe === fallback) return safe;

  const technicianAllowed =
    safe === "/my-tasks" ||
    safe.startsWith("/my-tasks/") ||
    safe === "/diagnostics" ||
    safe.startsWith("/diagnostics/") ||
    /^\/tasks\/[^/]+/.test(safe) ||
    /^\/vehicles\/repair-jobs\/[^/]+\/workbench/.test(safe) ||
    /^\/vehicles\/360\/[^/]+/.test(safe);

  return technicianAllowed ? safe : fallback;
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
