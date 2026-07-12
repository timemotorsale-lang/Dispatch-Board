import { expect, test, type Page } from "@playwright/test";
import { WorkflowArea } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { normalizeAvailableWorkWorkflowArea } from "@/server/services/available-work";
import { createAvailableWorkRepository } from "@/server/repositories/available-work-repository";

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
const claimableTaskTitle = "E2E claimable customer follow-up";
const declinedTaskTitle = "E2E direction-needed follow-up";

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

test("an expired session returns the manager to the console after sign-in", async ({ page }) => {
  await login(page, managerEmail);
  await page.goto("/my-tasks");
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();

  await logout(page);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(page).toHaveURL(/\/login\?reason=session-expired&returnTo=%2Fmy-tasks/);
  await expect(page.getByText("Your session ended.")).toBeVisible();
  await page.getByLabel("Email").fill(managerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/my-tasks/);
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
});

test("manager can navigate every live Customer 360 record tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, managerEmail);
  await page.goto("/customers");

  const consoleSections = page.getByLabel("Customer console sections");
  await consoleSections.getByRole("link", { name: "Customer 360" }).click();
  await expect(page).toHaveURL(/\/customers\/customer-360/);
  await expect(consoleSections.getByRole("link", { name: "Customer 360" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  const recordTabs = page.getByLabel("Customer record sections");
  const activePanel = page.getByLabel("Active customer record panel");
  const tabPanels = [
    ["Overview", "Customer Overview"],
    ["Timeline", "Timeline"],
    ["Deals", "Deals"],
    ["Cases", "Cases"],
    ["Appointments", "Appointments"],
    ["Documents", "Documents"],
    ["Vehicles", "Vehicles"],
    ["Communications", "Communications"],
    ["Collections", "Collections"],
    ["Notes", "Notes"]
  ] as const;

  for (const [tab, panelTitle] of tabPanels) {
    await recordTabs.getByRole("button", { name: tab, exact: true }).click();
    await expect(recordTabs.getByRole("button", { name: tab, exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(activePanel.getByRole("heading", { name: panelTitle, exact: true })).toBeVisible();
    await expect(activePanel.locator("article")).not.toHaveCount(0);
  }

  await consoleSections.getByRole("link", { name: "Resolution" }).click();
  await expect(page).toHaveURL(/\/customers\/resolutions/);
});

test("manager can use the Customer Resolution workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, managerEmail);
  await page.locator(".app-sidebar").getByRole("link", { name: "Customer Resolution" }).click();

  await expect(page).toHaveURL(/\/customers\/resolutions/);
  await expect(page.getByRole("heading", { name: "Customer Resolution" })).toBeVisible();
  await expect(page.getByLabel("Resolution summary")).toBeVisible();
  await expect(page.getByLabel("Customer case queue")).toBeVisible();
  await expect(page.getByLabel("Selected case command rail")).toContainText(
    "Financing approval delay"
  );
  await expect(page.getByLabel("Customer console sections").getByRole("link", { name: "Resolution" })).toHaveAttribute("aria-current", "page");

  const queues = page.getByLabel("Resolution queues");
  const queueCounts = [
    ["All Cases", 9],
    ["My Cases", 3],
    ["Unassigned", 1],
    ["Overdue", 2],
    ["Escalated", 1],
    ["Resolved", 1]
  ] as const;

  for (const [queue, count] of queueCounts) {
    await queues.getByRole("button", { name: queue, exact: true }).click();
    await expect(queues.getByRole("button", { name: queue, exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.locator(".customer-case-row")).toHaveCount(count);
  }

  await queues.getByRole("button", { name: "All Cases", exact: true }).click();
  await page.getByLabel("Search cases").fill("title documents");
  await expect(page.locator(".customer-case-row")).toHaveCount(1);
  await expect(page.locator(".customer-case-row").filter({ hasText: "Ibrahim D." })).toBeVisible();

  const detailTabs = page.getByLabel("Selected case sections");
  const detailPanel = page.locator(".customer-resolution-live-panel");
  const detailPanels = [
    ["Details", "Case Details"],
    ["Timeline", "Case Timeline"],
    ["Customer", "Customer Context"],
    ["Vehicle", "Vehicle Context"],
    ["Related", "Related Work"]
  ] as const;

  for (const [tab, panelTitle] of detailPanels) {
    await detailTabs.getByRole("button", { name: tab, exact: true }).click();
    await expect(detailTabs.getByRole("button", { name: tab, exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(detailPanel.getByText(panelTitle, { exact: true })).toBeVisible();
  }

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
  const commentEditor = page.getByLabel("New task comment");
  await commentEditor.fill("Priority handoff");
  await commentEditor.press("Control+A");
  await commentEditor.press("Control+B");
  await expect(commentEditor).toHaveValue("**Priority handoff**");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(page.locator(".tasks-console-feed-item .rich-text-content strong").filter({ hasText: "Priority handoff" })).toBeVisible();
  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.locator(".tasks-console-rail-panel")).toBeVisible();
});

test("manager can generate and escalate a title-delay concern package", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, managerEmail);
  await page.goto("/tasks");

  await page.getByRole("button", { name: "Log Concern" }).click();
  const intake = page.getByLabel("Concern resolution intake");
  await intake.getByLabel("Concern title").fill("Customer has not received title");
  await intake.getByLabel("Description").fill("Customer was promised the DMV title in two weeks and it is now more than two months late.");
  await intake.getByLabel("Customer").fill("Maria Santos");
  await intake.getByLabel("Vehicle / VIN").fill("2018 Toyota Camry");
  await intake.getByLabel("Days overdue").fill("65");
  await intake.getByLabel("Repeat contacts").fill("3");
  await intake.getByText("Missing documentation").click();
  await intake.getByRole("button", { name: "Preview workflow" }).click();

  await expect(page.getByLabel("Concern resolution preview")).toContainText("TITLE_DELAY_V1");
  await expect(page.locator(".concern-preview li")).toHaveCount(7);

  const commitResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/concerns") && response.request().method() === "POST"
  );
  await intake.getByRole("button", { name: "Generate package" }).click();
  const commitResponse = await commitResponsePromise;
  expect(commitResponse.status()).toBe(201);
  const created = await commitResponse.json() as { concern: { id: string }; tasks: unknown[] };

  expect(created.tasks).toHaveLength(7);
  await expect(intake).toContainText("7 linked tasks were generated atomically");
  const persisted = await prisma.concernCase.findUnique({ where: { id: created.concern.id }, include: { taskLinks: { include: { task: { include: { checklistItems: true } } } } } });
  expect(persisted?.taskLinks).toHaveLength(7);
  expect(persisted?.taskLinks.every((link) => link.task.checklistItems.length > 0)).toBe(true);

  const firstResolutionTask = persisted!.taskLinks.toSorted((left, right) => left.sortOrder - right.sortOrder)[0].task;
  await page.goto(`/tasks/${firstResolutionTask.id}`);
  await expect(page.getByLabel("Enterprise task workbench")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Generated Resolution Tasks \(7\)/ })).toBeVisible();
  await expect(page.locator(".etw-resolution-task")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "SLA & Risk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workflow Command" })).toBeVisible();
  await expect(page.getByLabel("Task workbench navigation")).toContainText("Workbench");
  await expect(page.getByRole("button", { name: "WhatsApp customer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call customer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email customer" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Case Notes/ })).toBeVisible();
  await page.getByRole("button", { name: "Collapse All" }).click();
  await expect(page.locator(".etw-selected-task")).toHaveCount(0);
  await page.getByRole("button", { name: "Expand All" }).click();
  await expect(page.locator(".etw-selected-task")).toHaveCount(7);
  await page.getByRole("button", { name: "Collapse All" }).click();
  await expect(page.locator(".etw-selected-task")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Add Task/ }).first()).toHaveAttribute("href", /create=1/);

  const retryProof = await page.evaluate(async () => {
    const payload = { title: "Unclear lot concern", description: "Manager should review this operational concern.", source: "MANAGER" };
    const send = async () => {
      const response = await fetch("/api/concerns", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "e2e-fixed-concern-retry" }, body: JSON.stringify(payload) });
      return { status: response.status, body: await response.json() as { concern: { id: string }; tasks: unknown[]; replayed: boolean } };
    };
    return { first: await send(), second: await send() };
  });
  expect(retryProof.first.status).toBe(201);
  expect(retryProof.second.status).toBe(200);
  expect(retryProof.second.body.concern.id).toBe(retryProof.first.body.concern.id);
  expect(retryProof.second.body.replayed).toBe(true);

  const closeStatus = await page.evaluate(async (concernId) => {
    const response = await fetch(`/api/concerns/${concernId}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome: "TITLE_RECEIVED", reason: "Resolved", proof: "Customer confirmation" }) });
    return response.status;
  }, created.concern.id);
  expect(closeStatus).toBe(400);

  await prisma.concernCase.update({ where: { id: created.concern.id }, data: { escalateAt: new Date("2020-01-01T00:00:00.000Z") } });
  const evaluation = await page.evaluate(async () => {
    const response = await fetch("/api/concerns/escalations/evaluate", { method: "POST" });
    return { status: response.status, payload: await response.json() as { escalatedCount: number } };
  });
  expect(evaluation.status).toBe(200);
  expect(evaluation.payload.escalatedCount).toBe(1);
  expect((await prisma.concernCase.findUnique({ where: { id: created.concern.id } }))?.status).toBe("ESCALATED");

  const manager = await prisma.user.findUniqueOrThrow({ where: { email: managerEmail } });
  await prisma.taskChecklistItem.updateMany({ where: { task: { concernLink: { concernCaseId: created.concern.id } } }, data: { completed: true, completedAt: new Date(), completedByUserId: manager.id } });
  await prisma.task.updateMany({ where: { concernLink: { concernCaseId: created.concern.id } }, data: { status: "COMPLETED", completedAt: new Date(), reviewedByUserId: manager.id } });
  const closure = await page.evaluate(async (concernId) => {
    const response = await fetch(`/api/concerns/${concernId}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome: "TITLE_RECEIVED", reason: "All required work and manager review completed.", proof: "Customer confirmed title receipt by phone." }) });
    return { status: response.status, payload: await response.json() as { concern: { status: string } } };
  }, created.concern.id);
  expect(closure.status).toBe(200);
  expect(closure.payload.concern.status).toBe("CLOSED");
  expect(await prisma.activityEvent.count({ where: { concernCaseId: created.concern.id, eventType: "concern.closed" } })).toBe(1);
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
  await page.getByRole("button", { name: "Add Note" }).click();
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
  await expect(page.getByRole("heading", { name: "Manager Review Command Center" })).toBeVisible();
  const managerWorklist = page.getByRole("region", { name: "Ranked manager worklist" });
  const approvalWorkItem = managerWorklist.getByRole("button", {
    name: `Select ${approvalTaskTitle}`
  });
  await approvalWorkItem.click();
  await expect(approvalWorkItem).toHaveAttribute("aria-pressed", "true");
  const reviewWorkbench = page.getByRole("complementary", {
    name: "Selected review workbench"
  });
  await expect(reviewWorkbench.getByRole("heading", { name: approvalTaskTitle })).toBeVisible();
  await reviewWorkbench
    .getByRole("group", { name: "Manager review decisions" })
    .getByRole("button", { name: "Approve", exact: true })
    .click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === approvalTask!.id)?.status;
  }).toBe("COMPLETED");
  await expect(managerWorklist.getByRole("button", { name: `Select ${approvalTaskTitle}` })).toHaveCount(0);

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Today's Activity Feed" })).toBeVisible();
  await expect(page.getByText(/Board generated manually/).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`added an update to ${generatedSalesTask!.title}`))).toBeVisible();
  await expect(page.getByText(blockerReason)).toBeVisible();
  await expect(page.getByText(new RegExp(`marked ${approvalTaskTitle} ready for review`))).toBeVisible();
  await expect(page.getByText(new RegExp(`approved completion for ${approvalTaskTitle}`))).toBeVisible();
});

