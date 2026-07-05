import { TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

const taskTemplateFieldTypeValues = ["short_text", "long_text", "single_select", "boolean"] as const;
const completionCriteriaModeValues = [
  "manual",
  "checklist",
  "update_fields",
  "checklist_and_update_fields"
] as const;
const approvalRuleModeValues = ["none", "manager_review"] as const;
const intelligenceSignalTypeValues = [
  "NONE",
  "DAILY_INTELLIGENCE",
  "MANAGER_DIRECTIVE",
  "INVENTORY_UPDATE",
  "RECON_UPDATE",
  "SERVICE_UPDATE",
  "MARKETING_UPDATE",
  "SALES_UPDATE",
  "CUSTOMER_ISSUE",
  "COLLECTIONS_UPDATE"
] as const;
const waitingReasonStatusValues = [TaskStatus.WAITING_ON_PARTS, TaskStatus.WAITING_ON_APPROVAL] as const;

const taskTemplateCreateAllowedKeys = new Set([
  "title",
  "description",
  "templateCategory",
  "workflowArea",
  "priority",
  "defaultDueTime",
  "requiresManagerApproval",
  "requiredUpdateFields",
  "checklistItems",
  "completionCriteria",
  "defaultStatusRules",
  "approvalRules",
  "intelligenceSignalType",
  "taskCardDisplayHints",
  "roleId",
  "dutyId",
  "isActive"
]);

const taskTemplateUpdateAllowedKeys = new Set(taskTemplateCreateAllowedKeys);
const workflowAreaValues = new Set(Object.values(WorkflowArea));
const priorityValues = new Set(Object.values(TaskTemplatePriority));
const taskStatusValues = new Set(Object.values(TaskStatus));
const defaultDueTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const fieldKeyPattern = /^[a-z][a-z0-9_]*$/;

export type TaskTemplateFieldType = (typeof taskTemplateFieldTypeValues)[number];
export type CompletionCriteriaMode = (typeof completionCriteriaModeValues)[number];
export type ApprovalRuleMode = (typeof approvalRuleModeValues)[number];
export type IntelligenceSignalType = (typeof intelligenceSignalTypeValues)[number];
export type WaitingReasonStatus = (typeof waitingReasonStatusValues)[number];

export type TaskTemplateRequiredUpdateField = {
  key: string;
  label: string;
  type: TaskTemplateFieldType;
  required: boolean;
  helpText: string | null;
  options?: string[];
};

export type TaskTemplateChecklistItem = {
  key: string;
  label: string;
  description: string | null;
  required: boolean;
};

export type TaskTemplateCompletionCriteria = {
  mode: CompletionCriteriaMode;
  requiredChecklistKeys: string[];
  requiredFieldKeys: string[];
};

export type TaskTemplateDefaultStatusRules = {
  allowedStatuses: TaskStatus[];
  blockedReasonRequired: boolean;
  waitingReasonRequiredStatuses: WaitingReasonStatus[];
};

export type TaskTemplateApprovalRules = {
  mode: ApprovalRuleMode;
  readyForReviewRequired: boolean;
};

export type TaskTemplateCardDisplayHints = {
  emphasizeDueTime: boolean;
  emphasizeVehicle: boolean;
  emphasizeCustomer: boolean;
  showChecklistProgress: boolean;
  highlightReadyForReview: boolean;
};

export type NormalizedTaskTemplateCreateInput = {
  title: string;
  description: string | null;
  templateCategory: string | null;
  workflowArea: WorkflowArea;
  priority: TaskTemplatePriority;
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields: TaskTemplateRequiredUpdateField[];
  checklistItems: TaskTemplateChecklistItem[];
  completionCriteria: TaskTemplateCompletionCriteria;
  defaultStatusRules: TaskTemplateDefaultStatusRules;
  approvalRules: TaskTemplateApprovalRules;
  intelligenceSignalType: IntelligenceSignalType;
  taskCardDisplayHints: TaskTemplateCardDisplayHints;
  roleId: string | null;
  dutyId: string | null;
  isActive: boolean;
};

export type NormalizedTaskTemplateUpdateInput = Partial<NormalizedTaskTemplateCreateInput>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskTemplateObject(value: unknown, message: string) {
  if (!isPlainObject(value)) {
    throw new Error(message);
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowedKeys: Set<string>) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Task template contains an unsupported field: "${key}".`);
    }
  }
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task templates require a title.");
  }

  const title = value.trim();

  if (!title) {
    throw new Error("Task templates require a title.");
  }

  return title;
}

function normalizeDescription(value: unknown, fieldName = "description") {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Task templates require ${fieldName} to be a string when provided.`);
  }

  const description = value.trim();

  return description || null;
}

