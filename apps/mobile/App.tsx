import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button, Card, Field, ScreenHeader } from "./src/components/Primitives";
import { TokenChip } from "./src/components/TokenChip";
import {
  api,
  type AnalyzeResponse,
  type AuthUser,
  type Explanation,
  type NotificationSettings,
  type ReviewResult,
  type ReviewTodayResponse,
  type Token,
  type TokenStatus,
  type VocabularyItem
} from "./src/lib/api";
import { clearAuthSession, getStoredRefreshToken, saveAuthSession } from "./src/lib/auth-session";
import { registerExpoPushToken } from "./src/lib/pushNotifications";
import { colors, spacing } from "./src/theme/theme";

type Tab = "learn" | "review" | "vocabulary" | "settings";
type LearnMode = "input" | "result" | "explanation";
type ReviewMode = "home" | "session" | "complete";
type ReviewChoice = "forgot" | "vague" | "remembered" | "easy";

type ReviewSummary = {
  total: number;
  forgot: number;
  vague: number;
  remembered: number;
  easy: number;
};

const QUICK_STATUS_OPTIONS: Array<{ status: TokenStatus; label: string }> = [
  { status: "known", label: "Đã biết" },
  { status: "unknown", label: "Chưa biết" },
  { status: "review", label: "Muốn ôn lại" },
  { status: "ignored", label: "Bỏ qua" }
];

