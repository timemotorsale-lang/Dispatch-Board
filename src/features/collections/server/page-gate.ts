import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/current-user";

import { hasCollectionsPermission, type CollectionsPermission } from "../config/permissions";

/** For pages: if the module is OFF or the user lacks permission, the page doesn't exist (404). */
export async function requireCollectionsPage(permission: CollectionsPermission = "VIEW") {
  const user = await requireCurrentUser();
  if (!hasCollectionsPermission(user, permission)) notFound();
  return user;
}
