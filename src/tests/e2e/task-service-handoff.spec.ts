import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";

async function signIn(page: Page, email: string) {
  const response = await page.request.post("/api/auth/login", { data: { email, password: "dispatch123!" } });
  expect(response.ok()).toBe(true);
}

test("Service accepts a legacy task once and can explicitly link a second handoff to the same visit", async ({ page, browser }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const databaseSchema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!databaseSchema?.startsWith("dispatch_board_e2e_")) throw new Error("Service handoff needs an isolated browser test schema.");
  const suffix = randomUUID().slice(0, 8);
  const concern = "Door locks do not engage.\nPush start is intermittent.\nFuel cap is reported missing.";
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  const advisor = await prisma.user.findUniqueOrThrow({ where: { email: "alex.advisor@local.test" } });
  const customer = await prisma.customer.create({ data: {
    organizationId: location.organizationId, displayName: `Synthetic service customer ${suffix}`, customerNumber: `SH-${suffix}`
  } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: location.organizationId, vehicleNumber: `SH-${suffix}`, year: 2021, make: "Kia", model: "Sorento",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated browser fixture", vinValidationSource: "SYNTHETIC_E2E"
  } });
  const date = new Date(new Date().toISOString().slice(0, 10));
  const boardDay = await prisma.boardDay.upsert({ where: { date }, update: {}, create: { date } });
  const taskData = {
    boardDayId: boardDay.id, assignedUserId: manager.id, createdByUserId: manager.id, description: concern,
    sourceType: "MANAGER" as const, workflowArea: "GENERAL_MANAGER" as const,
    status: "IN_PROGRESS" as const, requiresManagerApproval: true, dueAt: new Date()
  };
  const task = await prisma.task.create({ data: { ...taskData, title: `Synthetic legacy repair complaint ${suffix}` } });
  const sourcePath = `/tasks/${task.id}`;
  const handoffEndpoint = `/api/tasks/${task.id}/service-handoff`;
  await signIn(page, manager.email);
  const advisorContext = await browser.newContext();
  const staffContext = await browser.newContext();
  try {
    const service = await advisorContext.newPage();
    service.setDefaultTimeout(15_000);
    const staff = await staffContext.newPage();
    await Promise.all([signIn(service, advisor.email), signIn(staff, "pat.parts@local.test")]);
    await page.goto(sourcePath);
    await page.getByRole("combobox", { name: "Open task tool" }).selectOption("serviceHandoff");
    const requestPanel = page.getByRole("region", { name: "Service handoff" });
    await expect(requestPanel.getByRole("textbox", { name: "Reported concerns and customer promises" })).toHaveValue(concern);
    await requestPanel.getByRole("combobox", { name: "Receiving Service advisor" }).selectOption(advisor.id);
    await requestPanel.getByRole("button", { name: "Send to Service" }).click();
    await expect(requestPanel.getByText("Awaiting Service check-in")).toBeVisible();
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    const pendingRequest = await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: task.id } });
    expect((await staff.request.post(handoffEndpoint, { data: { action: "cancel", requestToken: pendingRequest.requestToken } })).status()).toBe(403);
    expect((await page.request.post(handoffEndpoint, { data: { action: "cancel", requestToken: randomUUID() } })).status()).toBe(409);
    const prematureCompletion = await page.request.patch(`${sourcePath.replace("/tasks/", "/api/tasks/")}/status`, {
      data: { status: "COMPLETED" }
    });
    expect(prematureCompletion.status()).toBe(409);
    expect((await prematureCompletion.json()).error).toContain("Service handoff is pending");
    await expect(prisma.task.update({ where: { id: task.id }, data: { status: "COMPLETED" } })).rejects.toThrow("Service handoff is pending");

    await service.goto("/vehicles/repair-workbench");
    await service.getByRole("region", { name: "Pending Service handoffs" }).getByRole("link", { name: task.title }).click();
    await expect(service.getByRole("heading", { name: "Check In Vehicle" })).toBeVisible();
    await expect(service.getByRole("textbox", { name: /What is the customer experiencing/ })).toHaveValue(concern);
    const handoff = await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: task.id } });
    const arrivedAt = new Date().toISOString();
    const identity = { arrivedAt, customerId: customer.id, vehicleId: vehicle.id, locationId: location.id };
    const readinessResponse = await service.request.post("/api/service-intake/readiness", { data: identity });
    expect(readinessResponse.ok(), await readinessResponse.text()).toBe(true);
    const readiness = (await readinessResponse.json()).readiness;
    const intake = {
      ...identity, sourceTaskId: task.id, requestToken: handoff.requestToken, concernSummary: concern,
      consentStatus: "PENDING", intakeSource: "WALK_IN", keysReceivedCount: 1,
      nextAction: "Review reported concerns and verify any warranty coverage.",
      ownerUserId: advisor.id, operatingState: "ACTIVE", readinessSnapshotId: readiness.snapshotId,
      reason: "Accept the reported concerns into Service at check-in.",
      targetAt: new Date(Date.now() + 3_600_000).toISOString(), transportMode: "DROP_OFF"
    };
    const createOrder = (actor: Page, override = {}) => actor.request.post("/api/service-intake/repair-orders", {
      data: { ...intake, idempotencyKey: randomUUID(), ...override }
    });
    expect((await createOrder(staff)).status()).toBe(403);
    expect((await createOrder(service, { readinessSnapshotId: null })).status()).toBe(400);
    expect((await createOrder(service, { requestToken: randomUUID() })).status()).toBe(409);
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    const attempts = await Promise.all([createOrder(service), createOrder(page)]);
    const responses = await Promise.all(attempts.map(async response => ({ status: response.status(), body: await response.json() })));
    expect(responses.filter(response => response.status === 201), JSON.stringify(responses)).toHaveLength(1);
    expect(responses.every(response => [200, 201, 409].includes(response.status)), JSON.stringify(responses)).toBe(true);
    const [{ id: orderId, repairOrderNumber }] = await prisma.repairOrder.findMany({ where: { vehicleId: vehicle.id } });
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(1);

    const browserVehicle = await prisma.vehicle.create({ data: {
      organizationId: location.organizationId, vehicleNumber: `SH-UI-${suffix}`, year: 2021, make: "Kia", model: "Sorento",
      vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated browser fixture", vinValidationSource: "SYNTHETIC_E2E"
    } });
    const browserTask = await prisma.task.create({ data: {
      ...taskData, title: `Synthetic browser check-in ${suffix}`, vehicleId: browserVehicle.id, customerId: customer.id
    } });
    const browserRequest = await page.request.post(`/api/tasks/${browserTask.id}/service-handoff`, {
      data: { action: "request", receiverUserId: advisor.id, concern }
    });
    expect(browserRequest.ok()).toBe(true);
    await service.goto(`/vehicles/repair-orders?serviceHandoff=${browserTask.id}`);
    await service.getByRole("button", { name: "Complete Check-In & Create Repair Order" }).click();
    await expect(service.getByText("Check-in complete", { exact: true })).toBeVisible();
    const checkedIn = await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: browserTask.id } });
    expect(checkedIn.repairOrderId).toBeTruthy();
    const taskAfter = await prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: { serviceHandoff: true } });
    expect(taskAfter).toMatchObject({ status: "IN_PROGRESS", requiresManagerApproval: true, serviceHandoff: { repairOrderId: orderId } });
    expect(await prisma.repairOrderTaskLink.count({ where: { repairOrderId: orderId, assignmentKey: "RO_OWNER" } })).toBe(1);
    expect(await prisma.activityEvent.count({ where: { taskId: task.id, eventType: "task.repair_handoff_accepted" } })).toBe(1);
    await page.goto(sourcePath);
    await page.getByRole("link", { name: `Open repair order ${repairOrderNumber}` }).click();
    await expect(page.getByRole("region", { name: "Originating Service handoffs" }).getByRole("link", { name: task.title })).toBeVisible();

    const followUp = await prisma.task.create({ data: { ...taskData, vehicleId: vehicle.id, customerId: customer.id, title: `Synthetic linked complaint ${suffix}` } });
    const followUpEndpoint = `/api/tasks/${followUp.id}/service-handoff`;
    const request = await page.request.post(followUpEndpoint, { data: { action: "request", receiverUserId: advisor.id, concern } });
    expect(request.ok(), await request.text()).toBe(true);
    const pending = await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: followUp.id } });
    const link = { action: "link", requestToken: pending.requestToken, repairOrderId: orderId, customerId: customer.id, vehicleId: vehicle.id };
    expect((await service.request.post(followUpEndpoint, { data: link })).status()).toBe(400);
    const invalid = await service.request.post(followUpEndpoint, { data: { ...link, customerId: "wrong-customer", confirmSameVisit: true } });
    expect(invalid.status()).toBe(409);
    expect((await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: followUp.id } })).repairOrderId).toBeNull();
    await service.goto(`/vehicles/repair-orders?serviceHandoff=${followUp.id}`);
    service.once("dialog", dialog => dialog.accept());
    await service.getByRole("button", { name: "Link this repair order" }).click();
    await expect(service.getByRole("region", { name: "Originating Service handoffs" }).getByRole("link", { name: followUp.title })).toBeVisible();
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(1);
  } finally {
    await advisorContext.close();
    await staffContext.close();
  }
});

