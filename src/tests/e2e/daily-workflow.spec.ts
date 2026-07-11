import { expect, test, type Page } from "@playwright/test";

import {
  disconnectDailyWorkflowDatabase,
  resetDailyWorkflowState
} from "./daily-workflow.setup";

const managerEmail = "morgan.manager@local.test";
const staffEmail = "jordan.sales@local.test";
const password = "dispatch123!";
const staffComment = "E2E update: customer callback is logged.";
const blockerReason = "E2E blocker: waiting on customer confirmation.";
const approvalTaskTitle = "E2E approve sold vehicle prep";
const appointmentTaskTitle = "E2E customer meeting required";
const appointmentTitle = "E2E task-originated customer meeting";
const appointmentReason = "E2E reason: customer must meet sales before the task can continue.";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  blockerReason: string | null;
  requiresManagerApproval: boolean;
  assignedUser: {
    name: string;
    email?: string;
  };
};

type BoardPayload = {
  board: {
    taskCount: number;
    tasks: BoardTask[];
  };
};

type AppointmentReadPayload = {
  appointments: Array<{
    id: string;
    appointmentNumber: string;
    title: string;
    sourceReference: string | null;
    startsAt: string | null;
    endsAt: string | null;
    bookingStatus: string;
    taskLinks: Array<{
      taskId: string;
      linkCode: string;
      linkType: string;
      taskTitle: string | null;
    }>;
  }>;
};

test.beforeEach(async () => {
  await resetDailyWorkflowState();
});

test.afterAll(async () => {
  await disconnectDailyWorkflowDatabase();
});

async function login(page: Page, email: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await loginResponse;

    if (response.ok()) {
      await expect(page).toHaveURL(/\/board/);
      return;
    }

    if (response.status() !== 404 || attempt === 1) {
      throw new Error(`Login failed with status ${response.status()}.`);
    }
  }
}

async function logout(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
  });
  await page.context().clearCookies();
}

async function readTodayBoard(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/board/today");
    if (!response.ok) {
      throw new Error(`Board API failed with ${response.status}`);
    }

    return (await response.json()) as BoardPayload;
  });
}

async function waitForBoardTask(page: Page, predicate: (task: BoardTask) => boolean) {
  return expect
    .poll(async () => {
      const payload = await readTodayBoard(page);
      return payload.board.tasks.find(predicate) ?? null;
    })
    .not.toBeNull();
}

async function readAppointments(page: Page, date = "2026-07-06") {
  return page.evaluate(async (appointmentDate) => {
    const response = await fetch(`/api/appointments?date=${encodeURIComponent(appointmentDate)}`);
    if (!response.ok) {
      throw new Error(`Appointments API failed with ${response.status}`);
    }

    return (await response.json()) as AppointmentReadPayload;
  }, date);
}

async function assertTasksConsoleFitsViewport(page: Page) {
  const pageHeight = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }));

  expect(pageHeight.scrollHeight).toBeLessThanOrEqual(pageHeight.innerHeight + 8);
}

async function assertAppointmentConsoleFitsUxSmokeGate(page: Page) {
  const gate = await page.evaluate(() => {
    const criticalSelectors = [
      ".appointment-board-toolbar",
      ".appointment-date-row",
      ".appointment-metric-grid",
      ".appointment-board-card",
      ".appointment-detail-panel",
      ".appointment-upcoming-card"
    ];
    const measuredSelectors = criticalSelectors.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();

      return {
        selector,
        exists: Boolean(element),
        top: rect?.top ?? Number.NaN,
        bottom: rect?.bottom ?? Number.NaN,
        right: rect?.right ?? Number.NaN,
        visibleInViewport: Boolean(
          rect &&
            rect.top >= -1 &&
            rect.top < window.innerHeight &&
            rect.bottom <= window.innerHeight + 8 &&
            rect.right <= window.innerWidth + 8
        )
      };
    });

    return {
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      measuredSelectors
    };
  });

  expect(gate.viewportWidth).toBe(1280);
  expect(gate.viewportHeight).toBe(720);
  expect(gate.scrollWidth).toBeLessThanOrEqual(gate.viewportWidth + 8);
  expect(gate.scrollHeight).toBeLessThanOrEqual(gate.viewportHeight + 8);
  expect(gate.measuredSelectors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ selector: ".appointment-board-toolbar", visibleInViewport: true }),
      expect.objectContaining({ selector: ".appointment-date-row", visibleInViewport: true }),
      expect.objectContaining({ selector: ".appointment-metric-grid", visibleInViewport: true }),
      expect.objectContaining({ selector: ".appointment-board-card", visibleInViewport: true }),
      expect.objectContaining({ selector: ".appointment-detail-panel", visibleInViewport: true }),
      expect.objectContaining({ selector: ".appointment-upcoming-card", visibleInViewport: true })
    ])
  );
}

