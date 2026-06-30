import { MvpRoutePage } from "@/components/ui/mvp-route-page";

export default function VehiclesPage() {
  return (
    <MvpRoutePage
      description="Vehicle work is already part of the live MVP through board tasks, due times, and task detail references. This route now acts as a focused landing page instead of a dead-end placeholder."
      eyebrow="Vehicles"
      primaryAction={{ href: "/board", label: "Open dispatch board" }}
      secondaryAction={{ href: "/tasks", label: "Open tasks" }}
      sections={[
        {
          title: "Vehicle work already lives in the board",
          description:
            "Use vehicle references on board rows and task detail pages to coordinate recon, photos, listing prep, and sold-vehicle work without switching into a separate module.",
          links: [
            { href: "/board", label: "Board view", description: "Daily board operations." },
            { href: "/manager-review", label: "Manager review", description: "Approval queue." }
          ]
        },
        {
          title: "What this route means in the MVP",
          description:
            "The MVP does not maintain a separate vehicle record system yet. Instead, it keeps vehicle context close to the work itself so the team can move faster with fewer screens."
        }
      ]}
      title="Vehicles"
    />
  );
}