test("a scheduled handoff uses the explicitly selected appointment and leaves unchecked appointments unchanged", async ({ page }) => {
  test.setTimeout(90_000);
  const schema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!schema?.startsWith("dispatch_board_e2e_")) throw new Error("Service handoff needs an isolated browser test schema.");
  const suffix = randomUUID().slice(0, 8);
  const advisor = await prisma.user.findUniqueOrThrow({ where: { email: "alex.advisor@local.test" } });
  const customer = await prisma.customer.create({ data: {
    organizationId: location.organizationId, displayName: `Scheduled test customer ${suffix}`, customerNumber: `SH-S-${suffix}`
  } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: location.organizationId, vehicleNumber: `SH-S-${suffix}`, year: 2021, make: "Kia", model: "Sorento",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated browser fixture", vinValidationSource: "SYNTHETIC_E2E"
  } });
  const concernSummary = "Customer reports the front door lock does not engage.";
  const date = new Date(new Date().toISOString().slice(0, 10));
  const day = await prisma.boardDay.upsert({ where: { date }, update: {}, create: { date } });
  const task = await prisma.task.create({ data: {
    boardDayId: day.id, assignedUserId: advisor.id, customerId: customer.id, vehicleId: vehicle.id,
    title: `Synthetic scheduled complaint ${suffix}`, description: concernSummary, dueAt: new Date(),
    sourceType: "STAFF", workflowArea: "SERVICE_ADVISOR"
  } });
  const now = Date.now();
  function addAppointment(label: string, offset: number) {
    return prisma.appointment.create({ data: {
      appointmentNumber: `SH-${suffix}-${label}`, title: `Synthetic ${label} visit`,
      organizationId: location.organizationId, locationId: location.id, ownerUserId: advisor.id, createdByUserId: advisor.id,
      sourceType: "MANUAL", sourceReference: suffix, startsAt: new Date(now + offset), endsAt: new Date(now + offset + 900_000),
      bookingStatus: "SCHEDULED", attendanceStatus: "EXPECTED", schedulingTimezone: location.timezone,
      purposeSnapshot: { category: "service", categoryLabel: "Service / Repair", reason: concernSummary },
      participants: { create: { participantType: "CUSTOMER", isPrimary: true, customerId: customer.id, roleCode: "CUSTOMER", displayNameSnapshot: customer.displayName } },
      vehicles: { create: { isPrimary: true, vehicleId: vehicle.id, roleCode: "SERVICE_VEHICLE", vehicleSnapshot: { vehicleNumber: vehicle.vehicleNumber } } }
    } });
  }
  const earlier = await addAppointment("first", 300_000);
  const selected = await addAppointment("second", 1_800_000);
  await signIn(page, advisor.email);
  expect((await page.request.post(`/api/tasks/${task.id}/service-handoff`, {
    data: { action: "request", receiverUserId: advisor.id, concern: concernSummary }
  })).ok()).toBe(true);
  const handoff = await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: task.id } });
  const identity = { arrivedAt: new Date(now).toISOString(), customerId: customer.id, vehicleId: vehicle.id, locationId: location.id };
  const readiness = async (appointmentId?: string) => (await page.request.post("/api/service-intake/readiness", {
    data: { ...identity, appointmentId, includeAppointmentChoices: true, sourceTaskId: task.id }
  })).json();
  const suggestions = (await readiness()).readiness;
  expect(suggestions.appointment.id).toBe(earlier.id);
  expect(suggestions.appointmentChoices.map((item: { id: string }) => item.id)).toEqual([earlier.id, selected.id]);
  await page.goto(`/vehicles/repair-orders?serviceHandoff=${task.id}`);
  const visitChoice = page.getByRole("combobox", { name: "Which appointment is this visit?" });
  await visitChoice.selectOption("walk-in");
  await expect(page.getByRole("button", { name: "Complete Check-In & Create Repair Order" })).toBeVisible();
  await page.getByRole("button", { name: "Change visit selection" }).click();
  await visitChoice.selectOption(selected.id);
  await expect(page.getByRole("link", { name: "Open confirmed appointment to check in" }))
    .toHaveAttribute("href", `/appointments?view=board&appointment=${selected.appointmentNumber}`);
  const confirmed = (await readiness(selected.id)).readiness;
  expect(confirmed.appointment.id).toBe(selected.id);
  const orderInput = {
    ...identity, sourceTaskId: task.id, requestToken: handoff.requestToken, appointmentId: selected.id, concernSummary,
    consentStatus: "PENDING", intakeSource: "APPOINTMENT", readinessSnapshotId: confirmed.snapshotId,
    nextAction: "Inspect the lock.", ownerUserId: advisor.id, reason: "Check in the scheduled complaint.",
    targetAt: new Date(now + 3_600_000).toISOString(), transportMode: "DROP_OFF", idempotencyKey: randomUUID()
  };
  const rejected = await page.request.post("/api/service-intake/repair-orders", { data: orderInput });
  expect(rejected.status(), await rejected.text()).toBe(409);
  expect((await rejected.json()).error).toContain("Check in the matched appointment");
  const visits = await prisma.appointment.findMany({ where: { id: { in: [earlier.id, selected.id] } } });
  expect(visits.every(visit => visit.attendanceStatus === "EXPECTED")).toBe(true);
  expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(0);
  expect((await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: task.id } })).repairOrderId).toBeNull();

  await prisma.appointment.update({
    where: { id: selected.id }, data: { attendanceStatus: "CHECKED_IN", checkedInAt: new Date(now) }
  });
  const refreshed = (await readiness(selected.id)).readiness;
  const accepted = await page.request.post("/api/service-intake/repair-orders", {
    data: { ...orderInput, readinessSnapshotId: refreshed.snapshotId, idempotencyKey: randomUUID() }
  });
  expect(accepted.status(), await accepted.text()).toBe(201);
  const order = await prisma.repairOrder.findFirstOrThrow({ where: { vehicleId: vehicle.id }, include: { serviceVisit: true } });
  expect(order.serviceVisit.appointmentId).toBe(selected.id);
  expect((await prisma.taskRepairHandoff.findUniqueOrThrow({ where: { taskId: task.id } })).repairOrderId).toBe(order.id);
});