export default function App() {
  const [authStatus, setAuthStatus] = useState<"loading" | "signed_out" | "signed_in">("loading");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tab, setTab] = useState<Tab>("learn");
  const [learnMode, setLearnMode] = useState<LearnMode>("input");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("home");
  const [dueCount, setDueCount] = useState(0);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    total: 0,
    forgot: 0,
    vague: 0,
    remembered: 0,
    easy: 0
  });

  function resetAppState() {
    setTab("learn");
    setLearnMode("input");
    setReviewMode("home");
    setDueCount(0);
    setAnalysis(null);
    setTokens([]);
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
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        if (active) {
          setAuthStatus("signed_out");
        }
        return;
      }

      try {
        const session = await api.refresh({ refresh_token: refreshToken });
        await saveAuthSession(session);
        if (active) {
          setCurrentUser(session.user);
          setAuthStatus("signed_in");
        }
      } catch {
        await clearAuthSession();
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

  function switchTab(next: Tab) {
    setTab(next);
    if (next === "learn") setLearnMode("input");
    if (next === "review") setReviewMode("home");
  }

  async function authenticate(
    action: "login" | "register",
    payload: { email: string; password: string; display_name?: string }
  ) {
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
      await saveAuthSession(session);
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
      await clearAuthSession();
      resetAppState();
      setCurrentUser(null);
      setAuthStatus("signed_out");
      setIsLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {authStatus === "loading" ? (
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <AuthScreen
              isBusy={false}
              mode="loading"
              onLogin={() => Promise.resolve()}
              onRegister={() => Promise.resolve()}
            />
          </ScrollView>
        ) : authStatus !== "signed_in" || !currentUser ? (
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <AuthScreen
              isBusy={isAuthBusy}
              mode="auth"
              onLogin={(payload) => authenticate("login", payload)}
              onRegister={(payload) => authenticate("register", payload)}
            />
          </ScrollView>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === "learn" && learnMode === "input" ? (
            <LearnHome
              dueCount={dueCount}
              onAnalyzed={(nextAnalysis) => {
                setAnalysis(nextAnalysis);
                setTokens(nextAnalysis.sentences[0]?.tokens ?? []);
                setLearnMode("result");
              }}
              onReview={() => switchTab("review")}
            />
          ) : null}

          {tab === "learn" && learnMode === "result" ? (
            <AnalyzeResult
              analysis={analysis}
              tokens={tokens}
              setTokens={setTokens}
              onExplain={(nextExplanations) => {
                setExplanations(nextExplanations);
                setLearnMode("explanation");
              }}
              onBack={() => setLearnMode("input")}
            />
          ) : null}

          {tab === "learn" && learnMode === "explanation" ? (
            <ExplanationScreen
              analysis={analysis}
              explanations={explanations}
              onBack={() => setLearnMode("result")}
              onReview={() => {
                setTab("review");
                setReviewMode("session");
              }}
            />
          ) : null}

          {tab === "review" && reviewMode === "home" ? (
            <ReviewHome dueCount={dueCount} onStart={() => setReviewMode("session")} />
          ) : null}

          {tab === "review" && reviewMode === "session" ? (
            <ReviewSession
              onFinish={(summary, latestDueCount) => {
                setReviewSummary(summary);
                setDueCount(latestDueCount);
                setReviewMode("complete");
              }}
            />
          ) : null}

          {tab === "review" && reviewMode === "complete" ? (
            <ReviewComplete
              summary={reviewSummary}
              onLearn={() => switchTab("learn")}
              onReview={() => setReviewMode("home")}
            />
          ) : null}

          {tab === "vocabulary" ? <VocabularyScreen /> : null}
          {tab === "settings" ? (
            <SettingsScreen currentUser={currentUser} isLoggingOut={isLoggingOut} onLogout={logout} />
          ) : null}
            </ScrollView>

            <TabBar active={tab} onChange={switchTab} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function AuthScreen({
  isBusy,
  mode,
  onLogin,
  onRegister
}: {
  isBusy: boolean;
  mode: "loading" | "auth";
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    email: string;
    password: string;
    display_name?: string;
  }) => Promise<void>;
}) {
  const [formMode, setFormMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      if (formMode === "login") {
        await onLogin({ email, password });
        return;
      }
      await onRegister({ email, password, display_name: displayName });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể xác thực tài khoản.");
    }
  }

  return (
    <View style={styles.authShell}>
      <Card>
        <View style={styles.authBrand}>
          <View style={styles.authMark}>
            <Text style={styles.authMarkText}>汉</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authTitle}>Hán Note</Text>
            <Text style={styles.muted}>Đăng nhập để đồng bộ lịch ôn và kho từ vựng theo tài khoản.</Text>
          </View>
        </View>

        {mode === "loading" ? (
          <Text style={[styles.muted, { marginTop: 18 }]}>
            Đang khôi phục phiên đăng nhập từ refresh token đã lưu.
          </Text>
        ) : (
          <>
            <View style={styles.authTabs}>
              <Pressable
                onPress={() => setFormMode("login")}
                style={[styles.authTab, formMode === "login" && styles.authTabActive]}
              >
                <Text style={[styles.authTabText, formMode === "login" && styles.authTabTextActive]}>
                  Đăng nhập
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFormMode("register")}
                style={[styles.authTab, formMode === "register" && styles.authTabActive]}
              >
                <Text style={[styles.authTabText, formMode === "register" && styles.authTabTextActive]}>
                  Đăng ký
                </Text>
              </Pressable>
            </View>

            {formMode === "register" ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.counter}>Tên hiển thị</Text>
                <Field
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ví dụ: Sơn"
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              <Text style={styles.counter}>Email</Text>
              <Field
                value={email}
                onChangeText={setEmail}
                placeholder="ban@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.counter}>Mật khẩu</Text>
              <Field
                value={password}
                onChangeText={setPassword}
                placeholder="Tối thiểu 8 ký tự"
                autoCapitalize="none"
                autoComplete="off"
                secureTextEntry
              />
            </View>

            <View style={{ height: 16 }} />
            <Button
              label={isBusy ? "Đang xử lý..." : formMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              onPress={() => void submit()}
              disabled={isBusy}
            />
            {error ? <Text style={styles.warning}>{error}</Text> : null}
          </>
        )}
      </Card>
    </View>
  );
}

