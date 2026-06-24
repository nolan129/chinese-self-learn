export type TokenStatus = "unselected" | "known" | "unknown" | "review" | "ignored";

export type Token = {
  token_index: number;
  text: string;
  pinyin: string | null;
  meaning_vi_brief: string | null;
  token_type: string;
  is_learnable: boolean;
  status: TokenStatus;
};

export type Explanation = {
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

export const initialTokens: Token[] = [
  {
    token_index: 0,
    text: "你",
    pinyin: "ni",
    meaning_vi_brief: "bạn",
    token_type: "pronoun",
    is_learnable: true,
    status: "unselected"
  },
  {
    token_index: 1,
    text: "看见",
    pinyin: "kan jian",
    meaning_vi_brief: "nhìn thấy",
    token_type: "verb",
    is_learnable: true,
    status: "unselected"
  },
  {
    token_index: 2,
    text: "他",
    pinyin: "ta",
    meaning_vi_brief: "anh ấy",
    token_type: "pronoun",
    is_learnable: true,
    status: "unselected"
  },
  {
    token_index: 3,
    text: "吗",
    pinyin: "ma",
    meaning_vi_brief: "trợ từ nghi vấn",
    token_type: "particle",
    is_learnable: true,
    status: "unselected"
  },
  {
    token_index: 4,
    text: "？",
    pinyin: null,
    meaning_vi_brief: null,
    token_type: "punctuation",
    is_learnable: false,
    status: "ignored"
  }
];

export const explanations: Explanation[] = [
  {
    word: "看见",
    pinyin: "kan jian",
    meaning_vi: "nhìn thấy, thấy được",
    meaning_in_context_vi:
      "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
    part_of_speech: "verb",
    usage_note_vi:
      "看见 nhấn mạnh kết quả là đã nhìn thấy, khác với 看 chỉ là hành động nhìn.",
    examples: [
      {
        zh: "你看见我的手机吗？",
        pinyin: "ni kan jian wo de shou ji ma",
        vi: "Bạn có thấy điện thoại của tôi không?"
      },
      {
        zh: "我刚才看见他了。",
        pinyin: "wo gang cai kan jian ta le",
        vi: "Tôi vừa nhìn thấy anh ấy."
      }
    ],
    difficulty_suggestion: "medium"
  },
  {
    word: "吗",
    pinyin: "ma",
    meaning_vi: "trợ từ nghi vấn đặt cuối câu",
    meaning_in_context_vi:
      "Trong câu này, 吗 biến câu trần thuật thành một câu hỏi có hoặc không.",
    part_of_speech: "particle",
    usage_note_vi:
      "吗 thường đứng cuối câu hỏi yes/no. Khi nói nhanh, âm này nhẹ và ngắn.",
    examples: [
      {
        zh: "你忙吗？",
        pinyin: "ni mang ma",
        vi: "Bạn có bận không?"
      }
    ],
    difficulty_suggestion: "easy"
  }
];

export const vocabulary = [
  {
    id: "vocab_001",
    word: "看见",
    pinyin: "kan jian",
    meaning_vi: "nhìn thấy, thấy được",
    meaning_in_context_vi:
      "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
    part_of_speech: "verb",
    usage_note_vi: "看见 nhấn mạnh kết quả là đã nhìn thấy.",
    status: "learning",
    difficulty: "medium",
    review_stage: 2,
    review_count: 4,
    next_review_label: "Hôm nay",
    example_zh: "你看见他吗？",
    example_vi: "Bạn có thấy anh ấy không?"
  },
  {
    id: "vocab_002",
    word: "处理",
    pinyin: "chu li",
    meaning_vi: "xử lý, giải quyết",
    meaning_in_context_vi:
      "Thường dùng khi nói về xử lý công việc, tài liệu, yêu cầu hoặc vấn đề.",
    part_of_speech: "verb",
    usage_note_vi: "Một từ công việc rất phổ biến trong chat và email.",
    status: "reviewing",
    difficulty: "hard",
    review_stage: 1,
    review_count: 3,
    next_review_label: "Hôm nay",
    example_zh: "这个问题我来处理。",
    example_vi: "Vấn đề này để tôi xử lý."
  },
  {
    id: "vocab_003",
    word: "安排",
    pinyin: "an pai",
    meaning_vi: "sắp xếp, bố trí",
    meaning_in_context_vi:
      "Dùng khi nói về sắp xếp lịch, công việc, nhân sự hoặc kế hoạch.",
    part_of_speech: "verb",
    usage_note_vi: "Hay gặp trong môi trường làm việc.",
    status: "learning",
    difficulty: "medium",
    review_stage: 3,
    review_count: 5,
    next_review_label: "3 ngày nữa",
    example_zh: "我安排一下时间。",
    example_vi: "Tôi sắp xếp thời gian một chút."
  }
] as const;

export const reviewItems = vocabulary;
