"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

type ManualBoardGenerationResponse = {
  status: "success" | "failed";
  boardDate: string;
  generationRunId: string | null;
  createdTaskCount: number | null;
  skippedExistingTaskCount: number | null;
  alreadyExistingTaskCount: number | null;
  summary: string | null;
  errorMessage: string | null;
  latestGeneration: {
    attemptedAt: string;
  } | null;
};

type BoardToolbarProps = {
  initialBoardDate: string;
  isManager: boolean;
};

type FeedbackState =
  | {
      tone: "success";
      message: string;
      detail: string | null;
    }
  | {
      tone: "error";
      message: string;
      detail: string | null;
    }
  | null;

function buildBoardUrl(boardDate: string) {
  return `/board?date=${encodeURIComponent(boardDate)}`;
}

function buildSuccessMessage(payload: ManualBoardGenerationResponse) {
  const createdTaskCount = payload.createdTaskCount ?? 0;
  const skippedTaskCount = payload.skippedExistingTaskCount ?? 0;
  const summaryParts = [
    `${createdTaskCount} tasks created`,
    `${skippedTaskCount} duplicates skipped`
  ];

  return {
    message: "Board generated.",
    detail: payload.summary ?? summaryParts.join(" • ")
  };
}

export function BoardToolbar({ initialBoardDate, isManager }: BoardToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [boardDate, setBoardDate] = useState(initialBoardDate);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function handleDateChange(nextBoardDate: string) {
    setBoardDate(nextBoardDate);
    setFeedback(null);
    router.replace(buildBoardUrl(nextBoardDate));
  }

  function handleGenerate() {
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/board/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          boardDate
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | (ManualBoardGenerationResponse & { error?: string })
        | { error?: string }
        | null;
      const hasStatus = payload && "status" in payload;

      if (!response.ok || (hasStatus && payload.status === "failed")) {
        const detail =
          payload && "errorMessage" in payload && typeof payload.errorMessage === "string"
            ? payload.errorMessage
            : payload?.error ?? "Unable to generate the board right now.";

        setFeedback({
          tone: "error",
          message: "Generation failed.",
          detail
        });
        router.refresh();
        return;
      }

      if (!payload || !("status" in payload) || payload.status !== "success") {
        setFeedback({
          tone: "error",
          message: "Generation failed.",
          detail: "Unable to generate the board right now."
        });
        return;
      }

      const nextFeedback = buildSuccessMessage(payload);

      setFeedback({
        tone: "success",
        message: nextFeedback.message,
        detail: nextFeedback.detail
      });
      router.refresh();
    });
  }

  return (
    <div className="board-toolbar">
      <label className="field board-date-field">
        <span>Board date</span>
        <input
          name="boardDate"
          type="date"
          value={boardDate}
          onChange={(event) => handleDateChange(event.target.value)}
        />
      </label>

      {isManager ? (
        <button className="pill pill-action board-generate-button" disabled={isPending} onClick={handleGenerate} type="button">
          {isPending ? "Generating..." : "Generate Board"}
        </button>
      ) : null}

      {feedback ? (
        <div
          className={feedback.tone === "error" ? "notice notice-danger board-feedback" : "notice board-feedback"}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <p>
            <strong>{feedback.message}</strong>
            {feedback.detail ? ` ${feedback.detail}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
