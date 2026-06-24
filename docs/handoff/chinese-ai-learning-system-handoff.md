# Build-Ready Technical Handoff: AI Chinese Learning System

## 1. Tổng Quan Dự Án

### 1.1. Bối cảnh

Người dùng thường xuyên giao tiếp công việc bằng tiếng Trung qua chat. Khi đồng nghiệp gửi nội dung tiếng Trung, người dùng có thể hiểu một phần nhưng thường bị vướng ở một số từ/cụm từ chưa biết. Nhu cầu chính là có một hệ thống giúp phân tích nội dung tiếng Trung, tách từ theo đơn vị có nghĩa, cho phép người dùng đánh dấu từ đã biết/chưa biết, giải nghĩa từ chưa biết bằng tiếng Việt, sau đó đưa các từ này vào lịch ôn tập cá nhân.

### 1.2. Mục tiêu sản phẩm

Xây dựng một hệ thống học tiếng Trung cá nhân, sử dụng AI để hỗ trợ đọc hiểu và ghi nhớ từ vựng từ nội dung chat công việc thực tế.

Hệ thống cần:

- Cho phép người dùng dán câu/đoạn tiếng Trung.
- Dùng AI tách nội dung thành từ/cụm từ có nghĩa.
- Cho phép người dùng đánh dấu từ đã biết, chưa biết hoặc muốn ôn lại.
- Dùng AI giải nghĩa các từ chưa biết hoàn toàn bằng tiếng Việt.
- Lưu từ vựng cần học, không lưu toàn bộ lịch sử đoạn chat đã dán.
- Tạo lịch ôn tập hằng ngày.
- Nhắc ôn tập qua push notification trong app và Telegram.
- Hỗ trợ triển khai dưới dạng web app và mobile app dùng nội bộ cá nhân.

### 1.3. Đối tượng sử dụng

- Người dùng chính: một cá nhân học tiếng Trung để phục vụ giao tiếp công việc.
- Số lượng user ở MVP: 1 user.
- Hệ thống vẫn nên thiết kế có `user_id` để dễ mở rộng về sau, nhưng không cần tính năng quản trị nhiều người dùng trong MVP.

### 1.4. Ngôn ngữ hệ thống

- Nội dung tiếng Trung: do người dùng dán vào.
- Giải thích, dịch nghĩa, ghi chú học tập: hoàn toàn bằng tiếng Việt.
- Pinyin: hiển thị kèm từ/cụm từ tiếng Trung.

---

## 2. Phạm Vi Và Ngoài Phạm Vi

### 2.1. Phạm vi MVP

MVP cần bao gồm các nhóm chức năng sau:

1. Phân tích nội dung tiếng Trung bằng AI.
2. Tách từ/cụm từ theo đơn vị có nghĩa.
3. Đánh dấu trạng thái hiểu biết của từng token.
4. Giải nghĩa từ/cụm từ chưa biết bằng tiếng Việt.
5. Lưu kho từ vựng cá nhân.
6. Tính lịch ôn tập theo spaced repetition đơn giản.
7. Màn hình ôn tập hằng ngày ở mức chức năng.
8. Gửi nhắc nhở qua push notification và Telegram.
9. API backend phục vụ web app và mobile app.

### 2.2. Ngoài phạm vi MVP

Các phần sau không cần triển khai trong MVP:

- Không cần AI gợi ý cách trả lời đồng nghiệp bằng tiếng Trung.
- Không lưu lịch sử đầy đủ toàn bộ đoạn chat đã dán.
- Không cần hệ thống nhiều người dùng hoàn chỉnh.
- Không cần thanh toán, subscription hoặc public signup.
- Không cần thiết kế UI/UX chi tiết trong tài liệu này.
- Không cần luyện nghe/nói.
- Không cần nhận diện giọng nói.
- Không cần OCR ảnh chụp màn hình chat.
- Không cần thuật toán spaced repetition phức tạp như SM-2 đầy đủ ngay từ đầu.

### 2.3. Ghi chú về UI/UX

Tài liệu này không đặc tả thiết kế frontend chi tiết. Phần UI/UX cho web app và mobile app sẽ được bổ sung sau khi có thiết kế từ agent khác.

Codex khi triển khai ở giai đoạn chưa có UI/UX chỉ nên tạo cấu trúc frontend chức năng cơ bản hoặc API/backend trước, tránh tự quyết định style, layout, design system hoặc trải nghiệm thị giác cuối cùng.

