type GreetingNameStyle = "first" | "full";

const DEFAULT_BUSINESS_TIME_ZONE = "America/Chicago";

function getHourInTimeZone(now: Date, timeZone: string) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone
  }).formatToParts(now).find((part) => part.type === "hour")?.value;

  return Number(hour ?? now.getHours());
}

export function getDaypartGreeting(
  now: Date = new Date(),
  timeZone = DEFAULT_BUSINESS_TIME_ZONE
) {
  const hour = getHourInTimeZone(now, timeZone);

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getTimeAwareGreeting(
  name: string,
  options: { nameStyle?: GreetingNameStyle; now?: Date; timeZone?: string } = {}
) {
  const trimmedName = name.trim();
  const displayName = options.nameStyle === "full"
    ? trimmedName
    : trimmedName.split(/\s+/)[0];

  return `${getDaypartGreeting(options.now, options.timeZone)}, ${displayName || "there"}.`;
}
