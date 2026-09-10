import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

export const enterpriseAdminControlAreas = [
  "roles",
  "permissions",
  "workflow_templates",
  "required_fields",
  "activity_categories",
  "report_settings",
  "duplicate_merge_rules",
  "notification_settings",
  "audit_review",
  "data_correction_process",
] as const;

export type EnterpriseAdminControlArea = (typeof enterpriseAdminControlAreas)[number];

export type EnterpriseAdminControl = {
  area: EnterpriseAdminControlArea;
  auditEventType: string;
  href: string;
  requiredRole: "MANAGER";
  staffVisibility: "ADMIN_ONLY";
  summary: string;
  title: string;
};

export type EnterpriseAdminControlAccess = {
  allowed: boolean;
  area: EnterpriseAdminControlArea;
  reason: string;
  requiredRole: "MANAGER";
};

const controls: EnterpriseAdminControl[] = [
  { area: "roles", auditEventType: "ADMIN_ROLE_POLICY_CHANGED", href: "/settings/admin?area=roles", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Create and edit role definitions outside daily execution screens.", title: "Roles" },
  { area: "permissions", auditEventType: "ADMIN_PERMISSION_POLICY_CHANGED", href: "/settings/admin?area=permissions", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Control what each role can see, approve, and execute.", title: "Permissions" },
  { area: "workflow_templates", auditEventType: "ADMIN_WORKFLOW_TEMPLATE_CHANGED", href: "/settings/admin?area=workflow-templates", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Manage reusable task and workflow defaults without changing active staff screens.", title: "Workflow templates" },
  { area: "required_fields", auditEventType: "ADMIN_REQUIRED_FIELD_POLICY_CHANGED", href: "/settings/admin?area=required-fields", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Define required fields by workflow so staff sees only what the current action needs.", title: "Required fields" },
  { area: "activity_categories", auditEventType: "ADMIN_ACTIVITY_CATEGORY_CHANGED", href: "/settings/admin?area=activity-categories", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Curate update categories used by reports, search, and workbook triage.", title: "Activity categories" },
  { area: "report_settings", auditEventType: "ADMIN_REPORT_SETTING_CHANGED", href: "/settings/admin?area=report-settings", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Tune report sections, inclusion rules, and manager closeout expectations.", title: "Report settings" },
  { area: "duplicate_merge_rules", auditEventType: "ADMIN_DUPLICATE_RULE_CHANGED", href: "/settings/admin?area=duplicate-rules", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Configure duplicate detection thresholds and merge review requirements.", title: "Duplicate merge rules" },
  { area: "notification_settings", auditEventType: "ADMIN_NOTIFICATION_POLICY_CHANGED", href: "/settings/admin?area=notifications", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Set quiet hours, escalation paths, and anti-spam notification rules.", title: "Notification settings" },
  { area: "audit_review", auditEventType: "ADMIN_AUDIT_REVIEW_OPENED", href: "/settings/admin?area=audit-review", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Review command history, evidence, and configuration changes.", title: "Audit review" },
  { area: "data_correction_process", auditEventType: "ADMIN_DATA_CORRECTION_POLICY_CHANGED", href: "/settings/admin?area=data-corrections", requiredRole: "MANAGER", staffVisibility: "ADMIN_ONLY", summary: "Require reasons, source proof, and audit records for corrections.", title: "Data correction process" },
];

export function listEnterpriseAdminControls() {
  return controls.map((control) => ({ ...control }));
}

export function evaluateEnterpriseAdminControlAccess(actor: AuthenticatedUser | null, area: EnterpriseAdminControlArea): EnterpriseAdminControlAccess {
  const authenticated = actor ? assertAuthenticatedUser(actor) : null;
  if (!authenticated) return { allowed: false, area, reason: "Sign in before changing enterprise admin controls.", requiredRole: "MANAGER" };
  if (!isManager(authenticated)) return { allowed: false, area, reason: "Enterprise admin controls are separated from staff execution and require manager access.", requiredRole: "MANAGER" };
  return { allowed: true, area, reason: "Manager access confirmed for enterprise admin control.", requiredRole: "MANAGER" };
}

export function assertEnterpriseAdminControlAccess(actor: AuthenticatedUser | null, area: EnterpriseAdminControlArea) {
  const decision = evaluateEnterpriseAdminControlAccess(actor, area);
  if (!decision.allowed) throw new Error(decision.reason);
  return decision;
}
