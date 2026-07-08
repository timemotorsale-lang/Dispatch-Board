export type BoardGenerationActionFeedback =
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
