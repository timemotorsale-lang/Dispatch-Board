import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isTechnicianOnlyUser } from "@/server/auth/navigation";

export default async function ShopReconPage({ searchParams }: { searchParams?: Promise<{ blocker?: string; returnTo?: string; view?: string }> }) {
  const user = await requireCurrentUser();
  if (isTechnicianOnlyUser(user)) redirect("/my-tasks");
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  if (params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//")) query.set("returnTo", params.returnTo);
  if (params.blocker) query.set("legacyBlocker", params.blocker);
  if (params.view) query.set("legacyView", params.view);
  redirect(`/vehicles/recon-repair-advisor${query.size ? `?${query}` : ""}`);
}
