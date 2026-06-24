import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession } from "./api";

const REFRESH_TOKEN_KEY = "han-note.refresh-token";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export async function getStoredRefreshToken() {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(REFRESH_TOKEN_KEY) ?? null;
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveAuthSession(session: AuthSession) {
  accessToken = session.access_token;
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
}

export async function clearAuthSession() {
  accessToken = null;
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
