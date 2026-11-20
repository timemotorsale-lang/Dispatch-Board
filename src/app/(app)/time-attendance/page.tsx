import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDefaultLandingRoute } from "@/server/auth/navigation";
import { getSafePayrollHandoffReadiness, getSafeTimeAttendanceCaptureState, getSafeTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";
import { getPersonalTimeCardPeriods } from "@/server/time-attendance/personal-periods";

const views = ["today", "my-time", "manager", "policies", "payroll"] as const;
type TimeAttendanceView = (typeof views)[number];

const employeeActions = ["correction", "confirm", "leave", "punches"] as const;

export default async function TimeAttendancePage({ searchParams }: { searchParams: Promise<{ view?: string; density?: string; period?: string; correctionDate?: string; action?: string; review?: string }> }) {
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
    (candidate === "manager" && !model.permissions.manager) ||
    (candidate === "policies" && !model.permissions.policies) ||
    (candidate === "payroll" && !model.permissions.payroll)
  ) ? "today" : candidate;

  const history = activeView === "my-time" ? await getPersonalTimeCardPeriods(user, model.employeeCard.cardId, query.period) : undefined;
  const employeeAction = activeView === "my-time" ? employeeActions.find(action => action === query.action) : undefined;
  return <TimeAttendanceConsole activeView={activeView} captureState={captureState} density={query.density === "high" ? "high" : "calm"} managerReviewQueue={managerReviewQueue} model={model} payrollReadiness={payrollReadiness} workspaceHref={getDefaultLandingRoute(user)} history={history} hasRequestedPeriod={Boolean(query.period)} historicalSelection={Boolean(activeView === "my-time" && query.period && history?.selected?.current !== true)} correctionDate={correctionDate} employeeAction={employeeAction} showOperationalHealth={query.action === "health"} reviewItem={typeof query.review === "string" ? query.review : undefined} />;
}
