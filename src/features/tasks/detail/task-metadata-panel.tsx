"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TaskReadModel } from "@/server/services/task-read";

type TaskMetadataPanelProps = {
  actorIsManager: boolean;
  task: TaskReadModel;
};

type TaskMetadataResponse =
  | {
      task?: {
        id: string;
        description: string | null;
        dueAt: string;
        vehicleReference: string | null;
        customerReference: string | null;
        updatedAt: string;
      };
      error?: string;
    }
  | null;

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeComparableText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function TaskMetadataPanel({ actorIsManager, task }: TaskMetadataPanelProps) {
  const router = useRouter();
  const [description, setDescription] = useState(task.description ?? "");
  const [vehicleReference, setVehicleReference] = useState(task.vehicleReference ?? "");
  const [customerReference, setCustomerReference] = useState(task.customerReference ?? "");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(task.dueAt));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedDescription = description.trim();
  const trimmedVehicleReference = vehicleReference.trim();
  const trimmedCustomerReference = customerReference.trim();

  const hasChanges =
    trimmedDescription !== normalizeComparableText(task.description) ||
    trimmedVehicleReference !== normalizeComparableText(task.vehicleReference) ||
    trimmedCustomerReference !== normalizeComparableText(task.customerReference) ||
    (actorIsManager && dueAt !== toLocalDateTimeInputValue(task.dueAt));

  async function submit() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, string | null> = {
        description: trimmedDescription,
        vehicleReference: trimmedVehicleReference || null,
        customerReference: trimmedCustomerReference || null
      };

      if (actorIsManager) {
        payload.dueAt = new Date(dueAt).toISOString();
      }

      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as TaskMetadataResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to save task details right now.");
        return;
      }

      setSuccessMessage("Task details saved.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save task details right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="enterprise-detail-card task-workspace-rail-card">
      <h2>Live Task Details</h2>
      <div className="task-workspace-field-grid">
        <label className="field">
          <span>Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
        </label>
        <label className="field">
          <span>Stock / Unit</span>
          <input
            value={vehicleReference}
            onChange={(event) => {
              setVehicleReference(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
        </label>
        <label className="field">
          <span>Customer Reference</span>
          <input
            value={customerReference}
            onChange={(event) => {
              setCustomerReference(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
        </label>
        <label className="field">
          <span>Due Date</span>
          <input
            disabled={!actorIsManager}
            type="datetime-local"
            value={dueAt}
            onChange={(event) => {
              setDueAt(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
        </label>
      </div>

      {!actorIsManager ? (
        <p className="task-workspace-rail-note">
          Assigned staff can update context and references here. Due date changes remain manager-only.
        </p>
      ) : null}

      <div className="my-task-actions task-workspace-rail-actions">
        <button
          className="pill pill-primary"
          disabled={!hasChanges || isSubmitting}
          onClick={() => void submit()}
          type="button"
        >
          {isSubmitting ? "Saving..." : "Save details"}
        </button>
      </div>

      {successMessage ? (
        <div className="notice notice-success my-task-inline-notice" role="status">
          <p>{successMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
