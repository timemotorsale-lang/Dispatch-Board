export const taskContextScopes = ["SPECIFIC", "INVENTORY", "OPERATIONS"] as const;
export type TaskContextScope = typeof taskContextScopes[number];
export const taskContextAreas = [
  { value: "INVENTORY", label: "Inventory management" },
  { value: "SERVICE", label: "Service and reconditioning" },
  { value: "SALES", label: "Sales and delivery" },
  { value: "CUSTOMERS", label: "Customer follow-up" },
  { value: "DOCUMENTS", label: "Documents and compliance" },
  { value: "COLLECTIONS", label: "Collections" },
  { value: "MARKETING", label: "Marketing and listings" },
  { value: "ADMIN", label: "Administration and finance" }
] as const;
export type TaskContextArea = typeof taskContextAreas[number]["value"];
export function isBroadTaskContext(scope: unknown): scope is "INVENTORY" | "OPERATIONS" {
  return scope === "INVENTORY" || scope === "OPERATIONS";
}
export function taskContextLabel(scope: TaskContextScope) {
  return scope === "INVENTORY" ? "Inventory / multiple vehicles" : scope === "OPERATIONS" ? "Operations / action plan" : "Specific customer or vehicle";
}
export function readTaskOperatingContext(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("intake" in snapshot)) return null;
  const intake = snapshot.intake;
  if (!intake || typeof intake !== "object" || !("contextScope" in intake) || !isBroadTaskContext(intake.contextScope)) return null;
  const details = "contextDetails" in intake && typeof intake.contextDetails === "string" ? intake.contextDetails.trim() : "";
  if (!details) return null;
  const savedAreas = "contextAreas" in intake && Array.isArray(intake.contextAreas) ? intake.contextAreas : [];
  const areas = taskContextAreas.filter(area => savedAreas.includes(area.value)).map(area => area.label);
  return { scope: intake.contextScope, label: taskContextLabel(intake.contextScope), details, areas };
}
