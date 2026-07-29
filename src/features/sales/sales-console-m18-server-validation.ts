export const salesConsoleM18ServerValidation = {
  headline: "Server validation is ready before live persistence",
  submitEnabled: false,
  validationRules: [
    {
      rule: "Require customer, deal, vehicle, manager, reason, urgency, idempotency key, and source snapshot",
      evidence: "The backend normalizer rejects missing required fields before any route can continue."
    },
    {
      rule: "Normalize urgency to normal, high, or urgent",
      evidence: "Urgency is trimmed, lower-cased, and blocked when it falls outside the allowed values."
    },
    {
      rule: "Keep source snapshot mandatory",
      evidence: "Every request must carry source-record context so managers can verify the request before action."
    },
    {
      rule: "Keep submit blocked until persistence and audit are explicitly enabled",
      evidence: "Validation can accept shape, but the workflow remains backend-foundation-only."
    }
  ]
} as const;

export function salesConsoleM18ServerValidationCoversRequiredPayload() {
  return salesConsoleM18ServerValidation.validationRules.some((rule) => rule.rule.includes("Require customer"));
}

export function salesConsoleM18ServerValidationRequiresSourceSnapshot() {
  return salesConsoleM18ServerValidation.validationRules.some((rule) => rule.rule.includes("source snapshot"));
}

export function salesConsoleM18ServerValidationKeepsSubmitBlocked() {
  return salesConsoleM18ServerValidation.submitEnabled === false;
}
