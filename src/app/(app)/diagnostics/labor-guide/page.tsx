import { redirect } from "next/navigation";
import { renderLaborGuidePage, type PageProps } from "./render-page";

export default async function DiagnosticsLaborGuidePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  if (first(params.guide) !== "legacy" && (first(params.guide) === "new" || first(params.experience) === "explorer" || first(params.importExplorer) === "1")) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const selected = first(value);
      if (key !== "guide" && key !== "experience" && selected !== undefined) query.set(key, selected);
    }
    const destination = first(params.importExplorer) === "1" ? "/prototype/labor-guide" : "/prototype/repair-explorer";
    redirect(`${destination}${query.size ? `?${query}` : ""}`);
  }
  return renderLaborGuidePage({ searchParams: Promise.resolve(params) }, "legacy");
}

