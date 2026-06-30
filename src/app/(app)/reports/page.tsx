import { MvpRoutePage } from "@/components/ui/mvp-route-page";

export default function ReportsPage() {
  return (
    <MvpRoutePage
      description="Operational visibility already exists in the MVP through the activity feed, board counts, and review queue metrics. This page now points to those live readouts instead of a placeholder."
      eyebrow="Reports"
      primaryAction={{ href: "/activity", label: "Open activity feed" }}
      secondaryAction={{ href: "/board", label: "Open board" }}
      sections={[
        {
          title: "Use live operational signals today",
          description:
            "Board summaries, status counts, due-time grouping, and activity events provide the current MVP reporting story for dispatch reliability and team awareness.",
          links: [
            { href: "/activity", label: "Activity feed", description: "Event-backed visibility." },
            { href: "/manager-review", label: "Review queue", description: "Approval backlog." }
          ]
        },
        {
          title: "What comes later",
          description:
            "The MVP does not yet include exported reports, historical trend analysis, or deeper business intelligence. Those can expand later without changing the core operating workflow."
        }
      ]}
      title="Reports & Insights"
    />
  );
}
