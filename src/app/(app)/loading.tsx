import { LoadingStateCard } from "@/components/ui/state-card";

export default function LoadingConsolePage() {
  return (
    <section className="console-route-loading" aria-label="Loading console">
      <div aria-hidden="true" className="console-route-loading-summary">
        <span />
        <span />
        <span />
      </div>
      <LoadingStateCard
        eyebrow="Opening workspace"
        message="Loading the selected console and its current operating data."
        title="Preparing console"
      />
    </section>
  );
}
