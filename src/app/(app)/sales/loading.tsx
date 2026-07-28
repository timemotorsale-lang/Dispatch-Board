import { LoadingStateCard } from "@/components/ui/state-card";

export default function SalesConsoleLoading() {
  return (
    <div className="page-shell">
      <LoadingStateCard
        eyebrow="Sales Console"
        message="Preparing the ranked work queue, deal desk, inventory intelligence, and manager command center."
        title="Opening Sales Console"
      />
    </div>
  );
}
