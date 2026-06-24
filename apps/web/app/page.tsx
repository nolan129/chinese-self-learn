"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "../components/AuthScreen";
import { AppHeader } from "../components/AppHeader";
import { AnalyzeScreen } from "../components/AnalyzeScreen";
import { ExplanationScreen } from "../components/ExplanationScreen";
import { ReviewComplete, ReviewHome, ReviewSession } from "../components/ReviewScreen";
import { SettingsScreen } from "../components/SettingsScreen";
import { VocabularyScreen } from "../components/VocabularyScreen";
import { clearAuthSession, getStoredRefreshToken, saveAuthSession } from "../lib/auth-session";
import type { AnalyzeResponse, AuthUser, Explanation, ReviewResult } from "../lib/api";
import { api } from "../lib/api";

type PageKey =
  | "analyze"
  | "explanation"
  | "review"
  | "review-session"
  | "review-complete"
  | "vocabulary"
  | "settings";

type ReviewSummary = {
  total: number;
  forgot: number;
  vague: number;
  remembered: number;
  easy: number;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

export default function Page() {
  const [page, setPage] = useState<PageKey>("analyze");
  const [authStatus, setAuthStatus] = useState<"loading" | "signed_out" | "signed_in">("loading");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    total: 0,
    forgot: 0,
    vague: 0,
    remembered: 0,
    easy: 0
  });

  function resetAppState() {
    setPage("analyze");
    setDueCount(0);
    setAnalysis(null);
    setExplanations([]);
    setReviewSummary({
      total: 0,
      forgot: 0,
      vague: 0,
      remembered: 0,
      easy: 0
    });
  }

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        if (active) {
          setAuthStatus("signed_out");
        }
        return;
      }

      try {
        const session = await withTimeout(
          api.refresh({ refresh_token: refreshToken }),
          5000,
          "Không thể kết nối API để khôi phục phiên đăng nhập."
        );
        saveAuthSession(session);
        if (active) {
          setCurrentUser(session.user);
          setAuthStatus("signed_in");
        }
      } catch {
        clearAuthSession();
        if (active) {
          setCurrentUser(null);
          setAuthStatus("signed_out");
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "signed_in") {
      return;
    }
    let active = true;
    api
      .reviewsToday()
      .then((response) => {
        if (active) {
          setDueCount(response.due_count);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authStatus, currentUser?.id]);

  async function authenticate(action: "login" | "register", payload: {
    email: string;
    password: string;
    display_name?: string;
  }) {
    setIsAuthBusy(true);
    try {
      const session =
        action === "login"
          ? await api.login({ email: payload.email, password: payload.password })
          : await api.register({
              email: payload.email,
              password: payload.password,
              display_name: payload.display_name?.trim() || payload.email,
              timezone: "Asia/Bangkok"
            });
      saveAuthSession(session);
      resetAppState();
      setCurrentUser(session.user);
      setAuthStatus("signed_in");
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function logout() {
    setIsLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // local session still needs to be cleared
    } finally {
      clearAuthSession();
      resetAppState();
      setCurrentUser(null);
      setAuthStatus("signed_out");
      setIsLoggingOut(false);
    }
  }

  if (authStatus === "loading") {
    return (
      <main className="auth-shell">
        <section className="panel empty">
          <h2>Đang khôi phục phiên đăng nhập</h2>
          <p>Hán Note đang kiểm tra refresh token đã lưu trên trình duyệt này.</p>
        </section>
      </main>
    );
  }

  if (authStatus !== "signed_in" || !currentUser) {
    return (
      <AuthScreen
        isBusy={isAuthBusy}
        onLogin={(payload) => authenticate("login", payload)}
        onRegister={(payload) => authenticate("register", payload)}
      />
    );
  }

  const navPage =
    page === "explanation"
      ? "analyze"
      : page === "review-session" || page === "review-complete"
        ? "review"
        : page;

  return (
    <div className="app-shell">
      <AppHeader
        activePage={navPage as "analyze" | "review" | "vocabulary" | "settings"}
        dueCount={dueCount}
        onNavigate={(next) => setPage(next)}
      />

      <main className="main">
        {page === "analyze" ? (
          <AnalyzeScreen
            onExplain={(nextAnalysis, nextExplanations) => {
              setAnalysis(nextAnalysis);
              setExplanations(nextExplanations);
              setPage("explanation");
            }}
            onReview={() => setPage("review")}
            onDueCountChange={setDueCount}
          />
        ) : null}

        {page === "explanation" ? (
          <ExplanationScreen
            analysis={analysis}
            explanations={explanations}
            onVocabulary={() => setPage("vocabulary")}
            onReview={() => setPage("review-session")}
          />
        ) : null}

        {page === "review" ? (
          <ReviewHome onStart={() => setPage("review-session")} onDueCountChange={setDueCount} />
        ) : null}

        {page === "review-session" ? (
          <ReviewSession
            onFinish={(summary, latestDueCount) => {
              setReviewSummary(summary);
              setDueCount(latestDueCount);
              setPage("review-complete");
            }}
          />
        ) : null}

        {page === "review-complete" ? (
          <ReviewComplete
            summary={reviewSummary}
            onAnalyze={() => setPage("analyze")}
            onReview={() => setPage("review")}
          />
        ) : null}

        {page === "vocabulary" ? <VocabularyScreen onDueCountChange={setDueCount} /> : null}
        {page === "settings" ? (
          <SettingsScreen currentUser={currentUser} isLoggingOut={isLoggingOut} onLogout={logout} />
        ) : null}
      </main>
    </div>
  );
}
