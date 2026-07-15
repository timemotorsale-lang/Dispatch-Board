import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DispatchOverviewHeader } from "@/features/board/board-dashboard";

describe("Command Control Center shell", () => {
  it("presents the approved Dispatch-local workspace hierarchy", () => {
    const markup = renderToStaticMarkup(<DispatchOverviewHeader />);

    expect(markup).toContain("Dispatch Overview");
    expect(markup).toContain("Today&#x27;s operating command");
    expect(markup).toContain('href="/board"');
    expect(markup).toContain('href="/board#live-board"');
    expect(markup).toContain('href="/staff"');
    expect(markup).toContain('href="/activity"');
  });
});
