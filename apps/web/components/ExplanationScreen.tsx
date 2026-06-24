import { useMemo, useState } from "react";
import { api, type AnalyzeResponse, type Explanation, type Token } from "../lib/api";

function isSelectedForExplain(token: Token) {
  return token.status === "unknown" || token.status === "review";
}

function buildExplanationKey(word: string, pinyin: string | null | undefined) {
  return `${word}::${(pinyin ?? "").trim()}`;
}

export function ExplanationScreen({
  analysis,
  explanations,
  onVocabulary,
  onReview
}: {
  analysis: AnalyzeResponse | null;
  explanations: Explanation[];
  onVocabulary: () => void;
  onReview: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const selectedSentences = useMemo(
    () =>
      analysis
        ? analysis.sentences
            .map((sentence) => ({
              ...sentence,
              tokens: sentence.tokens.filter((token) => isSelectedForExplain(token))
            }))
            .filter((sentence) => sentence.tokens.length > 0)
        : [],
    [analysis]
  );
  const sourceSentenceByExplanation = useMemo(() => {
    const lookup = new Map<string, AnalyzeResponse["sentences"][number]>();
    for (const sentence of selectedSentences) {
      for (const token of sentence.tokens) {
        const key = buildExplanationKey(token.text, token.pinyin);
        if (!lookup.has(key)) {
          lookup.set(key, sentence);
        }
      }
    }
    return lookup;
  }, [selectedSentences]);

  async function saveAndContinue(next: () => void) {
    if (!analysis || explanations.length === 0) {
      next();
      return;
    }
    if (hasSaved) {
      next();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.saveVocabulary({
        items: explanations.map((item) => {
          const sourceSentence = sourceSentenceByExplanation.get(
            buildExplanationKey(item.word, item.pinyin)
          );
          return {
            word: item.word,
            pinyin: item.pinyin,
            meaning_vi: item.meaning_vi,
            meaning_in_context_vi: item.meaning_in_context_vi,
            part_of_speech: item.part_of_speech,
            usage_note_vi: item.usage_note_vi,
            difficulty: item.difficulty_suggestion,
            source_sentence_zh: sourceSentence?.text ?? analysis.original_text,
            source_sentence_vi: sourceSentence?.translation_vi ?? null,
            examples: item.examples
          };
        })
      });
      setHasSaved(true);
      next();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Không thể lưu từ vựng.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!analysis || explanations.length === 0) {
    return (
      <section>
        <div className="panel empty">
          <h2>Chưa có dữ liệu giải nghĩa</h2>
          <p>Quay lại màn phân tích và chọn ít nhất một token ở trạng thái chưa biết hoặc muốn ôn lại.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="page-kicker">Explain</p>
      <h1 className="page-title">Giải nghĩa</h1>
      <p className="page-copy">
        Mỗi từ được giải thích bằng tiếng Việt, kèm ngữ cảnh, ghi chú sử dụng và ví dụ.
      </p>

      <div className="explanation-layout">
        <aside className="panel pad context-card">
          <h2 className="panel-title">Ngữ cảnh câu</h2>
          <p className="panel-copy">
            {selectedSentences.length > 1
              ? `Có ${selectedSentences.length} câu chứa từ anh đã chọn để học.`
              : "Chỉ các token anh đánh dấu là chưa biết hoặc muốn ôn lại được gửi sang bước này."}
          </p>
          <div className="state-note">
            {explanations.length} mục giải nghĩa đang sẵn sàng để lưu vào kho học.
          </div>

          <div className="context-sentence-list">
            {selectedSentences.map((sentence, sentenceIndex) => (
              <section className="context-sentence-item" key={`${sentence.sentence_index}-${sentenceIndex}`}>
                <div className="badge">Câu {sentenceIndex + 1}</div>
                <p className="sentence-zh" style={{ fontSize: 28 }}>{sentence.text}</p>
                <p className="translation">{sentence.translation_vi}</p>
              </section>
            ))}
          </div>

          <div className="token-row">
            {explanations.map((item) => (
              <span key={buildExplanationKey(item.word, item.pinyin)} className="token review">
                <span>{item.word}</span>
                <small style={{ display: "block" }}>{item.pinyin}</small>
              </span>
            ))}
          </div>
        </aside>

        <div className="card-stack">
          {explanations.map((item) => (
            <article className="panel explanation-card" key={buildExplanationKey(item.word, item.pinyin)}>
              <h2 className="word-heading">{item.word}</h2>
              <p className="meta">
                {item.pinyin} · {item.part_of_speech}
              </p>
              {sourceSentenceByExplanation.get(buildExplanationKey(item.word, item.pinyin)) ? (
                <div className="detail-section">
                  <h3>Xuất hiện trong câu</h3>
                  <p>{sourceSentenceByExplanation.get(buildExplanationKey(item.word, item.pinyin))?.text}</p>
                </div>
              ) : null}

              <div className="detail-section">
                <h3>Nghĩa</h3>
                <p>{item.meaning_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Trong ngữ cảnh</h3>
                <p>{item.meaning_in_context_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Ghi chú sử dụng</h3>
                <p>{item.usage_note_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Ví dụ</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {item.examples.length > 0 ? item.examples.map((example) => (
                    <div className="example" key={example.zh}>
                      <div className="zh">{example.zh}</div>
                      <p className="meta">{example.pinyin}</p>
                      <p>{example.vi}</p>
                    </div>
                  )) : <p>Provider chưa trả ví dụ cho từ này.</p>}
                </div>
              </div>
            </article>
          ))}

          {saveError ? <div className="state-note warning">{saveError}</div> : null}
          <div className="sticky-action">
            <span>
              {hasSaved ? `Đã lưu ${explanations.length} từ vào kho học` : `Đã sẵn sàng lưu ${explanations.length} từ vào kho học`}
            </span>
            <div className="actions">
              <button
                className="btn btn-secondary"
                onClick={() => void saveAndContinue(onVocabulary)}
                type="button"
                disabled={isSaving}
              >
                Đến kho từ vựng
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void saveAndContinue(onReview)}
                type="button"
                disabled={isSaving}
              >
                {isSaving ? "Đang lưu..." : "Lưu và ôn ngay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
