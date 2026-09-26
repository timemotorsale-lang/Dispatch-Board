"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PASSWORD_POLICY_DESCRIPTION } from "@/server/auth/password-policy";

type PasswordResetFormProps = {
  email: string;
  token: string;
};

export function PasswordResetForm({ email, token }: PasswordResetFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState({ error: "", success: "" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ error: "", success: "" });

    if (password !== confirmPassword) {
      setMessage({ error: "Passwords must match.", success: "" });
      return;
    }

    setPending(true);
    const response = await fetch("/api/auth/password-recovery/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, token })
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);

    if (!response.ok) {
      setMessage({ error: payload?.error ?? "Unable to reset password right now.", success: "" });
      return;
    }

    setMessage({ error: "", success: "Password reset. Sign in with your new password." });
    window.setTimeout(() => router.replace(`/login?email=${encodeURIComponent(email)}&reason=password-reset`), 700);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Email</span>
        <input readOnly value={email} />
      </label>
      <label className="field">
        <span>New password</span>
        <input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <small>{PASSWORD_POLICY_DESCRIPTION}</small>
      </label>
      <label className="field">
        <span>Confirm new password</span>
        <input autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      </label>
      {message.error ? <div className="notice notice-danger" role="alert"><p>{message.error}</p></div> : null}
      {message.success ? <div className="notice" role="status"><p>{message.success}</p></div> : null}
      <button className="pill pill-primary auth-submit" disabled={pending} type="submit">{pending ? "Resetting..." : "Reset password"}</button>
    </form>
  );
}
