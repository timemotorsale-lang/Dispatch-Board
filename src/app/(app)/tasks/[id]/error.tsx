"use client";

import { ErrorStateCard } from "@/components/ui/state-card";

export default function TaskDetailError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-stack board-page task-detail-page">
      <ErrorStateCard
        actions={[
          { label: "Try task again", onClick: reset },
          { href: "/my-tasks", label: "Back to My Tasks", tone: "secondary" }
        ]}
        eyebrow="Task unavailable"
        message={`${error.message || "Unable to load this task right now."} If the issue continues, return to the board and reopen the task.`}
        title="Couldn't load this task"
      />
    </section>
  );
}