function normalizeTemplateCategory(value: unknown) {
  return normalizeDescription(value, "templateCategory");
}

function normalizeWorkflowArea(value: unknown) {
  if (typeof value !== "string" || !workflowAreaValues.has(value as WorkflowArea)) {
    throw new Error("Task templates require a valid workflow area.");
  }

  return value as WorkflowArea;
}

function normalizePriority(value: unknown) {
  if (value === undefined) {
    return TaskTemplatePriority.MEDIUM;
  }

  if (typeof value !== "string" || !priorityValues.has(value as TaskTemplatePriority)) {
    throw new Error("Task templates require a valid priority.");
  }

  return value as TaskTemplatePriority;
}

function normalizeDefaultDueTime(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task templates require a valid default due time in HH:mm format.");
  }

  const defaultDueTime = value.trim();

  if (!defaultDueTimePattern.test(defaultDueTime)) {
    throw new Error("Task templates require a valid default due time in HH:mm format.");
  }

  return defaultDueTime;
}

function normalizeBoolean(value: unknown, message: string) {
  if (typeof value !== "boolean") {
    throw new Error(message);
  }

  return value;
}

function normalizeOptionalId(value: unknown, fieldName: "roleId" | "dutyId") {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Task templates require ${fieldName} to be a string or null when provided.`);
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function normalizeFieldKey(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`Task templates require ${fieldName} to be a string.`);
  }

  const normalizedKey = value.trim();

  if (!fieldKeyPattern.test(normalizedKey)) {
    throw new Error(
      `Task templates require ${fieldName} to use lowercase letters, numbers, and underscores.`
    );
  }

  return normalizedKey;
}

function normalizeStringArray(
  value: unknown,
  fieldName: string,
  { allowEmpty = true }: { allowEmpty?: boolean } = {}
) {
  if (!Array.isArray(value)) {
    throw new Error(`Task templates require ${fieldName} to be an array.`);
  }

  const normalizedValues = value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`Task templates require ${fieldName}[${index}] to be a string.`);
    }

    const normalizedEntry = entry.trim();

    if (!normalizedEntry) {
      throw new Error(`Task templates require ${fieldName}[${index}] to be a non-empty string.`);
    }

    return normalizedEntry;
  });

  if (!allowEmpty && normalizedValues.length === 0) {
    throw new Error(`Task templates require ${fieldName} to include at least one value.`);
  }

  return [...new Set(normalizedValues)];
}

function normalizeRequiredUpdateFields(value: unknown): TaskTemplateRequiredUpdateField[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("Task templates require requiredUpdateFields to be an array.");
  }

  const seenKeys = new Set<string>();

  return value.map((entry, index) => {
    const field = assertTaskTemplateObject(
      entry,
      `Task templates require requiredUpdateFields[${index}] to be an object.`
    );
    const key = normalizeFieldKey(field.key, `requiredUpdateFields[${index}].key`);

    if (seenKeys.has(key)) {
      throw new Error(`Task templates require requiredUpdateFields keys to be unique. Duplicate key: "${key}".`);
    }

    seenKeys.add(key);

    if (typeof field.label !== "string" || !field.label.trim()) {
      throw new Error(`Task templates require requiredUpdateFields[${index}].label to be a non-empty string.`);
    }

    if (
      typeof field.type !== "string" ||
      !taskTemplateFieldTypeValues.includes(field.type as TaskTemplateFieldType)
    ) {
      throw new Error(`Task templates require requiredUpdateFields[${index}].type to be supported.`);
    }

    const type = field.type as TaskTemplateFieldType;
    const helpText = normalizeDescription(field.helpText, `requiredUpdateFields[${index}].helpText`) ?? null;
    const required =
      field.required === undefined
        ? true
        : normalizeBoolean(
            field.required,
            `Task templates require requiredUpdateFields[${index}].required to be boolean when provided.`
          );
    const options =
      field.options === undefined
        ? undefined
        : normalizeStringArray(field.options, `requiredUpdateFields[${index}].options`, {
            allowEmpty: false
          });

    if (type === "single_select" && (!options || options.length === 0)) {
      throw new Error(`Task templates require requiredUpdateFields[${index}].options for single_select fields.`);
    }

    if (type !== "single_select" && options) {
      throw new Error(
        `Task templates only allow requiredUpdateFields[${index}].options when type is single_select.`
      );
    }

    return {
      key,
      label: field.label.trim(),
      type,
      required,
      helpText,
      ...(options ? { options } : {})
    };
  });
}

function normalizeChecklistItems(value: unknown): TaskTemplateChecklistItem[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("Task templates require checklistItems to be an array.");
  }

  const seenKeys = new Set<string>();

  return value.map((entry, index) => {
    const item = assertTaskTemplateObject(
      entry,
      `Task templates require checklistItems[${index}] to be an object.`
    );
    const key = normalizeFieldKey(item.key, `checklistItems[${index}].key`);

    if (seenKeys.has(key)) {
      throw new Error(`Task templates require checklistItems keys to be unique. Duplicate key: "${key}".`);
    }

    seenKeys.add(key);

    if (typeof item.label !== "string" || !item.label.trim()) {
      throw new Error(`Task templates require checklistItems[${index}].label to be a non-empty string.`);
    }

    return {
      key,
      label: item.label.trim(),
      description: normalizeDescription(item.description, `checklistItems[${index}].description`) ?? null,
      required:
        item.required === undefined
          ? true
          : normalizeBoolean(
              item.required,
              `Task templates require checklistItems[${index}].required to be boolean when provided.`
            )
    };
  });
}

function getRequiredFieldKeys(requiredUpdateFields: TaskTemplateRequiredUpdateField[]) {
  return new Set(requiredUpdateFields.map((field) => field.key));
}

function getChecklistKeys(checklistItems: TaskTemplateChecklistItem[]) {
  return new Set(checklistItems.map((item) => item.key));
}

function normalizeCompletionCriteria(
  value: unknown,
  requiredUpdateFields: TaskTemplateRequiredUpdateField[],
  checklistItems: TaskTemplateChecklistItem[]
): TaskTemplateCompletionCriteria {
  if (value === undefined) {
    return {
      mode: "manual",
      requiredChecklistKeys: [],
      requiredFieldKeys: []
    };
  }

  const criteria = assertTaskTemplateObject(value, "Task templates require completionCriteria to be an object.");
  const mode =
    criteria.mode === undefined
      ? "manual"
      : (() => {
          if (
            typeof criteria.mode !== "string" ||
            !completionCriteriaModeValues.includes(criteria.mode as CompletionCriteriaMode)
          ) {
            throw new Error("Task templates require completionCriteria.mode to be supported.");
          }

          return criteria.mode as CompletionCriteriaMode;
        })();
  const requiredChecklistKeys =
    criteria.requiredChecklistKeys === undefined
      ? []
      : normalizeStringArray(criteria.requiredChecklistKeys, "completionCriteria.requiredChecklistKeys");
  const requiredFieldKeys =
    criteria.requiredFieldKeys === undefined
      ? []
      : normalizeStringArray(criteria.requiredFieldKeys, "completionCriteria.requiredFieldKeys");

  const checklistKeySet = getChecklistKeys(checklistItems);
  const fieldKeySet = getRequiredFieldKeys(requiredUpdateFields);

  for (const checklistKey of requiredChecklistKeys) {
    if (!checklistKeySet.has(checklistKey)) {
      throw new Error(
        `Task templates require completionCriteria.requiredChecklistKeys to reference checklistItems keys. Missing "${checklistKey}".`
      );
    }
  }

  for (const fieldKey of requiredFieldKeys) {
    if (!fieldKeySet.has(fieldKey)) {
      throw new Error(
        `Task templates require completionCriteria.requiredFieldKeys to reference requiredUpdateFields keys. Missing "${fieldKey}".`
      );
    }
  }

  return {
    mode,
    requiredChecklistKeys,
    requiredFieldKeys
  };
}

function normalizeDefaultStatusRules(value: unknown): TaskTemplateDefaultStatusRules {
  if (value === undefined) {
    return {
      allowedStatuses: Object.values(TaskStatus),
      blockedReasonRequired: true,
      waitingReasonRequiredStatuses: []
    };
  }

  const rules = assertTaskTemplateObject(value, "Task templates require defaultStatusRules to be an object.");
  const allowedStatuses =
    rules.allowedStatuses === undefined
      ? Object.values(TaskStatus)
      : (() => {
          if (!Array.isArray(rules.allowedStatuses)) {
            throw new Error("Task templates require defaultStatusRules.allowedStatuses to be an array.");
          }

          const statuses = rules.allowedStatuses.map((entry, index) => {
            if (typeof entry !== "string" || !taskStatusValues.has(entry as TaskStatus)) {
              throw new Error(
                `Task templates require defaultStatusRules.allowedStatuses[${index}] to be a valid task status.`
              );
            }

            return entry as TaskStatus;
          });

          if (statuses.length === 0) {
            throw new Error("Task templates require defaultStatusRules.allowedStatuses to include at least one status.");
          }

          return [...new Set(statuses)];
        })();
  const blockedReasonRequired =
    rules.blockedReasonRequired === undefined
      ? true
      : normalizeBoolean(
          rules.blockedReasonRequired,
          "Task templates require defaultStatusRules.blockedReasonRequired to be boolean when provided."
        );
  const waitingReasonRequiredStatuses =
    rules.waitingReasonRequiredStatuses === undefined
      ? []
      : (() => {
          if (!Array.isArray(rules.waitingReasonRequiredStatuses)) {
            throw new Error(
              "Task templates require defaultStatusRules.waitingReasonRequiredStatuses to be an array."
            );
          }

          return [
            ...new Set(
              rules.waitingReasonRequiredStatuses.map((entry, index) => {
                if (
                  typeof entry !== "string" ||
                  !waitingReasonStatusValues.includes(entry as WaitingReasonStatus)
                ) {
                  throw new Error(
                    `Task templates require defaultStatusRules.waitingReasonRequiredStatuses[${index}] to be WAITING_ON_PARTS or WAITING_ON_APPROVAL.`
                  );
                }

                return entry as WaitingReasonStatus;
              })
            )
          ];
        })();

  return {
    allowedStatuses,
    blockedReasonRequired,
    waitingReasonRequiredStatuses
  };
}

function normalizeApprovalRules(
  value: unknown,
  requiresManagerApproval: boolean
): TaskTemplateApprovalRules {
  if (value === undefined) {
    return requiresManagerApproval
      ? {
          mode: "manager_review",
          readyForReviewRequired: true
        }
      : {
          mode: "none",
          readyForReviewRequired: false
        };
  }

  const rules = assertTaskTemplateObject(value, "Task templates require approvalRules to be an object.");

  if (typeof rules.mode !== "string" || !approvalRuleModeValues.includes(rules.mode as ApprovalRuleMode)) {
    throw new Error("Task templates require approvalRules.mode to be supported.");
  }

  const mode = rules.mode as ApprovalRuleMode;
  const readyForReviewRequired =
    rules.readyForReviewRequired === undefined
      ? mode === "manager_review"
      : normalizeBoolean(
          rules.readyForReviewRequired,
          "Task templates require approvalRules.readyForReviewRequired to be boolean when provided."
        );

  if (requiresManagerApproval && mode !== "manager_review") {
    throw new Error("Task templates require approvalRules.mode to be manager_review when manager approval is required.");
  }

  if (!requiresManagerApproval && mode === "manager_review") {
    throw new Error("Task templates do not allow approvalRules.mode manager_review when requiresManagerApproval is false.");
  }

  if (mode === "manager_review" && !readyForReviewRequired) {
    throw new Error("Task templates require approvalRules.readyForReviewRequired when manager review is enabled.");
  }

  return {
    mode,
    readyForReviewRequired
  };
}

function normalizeIntelligenceSignalType(value: unknown): IntelligenceSignalType {
  if (value === undefined) {
    return "NONE";
  }

  if (
    typeof value !== "string" ||
    !intelligenceSignalTypeValues.includes(value as IntelligenceSignalType)
  ) {
    throw new Error("Task templates require a supported intelligenceSignalType.");
  }

  return value as IntelligenceSignalType;
}

function normalizeTaskCardDisplayHints(value: unknown): TaskTemplateCardDisplayHints {
  if (value === undefined) {
    return {
      emphasizeDueTime: false,
      emphasizeVehicle: false,
      emphasizeCustomer: false,
      showChecklistProgress: false,
      highlightReadyForReview: false
    };
  }

  const hints = assertTaskTemplateObject(value, "Task templates require taskCardDisplayHints to be an object.");

  return {
    emphasizeDueTime:
      hints.emphasizeDueTime === undefined
        ? false
        : normalizeBoolean(
            hints.emphasizeDueTime,
            "Task templates require taskCardDisplayHints.emphasizeDueTime to be boolean when provided."
          ),
    emphasizeVehicle:
      hints.emphasizeVehicle === undefined
        ? false
        : normalizeBoolean(
            hints.emphasizeVehicle,
            "Task templates require taskCardDisplayHints.emphasizeVehicle to be boolean when provided."
          ),
    emphasizeCustomer:
      hints.emphasizeCustomer === undefined
        ? false
        : normalizeBoolean(
            hints.emphasizeCustomer,
            "Task templates require taskCardDisplayHints.emphasizeCustomer to be boolean when provided."
          ),
    showChecklistProgress:
      hints.showChecklistProgress === undefined
        ? false
        : normalizeBoolean(
            hints.showChecklistProgress,
            "Task templates require taskCardDisplayHints.showChecklistProgress to be boolean when provided."
          ),
    highlightReadyForReview:
      hints.highlightReadyForReview === undefined
        ? false
        : normalizeBoolean(
            hints.highlightReadyForReview,
            "Task templates require taskCardDisplayHints.highlightReadyForReview to be boolean when provided."
          )
  };
}

export function normalizeTaskTemplateCreateInput(value: unknown): NormalizedTaskTemplateCreateInput {
  const input = assertTaskTemplateObject(value, "Task template payload must be an object.");

  rejectUnknownKeys(input, taskTemplateCreateAllowedKeys);

  const requiresManagerApproval = normalizeBoolean(
    input.requiresManagerApproval,
    "Task templates require requiresManagerApproval to be boolean."
  );
  const requiredUpdateFields = normalizeRequiredUpdateFields(input.requiredUpdateFields);
  const checklistItems = normalizeChecklistItems(input.checklistItems);

  return {
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description) ?? null,
    templateCategory: normalizeTemplateCategory(input.templateCategory) ?? null,
    workflowArea: normalizeWorkflowArea(input.workflowArea),
    priority: normalizePriority(input.priority),
    defaultDueTime: normalizeDefaultDueTime(input.defaultDueTime),
    requiresManagerApproval,
    requiredUpdateFields,
    checklistItems,
    completionCriteria: normalizeCompletionCriteria(
      input.completionCriteria,
      requiredUpdateFields,
      checklistItems
    ),
    defaultStatusRules: normalizeDefaultStatusRules(input.defaultStatusRules),
    approvalRules: normalizeApprovalRules(input.approvalRules, requiresManagerApproval),
    intelligenceSignalType: normalizeIntelligenceSignalType(input.intelligenceSignalType),
    taskCardDisplayHints: normalizeTaskCardDisplayHints(input.taskCardDisplayHints),
    roleId: normalizeOptionalId(input.roleId, "roleId") ?? null,
    dutyId: normalizeOptionalId(input.dutyId, "dutyId") ?? null,
    isActive:
      input.isActive === undefined
        ? true
        : normalizeBoolean(input.isActive, "Task templates require isActive to be boolean when provided.")
  };
}

export function normalizeTaskTemplateUpdateInput(value: unknown): NormalizedTaskTemplateUpdateInput {
  const input = assertTaskTemplateObject(value, "Task template payload must be an object.");

  rejectUnknownKeys(input, taskTemplateUpdateAllowedKeys);

  if (Object.keys(input).length === 0) {
    throw new Error("Task template updates require at least one field.");
  }

  const normalizedInput: NormalizedTaskTemplateUpdateInput = {};
  const requiredUpdateFields =
    "requiredUpdateFields" in input ? normalizeRequiredUpdateFields(input.requiredUpdateFields) : undefined;
  const checklistItems = "checklistItems" in input ? normalizeChecklistItems(input.checklistItems) : undefined;

  if ("title" in input) {
    normalizedInput.title = normalizeTitle(input.title);
  }

  if ("description" in input) {
    normalizedInput.description = normalizeDescription(input.description) ?? null;
  }

  if ("templateCategory" in input) {
    normalizedInput.templateCategory = normalizeTemplateCategory(input.templateCategory) ?? null;
  }

  if ("workflowArea" in input) {
    normalizedInput.workflowArea = normalizeWorkflowArea(input.workflowArea);
  }

  if ("priority" in input) {
    normalizedInput.priority = normalizePriority(input.priority);
  }

  if ("defaultDueTime" in input) {
    normalizedInput.defaultDueTime = normalizeDefaultDueTime(input.defaultDueTime);
  }

  if ("requiresManagerApproval" in input) {
    normalizedInput.requiresManagerApproval = normalizeBoolean(
      input.requiresManagerApproval,
      "Task templates require requiresManagerApproval to be boolean."
    );
  }

  if ("requiredUpdateFields" in input) {
    normalizedInput.requiredUpdateFields = requiredUpdateFields;
  }

  if ("checklistItems" in input) {
    normalizedInput.checklistItems = checklistItems;
  }

  if ("completionCriteria" in input) {
    normalizedInput.completionCriteria = normalizeCompletionCriteria(
      input.completionCriteria,
      requiredUpdateFields ?? [],
      checklistItems ?? []
    );
  }

  if ("defaultStatusRules" in input) {
    normalizedInput.defaultStatusRules = normalizeDefaultStatusRules(input.defaultStatusRules);
  }

  if ("approvalRules" in input) {
    normalizedInput.approvalRules = normalizeApprovalRules(
      input.approvalRules,
      normalizedInput.requiresManagerApproval ?? false
    );
  }

  if ("intelligenceSignalType" in input) {
    normalizedInput.intelligenceSignalType = normalizeIntelligenceSignalType(input.intelligenceSignalType);
  }

  if ("taskCardDisplayHints" in input) {
    normalizedInput.taskCardDisplayHints = normalizeTaskCardDisplayHints(input.taskCardDisplayHints);
  }

  if ("roleId" in input) {
    normalizedInput.roleId = normalizeOptionalId(input.roleId, "roleId") ?? null;
  }

  if ("dutyId" in input) {
    normalizedInput.dutyId = normalizeOptionalId(input.dutyId, "dutyId") ?? null;
  }

  if ("isActive" in input) {
    normalizedInput.isActive = normalizeBoolean(
      input.isActive,
      "Task templates require isActive to be boolean when provided."
    );
  }

  return normalizedInput;
}