async function waitForTaskAppointment(
  page: Page,
  taskId: string,
  predicate: (appointment: AppointmentReadPayload["appointments"][number]) => boolean
) {
  return expect
    .poll(async () => {
      const payload = await readAppointments(page);
      return payload.appointments.find(
        (appointment) => appointment.sourceReference === taskId && predicate(appointment)
      ) ?? null;
    })
    .not.toBeNull();
}

test("manager can pass the Appointment Board console smoke gate", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, managerEmail);
  await page.goto("/appointments");

  await expect(page.getByRole("heading", { name: "Appointment Board" })).toBeVisible();
  await expect(page.getByPlaceholder("Search appointments, customers, vehicles...")).toBeVisible();
  await expect(page.locator(".appointment-metric-grid")).toBeVisible();
  await expect(page.locator(".appointment-calendar-shell")).toBeVisible();
  await expect(page.locator(".appointment-detail-panel")).toBeVisible();
  await expect(page.locator(".appointment-detail-panel")).toContainText("Linked Tasks");
  await expect(page.locator(".appointment-next-action-card")).toBeVisible();
  await expect(page.locator(".appointment-detail-actions").getByRole("button", { name: "Check In" })).toBeVisible();
  await expect(page.locator(".appointment-view-tabs").getByRole("button", { name: "Day", exact: true })).toHaveClass(/appointment-view-tab-active/);
  await expect(page.locator(".appointment-board-lane-modes").getByRole("button", { name: "Staff", exact: true })).toHaveClass(/appointment-board-lane-mode-active/);
  await assertAppointmentConsoleFitsUxSmokeGate(page);

  const moduleRail = page.getByLabel("Appointment module navigation");
  await expect(page.locator(".appointment-board-page")).toHaveClass(/appointment-module-rail-expanded/);
  const defaultExpandedRailWidth = await moduleRail.evaluate(
    (element) => element.getBoundingClientRect().width
  );
  expect(defaultExpandedRailWidth).toBeGreaterThanOrEqual(140);
  await expect(moduleRail.getByRole("button", { name: "Day" })).toContainText("Day");
  await expect(moduleRail.getByRole("button", { name: "Planning Hub" })).toContainText("Planning Hub");
  await expect(moduleRail.getByRole("button", { name: "Operations" })).toContainText("Operations");
  await expect(moduleRail.getByRole("button", { name: "Intelligence" })).toContainText("Intelligence");

  await moduleRail.getByRole("button", { name: "Collapse appointment navigation" }).click();
  await expect(page.locator(".appointment-board-page")).not.toHaveClass(/appointment-module-rail-expanded/);
  await expect
    .poll(() => moduleRail.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThanOrEqual(52);

  const collapsedRailWidth = await moduleRail.evaluate((element) => element.getBoundingClientRect().width);
  await moduleRail.getByRole("button", { name: "Expand appointment navigation" }).click();
  await expect(page.locator(".appointment-board-page")).toHaveClass(/appointment-module-rail-expanded/);
  await expect
    .poll(() => moduleRail.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(collapsedRailWidth + 80);

  const hubButton = moduleRail.getByRole("button", { name: "Planning Hub" });
  await hubButton.click();
  await expect(hubButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#appointment-workspace-drawer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Planning Hub" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(hubButton).toHaveAttribute("aria-expanded", "false");
  await expect(hubButton).toBeFocused();
  await moduleRail.getByRole("button", { name: "Collapse appointment navigation" }).click();
  await expect(page.locator(".appointment-board-page")).not.toHaveClass(/appointment-module-rail-expanded/);

  const opsButton = moduleRail.getByRole("button", { name: "Operations" });
  await opsButton.click();
  await expect(opsButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Operations Hub" })).toBeVisible();
  await page.getByRole("button", { name: "Close appointment workspace" }).click();
  await expect(opsButton).toHaveAttribute("aria-expanded", "false");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const toolbar = document.querySelector(".appointment-board-toolbar");
        const metrics = document.querySelector(".appointment-metric-grid");
        const controls = document.querySelector(".appointment-board-controls");
        const detail = document.querySelector(".appointment-detail-panel");
        const detailLeft = detail?.getBoundingClientRect().left ?? Number.POSITIVE_INFINITY;

        return Boolean(
          toolbar &&
            metrics &&
            controls &&
            toolbar.getBoundingClientRect().right <= detailLeft &&
            metrics.getBoundingClientRect().right <= detailLeft &&
            controls.getBoundingClientRect().right <= detailLeft
        );
      })
    )
    .toBe(true);

  const appointmentItems = page.locator(".appointment-calendar-item");
  await expect(appointmentItems.first()).toBeVisible();
  const secondAppointment = appointmentItems.nth(1);
  const selectedTitle = (await secondAppointment.locator("strong").innerText()).trim();
  await secondAppointment.click();
  await expect(page.locator(".appointment-detail-header strong")).toHaveText(selectedTitle);
  await expect(secondAppointment).toHaveClass(/appointment-calendar-item-active/);
  await expect(page.locator(".appointment-next-action-card button")).toBeVisible();

  await expect(page.getByText("Upcoming Appointments")).toBeVisible();

  await page.setViewportSize({ width: 1920, height: 900 });
  const tallViewportLayout = await page.evaluate(() => {
    const calendarBody = document.querySelector(".appointment-calendar-body")?.getBoundingClientRect();
    const moduleNavigation = document.querySelector(".appointment-module-rail")?.getBoundingClientRect();
    const upcoming = document.querySelector(".appointment-upcoming-card")?.getBoundingClientRect();

    return {
      calendarHeight: calendarBody?.height ?? 0,
      moduleRailHeight: moduleNavigation?.height ?? 0,
      upcomingBottom: upcoming?.bottom ?? Number.POSITIVE_INFINITY
    };
  });

  expect(tallViewportLayout.calendarHeight).toBeGreaterThanOrEqual(500);
  expect(tallViewportLayout.moduleRailHeight).toBeGreaterThanOrEqual(870);
  expect(tallViewportLayout.upcomingBottom).toBeLessThanOrEqual(908);

  const tallViewportHubButton = page
    .getByLabel("Appointment module navigation")
    .getByRole("button", { name: "Planning Hub" });
  await tallViewportHubButton.click();
  const reservedWorkspaceLayout = await page.evaluate(() => {
    const drawer = document.querySelector("#appointment-workspace-drawer")?.getBoundingClientRect();
    const board = document.querySelector(".appointment-board-card")?.getBoundingClientRect();
    const detail = document.querySelector(".appointment-detail-panel")?.getBoundingClientRect();
    const upcomingTitle = document.querySelector(".appointment-upcoming-item strong");

    return {
      drawerRight: drawer?.right ?? Number.POSITIVE_INFINITY,
      boardLeft: board?.left ?? Number.NEGATIVE_INFINITY,
      boardRight: board?.right ?? Number.POSITIVE_INFINITY,
      boardWidth: board?.width ?? 0,
      detailLeft: detail?.left ?? Number.NEGATIVE_INFINITY,
      upcomingTitleFontSize: upcomingTitle
        ? Number.parseFloat(window.getComputedStyle(upcomingTitle).fontSize)
        : 0,
      moduleRailOverflowY: window.getComputedStyle(
        document.querySelector(".appointment-module-rail") as Element
      ).overflowY,
      drawerOverflowY: drawer
        ? window.getComputedStyle(document.querySelector("#appointment-workspace-drawer") as Element).overflowY
        : "missing",
      boardOverflowY: board
        ? window.getComputedStyle(document.querySelector(".appointment-calendar-shell") as Element).overflowY
        : "missing",
      detailOverflowY: detail
        ? window.getComputedStyle(document.querySelector(".appointment-detail-panel") as Element).overflowY
        : "missing"
    };
  });

  expect(reservedWorkspaceLayout.drawerRight).toBeLessThanOrEqual(reservedWorkspaceLayout.boardLeft + 1);
  expect(reservedWorkspaceLayout.boardRight).toBeLessThanOrEqual(reservedWorkspaceLayout.detailLeft);
  expect(reservedWorkspaceLayout.boardWidth).toBeGreaterThanOrEqual(900);
  expect(reservedWorkspaceLayout.upcomingTitleFontSize).toBeGreaterThanOrEqual(11);
  expect(reservedWorkspaceLayout.moduleRailOverflowY).toBe("auto");
  expect(reservedWorkspaceLayout.drawerOverflowY).toBe("auto");
  expect(reservedWorkspaceLayout.boardOverflowY).toBe("auto");
  expect(reservedWorkspaceLayout.detailOverflowY).toBe("auto");
});

