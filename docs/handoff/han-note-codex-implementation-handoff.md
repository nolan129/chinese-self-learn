# Han Note - Codex Implementation Handoff

## 1. Mục Tiêu Tài Liệu

Tài liệu này là bản bàn giao triển khai cho Codex để bắt đầu xây dựng hệ thống **Hán Note**: hệ thống học tiếng Trung cá nhân bằng AI, phục vụ đọc hiểu nội dung chat công việc, lưu từ vựng cần học và ôn tập hằng ngày.

Tài liệu đã bổ sung thiết kế frontend từ file người dùng cung cấp:

```text
/workspace/user_files/01-han-note-ui-starter.zip
```

Starter UI đã được kiểm tra và gồm:

- `han-note-ui-starter/web-next`: web app bằng Next.js.
- `han-note-ui-starter/mobile-expo`: mobile app bằng Expo/React Native.
- Cả hai app hiện dùng mock data và local state.
- Nhiệm vụ triển khai tiếp theo là nối UI này với backend, AI service, database và notification service.

---

## 2. Quyết Định Sản Phẩm Đã Chốt

### 2.1. Phạm vi sử dụng

- Hệ thống dùng cá nhân, nội bộ.
- Có web app và mobile app.
- MVP có thể dùng một user mặc định, nhưng backend vẫn nên thiết kế có `user_id` để mở rộng.

### 2.2. AI behavior

- AI giải thích hoàn toàn bằng tiếng Việt.
- AI tách từ theo đơn vị có nghĩa, không tách từng chữ Hán nếu đó là từ ghép/cụm có nghĩa.
- Ví dụ `你看见他吗？` phải được tách thành `你 / 看见 / 他 / 吗 / ？`.
- AI không cần gợi ý cách trả lời đồng nghiệp.

### 2.3. Privacy

- Không lưu lịch sử đầy đủ toàn bộ đoạn chat đã dán.
- Chỉ lưu từ/cụm từ người dùng chọn học.
- Có thể lưu câu ví dụ ngắn gắn với từ vựng.
- Frontend starter đã có setting:
  - `Không lưu câu nguồn từ nội dung đã dán`.
  - `Ẩn danh tên riêng trước khi lưu ví dụ`.
- Backend cần hỗ trợ hai setting privacy này.

### 2.4. Notification

- Nhắc lịch qua push notification của app.
- Nhắc lịch qua Telegram.
- Mỗi channel chỉ nên gửi tối đa một nhắc ôn chính mỗi ngày.
- Timezone mặc định: `Asia/Bangkok`.

---

## 3. Frontend Starter Đã Cung Cấp

## 3.1. Web app: `web-next`

### Stack hiện có

- Next.js.
- React.
- TypeScript.
- CSS trong `app/globals.css`.
- Mock data trong `lib/mockData.ts`.

### Cấu trúc màn hình web

Web app dùng top navigation với 4 mục chính:

1. `Analyze`
2. `Review`
3. `Vocabulary`
4. `Settings`

Các page state nội bộ:

- `analyze`
- `explanation`
- `review`
- `review-session`
- `review-complete`
- `vocabulary`
- `settings`

### Component chính

| File | Vai trò |
|---|---|
| `app/page.tsx` | Điều phối navigation và page state web. |
| `components/AppHeader.tsx` | Header, navigation, due count. |
| `components/AnalyzeScreen.tsx` | Nhập tiếng Trung, gọi phân tích, hiển thị token, chọn trạng thái token. |
| `components/TokenChip.tsx` | Token chip và status picker. |
| `components/ExplanationScreen.tsx` | Hiển thị giải nghĩa từ đã chọn, CTA lưu/ôn. |
| `components/ReviewScreen.tsx` | Review home, review session, review complete. |
| `components/VocabularyScreen.tsx` | Tìm kiếm, lọc, danh sách và chi tiết từ vựng. |
| `components/SettingsScreen.tsx` | Reminder, notification channel, privacy settings. |
| `lib/mockData.ts` | Type và mock data cần thay bằng API data. |

### Web flow hiện có

