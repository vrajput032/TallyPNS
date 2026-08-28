/** Rotating copy shown while the Render free-tier API wakes up. */
export const COLD_START_MESSAGES = [
  "Loading your data…",
  "The server was napping — Render free tier sleeps after ~15 minutes.",
  "First load after idle can take 30–60 seconds. We're waking it up.",
  "This slowness is the $0 plan, not your Wi‑Fi.",
  "Want instant loads? Upgrade Render to a paid plan. Your partner will thank you.",
  "Fetching from the cloud… Ohio server, Sonipat patience.",
  "Still working — free servers need a coffee break between visits.",
  "Tap here for the next excuse (ahem, explanation).",
] as const;

export const COLD_START_HINT =
  "Paid hosting = no sleep mode. Talk to admin if this drives you crazy.";
