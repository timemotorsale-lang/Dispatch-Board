import { redirect } from "next/navigation";

import { hasCollectionsPermission } from "@/features/collections/config/permissions";
import { requireCurrentUser } from "@/server/auth/current-user";

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Entry point used by the Collections workspace menu on the dispatch board.
 * When the Collections module is on for this person, it opens the module; otherwise it falls
 * back to the older board view of Collections tasks, so the menu works either way.
 */
export default async function CollectionsGoPage({ searchParams }: { searchParams?: Search }) {
  const user = await requireCurrentUser();
  const to = ((await searchParams) ?? {}).to;
  if (!hasCollectionsPermission(user, "VIEW")) redirect("/tasks?department=COLLECTIONS");
  redirect(to === "home" ? "/collections" : "/collections/queue");
}
