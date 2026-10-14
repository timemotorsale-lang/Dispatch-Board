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

type DeliveryAppointmentDraft = {
  id: string;
  customerReference: string;
  durationMinutes: number;
  localDate: string;
  notes: string;
  startTime: string;
  vehicleReference: string;
};

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

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hourText, minuteText] = time.split(":");
  const date = new Date(Date.UTC(2026, 0, 1, Number.parseInt(hourText ?? "9", 10), Number.parseInt(minuteText ?? "0", 10)));
  date.setUTCMinutes(date.getUTCMinutes() + minutesToAdd);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function defaultTaskLocalDate(task: TaskReadModel) {
  const description = task.description ?? "";
  const slashDate = description.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

  if (slashDate) {
    const month = String(slashDate[1]).padStart(2, "0");
    const day = String(slashDate[2]).padStart(2, "0");
    return `${slashDate[3]}-${month}-${day}`;
  }

  const dueDate = new Date(task.dueAt);
  if (!Number.isNaN(dueDate.getTime())) {
    return dueDate.toISOString().slice(0, 10);
  }

  return task.boardDate;
}

function isDeliveryTask(task: TaskReadModel) {
  const source = `${task.title} ${task.description ?? ""} ${task.workflowArea}`.toLocaleLowerCase();
  return source.includes("deliver") || source.includes("delivery") || source.includes("sold vehicle");
}

function extractDeliveryVehicles(task: TaskReadModel): DeliveryAppointmentDraft[] {
  const description = task.description ?? "";
  const defaultDate = defaultTaskLocalDate(task);
  const segments = description
    .split(/\s+-\s*(?=\d{4}\s)/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => /^\d{4}\s/.test(segment));

  const rows = segments.length
    ? segments
    : task.vehicleReference
      ? [task.vehicleReference]
      : [""];

  return rows.slice(0, 12).map((segment, index) => {
    const detailParts = segment.split(/\s+-\s*/).map((part) => part.trim()).filter(Boolean);
    const vehicleReference = detailParts[0] ?? "";
    const customerReference = detailParts.length > 2 ? detailParts[1] ?? "" : "";
    const notes = detailParts.slice(customerReference ? 2 : 1).join(" - ");

    return {
      id: `delivery-${index + 1}`,
      customerReference,
      durationMinutes: 60,
      localDate: defaultDate,
      notes,
      startTime: addMinutesToTime("09:00", index * 90),
      vehicleReference
    };
  });
}

function getAppointmentSetupHref(task: TaskReadModel) {
  const params = new URLSearchParams({
    action: "new",
    sourceTask: task.id,
    returnTo: `/tasks/${task.id}`,
    title: `Appointment for ${task.title}`,
    reason: `Task requires a meeting or appointment before work can continue: ${task.title}.`
  });

  if (task.customerReference) {
    params.set("customerReference", task.customerReference);
  }

  if (task.vehicleReference) {
    params.set("vehicleReference", task.vehicleReference);
  }

  return `/appointments?${params.toString()}`;
}

