import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { AppointmentConsoleNewAppointment, AppointmentConsoleTodayFlow } from "@/features/appointments/appointment-console-refinement";
import { ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";

type AppointmentsPageProps = {
  searchParams?: Promise<{
    appointment?: string;
    action?: string;
    inbox?: string;
    section?: string;
    sourceTask?: string;
    queue?: string;
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

  const workspaceKey = getWorkspaceKey(user);
  const canOpenAdvisorWorkspace = workspaceKey === "ADVISOR" ||
    getPermittedWorkspaces(user).some((workspace) => workspace.key === "OPERATIONS_COORDINATOR");
  const advisorMode = canOpenAdvisorWorkspace &&
    focusParams?.view !== "board" &&
    focusParams?.workspace !== "board" &&
    (workspaceKey === "ADVISOR" || focusParams?.workspace === "advisor");
  const showAdvisorReturn = workspaceKey === "ADVISOR" || focusParams?.workspace === "advisor";
  const newAppointmentMode = focusParams?.action === "new";
  const boardMode = focusParams?.view === "board" || focusParams?.workspace === "board";

  if (advisorMode) {
    const model = await getServiceAdvisorWorkspace(user);
    return <ServiceAdvisorHome initialFilter={focusParams?.queue === "authorization" ? "AUTHORIZATION" : "ATTENTION"} initialSection={focusParams?.inbox ? "INBOX" : "WORK"} model={JSON.parse(JSON.stringify(model))} />;
  }
  if (newAppointmentMode) {
    return <AppointmentConsoleNewAppointment />;
  }
  if (!boardMode) {
    return <AppointmentConsoleTodayFlow section={focusParams?.section ?? "today"} />;
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