1. Người dùng ở màn `Analyze`.
2. Người dùng nhập nội dung tiếng Trung.
3. Bấm `Phân tích`.
4. App hiển thị câu, bản dịch, giải thích tự nhiên và token chips.
5. Người dùng click token.
6. App hiển thị status picker:
   - Đã biết
   - Chưa biết
   - Muốn ôn lại
   - Bỏ qua
7. Nếu có token `unknown` hoặc `review`, sticky action xuất hiện.
8. Người dùng bấm `Giải nghĩa n từ`.
9. App chuyển sang màn `Giải nghĩa`.
10. Người dùng bấm:
    - `Đến kho từ vựng`, hoặc
    - `Lưu và ôn ngay`.

### Web data shape hiện tại

`TokenStatus`:

```ts
type TokenStatus = "unselected" | "known" | "unknown" | "review" | "ignored";
```

`Token`:

```ts
type Token = {
  token_index: number;
  text: string;
  pinyin: string | null;
  meaning_vi_brief: string | null;
  token_type: string;
  is_learnable: boolean;
  status: TokenStatus;
};
```

`Explanation`:

```ts
type Explanation = {
  word: string;
  pinyin: string;
  meaning_vi: string;
  meaning_in_context_vi: string;
  part_of_speech: string;
  usage_note_vi: string;
  examples: {
    zh: string;
    pinyin: string;
    vi: string;
  }[];
  difficulty_suggestion: "easy" | "medium" | "hard";
};
```

Codex phải giữ hoặc mở rộng shape này để giảm thay đổi UI.

## 3.2. Mobile app: `mobile-expo`

### Stack hiện có

- Expo.
- React Native.
- TypeScript.
- Theme trong `src/theme/theme.ts`.
- Mock data trong `src/data/mockData.ts`.

### Cấu trúc tab mobile

Mobile dùng bottom tab với 4 tab:

1. `Học`
2. `Ôn`
3. `Từ vựng`
4. `Cài đặt`

State nội bộ:

- `LearnMode`: `input`, `result`, `explanation`.
- `ReviewMode`: `home`, `session`, `complete`.

### Component chính

| File | Vai trò |
|---|---|
| `App.tsx` | Điều phối toàn bộ tab và screen mobile. |
| `src/components/Primitives.tsx` | Button, Card, Field, ScreenHeader. |
| `src/components/TokenChip.tsx` | Token chip mobile. |
| `src/data/mockData.ts` | Mock token, explanation, vocabulary. |
| `src/theme/theme.ts` | Color, radius, spacing. |

### Mobile flow hiện có

1. Tab `Học`: nhập nội dung tiếng Trung.
2. Bấm `Phân tích`.
3. Xem kết quả phân tích.
4. Tap token để mở bottom sheet chọn trạng thái.
5. Bấm `Giải nghĩa n từ`.
6. Xem các card giải nghĩa.
7. Bấm `Lưu và ôn ngay` để sang review session.
8. Tab `Ôn`: home, session, complete.
9. Tab `Từ vựng`: danh sách từ.
10. Tab `Cài đặt`: reminder, notification, privacy.

### Mobile limitation hiện tại

Mobile starter hiện đơn giản hơn web ở vài điểm:

- Vocabulary chưa có detail view đầy đủ như web.
- Settings hiện là text/static, chưa có interactive toggle.
- Explanation mock dùng `example_zh`, `example_pinyin`, `example_vi` thay vì mảng `examples`.

Codex khi triển khai nên chuẩn hóa data từ backend rồi adapter sang UI, hoặc cập nhật mobile UI để dùng cùng shape với web.

---

## 4. Kiến Trúc Triển Khai Đề Xuất

## 4.1. Repo structure mục tiêu

Codex nên dùng starter UI làm nền và tổ chức project theo dạng monorepo hoặc workspace:

```text
han-note/
  apps/
    web/                 # từ han-note-ui-starter/web-next
    mobile/              # từ han-note-ui-starter/mobile-expo
    api/                 # backend API
  packages/
    shared/              # shared types, validation schema nếu cần
  docs/
    handoff/
  README.md
```

Nếu không dùng monorepo, vẫn cần giữ rõ ba phần:

- Web app.
- Mobile app.
- Backend API.

## 4.2. Stack khuyến nghị để bắt đầu

