const PRODUCTION_ORIGINS = ["https://tallypns.pages.dev"] as const;

const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"] as const;

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }

  return process.env.NODE_ENV === "production"
    ? [...PRODUCTION_ORIGINS]
    : [...DEV_ORIGINS];
}

/** Installed PWAs and Cloudflare preview deploys use tallypns.pages.dev subdomains. */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (getAllowedOrigins().includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "tallypns.pages.dev" || hostname.endsWith(".tallypns.pages.dev");
  } catch {
    return false;
  }
}
