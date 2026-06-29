import {
  createApiClient,
  type AnalyzeResponse,
  type AuthSession,
  type AuthUser,
  type Explanation,
  type LoginRequest,
  type NotificationSettings,
  type RegisterRequest,
  type ReviewResult,
  type ReviewTodayResponse,
  type Token,
  type TokenStatus,
  type VocabularyItem
} from "../../../../packages/shared/src/han-note";
import { getAccessToken } from "./auth-session";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

type LocationLike = {
  protocol?: string;
  hostname?: string;
};

function normalizeBaseUrl(value: string | undefined) {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function inferWebBaseUrl() {
  const location = (globalThis as { location?: LocationLike }).location;
  const hostname = location?.hostname?.trim().toLowerCase();
  const protocol = location?.protocol === "http:" ? "http:" : "https:";

  if (!hostname) {
    return "";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8011";
  }

  if (hostname === "han-note.vn" || hostname === "www.han-note.vn") {
    return "https://api.han-note.vn";
  }

  const rootHost = hostname.replace(/^www\./, "");
  return `${protocol}//api.${rootHost}`;
}

function buildApiConfigError(baseUrl: string) {
  if (!baseUrl) {
    return "Không xác định được API host cho mobile web. Nếu anh không deploy trên han-note.vn, hãy đặt EXPO_PUBLIC_API_BASE_URL về root URL của backend, ví dụ https://api.example.com.";
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return "EXPO_PUBLIC_API_BASE_URL không phải URL hợp lệ. Hãy dùng root URL dạng https://api.example.com.";
  }

  const isLoopback =
    parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1";

  if (!isLoopback && parsed.protocol !== "https:") {
    return "API host của mobile web phải dùng HTTPS khi deploy public.";
  }

  if (parsed.pathname && parsed.pathname !== "/") {
    return "EXPO_PUBLIC_API_BASE_URL phải là root host, không kèm path /api.";
  }

  if (parsed.search || parsed.hash) {
    return "EXPO_PUBLIC_API_BASE_URL không được chứa query string hoặc hash.";
  }

  return null;
}

export const apiBaseUrl = normalizeBaseUrl(process?.env?.EXPO_PUBLIC_API_BASE_URL) || inferWebBaseUrl();
export const apiConfigError = buildApiConfigError(apiBaseUrl);
const clientBaseUrl = apiConfigError ? "https://invalid.local" : apiBaseUrl;

export const api = createApiClient(clientBaseUrl, { getAccessToken });

export type {
  AnalyzeResponse,
  AuthSession,
  AuthUser,
  Explanation,
  LoginRequest,
  NotificationSettings,
  RegisterRequest,
  ReviewResult,
  ReviewTodayResponse,
  Token,
  TokenStatus,
  VocabularyItem
};