Vì frontend đã là Next.js và Expo, stack khuyến nghị:

- Web: Next.js từ starter.
- Mobile: Expo/React Native từ starter.
- Backend: Node.js/NestJS hoặc FastAPI đều được.
- Database: PostgreSQL cho bản triển khai bền vững; SQLite chỉ dùng nếu muốn prototype cực nhanh.
- Shared API types: OpenAPI schema hoặc TypeScript types generated từ API.
- Push notification: Expo Push Notification nếu mobile dùng Expo managed workflow; Firebase Cloud Messaging nếu chuyển sang native/full setup.
- Telegram: Telegram Bot API.

Nếu Codex không có yêu cầu stack khác, khuyến nghị chọn:

```text
Web: Next.js
Mobile: Expo
Backend: FastAPI
Database: PostgreSQL
AI: OpenAI API hoặc provider AI tương thích JSON schema
```

Lý do: API rõ, dễ test, dễ phục vụ cả web và mobile.

---

## 5. Backend Modules Cần Xây

## 5.1. AI Analysis Module

### Chức năng

- Nhận text tiếng Trung.
- Validate input.
- Gọi AI tách câu và token.
- Trả JSON đúng shape frontend cần.
- Không lưu lịch sử phân tích đầy đủ.

### API

```http
POST /api/analyze
```

Request:

```json
{
  "text": "你看见他吗？"
}
```

Response:

```json
{
  "analysis_id": "analysis_temp_001",
  "original_text": "你看见他吗？",
  "sentences": [
    {
      "sentence_index": 0,
      "text": "你看见他吗？",
      "translation_vi": "Bạn có thấy anh ấy không?",
      "natural_explanation_vi": "Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.",
      "tokens": [
        {
          "token_index": 0,
          "text": "你",
          "pinyin": "ni",
          "meaning_vi_brief": "bạn",
          "token_type": "pronoun",
          "is_learnable": true,
          "status": "unselected",
          "confidence": 0.99
        }
      ]
    }
  ]
}
```

### Frontend mapping

- Web `AnalyzeScreen` phải thay mock `initialTokens` bằng response `sentences[0].tokens` hoặc render nhiều câu nếu response có nhiều câu.
- Mobile `AnalyzeResult` phải nhận dữ liệu analyze thật thay vì mock.
- Token mặc định từ backend nên có `status = "unselected"` với token học được, và `status = "ignored"` với punctuation.

## 5.2. Token Explanation Module

### Chức năng

- Nhận câu gốc và danh sách token có status `unknown` hoặc `review`.
- Gọi AI giải nghĩa bằng tiếng Việt.
- Trả explanation list.
- Không gợi ý cách trả lời đồng nghiệp.

### API

```http
POST /api/explain-tokens
```

Request:

```json
{
  "original_text": "你看见他吗？",
  "sentences": [
    {
      "sentence_index": 0,
      "text": "你看见他吗？",
      "translation_vi": "Bạn có thấy anh ấy không?",
      "natural_explanation_vi": "Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.",
      "tokens": [
        {
          "token_index": 1,
          "text": "看见",
          "pinyin": "kan jian",
          "meaning_vi_brief": "nhìn thấy",
          "user_status": "unknown"
        }
      ]
    }
  ]
}
```

Response:

```json
{
  "explanations": [
    {
      "word": "看见",
      "pinyin": "kan jian",
      "meaning_vi": "nhìn thấy, thấy được",
      "meaning_in_context_vi": "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
      "part_of_speech": "verb",
      "usage_note_vi": "看见 nhấn mạnh kết quả là đã nhìn thấy, khác với 看 chỉ là hành động nhìn.",
      "examples": [
        {
          "zh": "你看见我的手机吗？",
          "pinyin": "ni kan jian wo de shou ji ma",
          "vi": "Bạn có thấy điện thoại của tôi không?"
        }
      ],
      "difficulty_suggestion": "medium"
    }
  ]
}
```

### Frontend mapping

- Web `ExplanationScreen` dùng trực tiếp `explanations`.
- Mobile nên được cập nhật để dùng `examples[0]` hoặc render mảng `examples` thay vì chỉ `example_zh`.