test("staff can start the day and persist role-duty progress", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  await logout(page);
  await login(page, staffEmail);
  await page.goto("/my-tasks");

  const startDay = page.getByRole("region", { name: "Start Day accountability" });
  await expect(startDay.getByRole("heading", { name: "Start Day" })).toBeVisible();
  await startDay.getByLabel("I reviewed today's tasks and top priorities.").check();
  await startDay.getByRole("button", { name: "Confirm Start Day" }).click();
  await expect(startDay.getByRole("heading", { name: "Today is active" })).toBeVisible();
  await expect(startDay.getByText("Priorities acknowledged.")).toBeVisible();

  const firstDuty = startDay.locator(".staff-day-duty-list input[type='checkbox']").first();
  await expect(firstDuty).toBeEnabled();
  await firstDuty.check();
  await expect(firstDuty).toBeChecked();
  await expect(startDay.getByRole("status")).toHaveText("Daily responsibility saved.");

  await page.reload();
  const persistedStartDay = page.getByRole("region", { name: "Start Day accountability" });
  await expect(persistedStartDay.getByRole("heading", { name: "Today is active" })).toBeVisible();
  await expect(persistedStartDay.getByText("Priorities acknowledged.")).toBeVisible();
  await expect(
    persistedStartDay.locator(".staff-day-duty-list input[type='checkbox']").first()
  ).toBeChecked();
});

