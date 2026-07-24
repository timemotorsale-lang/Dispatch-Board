import { prisma } from "../src/server/db/client";
import { updateVehicleOperationsFeature } from "../src/server/enterprise-command/service";

const TRIAL_FEATURES = [
  "DIAGNOSTIC_EVIDENCE",
  "DIAGNOSTIC_REASONING",
  "DIAGNOSTIC_PUBLISHING",
  "DIAGNOSTIC_KNOWLEDGE"
] as const;

const GENERAL_MANAGER_EMAIL = "morgan.manager@local.test";
const TECHNICIAN_EMAIL = "casey.mechanic@local.test";

async function main() {
  const action = process.argv[2] ?? "enable";

  if (!["enable", "disable"].includes(action)) {
    throw new Error("Usage: npm run diagnostics:trial -- enable|disable");
  }

  const users = await prisma.user.findMany({
    where: { email: { in: [GENERAL_MANAGER_EMAIL, TECHNICIAN_EMAIL] }, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      userRoles: { select: { role: { select: { name: true } } } }
    }
  });

  const generalManager = users.find((user) => user.email === GENERAL_MANAGER_EMAIL);
  const technician = users.find((user) => user.email === TECHNICIAN_EMAIL);

  if (!generalManager || !technician) {
    throw new Error("The configured Diagnostics trial manager and technician must both be active.");
  }

  const actor = {
    id: generalManager.id,
    name: generalManager.name,
    email: generalManager.email,
    isActive: generalManager.isActive,
    roles: generalManager.userRoles.map(({ role }) => role.name),
    duties: { direct: [], roleDefaults: [], all: [] }
  };

  if (!actor.roles.includes("General Manager")) {
    throw new Error("The Diagnostics trial actor must retain the General Manager role.");
  }

  const flags = await prisma.vehicleOperationsFeatureFlag.findMany({
    where: {
      organizationId: "org-time-motor-sales",
      locationId: null,
      code: { in: [...TRIAL_FEATURES, "DIAGNOSTIC_AI"] }
    }
  });

  const aiFlag = flags.find((flag) => flag.code === "DIAGNOSTIC_AI");
  if (!aiFlag) throw new Error("DIAGNOSTIC_AI rollout control was not found.");

  if (aiFlag.mode !== "OFF" || aiFlag.rolloutPercent !== 0) {
    await updateVehicleOperationsFeature(actor, {
      code: aiFlag.code,
      mode: "OFF",
      rolloutPercent: 0,
      allowedUserIds: [],
      expectedVersion: aiFlag.version,
      reason: "Keep diagnostic AI withheld throughout the controlled console trial.",
      targetAt: null
    });
  }

  const mode = action === "enable" ? "PILOT" : "OFF";
  const allowedUserIds = action === "enable" ? [generalManager.id, technician.id] : [];

  for (const code of TRIAL_FEATURES) {
    const flag = flags.find((candidate) => candidate.code === code);
    if (!flag) throw new Error(`${code} rollout control was not found.`);
    const currentAllowed = Array.isArray(flag.allowedUserIds)
      ? flag.allowedUserIds.filter((value): value is string => typeof value === "string").sort()
      : [];
    const desiredAllowed = [...allowedUserIds].sort();
    const alreadyConfigured =
      flag.mode === mode &&
      flag.rolloutPercent === 0 &&
      JSON.stringify(currentAllowed) === JSON.stringify(desiredAllowed);
    if (alreadyConfigured) continue;

    await updateVehicleOperationsFeature(actor, {
      code,
      mode,
      rolloutPercent: 0,
      allowedUserIds,
      expectedVersion: flag.version,
      reason: action === "enable"
        ? `Enable ${code} for the named Diagnostics refinement trial cohort only.`
        : `Close ${code} after the controlled Diagnostics refinement trial.`,
      targetAt: action === "enable" ? new Date().toISOString() : null
    });
  }

  const result = await prisma.vehicleOperationsFeatureFlag.findMany({
    where: {
      organizationId: "org-time-motor-sales",
      locationId: null,
      code: { in: [...TRIAL_FEATURES, "DIAGNOSTIC_AI"] }
    },
    orderBy: { code: "asc" },
    select: { code: true, mode: true, rolloutPercent: true, allowedUserIds: true, version: true }
  });

  console.table(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
