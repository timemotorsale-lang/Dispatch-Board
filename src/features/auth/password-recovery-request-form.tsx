"use client";

import { useState } from "react";

export function PasswordRecoveryRequestForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const response = await fetch("/api/auth/password-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    setPending(false);
    setMessage(payload?.message ?? "If that email belongs to an active staff account, a manager can issue a secure reset link.");
    if (response.ok) {
      setEmail("");
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Staff email</span>
        <input autoComplete="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@company.com" required />
      </label>
      {message ? <div className="notice" role="status"><p>{message}</p></div> : null}
      <button className="pill pill-primary auth-submit" disabled={pending} type="submit">{pending ? "Sending request..." : "Request manager recovery"}</button>
    </form>
  );
}
