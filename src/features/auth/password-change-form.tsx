"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PasswordChangeFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialFormState: PasswordChangeFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export function PasswordChangeForm({ mustChangePassword }: { mustChangePassword: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState(initialFormState);
  const [message, setMessage] = useState({ error: "", success: "" });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ error: "", success: "" });

    if (formState.newPassword !== formState.confirmPassword) {
      setMessage({ error: "New password and confirmation must match.", success: "" });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage({ error: payload?.error ?? "Unable to change the password right now.", success: "" });
        return;
      }

      setFormState(initialFormState);
      setMessage({ error: "", success: "Password changed. You can continue to your workspace." });
      router.refresh();
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mustChangePassword ? (
        <div className="notice notice-warning" role="status">
          <p>This temporary password must be changed before regular staff use.</p>
        </div>
      ) : null}

      <label className="field">
        <span>Current password</span>
        <input
          autoComplete="current-password"
          name="currentPassword"
          type="password"
          value={formState.currentPassword}
          onChange={(event) => setFormState((current) => ({ ...current, currentPassword: event.target.value }))}
          required
        />
      </label>

      <label className="field">
        <span>New password</span>
        <input
          autoComplete="new-password"
          name="newPassword"
          type="password"
          value={formState.newPassword}
          onChange={(event) => setFormState((current) => ({ ...current, newPassword: event.target.value }))}
          required
        />
      </label>

      <label className="field">
        <span>Confirm new password</span>
        <input
          autoComplete="new-password"
          name="confirmPassword"
          type="password"
          value={formState.confirmPassword}
          onChange={(event) => setFormState((current) => ({ ...current, confirmPassword: event.target.value }))}
          required
        />
      </label>

      <p className="team-roster-meta">Use at least 12 characters with uppercase, lowercase, number, and symbol.</p>

      {message.error ? (
        <div className="notice notice-danger" role="alert">
          <p>{message.error}</p>
        </div>
      ) : null}
      {message.success ? (
        <div className="notice" role="status">
          <p>{message.success}</p>
        </div>
      ) : null}

      <button className="pill pill-primary auth-submit" disabled={isPending} type="submit">
        {isPending ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
