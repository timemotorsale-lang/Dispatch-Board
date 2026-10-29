import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ current: vi.fn(), settings: vi.fn(), read: vi.fn(), command: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.current }));
vi.mock("@/server/services/app-settings-service", () => ({ getGenerationSettings: mocks.settings }));
vi.mock("@/server/dispatch/read", () => ({ readDispatchTeam: mocks.read }));
vi.mock("@/server/dispatch/command", () => ({ executeDispatchCommand: mocks.command }));
import { GET, POST } from "@/app/api/dispatch/team/route";
describe("team activity API boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.current.mockResolvedValue({id:"staff"}); mocks.settings.mockResolvedValue({timezone:"America/Chicago"}); mocks.read.mockResolvedValue({rows:[]}); mocks.command.mockResolvedValue({state:"PENDING"}); });
  it("rejects unauthenticated reads before loading organization settings", async () => {
    mocks.current.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/dispatch/team"))).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it("requires a same-origin write even when a browser has a session cookie", async () => {
    const result = await POST(new Request("http://localhost/api/dispatch/team", {method:"POST",headers:{origin:"https://other.invalid"},body:"{}"}));
    expect(result.status).toBe(403); expect(mocks.command).not.toHaveBeenCalled();
  });
  it("bounds writes and invokes the authenticated command rather than trusting a submitted staff ID", async () => {
    const request = new Request("http://localhost/api/dispatch/team", {method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify({action:"REQUEST_HANDOFF",userId:"other"})});
    expect((await POST(request)).status).toBe(200);
    expect(mocks.command).toHaveBeenCalledWith({id:"staff"}, {action:"REQUEST_HANDOFF",userId:"other"});
  });
  it("does not execute oversized updates", async () => {
    expect((await POST(new Request("http://localhost/api/dispatch/team",{method:"POST",headers:{origin:"http://localhost"},body:"x".repeat(12001)}))).status).toBe(413);
    expect(mocks.command).not.toHaveBeenCalled();
  });
});
