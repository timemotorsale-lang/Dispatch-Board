import type { ComponentProps } from "react";

import { MyTasksScreen } from "@/features/tasks/my-tasks-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";
import { getStaffDay } from "@/server/services/staff-day";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { getTaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import { isTechnicianOnlyUser } from "@/server/auth/navigation";
import { RepairAssignmentsPanel } from "@/features/technician/repair-assignments-panel";
import { TechnicianShiftControl } from "@/features/technician/technician-shift-control";
import {
  getTaskSpecialistRoutes,
  getTechnicianMyWork,
  type TechnicianShopPulse
} from "@/server/technician-workspace/service";
import { getSafeTimeAttendanceCaptureState } from "@/server/time-attendance";

export default async function MyTasksPage() {
  const user = await requireCurrentUser();
  const technicianMode = isTechnicianOnlyUser(user);
  let repairAssignments: Awaited<ReturnType<typeof getTechnicianMyWork>>["assignments"] = [];
  let shopPulse: TechnicianShopPulse | null = null;
  let repairAssignmentsError: string | null = null;
  let shiftState: Awaited<ReturnType<typeof getSafeTimeAttendanceCaptureState>> | null = null;
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
    specialistHrefByTask: {},
    technicianMode,
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
    screenProps.specialistHrefByTask = await getTaskSpecialistRoutes(myTasks.tasks.map((task) => task.id));
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

  if (technicianMode) {
    const [technicianWorkResult, shiftStateResult] = await Promise.allSettled([
      getTechnicianMyWork(user),
      getSafeTimeAttendanceCaptureState(user)
    ]);
    if (technicianWorkResult.status === "fulfilled") {
      const technicianWork = technicianWorkResult.value;
      repairAssignments = technicianWork.assignments;
      shopPulse = technicianWork.pulse;
    } else {
      const error = technicianWorkResult.reason;
      repairAssignmentsError = error instanceof Error ? error.message : "Repair assignments are unavailable.";
    }
    if (shiftStateResult.status === "fulfilled") shiftState = shiftStateResult.value;
  }

  const shiftGateActive = Boolean(
    technicianMode &&
    shiftState &&
    !shiftState.unavailableReason &&
    shiftState.state !== "OPEN"
  );

  if (technicianMode && shiftState && shiftGateActive) {
    return <TechnicianShiftControl hasRunningRepair={false} initialState={shiftState} />;
  }

  return (
    <>
      {technicianMode && shiftState ? (
        <TechnicianShiftControl
          hasRunningRepair={repairAssignments.some((assignment) => assignment.clockState === "RUNNING")}
          initialState={shiftState}
        />
      ) : null}
      {technicianMode ? <RepairAssignmentsPanel assignments={repairAssignments} pulse={shopPulse} unavailableReason={repairAssignmentsError} /> : null}
      <MyTasksScreen {...screenProps} />
    </>
  );
}