## 5.3. Vocabulary Module

### Chức năng

- Lưu từ đã giải nghĩa vào kho học.
- Deduplicate theo `user_id + normalized_word + pinyin`.
- Nếu từ đã có, bổ sung example/context thay vì tạo bản ghi mới.
- Hỗ trợ tìm kiếm và filter.
- Hỗ trợ action thủ công: ôn từ này, đánh dấu đã thuộc.

### API

```http
POST /api/vocabulary
GET /api/vocabulary
GET /api/vocabulary/{id}
PATCH /api/vocabulary/{id}
POST /api/vocabulary/{id}/examples
```

### Save request

```json
{
  "items": [
    {
      "word": "看见",
      "pinyin": "kan jian",
      "meaning_vi": "nhìn thấy, thấy được",
      "meaning_in_context_vi": "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy.",
      "part_of_speech": "verb",
      "usage_note_vi": "看见 nhấn mạnh kết quả là đã nhìn thấy.",
      "difficulty": "medium",
      "source_sentence_zh": "你看见他吗？",
      "source_sentence_vi": "Bạn có thấy anh ấy không?",
      "examples": [
        {
          "zh": "你看见我的手机吗？",
          "pinyin": "ni kan jian wo de shou ji ma",
          "vi": "Bạn có thấy điện thoại của tôi không?"
        }
      ]
    }
  ]
}
```

### List response item cần hỗ trợ UI

```json
{
  "id": "vocab_001",
  "word": "看见",
  "pinyin": "kan jian",
  "meaning_vi": "nhìn thấy, thấy được",
  "meaning_in_context_vi": "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
  "part_of_speech": "verb",
  "usage_note_vi": "看见 nhấn mạnh kết quả là đã nhìn thấy.",
  "status": "learning",
  "difficulty": "medium",
  "review_stage": 2,
  "review_count": 4,
  "next_review_at": "2026-06-03",
  "next_review_label": "Hôm nay",
  "example_zh": "你看见他吗？",
  "example_vi": "Bạn có thấy anh ấy không?"
}
```

### Frontend mapping

- Web `VocabularyScreen` cần gọi `GET /api/vocabulary` với query và filter.
- Web detail dùng item đã chọn hoặc gọi `GET /api/vocabulary/{id}`.
- Mobile `VocabularyScreen` cần thay mock bằng list API; có thể thêm detail view sau nếu UI designer bổ sung.

## 5.4. Review Module

### Chức năng

- Lấy danh sách từ đến hạn hôm nay.
- Submit kết quả ôn.
- Cập nhật review stage, next review date, review log.
- Trả thống kê phiên ôn sau khi hoàn thành.

### API

```http
GET /api/reviews/today
POST /api/reviews/{vocab_id}/submit
POST /api/reviews/session/start
POST /api/reviews/session/complete
```

### `GET /api/reviews/today` response

```json
{
  "date": "2026-06-03",
  "timezone": "Asia/Bangkok",
  "due_count": 12,
  "hard_count": 4,
  "estimated_minutes": 6,
  "items": [
    {
      "id": "vocab_001",
      "word": "看见",
      "pinyin": "kan jian",
      "meaning_vi": "nhìn thấy, thấy được",
      "example_zh": "你看见他吗？",
      "example_vi": "Bạn có thấy anh ấy không?",
      "difficulty": "medium",
      "review_stage": 2
    }
  ]
}
```

### Submit result request

```json
{
  "result": "remembered"
}
```

Allowed result values:

- `forgot`
- `vague`
- `remembered`
- `easy`

### Frontend mapping

- Web `ReviewHome` dùng `due_count`, `hard_count`, `estimated_minutes`, `items`.
- Web `ReviewSession` dùng `items` thay `reviewItems` mock.
- Web `ReviewComplete` hiển thị summary thật từ session.
- Mobile review dùng cùng API.

## 5.5. Notification Settings Module

### API

```http
GET /api/notification-settings
PUT /api/notification-settings
POST /api/notifications/test-telegram
POST /api/notifications/register-push-token
```

### Settings shape

