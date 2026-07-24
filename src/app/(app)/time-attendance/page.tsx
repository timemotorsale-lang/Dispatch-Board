import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendanceCaptureState } from "@/server/time-attendance";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

export default async function TimeAttendancePage() {
  const user = await requireCurrentUser();
  const [captureState, model] = await Promise.all([
    getTimeAttendanceCaptureState(user),
    Promise.resolve(getTimeAttendanceConsoleModel(user))
  ]);

  return <TimeAttendanceConsole captureState={captureState} model={model} />;
}
