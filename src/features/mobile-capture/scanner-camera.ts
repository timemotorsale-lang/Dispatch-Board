export function cameraErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access is blocked. Allow Camera in your browser’s site settings, then try again. You can also choose a photo or use manual entry.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No usable camera was found. Try another camera, choose a photo, or use manual entry.";
  if (name === "NotReadableError" || name === "AbortError") return "The camera is busy. Close other apps using it, then try again.";
  return "The camera could not start. Try again, choose a photo, or use manual entry.";
}

/** Snapshot the pixels shown by a live camera without relying on ImageCapture support. */
export async function captureCameraFrame(video: HTMLVideoElement, filename: string) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error("Wait for the camera picture, then try again.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the photo. Try again or choose a photo.");
  context.drawImage(video, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
  if (!blob?.size) throw new Error("Could not capture the photo. Try again or choose a photo.");
  return new File([blob], filename, { type: "image/jpeg" });
}

export function createCameraSession() {
  let stopped = false;
  let activeStream: MediaStream | null = null;
  let activeVideo: HTMLVideoElement | null = null;
  return {
    stop() {
      stopped = true;
      activeStream?.getTracks().forEach((track) => track.stop());
      activeStream = null;
      if (activeVideo) activeVideo.srcObject = null;
      activeVideo = null;
    },
    async open(video: HTMLVideoElement, facingMode: string, deviceId = "") {
      const source = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
          ...source, width: { ideal: 1920 }, height: { ideal: 1080 }
        } });
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "OverconstrainedError" || stopped) throw error;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facingMode } } });
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      activeStream = stream;
      activeVideo = video;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        activeStream = null;
        video.srcObject = null;
        activeVideo = null;
        throw error;
      }
      return stopped ? null : stream;
    }
  };
}
