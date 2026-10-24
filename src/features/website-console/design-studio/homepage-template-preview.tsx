"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import styles from "./homepage-template-preview.module.css";

export function HomepageTemplatePreview({ document: reviewDocument }: { document: string }) {
  const shell = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === shell.current) {
        await document.exitFullscreen();
      } else if (shell.current?.requestFullscreen) {
        await shell.current.requestFullscreen();
      } else {
        setMessage("Full-screen review is unavailable in this browser. You can still scroll and use all review controls below.");
      }
    } catch {
      setMessage("This browser could not open full-screen review. All five templates remain available below.");
    }
  }

  return (
    <div className={styles.shell} ref={shell}>
      <div className={styles.toolbar}>
        <strong>Homepage template review</strong>
        <button type="button" onClick={toggleFullscreen} aria-describedby="homepage-fullscreen-help"><Maximize2 size={16} aria-hidden="true" />Expand / exit full screen</button>
        <span id="homepage-fullscreen-help">Press Escape to leave full screen.</span>
      </div>
      <p className={styles.status} role="status">{message}</p>
      <iframe
        className={styles.preview}
        title="Homepage templates: five desktop and mobile design concepts"
        srcDoc={reviewDocument}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
