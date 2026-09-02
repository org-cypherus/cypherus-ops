export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jwtExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" ? payload.exp : null;
}

/** JWT de staff Cypherus: claim `typ=platform`. Token de tenant não tem esse claim. */
export function isPlatformAccessToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return decodeJwtPayload(token)?.typ === "platform";
}

export function resolvePlatformUpstreamPath(path: string, accessToken: string | null | undefined) {
  if (!isPlatformAccessToken(accessToken)) return path;
  if (path === "v1/auth/refresh") return "v1/platform/auth/refresh";
  if (path === "v1/auth/logout") return "v1/platform/auth/logout";
  return path;
}
