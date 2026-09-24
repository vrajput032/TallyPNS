/** Extract a human-readable message from Axios, RTK rejectWithValue, or Error. */
export function apiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (typeof error === "object" && error !== null) {
    const axiosData = (error as { response?: { data?: unknown } }).response?.data;
    const fromBody = messageFromApiBody(axiosData);
    if (fromBody) return fromBody;

    const payload = (error as { data?: unknown }).data;
    const fromPayload = messageFromApiBody(payload);
    if (fromPayload) return fromPayload;

    if ("message" in error) {
      const message = String((error as { message: unknown }).message ?? "").trim();
      if (message && !/^Request failed with status code \d+$/i.test(message)) {
        return message;
      }
    }
  }

  return fallback;
}

function messageFromApiBody(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (typeof data !== "object" || data === null) return null;

  const error = (data as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) {
    // Prefer first Zod issue when the top-level message is generic.
    if (error === "Validation failed") {
      const issues = (data as { issues?: unknown }).issues;
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          if (typeof issue === "object" && issue !== null && "message" in issue) {
            const message = String((issue as { message: unknown }).message ?? "").trim();
            if (message) return message;
          }
        }
      }
    }
    return error.trim();
  }

  const issues = (data as { issues?: unknown }).issues;
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (typeof issue === "object" && issue !== null && "message" in issue) {
        const message = String((issue as { message: unknown }).message ?? "").trim();
        if (message) return message;
      }
    }
  }

  return null;
}
