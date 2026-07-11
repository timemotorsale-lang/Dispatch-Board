"use client";

import { useEffect, useRef } from "react";

const SESSION_CHECK_INTERVAL_MS = 60_000;

export function SessionHealthGuard() {
  const checkInProgress = useRef(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (!active || checkInProgress.current) {
        return;
      }

      checkInProgress.current = true;

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (active && response.status === 401) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          window.location.replace(
            `/login?reason=session-expired&returnTo=${encodeURIComponent(returnTo)}`
          );
        }
      } catch {
        // A temporary network failure should not force a valid user out of the app.
      } finally {
        checkInProgress.current = false;
      }
    }

    function checkVisibleSession() {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }

    void checkSession();
    const interval = window.setInterval(() => void checkSession(), SESSION_CHECK_INTERVAL_MS);
    window.addEventListener("focus", checkVisibleSession);
    document.addEventListener("visibilitychange", checkVisibleSession);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkVisibleSession);
      document.removeEventListener("visibilitychange", checkVisibleSession);
    };
  }, []);

  return null;
}
