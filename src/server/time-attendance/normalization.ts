export type TimeAttendanceSourceEventType =
  | "CLOCK_IN"
  | "START_MEAL"
  | "END_MEAL"
  | "CLOCK_OUT";

export type TimeAttendanceSourceEvent = {
  id: string;
  eventType: TimeAttendanceSourceEventType;
  occurredAt: string;
  sequence?: number;
  paid?: boolean | null;
  completelyRelieved?: boolean | null;
};

export type TimeAttendanceIntervalKind = "ATTENDANCE" | "MEAL" | "PAID_WORK";

export type TimeAttendanceInterval = {
  kind: TimeAttendanceIntervalKind;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  sourceEventIds: string[];
  paid: boolean;
  completelyRelieved: boolean | null;
  localDate: string;
  workweekStartDate: string;
};

export type TimeAttendanceNormalizationExceptionCode =
  | "DUPLICATE_EVENT_IGNORED"
  | "MISSING_CLOCK_IN"
  | "MISSING_CLOCK_OUT"
  | "OPEN_MEAL"
  | "MEAL_WITHOUT_ACTIVE_SESSION"
  | "CLOCK_OUT_DURING_OPEN_MEAL"
  | "OVERLAPPING_SESSION"
  | "IMPOSSIBLE_EVENT_ORDER";

export type TimeAttendanceNormalizationException = {
  code: TimeAttendanceNormalizationExceptionCode;
  blocking: boolean;
  message: string;
  sourceEventIds: string[];
};

export type TimeAttendanceNormalizationResult = {
  attendanceIntervals: TimeAttendanceInterval[];
  mealIntervals: TimeAttendanceInterval[];
  paidWorkIntervals: TimeAttendanceInterval[];
  exceptions: TimeAttendanceNormalizationException[];
  totalAttendanceMinutes: number;
  totalMealMinutes: number;
  totalUnpaidMealMinutes: number;
  totalPaidWorkMinutes: number;
};

type OpenMeal = {
  start: NormalizedSourceEvent;
  paid: boolean;
};

type NormalizedSourceEvent = TimeAttendanceSourceEvent & {
  instant: Date;
};

const weekdays = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
] as const;

function requireDate(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }

  return parsed;
}

function requireText(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }
}

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    weekday: "long",
    year: "numeric"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    month: Number(value("month")),
    weekday: value("weekday").toUpperCase(),
    year: Number(value("year"))
  };
}

function addLocalDays(parts: ReturnType<typeof localParts>, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  };
}

function localDateTimeToUtc(input: {
  day: number;
  hour: number;
  minute: number;
  month: number;
  timeZone: string;
  year: number;
}) {
  let guess = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute));
  for (let index = 0; index < 4; index += 1) {
    const observed = localParts(guess, input.timeZone);
    const targetAsUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute
    );
    const delta = targetAsUtc - observedAsUtc;
    if (delta === 0) break;
    guess = new Date(guess.getTime() + delta);
  }

  return guess;
}

function nextLocalDayBoundary(after: Date, timeZone: string) {
  const parts = localParts(after, timeZone);
  const next = addLocalDays(parts, 1);
  return localDateTimeToUtc({ ...next, hour: 0, minute: 0, timeZone });
}

function localDateKey(date: Date, timeZone: string) {
  return localParts(date, timeZone).dateKey;
}

function workweekStartDateKey(date: Date, timeZone: string, startDay: string) {
  const parts = localParts(date, timeZone);
  const currentIndex = weekdays.indexOf(parts.weekday as (typeof weekdays)[number]);
  const startIndex = weekdays.indexOf(startDay.toUpperCase() as (typeof weekdays)[number]);
  const offset = currentIndex >= startIndex
    ? currentIndex - startIndex
    : currentIndex + 7 - startIndex;
  const start = addLocalDays(parts, -offset);
  return `${start.year}-${String(start.month).padStart(2, "0")}-${String(start.day).padStart(2, "0")}`;
}