---

## 3. Kiến Trúc Hệ Thống Đề Xuất

### 3.1. Thành phần chính

Hệ thống gồm các thành phần:

1. **Web App**
   - Dùng nội bộ.
   - Cho phép nhập nội dung, xem token, đánh dấu từ, xem giải nghĩa, quản lý từ vựng, ôn tập.
   - UI/UX chi tiết chờ bổ sung.

2. **Mobile App**
   - Dùng nội bộ.
   - Có cùng chức năng cốt lõi với web app.
   - Nhận push notification nhắc ôn tập.
   - UI/UX chi tiết chờ bổ sung.

3. **Backend API**
   - Cung cấp API cho web app và mobile app.
   - Quản lý phân tích câu, từ vựng, lịch ôn tập, notification settings.
   - Gọi AI service để phân tích tiếng Trung.

4. **AI Service Layer**
   - Gọi model AI để tách từ, dịch câu, giải thích từ.
   - Chuẩn hóa output AI về JSON có cấu trúc.
   - Validate output trước khi trả về frontend hoặc lưu database.

5. **Database**
   - Lưu từ vựng cá nhân.
   - Lưu ví dụ/ngữ cảnh liên quan đến từ vựng.
   - Lưu lịch ôn tập và review log.
   - Lưu cấu hình notification.

6. **Notification Service**
   - Gửi push notification.
   - Gửi tin nhắn Telegram.
   - Chạy theo lịch hằng ngày.

### 3.2. Kiến trúc triển khai gợi ý

Vì hệ thống dùng cá nhân, có thể chọn kiến trúc đơn giản:

- Backend: Node.js/NestJS hoặc FastAPI.
- Database: PostgreSQL hoặc SQLite cho bản nội bộ rất nhỏ.
- Mobile app: React Native hoặc Flutter.
- Web app: React/Next.js hoặc framework tương thích với stack đã chọn.
- Notification scheduler: cron job hoặc background worker.
- Telegram: Telegram Bot API.
- Push notification: Firebase Cloud Messaging hoặc Expo Push Notification nếu dùng Expo.

Khuyến nghị thực tế cho MVP nội bộ:

- Nếu ưu tiên nhanh: Next.js full-stack + PostgreSQL + React Native/Expo.
- Nếu ưu tiên API rõ ràng: FastAPI + PostgreSQL + React/Next.js + React Native/Expo.

Tài liệu này không ép stack cụ thể. Codex có thể chọn stack theo repo hiện có hoặc yêu cầu bổ sung của người dùng.

---

## 4. Module Chức Năng

## 4.1. Module Phân Tích Nội Dung Tiếng Trung

### Mục tiêu

Nhận câu/đoạn tiếng Trung từ người dùng, tách thành câu và token có nghĩa, kèm pinyin, nghĩa ngắn và bản dịch tiếng Việt.

### Input

```json
{
  "text": "你看见他吗？",
  "explanation_language": "vi"
}
```

