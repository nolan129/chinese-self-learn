type PageKey = "analyze" | "review" | "vocabulary" | "settings";

const items: { key: PageKey; label: string }[] = [
  { key: "analyze", label: "Phân tích" },
  { key: "review", label: "Ôn tập" },
  { key: "vocabulary", label: "Từ vựng" },
  { key: "settings", label: "Cài đặt" }
];

export function AppHeader({
  activePage,
  onNavigate,
  dueCount
}: {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  dueCount: number;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-mark">汉</div>
          <div>
            <strong>Hán Note</strong>
            <span>AI Chinese study desk</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? "active" : ""}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="due-pill">
          <strong>{dueCount}</strong>
          <span>từ cần ôn</span>
        </div>
      </div>
    </header>
  );
}
