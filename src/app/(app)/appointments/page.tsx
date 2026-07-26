import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceKey } from "@/server/auth/navigation";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";

type AppointmentsPageProps = {
  searchParams?: Promise<{
    appointment?: string;
    sourceTask?: string;
    view?: string;
    workspace?: string;
  }>;
};

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const [user, boardSettings, focusParams] = await Promise.all([
    requireCurrentUser(),
    getAppointmentBoardSettings().catch(() => null),
    searchParams
  ]);

  const advisorMode = getWorkspaceKey(user) === "ADVISOR" &&
    focusParams?.view !== "board" &&
    focusParams?.workspace !== "board";
  const showAdvisorReturn = getWorkspaceKey(user) === "ADVISOR";

  if (advisorMode) {
    const model = await getServiceAdvisorWorkspace(user);
    return <ServiceAdvisorHome model={JSON.parse(JSON.stringify(model))} />;
  }

  return (
    <AppointmentBoardLoader
      boardSettings={boardSettings}
      initialFocus={{
        appointmentNumber: focusParams?.appointment ?? null,
        sourceTaskId: focusParams?.sourceTask ?? null
      }}
      showAdvisorReturn={showAdvisorReturn}
    />
  );
}