test("manager can use every Appointment Board navigation and view tab", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1920, height: 900 });
  await login(page, managerEmail);
  await page.goto("/appointments");

  const moduleRail = page.getByLabel("Appointment module navigation");
  const viewTabs = page.locator(".appointment-view-tabs");
  const boardLenses = page.locator(".appointment-board-lane-modes");
  const workspace = page.locator("#appointment-workspace-drawer");

  for (const view of ["Week", "Month", "Agenda"] as const) {
    await viewTabs.getByRole("button", { name: view, exact: true }).click();
    await expect(viewTabs.getByRole("button", { name: view, exact: true })).toHaveClass(
      /appointment-view-tab-active/
    );
    await expect(page.getByText(`${view} View`, { exact: true })).toBeVisible();
  }

  await viewTabs.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.locator(".appointment-calendar-shell")).toBeVisible();

  for (const lens of ["Location", "Resource", "Staff"] as const) {
    await boardLenses.getByRole("button", { name: lens, exact: true }).click();
    await expect(boardLenses.getByRole("button", { name: lens, exact: true })).toHaveClass(
      /appointment-board-lane-mode-active/
    );
    await expect(page.locator(".appointment-staff-header small").first()).toHaveText(
      `${lens} lane`
    );
  }

  const planningButton = moduleRail.getByRole("button", { name: "Planning Hub" });
  await planningButton.click();
  await expect(planningButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Planning Hub" })).toBeVisible();

  const workspaceTabs = workspace.getByRole("tablist", {
    name: "Appointment workspace tabs"
  });
  await expect(workspaceTabs.getByRole("tab", { name: "Planner" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(workspace.getByText("Day Board", { exact: true })).toBeVisible();

  await workspaceTabs.getByRole("tab", { name: "Operations" }).click();
  await expect(workspaceTabs.getByRole("tab", { name: "Operations" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("heading", { name: "Operations Hub" })).toBeVisible();
  await expect(workspace.getByText("Draft Scheduling", { exact: true })).toBeVisible();

  await workspaceTabs.getByRole("tab", { name: "Intelligence" }).click();
  await expect(workspaceTabs.getByRole("tab", { name: "Intelligence" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("heading", { name: "Intelligence Hub" })).toBeVisible();
  await expect(workspace.getByText("Saved Views", { exact: true })).toBeVisible();

  await workspaceTabs.getByRole("tab", { name: "Planner" }).click();
  await expect(page.getByRole("heading", { name: "Planning Hub" })).toBeVisible();

  await moduleRail.getByRole("button", { name: "Operations" }).click();
  await expect(page.getByRole("heading", { name: "Operations Hub" })).toBeVisible();
  await expect(moduleRail.getByRole("button", { name: "Operations" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );

  await moduleRail.getByRole("button", { name: "Intelligence" }).click();
  await expect(page.getByRole("heading", { name: "Intelligence Hub" })).toBeVisible();
  await expect(moduleRail.getByRole("button", { name: "Intelligence" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );

  await moduleRail.getByRole("button", { name: "Follow-up" }).click();
  await expect(page.getByRole("heading", { name: "Operations Hub" })).toBeVisible();
  await expect(page.getByLabel("Filter resolution workbench items")).toHaveValue(
    "follow-up-required"
  );
  await expect(moduleRail.getByRole("button", { name: "Follow-up" })).toHaveClass(
    /appointment-module-rail-button-active/
  );

  await moduleRail.getByRole("button", { name: "Day" }).click();
  await expect(moduleRail.getByRole("button", { name: "Day" })).toHaveClass(
    /appointment-module-rail-button-active/
  );
  await expect(page.locator(".appointment-calendar-shell")).toBeVisible();
  await expect(workspace).not.toBeVisible();
});

test("manager can choose and retain the Customer Command Center appearance", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, managerEmail);
  await page.goto("/customers");

  const consoleRoot = page.getByRole("region", { name: "Customer Command Center" });
  const appearance = page.getByRole("group", { name: "Customer console appearance" });
  const lightButton = appearance.getByRole("button", { name: "Use light background" });
  const darkButton = appearance.getByRole("button", { name: "Use dark background" });

  await expect(page.getByRole("heading", { name: "Welcome back, Eli" })).toBeVisible();
  await expect(page.getByLabel("Customer business summary")).toBeVisible();
  await expect(page.getByLabel("Customer operations summary")).toBeVisible();
  await expect(consoleRoot).toHaveAttribute("data-theme", "light");
  await expect(lightButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveClass(/customer-console-shell/);

  await darkButton.click();
  await expect(consoleRoot).toHaveAttribute("data-theme", "dark");
  await expect(darkButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveClass(/customer-console-dark-shell/);

  await page.reload();
  await expect(consoleRoot).toHaveAttribute("data-theme", "dark");
  await expect(darkButton).toHaveAttribute("aria-pressed", "true");

  await lightButton.click();
  await expect(consoleRoot).toHaveAttribute("data-theme", "light");
  await expect(lightButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).not.toHaveClass(/customer-console-dark-shell/);
});

test("manager can use the Customer Resolution workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, managerEmail);
  await page.getByRole("link", { name: "Customer Resolution" }).click();

  await expect(page).toHaveURL(/\/customers\/resolutions/);
  await expect(page.getByRole("heading", { name: "Customer Resolution" })).toBeVisible();
  await expect(page.getByLabel("Resolution summary")).toBeVisible();
  await expect(page.getByLabel("Customer case queue")).toBeVisible();
  await expect(page.getByLabel("Selected case command rail")).toContainText(
    "Financing approval delay"
  );

  await page.getByRole("button", { name: "Escalated", exact: true }).click();
  const escalatedRow = page.locator(".customer-case-row").filter({ hasText: "Mustafa K." });
  await expect(escalatedRow).toBeVisible();
  await escalatedRow.click();
  await expect(page.getByLabel("Selected case command rail")).toContainText(
    "Vehicle not starting"
  );

  await page.getByRole("button", { name: "All Cases", exact: true }).click();
  await page.getByLabel("Search cases").fill("title documents");
  await expect(page.locator(".customer-case-row")).toHaveCount(1);
  await expect(page.locator(".customer-case-row")).toContainText("Ibrahim D.");

  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByLabel("Selected case command rail")).toContainText(
    "CRM-5 implementation milestone"
  );

  const appearance = page.getByRole("group", { name: "Customer console appearance" });
  const darkButton = appearance.getByRole("button", { name: "Use dark background" });
  await darkButton.click();
  await expect(page.getByLabel("Customer Resolution Console")).toHaveAttribute(
    "data-theme",
    "dark"
  );
  await page.reload();
  await expect(page.getByLabel("Customer Resolution Console")).toHaveAttribute(
    "data-theme",
    "dark"
  );
});

test("manager can scan the compact Tasks Operations Console", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("Task Operations Console")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Task" })).toBeVisible();
  await expect(page.getByText("Total Tasks")).toBeVisible();
  await expect(page.locator(".tasks-console-metrics").getByText("Ready for Review", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update Status" }).first()).toBeVisible();
  await expect(page.locator(".tasks-console-table tbody tr")).toHaveCount(8);
  await assertTasksConsoleFitsViewport(page);

  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByLabel("Quick create task")).toBeVisible();
  await expect(page.getByPlaceholder("Example: Check vehicles needing inspection")).toBeVisible();
  await assertTasksConsoleFitsViewport(page);
  await page.getByLabel("Close create task panel").click();
  await expect(page.getByLabel("Quick create task")).toBeHidden();

  await page.getByLabel("Search tasks").fill("blocked");
  await expect(page.getByText("Search: blocked")).toBeVisible();

  await page.getByRole("button", { name: "Saved Views" }).click();
  await page.getByRole("button", { name: "Save shared view" }).click();
  await expect(page.getByText("Saved View 1 saved as a shared team view.")).toBeVisible();
  await page.getByRole("button", { name: "Saved Views" }).click();
  await expect(page.getByText("Shared Saved Views")).toBeVisible();
  await page.getByRole("button", { name: "Saved View 1", exact: true }).click();
  await expect(page.getByText("Search: blocked")).toBeVisible();
  await page.getByRole("button", { name: "Saved Views" }).click();
  await page.getByLabel("Delete Saved View 1").click();
  await expect(page.getByText("Shared saved view deleted.")).toBeVisible();
  await page.getByLabel("Search tasks").fill("");

  await page.locator(".tasks-console-sidebar").getByRole("button", { name: "Blocked", exact: true }).click();
  await expect(page.getByText("Queue: Blocked")).toBeVisible();
  await page.locator(".tasks-console-sidebar").getByRole("button", { name: /^Team Tasks\s*\d*/ }).click();

  const rows = page.locator(".tasks-console-table tbody tr");
  const secondTaskTitle = await rows.nth(1).locator(".tasks-console-title-cell strong").innerText();
  await rows.nth(1).click();
  await expect
    .poll(async () => (await page.locator(".tasks-console-rail-title h2").innerText()).toLowerCase())
    .toContain(secondTaskTitle.toLowerCase());

  await page.getByRole("button", { name: /Comments/ }).click();
  await expect(page.getByText("New Comment")).toBeVisible();
  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.locator(".tasks-console-rail-panel")).toBeVisible();
});

test("manager and staff can complete the daily dispatch workflow", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Board" })).toBeVisible();

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  const firstGeneration = await readTodayBoard(page);
  const firstGeneratedTaskCount = firstGeneration.board.taskCount;
  expect(firstGeneratedTaskCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText(/duplicates skipped/i)).toBeVisible();
  const secondGeneration = await readTodayBoard(page);
  expect(secondGeneration.board.taskCount).toBe(firstGeneratedTaskCount);

  await page.getByRole("button", { name: "Create Task" }).click();
  await page.getByLabel("Title").fill(approvalTaskTitle);
  await page.getByLabel("Assigned to").selectOption({ label: "Baraka Sales" });
  await page.getByLabel("Due time").fill("17:30");
  await page.getByLabel("Workflow area").selectOption("SALES");
  await page.getByLabel("Requires manager approval before completion").check();
  await page.getByRole("button", { name: /^Create task$/ }).click();
  await expect(page.getByText("Task created.")).toBeVisible();

  await logout(page);
  await login(page, staffEmail);
  await page.goto("/my-tasks");
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();

  const generatedSalesTask = (await readTodayBoard(page)).board.tasks.find(
    (task) => task.assignedUser.email === staffEmail && !task.requiresManagerApproval
  );
  expect(generatedSalesTask).toBeTruthy();

  await page.goto(`/tasks/${generatedSalesTask!.id}#task-updates`);
  await page.getByLabel("Post a comment").fill(staffComment);
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByText(staffComment)).toBeVisible();

  await page.getByLabel("Next status").selectOption("BLOCKED");
  await page.getByLabel("Blocker reason").fill(blockerReason);
  await page.getByRole("button", { name: "Block task" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === generatedSalesTask!.id)?.blockerReason;
  }).toBe(blockerReason);

  const approvalTask = (await readTodayBoard(page)).board.tasks.find(
    (task) => task.title === approvalTaskTitle
  );
  expect(approvalTask).toBeTruthy();

  await page.goto(`/tasks/${approvalTask!.id}`);
  await page.getByRole("button", { name: "Ready for Review" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === approvalTask!.id)?.status;
  }).toBe("READY_FOR_REVIEW");

  await logout(page);
  await login(page, managerEmail);
  await page.goto("/board");
  await waitForBoardTask(page, (task) => task.status === "BLOCKED" && task.blockerReason === blockerReason);
  const blockedTaskRow = page.getByRole("row").filter({ hasText: generatedSalesTask!.title });
  await expect(blockedTaskRow.getByText("Blocked", { exact: true })).toBeVisible();

  await page.goto("/manager-review");
  await expect(page.getByRole("heading", { name: "Manager Review" })).toBeVisible();
  await page.getByRole("button", { name: "Approve completion" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === approvalTask!.id)?.status;
  }).toBe("COMPLETED");

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Today's Activity Feed" })).toBeVisible();
  await expect(page.getByText(/Board generated manually/).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`added an update to ${generatedSalesTask!.title}`))).toBeVisible();
  await expect(page.getByText(blockerReason)).toBeVisible();
  await expect(page.getByText(new RegExp(`marked ${approvalTaskTitle} ready for review`))).toBeVisible();
  await expect(page.getByText(new RegExp(`approved completion for ${approvalTaskTitle}`))).toBeVisible();
});

