export function cameraErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access is blocked. Allow Camera in your browser’s site settings, then try again. You can also choose a photo or use manual entry.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No usable camera was found. Try another camera, choose a photo, or use manual entry.";
  if (name === "NotReadableError" || name === "AbortError") return "The camera is busy. Close other apps using it, then try again.";
  return "The camera could not start. Try again, choose a photo, or use manual entry.";
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
