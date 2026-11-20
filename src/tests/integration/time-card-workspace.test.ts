import { randomUUID } from "node:crypto";

import { expect, it } from "vitest";

it.skipIf(process.env.RUN_TIME_CARD_PREVIEW !== "1")("seeds a scoped time-card walkthrough with current and historical evidence", async () => {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (target.hostname !== "127.0.0.1" || !target.searchParams.get("schema")?.startsWith("time_card_it_")) {
    throw new Error("Use a dedicated local time-card test schema.");
  }
  const [{ prisma }, { hashPassword }, { getPersonalTimeCardPeriods }, { getTimeAttendanceConsoleModel }, { submitTimeCardAttestation }, { submitTimeCardCorrectionRequest }, { decideTimeCardCorrectionRequest }] = await Promise.all([
    import("@/server/db/client"), import("@/server/auth/password"), import("@/server/time-attendance/personal-periods"), import("@/server/time-attendance/console-read-model"), import("@/server/time-attendance/attestation-service"),
    import("@/server/time-attendance/correction-service"), import("@/server/time-attendance/manager-decision-service"),
  ]);
  const organization = { id: "org-time-motor-sales", code: "TIME-CARD-TEST", name: "Time Card Preview" };
  const organizationId = organization.id;
  const locationId = "loc-time-motor-sales-minneapolis";
  const timezone = "America/Chicago";
  const effectiveFrom = new Date("2026-01-01T00:00:00Z");
  await prisma.organization.upsert({ where: { id: organizationId }, create: organization, update: {} });
  await prisma.location.upsert({ where: { id: locationId }, create: { id: locationId, organizationId, code: "PREVIEW", name: "Time Card Preview", city: "Minneapolis", region: "MN", timezone }, update: {} });
  const passwordHash = await hashPassword("TimeCardTest123!");
  for (const [id, name, roleName] of [["time-preview-staff", "Alex Rivera", "Salesperson"], ["time-preview-manager", "Morgan Lee", "General Manager"]]) {
    const email = `${id}@example.test`;
    await prisma.user.upsert({ where: { id }, create: { id, name, email, passwordHash, isActive: true }, update: { name } });
    const role = await prisma.role.upsert({ where: { name: roleName }, create: { name: roleName }, update: {} });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: id, roleId: role.id } }, create: { userId: id, roleId: role.id }, update: {} });
  }
  const employee = { id: "time-preview-staff", name: "Alex Rivera", email: "time-preview-staff@example.test", isActive: true, roles: ["Salesperson"], duties: { direct: [], roleDefaults: [], all: [] } };
  const manager = { ...employee, id: "time-preview-manager", name: "Morgan Lee", email: "time-preview-manager@example.test", roles: ["General Manager"] };
  const policy = await prisma.timeAttendancePolicyProfile.upsert({
    where: { organizationId_code_version: { organizationId, code: "MN-HOURLY-60-MIN-UNPAID-MEAL", version: 1 } },
    create: { organizationId, locationId, code: "MN-HOURLY-60-MIN-UNPAID-MEAL", name: "Hourly staff · 60-minute meal", version: 1, status: "ACTIVE", effectiveFrom, timezone, workweekStartDay: "MONDAY", payBasis: "HOURLY", overtimeCoverage: "FEDERAL_AND_MINNESOTA", scheduledMealPolicy: { expectedMealMinutes: 60, paid: false }, breakPolicyVersionIds: [], payrollMapping: {}, sourceSnapshot: {} },
    update: { name: "Hourly staff · 60-minute meal" },
  });
  if (!await prisma.timeAttendancePolicyAssignment.count({ where: { staffUserId: employee.id, organizationId } })) {
    await prisma.timeAttendancePolicyAssignment.create({ data: { organizationId, locationId, staffUserId: employee.id, policyProfileId: policy.id, approvedByUserId: manager.id, approvalReason: "Synthetic walkthrough only", effectiveFrom } });
  }
  const date = "2026-11-03";
  const interval = { localDate: date, startAt: `${date}T14:00:00Z`, endAt: `${date}T22:00:00Z`, durationMinutes: 480 };
  const card = {
    organizationId, locationId, staffUserId: employee.id, policyProfileId: policy.id,
    periodStart: new Date("2026-11-02"), periodEnd: new Date("2026-11-08"), sourceEventChecksum: "sha256:" + "a".repeat(64), status: "LOCKED" as const,
    calculationSnapshot: { replay: { projection: { intervals: { attendance: [interval], meals: [{ ...interval, startAt: `${date}T18:00:00Z`, endAt: `${date}T18:30:00Z`, durationMinutes: 30 }], paidWork: [{ ...interval, endAt: `${date}T21:30:00Z`, durationMinutes: 450 }] } } } },
    exceptionSnapshot: [],
  };
  for (const version of [1, 2]) {
    const saved = await prisma.timeCard.upsert({
      where: { organizationId_staffUserId_periodStart_periodEnd_version: { organizationId, staffUserId: employee.id, periodStart: card.periodStart, periodEnd: card.periodEnd, version } },
      create: { ...card, version, status: version === 1 ? "EMPLOYEE_REVIEW" : "LOCKED", payrollReady: version === 2 },
      update: { sourceEventChecksum: card.sourceEventChecksum, payrollReady: version === 2 },
    });
    if (version === 2) {
      const args = { cardChecksum: saved.sourceEventChecksum, timeCardId: saved.id, timeCardVersion: version, decision: "ATTEST", idempotencyKey: "synthetic-closed-card-attempt" };
      await expect(submitTimeCardAttestation(employee, args)).rejects.toThrow(/closed or has a newer version/);
      expect(await prisma.timeCardAttestation.count({ where: { timeCardId: saved.id } })).toBe(0);
    }
  }
  const history = await getPersonalTimeCardPeriods(employee, "", "2026-11-02_2026-11-08");
  expect(history.periods.filter(period => period.key === "2026-11-02_2026-11-08")).toHaveLength(1);
  expect(history.selected).toMatchObject({ version: 2, status: "LOCKED", days: [{ date, span: 480, meal: 30, paid: 450 }] });
  expect((await getPersonalTimeCardPeriods(manager, "", "2026-11-02_2026-11-08")).selected).toBeNull();
  const atLocalEvening = await getTimeAttendanceConsoleModel(employee, { now: new Date("2026-11-09T02:30:00Z") });
  expect(atLocalEvening.employeeCard.timeCardVersion).toBe(2);
  expect(atLocalEvening.employeeCard.statusLabel).toBe("Locked");
  const priorPeriodRequest = await submitTimeCardCorrectionRequest(employee, {
    idempotencyKey: "synthetic-locked-period-correction", requestedChangeType: "MISSING_CLOCK_IN",
    requestedDate: date, requestedStartAt: `${date}T13:45:00Z`, employeeExplanation: "Synthetic prior period punch needs payroll review."
  });
  const decision = { requestId: priorPeriodRequest.request.id, managerReason: "Verified the synthetic prior period correction." };
  await decideTimeCardCorrectionRequest(manager, { ...decision, decision: "APPROVE", idempotencyKey: "synthetic-locked-correction-approve" });
  const before = await prisma.timeAttendanceEvent.count({ where: { organizationId, staffUserId: employee.id } });
  await expect(decideTimeCardCorrectionRequest(manager, { ...decision, decision: "APPLY", idempotencyKey: "synthetic-locked-correction-apply" })).rejects.toThrow(/reopen the locked or exported period/);
  expect(await prisma.timeAttendanceEvent.count({ where: { organizationId, staffUserId: employee.id } })).toBe(before);
  expect((await prisma.timeCardCorrectionRequest.findUniqueOrThrow({ where: { id: decision.requestId } })).status).toBe("APPROVED");

  const [{ createPayrollHandoffRepository }, { getTimeAttendanceManagerReviewQueue }, { decideTimeCard }] = await Promise.all([
    import("@/server/time-attendance/payroll-handoff-service"), import("@/server/time-attendance/manager-review"),
    import("@/server/time-attendance/card-approval-service")
  ]);
  const recoveryId = `time-card-recovery-${randomUUID()}`;
  const recoveryStaff = { ...employee, id: recoveryId, name: "Time Card Recovery Staff", email: `${recoveryId}@example.test` };
  await prisma.user.create({ data: { id: recoveryId, name: recoveryStaff.name, email: recoveryStaff.email, passwordHash, isActive: true } });
  await prisma.timeAttendancePolicyAssignment.create({ data: { organizationId, locationId, staffUserId: recoveryId, policyProfileId: policy.id, approvedByUserId: manager.id, approvalReason: "Synthetic rebuild recovery only", effectiveFrom } });
  const recoveryPeriod = { periodStart: new Date("2026-10-12"), periodEnd: new Date("2026-10-18") };
  await prisma.timeCard.create({ data: { ...card, ...recoveryPeriod, staffUserId: recoveryId, version: 1, status: "APPROVED", payrollReady: true } });
  const current = await prisma.timeCard.create({ data: { ...card, ...recoveryPeriod, staffUserId: recoveryId, version: 2, status: "APPROVED", payrollReady: true } });
  await prisma.timeCardAttestation.create({
    data: { organizationId, timeCardId: current.id, staffUserId: recoveryId, timeCardVersion: current.version,
      cardChecksum: current.sourceEventChecksum, statement: "I verified this synthetic card.", evidence: {} }
  });
  const correction = await submitTimeCardCorrectionRequest(recoveryStaff, {
    idempotencyKey: recoveryId, requestedChangeType: "MISSING_CLOCK_IN", requestedDate: "2026-10-13",
    requestedStartAt: "2026-10-13T14:00:00Z", employeeExplanation: "Synthetic missed punch for the card rebuild recovery test."
  });
  const recoveryDecision = { requestId: correction.request.id, managerReason: "Verified the synthetic missed punch for recovery." };
  await decideTimeCardCorrectionRequest(manager, { ...recoveryDecision, decision: "APPROVE", idempotencyKey: `${recoveryId}-approve` });
  const applyPayload = { ...recoveryDecision, decision: "APPLY", idempotencyKey: `${recoveryId}-apply` };
  const blocked = await decideTimeCardCorrectionRequest(manager, applyPayload, {
    projectionService: { project: async () => ({ state: "BLOCKED", cardId: null, cardVersion: null, checksum: null, payrollReady: false, reason: "Synthetic interruption." }) }
  });
  expect(blocked).toMatchObject({ request: { status: "APPLIED" }, projection: { state: "BLOCKED" } });
  const reviewQueue = () => getTimeAttendanceManagerReviewQueue(manager);
  expect((await reviewQueue()).items.find(item => item.id === recoveryDecision.requestId)).toMatchObject({ correctionRebuildPending: true });
  const staleApproval = {
    timeCardId: current.id, timeCardVersion: current.version, cardChecksum: current.sourceEventChecksum,
    decision: "APPROVE", reason: "Review from an older open tab."
  };
  await expect(decideTimeCard(manager, staleApproval)).rejects.toThrow(/Rebuild the card/);
  const payroll = createPayrollHandoffRepository();
  const payrollInput = { organizationId, locationId, ...recoveryPeriod, generatedAt: new Date() };
  const readiness = await payroll.readiness(payrollInput);
  expect(readiness.ready).toBe(false);
  expect(readiness.items).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CARD_NOT_READY", sourceId: current.id })]));
  expect((await payroll.preview(payrollInput)).lines.filter(line => line.staffUserId === recoveryId)).toHaveLength(0);
  const recovered = await decideTimeCardCorrectionRequest(manager, { ...applyPayload, idempotencyKey: `${recoveryId}-retry` });
  expect(recovered).toMatchObject({ duplicate: true, request: { status: "APPLIED" }, projection: { state: "CREATED" } });
  expect((await reviewQueue()).items.find(item => item.id === recoveryDecision.requestId)).toBeUndefined();
  await expect(decideTimeCard(manager, staleApproval)).rejects.toThrow(/newer card version/);
  expect(await prisma.timeAttendanceEvent.count({ where: { organizationId, staffUserId: recoveryId } })).toBe(1);
  expect(await prisma.enterpriseCommandLedger.count({ where: { organizationId, subjectId: recoveryDecision.requestId } })).toBe(1);
  expect(await decideTimeCardCorrectionRequest(manager, applyPayload)).toMatchObject({ duplicate: true, request: { status: "APPLIED" } });
}, 60_000);
