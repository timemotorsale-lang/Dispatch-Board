export function getBoardReadErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Board access required.") {
    return 403;
  }

  if (
    message === "Board date must use YYYY-MM-DD format." ||
    message === "Board date must be a valid calendar date."
  ) {
    return 400;
  }

  return 500;
}

export function createBoardNotFoundMessage(boardDate: string) {
  return `No board exists for ${boardDate} yet.`;
}
