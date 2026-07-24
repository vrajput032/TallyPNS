const PROD_API_URL = "https://tallypns-api.onrender.com/api";
const DEV_API_URL = "http://localhost:4000/api";

/** Production builds never use localhost, even if .env was wrong at build time. */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;

  if (import.meta.env.PROD) {
    if (!fromEnv || /localhost|127\.0\.0\.1/.test(fromEnv)) {
      return PROD_API_URL;
    }
    return fromEnv;
  }

  return fromEnv || DEV_API_URL;
}