### Output

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
          "confidence": 0.99
        },
        {
          "token_index": 1,
          "text": "看见",
          "pinyin": "kan jian",
          "meaning_vi_brief": "nhìn thấy",
          "token_type": "verb",
          "is_learnable": true,
          "confidence": 0.98
        },
        {
          "token_index": 2,
          "text": "他",
          "pinyin": "ta",
          "meaning_vi_brief": "anh ấy / người đó",
          "token_type": "pronoun",
          "is_learnable": true,
          "confidence": 0.99
        },
        {
          "token_index": 3,
          "text": "吗",
          "pinyin": "ma",
          "meaning_vi_brief": "trợ từ nghi vấn",
          "token_type": "particle",
          "is_learnable": true,
          "confidence": 0.99
        },
        {
          "token_index": 4,
          "text": "？",
          "pinyin": null,
          "meaning_vi_brief": null,
          "token_type": "punctuation",
          "is_learnable": false,
          "confidence": 1
        }
      ]
    }
  ]
}
```

### Quy tắc xử lý

- Hệ thống phải tách từ theo đơn vị có nghĩa, không tách từng chữ mặc định.
- Ví dụ `你看见他吗？` phải tách thành `你 / 看见 / 他 / 吗 / ？`.
- Các từ ghép/cụm cố định cần giữ nguyên nếu có nghĩa độc lập trong ngữ cảnh.
- Dấu câu được giữ trong token để bảo toàn cấu trúc câu nhưng không được đưa vào kho từ vựng.
- Output AI phải là JSON hợp lệ.
- Backend phải validate output AI trước khi trả về client.

### Validation

- `text` không được rỗng.
- `text` nên có ít nhất một ký tự tiếng Trung.
- Giới hạn MVP: tối đa 2.000 ký tự/lần phân tích.
- Không lưu `original_text` dài hạn dưới dạng lịch sử chat.
- Có thể dùng `original_text` tạm thời trong request/response để người dùng thao tác, nhưng không ghi thành bản ghi lịch sử phân tích lâu dài.

---

## 4.2. Module Đánh Dấu Token

### Mục tiêu

Cho phép người dùng xác định token nào đã biết, chưa biết hoặc muốn ôn lại.

### Trạng thái token người dùng chọn

- `known`: đã biết, không lưu học.
- `unknown`: chưa biết, cần giải nghĩa và đưa vào kho từ vựng.
- `review`: biết sơ hoặc muốn ôn lại, cần đưa vào kho từ vựng.
- `ignored`: bỏ qua, không đưa vào học.

### Input

```json
{
  "tokens": [
    {
      "sentence_index": 0,
      "token_index": 0,
      "text": "你",
      "user_status": "known"
    },
    {
      "sentence_index": 0,
      "token_index": 1,
      "text": "看见",
      "user_status": "unknown"
    }
  ]
}
```

### Quy tắc xử lý

- Chỉ token có `user_status` là `unknown` hoặc `review` mới cần giải thích sâu.
- Token `known` không được đưa vào lịch ôn.
- Token `ignored` không được lưu vào kho từ vựng.
- Token `punctuation` mặc định không thể được đánh dấu là từ học.

---

## 4.3. Module Giải Nghĩa Từ Chưa Biết

### Mục tiêu

AI giải thích các từ/cụm từ người dùng chưa biết bằng tiếng Việt hoàn toàn, dựa trên ngữ cảnh câu gốc.

### Input

```json
{
  "sentence_text": "你看见他吗？",
  "sentence_translation_vi": "Bạn có thấy anh ấy không?",
  "target_tokens": [
    {
      "text": "看见",
      "pinyin": "kan jian",
      "meaning_vi_brief": "nhìn thấy"
    }
  ]
}
```

### Output

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
        },
        {
          "zh": "我刚才看见他了。",
          "pinyin": "wo gang cai kan jian ta le",
          "vi": "Tôi vừa nhìn thấy anh ấy."
        }
      ],
      "difficulty_suggestion": "medium"
    }
  ]
}
```

### Quy tắc xử lý

- Giải thích phải bằng tiếng Việt.
- Không cần giải thích bằng tiếng Anh.
- Không gợi ý cách trả lời đồng nghiệp.
- Nếu một từ có nhiều nghĩa, chỉ ưu tiên nghĩa phù hợp trong câu hiện tại.
- Nếu từ là khẩu ngữ, thuật ngữ công việc hoặc cụm cố định, cần ghi rõ trong `usage_note_vi`.

---

## 4.4. Module Kho Từ Vựng Cá Nhân

### Mục tiêu

Lưu những từ/cụm từ người dùng chưa biết hoặc muốn ôn lại.

### Quy tắc lưu trữ quan trọng

- Không lưu toàn bộ lịch sử đoạn chat đã dán.
- Chỉ lưu từ/cụm từ cần học.
- Với mỗi từ được lưu, có thể lưu câu nguồn ngắn chứa từ đó để hỗ trợ học theo ngữ cảnh.
- Nếu người dùng không muốn lưu câu nguồn ở tương lai, cần có setting tắt lưu câu nguồn. MVP mặc định được phép lưu câu nguồn ngắn theo từng từ vì đây không phải là lịch sử chat đầy đủ.
- Không tạo bản ghi trùng nếu cùng `word` và `pinyin` đã tồn tại.
- Nếu từ đã tồn tại nhưng xuất hiện trong câu mới, thêm câu đó vào danh sách ví dụ của từ, không tạo từ mới.

### Trạng thái từ vựng

- `learning`: đang học.
- `reviewing`: đang ôn theo lịch.
- `mastered`: đã thuộc.
- `ignored`: bỏ qua.

