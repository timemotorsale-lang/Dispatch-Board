import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, getTaskAttachment } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getTaskAttachment: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser }));
vi.mock("@/server/services/task-attachments", () => ({ getTaskAttachment }));

import { GET } from "@/app/api/tasks/[id]/attachments/[attachmentId]/route";

const context = { params: Promise.resolve({ id: "task-1", attachmentId: "file-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "staff-1" });
  getTaskAttachment.mockResolvedValue({
    fileName: "photo.png",
    contentType: "image/png",
    fileSizeBytes: 4,
    fileData: new Uint8Array([137, 80, 78, 71])
  });
});

describe("task attachment response", () => {
  it("serves original bytes inline for a viewable image", async () => {
    const response = await GET(new Request("http://localhost/api/tasks/task-1/attachments/file-1"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
    expect(getTaskAttachment).toHaveBeenCalledWith({ id: "staff-1" }, "task-1", "file-1");
  });

  it("downloads files that the browser cannot view inline", async () => {
    getTaskAttachment.mockResolvedValue({
      fileName: "report.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSizeBytes: 2,
      fileData: new Uint8Array([80, 75])
    });
    const response = await GET(new Request("http://localhost/api/tasks/task-1/attachments/file-1"), context);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([80, 75]));
  });

  it("returns an error when the attachment is unavailable", async () => {
    getTaskAttachment.mockRejectedValue(new Error("Document not found."));
    const response = await GET(new Request("http://localhost/api/tasks/task-1/attachments/file-1"), context);
    expect(response.status).toBe(404);
  });
});