function splitInterval(input: {
  completelyRelieved: boolean | null;
  end: Date;
  kind: TimeAttendanceIntervalKind;
  paid: boolean;
  sourceEventIds: string[];
  start: Date;
  timeZone: string;
  workweekStartDay: string;
}) {
  const intervals: TimeAttendanceInterval[] = [];
  let cursor = input.start;

  while (cursor < input.end) {
    const boundary = nextLocalDayBoundary(cursor, input.timeZone);
    const segmentEnd = boundary < input.end ? boundary : input.end;
    const durationMinutes = minutesBetween(cursor, segmentEnd);
    if (durationMinutes > 0) {
      intervals.push({
        kind: input.kind,
        startAt: cursor.toISOString(),
        endAt: segmentEnd.toISOString(),
        durationMinutes,
        sourceEventIds: input.sourceEventIds,
        paid: input.paid,
        completelyRelieved: input.completelyRelieved,
        localDate: localDateKey(cursor, input.timeZone),
        workweekStartDate: workweekStartDateKey(cursor, input.timeZone, input.workweekStartDay)
      });
    }
    cursor = segmentEnd;
  }

  return intervals;
}

function addException(
  exceptions: TimeAttendanceNormalizationException[],
  code: TimeAttendanceNormalizationExceptionCode,
  message: string,
  sourceEventIds: string[],
  blocking = true
) {
  exceptions.push({ code, blocking, message, sourceEventIds });
}

