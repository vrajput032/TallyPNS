const REVOKED_PREFIX = "revoked:";

/** Rounded down to the second because JWT `iat` has second precision. */
export function revokedSessionValue(at = new Date()) {
  const seconds = Math.floor(at.getTime() / 1000);
  return `${REVOKED_PREFIX}${new Date(seconds * 1000).toISOString()}`;
}

/**
 * Tokens signed before the stored revoke time are rejected; tokens signed later stay valid,
 * so several devices can still share one account after a revoke.
 */
export function sessionIsRevoked(storedRefreshToken: string | null, tokenIat?: number) {
  if (!storedRefreshToken) return true;
  if (!storedRefreshToken.startsWith(REVOKED_PREFIX)) return false;
  const revokedAtMs = Date.parse(storedRefreshToken.slice(REVOKED_PREFIX.length));
  if (Number.isNaN(revokedAtMs) || tokenIat == null) return true;
  return tokenIat * 1000 < revokedAtMs;
}

/** A login must not erase an earlier revoke time, or every older session would come back. */
export function storedTokenAfterLogin(storedRefreshToken: string | null, newRefreshToken: string) {
  return storedRefreshToken?.startsWith(REVOKED_PREFIX) ? storedRefreshToken : newRefreshToken;
}