test("staff can accept a task and retain completion readiness", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  await logout(page);
  await login(page, staffEmail);
  const assignedTask = (await readTodayBoard(page)).board.tasks.find(
    (task) => task.assignedUser.email === staffEmail && !task.requiresManagerApproval
  );
  expect(assignedTask).toBeTruthy();
  await prisma.taskChecklistItem.create({
    data: {
      taskId: assignedTask!.id,
      kind: "DEFINITION_OF_DONE",
      key: "e2e_staff_completion_evidence",
      label: "Record final customer confirmation",
      isRequired: true,
      completed: false,
      sortOrder: 99
    }
  });

  await page.goto("/my-tasks");
  const taskRow = page.locator("article.enterprise-list-row").filter({ hasText: assignedTask!.title });
  await expect(taskRow.getByText(/evidence items/)).toBeVisible();
  await taskRow.locator("button.enterprise-list-row-hit").click();
  const myDayReadiness = page.getByRole("region", { name: "Selected task completion readiness" });
  await expect(myDayReadiness.getByText(/completion requirements remain/)).toBeVisible();
  await myDayReadiness.getByRole("link", { name: "Review evidence" }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${assignedTask!.id}`));
  const readiness = page.getByRole("region", { name: "Completion readiness" });
  await expect(readiness.getByText("Accept this task")).toBeVisible();
  await readiness.getByRole("button", { name: "Accept Task" }).click();
  await expect(readiness.getByText("Task accepted")).toBeVisible();

  await page.reload();
  const persistedReadiness = page.getByRole("region", { name: "Completion readiness" });
  await expect(persistedReadiness.getByText("Task accepted")).toBeVisible();
  await expect(persistedReadiness.getByText(/requirements remaining/)).toBeVisible();
  const commandPanel = page.getByText("Workflow action").locator("..");
  await commandPanel.getByLabel("Next status").selectOption("COMPLETED");
  await commandPanel.locator("button.pill-primary").click();
  await expect(commandPanel.getByRole("alert")).toContainText("Complete the requirements shown below");
  expect((await prisma.task.findUnique({ where: { id: assignedTask!.id } }))?.status).not.toBe("COMPLETED");
});

test("manager can record a reasoned completion override and complete the task", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  const overrideTask = await prisma.task.findFirst({
    where: {
      boardDay: { is: { date: new Date("2026-07-11T00:00:00.000Z") } },
      requiresManagerApproval: false
    },
    orderBy: { createdAt: "asc" }
  });
  expect(overrideTask).toBeTruthy();
  await prisma.taskChecklistItem.create({
    data: {
      taskId: overrideTask!.id,
      kind: "DEFINITION_OF_DONE",
      key: "e2e_override_evidence",
      label: "Attach final exception evidence",
      isRequired: true,
      completed: false,
      sortOrder: 99
    }
  });

  await page.goto(`/tasks/${overrideTask!.id}`);
  const readiness = page.getByRole("region", { name: "Completion readiness" });
  await readiness.getByLabel("Completion override reason").fill(
    "Manager verified an urgent operational exception and documented the decision."
  );
  await readiness.getByRole("button", { name: "Authorize Override" }).click();
  await expect(readiness.getByText("Manager override recorded")).toBeVisible();

  await page.reload();
  const persistedReadiness = page.getByRole("region", { name: "Completion readiness" });
  await expect(persistedReadiness.getByText("Manager override authorized")).toBeVisible();
  const commandPanel = page.getByText("Workflow action").locator("..");
  await commandPanel.getByLabel("Next status").selectOption("COMPLETED");
  await commandPanel.locator("button.pill-primary").click();
  await expect.poll(async () => (await prisma.task.findUnique({ where: { id: overrideTask!.id } }))?.status).toBe("COMPLETED");
});

test("staff can request and atomically claim explainable available work", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: managerEmail } });
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: staffEmail } });
  const boardDay = await prisma.boardDay.findUniqueOrThrow({ where: { date: new Date("2026-07-11T00:00:00.000Z") } });
  const staffDay = await prisma.staffDay.findUniqueOrThrow({
    where: { boardDayId_userId: { boardDayId: boardDay.id, userId: staff.id } },
    include: { dutyItems: { orderBy: { sortOrder: "asc" }, take: 1 } }
  });
  const matchingWorkflowArea = staffDay.dutyItems[0]
    ? normalizeAvailableWorkWorkflowArea(staffDay.dutyItems[0].workflowArea) as WorkflowArea
    : undefined;
  expect(matchingWorkflowArea).toBeTruthy();
  const claimableTask = await prisma.task.create({
    data: {
      boardDayId: boardDay.id,
      title: claimableTaskTitle,
      description: "Contact the customer and document the next sales step.",
      assignedUserId: manager.id,
      status: "NOT_STARTED",
      priority: "HIGH",
      dueAt: new Date("2026-07-11T23:00:00.000Z"),
      sourceType: "MANAGER",
      workflowArea: matchingWorkflowArea!,
      isClaimable: true
    }
  });
  await prisma.task.create({
    data: {
      boardDayId: boardDay.id,
      title: declinedTaskTitle,
      description: "Clarify the manager's requested customer follow-up before proceeding.",
      assignedUserId: manager.id,
      status: "NOT_STARTED",
      priority: "CRITICAL",
      dueAt: new Date("2026-07-11T22:00:00.000Z"),
      sourceType: "MANAGER",
      workflowArea: matchingWorkflowArea!,
      isClaimable: true
    }
  });

  await page.goto("/manager-review?focus=NEEDS_ASSIGNMENT");
  await expect(page.getByRole("heading", { name: "Manager Review Command Center" })).toBeVisible();
  const managerQueues = page.getByRole("navigation", { name: "Manager review queues" });
  await expect(
    managerQueues.getByRole("button", { name: /^Needs assignment/ })
  ).toHaveAttribute("aria-pressed", "true");
  const executionHealth = page.getByRole("region", { name: "Team Execution Health" });
  await expect(executionHealth).toBeVisible();
  await expect(executionHealth.getByText(/Active|Ready|Needs Assignment/).first()).toBeVisible();
  const needsAssignment = page.getByRole("region", { name: "Needs Assignment queue" });
  await expect(needsAssignment.getByText(claimableTaskTitle)).toBeVisible();
  await expect(needsAssignment.getByText(declinedTaskTitle)).toBeVisible();
  await expect(needsAssignment.getByText(new RegExp(`Current owner: ${manager.name}`)).first()).toBeVisible();

  await logout(page);
  await login(page, staffEmail);
  const deniedHealthStatus = await page.evaluate(async () => (await fetch("/api/manager/execution-health?date=2026-07-11")).status);
  expect(deniedHealthStatus).toBe(403);
  await page.goto("/my-tasks");
  const startDay = page.getByRole("region", { name: "Start Day accountability" });
  await startDay.getByLabel("I reviewed today's tasks and top priorities.").check();
  await startDay.getByRole("button", { name: "Confirm Start Day" }).click();
  await expect(startDay.getByText("Priorities acknowledged.")).toBeVisible();

  const availableWork = page.getByRole("region", { name: "Recommended next work" });
  await availableWork.getByRole("button", { name: "Find next work" }).click();
  await expect(availableWork.getByText(claimableTaskTitle)).toBeVisible();
  await expect(availableWork.locator("article").filter({ hasText: claimableTaskTitle }).getByText(/Recommended because/)).toBeVisible();
  await availableWork.getByLabel(`Decline ${declinedTaskTitle}`).selectOption("NEED_MANAGER_DIRECTION");
  await expect(availableWork.getByRole("status")).toContainText("better fit or direction");
  await availableWork.locator("article").filter({ hasText: claimableTaskTitle }).getByRole("button", { name: "Claim" }).click();
  await expect(availableWork.getByRole("status")).toContainText("is now assigned to you");
  await expect.poll(async () => prisma.task.findUnique({ where: { id: claimableTask.id }, select: { assignedUser: { select: { email: true } }, isClaimable: true } })).toEqual({ assignedUser: { email: staffEmail }, isClaimable: false });
});

test("concurrent available-work claims produce one owner and expire the loser", async ({ page }) => {
  test.setTimeout(60_000);
  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: managerEmail } });
  const boardDay = await prisma.boardDay.findUniqueOrThrow({ where: { date: new Date("2026-07-11T00:00:00.000Z") } });
  const staffDays = await prisma.staffDay.findMany({ where: { boardDayId: boardDay.id, userId: { not: manager.id } }, take: 2, orderBy: { userId: "asc" } });
  expect(staffDays).toHaveLength(2);
  const task = await prisma.task.create({ data: { boardDayId: boardDay.id, title: "E2E concurrent claim", assignedUserId: manager.id, status: "NOT_STARTED", priority: "HIGH", dueAt: new Date("2026-07-11T23:30:00.000Z"), sourceType: "MANAGER", workflowArea: "ADMIN", isClaimable: true } });
  const recommendations = await Promise.all(staffDays.map((staffDay, index) => prisma.workRecommendation.create({ data: { staffDayId: staffDay.id, taskId: task.id, rank: 1, score: 50 - index, scoreBreakdown: {}, explanation: "Eligible concurrency test work." } })));
  const repository = createAvailableWorkRepository();
  const results = await Promise.allSettled(recommendations.map((recommendation, index) => repository.claimRecommendation(recommendation.id, staffDays[index]!.userId, new Date("2026-07-11T15:00:00.000Z"))));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  const persistedTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  expect(staffDays.map((staffDay) => staffDay.userId)).toContain(persistedTask.assignedUserId);
  const persistedRecommendations = await prisma.workRecommendation.findMany({ where: { taskId: task.id } });
  expect(persistedRecommendations.filter((item) => item.status === "CLAIMED")).toHaveLength(1);
  expect(persistedRecommendations.filter((item) => item.status === "EXPIRED")).toHaveLength(1);
});

test("staff can submit an auto-drafted end-of-day handoff", async ({ page }) => {
  test.setTimeout(60_000);
  await login(page, managerEmail);
  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: staffEmail } });
  const boardDay = await prisma.boardDay.findUniqueOrThrow({ where: { date: new Date("2026-07-11T00:00:00.000Z") } });
  const carryoverTask = await prisma.task.create({ data: { boardDayId: boardDay.id, title: "E2E carryover customer approval", description: "Customer approval remains outstanding.", assignedUserId: staff.id, status: "BLOCKED", priority: "HIGH", dueAt: new Date("2026-07-11T18:00:00.000Z"), sourceType: "MANAGER", workflowArea: "SALES", blockerReason: "Customer unavailable" } });
  await prisma.taskComment.create({ data: { taskId: carryoverTask.id, authorUserId: staff.id, body: "Call customer tomorrow at 9 AM." } });
  await logout(page);
  await login(page, staffEmail);
  await page.goto("/my-tasks");
  const startDay = page.getByRole("region", { name: "Start Day accountability" });
  await startDay.getByLabel("I reviewed today's tasks and top priorities.").check();
  await startDay.getByRole("button", { name: "Confirm Start Day" }).click();
  const handoff = page.getByRole("region", { name: "End-of-day handoff" });
  await handoff.getByRole("button", { name: "Prepare handoff" }).click();
  await expect(handoff.getByText("E2E carryover customer approval")).toBeVisible();
  await expect(handoff.getByText("Call customer tomorrow at 9 AM.")).toBeVisible();
  await handoff.getByLabel("This generated handoff accurately reflects my work today.").check();
  await handoff.getByLabel("Additional handoff context").fill("Customer requested a morning callback.");
  await handoff.getByLabel("Tomorrow follow-up").fill("Call at 9 AM and document approval status.");
  await handoff.getByRole("button", { name: "Submit handoff" }).click();
  await expect(handoff.getByRole("status")).toContainText("version 1 submitted");
  const report = await prisma.staffDailyReport.findFirstOrThrow({ where: { staffDay: { boardDayId: boardDay.id, userId: staff.id } } });
  expect(report.version).toBe(1);
  expect(report.tomorrowFollowUp).toContain("9 AM");
  expect(JSON.stringify(report.sourceSnapshot)).toContain(carryoverTask.id);
  await logout(page);
  await login(page, managerEmail);
  const onBehalf = await page.evaluate(async ({ userId }) => {
    const response = await fetch(`/api/my-day/handoff?date=2026-07-11&userId=${encodeURIComponent(userId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accuracyConfirmed: true, onBehalfReason: "Staff requested manager submission after confirming the handoff." }) });
    return { status: response.status, payload: await response.json() as { report?: { version: number } } };
  }, { userId: staff.id });
  expect(onBehalf.status).toBe(200);
  expect(onBehalf.payload.report?.version).toBe(2);
  const generateNextBoard = () => page.evaluate(async () => { const response = await fetch("/api/board/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boardDate: "2026-07-12" }) }); return response.status; });
  expect(await generateNextBoard()).toBe(200);
  expect(await generateNextBoard()).toBe(200);
  const carryovers = await prisma.task.findMany({ where: { boardDay: { is: { date: new Date("2026-07-12T00:00:00.000Z") } }, carryoverSourceTaskId: carryoverTask.id } });
  expect(carryovers).toHaveLength(1);
  expect(carryovers[0]).toMatchObject({ assignedUserId: staff.id, blockerReason: "Customer unavailable", carryoverSourceTaskId: carryoverTask.id });
  expect(carryovers[0]!.description).toContain("Call customer tomorrow at 9 AM.");
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
    }, { timeout: 20_000 })
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