### Độ khó

- `easy`
- `medium`
- `hard`

MVP có thể lấy độ khó mặc định từ AI suggestion, sau đó điều chỉnh theo kết quả ôn tập.

---

## 4.5. Module Ôn Tập Hằng Ngày

### Mục tiêu

Tạo danh sách từ cần ôn theo ngày và cập nhật lịch ôn dựa trên kết quả người dùng tự đánh giá.

### Điều kiện từ xuất hiện trong danh sách ôn hôm nay

Một từ cần xuất hiện nếu:

- `status` là `learning` hoặc `reviewing`.
- `next_review_at <= today`.

### Kết quả người dùng chọn sau khi ôn

- `forgot`: không nhớ.
- `vague`: nhớ mơ hồ.
- `remembered`: nhớ tốt.
- `easy`: rất dễ.

### Quy tắc tính lịch ôn MVP

Mỗi từ có `review_stage`, bắt đầu từ `0`.

Khoảng cách ôn theo stage:

| review_stage | next interval |
|---:|---:|
| 0 | cùng ngày hoặc ngày kế tiếp |
| 1 | 1 ngày |
| 2 | 3 ngày |
| 3 | 7 ngày |
| 4 | 14 ngày |
| 5 | 30 ngày |

Quy tắc cập nhật:

- Nếu `forgot`: giảm `review_stage` về `max(0, current_stage - 1)`, `next_review_at = tomorrow`, tăng difficulty về `hard` nếu lặp lại nhiều lần.
- Nếu `vague`: giữ nguyên hoặc tăng 1 stage tùy current_stage, `next_review_at` theo interval tương ứng.
- Nếu `remembered`: tăng `review_stage` thêm 1.
- Nếu `easy`: tăng `review_stage` thêm 2, tối đa stage 5.
- Nếu `review_stage >= 5` và có ít nhất 4 lần review thành công gần nhất, chuyển `status = mastered`.

### Dạng bài ôn MVP

MVP có thể dùng dạng tự đánh giá đơn giản:

1. Hiển thị từ tiếng Trung và pinyin.
2. Người dùng tự nhớ nghĩa.
3. Người dùng bấm xem đáp án.
4. Hệ thống hiển thị nghĩa tiếng Việt và câu ví dụ.
5. Người dùng chọn mức độ nhớ.

Các dạng bài trắc nghiệm hoặc nhập đáp án có thể để giai đoạn sau.

---

## 4.6. Module Notification

### Mục tiêu

Nhắc người dùng ôn tập các từ đến hạn qua push notification và Telegram.

### Notification channels

- `app_push`
- `telegram`

### Reminder settings

Người dùng cần có cấu hình:

- Bật/tắt push notification.
- Bật/tắt Telegram.
- Giờ nhắc hằng ngày.
- Timezone, mặc định theo người dùng: `Asia/Bangkok`.
- Telegram chat ID hoặc mapping tương đương.
- Mobile push token.

### Quy tắc gửi nhắc

- Mỗi ngày tại giờ cấu hình, hệ thống kiểm tra số từ cần ôn.
- Nếu không có từ cần ôn, không gửi hoặc gửi thông báo nhẹ tùy setting. MVP khuyến nghị không gửi.
- Nếu có từ cần ôn, gửi thông báo với số lượng từ.
- Không gửi quá 1 thông báo mỗi channel mỗi ngày cho cùng một reminder type, trừ khi người dùng bật reminder phụ.

### Nội dung push notification mẫu

```text
Hôm nay bạn có 12 từ tiếng Trung cần ôn. Mở app để bắt đầu nhé.
```

### Nội dung Telegram mẫu

```text
Hôm nay bạn có 12 từ tiếng Trung cần ôn.
Vào app để ôn lại các từ đến hạn.
```

### Logging

Mỗi lần gửi notification cần ghi log:

- channel
- sent_at
- status: `sent`, `failed`, `skipped`
- failure_reason nếu có
- due_vocab_count

---

## 5. Data Model Đề Xuất

## 5.1. User

```json
{
  "id": "user_001",
  "display_name": "Nolan Wu",
  "timezone": "Asia/Bangkok",
  "created_at": "2026-06-03T00:00:00+07:00"
}
```

Ghi chú:

