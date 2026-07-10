import { AppointmentBoardShell } from "@/features/appointments/appointment-board-shell";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";

type AppointmentsPageProps = {
  searchParams?: Promise<{
    appointment?: string;
    sourceTask?: string;
  }>;
};

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const boardSettings = await getAppointmentBoardSettings().catch(() => null);
  const focusParams = await searchParams;

  return (
    <AppointmentBoardShell
      boardSettings={boardSettings}
      initialFocus={{
        appointmentNumber: focusParams?.appointment ?? null,
        sourceTaskId: focusParams?.sourceTask ?? null
      }}
    />
  );
}