test("manager can create and schedule a linked appointment draft from the Appointment Board", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();

  await page.getByRole("button", { name: "Create Task" }).click();
  await page.getByLabel("Title").fill(appointmentTaskTitle);
  await page.getByLabel("Assigned to").selectOption({ label: "Baraka Sales" });
  await page.getByLabel("Due time").fill("16:45");
  await page.getByLabel("Workflow area").selectOption("SALES");
  await page.getByRole("button", { name: /^Create task$/ }).click();
  await expect(page.getByText("Task created.")).toBeVisible();

  const task = (await readTodayBoard(page)).board.tasks.find(
    (boardTask) => boardTask.title === appointmentTaskTitle
  );
  expect(task).toBeTruthy();

  await page.goto(`/tasks/${task!.id}`);
  await expect(page.getByRole("heading", { name: appointmentTaskTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Appointment" })).toBeVisible();
  await page.getByLabel("Appointment Title").fill(appointmentTitle);
  await page.getByLabel("Documented Reason").fill(appointmentReason);
  await page.getByRole("button", { name: "Create linked draft" }).click();
  await expect(page.getByText(/Draft appointment APT-TASK-/)).toBeVisible();

  await waitForTaskAppointment(
    page,
    task!.id,
    (appointment) =>
      appointment.title === appointmentTitle &&
      appointment.startsAt === null &&
      appointment.taskLinks.some(
        (link) =>
          link.taskId === task!.id &&
          link.linkCode === "SOURCE_TASK" &&
          link.taskTitle === appointmentTaskTitle
      )
  );
  const createdAppointment = (await readAppointments(page)).appointments.find(
    (appointment) => appointment.sourceReference === task!.id && appointment.title === appointmentTitle
  );
  expect(createdAppointment).toBeTruthy();

  await expect(page.getByText("Linked Appointments (1)")).toBeVisible();
  const linkedAppointments = page.getByLabel("Linked appointments");
  await expect(linkedAppointments.getByText(createdAppointment!.appointmentNumber)).toBeVisible();
  await expect(linkedAppointments.getByText("Unscheduled draft")).toBeVisible();

  await page.goto("/activity");
  await expect(page.getByText(new RegExp(`created draft appointment .* from ${appointmentTaskTitle}`))).toBeVisible();

  await page.goto(
    `/appointments?sourceTask=${encodeURIComponent(task!.id)}&appointment=${encodeURIComponent(
      createdAppointment!.appointmentNumber
    )}`
  );
  await expect(page.getByRole("heading", { name: "Appointment Board" })).toBeVisible();
  await expect(page.locator(".appointment-next-action-card")).toBeVisible();
  const appointmentRail = page.getByLabel("Appointment module navigation");
  const opsButton = appointmentRail.getByRole("button", { name: "Operations" });
  await expect(opsButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#appointment-workspace-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opsButton).toHaveAttribute("aria-expanded", "false");
  await opsButton.click();
  const unscheduledCard = page.locator(".appointment-unscheduled-card");
  await expect(unscheduledCard).toBeVisible();
  await expect(unscheduledCard).toContainText("Unscheduled / Drafts");
  await expect(unscheduledCard).toContainText("needs scheduling");
  await expect(unscheduledCard).toContainText(createdAppointment!.appointmentNumber);
  const unscheduledDraftItem = page.locator(".appointment-unscheduled-item").filter({ hasText: appointmentTitle });
  await expect(unscheduledDraftItem).toBeVisible();
  await unscheduledDraftItem.click();
  await expect(unscheduledDraftItem).toHaveClass(/appointment-unscheduled-item-active/);
  await expect(page.locator(".appointment-detail-panel")).toContainText(createdAppointment!.appointmentNumber);
  await expect(page.locator(".appointment-next-action-card")).toBeVisible();
  await expect(page.locator(".appointment-detail-actions").getByRole("button", { name: "Check In" })).toBeVisible();
  await expect(page.getByText("Linked Tasks (1)")).toBeVisible();
  await expect(page.getByText(appointmentTaskTitle, { exact: true })).toBeVisible();
  const detailPanel = page.locator(".appointment-detail-panel");
  await expect(detailPanel.getByText("Schedule Unscheduled Draft")).toBeVisible();
  await detailPanel.getByLabel("Appointment date").fill("2026-07-13");
  await detailPanel.getByLabel("Start time").fill("10:00");
  await detailPanel.getByLabel("Duration").selectOption("60");
  await detailPanel.getByLabel("Scheduling reason").fill(
    "E2E schedule commit gate: customer confirmed the appointment window."
  );
  const scheduleButton = detailPanel.getByRole("button", { name: "Schedule This Draft" });
  await expect(scheduleButton).toBeEnabled();
  await scheduleButton.click();
  await expect(page.getByText(new RegExp(`Scheduled ${createdAppointment!.appointmentNumber}`))).toBeVisible();
  await expect
    .poll(async () => {
      const scheduledPayload = await readAppointments(page, "2026-07-13");
      const scheduledAppointment = scheduledPayload.appointments.find(
        (appointment) => appointment.appointmentNumber === createdAppointment!.appointmentNumber
      );

      return scheduledAppointment
        ? {
            bookingStatus: scheduledAppointment.bookingStatus,
            hasStart: Boolean(scheduledAppointment.startsAt),
            hasEnd: Boolean(scheduledAppointment.endsAt),
            linkedTaskId: scheduledAppointment.taskLinks[0]?.taskId ?? null
          }
        : null;
    })
    .toEqual({
      bookingStatus: "SCHEDULED",
      hasStart: true,
      hasEnd: true,
      linkedTaskId: task!.id
    });
  await page.goto(`/tasks/${task!.id}`);
  await expect(page.getByRole("heading", { name: appointmentTaskTitle })).toBeVisible();
  await expect(page.getByText("Linked Appointments (1)")).toBeVisible();
  await expect(page.getByLabel("Linked appointments").getByText(createdAppointment!.appointmentNumber)).toBeVisible();
});