- MVP có thể hardcode một user hoặc tạo user mặc định.
- Vẫn nên giữ `user_id` trong các bảng để mở rộng về sau.

## 5.2. VocabularyItem

```json
{
  "id": "vocab_001",
  "user_id": "user_001",
  "word": "看见",
  "normalized_word": "看见",
  "pinyin": "kan jian",
  "meaning_vi": "nhìn thấy, thấy được",
  "meaning_in_context_vi": "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
  "part_of_speech": "verb",
  "usage_note_vi": "看见 nhấn mạnh kết quả là đã nhìn thấy.",
  "status": "learning",
  "difficulty": "medium",
  "review_stage": 0,
  "review_count": 0,
  "successful_review_count": 0,
  "memory_strength": 20,
  "created_at": "2026-06-03T00:00:00+07:00",
  "updated_at": "2026-06-03T00:00:00+07:00",
  "last_reviewed_at": null,
  "next_review_at": "2026-06-03"
}
```

## 5.3. VocabularyExample

```json
{
  "id": "example_001",
  "vocab_id": "vocab_001",
  "source_sentence_zh": "你看见他吗？",
  "source_sentence_vi": "Bạn có thấy anh ấy không?",
  "pinyin": "ni kan jian ta ma",
  "is_user_source": true,
  "created_at": "2026-06-03T00:00:00+07:00"
}
```

Ghi chú:

- Đây là câu ví dụ gắn với từ, không phải lịch sử lưu toàn bộ chat.
- Nếu nội dung công việc nhạy cảm, có thể thêm setting để ẩn danh hoặc không lưu `source_sentence_zh`.

## 5.4. ReviewLog

```json
{
  "id": "review_001",
  "user_id": "user_001",
  "vocab_id": "vocab_001",
  "reviewed_at": "2026-06-03T21:00:00+07:00",
  "result": "remembered",
  "previous_stage": 0,
  "next_stage": 1,
  "next_review_at": "2026-06-04"
}
```

## 5.5. NotificationSetting

```json
{
  "id": "notification_setting_001",
  "user_id": "user_001",
  "timezone": "Asia/Bangkok",
  "daily_reminder_time": "21:00",
  "app_push_enabled": true,
  "telegram_enabled": true,
  "telegram_chat_id": "123456789",
  "mobile_push_token": "push_token_value",
  "created_at": "2026-06-03T00:00:00+07:00",
  "updated_at": "2026-06-03T00:00:00+07:00"
}
```

## 5.6. NotificationLog

```json
{
  "id": "notification_log_001",
  "user_id": "user_001",
  "channel": "telegram",
  "sent_at": "2026-06-03T21:00:00+07:00",
  "status": "sent",
  "due_vocab_count": 12,
  "message_preview": "Hôm nay bạn có 12 từ tiếng Trung cần ôn.",
  "failure_reason": null
}
```

---

## 6. API Contract Đề Xuất

## 6.1. Analyze Chinese Text

### Endpoint

```http
POST /api/analyze
```

### Request

```json
{
  "text": "你看见他吗？"
}
```

### Response

```json
{
  "analysis_id": "analysis_temp_001",
  "original_text": "你看见他吗？",
  "sentences": []
}
```

### Notes

- Response dùng cho phiên thao tác hiện tại.
- Backend không lưu `original_text` như lịch sử chat.

## 6.2. Explain Selected Tokens

### Endpoint

```http
POST /api/explain-tokens
```

### Request

```json
{
  "original_text": "你看见他吗？",
  "sentences": [
    {
      "sentence_index": 0,
      "text": "你看见他吗？",
      "translation_vi": "Bạn có thấy anh ấy không?",
      "tokens": [
        {
          "token_index": 1,
          "text": "看见",
          "pinyin": "kan jian",
          "user_status": "unknown"
        }
      ]
    }
  ]
}
```

### Response

```json
{
  "explanations": []
}
```

## 6.3. Save Vocabulary Items

### Endpoint

```http
POST /api/vocabulary
```

### Request

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
      "source_sentence_vi": "Bạn có thấy anh ấy không?"
    }
  ]
}
```

### Response

```json
{
  "created": ["vocab_001"],
  "updated": [],
  "skipped": []
}
```

## 6.4. List Vocabulary

### Endpoint

```http
GET /api/vocabulary?status=learning&query=看
```

### Response

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 0
  }
}
```