```json
{
  "timezone": "Asia/Bangkok",
  "daily_reminder_time": "21:00",
  "app_push_enabled": true,
  "telegram_enabled": true,
  "telegram_chat_id": "123456789",
  "mobile_push_token": "push_token_value",
  "privacy_no_source_sentence": false,
  "privacy_anonymize_before_save": false
}
```

### Frontend mapping

- Web `SettingsScreen` currently has interactive toggles and inputs. Wire them to `GET/PUT /api/notification-settings`.
- Web `Gửi thử Telegram` calls `POST /api/notifications/test-telegram`.
- Mobile settings currently static. Codex should either:
  - make it interactive with the same API, or
  - leave static only for first integration pass and document the gap.
- Mobile app must call `POST /api/notifications/register-push-token` after obtaining push token.

---

## 6. Database Schema Đề Xuất

## 6.1. `users`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string | MVP can use default user. |
| `display_name` | string | Example: Nolan Wu. |
| `timezone` | string | Default `Asia/Bangkok`. |
| `created_at` | datetime |  |

## 6.2. `vocabulary_items`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string |  |
| `user_id` | UUID/string |  |
| `word` | string | Chinese word/phrase. |
| `normalized_word` | string | For dedupe/search. |
| `pinyin` | string |  |
| `meaning_vi` | text | Vietnamese only. |
| `meaning_in_context_vi` | text | Vietnamese only. |
| `part_of_speech` | string |  |
| `usage_note_vi` | text nullable |  |
| `status` | enum | `learning`, `reviewing`, `mastered`, `ignored`. |
| `difficulty` | enum | `easy`, `medium`, `hard`. |
| `review_stage` | int | Starts at 0. |
| `review_count` | int |  |
| `successful_review_count` | int |  |
| `memory_strength` | int | 0-100. |
| `last_reviewed_at` | datetime nullable |  |
| `next_review_at` | date nullable |  |
| `created_at` | datetime |  |
| `updated_at` | datetime |  |

Unique constraint:

```text
user_id + normalized_word + pinyin
```

## 6.3. `vocabulary_examples`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string |  |
| `vocab_id` | UUID/string |  |
| `source_sentence_zh` | text nullable | Null if privacy setting disables source sentence saving. |
| `source_sentence_vi` | text nullable |  |
| `example_zh` | text | AI example or source example. |
| `example_pinyin` | text nullable |  |
| `example_vi` | text |  |
| `is_user_source` | boolean |  |
| `created_at` | datetime |  |

## 6.4. `review_logs`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string |  |
| `user_id` | UUID/string |  |
| `vocab_id` | UUID/string |  |
| `reviewed_at` | datetime |  |
| `result` | enum | `forgot`, `vague`, `remembered`, `easy`. |
| `previous_stage` | int |  |
| `next_stage` | int |  |
| `next_review_at` | date |  |

## 6.5. `notification_settings`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string |  |
| `user_id` | UUID/string |  |
| `timezone` | string | Default `Asia/Bangkok`. |
| `daily_reminder_time` | time | Default `21:00`. |
| `app_push_enabled` | boolean |  |
| `telegram_enabled` | boolean |  |
| `telegram_chat_id` | string nullable |  |
| `mobile_push_token` | text nullable |  |
| `privacy_no_source_sentence` | boolean | From UI setting. |
| `privacy_anonymize_before_save` | boolean | From UI setting. |
| `created_at` | datetime |  |
| `updated_at` | datetime |  |

## 6.6. `notification_logs`

| Field | Type | Note |
|---|---|---|
| `id` | UUID/string |  |
| `user_id` | UUID/string |  |
| `channel` | enum | `app_push`, `telegram`. |
| `sent_at` | datetime |  |
| `status` | enum | `sent`, `failed`, `skipped`. |
| `due_vocab_count` | int |  |
| `message_preview` | text |  |
| `failure_reason` | text nullable |  |

---

## 7. AI Prompt Contracts

## 7.1. Analyze prompt

System:

```text
Bạn là trợ lý học tiếng Trung cho người Việt. Nhiệm vụ của bạn là phân tích câu hoặc đoạn tiếng Trung để hỗ trợ học từ vựng theo ngữ cảnh công việc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.
Tất cả nội dung giải thích và dịch nghĩa phải bằng tiếng Việt.
Không gợi ý cách trả lời đồng nghiệp.
```

