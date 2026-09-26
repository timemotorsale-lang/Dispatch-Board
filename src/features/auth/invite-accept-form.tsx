"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PASSWORD_POLICY_DESCRIPTION } from "@/server/auth/password-policy";

type InviteAcceptFormProps = {
  email: string;
  token: string;
};

export function InviteAcceptForm({ email, token }: InviteAcceptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ error: string; success: string }>({ error: "", success: "" });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ error: "", success: "" });

    if (password !== confirmPassword) {
      setMessage({ error: "Password and confirmation must match.", success: "" });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/invites/accept", {
        body: JSON.stringify({ password, token }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        setMessage({ error: payload?.error ?? "Unable to accept this invite right now.", success: "" });
        return;
      }

      setMessage({ error: "", success: "Password created. Sign in to enter your workspace." });
      window.setTimeout(() => router.replace(`/login?email=${encodeURIComponent(email)}&reason=invite-accepted`), 700);
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Staff email</span>
        <input autoComplete="email" readOnly value={email} />
      </label>
      <label className="field">
        <span>Create password</span>
        <input
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder={PASSWORD_POLICY_DESCRIPTION}
          required
          type="password"
          value={password}
        />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>
      {message.error ? <div className="notice notice-danger" role="alert"><p>{message.error}</p></div> : null}
      {message.success ? <div className="notice notice-success" role="status"><p>{message.success}</p></div> : null}
      <button className="pill pill-primary auth-submit" disabled={isPending} type="submit">
        {isPending ? "Creating password..." : "Create password"}
      </button>
      <Link className="pill pill-secondary auth-submit" href="/login">Back to sign in</Link>
    </form>
  );
}
