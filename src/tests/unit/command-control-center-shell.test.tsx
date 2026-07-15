import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DispatchOverviewHeader } from "@/features/board/board-dashboard";

describe("Command Control Center shell", () => {
  it("presents the approved Dispatch-local workspace hierarchy", () => {
    const markup = renderToStaticMarkup(<DispatchOverviewHeader />);

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
    const markup = renderToStaticMarkup(<DispatchOverviewHeader activeView="live" isManager />);

    expect(markup).toContain("Live Board");
    expect(markup).toContain("Operate and update today’s work");
    expect(markup).toContain('<a href="/board">Overview</a>');
    expect(markup).toContain('aria-current="page" class="active" href="/board?view=live"');
    expect(markup).toContain('href="/manager-review"');
  });
});
