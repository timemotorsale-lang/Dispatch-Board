import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), note: vi.fn(), task: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/server/services/unified-crm-customer-note-service", () => ({ logUnifiedCrmCustomerNote: mocks.note }));
vi.mock("@/server/services/unified-crm-customer-task-bridge-service", () => ({ createUnifiedCrmCustomerTaskBridge: mocks.task }));

import { POST } from "@/app/api/crm-next/customers/[customerId]/actions/route";
import { UnifiedCrmCustomerNoteError } from "@/server/unified-crm/customer-note-command";
import { UnifiedCrmCustomerTaskBridgeError } from "@/server/unified-crm/customer-task-bridge-command";

const actor = { id: "manager-1", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const context = { params: Promise.resolve({ customerId: "customer-1" }) };
const request = (payload: unknown) => new Request("http://localhost/api/crm-next/customers/customer-1/actions", { method: "POST", body: JSON.stringify(payload) });

describe("CRM Next customer actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRM_NEXT", "REVIEW");
    mocks.actor.mockResolvedValue(actor);
    mocks.note.mockResolvedValue({ noteId: "note-1", duplicate: false });
    mocks.task.mockResolvedValue({ task: { id: "task-1", href: "/tasks/task-1" }, duplicate: false });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses CRM Next availability rather than the unrelated legacy shell flags", async () => {
    vi.stubEnv("UNIFIED_CRM_SHELL_MODE", "OFF");
    vi.stubEnv("UNIFIED_CRM_CUSTOMER_READ_MODE", "OFF");
    const payload = { action: "add-note", body: "Customer asked for a seven-seat vehicle.", visibility: "INTERNAL", idempotencyKey: "note-key" };
    expect((await POST(request(payload), context)).status).toBe(201);
    expect(mocks.note).toHaveBeenCalledWith(actor, "customer-1", payload, { readMode: "REVIEW", shellMode: "REVIEW", commandMode: "REVIEW" });
  });

  it("uses the scoped, audited task service and preserves its saved task link", async () => {
    const response = await POST(request({ action: "new-task", title: "Find seven-seat vehicle", brief: "Call the customer with available options.", dueAt: "2026-10-23T17:00:00Z", idempotencyKey: "task-key" }), context);
    expect(response.status).toBe(201);
    expect(mocks.task).toHaveBeenCalledWith(actor, "customer-1", expect.anything(), { readMode: "REVIEW", shellMode: "REVIEW", bridgeMode: "REVIEW" });
    expect(await response.json()).toMatchObject({ task: { href: "/tasks/task-1" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not broaden authorization when CRM Next is off or the viewer is ineligible", async () => {
    vi.stubEnv("CRM_NEXT", "OFF");
    expect((await POST(request({ action: "add-note" }), context)).status).toBe(403);
    vi.stubEnv("CRM_NEXT", "REVIEW");
    mocks.actor.mockResolvedValue({ ...actor, isActive: false });
    expect((await POST(request({ action: "add-note" }), context)).status).toBe(403);
    mocks.actor.mockResolvedValue(null);
    expect((await POST(request({ action: "add-note" }), context)).status).toBe(401);
    expect(mocks.note).not.toHaveBeenCalled();
  });

  it("rejects malformed and unsupported actions without a write", async () => {
    expect((await POST(request(null), context)).status).toBe(400);
    expect((await POST(request({ action: "send-text" }), context)).status).toBe(400);
    expect(mocks.note).not.toHaveBeenCalled();
    expect(mocks.task).not.toHaveBeenCalled();
  });

  it("preserves record-scope, validation and replay responses", async () => {
    mocks.note.mockRejectedValueOnce(new UnifiedCrmCustomerNoteError("CUSTOMER_NOT_AVAILABLE", "Customer is not available."));
    expect((await POST(request({ action: "add-note" }), context)).status).toBe(404);
    mocks.task.mockRejectedValueOnce(new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", "Enter a task title."));
    expect((await POST(request({ action: "new-task" }), context)).status).toBe(400);
    mocks.note.mockResolvedValueOnce({ noteId: "note-1", duplicate: true });
    expect((await POST(request({ action: "add-note" }), context)).status).toBe(200);
  });

  it("does not expose unexpected database errors", async () => {
    mocks.note.mockRejectedValueOnce(new Error("private database connection details"));
    const response = await POST(request({ action: "add-note" }), context);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private database");
  });
});
