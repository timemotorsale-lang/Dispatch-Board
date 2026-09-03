import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { AppointmentConsoleNewAppointment, AppointmentConsoleTodayFlow } from "@/features/appointments/appointment-console-refinement";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { resolveWorkspacePreference, WORKSPACE_COOKIE_NAME } from "@/server/auth/workspace-preference";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";
import { readManagerWorkspaceContext } from "@/lib/manager-workspace-context";
import { getTaskReadModelById } from "@/server/services/task-read";

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
    customerReference?: string;
    vehicleReference?: string;
    reason?: string;
    title?: string;
    localDate?: string;
    startTime?: string;
    returnTo?: string;
  }>;
};

function safeRoute(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

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
  const showAdvisorReturn = !managerContext && workspaceKey === "ADVISOR";
  const sourceTask = focusParams?.sourceTask
    ? await getTaskReadModelById(user, focusParams.sourceTask).catch(() => null)
    : null;
  const newAppointmentMode = focusParams?.action === "new";
  const boardMode = focusParams?.view === "board" || focusParams?.workspace === "board";

  if ((focusParams?.launch === "advisor" || (workspaceKey === "ADVISOR" && !managerContext)) && !newAppointmentMode && !boardMode && !focusParams?.section) {
    const query = new URLSearchParams();
    if (focusParams?.inbox) query.set("inbox", focusParams.inbox);
    if (focusParams?.queue) query.set("queue", focusParams.queue);
    if (focusParams?.workspaceContext) query.set("workspaceContext", focusParams.workspaceContext);
    if (focusParams?.managerMode) query.set("managerMode", focusParams.managerMode);
    if (focusParams?.returnTo) query.set("returnTo", focusParams.returnTo);
    if (focusParams?.launch) query.set("launch", focusParams.launch);
    redirect(`/vehicles/advisor${query.size ? `?${query.toString()}` : ""}`);
  }
  if (newAppointmentMode) {
    return (
      <AppointmentConsoleNewAppointment
        initialContext={{
          customerReference: focusParams?.customerReference ?? sourceTask?.customerReference ?? "",
          localDate: focusParams?.localDate ?? "",
          reason: focusParams?.reason ?? sourceTask?.description ?? "",
          returnTo: safeRoute(focusParams?.returnTo) ?? (sourceTask ? `/tasks/${sourceTask.id}` : undefined),
          sourceTaskId: sourceTask?.id ?? focusParams?.sourceTask ?? "",
          sourceTaskTitle: sourceTask?.title ?? "",
          startTime: focusParams?.startTime ?? "",
          title: focusParams?.title ?? (sourceTask ? `Appointment for ${sourceTask.title}` : ""),
          vehicleReference: focusParams?.vehicleReference ?? sourceTask?.vehicleReference ?? ""
        }}
      />
    );
  }
  if (!boardMode) {
    return <AppointmentConsoleTodayFlow key={focusParams?.localDate} initialDate={focusParams?.localDate} section={focusParams?.section ?? "today"} />;
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
