import { PlaceholderRoutePage } from "@/components/ui/placeholder-route-page";

export default function ActivityPage() {
  return (
    <PlaceholderRoutePage
      description="The app shell now includes a first-class activity destination, even though the event-backed feed itself is still scheduled for a later implementation slice."
      eyebrow="Activity"
      note="The board's right rail will reserve space for activity visibility without pretending live event data already exists. This page keeps the navigation complete in the meantime."
      title="Activity Feed"
    />
  );
}