User:

```text
Hãy phân tích nội dung tiếng Trung sau.

Yêu cầu:
1. Chia nội dung thành các câu nếu có nhiều câu.
2. Với mỗi câu, tách thành các từ hoặc cụm từ có nghĩa trong tiếng Trung hiện đại.
3. Không tách từng chữ nếu các chữ tạo thành một từ ghép hoặc cụm cố định có nghĩa.
4. Giữ dấu câu dưới dạng token loại punctuation, is_learnable = false, status = ignored.
5. Với token có thể học, cung cấp pinyin, nghĩa tiếng Việt ngắn, loại token, confidence và status = unselected.
6. Dịch nghĩa toàn câu sang tiếng Việt.
7. Giải thích ý tự nhiên của câu bằng tiếng Việt.

Nội dung:
{{text}}
```

## 7.2. Explain prompt

System:

```text
Bạn là trợ lý học tiếng Trung cho người Việt. Hãy giải thích từ/cụm từ tiếng Trung theo ngữ cảnh câu gốc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.
Tất cả giải thích phải bằng tiếng Việt. Không dùng tiếng Anh trừ khi tiếng Anh là một phần bắt buộc của thuật ngữ gốc.
Không gợi ý cách trả lời lại đồng nghiệp.
```

User:

```text
Hãy giải thích các token được chọn trong câu tiếng Trung sau.

Yêu cầu:
1. Chỉ giải thích target_tokens.
2. Giải thích nghĩa theo đúng ngữ cảnh câu gốc.
3. Nếu token có nhiều nghĩa, ưu tiên nghĩa đang dùng trong câu.
4. Cung cấp pinyin, nghĩa tiếng Việt, nghĩa trong ngữ cảnh, loại từ, ghi chú sử dụng và ví dụ.
5. Ví dụ nên gần với giao tiếp công việc hoặc đời sống phổ biến.
6. Không gợi ý cách phản hồi.

Câu gốc:
{{sentence_text}}

Bản dịch câu:
{{sentence_translation_vi}}

Target tokens:
{{target_tokens_json}}
```

---

## 8. Review Scheduling Logic

### 8.1. Review stages

| Stage | Next interval |
|---:|---:|
| 0 | 0 hoặc 1 ngày |
| 1 | 1 ngày |
| 2 | 3 ngày |
| 3 | 7 ngày |
| 4 | 14 ngày |
| 5 | 30 ngày |

### 8.2. Submit result rule

- `forgot`: `next_stage = max(0, current_stage - 1)`, `next_review_at = tomorrow`, difficulty có thể tăng thành `hard`.
- `vague`: giữ nguyên stage hoặc tăng nhẹ 1 stage, `next_review_at` theo interval tương ứng.
- `remembered`: tăng 1 stage.
- `easy`: tăng 2 stage, tối đa 5.
- Nếu stage >= 5 và có ít nhất 4 review thành công gần nhất, set `status = mastered`.

### 8.3. Label rule cho frontend

Backend nên trả `next_review_label` để web/mobile không phải tự tính tiếng Việt.

Ví dụ:

- `Hôm nay`
- `Ngày mai`
- `3 ngày nữa`
- `Đã thuộc`

---

## 9. Notification Logic

### 9.1. Daily reminder job

Mỗi ngày theo `daily_reminder_time` và `timezone` của user:

1. Query từ có `next_review_at <= today` và status `learning` hoặc `reviewing`.
2. Nếu `due_count = 0`, không gửi.
3. Nếu `app_push_enabled = true` và có push token, gửi push.
4. Nếu `telegram_enabled = true` và có Telegram chat ID, gửi Telegram.
5. Ghi `notification_logs` cho từng channel.

### 9.2. Message copy

Push:

```text
Hôm nay bạn có 12 từ tiếng Trung cần ôn. Mở app để bắt đầu nhé.
```

Telegram:

```text
Hôm nay bạn có 12 từ tiếng Trung cần ôn.
Vào app để ôn lại các từ đến hạn.
```

---

## 10. Privacy Handling Khi Lưu Vocabulary

Khi lưu từ vựng, backend phải đọc settings:

