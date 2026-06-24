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

export const initialTokens: Token[] = [
  { token_index: 0, text: "你", pinyin: "ni", meaning_vi_brief: "bạn", token_type: "pronoun", is_learnable: true, status: "unselected" },
  { token_index: 1, text: "看见", pinyin: "kan jian", meaning_vi_brief: "nhìn thấy", token_type: "verb", is_learnable: true, status: "unselected" },
  { token_index: 2, text: "他", pinyin: "ta", meaning_vi_brief: "anh ấy", token_type: "pronoun", is_learnable: true, status: "unselected" },
  { token_index: 3, text: "吗", pinyin: "ma", meaning_vi_brief: "trợ từ nghi vấn", token_type: "particle", is_learnable: true, status: "unselected" },
  { token_index: 4, text: "？", pinyin: null, meaning_vi_brief: null, token_type: "punctuation", is_learnable: false, status: "ignored" }
];

export const explanations = [
  {
    word: "看见",
    pinyin: "kan jian",
    part_of_speech: "verb",
    meaning_vi: "nhìn thấy, thấy được",
    meaning_in_context_vi: "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
    usage_note_vi: "看见 nhấn mạnh kết quả là đã nhìn thấy, khác với 看 chỉ là hành động nhìn.",
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
    ]
  },
  {
    word: "吗",
    pinyin: "ma",
    part_of_speech: "particle",
    meaning_vi: "trợ từ nghi vấn đặt cuối câu",
    meaning_in_context_vi: "Trong câu này, 吗 biến câu trần thuật thành một câu hỏi có hoặc không.",
    usage_note_vi: "吗 thường đứng cuối câu hỏi yes/no.",
    examples: [
      {
        zh: "你忙吗？",
        pinyin: "ni mang ma",
        vi: "Bạn có bận không?"
      }
    ]
  }
];

export const vocabulary = [
  {
    id: "vocab_001",
    word: "看见",
    pinyin: "kan jian",
    meaning_vi: "nhìn thấy, thấy được",
    status: "learning",
    difficulty: "medium",
    next_review_label: "Hôm nay",
    example_zh: "你看见他吗？",
    example_vi: "Bạn có thấy anh ấy không?"
  },
  {
    id: "vocab_002",
    word: "处理",
    pinyin: "chu li",
    meaning_vi: "xử lý, giải quyết",
    status: "reviewing",
    difficulty: "hard",
    next_review_label: "Hôm nay",
    example_zh: "这个问题我来处理。",
    example_vi: "Vấn đề này để tôi xử lý."
  },
  {
    id: "vocab_003",
    word: "安排",
    pinyin: "an pai",
    meaning_vi: "sắp xếp, bố trí",
    status: "learning",
    difficulty: "medium",
    next_review_label: "3 ngày nữa",
    example_zh: "我安排一下时间。",
    example_vi: "Tôi sắp xếp thời gian một chút."
  }
];
