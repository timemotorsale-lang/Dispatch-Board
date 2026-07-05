export const TASK_CHECKLIST_ITEM_KIND = {
  DEFINITION_OF_DONE: "DEFINITION_OF_DONE",
  SUBTASK: "SUBTASK"
} as const;

export type TaskChecklistItemKindValue =
  (typeof TASK_CHECKLIST_ITEM_KIND)[keyof typeof TASK_CHECKLIST_ITEM_KIND];

export const TASK_CHECKLIST_ITEM_KIND_VALUES = Object.values(TASK_CHECKLIST_ITEM_KIND);