function LearnHome({
  dueCount,
  onAnalyzed,
  onReview
}: {
  dueCount: number;
  onAnalyzed: (analysis: AnalyzeResponse) => void;
  onReview: () => void;
}) {
  const [text, setText] = useState("你看见他吗？");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.analyze(text.trim());
      onAnalyzed(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể phân tích nội dung.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View>
      <ScreenHeader
        eyebrow="Học"
        title="Đọc chat tiếng Trung nhanh hơn"
        subtitle="Dán nội dung, chọn token cần học, rồi lưu vào lịch ôn."
      />

      <Card>
        <Text style={styles.sectionTitle}>Nội dung cần phân tích</Text>
        <Text style={styles.muted}>
          Không lưu toàn bộ đoạn chat. Chỉ từ bạn chọn học mới được đưa vào kho từ vựng.
        </Text>
        <View style={{ height: 12 }} />
        <Field
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Dán tiếng Trung ở đây. Ví dụ: 你看见他吗？"
        />
        <View style={styles.formFooter}>
          <Text style={styles.counter}>{text.length} / 2.000 ký tự</Text>
          <Button label={isLoading ? "Đang phân tích..." : "Phân tích"} onPress={() => void analyze()} disabled={!text.trim() || isLoading} />
        </View>
        {error ? <Text style={styles.warning}>{error}</Text> : null}
      </Card>

      <View style={styles.statsRow}>
        <Stat value={String(dueCount)} label="từ cần ôn" />
        <Stat value="API" label="analyze thật" />
      </View>

      <Button label="Ôn hôm nay" variant="secondary" onPress={onReview} />
    </View>
  );
}

