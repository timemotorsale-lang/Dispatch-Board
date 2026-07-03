import { EmptyStateCard } from "@/components/ui/state-card";

export default function TaskNotFound() {
  return (
    <section className="page-stack board-page task-detail-page">
      <EmptyStateCard
        actions={[
          { href: "/my-tasks", label: "Back to My Tasks", tone: "secondary" },
          { href: "/board", label: "Open board" }
        ]}
        eyebrow="Task unavailable"
        message="This task may have been removed, reassigned, or never existed for your current board."
        title="Task not found"
      />
    </section>
  );
}
