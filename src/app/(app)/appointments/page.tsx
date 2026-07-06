import { AppointmentBoardShell } from "@/features/appointments/appointment-board-shell";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";

export default async function AppointmentsPage() {
  const boardSettings = await getAppointmentBoardSettings().catch(() => null);

  return <AppointmentBoardShell boardSettings={boardSettings} />;
}
