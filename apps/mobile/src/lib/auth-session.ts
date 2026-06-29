import type { AuthSession } from "./api";

const REFRESH_TOKEN_KEY = "han-note.refresh-token";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export async function getStoredRefreshToken() {
  return globalThis.localStorage?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export async function saveAuthSession(session: AuthSession) {
  accessToken = session.access_token;
  globalThis.localStorage?.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
}

export async function clearAuthSession() {
  accessToken = null;
  globalThis.localStorage?.removeItem(REFRESH_TOKEN_KEY);
}