## 6.5. Get Today Review Items

### Endpoint

```http
GET /api/reviews/today
```

### Response

```json
{
  "date": "2026-06-03",
  "timezone": "Asia/Bangkok",
  "due_count": 12,
  "items": []
}
```

## 6.6. Submit Review Result

### Endpoint

```http
POST /api/reviews/{vocab_id}/submit
```

### Request

```json
{
  "result": "remembered"
}
```

### Response

```json
{
  "vocab_id": "vocab_001",
  "status": "reviewing",
  "previous_stage": 0,
  "next_stage": 1,
  "next_review_at": "2026-06-04"
}
```

## 6.7. Notification Settings

### Get settings

```http
GET /api/notification-settings
```

### Update settings

```http
PUT /api/notification-settings
```

```json
{
  "timezone": "Asia/Bangkok",
  "daily_reminder_time": "21:00",
  "app_push_enabled": true,
  "telegram_enabled": true,
  "telegram_chat_id": "123456789",
  "mobile_push_token": "push_token_value"
}
```

---

## 7. AI Contracts Và Prompt Yêu Cầu

## 7.1. Prompt tách từ

### System instruction

```text
Bạn là trợ lý học tiếng Trung cho người Việt. Nhiệm vụ của bạn là phân tích câu hoặc đoạn tiếng Trung để hỗ trợ học từ vựng theo ngữ cảnh công việc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.

Tất cả nội dung giải thích và dịch nghĩa phải bằng tiếng Việt.
```

### User instruction

```text
Hãy phân tích nội dung tiếng Trung sau.

Yêu cầu:
1. Chia nội dung thành các câu nếu có nhiều câu.
2. Với mỗi câu, tách thành các từ hoặc cụm từ có nghĩa trong tiếng Trung hiện đại.
3. Không tách từng chữ nếu các chữ tạo thành một từ ghép hoặc cụm cố định có nghĩa.
4. Giữ dấu câu dưới dạng token loại punctuation, nhưng đánh dấu is_learnable = false.
5. Với mỗi token có thể học, cung cấp pinyin, nghĩa tiếng Việt ngắn, loại token và confidence.
6. Dịch nghĩa toàn câu sang tiếng Việt.
7. Giải thích ý tự nhiên của câu bằng tiếng Việt.

Nội dung:
{{text}}
```

### Required JSON schema

```json
{
  "original_text": "string",
  "sentences": [
    {
      "sentence_index": 0,
      "text": "string",
      "translation_vi": "string",
      "natural_explanation_vi": "string",
      "tokens": [
        {
          "token_index": 0,
          "text": "string",
          "pinyin": "string|null",
          "meaning_vi_brief": "string|null",
          "token_type": "word|phrase|pronoun|verb|noun|adjective|adverb|particle|measure_word|punctuation|other",
          "is_learnable": true,
          "confidence": 0.95
        }
      ]
    }
  ]
}
```

## 7.2. Prompt giải nghĩa từ chưa biết

### System instruction

```text
Bạn là trợ lý học tiếng Trung cho người Việt. Hãy giải thích từ/cụm từ tiếng Trung theo ngữ cảnh câu gốc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.

Tất cả giải thích phải bằng tiếng Việt. Không dùng tiếng Anh trừ khi tiếng Anh là một phần bắt buộc của thuật ngữ gốc.
Không gợi ý cách trả lời lại đồng nghiệp.
```

### User instruction

