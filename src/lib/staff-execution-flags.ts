export type StaffExecutionFlags = {
  enabled: boolean;
  startDayGateEnabled: boolean;
  taskAcceptanceEnabled: boolean;
  availableWorkEnabled: boolean;
  endOfDayReportEnabled: boolean;
  managerHealthEnabled: boolean;
};

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function getStaffExecutionFlags(environment: NodeJS.ProcessEnv = process.env): StaffExecutionFlags {
  const master = enabled(environment.STAFF_EXECUTION_ENABLED);

  return {
    enabled: master,
    startDayGateEnabled: master && enabled(environment.STAFF_EXECUTION_START_DAY_ENABLED),
    taskAcceptanceEnabled: master && enabled(environment.STAFF_EXECUTION_TASK_ACCEPTANCE_ENABLED),
    availableWorkEnabled: master && enabled(environment.STAFF_EXECUTION_AVAILABLE_WORK_ENABLED),
    endOfDayReportEnabled: master && enabled(environment.STAFF_EXECUTION_END_OF_DAY_ENABLED),
    managerHealthEnabled: master && enabled(environment.STAFF_EXECUTION_MANAGER_HEALTH_ENABLED)
  };
}
