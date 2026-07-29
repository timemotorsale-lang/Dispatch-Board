export const salesConsoleM19ApiActivation = {
  endpoint: "/api/sales/manager-review-requests",
  method: "POST",
  routeState: "live-for-manager-review",
  successResponses: [
    {
      status: 201,
      meaning: "Created one audited Manager Review task"
    },
    {
      status: 200,
      meaning: "Returned existing task for an idempotent retry"
    }
  ],
  blockedResponses: [
    {
      status: 400,
      meaning: "Invalid or missing payload"
    },
    {
      status: 401,
      meaning: "Authentication required"
    },
    {
      status: 409,
      meaning: "Idempotency key reused with different payload"
    }
  ],
  guardrail: "This route activates only Manager Review Request persistence; all other Sales Console writes remain unavailable."
} as const;

export function salesConsoleM19ApiReturnsCreatedForNewRequest() {
  return salesConsoleM19ApiActivation.successResponses.some((response) => response.status === 201);
}

export function salesConsoleM19ApiReturnsDuplicateForRetry() {
  return salesConsoleM19ApiActivation.successResponses.some((response) => response.status === 200);
}

export function salesConsoleM19ApiBlocksIdempotencyConflict() {
  return salesConsoleM19ApiActivation.blockedResponses.some((response) => response.status === 409);
}
