/**
 * Locked Standard Mode MVP rules (Martin 2026-11-04).
 * Skill legality and win checks read these constants — never the client.
 */
export const RULES = {
  id: "standard-mvp-2026-11-04",
  mode: "standard",
  seatCount: 11,
  composition: { lighthouse: 7, silence: 3, grey: 1 },
  /** A. 平票 → 流局，唔隔離 */
  tieVote: "no_isolation",
  /** B. 逾時預設：草稿可空白、投票當棄權、熄燈當跳過 */
  timeouts: {
    draft: "empty",
    vote: "abstain",
    night: "skip",
  },
  /** C. AI 可抽消音手；模板詞庫＋跟多數；徽章永久 */
  ai: {
    mayDrawSilencer: true,
    behavior: "template_phrase_bank_follow_majority",
    badgePermanent: true,
  },
  /** D. 封口：只可投票，唔可以發言；結果卡係 stub */
  seal: {
    speech: false,
    vote: true,
    resultCard: "stub",
  },
  /** E. 11 人：成功失聯 3 次 → 消音組勝（灰頻未獨贏先） */
  silenceWin: {
    players: 11,
    successfulDisconnects: 3,
  },
  /** F. 公開隔離唔披露陣營；只有回波師私下收到殘片 */
  isolation: {
    revealFaction: false,
    echoRemnant: "private",
  },
  /**
   * G. 掩護成功計作窗口第 1 回合。
   * 下一回合唔可以成功；再下一回合可以再成功。
   * `blockedFollowingTurns: 1` ⇒ 成功喺第 N 夜，第 N+1 夜失敗，第 N+2 夜可再成功。
   */
  cover: {
    successCountsAsTurn: 1,
    blockedFollowingTurns: 1,
  },
  /** 灰頻獨贏優先於消音組同燈塔網 */
  greyWin: {
    minCorrectSilenceMarks: 2,
    mustBeAlive: true,
    priority: "before_silence_and_lighthouse",
  },
  /** Standard skill quotas. A–G above stay as locked. */
  skills: {
    pinPerDay: 1,
    linkPerDay: 1,
    fakePerGame: 2,
    anonymousVotesPerGame: 1,
  },
  phases: ["boot", "day_talk", "draft", "vote", "resolve", "night", "check"],
  phaseMs: {
    boot: 8000,
    day_talk: 40000,
    draft: 25000,
    vote: 25000,
    resolve: 5000,
    night: 25000,
    check: 5000,
  },
} as const;

export type Ruleset = typeof RULES;
