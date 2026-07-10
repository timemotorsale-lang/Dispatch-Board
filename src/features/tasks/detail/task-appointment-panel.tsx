"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { TaskReadModel } from "@/server/services/task-read";

type TaskAppointmentPanelProps = {
  canCreateAppointment: boolean;
  task: TaskReadModel;
};

type TaskAppointmentResponse =
  | {
      appointment?: {
        appointmentId: string;
        appointmentNumber: string;
        commandStatus: string;
        createdTaskLinkCount: number;
      };
      error?: string;
    }
  | null;

function createClientIdempotencyKey(taskId: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `task-appointment-${taskId}-${randomPart}`;
}

function formatAppointmentStatus(appointment: TaskReadModel["appointmentLinks"][number]) {
  if (appointment.bookingStatus === "DRAFT" || appointment.bookingStatus === "PENDING_APPROVAL") {
    return "Draft";
  }

  if (appointment.bookingStatus === "COMPLETED") {
    return "Completed";
  }

  if (appointment.attendanceStatus === "NO_SHOW") {
    return "No Show";
  }

  if (appointment.executionStatus === "IN_PROGRESS" || appointment.executionStatus === "WAITING") {
    return "In Progress";
  }

  if (appointment.executionStatus === "FINISHED") {
    return "Ready for Outcome";
  }

  return "Scheduled";
}

function formatAppointmentTime(appointment: TaskReadModel["appointmentLinks"][number]) {
  if (!appointment.startsAt) {
    return "Unscheduled draft";
  }

  const startsAt = new Date(appointment.startsAt);
  const endsAt = appointment.endsAt ? new Date(appointment.endsAt) : null;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago"
  }).format(startsAt);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago"
  }).format(startsAt);

  if (!endsAt) {
    return `${dateLabel} at ${startLabel}`;
  }

  const endLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago"
  }).format(endsAt);

  return `${dateLabel}, ${startLabel} - ${endLabel}`;
}

function getAppointmentBoardHref(taskId: string, appointmentNumber?: string | null) {
  const params = new URLSearchParams({
    sourceTask: taskId
  });

  if (appointmentNumber) {
    params.set("appointment", appointmentNumber);
  }

  return `/appointments?${params.toString()}`;
}

export function TaskAppointmentPanel({ canCreateAppointment, task }: TaskAppointmentPanelProps) {
  const router = useRouter();
  const defaultReason = useMemo(
    () => `Task requires a meeting or appointment before work can continue: ${task.title}.`,
    [task.title]
  );
  const [title, setTitle] = useState(`Appointment for ${task.title}`);
  const [reasonNotes, setReasonNotes] = useState(defaultReason);
  const [createdAppointmentNumber, setCreatedAppointmentNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    const trimmedTitle = title.trim();
    const trimmedReason = reasonNotes.trim();

    if (!trimmedReason) {
      setErrorMessage("Please document the reason before creating the appointment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setCreatedAppointmentNumber(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idempotencyKey: createClientIdempotencyKey(task.id),
          reasonNotes: trimmedReason,
          title: trimmedTitle || undefined
        })
      });
      const result = (await response.json().catch(() => null)) as TaskAppointmentResponse;

      if (!response.ok || !result?.appointment) {
        setErrorMessage(result?.error ?? "Unable to create an appointment from this task right now.");
        return;
      }

      setCreatedAppointmentNumber(result.appointment.appointmentNumber);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create an appointment from this task right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="enterprise-detail-card task-workspace-rail-card task-appointment-card">
      <span className="task-workspace-rail-eyebrow">Appointment</span>
      <h2>Create Appointment</h2>
      <p className="task-workspace-rail-note">
        Create a draft appointment linked to this task. Scheduling and conflict checks happen from
        the Appointment Board before it becomes a live appointment.
      </p>

      {canCreateAppointment ? (
        <>
          <div className="task-workspace-field-grid task-appointment-field-grid">
            <label className="field">
              <span>Appointment Title</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setErrorMessage(null);
                }}
              />
            </label>
            <label className="field">
              <span>Documented Reason</span>
              <textarea
                rows={4}
                value={reasonNotes}
                onChange={(event) => {
                  setReasonNotes(event.target.value);
                  setErrorMessage(null);
                }}
              />
            </label>
          </div>

          <div className="my-task-actions task-workspace-rail-actions">
            <button
              className="pill pill-primary"
              disabled={isSubmitting || !reasonNotes.trim()}
              onClick={() => void submit()}
              type="button"
            >
              {isSubmitting ? "Creating..." : "Create linked draft"}
            </button>
            <Link className="pill pill-secondary" href={getAppointmentBoardHref(task.id)}>
              Open Board
            </Link>
          </div>
        </>
      ) : (
        <p className="task-workspace-rail-note">
          Only a manager or the assigned task owner can create an appointment from this task.
        </p>
      )}

      {createdAppointmentNumber ? (
        <div className="notice notice-success my-task-inline-notice" role="status">
          <p>Draft appointment {createdAppointmentNumber} was created and linked to this task.</p>
          <Link
            className="pill pill-secondary task-appointment-success-link"
            href={getAppointmentBoardHref(task.id, createdAppointmentNumber)}
          >
            Schedule on Appointment Board
          </Link>
        </div>
      ) : null}

      {task.appointmentLinks.length > 0 ? (
        <div className="task-linked-appointments" aria-label="Linked appointments">
          <div className="task-linked-appointments-header">
            <strong>Linked Appointments ({task.appointmentLinks.length})</strong>
            <span>Task handoff</span>
          </div>
          {task.appointmentLinks.map((appointment) => (
            <article className="task-linked-appointment-row" key={appointment.id}>
              <div>
                <strong>{appointment.appointmentTitle}</strong>
                <span>
                  {appointment.appointmentNumber} · {formatAppointmentStatus(appointment)}
                </span>
                <small>{formatAppointmentTime(appointment)}</small>
                {appointment.explanation ? <small>{appointment.explanation}</small> : null}
              </div>
              <Link
                className="pill pill-secondary"
                href={getAppointmentBoardHref(task.id, appointment.appointmentNumber)}
              >
                Open on Board
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="task-workspace-rail-note">
          No appointment is linked yet. Create a draft when this task needs customer-facing scheduled time.
        </p>
      )}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
