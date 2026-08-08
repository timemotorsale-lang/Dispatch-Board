import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { AppointmentConsoleNewAppointment, AppointmentConsoleTodayFlow } from "@/features/appointments/appointment-console-refinement";
import { ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import { cookies } from "next/headers";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { resolveWorkspacePreference, WORKSPACE_COOKIE_NAME } from "@/server/auth/workspace-preference";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";
import { readManagerWorkspaceContext } from "@/lib/manager-workspace-context";

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
    workspaceContext?: string;
    managerMode?: string;
    launch?: string;
    returnTo?: string;
  }>;
};

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const [user, boardSettings, focusParams, cookieStore] = await Promise.all([
    requireCurrentUser(),
    getAppointmentBoardSettings().catch(() => null),
    searchParams,
    cookies()
  ]);

  const permittedWorkspaces = getPermittedWorkspaces(user);
  const preferredWorkspace = resolveWorkspacePreference(user, cookieStore.get(WORKSPACE_COOKIE_NAME)?.value);
  const workspaceKey = getWorkspaceKey(user, preferredWorkspace);
  const managerContext = permittedWorkspaces.some((workspace) => workspace.key === "MANAGEMENT")
    ? readManagerWorkspaceContext(new URLSearchParams({
        workspaceContext: focusParams?.workspaceContext ?? "",
        managerMode: focusParams?.managerMode ?? ""
      }))
    : null;
  const canOpenAdvisorWorkspace = workspaceKey === "ADVISOR" || Boolean(managerContext);
  const containedAdvisorLaunch = Boolean(managerContext) && focusParams?.launch === "advisor";
  const advisorMode = canOpenAdvisorWorkspace &&
    focusParams?.view !== "board" &&
    focusParams?.workspace !== "board" &&
    (workspaceKey === "ADVISOR" || containedAdvisorLaunch);
  const showAdvisorReturn = !managerContext && workspaceKey === "ADVISOR";
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
