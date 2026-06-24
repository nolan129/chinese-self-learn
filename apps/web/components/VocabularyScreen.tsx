import { useEffect, useState } from "react";
import { api, type VocabularyDetail, type VocabularyItem } from "../lib/api";

export function VocabularyScreen({
  onDueCountChange
}: {
  onDueCountChange: (count: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<VocabularyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    try {
      const list = await api.listVocabulary(query, status === "all" ? undefined : status);
      setItems(list);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
      const review = await api.reviewsToday().catch(() => null);
      if (review) {
        onDueCountChange(review.due_count);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tải kho từ.");
    }
  }

  useEffect(() => {
    void loadList();
  }, [query, status]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api
      .getVocabulary(selectedId)
      .then((detail) => {
        if (active) {
          setSelectedDetail(detail);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Không thể tải chi tiết từ.");
        }
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function markMastered() {
    if (!selectedId) return;
    await api.updateVocabulary(selectedId, { status: "mastered" });
    await loadList();
    const detail = await api.getVocabulary(selectedId);
    setSelectedDetail(detail);
  }

  async function queueForReview() {
    if (!selectedId) return;
    const today = new Date().toISOString().slice(0, 10);
    await api.updateVocabulary(selectedId, { status: "reviewing", next_review_at: today });
    await loadList();
    const detail = await api.getVocabulary(selectedId);
    setSelectedDetail(detail);
  }

  return (
    <section>
      <p className="page-kicker">Vocabulary</p>
      <h1 className="page-title">Vocabulary</h1>
      <p className="page-copy">Kho từ cá nhân, tập trung vào nghĩa tiếng Việt và ngữ cảnh công việc.</p>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Tìm từ, pinyin hoặc nghĩa tiếng Việt"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Tất cả</option>
          <option value="due">Cần ôn</option>
          <option value="learning">Đang học</option>
          <option value="reviewing">Đang ôn</option>
          <option value="mastered">Đã thuộc</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="panel empty">
          <h2>Không tìm thấy từ phù hợp</h2>
          <p>{error ?? "Thử tìm bằng tiếng Trung, pinyin hoặc nghĩa tiếng Việt ngắn hơn."}</p>
        </div>
      ) : (
        <div className="vocabulary-layout">
          <div className="panel flush">
            <div className="word-list">
              {items.map((item) => (
                <button
                  className={`word-item ${selectedId === item.id ? "active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  key={item.id}
                  type="button"
                >
                  <strong>{item.word}</strong>
                  <p>{item.pinyin}</p>
                  <p>{item.meaning_vi}</p>
                  <div className="badge-row">
                    <span className={`badge ${item.next_review_label === "Hôm nay" ? "due" : ""}`}>
                      {item.next_review_label}
                    </span>
                    <span className="badge">{item.difficulty}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedDetail ? (
            <article className="panel explanation-card">
              <h2 className="word-heading">{selectedDetail.word}</h2>
              <p className="meta">{selectedDetail.pinyin} · {selectedDetail.part_of_speech}</p>

              <div className="detail-section">
                <h3>Nghĩa</h3>
                <p>{selectedDetail.meaning_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Trong ngữ cảnh</h3>
                <p>{selectedDetail.meaning_in_context_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Ghi chú sử dụng</h3>
                <p>{selectedDetail.usage_note_vi}</p>
              </div>

              <div className="detail-section">
                <h3>Ví dụ đã lưu</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {selectedDetail.examples.map((example) => (
                    <div className="example" key={`${example.example_zh}-${example.example_vi}`}>
                      <div className="zh">{example.example_zh}</div>
                      <p className="meta">{example.example_pinyin}</p>
                      <p>{example.example_vi}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h3>Lịch ôn</h3>
                <p>
                  Stage {selectedDetail.review_stage}. Đã ôn {selectedDetail.review_count} lần. Lần tiếp theo: {selectedDetail.next_review_label}.
                </p>
              </div>

              {error ? <div className="state-note warning">{error}</div> : null}
              <div className="actions" style={{ marginTop: 22 }}>
                <button className="btn btn-primary" type="button" onClick={() => void queueForReview()}>
                  Ôn từ này
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => void markMastered()}>
                  Đánh dấu đã thuộc
                </button>
              </div>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
