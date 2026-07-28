import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleVehicleHoldStatus = "blocked" | "planned" | "verify-first";

export type SalesConsoleVehicleHoldRequest = {
  auditRequired: true;
  customerId: string;
  enabled: false;
  expirationRequired: true;
  holdId: string;
  inventoryVerificationRequired: true;
  managerApprovalRequired: true;
  sourceWrite: false;
  status: SalesConsoleVehicleHoldStatus;
  stockNumber: string;
};

export type SalesConsoleVehicleHoldLimit = {
  limit: number;
  reason: string;
  scope: "customer" | "salesperson" | "vehicle";
};

export type SalesConsoleVehicleHoldReadModel = {
  guardrails: string[];
  limits: SalesConsoleVehicleHoldLimit[];
  readOnly: true;
  requests: SalesConsoleVehicleHoldRequest[];
};

export const salesConsoleVehicleHoldReadModel = {
  guardrails: [
    "Vehicle holds are request-contract only; no inventory reservation is created.",
    "Manager approval, source inventory verification, expiration, source record, and audit event are required before any future hold.",
    "Stale or verify-first inventory blocks hold activation.",
    "Salespeople can request review later but cannot create final holds."
  ],
  limits: [
    { limit: 1, reason: "Prevent duplicate customer reservations.", scope: "customer" },
    { limit: 3, reason: "Prevent salesperson over-holding inventory.", scope: "salesperson" },
    { limit: 1, reason: "A vehicle can have only one active approved hold later.", scope: "vehicle" }
  ],
  readOnly: true,
  requests: [
    {
      auditRequired: true,
      customerId: "cust-103",
      enabled: false,
      expirationRequired: true,
      holdId: "hold-request-placeholder-1001",
      inventoryVerificationRequired: true,
      managerApprovalRequired: true,
      sourceWrite: false,
      status: "verify-first",
      stockNumber: "F241512"
    }
  ]
} as const satisfies SalesConsoleVehicleHoldReadModel;

export function vehicleHoldFoundationIsDisabled(readModel = salesConsoleVehicleHoldReadModel) {
  return readModel.readOnly === true &&
    readModel.requests.every((request) => request.enabled === false && request.sourceWrite === false);
}

export function vehicleHoldsRequireManagerApprovalExpiryAndVerification(readModel = salesConsoleVehicleHoldReadModel) {
  return readModel.requests.every((request) =>
    request.managerApprovalRequired &&
    request.expirationRequired &&
    request.inventoryVerificationRequired &&
    request.auditRequired
  );
}

export function staleOrVerifyFirstInventoryBlocksHold(readModel = salesConsoleVehicleHoldReadModel) {
  return readModel.requests
    .filter((request) => request.status === "verify-first" || request.status === "blocked")
    .every((request) => request.enabled === false);
}

export function vehicleHoldsHaveAuditAndPermissionCoverage() {
  const auditCovered = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === "Vehicle holds or reservations" && coverage.enabled === false);
  const permissionCovered = salesConsoleEnterprisePermissionReadModel.gates.some((gate) => gate.capability === "vehicle-hold-request" && gate.enabled === false);

  return auditCovered && permissionCovered;
}
