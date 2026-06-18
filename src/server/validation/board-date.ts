export function normalizeBoardDate(boardDate: string) {
  const normalizedBoardDate = boardDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBoardDate)) {
    throw new Error("Board date must use YYYY-MM-DD format.");
  }

  const parsedBoardDate = new Date(`${normalizedBoardDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedBoardDate.getTime()) ||
    parsedBoardDate.toISOString().slice(0, 10) !== normalizedBoardDate
  ) {
    throw new Error("Board date must be a valid calendar date.");
  }

  return normalizedBoardDate;
}
