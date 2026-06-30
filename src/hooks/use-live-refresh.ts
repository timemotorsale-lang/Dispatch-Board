"use client";

import { useEffect, useEffectEvent } from "react";

type UseLiveRefreshOptions = {
  intervalMs?: number;
};

export function useLiveRefresh(
  onRefresh: () => void,
  options: UseLiveRefreshOptions = {}
) {
  const { intervalMs = 30000 } = options;
  const runRefresh = useEffectEvent(() => {
    if (document.visibilityState !== "visible" || !navigator.onLine) {
      return;
    }

    onRefresh();
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      runRefresh();
    }, intervalMs);

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
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);
}
