type GreetingNameStyle = "first" | "full";

export function getDaypartGreeting(now: Date = new Date()) {
  const hour = now.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getTimeAwareGreeting(
  name: string,
  options: { nameStyle?: GreetingNameStyle; now?: Date } = {}
) {
  const trimmedName = name.trim();
  const displayName = options.nameStyle === "full"
    ? trimmedName
    : trimmedName.split(/\s+/)[0];

  return `${getDaypartGreeting(options.now)}, ${displayName || "there"}.`;
}
