import type { Token, TokenStatus } from "../lib/api";

export function TokenChip({
  token,
  selected,
  onClick
}: {
  token: Token;
  selected?: boolean;
  onClick: () => void;
}) {
  const isDisabled = !token.is_learnable || token.token_type === "punctuation";

  return (
    <button
      type="button"
      className={[
        "token",
        token.status,
        selected ? "selected" : "",
        isDisabled ? "disabled" : ""
      ].join(" ")}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={`Token ${token.text}`}
    >
      <span>{token.text}</span>
      {token.pinyin ? <small>{token.pinyin}</small> : null}
    </button>
  );
}

export function TokenStatusPicker({
  token,
  onSelect
}: {
  token: Token;
  onSelect: (status: TokenStatus) => void;
}) {
  return (
    <div className="panel pad">
      <h2 className="panel-title">{token.text}</h2>
      <p className="panel-copy">
        {token.pinyin} · {token.meaning_vi_brief}
      </p>

      <div className="status-picker">
        <button className="btn known" onClick={() => onSelect("known")} type="button">
          Đã biết
        </button>
        <button className="btn unknown" onClick={() => onSelect("unknown")} type="button">
          Chưa biết
        </button>
        <button className="btn review" onClick={() => onSelect("review")} type="button">
          Muốn ôn lại
        </button>
        <button className="btn btn-secondary" onClick={() => onSelect("ignored")} type="button">
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
