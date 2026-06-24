# Han Note UI Design Handoff

## Design Goal

Hán Note is a personal Chinese learning product for Vietnamese speakers. The UI should feel like a focused study workspace, not a marketing site. The main job is to move quickly through:

1. Paste Chinese text.
2. Read AI analysis.
3. Select unknown or review-worthy tokens.
4. Save explanations to vocabulary.
5. Review due words.
6. Keep reminders and privacy settings under control.

## Product Surfaces

### Web App

Path: `web-next`

Design direction:

- Desktop-first learning workspace.
- Sticky top navigation with four primary areas: `Phân tích`, `Ôn tập`, `Từ vựng`, `Cài đặt`.
- Main content width is capped at 1180px for comfortable reading.
- Panels use 8px radius, clear borders, and low shadow.
- Analyze and Review use two-column layouts on desktop and collapse to one column on mobile.
- Sticky action bars appear only when the next workflow action is available.

Key screens:

- `AnalyzeScreen`: paste area, privacy reminder, daily review snapshot, analysis result, token status picker.
- `ExplanationScreen`: sticky sentence context on desktop, explanation cards, save/review action.
- `ReviewScreen`: due summary, preview chips, single-card review session, completion summary.
- `VocabularyScreen`: search/filter toolbar, dense list, detail panel.
- `SettingsScreen`: reminder time, notification channels, Telegram test, privacy toggles.

### Mobile App

Path: `mobile-expo`

Design direction:

- One-hand mobile flow with bottom tabs: `Học`, `Ôn`, `Từ vựng`, `Cài đặt`.
- Cards stay compact and task-oriented.
- Analyze result uses a bottom sheet for token status.
- Review session is a single focused card.
- Settings are interactive, not static text.
- Vocabulary search works against the mock data and is ready to replace with API data.

Key screens:

- `LearnHome`: paste input, character count, privacy reminder, today stats.
- `AnalyzeResult`: sentence explanation, token chips, selected-token bottom sheet, sticky action.
- `ExplanationScreen`: explanation cards using `examples[]`, matching backend/web shape.
- `ReviewHome` and `ReviewSession`: due stats, preview chips, result buttons.
- `VocabularyScreen`: search and list.
- `SettingsScreen`: notification toggles and privacy toggles.

## Visual System

Shared intent:

- Background: quiet neutral `#F7F7F4`.
- Surface: white with `#D8DEDB` borders.
- Primary action: teal `#08756F`.
- Known token: blue.
- Unknown token: amber.
- Review token: teal.
- Error/forgot result: red.
- Easy/success result: green.

Shape:

- Cards, inputs, buttons, token chips, tab bar: 8px radius.
- Pill badges may use full radius because they are metadata indicators.

Typography:

- Vietnamese UI copy is primary.
- Chinese words are large only inside learning or review cards.
- Letter spacing is 0 to avoid cramped Vietnamese and Chinese text.

## Backend Integration Notes

Keep the UI data close to the handoff API contracts:

- Web explanations already use `examples[]`.
- Mobile explanations were updated to use `examples[]` as well.
- Token status remains:
  - `unselected`
  - `known`
  - `unknown`
  - `review`
  - `ignored`

Recommended next integration order:

1. Replace analyze mock with `POST /api/analyze`.
2. Replace explanation mock with `POST /api/explain-tokens`.
3. Wire save action to `POST /api/vocabulary`.
4. Wire review due list and submit results.
5. Wire settings and notification test.

## Minimum UI QA

Web:

- Analyze result wraps token chips cleanly at desktop and mobile widths.
- Sticky action does not cover unread content.
- Vocabulary detail remains readable when the list is long.
- Settings rows do not overflow on mobile.

Mobile:

- Bottom tab does not cover the last action button.
- Token bottom sheet opens and closes reliably.
- Review result buttons are reachable on small screens.
- Search empty state appears when no vocabulary item matches.
