import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { evaluateTimeAttendanceHardeningPilotReadiness, getSafePayrollHandoffReadiness, getSafeTimeAttendanceCaptureState, getSafeTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

export default async function TimeAttendancePage() {
  const user = await requireCurrentUser();
  const [captureState, managerReviewQueue, payrollReadiness, hardeningReadiness, model] = await Promise.all([
    getSafeTimeAttendanceCaptureState(user),
    getSafeTimeAttendanceManagerReviewQueue(user),
    getSafePayrollHandoffReadiness(user),
    Promise.resolve(evaluateTimeAttendanceHardeningPilotReadiness(user)),
    Promise.resolve(getTimeAttendanceConsoleModel(user))
  ]);

  return <TimeAttendanceConsole captureState={captureState} hardeningReadiness={hardeningReadiness} managerReviewQueue={managerReviewQueue} model={model} payrollReadiness={payrollReadiness} />;
}
