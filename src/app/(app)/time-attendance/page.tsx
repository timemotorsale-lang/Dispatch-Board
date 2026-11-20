import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDefaultLandingRoute } from "@/server/auth/navigation";
import { getSafePayrollHandoffReadiness, getSafeTimeAttendanceCaptureState, getSafeTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";
import { getPersonalTimeCardPeriods } from "@/server/time-attendance/personal-periods";
import { getMyTimeOffWorkspace } from "@/server/time-attendance/time-off-workspace";
import { getMyWorkSchedule } from "@/server/time-attendance/my-work-schedule";
import { getPersonalJobLabor } from "@/server/time-attendance/personal-job-labor";
import { getPayrollBatchHistory } from "@/server/time-attendance/payroll-batch-history";

const views = ["today", "my-time", "schedule", "manager", "policies", "payroll"] as const;
type TimeAttendanceView = (typeof views)[number];

const employeeActions = ["correction", "confirm", "leave", "punches"] as const;

export default async function TimeAttendancePage({ searchParams }: { searchParams: Promise<{ view?: string; density?: string; period?: string; correctionDate?: string; action?: string; review?: string; week?: string; batch?: string }> }) {
  const user = await requireCurrentUser();
  const query = await searchParams;
  const requestedView = query.view;
  const correctionDate = requestedView === "my-time" && typeof query.correctionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.correctionDate) ? query.correctionDate : undefined;
  const [captureState, managerReviewQueue, payrollReadiness, model] = await Promise.all([
    getSafeTimeAttendanceCaptureState(user),
    getSafeTimeAttendanceManagerReviewQueue(user),
    getSafePayrollHandoffReadiness(user),
    getTimeAttendanceConsoleModel(user, { correctionDate })
  ]);

  const candidate = views.includes(requestedView as TimeAttendanceView)
    ? requestedView as TimeAttendanceView
    : "today";
  const activeView = (
    (candidate === "schedule" && !model.permissions.employee) ||
    (candidate === "manager" && !managerReviewQueue.permitted && !model.permissions.manager) ||
    (candidate === "policies" && !model.permissions.policies) ||
    (candidate === "payroll" && !model.permissions.payroll)
  ) ? "today" : candidate;

  const [history, timeOffWorkspace, schedule, jobLabor, payrollBatches] = await Promise.all([
    activeView === "my-time" ? getPersonalTimeCardPeriods(user, model.employeeCard.cardId, query.period) : undefined,
    activeView === "my-time" ? getMyTimeOffWorkspace(user, captureState.locationId, captureState.timezone) : undefined,
    activeView === "schedule" ? getMyWorkSchedule(user, captureState.locationId, captureState.timezone, query.week) : undefined,
    activeView === "my-time" && !query.period ? getPersonalJobLabor() : null,
    activeView === "payroll" ? getPayrollBatchHistory(user).catch((error: unknown) => {
      console.error("Could not load payroll batch history", error);
      return null;
    }) : undefined,
  ]);
  const selectedBatch = payrollBatches?.find(batch => batch.id === query.batch);
  const selectedReadiness = selectedBatch
    ? await getSafePayrollHandoffReadiness(user, { periodStart: selectedBatch.periodStart, periodEnd: selectedBatch.periodEnd })
    : payrollReadiness;
  const employeeAction = activeView === "my-time" ? employeeActions.find(action => action === query.action) : undefined;
  return <TimeAttendanceConsole activeView={activeView} captureState={captureState} density={query.density === "high" ? "high" : "calm"} managerReviewQueue={managerReviewQueue} model={model} payrollReadiness={selectedReadiness} workspaceHref={getDefaultLandingRoute(user)} history={history} hasRequestedPeriod={Boolean(query.period)} historicalSelection={Boolean(activeView === "my-time" && query.period && history?.selected?.current !== true)} correctionDate={correctionDate} employeeAction={employeeAction} showOperationalHealth={query.action === "health"} reviewItem={typeof query.review === "string" ? query.review : undefined} timeOffWorkspace={timeOffWorkspace} schedule={schedule} jobLabor={jobLabor} payrollBatches={payrollBatches} selectedPayrollBatchId={selectedBatch?.id} />;
}
