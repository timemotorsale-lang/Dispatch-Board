import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DispatchConsoleHeaderView } from "@/components/layout/dispatch-console-header";
import type { AuthenticatedUser } from "@/server/auth/store";

function user(manager = false): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Alex Operator",
    email: "alex@example.test",
    isActive: true,
    roles: manager ? ["General Manager"] : ["Staff"],
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

describe("Command Control Center shell", () => {
  it("presents only the current Dispatch workspace hierarchy", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live={false} pathname="/board" user={user(true)} />
    );

    expect(markup).toContain("Dispatch Overview");
    expect(markup).toContain("Today’s operating command");
    expect(markup).toContain('href="/command-center">CCC Home</a>');
    expect(markup).toContain('aria-current="page" class="active dispatch-console-root" href="/board">Dispatch Board');
    expect(markup).not.toContain('href="/my-tasks"');
    expect(markup).not.toContain('href="/tasks"');
  });

  it("shows only CCC Home, Dispatch Board, and Live Board in the Live Board workspace", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live pathname="/board" user={user(true)} />
    );

    expect(markup).toContain("Live Board");
    expect(markup).toContain("Operate and update today’s work");
    expect(markup).toContain('<a href="/command-center">CCC Home</a>');
    expect(markup).toContain('class="dispatch-console-root" href="/board">Dispatch Board');
    expect(markup).toContain('aria-current="page" class="active" href="/board?view=live"');
    expect(markup).not.toContain('href="/my-tasks"');
  });

  it("shows only the active workspace in the Dispatch header", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live={false} pathname="/vehicles/360/unit-1" user={user(true)} />
    );

    expect(markup).toContain("Vehicles");
    expect(markup).toContain('aria-current="page" class="active" href="/vehicles"');
    expect(markup).toContain('href="/command-center">CCC Home</a>');
    expect(markup).not.toContain('href="/my-tasks"');
    expect(markup).not.toContain('href="/tasks"');
  });

  it("scopes general staff to the safe My Work workspace", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate="2026-07-19" live={false} pathname="/my-tasks" user={user()} />
    );

    expect(markup).toContain('href="/my-tasks">My Work</a>');
    expect(markup).toContain('aria-current="page" class="active" href="/my-tasks">My Work</a>');
    expect(markup).not.toContain('href="/command-center"');
    expect(markup).not.toContain('href="/board');
    expect(markup).not.toContain('href="/projects"');
    expect(markup).not.toContain('href="/appointments"');
  });

  it("uses the Sales family as the active top workspace for department views", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView
        boardDate="2026-07-19"
        department="MARKETING"
        live={false}
        pathname="/tasks"
        user={{ ...user(), roles: ["Marketing/Advertisement Manager"] }}
      />
    );

    expect(markup).toContain("Campaign, content, and audience work.");
    expect(markup).toContain('aria-current="page" class="active" href="/tasks">Marketing</a>');
  });
});
