import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function RepairWorkbenchBookmark({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentUser();
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/vehicles/repair-workbench${query.size ? `?${query}` : ""}`);
}
