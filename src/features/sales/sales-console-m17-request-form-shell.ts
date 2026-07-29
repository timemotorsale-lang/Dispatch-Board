import { salesConsoleM16ManagerReviewContract } from "./sales-console-m16-manager-review-contract";

export type SalesConsoleM17RequestFormField = {
  disabled: boolean;
  label: string;
  required: boolean;
  value: string;
};

export const salesConsoleM17RequestFormShell = {
  fields: [
    { disabled: true, label: "Customer", required: true, value: "Source customer required" },
    { disabled: true, label: "Deal", required: true, value: "Source deal required" },
    { disabled: true, label: "Vehicle", required: true, value: "Source vehicle required" },
    { disabled: true, label: "Reason", required: true, value: "Required before submit can activate" },
    { disabled: true, label: "Urgency", required: true, value: "Required before submit can activate" },
    { disabled: true, label: "Source links", required: true, value: "Customer, deal, and vehicle links required" }
  ] as const satisfies readonly SalesConsoleM17RequestFormField[],
  helperText: "Form shell is visible for staff review, but controls are disabled until validation, permissions, audit, and backend destination gates pass.",
  submitLabel: "Submit Manager Review Request",
  submitDisabled: true
} as const;

export function salesConsoleM17RequestFormHasRequiredFields() {
  return salesConsoleM17RequestFormShell.fields.filter((field) => field.required).length >= 6 &&
    salesConsoleM16ManagerReviewContract.fields.some((field) => field.field === "reason");
}

export function salesConsoleM17RequestFormControlsDisabled() {
  return salesConsoleM17RequestFormShell.submitDisabled &&
    salesConsoleM17RequestFormShell.fields.every((field) => field.disabled);
}

export function salesConsoleM17RequestFormExplainsWhyDisabled() {
  return salesConsoleM17RequestFormShell.helperText.includes("backend destination gates pass");
}
