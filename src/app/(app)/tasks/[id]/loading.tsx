import { LoadingStateCard } from "@/components/ui/state-card";

export default function LoadingTaskDetailPage() {
  return (
    <section className="page-stack board-page task-detail-page">
      <LoadingStateCard
        eyebrow="Task detail"
        message="Preparing the task detail view and latest updates."
        title="Loading task"
      />
    </section>
  );
}