```text
Hãy giải thích các token được chọn trong câu tiếng Trung sau.

Yêu cầu:
1. Chỉ giải thích các token trong target_tokens.
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

### Required JSON schema

```json
{
  "explanations": [
    {
      "word": "string",
      "pinyin": "string",
      "meaning_vi": "string",
      "meaning_in_context_vi": "string",
      "part_of_speech": "string",
      "usage_note_vi": "string|null",
      "examples": [
        {
          "zh": "string",
          "pinyin": "string",
          "vi": "string"
        }
      ],
      "difficulty_suggestion": "easy|medium|hard"
    }
  ]
}
```

---

## 8. Privacy Và Data Retention

### 8.1. Quy tắc không lưu lịch sử chat

Hệ thống không được lưu toàn bộ lịch sử đoạn chat người dùng đã dán dưới dạng `AnalysisSession` lâu dài.

Backend có thể xử lý nội dung trong request để tạo token và giải nghĩa, nhưng sau khi hoàn tất:

- Không tạo bảng lưu toàn bộ đoạn chat.
- Không lưu danh sách phiên phân tích đầy đủ.
- Không lưu `original_text` dưới dạng lịch sử đọc hiểu.

### 8.2. Dữ liệu được phép lưu

Được phép lưu:

- Từ/cụm từ người dùng chọn học.
- Pinyin.
- Nghĩa tiếng Việt.
- Ghi chú sử dụng.
- Câu ví dụ ngắn gắn với từ vựng.
- Bản dịch câu ví dụ.
- Lịch ôn tập và review log.
- Cấu hình notification.

### 8.3. Rủi ro cần lưu ý

Nếu câu nguồn chứa thông tin công việc nhạy cảm, việc lưu câu ví dụ vẫn có thể có rủi ro. MVP có thể chấp nhận lưu câu ví dụ, nhưng nên chuẩn bị setting về sau:

- Không lưu câu nguồn.
- Chỉ lưu câu ví dụ do AI tạo.
- Ẩn danh tên người, tên dự án, số liệu trước khi lưu.

---

## 9. Frontend Handoff Placeholder

Phần này cố ý chưa đặc tả chi tiết UI/UX.

Sau khi có thiết kế từ agent frontend, cần bổ sung:

1. Information architecture.
2. Screen list cho web app.
3. Screen list cho mobile app.
4. Component behavior.
5. State empty/loading/error.
6. Responsive behavior cho web.
7. Mobile interaction pattern.
8. Notification permission UX.
9. Token selection UX.
10. Review session UX.

Hiện tại, Codex chỉ cần biết các màn hình chức năng dự kiến:

- Analyze Text screen.
- Token Selection screen hoặc section.
- Explanation Result screen hoặc section.
- Vocabulary List screen.
- Vocabulary Detail screen.
- Today Review screen.
- Review Card screen.
- Notification Settings screen.

---

## 10. Edge Cases Và Exception Flows

### 10.1. Input không hợp lệ

- Nếu input rỗng: trả lỗi `TEXT_REQUIRED`.
- Nếu input không có ký tự tiếng Trung: trả cảnh báo `NO_CHINESE_TEXT_DETECTED`.
- Nếu input quá dài: trả lỗi `TEXT_TOO_LONG`, kèm giới hạn ký tự.

### 10.2. AI trả JSON lỗi

- Backend retry một lần với prompt sửa lỗi JSON.
- Nếu vẫn lỗi, trả response lỗi `AI_OUTPUT_INVALID`.
- Không lưu dữ liệu từ output lỗi.

### 10.3. AI tách từ chưa đúng

- MVP: người dùng có thể bỏ qua token sai hoặc đánh dấu theo token hiện có.
- Giai đoạn sau: thêm chức năng gộp/tách token thủ công.

### 10.4. Lưu từ trùng

- Nếu `word + pinyin` đã tồn tại, update ví dụ/ngữ cảnh mới.
- Không tạo bản ghi mới.

### 10.5. Notification fail

- Ghi log thất bại.
- Không retry quá nhiều trong MVP.
- Nếu Telegram fail do thiếu `telegram_chat_id`, mark `skipped`.
- Nếu push token invalid, mark `failed` và có thể yêu cầu user cập nhật token khi mở app.

### 10.6. Timezone

- Lịch ôn và reminder phải tính theo timezone người dùng.
- Mặc định: `Asia/Bangkok`.
- Không dùng UTC để quyết định “hôm nay” trên giao diện người dùng.

---

## 11. Acceptance Criteria

## 11.1. Analyze Text

- Người dùng có thể gửi một câu tiếng Trung và nhận danh sách token.
- Hệ thống tách được từ ghép có nghĩa, ví dụ `看见`, thay vì tách thành `看` và `见`.
- Hệ thống trả bản dịch tiếng Việt của câu.
- Hệ thống trả giải thích ý tự nhiên bằng tiếng Việt.
- Dấu câu không được lưu vào kho từ vựng.

## 11.2. Token Selection

- Người dùng có thể đánh dấu token là `known`, `unknown`, `review`, `ignored`.
- Chỉ token `unknown` và `review` được đưa vào bước giải thích/lưu học.

## 11.3. Explanation

- AI giải thích từ chưa biết hoàn toàn bằng tiếng Việt.
- Giải thích có pinyin, nghĩa, nghĩa trong ngữ cảnh, loại từ, ghi chú và ví dụ.
- AI không gợi ý cách trả lời đồng nghiệp.

## 11.4. Vocabulary Storage

- Từ chưa biết được lưu vào kho từ vựng.
- Từ trùng không tạo bản ghi mới.
- Từ trùng có thể được bổ sung ví dụ/ngữ cảnh.
- Hệ thống không lưu toàn bộ lịch sử chat đã dán.

## 11.5. Review

- Hệ thống hiển thị danh sách từ đến hạn hôm nay.
- Người dùng có thể hoàn thành review một từ.
- Hệ thống cập nhật `review_stage`, `review_count`, `last_reviewed_at`, `next_review_at`.
- Từ có thể chuyển sang `mastered` khi đạt điều kiện.

## 11.6. Notification

- Hệ thống gửi push notification nếu có từ cần ôn và push được bật.
- Hệ thống gửi Telegram nếu có từ cần ôn và Telegram được bật.
- Notification dùng timezone người dùng.
- Mỗi lần gửi có log.

---

## 12. Implementation Milestones

### Milestone 1: Backend core

- Thiết lập project backend.
- Tạo database schema.
- Tạo API analyze text.
- Tạo AI service wrapper.
- Validate JSON AI output.

### Milestone 2: Vocabulary workflow

- API explain selected tokens.
- API save vocabulary.
- API list vocabulary.
- Logic deduplicate từ vựng.
- Lưu ví dụ gắn với từ.

### Milestone 3: Review workflow

- API get today review items.
- API submit review result.
- Logic spaced repetition MVP.
- Review log.

### Milestone 4: Notification

- Notification settings API.
- Daily scheduler.
- Telegram integration.
- Push notification integration.
- Notification log.

### Milestone 5: Web/mobile integration

- Kết nối API với web app.
- Kết nối API với mobile app.
- Bổ sung UI/UX theo tài liệu thiết kế frontend sau.
- Xử lý loading/error/empty states theo thiết kế.

---

## 13. Giả Định Đang Áp Dụng

- Hệ thống dùng cá nhân nội bộ.
- Có thể có một user mặc định trong MVP.
- Giải thích AI luôn bằng tiếng Việt.
- Không cần gợi ý câu trả lời tiếng Trung.
- Không lưu lịch sử toàn bộ đoạn chat đã dán.
- Được phép lưu câu ví dụ ngắn gắn với từ vựng, trừ khi người dùng tắt trong tương lai.
- Reminder mặc định theo timezone `Asia/Bangkok`.
- Web app và mobile app dùng chung backend API.
- Thiết kế UI/UX sẽ được bổ sung sau.

---

## 14. Điểm Cần Xác Nhận Trước Khi Build Chi Tiết

1. Stack kỹ thuật mong muốn là gì: Next.js full-stack, FastAPI, NestJS, hay stack khác?
2. Database dùng PostgreSQL hay SQLite cho bản nội bộ đầu tiên?
3. Mobile app dùng React Native/Expo hay Flutter?
4. Push notification dùng Expo Push hay Firebase Cloud Messaging?
5. Có cần authentication không nếu chỉ dùng cá nhân?
6. Có muốn lưu câu nguồn gắn với từ hay chỉ lưu ví dụ AI tạo để giảm rủi ro lộ nội dung công việc?
7. Giờ nhắc mặc định là mấy giờ?
8. Telegram bot đã có sẵn chưa hay cần tạo mới?
9. Có cần import/export kho từ vựng, ví dụ CSV hoặc Anki, trong MVP không?

---

## 15. Quality Bar Cho Codex Khi Triển Khai

Codex triển khai cần đảm bảo:

- Output AI luôn được parse và validate trước khi dùng.
- Không phụ thuộc vào text tự do từ AI cho logic chính.
- Không lưu lịch sử chat đầy đủ.
- Không tạo duplicate vocabulary item.
- Lịch ôn tính theo timezone người dùng.
- Notification không spam.
- Các API có lỗi rõ ràng và response nhất quán.
- Có test cho logic tách/lưu/deduplicate/review schedule ở mức unit hoặc integration.
- Frontend chưa tự quyết định UI/UX chi tiết trước khi có thiết kế riêng.

