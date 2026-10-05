const REVOKED_PREFIX = "revoked:";

export function revokedSessionValue(at = new Date()) {
  return `${REVOKED_PREFIX}${at.toISOString()}`;
}

/** True only after logout-all (or a missing token). Multiple devices can stay signed in. */
export function sessionIsRevoked(storedRefreshToken: string | null, _tokenIat?: number) {
  if (!storedRefreshToken) return true;
  return storedRefreshToken.startsWith(REVOKED_PREFIX);
}
