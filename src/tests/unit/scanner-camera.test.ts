import { afterEach, describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, captureCameraFrame, createCameraSession } from "@/features/mobile-capture/scanner-camera";

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
    expect(video.srcObject).toBeNull();
  });
  it("opens an explicitly selected camera", async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    await createCameraSession().open(video, "environment", "rear-macro");
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: expect.objectContaining({ deviceId: { exact: "rear-macro" } }) }));
  });
  it("recovers from an unsupported camera constraint using an automatic camera", async () => {
    const error = new Error("Unsupported");
    error.name = "OverconstrainedError";
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    expect(await createCameraSession().open(video, "environment", "unavailable")).toBe(stream);
    expect(getUserMedia).toHaveBeenLastCalledWith({ audio: false, video: { facingMode: { ideal: "environment" } } });
  });
  it("does not retry a denied camera permission", async () => {
    const error = new Error("Denied");
    error.name = "NotAllowedError";
    const getUserMedia = vi.fn().mockRejectedValue(error);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const video = { srcObject: null, play: vi.fn() } as unknown as HTMLVideoElement;
    await expect(createCameraSession().open(video, "environment")).rejects.toThrow("Denied");
    expect(getUserMedia).toHaveBeenCalledOnce();
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

describe("camera shutter", () => {
  const video = { readyState: 2, videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;

  it("returns a named JPEG from the full camera frame", async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0, height: 0, getContext: () => ({ drawImage }),
      toBlob: (done: (blob: Blob) => void, type: string) => done(new Blob(["synthetic photo bytes"], { type }))
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const photo = await captureCameraFrame(video, "id-front.jpg");
    expect([canvas.width, canvas.height]).toEqual([1920, 1080]);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0);
    expect(photo).toMatchObject({ name: "id-front.jpg", type: "image/jpeg", size: 21 });
  });

  it("blocks a shutter press before the first frame and reports a failed image encode", async () => {
    await expect(captureCameraFrame({ ...video, readyState: 1 } as HTMLVideoElement, "photo.jpg")).rejects.toThrow("Wait for the camera picture");
    vi.stubGlobal("document", { createElement: () => ({
      getContext: () => ({ drawImage: vi.fn() }), toBlob: (done: (blob: null) => void) => done(null)
    }) });
    await expect(captureCameraFrame(video, "photo.jpg")).rejects.toThrow("Could not capture the photo");
  });
});
