import { MvpRoutePage } from "@/components/ui/mvp-route-page";

export default function StaffPage() {
  return (
    <MvpRoutePage
      description="The current MVP already supports staff-centered work through roles, assignments, My Tasks, and manager review. This route now summarizes where those live instead of stopping at a placeholder."
      eyebrow="Staff"
      primaryAction={{ href: "/my-tasks", label: "Open My Tasks" }}
      secondaryAction={{ href: "/board", label: "Open board" }}
      sections={[
        {
          title: "Day-to-day staff workflow is already live",
          description:
            "Assigned work, blockers, comments, ready-for-review handoff, and manager reassignment all flow through the board, task detail, and My Tasks surfaces today.",
          links: [
            { href: "/my-tasks", label: "My Tasks", description: "Staff daily view." },
            { href: "/manager-review", label: "Manager review", description: "Approval queue." }
          ]
        },
        {
          title: "Administration stays lightweight for now",
          description:
            "The MVP keeps staff modeling in the database and permission layer, but it does not yet expose a full people-management console in the shell."
        }
      ]}
      title="Staff"
    />
  );
}
