const baseUrl = process.env.APP_BASE_URL?.trim() || "http://app:3000";
const cronSecret = process.env.CRON_SECRET?.trim();
const intervalMs = Number(process.env.CRON_INTERVAL_MS || 15 * 60_000);

if (!cronSecret) {
  throw new Error("CRON_SECRET is required by the production scheduler.");
}

if (!Number.isFinite(intervalMs) || intervalMs < 60_000) {
  throw new Error("CRON_INTERVAL_MS must be a number of at least 60000.");
}

const routes = [
  "/api/cron/generate-board",
  "/api/cron/evaluate-concerns"
];

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function invoke(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(new URL(route, baseUrl), {
      headers: {
        authorization: `Bearer ${cronSecret}`
      },
      signal: controller.signal
    });

    const body = await response.text();
    const summary = body.replace(/\s+/g, " ").slice(0, 500);

    if (!response.ok) {
      throw new Error(`${route} returned ${response.status}: ${summary}`);
    }

    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        route,
        status: response.status,
        result: summary
      })
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function runCycle() {
  for (const route of routes) {
    try {
      await invoke(route);
    } catch (error) {
      console.error(
        JSON.stringify({
          at: new Date().toISOString(),
          route,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }
}

while (true) {
  const startedAt = Date.now();
  await runCycle();
  await delay(Math.max(1_000, intervalMs - (Date.now() - startedAt)));
}
