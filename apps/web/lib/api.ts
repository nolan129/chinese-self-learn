import {
  createApiClient,
  type AnalyzeResponse,
  type ApiClient,
  type AuthSession,
  type AuthUser,
  type Explanation,
  type LoginRequest,
  type NotificationSettings,
  type RegisterRequest,
  type ReviewResult,
  type ReviewSubmitResponse,
  type ReviewTodayResponse,
  type Token,
  type TokenStatus,
  type VocabularyDetail,
  type VocabularyItem
} from "../../../packages/shared/src/han-note";
import { getAccessToken } from "./auth-session";

const DEFAULT_API_PORT = 8011;

function normalizeLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "::1" || hostname === "[::1]"
    ? "127.0.0.1"
    : hostname;
}

function resolveBaseUrls() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return [process.env.NEXT_PUBLIC_API_BASE_URL];
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const hostname = window.location.hostname;
    const normalizedHostname = normalizeLoopbackHostname(hostname);
    const candidates = [
      `${protocol}//${normalizedHostname}:${DEFAULT_API_PORT}`,
      `${protocol}//127.0.0.1:${DEFAULT_API_PORT}`
    ];

    if (hostname !== normalizedHostname) {
      candidates.push(`${protocol}//${hostname}:${DEFAULT_API_PORT}`);
    }

    if (normalizedHostname !== "localhost") {
      candidates.push(`${protocol}//localhost:${DEFAULT_API_PORT}`);
    }

    return [...new Set(candidates)];
  }

  return [`http://127.0.0.1:${DEFAULT_API_PORT}`];
}

const baseUrls = resolveBaseUrls();
let preferredBaseUrl = baseUrls[0];

function isNetworkFetchError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "Failed to fetch" ||
      error.message === "Network request failed" ||
      error.name === "TypeError")
  );
}

function buildCandidateBaseUrls() {
  if (preferredBaseUrl) {
    return [preferredBaseUrl, ...baseUrls.filter((url) => url !== preferredBaseUrl)];
  }
  return baseUrls;
}

async function withFallback<T>(operation: (client: ApiClient) => Promise<T>) {
  let lastError: unknown = null;

  for (const baseUrl of buildCandidateBaseUrls()) {
    const client = createApiClient(baseUrl, { getAccessToken });
    try {
      const result = await operation(client);
      preferredBaseUrl = baseUrl;
      return result;
    } catch (error) {
      lastError = error;
      if (!isNetworkFetchError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch");
}

export const api: ApiClient = {
  healthz: () => withFallback((client) => client.healthz()),
  register: (payload) => withFallback((client) => client.register(payload)),
  login: (payload) => withFallback((client) => client.login(payload)),
  refresh: (payload) => withFallback((client) => client.refresh(payload)),
  logout: (payload) => withFallback((client) => client.logout(payload)),
  me: () => withFallback((client) => client.me()),
  analyze: (input) => withFallback((client) => client.analyze(input)),
  explainTokens: (payload) => withFallback((client) => client.explainTokens(payload)),
  saveVocabulary: (payload) => withFallback((client) => client.saveVocabulary(payload)),
  listVocabulary: (query, status) => withFallback((client) => client.listVocabulary(query, status)),
  getVocabulary: (id) => withFallback((client) => client.getVocabulary(id)),
  updateVocabulary: (id, payload) => withFallback((client) => client.updateVocabulary(id, payload)),
  addVocabularyExample: (id, payload) => withFallback((client) => client.addVocabularyExample(id, payload)),
  reviewsToday: () => withFallback((client) => client.reviewsToday()),
  startReviewSession: () => withFallback((client) => client.startReviewSession()),
  submitReview: (id, result) => withFallback((client) => client.submitReview(id, result)),
  completeReview: (results) => withFallback((client) => client.completeReview(results)),
  getNotificationSettings: () => withFallback((client) => client.getNotificationSettings()),
  updateNotificationSettings: (payload) =>
    withFallback((client) => client.updateNotificationSettings(payload)),
  testTelegram: (chatId) => withFallback((client) => client.testTelegram(chatId)),
  registerPushToken: (pushToken) => withFallback((client) => client.registerPushToken(pushToken))
};

export type {
  AnalyzeResponse,
  AuthSession,
  AuthUser,
  Explanation,
  LoginRequest,
  NotificationSettings,
  RegisterRequest,
  ReviewResult,
  ReviewSubmitResponse,
  ReviewTodayResponse,
  Token,
  TokenStatus,
  VocabularyDetail,
  VocabularyItem
};
