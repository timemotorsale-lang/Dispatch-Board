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
    href: "/my-tasks",
    title: "My Tasks",
    description: "Staff-focused assigned-work view with quick status updates and mobile-friendly cards."
  },
  {
    href: "/tasks",
    title: "Tasks",
    description: "Shared task routes, including the task detail surface used by My Tasks and the board."
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Protected manager settings for generation time, timezone, and business-day rules."
  }
] as const;

