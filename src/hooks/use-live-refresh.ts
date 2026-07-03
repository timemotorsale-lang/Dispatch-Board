"use client";

import { useEffect, useEffectEvent, useRef } from "react";

export function useLiveRefresh(onRefresh: () => void) {
  const lastRefreshAtRef = useRef(0);
  const runRefresh = useEffectEvent(() => {
    if (document.visibilityState !== "visible" || !navigator.onLine) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAtRef.current < 1000) {
      return;
    }

    lastRefreshAtRef.current = now;
    onRefresh();
  });

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    }

    function handleFocus() {
      runRefresh();
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
