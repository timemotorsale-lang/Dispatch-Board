import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function InventoryManagerWorkspacePage() {
  await requireCurrentUser();
  redirect("/vehicles");
}
