import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const specPath = path.join(repoRoot, "packages", "shared", "openapi", "han-note.openapi.json");
const outputPath = path.join(repoRoot, "packages", "shared", "src", "han-note.ts");

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const schemas = spec.components?.schemas ?? {};

function refName(ref) {
  return ref.split("/").at(-1);
}

function quotePropertyName(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function dedupe(items) {
  return [...new Set(items)];
}

function schemaToTs(schema) {
  if (!schema) {
    return "unknown";
  }

  if (schema.$ref) {
    return refName(schema.$ref);
  }

  if (schema.anyOf) {
    return dedupe(schema.anyOf.map((item) => schemaToTs(item))).join(" | ");
  }

  if (schema.oneOf) {
    return dedupe(schema.oneOf.map((item) => schemaToTs(item))).join(" | ");
  }

  if (schema.allOf) {
    return dedupe(schema.allOf.map((item) => schemaToTs(item))).join(" & ");
  }

  if (schema.enum) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.type === "array") {
    return `Array<${schemaToTs(schema.items)}>`;
  }

  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    const properties = schema.properties ?? {};
    const propertyNames = Object.keys(properties);
    const required = new Set(schema.required ?? []);
    const chunks = [];

    for (const propertyName of propertyNames) {
      const optional = required.has(propertyName) ? "" : "?";
      chunks.push(
        `${quotePropertyName(propertyName)}${optional}: ${schemaToTs(properties[propertyName])};`
      );
    }

    if (schema.additionalProperties) {
      const valueType =
        schema.additionalProperties === true ? "unknown" : schemaToTs(schema.additionalProperties);
      chunks.push(`[key: string]: ${valueType};`);
    }

    if (chunks.length === 0) {
      return "Record<string, never>";
    }

    return `{\n${chunks.map((chunk) => `  ${chunk}`).join("\n")}\n}`;
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    default:
      return "unknown";
  }
}

function getOperation(pathName, method) {
  const operation = spec.paths?.[pathName]?.[method];
  if (!operation) {
    throw new Error(`Missing OpenAPI operation for ${method.toUpperCase()} ${pathName}`);
  }
  return operation;
}

function getRequestSchema(pathName, method) {
  return getOperation(pathName, method).requestBody?.content?.["application/json"]?.schema;
}

function getSuccessResponseSchema(pathName, method) {
  const responses = getOperation(pathName, method).responses ?? {};
  const statusCode =
    Object.keys(responses).find((code) => code.startsWith("2")) ??
    (() => {
      throw new Error(`Missing 2xx response for ${method.toUpperCase()} ${pathName}`);
    })();
  return responses[statusCode]?.content?.["application/json"]?.schema;
}

function getRequestType(pathName, method) {
  return schemaToTs(getRequestSchema(pathName, method));
}

function getResponseType(pathName, method) {
  return schemaToTs(getSuccessResponseSchema(pathName, method));
}

function emitSchemaType(name, schema) {
  return `export type ${name} = ${schemaToTs(schema)};`;
}

const schemaLines = Object.keys(schemas)
  .sort((left, right) => left.localeCompare(right))
  .map((name) => emitSchemaType(name, schemas[name]));

const aliasLines = [
  "export type Token = TokenResponse;",
  "export type TokenStatus = TokenResponse[\"status\"];",
  "export type SentenceAnalysis = SentenceAnalysisResponse;",
  "export type Explanation = ExplanationResponseItem;",
  "export type AuthUser = AuthUserResponse;",
  "export type AuthSession = AuthSessionResponse;",
  "export type VocabularyItem = VocabularyListItem;",
  "export type VocabularyDetail = VocabularyDetailItem;",
  "export type NotificationSettings = NotificationSettingsResponse;",
  "export type ReviewResult = ReviewSubmitRequest[\"result\"];",
  `export type HealthzResponse = ${getResponseType("/healthz", "get")};`,
  `export type ReviewSessionSummary = ${getResponseType("/api/reviews/session/complete", "post")};`,
  `export type TelegramTestResponse = ${getResponseType("/api/notifications/test-telegram", "post")};`,
  `export type PushTokenRegisterResponse = ${getResponseType("/api/notifications/register-push-token", "post")};`
];

