import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageTaskTemplates } from "@/server/policies/access";
import {
  createTaskTemplateRepository,
  type TaskTemplateRecord
} from "@/server/repositories/task-template-repository";
import {
  normalizeTaskTemplateCreateInput,
  normalizeTaskTemplateUpdateInput,
  type NormalizedTaskTemplateCreateInput,
  type NormalizedTaskTemplateUpdateInput,
  type TaskTemplateApprovalRules,
  type TaskTemplateCardDisplayHints,
  type TaskTemplateChecklistItem,
  type TaskTemplateCompletionCriteria,
  type TaskTemplateDefaultStatusRules,
  type TaskTemplateRequiredUpdateField
} from "@/server/validation/task-template";

export type TaskTemplateRepository = ReturnType<typeof createTaskTemplateRepository>;

export type TaskTemplateSummary = {
  id: string;
  title: string;
  description: string | null;
  templateCategory: string | null;
  workflowArea: TaskTemplateRecord["workflowArea"];
  priority: TaskTemplateRecord["priority"];
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields: TaskTemplateRequiredUpdateField[];
  checklistItems: TaskTemplateChecklistItem[];
  completionCriteria: TaskTemplateCompletionCriteria;
  defaultStatusRules: TaskTemplateDefaultStatusRules;
  approvalRules: TaskTemplateApprovalRules;
  intelligenceSignalType: string;
  taskCardDisplayHints: TaskTemplateCardDisplayHints;
  isActive: boolean;
  roleId: string | null;
  dutyId: string | null;
  roleName: string | null;
  dutyName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListTaskTemplatesOptions = {
  includeInactive?: boolean;
};

function toTaskTemplateSummary(template: TaskTemplateRecord): TaskTemplateSummary {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    templateCategory: template.templateCategory,
    workflowArea: template.workflowArea,
    priority: template.priority,
    defaultDueTime: template.defaultDueTime,
    requiresManagerApproval: template.requiresManagerApproval,
    requiredUpdateFields: template.requiredUpdateFields as TaskTemplateRequiredUpdateField[],
    checklistItems: template.checklistItems as TaskTemplateChecklistItem[],
    completionCriteria: template.completionCriteria as TaskTemplateCompletionCriteria,
    defaultStatusRules: template.defaultStatusRules as TaskTemplateDefaultStatusRules,
    approvalRules: template.approvalRules as TaskTemplateApprovalRules,
    intelligenceSignalType: template.intelligenceSignalType,
    taskCardDisplayHints: template.taskCardDisplayHints as TaskTemplateCardDisplayHints,
    isActive: template.isActive,
    roleId: template.roleId,
    dutyId: template.dutyId,
    roleName: template.role?.name ?? null,
    dutyName: template.duty?.name ?? null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt
  };
}

async function assertRoleAndDutyReferences(
  input: Pick<NormalizedTaskTemplateCreateInput, "roleId" | "dutyId"> | NormalizedTaskTemplateUpdateInput,
  repository: TaskTemplateRepository
) {
  if (input.roleId) {
    const role = await repository.findRoleById(input.roleId);

    if (!role) {
      throw new Error("Task template roleId must reference an existing role.");
    }
  }

  if (input.dutyId) {
    const duty = await repository.findDutyById(input.dutyId);

    if (!duty) {
      throw new Error("Task template dutyId must reference an existing duty.");
    }
  }
}

export function assertCanManageTaskTemplateRecords(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageTaskTemplates(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

export async function listTaskTemplatesForManager(
  user: AuthenticatedUser | null,
  options: ListTaskTemplatesOptions = {},
  repository: TaskTemplateRepository = createTaskTemplateRepository()
) {
  assertCanManageTaskTemplateRecords(user);

  const templates = await repository.listTaskTemplates({
    includeInactive: options.includeInactive ?? false
  });

  return templates.map(toTaskTemplateSummary);
}

export async function createTaskTemplate(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TaskTemplateRepository = createTaskTemplateRepository()
) {
  assertCanManageTaskTemplateRecords(user);

  const normalizedInput = normalizeTaskTemplateCreateInput(input);

  await assertRoleAndDutyReferences(normalizedInput, repository);

  const template = await repository.createTaskTemplate(normalizedInput);

  return toTaskTemplateSummary(template);
}

export async function updateTaskTemplate(
  user: AuthenticatedUser | null,
  taskTemplateId: string,
  input: unknown,
  repository: TaskTemplateRepository = createTaskTemplateRepository()
) {
  assertCanManageTaskTemplateRecords(user);

  const normalizedTaskTemplateId = taskTemplateId.trim();

  if (!normalizedTaskTemplateId) {
    throw new Error("Task template id is required.");
  }

  const normalizedInput = normalizeTaskTemplateUpdateInput(input);

  await assertRoleAndDutyReferences(normalizedInput, repository);

  const template = await repository.updateTaskTemplate(normalizedTaskTemplateId, normalizedInput);

  if (!template) {
    throw new Error("Task template not found.");
  }

  return toTaskTemplateSummary(template);
}
