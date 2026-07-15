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
  it("presents the approved Dispatch-local workspace hierarchy", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live={false} pathname="/board" user={user()} />
    );

    expect(markup).toContain("Dispatch Overview");
    expect(markup).toContain("Today’s operating command");
    expect(markup).toContain('href="/board">Overview</a>');
    expect(markup).toContain('href="/board?view=live"');
    expect(markup).toContain('href="/my-tasks"');
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain('href="/projects"');
    expect(markup).toContain('href="/appointments"');
    expect(markup).toContain('href="/vehicles"');
    expect(markup).toContain('href="/customers"');
    expect(markup).toContain('href="/staff"');
    expect(markup).toContain('href="/activity"');
    expect(markup).not.toContain('href="/manager-review"');
  });

  it("keeps a visible return tab to Dispatch Overview from Live Board", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live pathname="/board" user={user(true)} />
    );

    expect(markup).toContain("Live Board");
    expect(markup).toContain("Operate and update today’s work");
    expect(markup).toContain('<a href="/board">Overview</a>');
    expect(markup).toContain('aria-current="page" class="active" href="/board?view=live"');
    expect(markup).toContain('href="/manager-review"');
  });

  it("keeps Dispatch navigation active throughout the console", () => {
    const markup = renderToStaticMarkup(
      <DispatchConsoleHeaderView boardDate={null} live={false} pathname="/vehicles/360/unit-1" user={user(true)} />
    );

    expect(markup).toContain("Vehicles");
    expect(markup).toContain('aria-current="page" class="active" href="/vehicles"');
  });
});