function AnalyzeResult({
  analysis,
  tokens,
  setTokens,
  onExplain,
  onBack
}: {
  analysis: AnalyzeResponse | null;
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  onExplain: (explanations: Explanation[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [quickStatusMode, setQuickStatusMode] = useState<TokenStatus | null>(null);

  const selectedCount = useMemo(
    () => tokens.filter((item) => item.status === "unknown" || item.status === "review").length,
    [tokens]
  );

  function applyTokenStatus(tokenIndex: number, status: TokenStatus) {
    setTokens(
      tokens.map((item) =>
        item.token_index === tokenIndex ? { ...item, status } : item
      )
    );
    setSelected(null);
  }

  function updateToken(status: TokenStatus) {
    if (!selected) return;
    applyTokenStatus(selected.token_index, status);
  }

  function handleQuickModeToggle(status: TokenStatus) {
    setQuickStatusMode((current) => (current === status ? null : status));
    setSelected(null);
  }

  function handleTokenPress(token: Token) {
    if (!token.is_learnable || token.token_type === "punctuation") {
      return;
    }
    if (quickStatusMode) {
      applyTokenStatus(token.token_index, quickStatusMode);
      return;
    }
    setSelected(token);
  }

  async function explain() {
    if (!analysis) return;
    setIsExplaining(true);
    setError(null);
    try {
      const sentence = analysis.sentences[0];
      const response = await api.explainTokens({
        original_text: analysis.original_text,
        sentences: [
          {
            sentence_index: sentence.sentence_index,
            text: sentence.text,
            translation_vi: sentence.translation_vi,
            natural_explanation_vi: sentence.natural_explanation_vi,
            tokens: tokens
              .filter((item) => item.status === "unknown" || item.status === "review")
              .map((item) => ({
                token_index: item.token_index,
                text: item.text,
                pinyin: item.pinyin,
                meaning_vi_brief: item.meaning_vi_brief,
                user_status: item.status
              }))
          }
        ]
      });
      onExplain(response.explanations);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể giải nghĩa từ đã chọn.");
    } finally {
      setIsExplaining(false);
    }
  }

  if (!analysis) {
    return (
      <View>
        <Card>
          <Text style={styles.sectionTitle}>Chưa có kết quả phân tích</Text>
          <Text style={styles.muted}>Quay lại bước Học để chạy `POST /api/analyze` trước.</Text>
        </Card>
      </View>
    );
  }

  const sentence = analysis.sentences[0];

  return (
    <View>
      <BackButton label="Kết quả phân tích" onPress={onBack} />

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.counter}>
            {tokens.length} token · {tokens.filter((token) => token.is_learnable).length} học được
          </Text>
          <Text style={styles.badge}>api</Text>
        </View>
        <Text style={styles.zhLarge}>{sentence.text}</Text>
        <Text style={styles.translation}>{sentence.translation_vi}</Text>
        <Text style={styles.muted}>{sentence.natural_explanation_vi}</Text>

        <View style={styles.quickToolbar}>
          <Text style={styles.quickToolbarTitle}>Chọn nhanh</Text>
          <Text style={styles.quickToolbarCopy}>
            {quickStatusMode
              ? "Đang bật chọn nhanh. Bấm trực tiếp vào token để gán trạng thái."
              : "Bật một chế độ rồi bấm liên tiếp vào token, hoặc chạm từng từ để mở bảng chọn chi tiết."}
          </Text>
          <View style={styles.quickToolbarActions}>
            {QUICK_STATUS_OPTIONS.map((option) => {
              const isActive = quickStatusMode === option.status;
              return (
                <Pressable
                  key={option.status}
                  onPress={() => handleQuickModeToggle(option.status)}
                  style={[
                    styles.quickOption,
                    isActive && styles.quickOptionActive,
                    isActive && option.status === "known" && styles.quickOptionKnown,
                    isActive && option.status === "unknown" && styles.quickOptionUnknown,
                    isActive && option.status === "review" && styles.quickOptionReview,
                    isActive && option.status === "ignored" && styles.quickOptionIgnored
                  ]}
                >
                  <Text
                    style={[
                      styles.quickOptionText,
                      isActive && styles.quickOptionTextActive,
                      isActive && option.status === "known" && styles.quickOptionTextKnown,
                      isActive && option.status === "unknown" && styles.quickOptionTextUnknown,
                      isActive && option.status === "review" && styles.quickOptionTextReview,
                      isActive && option.status === "ignored" && styles.quickOptionTextIgnored
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.tokenWrap}>
          {tokens.map((token) => (
            <TokenChip key={token.token_index} token={token} onPress={() => handleTokenPress(token)} />
          ))}
        </View>
      </Card>

      <Text style={styles.selectionHint}>
        {quickStatusMode
          ? "Chế độ chọn nhanh đang bật. Chạm trực tiếp vào token để gán trạng thái hiện tại."
          : "Chạm vào từng token để mở bảng chọn chi tiết, hoặc dùng thanh chọn nhanh ở trên."}
      </Text>

      <View style={styles.actionBar}>
        <Text style={styles.actionText}>{selectedCount} từ đã chọn để học</Text>
        <Button
          label={isExplaining ? "Đang giải nghĩa..." : `Giải nghĩa ${selectedCount} từ`}
          onPress={() => void explain()}
          disabled={selectedCount === 0 || isExplaining}
        />
      </View>
      {error ? <Text style={styles.warning}>{error}</Text> : null}

      <Modal
        visible={!!selected && !quickStatusMode}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelected(null)} />
        <View style={styles.sheet}>
          {selected ? (
            <>
              <Text style={styles.sheetWord}>{selected.text}</Text>
              <Text style={styles.muted}>{selected.pinyin} · {selected.meaning_vi_brief}</Text>
              <View style={{ height: 6 }} />
              <Button label="Đã biết" variant="secondary" onPress={() => updateToken("known")} />
              <Button label="Chưa biết" variant="secondary" onPress={() => updateToken("unknown")} />
              <Button label="Muốn ôn lại" variant="soft" onPress={() => updateToken("review")} />
              <Button label="Bỏ qua" variant="secondary" onPress={() => updateToken("ignored")} />
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ExplanationScreen({
  analysis,
  explanations,
  onBack,
  onReview
}: {
  analysis: AnalyzeResponse | null;
  explanations: Explanation[];
  onBack: () => void;
  onReview: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveAndReview() {
    if (!analysis || explanations.length === 0) {
      onReview();
      return;
    }
    if (saved) {
      onReview();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const sentence = analysis.sentences[0];
      await api.saveVocabulary({
        items: explanations.map((item) => ({
          word: item.word,
          pinyin: item.pinyin,
          meaning_vi: item.meaning_vi,
          meaning_in_context_vi: item.meaning_in_context_vi,
          part_of_speech: item.part_of_speech,
          usage_note_vi: item.usage_note_vi,
          difficulty: item.difficulty_suggestion,
          source_sentence_zh: sentence.text,
          source_sentence_vi: sentence.translation_vi,
          examples: item.examples
        }))
      });
      setSaved(true);
      onReview();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể lưu từ vựng.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!analysis || explanations.length === 0) {
    return (
      <View>
        <Card>
          <Text style={styles.sectionTitle}>Chưa có dữ liệu giải nghĩa</Text>
          <Text style={styles.muted}>Quay lại màn phân tích và chọn token cần học trước.</Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <BackButton label="Giải nghĩa" onPress={onBack} />

      {explanations.map((item, index) => (
        <Card key={item.word} style={{ marginBottom: 12 }}>
          <Text style={styles.counter}>{index + 1} / {explanations.length}</Text>
          <Text style={styles.zhLarge}>{item.word}</Text>
          <Text style={styles.muted}>{item.pinyin} · {item.part_of_speech}</Text>

          <Detail title="Nghĩa" body={item.meaning_vi} />
          <Detail title="Trong ngữ cảnh" body={item.meaning_in_context_vi} />
          <Detail title="Ghi chú" body={item.usage_note_vi} />

          {item.examples.map((example) => (
            <View style={styles.example} key={example.zh}>
              <Text style={styles.exampleZh}>{example.zh}</Text>
              <Text style={styles.counter}>{example.pinyin}</Text>
              <Text style={styles.translation}>{example.vi}</Text>
            </View>
          ))}
        </Card>
      ))}

      <View style={styles.actionBar}>
        <Text style={styles.actionText}>{saved ? `Đã lưu ${explanations.length} từ` : `Sẵn sàng lưu ${explanations.length} từ`}</Text>
        <Button label={isSaving ? "Đang lưu..." : "Lưu và ôn ngay"} onPress={() => void saveAndReview()} />
      </View>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
    </View>
  );
}

function ReviewHome({ dueCount, onStart }: { dueCount: number; onStart: () => void }) {
  const [data, setData] = useState<ReviewTodayResponse | null>(null);

  useEffect(() => {
    let active = true;
    api.reviewsToday().then((response) => {
      if (active) {
        setData(response);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <View>
      <ScreenHeader
        eyebrow="Review"
        title="Ôn hôm nay"
        subtitle="Một từ, một quyết định. Các từ khó sẽ quay lại sớm hơn."
      />
      <Card>
        <View style={styles.statsRowCompact}>
          <Stat value={String(dueCount)} label="đến hạn" />
          <Stat value={String(data?.hard_count ?? 0)} label="khó nhớ" />
        </View>
        <Button label="Bắt đầu ôn" onPress={onStart} disabled={!data || data.items.length === 0} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Sắp ôn</Text>
        <View style={styles.tokenWrap}>
          {data?.items.map((item) => (
            <View key={item.id} style={styles.previewChip}>
              <Text style={styles.previewWord}>{item.word}</Text>
              <Text style={styles.previewPinyin}>{item.pinyin}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

function ReviewSession({
  onFinish
}: {
  onFinish: (
    summary: { total: number; forgot: number; vague: number; remembered: number; easy: number },
    latestDueCount: number
  ) => void;
}) {
  const [data, setData] = useState<ReviewTodayResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [pendingRevealResult, setPendingRevealResult] = useState<"forgot" | "vague" | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.reviewsToday().then((response) => {
      if (active) {
        setData(response);
      }
    }).catch((nextError) => {
      if (active) {
        setError(nextError instanceof Error ? nextError.message : "Không thể tải danh sách ôn.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const items = data?.items ?? [];
  const item = items[index];

  async function submit(result: ReviewResult) {
    if (!item) return;
    setError(null);
    try {
      await api.submitReview(item.id, result);
      const nextResults = [...results, result];
      setResults(nextResults);
      if (index >= items.length - 1) {
        const summary = await api.completeReview(nextResults);
        const latest = await api.reviewsToday();
        onFinish(summary, latest.due_count);
        return;
      }
      setIndex((value) => value + 1);
      setPendingRevealResult(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể lưu kết quả ôn.");
    }
  }

  async function handlePrimaryChoice(result: ReviewChoice) {
    if (result === "remembered" || result === "easy") {
      await submit(result);
      return;
    }
    setPendingRevealResult(result === "forgot" ? "forgot" : "vague");
  }

  if (!item) {
    return (
      <View>
        <Card>
          <Text style={styles.sectionTitle}>Không có từ đến hạn</Text>
          <Text style={styles.muted}>{error ?? "Hiện chưa có phiên ôn cần bắt đầu."}</Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <Card style={styles.reviewCard}>
        <Text style={styles.counter}>{index + 1} / {items.length}</Text>
        <Text style={styles.reviewWord}>{item.word}</Text>
        <Text style={styles.muted}>{item.pinyin}</Text>

        {!pendingRevealResult ? (
          <>
            <Text style={styles.prompt}>Chọn ngay mức độ nhớ của bạn. Chỉ các mức khó mới lật nghĩa của từ.</Text>
            <View style={styles.resultGrid}>
              <Button label="Chưa nhớ" variant="danger" onPress={() => void handlePrimaryChoice("forgot")} />
              <Button label="Cần ôn tập" variant="secondary" onPress={() => void handlePrimaryChoice("vague")} />
              <Button label="Nhớ" variant="soft" onPress={() => void handlePrimaryChoice("remembered")} />
              <Button label="Dễ" variant="success" onPress={() => void handlePrimaryChoice("easy")} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.assessmentText}>
              Bạn đã chọn: {pendingRevealResult === "forgot" ? "Chưa nhớ" : "Cần ôn tập"}
            </Text>
            <Text style={styles.meaning}>{item.meaning_vi}</Text>
            <View style={styles.example}>
              <Text style={styles.exampleZh}>{item.example_zh}</Text>
              <Text style={styles.translation}>{item.example_vi}</Text>
            </View>

            <View style={styles.resultGrid}>
              <Button label="Chưa nhớ" variant="danger" onPress={() => void submit("forgot")} />
              <Button label="Cần ôn tập" variant="secondary" onPress={() => void submit("vague")} />
            </View>
            <View style={{ height: 10 }} />
            <Button label="Quay lại chọn mức" variant="secondary" onPress={() => setPendingRevealResult(null)} />
          </>
        )}
        {error ? <Text style={styles.warning}>{error}</Text> : null}
      </Card>
    </View>
  );
}

function ReviewComplete({
  summary,
  onLearn,
  onReview
}: {
  summary: { total: number; forgot: number; vague: number; remembered: number; easy: number };
  onLearn: () => void;
  onReview: () => void;
}) {
  return (
    <View>
      <ScreenHeader eyebrow="Done" title="Đã ôn xong hôm nay" />
      <Card>
        <Text style={styles.muted}>
          {summary.total} từ đã ôn. {summary.remembered + summary.easy} nhớ tốt, {summary.vague} mơ hồ, {summary.forgot} quên.
        </Text>
        <View style={{ height: 14 }} />
        <Button label="Học thêm từ mới" onPress={onLearn} />
        <View style={{ height: 10 }} />
        <Button label="Về trang ôn" variant="secondary" onPress={onReview} />
      </Card>
    </View>
  );
}

function VocabularyScreen() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.listVocabulary(query).then((response) => {
      if (active) {
        setItems(response);
      }
    }).catch((nextError) => {
      if (active) {
        setError(nextError instanceof Error ? nextError.message : "Không thể tải từ vựng.");
      }
    });
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <View>
      <ScreenHeader eyebrow="Vocabulary" title="Từ vựng" subtitle="Kho học cá nhân dùng dữ liệu thật từ backend." />
      <Field value={query} onChangeText={setQuery} placeholder="Tìm từ, pinyin, nghĩa tiếng Việt" />
      <View style={{ height: 12 }} />

      {items.length === 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Không tìm thấy từ phù hợp</Text>
          <Text style={styles.muted}>{error ?? "Thử tìm bằng tiếng Trung, pinyin hoặc nghĩa tiếng Việt ngắn hơn."}</Text>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} style={{ marginBottom: 10 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.wordListText}>{item.word}</Text>
              <Text style={[styles.badge, item.next_review_label === "Hôm nay" && styles.badgeDue]}>
                {item.next_review_label}
              </Text>
            </View>
            <Text style={styles.muted}>{item.pinyin}</Text>
            <Text style={styles.translation}>{item.meaning_vi}</Text>
            <Text style={styles.counter}>{item.status} · {item.difficulty}</Text>
          </Card>
        ))
      )}
    </View>
  );
}

function SettingsScreen({
  currentUser,
  isLoggingOut,
  onLogout
}: {
  currentUser: AuthUser;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);

  useEffect(() => {
    let active = true;
    api.getNotificationSettings().then((response) => {
      if (active) {
        setSettings(response);
      }
    }).catch((nextError) => {
      if (active) {
        setError(nextError instanceof Error ? nextError.message : "Không thể tải cài đặt.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!settings) return;
    setMessage(null);
    setError(null);
    try {
      const next = await api.updateNotificationSettings(settings);
      setSettings(next);
      setMessage("Đã lưu cài đặt.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể lưu cài đặt.");
    }
  }

  async function registerPushToken() {
    setMessage(null);
    setError(null);
    setIsRegisteringPush(true);
    try {
      const result = await registerExpoPushToken();
      if (!result.token) {
        setMessage(result.message);
        return;
      }
      await api.registerPushToken(result.token);
      setSettings((current) => (current ? { ...current, mobile_push_token: result.token } : current));
      setMessage(result.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể đăng ký push token.");
    } finally {
      setIsRegisteringPush(false);
    }
  }

  async function sendTelegramTest() {
    if (!settings) return;
    setMessage(null);
    setError(null);
    try {
      const response = await api.testTelegram(settings.telegram_chat_id);
      setMessage(response.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể gửi test Telegram.");
    }
  }

  if (!settings) {
    return (
      <View>
        <Card>
          <Text style={styles.sectionTitle}>Đang tải cài đặt</Text>
          <Text style={styles.muted}>{error ?? "Đang lấy settings từ backend."}</Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <ScreenHeader eyebrow="Settings" title="Cài đặt" subtitle="Nhắc ôn, Telegram và quyền riêng tư." />

      <Card>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <SettingText label="Tên" value={currentUser.display_name} />
        <SettingText label="Email" value={currentUser.email} />
        <View style={{ height: 10 }} />
        <Button
          label={isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          variant="secondary"
          onPress={() => void onLogout()}
          disabled={isLoggingOut}
        />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Nhắc ôn</Text>
        <SettingText label="Giờ nhắc" value={settings.daily_reminder_time} />
        <SettingText label="Timezone" value={settings.timezone} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Thông báo</Text>
        <ToggleRow
          label="Push notification"
          value={settings.app_push_enabled}
          onChange={(value) => setSettings((current) => (current ? { ...current, app_push_enabled: value } : current))}
        />
        <ToggleRow
          label="Telegram"
          value={settings.telegram_enabled}
          onChange={(value) => setSettings((current) => (current ? { ...current, telegram_enabled: value } : current))}
        />
        <SettingText label="Chat ID" value={settings.telegram_chat_id ?? ""} />
        <SettingText
          label="Push token"
          value={settings.mobile_push_token ? shortenPushToken(settings.mobile_push_token) : "Chưa đăng ký"}
        />
        <View style={{ height: 10 }} />
        <Button label="Gửi thử Telegram" variant="secondary" onPress={() => void sendTelegramTest()} />
        <View style={{ height: 10 }} />
        <Button
          label={isRegisteringPush ? "Đang đăng ký push..." : "Đăng ký Expo push token"}
          variant="soft"
          onPress={() => void registerPushToken()}
          disabled={isRegisteringPush}
        />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
        <Text style={styles.muted}>
          App không lưu toàn bộ lịch sử chat. Chỉ lưu từ bạn chọn học và ví dụ ngắn gắn với từ đó.
        </Text>
        <ToggleRow
          label="Không lưu câu nguồn"
          value={settings.privacy_no_source_sentence}
          onChange={(value) =>
            setSettings((current) => (current ? { ...current, privacy_no_source_sentence: value } : current))
          }
        />
        <ToggleRow
          label="Ẩn danh tên riêng"
          value={settings.privacy_anonymize_before_save}
          onChange={(value) =>
            setSettings((current) => (current ? { ...current, privacy_anonymize_before_save: value } : current))
          }
        />
        <View style={{ height: 10 }} />
        <Button label="Lưu cài đặt" onPress={() => void save()} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.warning}>{error}</Text> : null}
      </Card>
    </View>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.muted}>{body}</Text>
    </View>
  );
}

function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backButton}>
      <Text style={styles.back}>‹ {label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingText({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: "#C9D0CD", true: colors.accent }}
      />
    </View>
  );
}

function shortenPushToken(value: string) {
  if (value.length <= 28) {
    return value;
  }
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function TabBar({
  active,
  onChange
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "learn", label: "Học" },
    { key: "review", label: "Ôn" },
    { key: "vocabulary", label: "Từ vựng" },
    { key: "settings", label: "Cài đặt" }
  ];

  return (
    <View style={styles.tabbar}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.tab, active === tab.key && styles.activeTab]}
        >
          <Text style={[styles.tabText, active === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  app: {
    flex: 1,
    backgroundColor: colors.bg
  },
  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.pageX,
    paddingVertical: 24
  },
  content: {
    paddingHorizontal: spacing.pageX,
    paddingTop: 18,
    paddingBottom: 104
  },
  authShell: {
    width: "100%"
  },
  authBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18
  },
  authMark: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center"
  },
  authMarkText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0
  },
  authTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  authTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4
  },
  authTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  authTabActive: {
    backgroundColor: colors.text,
    borderColor: colors.text
  },
  authTabText: {
    color: colors.textMuted,
    fontWeight: "800"
  },
  authTabTextActive: {
    color: "#FFFFFF"
  },
  sectionTitle: {
    marginBottom: 8,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 22
  },
  translation: {
    marginTop: 6,
    color: colors.text,
    lineHeight: 22
  },
  counter: {
    color: colors.textSoft,
    fontSize: 12,
    marginVertical: 8
  },
  success: {
    marginTop: 10,
    color: colors.success
  },
  warning: {
    marginTop: 10,
    color: colors.unknown
  },
  formFooter: {
    gap: 10,
    marginTop: 10
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 12
  },
  statsRowCompact: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  stat: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12
  },
  statValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  statLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800"
  },
  badgeDue: {
    backgroundColor: colors.unknownSoft,
    color: colors.unknown
  },
  zhLarge: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: "900",
    letterSpacing: 0
  },
  quickToolbar: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    gap: 8
  },
  quickToolbarTitle: {
    color: colors.text,
    fontWeight: "800"
  },
  quickToolbarCopy: {
    color: colors.textMuted,
    lineHeight: 20
  },
  quickToolbarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quickOption: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  quickOptionActive: {
    borderColor: "transparent"
  },
  quickOptionKnown: {
    backgroundColor: colors.blueSoft
  },
  quickOptionUnknown: {
    backgroundColor: colors.unknownSoft
  },
  quickOptionReview: {
    backgroundColor: colors.accentSoft
  },
  quickOptionIgnored: {
    backgroundColor: colors.surfaceWarm
  },
  quickOptionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  quickOptionTextActive: {
    color: colors.text
  },
  quickOptionTextKnown: {
    color: colors.blue
  },
  quickOptionTextUnknown: {
    color: colors.unknown
  },
  quickOptionTextReview: {
    color: colors.accentDark
  },
  quickOptionTextIgnored: {
    color: colors.textMuted
  },
  tokenWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16
  },
  selectionHint: {
    marginTop: 10,
    color: colors.textMuted,
    lineHeight: 20
  },
  actionBar: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: colors.text,
    padding: 12,
    gap: 10
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,27,26,0.34)"
  },
  sheet: {
    gap: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.surface,
    padding: 16
  },
  sheetWord: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12
  },
  detailTitle: {
    marginBottom: 5,
    color: colors.text,
    fontWeight: "800"
  },
  example: {
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    marginTop: 12
  },
  exampleZh: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  previewChip: {
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  previewWord: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800"
  },
  previewPinyin: {
    color: colors.textMuted,
    fontSize: 11
  },
  reviewCard: {
    minHeight: 520,
    justifyContent: "center"
  },
  reviewWord: {
    color: colors.text,
    fontSize: 84,
    lineHeight: 96,
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: 0
  },
  prompt: {
    marginVertical: 22,
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: "center"
  },
  meaning: {
    marginTop: 18,
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center"
  },
  assessmentText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  resultGrid: {
    gap: 9,
    marginTop: 16
  },
  wordListText: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0
  },
  settingRow: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  settingLabel: {
    flex: 1,
    color: colors.text,
    fontWeight: "700"
  },
  settingValue: {
    flex: 1,
    color: colors.textMuted,
    textAlign: "right"
  },
  backButton: {
    marginBottom: 14
  },
  back: {
    color: colors.accentDark,
    fontWeight: "900"
  },
  tabbar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tab,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 6
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  activeTab: {
    backgroundColor: colors.accentSoft
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: "800"
  },
  activeTabText: {
    color: colors.accentDark
  }
});
