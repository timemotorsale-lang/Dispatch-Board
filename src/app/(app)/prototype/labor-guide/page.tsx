import { renderLaborGuidePage, type PageProps } from "@/app/(app)/diagnostics/labor-guide/render-page";

export const metadata = { title: "Official Estimate Worksheet | Dispatch Board" };

export default async function SimplifiedLaborGuidePrototypePage(props: PageProps) {
  return renderLaborGuidePage(props, "new");
}
