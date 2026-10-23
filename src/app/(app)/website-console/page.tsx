import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canOpenWebsiteConsole } from "@/features/website-console/policy";
import { getWebsiteDestinations } from "@/features/website-console/destinations";
import { resolveWebsiteSection } from "@/features/website-console/navigation";
import { WebsiteConsole } from "@/features/website-console/website-console";

export const dynamic = "force-dynamic";

export default async function WebsiteConsolePage({ searchParams }: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const user = await requireCurrentUser("/website-console");
  if (!canOpenWebsiteConsole(user)) notFound();
  const params = await searchParams;
  const section = resolveWebsiteSection(typeof params.section === "string" ? params.section : undefined);
  return <WebsiteConsole section={section} destinations={getWebsiteDestinations(process.env)} />;
}
