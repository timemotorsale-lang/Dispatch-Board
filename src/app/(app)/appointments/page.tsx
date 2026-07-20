import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";

type AppointmentsPageProps = {
  searchParams?: Promise<{
    appointment?: string;
    sourceTask?: string;
  }>;
};

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const [boardSettings, focusParams] = await Promise.all([
    getAppointmentBoardSettings().catch(() => null),
    searchParams
  ]);

  return (
    <AppointmentBoardLoader
      boardSettings={boardSettings}
      initialFocus={{
        appointmentNumber: focusParams?.appointment ?? null,
        sourceTaskId: focusParams?.sourceTask ?? null
      }}
    />
  );
}
