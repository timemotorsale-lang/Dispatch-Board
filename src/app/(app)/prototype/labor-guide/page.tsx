import DiagnosticsLaborGuidePage from "@/app/(app)/diagnostics/labor-guide/page";
import type { PageProps } from "@/app/(app)/diagnostics/labor-guide/render-page";

export const metadata = { title: "Labor Guide | Dispatch Board" };

// Preserve old bookmarks and transferred estimates in the visual guide.
export default async function SimplifiedLaborGuidePrototypePage(props: PageProps) {
  return DiagnosticsLaborGuidePage(props);
}
