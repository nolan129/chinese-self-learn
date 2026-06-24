import type { AuthSession } from "./api";

const REFRESH_TOKEN_KEY = "han-note.refresh-token";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAuthSession(session: AuthSession) {
  accessToken = session.access_token;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
}

export function clearAuthSession() {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
