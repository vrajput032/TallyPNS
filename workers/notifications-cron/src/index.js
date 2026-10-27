/** Cron expression (UTC) → API path. */
const JOBS = {
  "30 5 * * *": "/api/notifications/cron",
  "30 8 * * *": "/api/notifications/cron/test-broadcast",
  "30 11 * * *": "/api/notifications/cron/running-cost",
  "30 14 * * *": "/api/notifications/cron/indus-po",
};

async function fetchOk(url, options, attempts) {
  let lastError = new Error(`Request failed: ${url}`);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }
  throw lastError;
}

export default {
  async scheduled(controller, env) {
    const path = JOBS[controller.cron];
    if (!path) throw new Error(`No notification job for cron ${controller.cron}`);
    if (!env.NOTIFICATIONS_CRON_SECRET) {
      throw new Error("Missing NOTIFICATIONS_CRON_SECRET");
    }
    const base = env.API_URL || "https://tallypns-api.onrender.com";
    await fetchOk(`${base}/health`, { method: "GET" }, 6);
    const response = await fetchOk(`${base}${path}`, {
      method: "POST",
      headers: { "X-Notifications-Cron-Secret": env.NOTIFICATIONS_CRON_SECRET },
    }, 3);
    console.log(controller.cron, await response.text());
  },
};
