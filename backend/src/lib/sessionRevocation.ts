const REVOKED_PREFIX = "revoked:";

export function revokedSessionValue(at = new Date()) {
  return `${REVOKED_PREFIX}${at.toISOString()}`;
}

export function sessionIsRevoked(storedRefreshToken: string | null, tokenIat?: number) {
  if (!storedRefreshToken) return true;
  if (!storedRefreshToken.startsWith(REVOKED_PREFIX)) return false;
  if (tokenIat == null) return true;
  const revokedAt = Date.parse(storedRefreshToken.slice(REVOKED_PREFIX.length));
  if (Number.isNaN(revokedAt)) return true;
  return tokenIat < Math.floor(revokedAt / 1000);
}
