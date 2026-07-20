import type { ComponentProps } from "react";

import { MyTasksScreen } from "@/features/tasks/my-tasks-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";
import { getStaffDay } from "@/server/services/staff-day";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { getTaskCompletionReadiness } from "@/server/services/task-execution-readiness";

export default async function MyTasksPage() {
  const user = await requireCurrentUser();
  const executionFlags = getStaffExecutionFlags();
  const screenProps: ComponentProps<typeof MyTasksScreen> = {
    boardDate: new Date().toISOString().slice(0, 10),
    boardExists: false,
    availableWorkEnabled: executionFlags.availableWorkEnabled,
    endOfDayHandoffEnabled: executionFlags.endOfDayReportEnabled,
    currentUserId: user.id,
    errorMessage: null,
    fullBoardHref: "/board",
    generatedAt: null,
    generationStatus: null,
    initialTasks: [],
    initialStaffDay: null,
    initialReadinessByTask: {},
    isManager: isManager(user),
    nowIso: new Date().toISOString(),
    userName: user.name
  };

  try {
    const myTasks = await getMyTasksViewModelForToday(user);

    screenProps.boardDate = myTasks.date;
    screenProps.boardExists = myTasks.boardExists;
    screenProps.fullBoardHref = `/board?date=${encodeURIComponent(myTasks.date)}`;
    screenProps.generatedAt = myTasks.generatedAt;
    screenProps.generationStatus = myTasks.generationStatus;
    screenProps.initialTasks = myTasks.tasks;
    const [readinessEntries, staffDayResult] = await Promise.all([
      executionFlags.taskAcceptanceEnabled
        ? Promise.all(myTasks.tasks.map(async (task) => [
          task.id,
          await getTaskCompletionReadiness(user, task.id)
        ] as const))
        : Promise.resolve([]),
      getStaffDay(user, myTasks.date)
    ]);
    screenProps.initialReadinessByTask = Object.fromEntries(readinessEntries);
    screenProps.initialStaffDay = staffDayResult.startDayEnabled ? staffDayResult.staffDay : null;
  } catch (error) {
    screenProps.errorMessage =
      error instanceof Error ? error.message : "Unable to load your tasks right now.";
  }

  return <MyTasksScreen {...screenProps} />;
}
