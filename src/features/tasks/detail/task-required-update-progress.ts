export type RequiredUpdateProgress = {
  missingFieldKeys: string[];
  readyCount: number;
  totalCount: number;
};

export type RequiredUpdateProgressEventDetail = RequiredUpdateProgress & {
  taskId: string;
};

export const EMPTY_REQUIRED_UPDATE_PROGRESS: RequiredUpdateProgress = {
  missingFieldKeys: [],
  readyCount: 0,
  totalCount: 0
};

export function normalizeRequiredUpdateProgress(value: unknown): RequiredUpdateProgress {
  if (!value || typeof value !== "object") {
    return EMPTY_REQUIRED_UPDATE_PROGRESS;
  }

  const candidate = value as Partial<RequiredUpdateProgress>;
  const missingFieldKeys = Array.isArray(candidate.missingFieldKeys)
    ? candidate.missingFieldKeys.filter((key): key is string => typeof key === "string")
    : [];
  const totalCount = typeof candidate.totalCount === "number" && Number.isFinite(candidate.totalCount)
    ? Math.max(0, Math.floor(candidate.totalCount))
    : 0;
  const readyCount = typeof candidate.readyCount === "number" && Number.isFinite(candidate.readyCount)
    ? Math.min(totalCount, Math.max(0, Math.floor(candidate.readyCount)))
    : Math.max(0, totalCount - missingFieldKeys.length);

  return { missingFieldKeys, readyCount, totalCount };
}

export const REQUIRED_UPDATE_PROGRESS_EVENT = "task-required-update-progress";
