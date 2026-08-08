import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { evaluateTimeAttendanceHardeningPilotReadiness, getSafePayrollHandoffReadiness, getSafeTimeAttendanceCaptureState, getSafeTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

const views = ["today", "my-time", "manager", "policies", "payroll"] as const;
type TimeAttendanceView = (typeof views)[number];

export default async function TimeAttendancePage({ searchParams }: { searchParams: Promise<{ view?: string; density?: string }> }) {
  const user = await requireCurrentUser();
  const query = await searchParams;
  const requestedView = query.view;
  const [captureState, managerReviewQueue, payrollReadiness, hardeningReadiness, model] = await Promise.all([
    getSafeTimeAttendanceCaptureState(user),
    getSafeTimeAttendanceManagerReviewQueue(user),
    getSafePayrollHandoffReadiness(user),
    Promise.resolve(evaluateTimeAttendanceHardeningPilotReadiness(user)),
    getTimeAttendanceConsoleModel(user)
  ]);

  const candidate = views.includes(requestedView as TimeAttendanceView)
    ? requestedView as TimeAttendanceView
    : "today";
  const activeView = (
    (candidate === "manager" && !model.permissions.manager) ||
    (candidate === "policies" && !model.permissions.policies) ||
    (candidate === "payroll" && !model.permissions.payroll)
  ) ? "today" : candidate;

  return <TimeAttendanceConsole activeView={activeView} captureState={captureState} density={query.density === "high" ? "high" : "calm"} hardeningReadiness={hardeningReadiness} managerReviewQueue={managerReviewQueue} model={model} payrollReadiness={payrollReadiness} />;
}
