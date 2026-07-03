import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, FileSearch, LoaderCircle, RefreshCw } from "lucide-react";

type StateAction = {
  href?: string;
  label: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary";
};

type StateCardProps = {
  actions?: StateAction[];
  eyebrow?: string;
  message: string;
  title: string;
  tone?: "default" | "danger";
  variant?: "empty" | "error" | "loading";
};

const variantIcons = {
  empty: FileSearch,
  error: AlertCircle,
  loading: LoaderCircle
} as const;

function getActionClassName(action: StateAction) {
  return action.tone === "secondary" ? "pill pill-secondary" : "pill pill-primary";
}

function StateActionButton({ action }: { action: StateAction }) {
  if (action.href) {
    return (
      <Link className={getActionClassName(action)} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className={getActionClassName(action)} onClick={action.onClick} type="button">
      {action.label}
    </button>
  );
}

export function StateCard({
  actions,
  eyebrow,
  message,
  title,
  tone = "default",
  variant = "empty"
}: StateCardProps) {
  const Icon = variantIcons[variant];

  return (
    <section
      className={tone === "danger" ? "state-card state-card-danger" : "state-card"}
      role={variant === "error" ? "alert" : "status"}
    >
      <div className="state-card-icon" aria-hidden="true">
        <Icon className={variant === "loading" ? "state-card-spinner" : undefined} size={22} />
      </div>
      <div className="state-card-copy">
        {eyebrow ? <span className="state-card-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {actions?.length ? (
        <div className="state-card-actions">
          {actions.map((action, index) => (
            <StateActionButton action={action} key={`${action.href ?? "button"}:${index}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function LoadingStateCard({
  actions,
  eyebrow,
  message,
  title
}: Omit<StateCardProps, "tone" | "variant">) {
  return <StateCard actions={actions} eyebrow={eyebrow} message={message} title={title} variant="loading" />;
}

export function EmptyStateCard({
  actions,
  eyebrow,
  message,
  title
}: Omit<StateCardProps, "tone" | "variant">) {
  return <StateCard actions={actions} eyebrow={eyebrow} message={message} title={title} variant="empty" />;
}

export function ErrorStateCard({
  actions,
  eyebrow,
  message,
  title
}: Omit<StateCardProps, "tone" | "variant">) {
  return <StateCard actions={actions} eyebrow={eyebrow} message={message} title={title} tone="danger" variant="error" />;
}

export function RetryStateAction({
  label = "Try again",
  onClick,
  tone = "primary"
}: {
  label?: string;
  onClick: () => void;
  tone?: "primary" | "secondary";
}) {
  return {
    label: (
      <span className="state-action-inline">
        <RefreshCw size={16} />
        {label}
      </span>
    ),
    onClick,
    tone
  };
}