export function TaskAppointmentPanel({ canCreateAppointment, task }: TaskAppointmentPanelProps) {
  const router = useRouter();
  const deliveryTask = isDeliveryTask(task);
  const initialDeliveryDrafts = useMemo(() => extractDeliveryVehicles(task), [task]);
  const defaultReason = useMemo(
    () => deliveryTask
      ? `Schedule customer-facing vehicle delivery time for this task and keep each handoff linked to the parent task: ${task.title}.`
      : `Task requires a meeting or appointment before work can continue: ${task.title}.`,
    [deliveryTask, task.title]
  );
  const [title, setTitle] = useState(deliveryTask ? `Vehicle delivery for ${task.title}` : `Appointment for ${task.title}`);
  const [reasonNotes, setReasonNotes] = useState(defaultReason);
  const [createdAppointmentNumber, setCreatedAppointmentNumber] = useState<string | null>(null);
  const [createdDeliveryAppointments, setCreatedDeliveryAppointments] = useState<string[]>([]);
  const [deliveryDrafts, setDeliveryDrafts] = useState<DeliveryAppointmentDraft[]>(initialDeliveryDrafts);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createLinkedAppointment(payload: {
    customerReference?: string;
    deliveryNotes?: string;
    durationMinutes?: number;
    localDate?: string;
    purposeCode?: string;
    reasonNotes: string;
    startTime?: string;
    title?: string;
    vehicleReference?: string;
  }) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idempotencyKey: createClientIdempotencyKey(task.id),
        ...payload
      })
    });
    const result = (await response.json().catch(() => null)) as TaskAppointmentResponse;

    if (!response.ok || !result?.appointment) {
      throw new Error(result?.error ?? "Unable to create an appointment from this task right now.");
    }

    return result.appointment.appointmentNumber;
  }

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
      const appointmentNumber = await createLinkedAppointment({
        purposeCode: deliveryTask ? "APT-VEHICLE-DELIVERY" : undefined,
        reasonNotes: trimmedReason,
        title: trimmedTitle || undefined
      });

      setCreatedAppointmentNumber(appointmentNumber);
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

  async function submitDeliveryDrafts() {
    const validDrafts = deliveryDrafts.filter((draft) => draft.vehicleReference.trim() && draft.localDate && draft.startTime);
    if (!validDrafts.length) {
      setErrorMessage("Add at least one delivery row with vehicle, date, and time.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setCreatedAppointmentNumber(null);
    setCreatedDeliveryAppointments([]);

    try {
      const appointmentNumbers: string[] = [];

      for (const draft of validDrafts) {
        const label = draft.vehicleReference.trim();
        const appointmentNumber = await createLinkedAppointment({
          customerReference: draft.customerReference.trim() || undefined,
          deliveryNotes: draft.notes.trim() || undefined,
          durationMinutes: draft.durationMinutes,
          localDate: draft.localDate,
          purposeCode: "APT-VEHICLE-DELIVERY",
          reasonNotes: [
            `Vehicle delivery block requested from task ${task.title}.`,
            draft.customerReference.trim() ? `Customer: ${draft.customerReference.trim()}.` : null,
            `Vehicle: ${label}.`,
            draft.notes.trim() ? `Delivery notes: ${draft.notes.trim()}.` : null
          ].filter(Boolean).join(" "),
          startTime: draft.startTime,
          title: `Vehicle Delivery - ${label}`,
          vehicleReference: label
        });
        appointmentNumbers.push(appointmentNumber);
      }

      setCreatedDeliveryAppointments(appointmentNumbers);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create delivery appointments right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateDeliveryDraft(id: string, changes: Partial<DeliveryAppointmentDraft>) {
    setDeliveryDrafts((currentDrafts) =>
      currentDrafts.map((draft) => draft.id === id ? { ...draft, ...changes } : draft)
    );
    setErrorMessage(null);
  }

  function addDeliveryDraft() {
    setDeliveryDrafts((currentDrafts) => {
      const lastDraft = currentDrafts[currentDrafts.length - 1];
      return [
        ...currentDrafts,
        {
          id: `delivery-${Date.now()}`,
          customerReference: "",
          durationMinutes: 60,
          localDate: lastDraft?.localDate ?? defaultTaskLocalDate(task),
          notes: "",
          startTime: addMinutesToTime(lastDraft?.startTime ?? "09:00", 90),
          vehicleReference: ""
        }
      ];
    });
  }

  function removeDeliveryDraft(id: string) {
    setDeliveryDrafts((currentDrafts) =>
      currentDrafts.length > 1 ? currentDrafts.filter((draft) => draft.id !== id) : currentDrafts
    );
  }

  return (
    <section className="enterprise-detail-card task-workspace-rail-card task-appointment-card">
      <span className="task-workspace-rail-eyebrow">Appointment</span>
      <h2>{deliveryTask ? "Delivery Appointments" : "Create Appointment"}</h2>
      <p className="task-workspace-rail-note">
        {deliveryTask
          ? "Keep this as the parent delivery task, then create one linked Vehicle Delivery appointment for each actual handoff."
          : "Create a draft appointment linked to this task. Scheduling and conflict checks happen from the Appointment Board before it becomes a live appointment."}
      </p>

      {canCreateAppointment ? (
        <>
          {deliveryTask ? (
            <div className="task-delivery-schedule-planner">
              <div className="task-delivery-schedule-header">
                <div>
                  <strong>Delivery schedule blocks</strong>
                  <span>One calendar block per sold vehicle, all linked back to this task.</span>
                </div>
                <button className="pill pill-secondary" onClick={addDeliveryDraft} type="button">
                  Add delivery
                </button>
              </div>
              <div className="task-delivery-schedule-rows">
                {deliveryDrafts.map((draft, index) => (
                  <article className="task-delivery-schedule-row" key={draft.id}>
                    <span className="task-delivery-row-number">{index + 1}</span>
                    <label className="field">
                      <span>Vehicle</span>
                      <input
                        value={draft.vehicleReference}
                        onChange={(event) => updateDeliveryDraft(draft.id, { vehicleReference: event.target.value })}
                        placeholder="Year make model"
                      />
                    </label>
                    <label className="field">
                      <span>Customer</span>
                      <input
                        value={draft.customerReference}
                        onChange={(event) => updateDeliveryDraft(draft.id, { customerReference: event.target.value })}
                        placeholder="Customer name"
                      />
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input
                        type="date"
                        value={draft.localDate}
                        onChange={(event) => updateDeliveryDraft(draft.id, { localDate: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Time</span>
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(event) => updateDeliveryDraft(draft.id, { startTime: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Minutes</span>
                      <input
                        min={15}
                        step={15}
                        type="number"
                        value={draft.durationMinutes}
                        onChange={(event) => updateDeliveryDraft(draft.id, { durationMinutes: Number.parseInt(event.target.value, 10) || 60 })}
                      />
                    </label>
                    <label className="field task-delivery-notes-field">
                      <span>Readiness / notes</span>
                      <input
                        value={draft.notes}
                        onChange={(event) => updateDeliveryDraft(draft.id, { notes: event.target.value })}
                        placeholder="Packet, windshield, brake, handoff note..."
                      />
                    </label>
                    <button
                      aria-label={`Remove delivery ${index + 1}`}
                      className="task-delivery-remove-button"
                      disabled={deliveryDrafts.length === 1}
                      onClick={() => removeDeliveryDraft(draft.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
              <button
                className="pill pill-primary task-delivery-create-button"
                disabled={isSubmitting}
                onClick={() => void submitDeliveryDrafts()}
                type="button"
              >
                {isSubmitting ? "Creating..." : `Create ${deliveryDrafts.length} delivery draft${deliveryDrafts.length === 1 ? "" : "s"}`}
              </button>
            </div>
          ) : null}

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
              {isSubmitting ? "Creating..." : deliveryTask ? "Create one general draft" : "Create linked draft"}
            </button>
            <Link className="pill pill-secondary" href={getAppointmentBoardHref(task.id)}>
              Open Board
            </Link>
            <Link className="pill pill-secondary" href={getAppointmentSetupHref(task)}>
              Focused setup
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

      {createdDeliveryAppointments.length > 0 ? (
        <div className="notice notice-success my-task-inline-notice" role="status">
          <p>
            Created {createdDeliveryAppointments.length} delivery draft
            {createdDeliveryAppointments.length === 1 ? "" : "s"} linked to this task:{" "}
            {createdDeliveryAppointments.join(", ")}.
          </p>
          <Link
            className="pill pill-secondary task-appointment-success-link"
            href={getAppointmentBoardHref(task.id, createdDeliveryAppointments[0])}
          >
            Schedule on Appointment Board
          </Link>
        </div>
      ) : null}

      {task.appointmentLinks.length > 0 ? (
        <div className="task-linked-appointments" id="task-linked-appointments" aria-label="Linked appointments">
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
