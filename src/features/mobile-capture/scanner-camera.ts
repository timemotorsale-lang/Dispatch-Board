export function cameraErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access is blocked. Allow Camera in your browser’s site settings, then try again. You can also choose a photo or enter the VIN.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No usable camera was found. Try another camera, choose a photo, or enter the VIN.";
  if (name === "NotReadableError" || name === "AbortError") return "The camera is busy. Close other apps using it, then try again.";
  return "The camera could not start. Try again, choose a photo, or enter the VIN.";
}

export function createCameraSession() {
  let stopped = false;
  let activeStream: MediaStream | null = null;
  return {
    stop() {
      stopped = true;
      activeStream?.getTracks().forEach((track) => track.stop());
      activeStream = null;
    },
    async open(video: HTMLVideoElement, facingMode: string) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 }
      } });
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      activeStream = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        throw error;
      }
      return stopped ? null : stream;
    }
  };
}
