import { MvpRoutePage } from "@/components/ui/mvp-route-page";

export default function CustomersPage() {
  return (
    <MvpRoutePage
      description="Customer context is already part of the live dispatch workflow through task references and comments. This route now explains that scope clearly instead of presenting a not-implemented page."
      eyebrow="Customers"
      primaryAction={{ href: "/board", label: "Open board" }}
      secondaryAction={{ href: "/activity", label: "Open activity feed" }}
      sections={[
        {
          title: "Customer context stays attached to the work",
          description:
            "Use customer reference text, comments, and assignment history on tasks when the team needs quick customer-aware coordination without leaving the board workflow.",
          links: [
            { href: "/tasks", label: "Task routes", description: "Task detail and updates." },
            { href: "/activity", label: "Activity feed", description: "Who changed what." }
          ]
        },
        {
          title: "Why there is no full customer module yet",
          description:
            "The MVP avoids becoming a CRM replacement. It keeps customer data lightweight so dispatch coordination remains the priority."
        }
      ]}
      title="Customers"
    />
  );
}
