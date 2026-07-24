import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendanceCaptureState, getTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

export default async function TimeAttendancePage() {
  const user = await requireCurrentUser();
  const [captureState, managerReviewQueue, model] = await Promise.all([
    getTimeAttendanceCaptureState(user),
    getTimeAttendanceManagerReviewQueue(user),
    Promise.resolve(getTimeAttendanceConsoleModel(user))
  ]);

  return <TimeAttendanceConsole captureState={captureState} managerReviewQueue={managerReviewQueue} model={model} />;
}
