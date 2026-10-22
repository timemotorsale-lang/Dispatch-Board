import { afterEach, describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, createCameraSession } from "@/features/mobile-capture/scanner-camera";

afterEach(() => vi.unstubAllGlobals());

describe("scanner camera lifecycle", () => {
  it("attaches the stream to the mounted video and releases it on close", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    const session = createCameraSession();
    expect(await session.open(video, "environment")).toBe(stream);
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: "environment" } }) }));
    session.stop();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("releases a late permission result after the scanner was closed", async () => {
    const stop = vi.fn();
    let grant!: (stream: MediaStream) => void;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise<MediaStream>((resolve) => { grant = resolve; }) } });
    const video = { srcObject: null, play: vi.fn() } as unknown as HTMLVideoElement;
    const session = createCameraSession();
    const opening = session.open(video, "environment");
    session.stop();
    grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    expect(await opening).toBeNull();
    expect(stop).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("releases the camera when video playback fails", async () => {
    const stop = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    const video = { play: vi.fn().mockRejectedValue(new Error("Playback blocked")) } as unknown as HTMLVideoElement;
    await expect(createCameraSession().open(video, "user")).rejects.toThrow("Playback blocked");
    expect(stop).toHaveBeenCalledOnce();
  });

  it.each([
    ["NotAllowedError", "site settings"], ["NotFoundError", "No usable camera"],
    ["NotReadableError", "Close other apps"], ["UnknownError", "Try again"]
  ])("gives recovery guidance for %s", (name, message) => {
    const error = new Error("Camera failed");
    error.name = name;
    expect(cameraErrorMessage(error)).toContain(message);
  });
});
