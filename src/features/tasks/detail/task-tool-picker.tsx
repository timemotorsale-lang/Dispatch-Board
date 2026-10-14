"use client";

import { Grid3X3 } from "lucide-react";
import { useRouter } from "next/navigation";

export const taskTools = [
  ["status", "Status"],
  ["workflow", "Role and execution path"],
  ["assignee", "Assignee and collaborators"],
  ["planner", "Planner"],
  ["documents", "Upload document or photo"],
  ["subtask", "Add subtask"],
  ["checklist", "Open checklist"],
  ["updates", "Progress and comments"],
  ["repairDetails", "Repair details"],
  ["metadata", "Task details and context"],
  ["approvals", "Approvals and completion"],
  ["activity", "Activity history"]
] as const;

export type TaskTool = typeof taskTools[number][0];
export type TaskToolSelection = "" | TaskTool;

export const advancedTaskTools: Partial<Record<TaskTool, string>> = {
  metadata: "task-metadata",
  approvals: "approvals",
  activity: "timeline"
};

export function TaskToolPicker({
  canOpenAdvanced = false,
  onSelect,
  returnTo,
  taskId,
  value = ""
}: {
  canOpenAdvanced?: boolean;
  onSelect?: (tool: TaskToolSelection) => void;
  returnTo: string;
  taskId: string;
  value?: TaskToolSelection;
}) {
  const router = useRouter();

  return (
    <label className="etw-compact-tool-picker">
      <Grid3X3 size={15} />
      <span>Task tools</span>
      <select aria-label="Open task tool" value={value} onChange={(event) => {
        const tool = event.currentTarget.value as TaskToolSelection;
        if (onSelect) return onSelect(tool);
        if (!tool) return;
        const params = new URLSearchParams({ view: "simple", returnTo, tool });
        router.push(`/tasks/${encodeURIComponent(taskId)}?${params.toString()}`);
      }}>
        <option value="">Select a tool...</option>
        {taskTools.filter(([tool]) => canOpenAdvanced || !advancedTaskTools[tool]).map(([tool, label]) => (
          <option key={tool} value={tool}>{label}</option>
        ))}
      </select>
    </label>
  );
}
