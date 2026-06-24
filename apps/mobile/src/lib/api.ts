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

const baseUrl = process?.env?.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8011";

export const api = createApiClient(baseUrl, { getAccessToken });

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