const clientMethods = [
  `healthz() {
      return request<HealthzResponse>(\`\${root}/healthz\`, authConfig);
    }`,
  `register(payload: ${getRequestType("/api/auth/register", "post")}) {
      return request<${getResponseType("/api/auth/register", "post")}>(\`\${root}/api/auth/register\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `login(payload: ${getRequestType("/api/auth/login", "post")}) {
      return request<${getResponseType("/api/auth/login", "post")}>(\`\${root}/api/auth/login\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `refresh(payload: ${getRequestType("/api/auth/refresh", "post")}) {
      return request<${getResponseType("/api/auth/refresh", "post")}>(\`\${root}/api/auth/refresh\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `logout(payload?: ${getRequestType("/api/auth/logout", "post")}) {
      return request<Record<string, string>>(\`\${root}/api/auth/logout\`, authConfig, {
        method: "POST",
        body: payload ? JSON.stringify(payload) : undefined
      });
    }`,
  `me() {
      return request<${getResponseType("/api/auth/me", "get")}>(\`\${root}/api/auth/me\`, authConfig);
    }`,
  `analyze(input: string | AnalyzeRequest) {
      const payload: AnalyzeRequest = typeof input === "string" ? { text: input } : input;
      return request<AnalyzeResponse>(\`\${root}/api/analyze\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `explainTokens(payload: ${getRequestType("/api/explain-tokens", "post")}) {
      return request<${getResponseType("/api/explain-tokens", "post")}>(\`\${root}/api/explain-tokens\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `saveVocabulary(payload: ${getRequestType("/api/vocabulary", "post")}) {
      return request<${getResponseType("/api/vocabulary", "post")}>(\`\${root}/api/vocabulary\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `listVocabulary(query?: string, status?: string) {
      const url = new URL(\`\${root}/api/vocabulary\`);
      if (query) url.searchParams.set("query", query);
      if (status) url.searchParams.set("status", status);
      return request<${getResponseType("/api/vocabulary", "get")}>(url, authConfig);
    }`,
  `getVocabulary(id: string) {
      return request<${getResponseType("/api/vocabulary/{vocab_id}", "get")}>(\`\${root}/api/vocabulary/\${id}\`, authConfig);
    }`,
  `updateVocabulary(id: string, payload: ${getRequestType("/api/vocabulary/{vocab_id}", "patch")}) {
      return request<${getResponseType("/api/vocabulary/{vocab_id}", "patch")}>(\`\${root}/api/vocabulary/\${id}\`, authConfig, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }`,
  `addVocabularyExample(id: string, payload: ${getRequestType("/api/vocabulary/{vocab_id}/examples", "post")}) {
      return request<${getResponseType("/api/vocabulary/{vocab_id}/examples", "post")}>(\`\${root}/api/vocabulary/\${id}/examples\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `reviewsToday() {
      return request<${getResponseType("/api/reviews/today", "get")}>(\`\${root}/api/reviews/today\`, authConfig);
    }`,
  `startReviewSession() {
      return request<${getResponseType("/api/reviews/session/start", "post")}>(\`\${root}/api/reviews/session/start\`, authConfig, {
        method: "POST"
      });
    }`,
  `submitReview(id: string, result: ReviewResult | ReviewSubmitRequest) {
      const payload: ReviewSubmitRequest =
        typeof result === "string" ? { result } : result;
      return request<${getResponseType("/api/reviews/{vocab_id}/submit", "post")}>(\`\${root}/api/reviews/\${id}/submit\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `completeReview(results: ReviewResult[] | ReviewSessionCompleteRequest) {
      const payload: ReviewSessionCompleteRequest = Array.isArray(results)
        ? { results }
        : results;
      return request<ReviewSessionSummary>(\`\${root}/api/reviews/session/complete\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `getNotificationSettings() {
      return request<${getResponseType("/api/notification-settings", "get")}>(\`\${root}/api/notification-settings\`, authConfig);
    }`,
  `updateNotificationSettings(
      payload: ${getRequestType("/api/notification-settings", "put")} | NotificationSettings
    ) {
      return request<${getResponseType("/api/notification-settings", "put")}>(\`\${root}/api/notification-settings\`, authConfig, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    }`,
  `testTelegram(chatId?: string | null | TelegramTestRequest) {
      const payload: TelegramTestRequest =
        typeof chatId === "object" && chatId !== null ? chatId : { chat_id: chatId ?? null };
      return request<TelegramTestResponse>(\`\${root}/api/notifications/test-telegram\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`,
  `registerPushToken(pushToken: string | PushTokenRegisterRequest) {
      const payload: PushTokenRegisterRequest =
        typeof pushToken === "string" ? { push_token: pushToken } : pushToken;
      return request<PushTokenRegisterResponse>(\`\${root}/api/notifications/register-push-token\`, authConfig, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }`
];

const output = `/* eslint-disable */
// Generated from packages/shared/openapi/han-note.openapi.json by scripts/generate-shared-client.mjs.
// Do not edit this file directly.

${schemaLines.join("\n\n")}

${aliasLines.join("\n")}

export type ApiClient = ReturnType<typeof createApiClient>;

export type ApiClientOptions = {
  getAccessToken?: () => string | null | Promise<string | null>;
};

async function request<T>(
  input: RequestInfo | URL,
  authConfig: ApiClientOptions = {},
  init?: RequestInit
): Promise<T> {
  const accessToken = authConfig.getAccessToken ? await authConfig.getAccessToken() : null;
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
        if (typeof parsed.detail === "string") {
          throw new Error(parsed.detail);
        }
        if (typeof parsed.message === "string") {
          throw new Error(parsed.message);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== text) {
          throw error;
        }
      }
    }
    throw new Error(text || \`Request failed with status \${response.status}\`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}) {
  const root = baseUrl.replace(/\\/$/, "");
  const authConfig = options;

  return {
    ${clientMethods.join(",\n\n    ")}
  };
}
`;

writeFileSync(outputPath, output, "utf8");
