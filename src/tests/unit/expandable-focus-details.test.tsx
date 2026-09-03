import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpandableFocusDetails } from "@/features/advisor/expandable-focus-details";

describe("expandable daily focus details", () => {
  it("keeps the full outcome and saved context in a keyboard-accessible disclosure", () => {
    const html = renderToStaticMarkup(<ExpandableFocusDetails item={{ outcome: "Authorization needed: RO-0691C247 · Complete customer approval", priority: "CRITICAL", mustCloseToday: true, progressUpdate: "Called customer.\nWaiting for estimate approval.", riskNote: "Parts order on hold", supportNeeded: "Manager follow-up", convertedTaskId: "task-1" }} />);
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("Read details");
    expect(html).toContain("Complete customer approval");
    expect(html).toContain("Waiting for estimate approval.");
    expect(html).toContain("Parts order on hold");
    expect(html).toContain("Manager follow-up");
    expect(html).toContain('href="/tasks/task-1"');
    expect(html).not.toContain(" open=");
  });
  it("shows an honest empty-progress state for an outcome without a linked task", () => {
    const html = renderToStaticMarkup(<ExpandableFocusDetails item={{ outcome: "Review checklist", priority: "HIGH", mustCloseToday: false }} />);
    expect(html).toContain("No progress update saved yet.");
    expect(html).not.toContain("Open linked task");
  });
});
