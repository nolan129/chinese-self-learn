import { useMemo, useState } from "react";
import { api, type AnalyzeResponse, type Explanation, type Token, type TokenStatus } from "../lib/api";
import { TokenChip, TokenStatusPicker } from "./TokenChip";

function isSelectedForExplain(token: Token) {
  return token.status === "unknown" || token.status === "review";
}

function hasPendingLearnableTokens(tokens: Token[]) {
  return tokens.some((token) => token.is_learnable && token.status === "unselected");
}

const QUICK_STATUS_OPTIONS: Array<{ status: TokenStatus; label: string; className: string }> = [
  { status: "known", label: "Đã biết", className: "known" },
  { status: "unknown", label: "Chưa biết", className: "unknown" },
  { status: "review", label: "Muốn ôn lại", className: "review" },
  { status: "ignored", label: "Bỏ qua", className: "secondary" }
];

export function AnalyzeScreen({
  onExplain,
  onReview,
  onDueCountChange
}: {
  onExplain: (analysis: AnalyzeResponse, explanations: Explanation[]) => void;
  onReview: () => void;
  onDueCountChange: (count: number) => void;
}) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [sentenceTokens, setSentenceTokens] = useState<Token[][]>([]);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [quickStatusMode, setQuickStatusMode] = useState<TokenStatus | null>(null);
  const activeSentence = analysis?.sentences[activeSentenceIndex] ?? null;
  const activeTokens = sentenceTokens[activeSentenceIndex] ?? activeSentence?.tokens ?? [];
  const selectedToken = activeTokens.find((token) => token.token_index === selectedTokenIndex);

  const selectedCount = useMemo(
    () =>
      sentenceTokens.reduce(
        (total, tokens) => total + tokens.filter((token) => isSelectedForExplain(token)).length,
        0
      ),
    [sentenceTokens]
  );
  const selectedSentenceCount = useMemo(
    () => sentenceTokens.filter((tokens) => tokens.some((token) => isSelectedForExplain(token))).length,
    [sentenceTokens]
  );

  async function analyze() {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.analyze(text.trim());
      setAnalysis(response);
      setSentenceTokens(response.sentences.map((sentence) => sentence.tokens));
      setActiveSentenceIndex(0);
      setSelectedTokenIndex(null);
      setQuickStatusMode(null);
      const review = await api.reviewsToday().catch(() => null);
      if (review) {
        onDueCountChange(review.due_count);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể phân tích nội dung.");
    } finally {
      setIsLoading(false);
    }
  }

  function goToSentence(index: number) {
    setActiveSentenceIndex(index);
    setSelectedTokenIndex(null);
  }

  function applyTokenStatus(tokenIndex: number, status: TokenStatus) {
    let nextSentenceIndex: number | null = null;
    setSentenceTokens((current) => {
      const next = current.map((tokens, sentenceIndex) =>
        sentenceIndex === activeSentenceIndex
          ? tokens.map((token) =>
              token.token_index === tokenIndex ? { ...token, status } : token
            )
          : tokens
      );

      if (!hasPendingLearnableTokens(next[activeSentenceIndex] ?? [])) {
        nextSentenceIndex = next.findIndex(
          (tokens, sentenceIndex) =>
            sentenceIndex !== activeSentenceIndex && hasPendingLearnableTokens(tokens)
        );
      }

      return next;
    });

    setSelectedTokenIndex(null);
    if (nextSentenceIndex !== null && nextSentenceIndex !== -1) {
      setActiveSentenceIndex(nextSentenceIndex);
    }
  }

  function updateTokenStatus(status: TokenStatus) {
    if (selectedTokenIndex === null) return;
    applyTokenStatus(selectedTokenIndex, status);
  }

  function handleQuickModeToggle(status: TokenStatus) {
    setQuickStatusMode((current) => (current === status ? null : status));
    setSelectedTokenIndex(null);
  }

  function handleTokenClick(token: Token) {
    if (!token.is_learnable || token.token_type === "punctuation") {
      return;
    }

    if (quickStatusMode) {
      applyTokenStatus(token.token_index, quickStatusMode);
      return;
    }

    setSelectedTokenIndex(token.token_index);
  }

  async function explainSelectedTokens() {
    if (!analysis || selectedCount === 0) return;
    setIsExplaining(true);
    setError(null);
    try {
      const updatedSentences = analysis.sentences.map((sentence, sentenceIndex) => ({
        ...sentence,
        tokens: sentenceTokens[sentenceIndex] ?? sentence.tokens
      }));
      const payload = {
        original_text: analysis.original_text,
        sentences: updatedSentences
          .map((sentence) => ({
            sentence_index: sentence.sentence_index,
            text: sentence.text,
            translation_vi: sentence.translation_vi,
            natural_explanation_vi: sentence.natural_explanation_vi,
            tokens: sentence.tokens
              .filter((token) => isSelectedForExplain(token))
              .map((token) => ({
                token_index: token.token_index,
                text: token.text,
                pinyin: token.pinyin,
                meaning_vi_brief: token.meaning_vi_brief,
                user_status: token.status
              }))
          }))
          .filter((sentence) => sentence.tokens.length > 0)
      };
      const response = await api.explainTokens(payload);
      onExplain(
        {
          ...analysis,
          sentences: updatedSentences
        },
        response.explanations
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể giải nghĩa token đã chọn.");
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <>
      <section>
        <p className="page-kicker">Analyze</p>
        <h1 className="page-title">Đọc hiểu đoạn tiếng Trung và chọn từ cần học</h1>
        <p className="page-copy">
          Dán một câu hoặc đoạn chat ngắn. Hán Note tách theo đơn vị có nghĩa, giải thích bằng
          tiếng Việt và chỉ lưu những từ bạn chọn.
        </p>

        <div className="workspace-grid">
          <div className="panel pad">
            <h2 className="panel-title">Nội dung cần phân tích</h2>
            <p className="panel-copy">
              Dữ liệu phân tích là tạm thời. Câu nguồn chỉ được lưu khi bạn bật cho phép trong
              cài đặt quyền riêng tư.
            </p>

            <textarea
              className="textarea"
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              placeholder="Dán một câu hoặc đoạn chat tiếng Trung ở đây. Ví dụ: 你看见他吗？"
            />

            <div className="form-row">
              <span className="counter">{text.length} / 2.000 ký tự</span>
              <div className="actions">
                <button className="btn btn-secondary" onClick={() => setText("")} type="button">
                  Xóa
                </button>
                <button className="btn btn-primary" onClick={analyze} disabled={isLoading} type="button">
                  {isLoading ? "Đang phân tích..." : "Phân tích"}
                </button>
              </div>
            </div>

            <div className="privacy-note">
              Không lưu toàn bộ đoạn chat đã dán. Chỉ từ bạn chọn học mới được lưu vào kho từ vựng.
            </div>
            {error ? <div className="state-note warning">{error}</div> : null}
          </div>

          <aside className="panel pad">
            <h2 className="panel-title">Trạng thái hôm nay</h2>
            <p className="panel-copy">Ưu tiên ôn trước, sau đó thêm từ mới từ nội dung công việc.</p>

            <div className="snapshot-grid">
              <div className="stat">
                <strong>API</strong>
                <span>Analyze dùng dữ liệu thật</span>
              </div>
              <div className="stat">
                <strong>{selectedCount}</strong>
                <span>token đang chọn học</span>
              </div>
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={onReview} type="button">
                Ôn hôm nay
              </button>
            </div>
          </aside>
        </div>
      </section>

      {activeSentence ? (
        <section className="result-stack">
          {analysis && analysis.sentences.length > 1 ? (
            <div className="sentence-nav" role="tablist" aria-label="Chọn câu để xem token">
              {analysis.sentences.map((sentence, sentenceIndex) => {
                const tokens = sentenceTokens[sentenceIndex] ?? sentence.tokens;
                const selectedInSentence = tokens.filter((token) => isSelectedForExplain(token)).length;
                return (
                  <button
                    key={`${sentence.sentence_index}-${sentenceIndex}`}
                    className={sentenceIndex === activeSentenceIndex ? "active" : ""}
                    onClick={() => goToSentence(sentenceIndex)}
                    type="button"
                  >
                    <strong>Câu {sentenceIndex + 1}</strong>
                    <span>{selectedInSentence > 0 ? `${selectedInSentence} từ đã chọn` : "Chưa chọn từ"}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="panel sentence-card">
            <div className="sentence-header">
              <div>
                <p className="sentence-zh">{activeSentence.text}</p>
                <p className="translation">{activeSentence.translation_vi}</p>
                <p className="natural">{activeSentence.natural_explanation_vi}</p>
              </div>
              <span className="badge">
                Câu {activeSentenceIndex + 1}/{analysis?.sentences.length ?? 1} · {activeTokens.length} token ·{" "}
                {activeTokens.filter((token) => token.is_learnable).length} học được
              </span>
            </div>

            <div className="token-row">
              <div className="quick-status-toolbar" role="toolbar" aria-label="Chọn nhanh trạng thái token">
                <div className="quick-status-copy">
                  <strong>Chọn nhanh</strong>
                  <span>
                    {quickStatusMode
                      ? "Đang bật chọn nhanh. Bấm trực tiếp vào các token để gán trạng thái."
                      : "Bật một chế độ rồi bấm liên tiếp vào các token, hoặc chọn từng từ như cũ."}
                  </span>
                </div>

                <div className="quick-status-actions">
                  {QUICK_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      type="button"
                      className={[
                        "btn",
                        option.className === "secondary" ? "btn-secondary" : option.className,
                        "quick-status-button",
                        quickStatusMode === option.status ? "active" : ""
                      ].join(" ")}
                      onClick={() => handleQuickModeToggle(option.status)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTokens.map((token) => (
                <TokenChip
                  key={token.token_index}
                  token={token}
                  selected={selectedTokenIndex === token.token_index}
                  onClick={() => handleTokenClick(token)}
                />
              ))}
            </div>
          </div>

          {selectedToken && !quickStatusMode ? (
            <TokenStatusPicker token={selectedToken} onSelect={updateTokenStatus} />
          ) : (
            <div className={`state-note ${quickStatusMode ? "" : "warning"}`}>
              {quickStatusMode
                ? "Chế độ chọn nhanh đang bật. Bấm trực tiếp vào các token để gán trạng thái hiện tại."
                : "Chọn một token để đánh dấu: đã biết, chưa biết, muốn ôn lại hoặc bỏ qua."}
            </div>
          )}

          {selectedCount > 0 ? (
            <div className="sticky-action">
              <span>
                {selectedCount} từ đã chọn ở {selectedSentenceCount} câu
              </span>
              <button
                className="btn btn-primary"
                onClick={explainSelectedTokens}
                disabled={isExplaining}
                type="button"
              >
                {isExplaining ? "Đang giải nghĩa..." : `Giải nghĩa ${selectedCount} từ`}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
