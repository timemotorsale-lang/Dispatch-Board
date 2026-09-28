import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, create, findFirst, getTaskReadModelById } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  getTaskReadModelById: vi.fn()
}));

vi.mock("@/server/db/client", () => ({ prisma: { taskAttachment: { findMany, create, findFirst } } }));
vi.mock("@/server/services/task-read", () => ({ getTaskReadModelById }));

import { getTaskAttachment, listTaskAttachments, uploadTaskAttachment, validateTaskAttachment } from "@/server/services/task-attachments";

const user = { id: "staff-1" } as Parameters<typeof listTaskAttachments>[0];
const stamp = new Date("2026-09-28T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  getTaskReadModelById.mockResolvedValue({ id: "task-1" });
});

describe("task attachments", () => {
  it("stores each selected file as bytes and returns retrievable links", async () => {
    create.mockImplementation(async ({ data }) => ({
      id: `attachment-${data.fileName}`,
      taskId: data.taskId,
      fileName: data.fileName,
      contentType: data.contentType,
      fileSizeBytes: data.fileSizeBytes,
      createdAt: stamp
    }));
    const files = ["photo.png", "report.pdf"].map((name) => new File(["contents"], name, {
      type: name.endsWith("png") ? "image/png" : "application/pdf"
    }));
    const results = await Promise.all(files.map((file) => uploadTaskAttachment(user, "task-1", file)));

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data.fileData).toEqual(new Uint8Array(new TextEncoder().encode("contents")));
    expect(results[0].viewHref).toContain("/api/tasks/task-1/attachments/attachment-photo.png");
    expect(results[1].downloadHref).toContain("?download=1");
  });

  it("lists saved documents without loading their bytes", async () => {
    findMany.mockResolvedValue([{ id: "file-1", taskId: "task-1", fileName: "report.pdf", contentType: "application/pdf", fileSizeBytes: 7, createdAt: stamp }]);
    const result = await listTaskAttachments(user, "task-1");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: "task-1" }, select: expect.not.objectContaining({ fileData: true }) }));
    expect(result[0].fileName).toBe("report.pdf");
  });

  it("only opens a file when it belongs to the requested task", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getTaskAttachment(user, "task-1", "file-other-task")).rejects.toThrow("Document not found.");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "file-other-task", taskId: "task-1" } });
  });

  it("rejects unsupported or oversized files", () => {
    expect(() => validateTaskAttachment(new File(["x"], "script.html", { type: "text/html" }))).toThrow("Choose a PDF");
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
    expect(() => validateTaskAttachment(oversized)).toThrow("10 MB");
  });
});