```json
{
  "privacy_no_source_sentence": false,
  "privacy_anonymize_before_save": false
}
```

### Case 1: `privacy_no_source_sentence = false`

- Được lưu câu nguồn ngắn chứa từ.
- Không lưu toàn bộ đoạn chat như một history/session.

### Case 2: `privacy_no_source_sentence = true`

- Không lưu `source_sentence_zh` từ nội dung người dùng dán.
- Chỉ lưu ví dụ do AI tạo hoặc để trống source sentence.

### Case 3: `privacy_anonymize_before_save = true`

- Trước khi lưu example/source sentence, backend hoặc AI service cần ẩn danh tên riêng, tên người, tên dự án nếu nhận diện được.
- Không được trình bày anonymization như bảo mật tuyệt đối; đây chỉ là giảm rủi ro.

---

## 11. Frontend Integration Tasks Cho Codex

## 11.1. Web integration tasks

1. Copy/import `web-next` thành app web chính.
2. Thay mock data trong `lib/mockData.ts` bằng API client và types thật.
3. `AnalyzeScreen`:
   - Gọi `POST /api/analyze`.
   - Render response thật.
   - Giữ local token status trong phiên hiện tại.
   - Gọi `POST /api/explain-tokens` khi bấm giải nghĩa.
4. `ExplanationScreen`:
   - Nhận explanation result từ analyze flow.
   - Gọi `POST /api/vocabulary` khi lưu.
   - Điều hướng sang vocabulary hoặc review session theo CTA.
5. `ReviewScreen`:
   - Gọi `GET /api/reviews/today`.
   - Submit từng kết quả qua `POST /api/reviews/{vocab_id}/submit`.
   - Hiển thị summary thật ở complete screen.
6. `VocabularyScreen`:
   - Gọi `GET /api/vocabulary`.
   - Hỗ trợ search/filter từ API hoặc client-side tùy dataset.
   - Gọi action `mark mastered` khi bấm đánh dấu đã thuộc.
   - Gọi review single item khi bấm ôn từ này.
7. `SettingsScreen`:
   - Gọi `GET/PUT /api/notification-settings`.
   - Gọi `POST /api/notifications/test-telegram`.

## 11.2. Mobile integration tasks

1. Copy/import `mobile-expo` thành app mobile chính.
2. Tạo API client dùng base URL cấu hình bằng env.
3. `LearnHome`:
   - Gọi `POST /api/analyze`.
   - Lưu analysis result trong app state.
4. `AnalyzeResult`:
   - Render token thật.
   - Bottom sheet status picker giữ nguyên behavior.
   - Gọi `POST /api/explain-tokens`.
5. `ExplanationScreen`:
   - Render explanation thật.
   - Hỗ trợ mảng `examples` hoặc adapter từ `examples[0]` sang field hiện tại.
   - Gọi `POST /api/vocabulary` khi lưu.
6. `ReviewHome` và `ReviewSession`:
   - Dùng `GET /api/reviews/today`.
   - Submit result qua API.
7. `VocabularyScreen`:
   - Dùng `GET /api/vocabulary`.
   - Có thể giữ list-only trong MVP nếu chưa có thiết kế detail mobile.
8. `SettingsScreen`:
   - Nên nâng từ static thành interactive settings.
   - Đăng ký push token và gửi lên backend.
   - Gọi test Telegram.

---

## 12. Implementation Milestones

### Milestone 0: Setup

- Giải nén frontend starter.
- Tạo cấu trúc repo mục tiêu.
- Chạy được web app và mobile app với mock data.
- Tạo backend skeleton.
- Tạo database migration đầu tiên.

### Milestone 1: Backend core + AI analyze

- Xây `POST /api/analyze`.
- Implement AI prompt analyze.
- Validate JSON output.
- Test câu `你看见他吗？` tách đúng `看见`.

### Milestone 2: Explanation + vocabulary

- Xây `POST /api/explain-tokens`.
- Xây vocabulary tables và APIs.
- Implement dedupe.
- Implement privacy settings khi lưu source sentence.

### Milestone 3: Web integration

