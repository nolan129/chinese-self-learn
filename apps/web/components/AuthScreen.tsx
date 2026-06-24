"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

type AuthPayload = {
  email: string;
  password: string;
  display_name?: string;
};

export function AuthScreen({
  isBusy,
  onLogin,
  onRegister
}: {
  isBusy: boolean;
  onLogin: (payload: AuthPayload) => Promise<void>;
  onRegister: (payload: AuthPayload) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      if (mode === "login") {
        await onLogin({ email, password });
        return;
      }
      await onRegister({ email, password, display_name: displayName });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể xác thực tài khoản.");
    }
  }

  return (
    <main className="auth-shell">
      <section className="panel pad auth-panel">
        <div className="auth-brand">
          <div className="brand-mark">汉</div>
          <div>
            <strong>Hán Note</strong>
            <span>Đăng nhập để đồng bộ học và ôn trên mọi thiết bị.</span>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Chọn chế độ xác thực">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Đăng nhập
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Đăng ký
          </button>
        </div>

        <div className="auth-form">
          {mode === "register" ? (
            <label>
              <span className="meta">Tên hiển thị</span>
              <input
                className="input auth-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ví dụ: Sơn"
              />
            </label>
          ) : null}

          <label>
            <span className="meta">Email</span>
            <input
              className="input auth-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ban@example.com"
              type="email"
            />
          </label>

          <label>
            <span className="meta">Mật khẩu</span>
            <input
              className="input auth-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              type="password"
            />
          </label>
        </div>

        <div className="auth-actions">
          <p className="panel-copy">
            Dữ liệu từ vựng, lịch ôn và cài đặt thông báo sẽ được lưu theo tài khoản.
          </p>
          <button className="btn btn-primary" disabled={isBusy} onClick={() => void submit()} type="button">
            {isBusy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </div>

        {error ? <div className="state-note warning">{error}</div> : null}
      </section>
    </main>
  );
}
