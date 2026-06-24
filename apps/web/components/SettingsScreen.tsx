import { useEffect, useState } from "react";
import { api, type AuthUser, type NotificationSettings } from "../lib/api";

export function SettingsScreen({
  currentUser,
  isLoggingOut,
  onLogout
}: {
  currentUser: AuthUser;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getNotificationSettings()
      .then((response) => {
        if (active) {
          setSettings(response);
        }
      })
      .catch((nextError) => {
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
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const nextSettings = await api.updateNotificationSettings(settings);
      setSettings(nextSettings);
      setMessage("Đã lưu cài đặt.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể lưu cài đặt.");
    } finally {
      setIsSaving(false);
    }
  }

  async function sendTelegramTest() {
    if (!settings) return;
    setError(null);
    setMessage(null);
    try {
      const response = await api.testTelegram(settings.telegram_chat_id);
      setMessage(response.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể gửi test Telegram.");
    }
  }

  if (!settings) {
    return (
      <section>
        <div className="panel empty">
          <h2>Đang tải cài đặt</h2>
          <p>{error ?? "Đang lấy settings từ backend."}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="page-kicker">Settings</p>
      <h1 className="page-title">Settings</h1>
      <p className="page-copy">Quản lý giờ nhắc, kênh thông báo và cách Hán Note lưu ví dụ.</p>

      <div className="settings-grid">
        <div className="panel pad setting-row">
          <div>
            <h2 className="panel-title">Tài khoản</h2>
            <p className="panel-copy">Bộ nhớ ôn tập và kho từ vựng được gắn theo tài khoản đăng nhập.</p>
          </div>
          <div className="account-card">
            <div>
              <strong>{currentUser.display_name}</strong>
              <p>{currentUser.email}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => void onLogout()} type="button" disabled={isLoggingOut}>
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        </div>

        <div className="panel pad setting-row">
          <div>
            <h2 className="panel-title">Nhắc ôn</h2>
            <p className="panel-copy">Tính theo timezone của bạn.</p>
          </div>
          <div className="actions">
            <label>
              <span className="meta">Giờ nhắc</span>
              <input
                className="input"
                type="time"
                value={settings.daily_reminder_time}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, daily_reminder_time: event.target.value } : current
                  )
                }
              />
            </label>
            <label>
              <span className="meta">Timezone</span>
              <input
                className="input"
                value={settings.timezone}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, timezone: event.target.value } : current
                  )
                }
              />
            </label>
          </div>
        </div>

        <div className="panel pad setting-row">
          <div>
            <h2 className="panel-title">Kênh thông báo</h2>
            <p className="panel-copy">Mỗi kênh chỉ gửi một nhắc ôn mỗi ngày.</p>
          </div>
          <div>
            <Toggle
              label="Push notification"
              enabled={settings.app_push_enabled}
              onToggle={() =>
                setSettings((current) =>
                  current ? { ...current, app_push_enabled: !current.app_push_enabled } : current
                )
              }
            />
            <Toggle
              label="Telegram"
              enabled={settings.telegram_enabled}
              onToggle={() =>
                setSettings((current) =>
                  current ? { ...current, telegram_enabled: !current.telegram_enabled } : current
                )
              }
            />

            <label style={{ display: "block", marginTop: 14 }}>
              <span className="meta">Telegram chat ID</span>
              <input
                className="input"
                value={settings.telegram_chat_id ?? ""}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, telegram_chat_id: event.target.value } : current
                  )
                }
              />
            </label>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => void sendTelegramTest()} type="button">
                Gửi thử Telegram
              </button>
              <button className="btn btn-primary" onClick={() => void save()} type="button" disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            </div>
          </div>
        </div>

        <div className="panel pad setting-row">
          <div>
            <h2 className="panel-title">Quyền riêng tư</h2>
            <p className="panel-copy">
              Hán Note không lưu toàn bộ lịch sử chat. App chỉ lưu từ bạn chọn học và ví dụ ngắn gắn với từ đó.
            </p>
          </div>
          <div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.privacy_no_source_sentence}
                onChange={() =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          privacy_no_source_sentence: !current.privacy_no_source_sentence
                        }
                      : current
                  )
                }
              />
              <span>Không lưu câu nguồn từ nội dung đã dán</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.privacy_anonymize_before_save}
                onChange={() =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          privacy_anonymize_before_save: !current.privacy_anonymize_before_save
                        }
                      : current
                  )
                }
              />
              <span>Ẩn danh tên riêng trước khi lưu ví dụ</span>
            </label>
            {message ? <div className="state-note">{message}</div> : null}
            {error ? <div className="state-note warning">{error}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  label,
  enabled,
  onToggle
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button
        className={`switch ${enabled ? "on" : ""}`}
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}
