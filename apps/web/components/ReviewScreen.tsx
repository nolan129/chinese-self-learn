import { useEffect, useState } from "react";
import { api, type ReviewResult, type ReviewTodayResponse } from "../lib/api";

type ReviewChoice = "forgot" | "vague" | "remembered" | "easy";

export function ReviewHome({
  onStart,
  onDueCountChange
}: {
  onStart: () => void;
  onDueCountChange: (count: number) => void;
}) {
  const [data, setData] = useState<ReviewTodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .reviewsToday()
      .then((response) => {
        if (active) {
          setData(response);
          onDueCountChange(response.due_count);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Không thể tải phiên ôn.");
        }
      });
    return () => {
      active = false;
    };
  }, [onDueCountChange]);

  return (
    <section>
      <p className="page-kicker">Review</p>
      <h1 className="page-title">Ôn hôm nay</h1>
      <p className="page-copy">Một phiên ôn ngắn, mỗi thẻ một quyết định. Từ khó quay lại sớm hơn.</p>

      <div className="review-hero">
        <div className="panel pad">
          <h2 className="panel-title">{data?.due_count ?? 0} từ đang chờ bạn</h2>
          <p className="panel-copy">Khoảng {data?.estimated_minutes ?? 0} phút. Phiên này ưu tiên từ đến hạn hôm nay.</p>
          <div className="snapshot-grid">
            <div className="stat">
              <strong>{data?.due_count ?? 0}</strong>
              <span>đến hạn</span>
            </div>
            <div className="stat">
              <strong>{data?.hard_count ?? 0}</strong>
              <span>từ khó nhớ</span>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={onStart}
            type="button"
            style={{ marginTop: 14 }}
            disabled={!data || data.items.length === 0}
          >
            Bắt đầu ôn
          </button>
        </div>

        <div className="panel pad">
          <h2 className="panel-title">Sắp ôn</h2>
          <div className="due-preview" style={{ marginTop: 16 }}>
            {data?.items.map((item) => (
              <span className="token review" key={item.id}>
                <span>{item.word}</span>
                <small style={{ display: "block" }}>{item.pinyin}</small>
              </span>
            )) ?? null}
          </div>
          {error ? <div className="state-note warning">{error}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function ReviewSession({
  onFinish
}: {
  onFinish: (
    summary: { total: number; forgot: number; vague: number; remembered: number; easy: number },
    latestDueCount: number
  ) => void;
}) {
  const [reviewData, setReviewData] = useState<ReviewTodayResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [pendingRevealResult, setPendingRevealResult] = useState<"forgot" | "vague" | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .reviewsToday()
      .then((response) => {
        if (active) {
          setReviewData(response);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Không thể tải danh sách ôn.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const items = reviewData?.items ?? [];
  const current = items[index];
  const progress = items.length > 0 ? `${index + 1} / ${items.length}` : "0 / 0";

  async function submit(result: ReviewResult) {
    if (!current) return;
    setError(null);
    try {
      await api.submitReview(current.id, result);
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

  if (!current) {
    return (
      <section>
        <div className="panel empty">
          <h2>Không có từ đến hạn</h2>
          <p>{error ?? "Hiện chưa có phiên ôn nào cần bắt đầu."}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="page-kicker">Review session</p>
      <h1 className="page-title">Review session</h1>

      <article className="panel pad review-card">
        <p className="meta">{progress}</p>
        <h2 className="review-word">{current.word}</h2>
        <p className="meta">{current.pinyin}</p>

        {!pendingRevealResult ? (
          <>
            <p className="panel-copy" style={{ marginInline: "auto" }}>
              Chọn ngay mức độ nhớ của bạn. Chỉ các mức khó mới lật nghĩa của từ.
            </p>
            <div className="result-buttons upfront">
              <button className="btn forgot" onClick={() => void handlePrimaryChoice("forgot")} type="button">
                Chưa nhớ
              </button>
              <button className="btn vague" onClick={() => void handlePrimaryChoice("vague")} type="button">
                Cần ôn tập
              </button>
              <button className="btn remembered" onClick={() => void handlePrimaryChoice("remembered")} type="button">
                Nhớ
              </button>
              <button className="btn easy" onClick={() => void handlePrimaryChoice("easy")} type="button">
                Dễ
              </button>
            </div>
          </>
        ) : (
          <div className="review-answer">
            <div className="assessment-pill">
              Bạn đã chọn: {pendingRevealResult === "forgot" ? "Chưa nhớ" : "Cần ôn tập"}
            </div>
            <div className="detail-section">
              <h3>Nghĩa</h3>
              <p>{current.meaning_vi}</p>
            </div>

            <div className="detail-section">
              <h3>Ví dụ</h3>
              <div className="example">
                <div className="zh">{current.example_zh}</div>
                <p>{current.example_vi}</p>
              </div>
            </div>

            <div className="result-buttons confirm">
              <button className="btn forgot" onClick={() => void submit("forgot")} type="button">
                Chưa nhớ
              </button>
              <button className="btn vague" onClick={() => void submit("vague")} type="button">
                Cần ôn tập
              </button>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setPendingRevealResult(null)} type="button">
                Quay lại chọn mức
              </button>
            </div>
          </div>
        )}

        {error ? <div className="state-note warning">{error}</div> : null}
      </article>
    </section>
  );
}

export function ReviewComplete({
  summary,
  onAnalyze,
  onReview
}: {
  summary: { total: number; forgot: number; vague: number; remembered: number; easy: number };
  onAnalyze: () => void;
  onReview: () => void;
}) {
  return (
    <section>
      <div className="panel empty">
        <h2>Đã ôn xong hôm nay</h2>
        <p>
          {summary.total} từ đã ôn. {summary.remembered + summary.easy} nhớ tốt, {summary.vague} mơ hồ, {summary.forgot} quên.
        </p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={onReview} type="button">
            Về trang ôn
          </button>
          <button className="btn btn-primary" onClick={onAnalyze} type="button">
            Học thêm từ mới
          </button>
        </div>
      </div>
    </section>
  );
}