function appendPaidWorkAroundMeals(input: {
  attendanceEnd: Date;
  attendanceStart: Date;
  clockEventIds: string[];
  mealIntervals: TimeAttendanceInterval[];
  paidWorkIntervals: TimeAttendanceInterval[];
  timeZone: string;
  workweekStartDay: string;
}) {
  const unpaidMeals = input.mealIntervals
    .filter((meal) => !meal.paid && meal.completelyRelieved)
    .map((meal) => ({
      end: new Date(meal.endAt),
      sourceEventIds: meal.sourceEventIds,
      start: new Date(meal.startAt)
    }))
    .filter((meal) => meal.start >= input.attendanceStart && meal.end <= input.attendanceEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = input.attendanceStart;
  for (const meal of unpaidMeals) {
    if (meal.start > cursor) {
      input.paidWorkIntervals.push(...splitInterval({
        completelyRelieved: null,
        end: meal.start,
        kind: "PAID_WORK",
        paid: true,
        sourceEventIds: [...input.clockEventIds, ...meal.sourceEventIds],
        start: cursor,
        timeZone: input.timeZone,
        workweekStartDay: input.workweekStartDay
      }));
    }
    if (meal.end > cursor) {
      cursor = meal.end;
    }
  }
  if (cursor < input.attendanceEnd) {
    input.paidWorkIntervals.push(...splitInterval({
      completelyRelieved: null,
      end: input.attendanceEnd,
      kind: "PAID_WORK",
      paid: true,
      sourceEventIds: input.clockEventIds,
      start: cursor,
      timeZone: input.timeZone,
      workweekStartDay: input.workweekStartDay
    }));
  }
}

export function normalizeTimeAttendanceEvents(input: {
  events: TimeAttendanceSourceEvent[];
  timeZone: string;
  workweekStartDay?: string;
}): TimeAttendanceNormalizationResult {
  requireText(input.timeZone, "Timezone");
  const workweekStartDay = input.workweekStartDay ?? "SUNDAY";
  if (!weekdays.includes(workweekStartDay.toUpperCase() as (typeof weekdays)[number])) {
    throw new Error("Workweek start day is invalid.");
  }

  const exceptions: TimeAttendanceNormalizationException[] = [];
  const seenIds = new Set<string>();
  const normalized: NormalizedSourceEvent[] = [];

  for (const event of input.events) {
    requireText(event.id, "Event id");
    if (seenIds.has(event.id)) {
      addException(
        exceptions,
        "DUPLICATE_EVENT_IGNORED",
        "A duplicate source event id was ignored.",
        [event.id],
        false
      );
      continue;
    }
    seenIds.add(event.id);
    normalized.push({ ...event, instant: requireDate(event.occurredAt, "Event occurrence") });
  }

  const events = normalized.sort((left, right) => {
    const byTime = left.instant.getTime() - right.instant.getTime();
    if (byTime !== 0) return byTime;
    const bySequence = (left.sequence ?? 0) - (right.sequence ?? 0);
    if (bySequence !== 0) return bySequence;
    return left.id.localeCompare(right.id);
  });

  const attendanceIntervals: TimeAttendanceInterval[] = [];
  const mealIntervals: TimeAttendanceInterval[] = [];
  const paidWorkIntervals: TimeAttendanceInterval[] = [];
  let openClock: NormalizedSourceEvent | null = null;
  let openMeal: OpenMeal | null = null;

  for (const event of events) {
    if (openClock && event.instant < openClock.instant) {
      addException(
        exceptions,
        "IMPOSSIBLE_EVENT_ORDER",
        "A source event occurred before the active clock-in.",
        [openClock.id, event.id]
      );
      continue;
    }

    if (event.eventType === "CLOCK_IN") {
      if (openClock) {
        addException(
          exceptions,
          "OVERLAPPING_SESSION",
          "A clock-in occurred before the prior session was clocked out.",
          [openClock.id, event.id]
        );
        continue;
      }
      openClock = event;
      openMeal = null;
      continue;
    }

    if (!openClock) {
      addException(
        exceptions,
        "MISSING_CLOCK_IN",
        `${event.eventType} occurred without an active clock-in.`,
        [event.id]
      );
      continue;
    }

    if (event.eventType === "START_MEAL") {
      if (openMeal) {
        addException(
          exceptions,
          "OPEN_MEAL",
          "A meal was started before the prior meal was ended.",
          [openMeal.start.id, event.id]
        );
        continue;
      }
      openMeal = { start: event, paid: event.paid === true };
      continue;
    }

    if (event.eventType === "END_MEAL") {
      if (!openMeal) {
        addException(
          exceptions,
          "MEAL_WITHOUT_ACTIVE_SESSION",
          "A meal ended without a matching meal start.",
          [event.id]
        );
        continue;
      }
      if (event.instant <= openMeal.start.instant) {
        addException(
          exceptions,
          "IMPOSSIBLE_EVENT_ORDER",
          "A meal end must be after the meal start.",
          [openMeal.start.id, event.id]
        );
        openMeal = null;
        continue;
      }
      mealIntervals.push(...splitInterval({
        completelyRelieved: event.completelyRelieved === true,
        end: event.instant,
        kind: "MEAL",
        paid: openMeal.paid,
        sourceEventIds: [openMeal.start.id, event.id],
        start: openMeal.start.instant,
        timeZone: input.timeZone,
        workweekStartDay
      }));
      openMeal = null;
      continue;
    }

    if (event.eventType === "CLOCK_OUT") {
      if (openMeal) {
        addException(
          exceptions,
          "CLOCK_OUT_DURING_OPEN_MEAL",
          "The employee clocked out while a meal interval was still open.",
          [openMeal.start.id, event.id]
        );
        openMeal = null;
      }
      if (event.instant <= openClock.instant) {
        addException(
          exceptions,
          "IMPOSSIBLE_EVENT_ORDER",
          "A clock-out must be after the clock-in.",
          [openClock.id, event.id]
        );
        openClock = null;
        continue;
      }
      const clockEventIds = [openClock.id, event.id];
      attendanceIntervals.push(...splitInterval({
        completelyRelieved: null,
        end: event.instant,
        kind: "ATTENDANCE",
        paid: true,
        sourceEventIds: clockEventIds,
        start: openClock.instant,
        timeZone: input.timeZone,
        workweekStartDay
      }));
      appendPaidWorkAroundMeals({
        attendanceEnd: event.instant,
        attendanceStart: openClock.instant,
        clockEventIds,
        mealIntervals,
        paidWorkIntervals,
        timeZone: input.timeZone,
        workweekStartDay
      });
      openClock = null;
      openMeal = null;
    }
  }

  if (openMeal) {
    addException(
      exceptions,
      "OPEN_MEAL",
      "A meal was started but not ended.",
      [openMeal.start.id]
    );
  }
  if (openClock) {
    addException(
      exceptions,
      "MISSING_CLOCK_OUT",
      "A clock-in was not closed by a matching clock-out.",
      [openClock.id]
    );
  }

  const totalAttendanceMinutes = attendanceIntervals.reduce(
    (sum, interval) => sum + interval.durationMinutes,
    0
  );
  const totalMealMinutes = mealIntervals.reduce((sum, interval) => sum + interval.durationMinutes, 0);
  const totalUnpaidMealMinutes = mealIntervals
    .filter((interval) => !interval.paid && interval.completelyRelieved)
    .reduce((sum, interval) => sum + interval.durationMinutes, 0);
  const totalPaidWorkMinutes = paidWorkIntervals.reduce(
    (sum, interval) => sum + interval.durationMinutes,
    0
  );

  return {
    attendanceIntervals,
    mealIntervals,
    paidWorkIntervals,
    exceptions,
    totalAttendanceMinutes,
    totalMealMinutes,
    totalUnpaidMealMinutes,
    totalPaidWorkMinutes
  };
}
