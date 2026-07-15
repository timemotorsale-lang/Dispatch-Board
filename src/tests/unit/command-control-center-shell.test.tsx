import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DispatchOverviewHeader } from "@/features/board/board-dashboard";

describe("Command Control Center shell", () => {
  it("presents the approved Dispatch-local workspace hierarchy", () => {
    const markup = renderToStaticMarkup(<DispatchOverviewHeader />);

    expect(markup).toContain("Dispatch Overview");
    expect(markup).toContain("Today’s operating command");
    expect(markup).toContain('href="/board"');
    expect(markup).toContain('href="/board?view=live"');
    expect(markup).toContain('href="/staff"');
    expect(markup).toContain('href="/activity"');
  });

  it("keeps a visible return tab to Dispatch Overview from Live Board", () => {
    const markup = renderToStaticMarkup(<DispatchOverviewHeader activeView="live" />);

    expect(markup).toContain("Live Board");
    expect(markup).toContain("Operate and update today’s work");
    expect(markup).toContain('<a href="/board">Dispatch Overview</a>');
    expect(markup).toContain('aria-current="page" class="active" href="/board?view=live"');
  });
});
