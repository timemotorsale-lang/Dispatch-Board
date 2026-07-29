export type SalesConsoleM18BackendContractField = {
  field: string;
  required: boolean;
  source: string;
};

export const salesConsoleM18BackendContract = {
  endpoint: "/api/sales/manager-review-requests",
  method: "POST",
  requestFields: [
    { field: "customerId", required: true, source: "Sales Console source link" },
    { field: "dealId", required: true, source: "Deal Desk source row" },
    { field: "vehicleId", required: true, source: "Inventory/source vehicle row" },
    { field: "reason", required: true, source: "Request form" },
    { field: "urgency", required: true, source: "Request form" },
    { field: "assignedManagerUserId", required: true, source: "Manager mapping" },
    { field: "idempotencyKey", required: true, source: "Client/server request identity" },
    { field: "sourceSnapshot", required: true, source: "Read adapter/source records" }
  ] as const satisfies readonly SalesConsoleM18BackendContractField[],
  responseShape: {
    blocked: true,
    status: "backend-foundation-only",
    workflowLive: false
  },
  writePolicy: "No task creation, no quote submission, no customer messaging, no vehicle hold, no finance decision, no discount approval."
} as const;

export function salesConsoleM18BackendContractDefinesEndpoint() {
  return salesConsoleM18BackendContract.endpoint === "/api/sales/manager-review-requests" &&
    salesConsoleM18BackendContract.method === "POST";
}

export function salesConsoleM18BackendContractRequiresAuditFields() {
  return salesConsoleM18BackendContract.requestFields.some((field) => field.field === "idempotencyKey" && field.required) &&
    salesConsoleM18BackendContract.requestFields.some((field) => field.field === "sourceSnapshot" && field.required);
}

export function salesConsoleM18BackendContractBlocksWrites() {
  return salesConsoleM18BackendContract.responseShape.workflowLive === false &&
    salesConsoleM18BackendContract.writePolicy.includes("No task creation");
}
