"use client";

import { useEffect, useRef, useState } from "react";

export function VinCamera({ onCapture, onClose }: { onCapture: (vin: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const capture = useRef(onCapture);
  const [error, setError] = useState("");
  useEffect(() => { capture.current = onCapture; }, [onCapture]);
  useEffect(() => {
    let disposed = false;
    let controls: { stop: () => void } | undefined;
    const element = video.current;
    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (disposed || !element) return;
        const reader = new BrowserMultiFormatReader();
        const active = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, element, result => {
          const vin = result?.getText().trim().toUpperCase().match(/(?:^|[^A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?:$|[^A-Z0-9])/)?.[1];
          if (vin && !disposed) { disposed = true; controls?.stop(); capture.current(vin); }
        });
        if (disposed) active.stop(); else controls = active;
      } catch { if (!disposed) setError("Camera unavailable or permission denied. Close the camera and type the VIN instead."); }
    }
    void start();
    return () => {
      disposed = true;
      controls?.stop();
      const stream = element?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);
  return <div className="camera"><p>Align the VIN barcode. This reads barcodes, not printed VIN text. Camera access needs HTTPS or localhost.</p><video ref={video} autoPlay playsInline muted aria-label="Vehicle VIN barcode camera" /><p role="status">{error}</p><button type="button" className="button" onClick={onClose}>Close camera and type instead</button></div>;
}
