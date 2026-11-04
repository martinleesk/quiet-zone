/** Template phrase bank. AI never free-writes. */
export const TALK_PHRASES = [
  "我暫時未有實錘，想再聽一輪。",
  "呢票我傾向跟多數，但會保留懷疑。",
  "隔離要小心，錯票都會留低線索。",
  "我用模板：未見足夠失聯痕跡。",
  "可唔可以有人用短句講下你見到嘅訊號？",
  "我今輪唔爭辯，交低一個觀察就得。",
] as const;

export const DRAFT_PHRASES = [
  "我覺得要再核對一次先好隔離。",
  "我跟多數票，唔追加指控。",
  "熄燈之後先再睇失聯邊個。",
  "我未有新料，保持觀望。",
] as const;

/** Night channel for 消音組 only. Free text is rejected. */
export const SILENCE_TEMPLATES = [
  "今夜我建議失聯一個燈塔席。",
  "可能有掩護，換一個目標。",
  "我跟組內嘅選擇。",
  "今輪跳過，唔好暴露。",
  "小心灰頻，唔好亂送頭。",
] as const;

export const PHASE_TIPS = {
  day_talk: { id: "day_talk", text: "燈亮用短句就得。撳準備好先會去草稿。" },
  vote: { id: "vote", text: "投一個人，或者棄權。平票就流局，唔會隔離。" },
  night: { id: "night", text: "熄燈先交行動。冇技能可以跳過。" },
  grey_marks: { id: "grey_marks", text: "標記只得你知。正確標中兩名消音，灰頻可以獨贏。" },
} as const;

export const AI_NICKNAMES = [
  "霧港燈",
  "靜默鍵",
  "夜班簿",
  "未讀訊",
  "低頻",
  "隔音棉",
  "後巷",
  "待命",
  "空白頻",
  "短訊",
] as const;
