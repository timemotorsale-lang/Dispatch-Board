"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type LoginFormState = {
  email: string;
  password: string;
};

const defaultFormState: LoginFormState = {
  email: "",
  password: ""
};

type LoginFormProps = {
  initialEmail?: string;
  returnTo?: string;
  setupAccepted?: boolean;
  sessionExpired?: boolean;
};

export function LoginForm({ initialEmail = "", returnTo, setupAccepted = false, sessionExpired = false }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({ ...defaultFormState, email: initialEmail });
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...formState, returnTo })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(payload?.error ?? "Unable to sign in right now.");
        return;
      }

      const payload = (await response.json()) as { redirectTo?: string };
      router.replace(payload.redirectTo ?? "/my-tasks");
      router.refresh();
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {sessionExpired ? (
        <div className="notice notice-warning" role="status">
          <p>Your session ended. Sign in again to return to the console you were using.</p>
        </div>
      ) : null}
      {setupAccepted ? (
        <div className="notice notice-success" role="status">
          <p>Password created. Sign in to enter your assigned workspace.</p>
        </div>
      ) : null}
      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          type="email"
          value={formState.email}
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              email: event.target.value
            }))
          }
          placeholder="manager@local.test"
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          type="password"
          value={formState.password}
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              password: event.target.value
            }))
          }
          placeholder="Enter your password"
          required
        />
      </label>

      {errorMessage ? (
        <div className="notice notice-danger" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <button className="pill pill-primary auth-submit" disabled={isPending} type="submit">
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
