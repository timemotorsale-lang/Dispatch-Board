export type SalesConsoleM16ManagerReviewField = {
  field: string;
  requirement: "required" | "system-generated";
  source: string;
};

export type SalesConsoleM16ManagerReviewPermission = {
  role: "salesperson" | "sales-manager" | "admin-owner" | "bdc-lead-coordinator";
  access: "can-request-later" | "can-review-later" | "visibility-only";
};

export const salesConsoleM16ManagerReviewContract = {
  auditShape: [
    "requestId",
    "sourceDealId",
    "sourceCustomerId",
    "sourceVehicleId",
    "requestedByUserId",
    "assignedManagerUserId",
    "requestReason",
    "urgency",
    "createdAt",
    "status",
    "sourceSnapshot"
  ] as const,
  fields: [
    { field: "customer", requirement: "required", source: "Customer/source record" },
    { field: "deal", requirement: "required", source: "Deal Desk/source deal record" },
    { field: "vehicle", requirement: "required", source: "Inventory/source vehicle record" },
    { field: "reason", requirement: "required", source: "Requester entry in future workflow" },
    { field: "urgency", requirement: "required", source: "Requester selection in future workflow" },
    { field: "sourceRecordLinks", requirement: "required", source: "Read adapter/source links" },
    { field: "requestedBy", requirement: "system-generated", source: "Authenticated user" },
    { field: "assignedManager", requirement: "required", source: "Role/manager mapping" },
    { field: "timestamp", requirement: "system-generated", source: "Server time" },
    { field: "status", requirement: "system-generated", source: "Workflow state machine" }
  ] as const satisfies readonly SalesConsoleM16ManagerReviewField[],
  permissions: [
    { access: "can-request-later", role: "salesperson" },
    { access: "can-review-later", role: "sales-manager" },
    { access: "can-review-later", role: "admin-owner" },
    { access: "visibility-only", role: "bdc-lead-coordinator" }
  ] as const satisfies readonly SalesConsoleM16ManagerReviewPermission[],
  unavailableStates: [
    "Missing customer source link",
    "Missing deal source link",
    "Missing vehicle source link",
    "Missing manager assignment",
    "Unauthenticated requester",
    "Reason or urgency not provided",
    "Audit sink not ready"
  ] as const,
  writeActivation: "disabled-until-m17" as const
} as const;

export function salesConsoleM16ManagerReviewContractHasRequiredFields() {
  return salesConsoleM16ManagerReviewContract.fields.filter((field) => field.requirement === "required").length >= 6;
}

export function salesConsoleM16ManagerReviewContractHasPermissions() {
  return salesConsoleM16ManagerReviewContract.permissions.some((permission) => permission.role === "salesperson" && permission.access === "can-request-later") &&
    salesConsoleM16ManagerReviewContract.permissions.some((permission) => permission.role === "sales-manager" && permission.access === "can-review-later");
}

export function salesConsoleM16ManagerReviewContractHasAuditShape() {
  return salesConsoleM16ManagerReviewContract.auditShape.includes("sourceSnapshot") &&
    salesConsoleM16ManagerReviewContract.auditShape.includes("requestedByUserId") &&
    salesConsoleM16ManagerReviewContract.auditShape.includes("status");
}

export function salesConsoleM16ManagerReviewContractRemainsDisabled() {
  return salesConsoleM16ManagerReviewContract.writeActivation === "disabled-until-m17" &&
    salesConsoleM16ManagerReviewContract.unavailableStates.includes("Audit sink not ready");
}