- Nối Analyze flow thật.
- Nối Explanation flow thật.
- Nối Vocabulary list/detail thật.
- Nối Review flow thật.
- Nối Settings thật.

### Milestone 4: Mobile integration

- Nối Learn flow thật.
- Nối Review flow thật.
- Nối Vocabulary thật.
- Nối Settings và push token.

### Milestone 5: Notification

- Telegram bot integration.
- Push notification integration.
- Daily reminder job.
- Notification logs.

### Milestone 6: QA

- Unit tests cho review schedule.
- Unit/integration tests cho dedupe vocabulary.
- Test AI output parse/validation.
- Test privacy setting không lưu source sentence.
- Test Telegram send.
- Test push registration.
- Manual QA web/mobile theo flow chính.

---

## 13. Acceptance Criteria Tổng Thể

### Analyze

- Người dùng nhập tiếng Trung và nhận kết quả phân tích thật từ AI.
- Câu `你看见他吗？` được tách thành `你 / 看见 / 他 / 吗 / ？`.
- Token học được có status mặc định `unselected`.
- Punctuation không được chọn học.
- Không lưu phân tích như lịch sử chat.

### Token selection

- Người dùng chọn được `known`, `unknown`, `review`, `ignored`.
- Chỉ `unknown` và `review` được gửi sang explain/save.

### Explanation

- Giải thích hoàn toàn bằng tiếng Việt.
- Có pinyin, nghĩa, nghĩa trong ngữ cảnh, ghi chú, ví dụ.
- Không có gợi ý trả lời đồng nghiệp.

### Vocabulary

- Lưu được từ đã chọn.
- Không tạo trùng từ theo `user_id + normalized_word + pinyin`.
- Nếu gặp lại từ cũ, bổ sung example/context.
- Tôn trọng setting không lưu câu nguồn.
- Tôn trọng setting ẩn danh trước khi lưu.

### Review

- Hiển thị từ đến hạn hôm nay.
- Review session hoạt động trên web và mobile.
- Submit `forgot`, `vague`, `remembered`, `easy` cập nhật lịch đúng.
- Complete screen hiển thị summary thật.

### Notification

- Lưu được settings notification.
- Gửi được test Telegram.
- Mobile đăng ký được push token.
- Daily reminder gửi đúng khi có từ đến hạn.
- Không spam nhiều notification cùng channel trong cùng ngày.

### Frontend

- Web giữ cấu trúc navigation của starter.
- Mobile giữ cấu trúc bottom tabs của starter.
- Mock data được thay bằng API data.
- Loading, empty, error states được bổ sung tối thiểu cho mỗi API call.

---

## 14. Rủi Ro Và Điểm Cần Codex Chú Ý

1. AI có thể trả JSON lỗi: backend phải retry hoặc trả lỗi rõ ràng.
2. AI có thể tách từ sai: MVP chưa có chức năng gộp/tách thủ công, nên cần cho phép bỏ qua token.
3. Không lưu lịch sử chat đầy đủ: tránh tạo bảng `analysis_sessions` dài hạn chứa toàn bộ input.
4. Câu ví dụ vẫn có thể chứa dữ liệu nhạy cảm: privacy settings cần được áp dụng trước khi lưu.
5. Mobile settings hiện static: cần nâng cấp nếu muốn notification thật.
6. Web và mobile mock data shape chưa hoàn toàn giống nhau: nên chuẩn hóa API response và tạo adapter nếu cần.
7. Timezone phải dùng `Asia/Bangkok` để tính “hôm nay”, không dùng UTC trực tiếp trên UI.

---

## 15. Công Việc Đầu Tiên Codex Nên Làm

1. Giải nén `01-han-note-ui-starter.zip` vào repo mục tiêu.
2. Chạy thử web và mobile với mock để xác nhận UI starter không lỗi.
3. Tạo backend skeleton và database schema.
4. Implement `POST /api/analyze` với AI contract.
5. Nối web `AnalyzeScreen` vào API thật trước.
6. Sau khi Analyze flow chạy đúng, triển khai tiếp Explanation và Vocabulary.

Thứ tự này giúp kiểm chứng phần rủi ro nhất trước: AI tách từ đúng theo đơn vị có nghĩa và dữ liệu trả về khớp UI.

