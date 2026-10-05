const REVOKED_PREFIX = "revoked:";

export function revokedSessionValue(at = new Date()) {
  return `${REVOKED_PREFIX}${at.toISOString()}`;
}

function storedRefreshIat(storedRefreshToken: string): number | undefined {
  const parts = storedRefreshToken.split(".");
  if (parts.length < 2) return undefined;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      iat?: unknown;
    };
    return typeof payload.iat === "number" ? payload.iat : undefined;
  } catch {
    return undefined;
  }
}

/** True when this access/refresh token must not be accepted. */
export function sessionIsRevoked(storedRefreshToken: string | null, tokenIat?: number) {
  if (!storedRefreshToken) return true;
  if (storedRefreshToken.startsWith(REVOKED_PREFIX)) return true;
  if (tokenIat == null) return true;
  const storedIat = storedRefreshIat(storedRefreshToken);
  if (storedIat == null) return false;
  return tokenIat < storedIat;
}
