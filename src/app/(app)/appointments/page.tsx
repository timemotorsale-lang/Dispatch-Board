import { AppointmentBoardLoader } from "@/features/appointments/appointment-board-loader";
import { AppointmentConsoleNewAppointment, AppointmentConsoleTodayFlow } from "@/features/appointments/appointment-console-refinement";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { resolveWorkspacePreference, WORKSPACE_COOKIE_NAME } from "@/server/auth/workspace-preference";
import { getAppointmentBoardSettings } from "@/server/services/appointment-admin-settings";
import { readManagerWorkspaceContext } from "@/lib/manager-workspace-context";
import { getTaskReadModelById } from "@/server/services/task-read";
import { validFlowDate } from "@/features/advisor/workbook-flow-dates";
import { canUseStaffCalendar } from "@/server/policies/access";

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
    crmCustomerId?: string;
    vehicleReference?: string;
    reason?: string;
    title?: string;
    localDate?: string;
    durationMinutes?: string;
    purpose?: string;
    q?: string;
    advanced?: string;
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

  if (!canUseStaffCalendar(user)) return <p role="alert">Calendar access is restricted for your account. Contact the General Manager.</p>;
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
  const boardMode = focusParams?.view === "board" || focusParams?.workspace === "board";
  const calendarMode = focusParams?.view === "calendar" ||
    (!boardMode && (focusParams?.action === "new" || Boolean(focusParams?.sourceTask)));
  const localDate = focusParams?.localDate ?? "";

  if ((focusParams?.launch === "advisor" || (workspaceKey === "ADVISOR" && !managerContext)) && !calendarMode && !boardMode && !focusParams?.section) {
    const query = new URLSearchParams();
    if (focusParams?.inbox) query.set("inbox", focusParams.inbox);
    if (focusParams?.queue) query.set("queue", focusParams.queue);
    if (focusParams?.workspaceContext) query.set("workspaceContext", focusParams.workspaceContext);
    if (focusParams?.managerMode) query.set("managerMode", focusParams.managerMode);
    if (focusParams?.returnTo) query.set("returnTo", focusParams.returnTo);
    if (focusParams?.launch) query.set("launch", focusParams.launch);
    redirect(`/vehicles/advisor${query.size ? `?${query.toString()}` : ""}`);
  }
  if (calendarMode) {
    return (
      <>
      <Link className="pill pill-secondary" href={`/board/repair-priorities${validFlowDate(localDate) ? `?date=${localDate}` : ""}`}>Repair Priorities</Link>
      <AppointmentConsoleNewAppointment
        key={JSON.stringify([focusParams?.sourceTask, focusParams?.crmCustomerId, focusParams?.customerReference, focusParams?.vehicleReference, focusParams?.returnTo, localDate, focusParams?.startTime, focusParams?.durationMinutes, focusParams?.purpose, focusParams?.reason, focusParams?.title, focusParams?.q, focusParams?.advanced])}
        initialFullCalendar
        initialContext={{
          crmCustomerId: focusParams?.crmCustomerId,
          customerReference: focusParams?.customerReference ?? sourceTask?.customerReference ?? "",
          localDate: focusParams?.localDate ?? "",
          durationMinutes: Number(focusParams?.durationMinutes),
          purposeCode: focusParams?.purpose === "repair" ? "SERVICE_REPAIR" : undefined,
          calendarQuery: typeof focusParams?.q === "string" ? focusParams.q.slice(0, 100) : undefined,
          advancedCalendarSearch: focusParams?.advanced === "1",
          viewerName: user.name,
          reason: focusParams?.reason ?? sourceTask?.description ?? "",
          returnTo: safeRoute(focusParams?.returnTo) ?? (sourceTask ? `/tasks/${sourceTask.id}` : undefined),
          sourceTaskId: sourceTask?.id ?? focusParams?.sourceTask ?? "",
          sourceTaskTitle: sourceTask?.title ?? "",
          startTime: focusParams?.startTime ?? "",
          title: focusParams?.title ?? (sourceTask ? `Appointment for ${sourceTask.title}` : ""),
          vehicleReference: focusParams?.vehicleReference ?? sourceTask?.vehicleReference ?? ""
        }}
      />
      </>
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
        sourceTaskId: focusParams?.sourceTask ?? null,
        localDate: validFlowDate(localDate) ? localDate : null
      }}
      showAdvisorReturn={showAdvisorReturn}
    />
  );
}
