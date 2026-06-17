"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  function handleLogout() {
    setErrorMessage("");

    startTransition(async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });

      if (!response.ok) {
        setErrorMessage("Unable to sign out right now.");
        return;
      }

      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="logout-stack">
      <button className="pill pill-secondary" disabled={isPending} onClick={handleLogout} type="button">
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? <span className="inline-error">{errorMessage}</span> : null}
    </div>
  );
}
