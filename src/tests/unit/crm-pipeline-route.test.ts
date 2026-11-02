import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ command: vi.fn(), read: vi.fn(), match: vi.fn(), recover: vi.fn(), import: vi.fn() }));
vi.mock("@/server/crm-next/pipeline-import", () => ({ processPipelineImport: mocks.import, readPipelineImport: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "actor" }) }));
vi.mock("@/server/crm-next/pipeline-service", async () => {
  const actual = await vi.importActual<typeof import("@/server/crm-next/pipeline-service")>("@/server/crm-next/pipeline-service");
  return { ...actual, pipelineCommand: mocks.command, readPipeline: mocks.read, findPipelineMatches: mocks.match };
});
vi.mock("@/server/crm-next/pipeline-worker", () => ({ runPipelineRecovery: mocks.recover }));
import { POST, GET } from "@/app/api/crm-next/pipeline/route";
import { PipelineError } from "@/server/crm-next/pipeline-service";

function request(body: unknown, origin = "http://127.0.0.1:3102") { return new Request("http://localhost:3102/api/crm-next/pipeline", { method: "POST", headers: { origin, host: "127.0.0.1:3102", "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.command.mockResolvedValue({ id: "saved" }); mocks.read.mockResolvedValue({ rows: [] }); });
describe("pipeline route safeguards", () => {
  it("explains missing database setup instead of showing an uncorrectable generic failure", async () => {
    mocks.read.mockRejectedValueOnce(Object.assign(new Error("Missing table"), { code: "P2021" }));
    const response = await GET(new Request("http://localhost/api/crm-next/pipeline"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "P2021", retryable: false, error: expect.stringContaining("apply the pipeline migration") });
  });
  it("explains the required server restart when its database client is stale", async () => {
    mocks.read.mockRejectedValueOnce(new PipelineError("PIPELINE_CLIENT_UPDATE_REQUIRED", "Regenerate the Prisma client and restart the development server.", 503));
    const response = await GET(new Request("http://localhost/api/crm-next/pipeline"));
    expect(await response.json()).toMatchObject({ code: "PIPELINE_CLIENT_UPDATE_REQUIRED", error: expect.stringContaining("restart") });
  });
  it("accepts a legitimate host behind the development proxy", async () => { expect((await POST(request({ action: "CAPTURE" }))).status).toBe(200); expect(mocks.command).toHaveBeenCalledOnce(); });
  it("rejects another site's mutation before invoking commands", async () => { expect((await POST(request({ action: "CAPTURE" }, "https://unrelated.example"))).status).toBe(403); expect(mocks.command).not.toHaveBeenCalled(); });
  it("rejects oversized intake before executing any row", async () => { expect((await POST(request({ action: "CAPTURE", note: "a".repeat(130000 + 2000) }))).status).toBe(413); expect(mocks.command).not.toHaveBeenCalled(); });
  it("returns per-row import failures without claiming every row saved", async () => {
    mocks.import.mockResolvedValueOnce({ results: [{ index: 0, ok: true }, { index: 1, ok: false }] });
    const result = await (await POST(request({ action: "IMPORT", rows: [{ sourceKey: "one" }, { sourceKey: "two" }] }))).json();
    expect(result.results.map((r: { ok: boolean }) => r.ok)).toEqual([true, false]);
    expect(mocks.import.mock.calls[0][1].rows[1].sourceKey).toBe("two");
  });
  it("keeps bulk versions and effect keys per record and reports conflicts", async () => {
    mocks.command.mockResolvedValueOnce({ id: "one" }).mockRejectedValueOnce(new Error("Synthetic conflict"));
    const result = await (await POST(request({ action: "BULK", operation: "FOLLOW_UP", idempotencyKey: "stable-batch", rows: [{ id: "one", expectedVersion: 1 }, { id: "two", expectedVersion: 4 }], fields: { nextActionLabel: "Review" } }))).json();
    expect(result.results.map((r: { ok: boolean }) => r.ok)).toEqual([true, false]);
    expect(mocks.command.mock.calls[0][1]).toMatchObject({ id: "one", expectedVersion: 1, idempotencyKey: "stable-batch:one", action: "FOLLOW_UP" });
    expect(mocks.command.mock.calls[1][1]).toMatchObject({ id: "two", expectedVersion: 4, idempotencyKey: "stable-batch:two" });
  });
  it("does not allow sale or financial operations through bulk tasks", async () => { expect((await POST(request({ action: "BULK", operation: "MARK_SOLD", rows: [{ id: "one" }], idempotencyKey: "batch" }))).status).toBe(400); expect(mocks.command).not.toHaveBeenCalled(); });
  it("keeps matching separate from the authorized workspace query", async () => {
    mocks.match.mockResolvedValue({ items: [] });
    const response = await GET(new Request("http://localhost/api/crm-next/pipeline?match=6125550123"));
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(mocks.match).toHaveBeenCalledWith({ id: "actor" }, "6125550123"); expect(mocks.read).not.toHaveBeenCalled();
  });
});
