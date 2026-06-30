import type { ComponentProps } from "react";

import { MyTasksScreen } from "@/features/tasks/my-tasks-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";

export default async function MyTasksPage() {
  const user = await requireCurrentUser();
  const screenProps: ComponentProps<typeof MyTasksScreen> = {
    boardDate: new Date().toISOString().slice(0, 10),
    boardExists: false,
    errorMessage: null,
    fullBoardHref: "/board",
    generatedAt: null,
    generationStatus: null,
    initialTasks: [],
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
  } catch (error) {
    screenProps.errorMessage =
      error instanceof Error ? error.message : "Unable to load your tasks right now.";
  }

  return <MyTasksScreen {...screenProps} />;
}
