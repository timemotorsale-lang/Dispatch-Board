export const APP_NAME = "Time Motor Sales Dispatch Board";

export const placeholderRoutes = [
  {
    href: "/login",
    title: "Login",
    description: "Staff and manager sign-in for the new session-based auth flow."
  },
  {
    href: "/board",
    title: "Board",
    description: "Protected app shell for the daily dispatch board and later workflow slices."
  },
  {
    href: "/tasks",
    title: "Tasks",
    description: "Protected task workflow surface for future manager and staff views."
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Protected manager settings for generation time, timezone, and business-day rules."
  }
] as const;

