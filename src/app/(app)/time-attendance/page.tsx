import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

export default async function TimeAttendancePage() {
  const user = await requireCurrentUser();
  const model = getTimeAttendanceConsoleModel(user);

  return <TimeAttendanceConsole model={model} />;
}
