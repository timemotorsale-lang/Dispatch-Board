import { createPrismaAuthStore, type AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { evaluateFrontlineEscalations } from "./service";

type Dependencies = { actorEmail?: string | null; evaluate?: (actor: AuthenticatedUser) => Promise<unknown>; loadActor?: (email: string) => Promise<AuthenticatedUser | null> };
export async function evaluateFrontlineEscalationsForSystem(input: Dependencies = {}) {
  const email = input.actorEmail === undefined
    ? process.env.INVENTORY_AUTOMATION_ACTOR_EMAIL?.trim()
    : input.actorEmail?.trim();
  if (!email) throw new Error("INVENTORY_AUTOMATION_ACTOR_EMAIL is not configured.");
  const loadActor = input.loadActor ?? (async (value) => createPrismaAuthStore(prisma).findUserByEmail(value));
  const actor = await loadActor(email);
  if (!actor?.isActive || !actor.roles.some((role) => ["General Manager", "Inventory Manager"].includes(role))) {
    throw new Error("Configured Inventory automation actor must be an active Inventory Manager or General Manager.");
  }
  return (input.evaluate ?? ((value) => evaluateFrontlineEscalations(value)))(actor);
}
