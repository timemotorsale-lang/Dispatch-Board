import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

import { rankNextBestWork, type OrchestrationCandidate } from "./orchestration-domain";

function items(value: unknown) {
  const object = value && typeof value === "object" && !Array.isArray(value)
    ? value as { items?: unknown[] }
    : {};

  return (object.items ?? []).flatMap((entry) => {
    const item = entry && typeof entry === "object" && !Array.isArray(entry)
      ? entry as Record<string, unknown>
      : null;

    return item && typeof item.code === "string"
      ? [{ code: item.code, required: item.required !== false, satisfied: item.satisfied === true }]
      : [];
  });
}

type InventoryExecutionClient = Partial<
  Pick<typeof prisma, "inventoryWorkPacket" | "inventoryWorkSession">
>;

type OrchestrationDependencies = {
  activeSessionReader?: () => Promise<number>;
  client?: InventoryExecutionClient;
  now?: () => Date;
  organizationId?: string;
  reader?: () => Promise<unknown>;
};

function unavailableProjection(now: Date, reason: string) {
  return {
    status: "UNAVAILABLE" as const,
    generatedAt: now.toISOString(),
    mode: "ADVISORY" as const,
    policy: "No recommendation is produced without its authoritative work source.",
    ranked: [],
    reason
  };
}

export async function getInventoryOrchestration(
  actor: AuthenticatedUser | null,
  input: { inventoryUnitId?: string | null } = {},
  dependencies: OrchestrationDependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const manager = isManager(user);
  const now = (dependencies.now ?? (() => new Date()))();
  const organizationId = dependencies.organizationId ?? INITIAL_ORGANIZATION.id;
  const client = dependencies.client ?? (prisma as InventoryExecutionClient);
  const packetReader = dependencies.reader ?? (client.inventoryWorkPacket
    ? () => client.inventoryWorkPacket!.findMany({
        where: {
          organizationId,
          state: { in: ["PLANNED", "STAGED"] },
          ...(input.inventoryUnitId ? { inventoryUnitId: input.inventoryUnitId } : {}),
          ...(manager ? {} : { task: { assignedUserId: user.id } })
        },
        include: { task: { select: { id: true, title: true, assignedUserId: true } } },
        take: 100,
        orderBy: [{ targetAt: "asc" }, { createdAt: "asc" }]
      })
    : null);
  const sessionReader = dependencies.activeSessionReader ?? (client.inventoryWorkSession
    ? () => client.inventoryWorkSession!.count({
        where: {
          organizationId,
          userId: user.id,
          status: { in: ["ACTIVE", "PAUSED"] }
        }
      })
    : null);

  if (!packetReader || (!manager && !sessionReader)) {
    return unavailableProjection(
      now,
      "Inventory execution recommendations are temporarily unavailable while the data client is updated. The workflow launcher remains available."
    );
  }

  try {
    const [raw, actorOpenSessions] = await Promise.all([
      packetReader(),
      manager ? Promise.resolve(0) : sessionReader!()
    ]);
    const rows = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
    const actorHasOpenWork = actorOpenSessions > 0;
    const candidates: OrchestrationCandidate[] = rows.map((row) => {
      const task = row.task as { id: string; title: string; assignedUserId: string };

      return {
        id: String(row.id),
        vehicleId: String(row.vehicleId),
        taskId: task.id,
        title: task.title,
        state: String(row.state),
        urgency: String(row.urgency) as OrchestrationCandidate["urgency"],
        readiness: String(row.readiness),
        readinessItems: items(row.readinessSnapshot),
        dependencyItems: items(row.dependencySnapshot),
        targetAt: new Date(String(row.targetAt)),
        createdAt: new Date(String(row.createdAt)),
        dataState: "FRESH",
        assignedUserId: task.assignedUserId,
        actorHasAuthority: manager || task.assignedUserId === user.id,
        hasCompetingCurrentWork: actorHasOpenWork
      };
    });

    return {
      status: "CONNECTED" as const,
      generatedAt: now.toISOString(),
      mode: "ADVISORY" as const,
      policy: "Manager controls urgency and eligibility; the server rechecks every command.",
      ranked: rankNextBestWork(candidates, now)
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return unavailableProjection(
        now,
        "Inventory Work Packet migration is not applied in this environment."
      );
    }

    throw error;
  }
}

export type InventoryOrchestrationProjection = Awaited<ReturnType<typeof getInventoryOrchestration>>;
