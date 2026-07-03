import { MvpRoutePage } from "@/components/ui/mvp-route-page";

export default function AppointmentsPage() {
  return (
    <MvpRoutePage
      description="Appointments in the MVP are handled as time-based tasks on the board, not as a separate scheduling subsystem. This page points the team toward the live workflow that exists today."
      eyebrow="Appointments"
      primaryAction={{ href: "/board", label: "Open today's board" }}
      secondaryAction={{ href: "/my-tasks", label: "Open My Tasks" }}
      sections={[
        {
          title: "Use due times as the appointment rhythm",
          description:
            "Managers can create time-specific tasks and staff can work from due-time ordering on the board and in My Tasks when appointments, pickups, or same-day follow-ups matter.",
          links: [
            { href: "/board", label: "Board schedule view", description: "Due-time ordering." },
            { href: "/tasks", label: "Task detail", description: "Single-task context." }
          ]
        },
        {
          title: "What is intentionally out of scope",
          description:
            "The MVP does not promise calendar syncing, booking workflows, or a full appointment ledger. It keeps scheduling lightweight and task-driven so daily operations remain simple."
        }
      ]}
      title="Appointments"
    />
  );
}
