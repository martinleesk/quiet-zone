import type { Faction, RoleId } from "./types.js";

export interface RoleDef {
  id: RoleId;
  name: string;
  faction: Faction;
  /** One sentence: what it does and when. */
  skill: string;
  /** Tiny memory hook shown under the name. */
  mnemonic: string;
  /** Plain “when do I press this”. */
  when: string;
}

/** Gold action line plus at most three arrows. Clients mirror these lines. */
export const PHASE_COACH: Record<string, { line: string; cta: string; bullets: readonly string[] }> = {
  home: { line: "11 人隱藏身份。你要估邊三個係消音組。", cta: "開試玩房", bullets: ["燈亮講一句", "投票隔離", "熄燈先用技能"] },
  lobby: { line: "記住你係邊個，再開始燈亮", cta: "開始燈亮", bullets: ["你坐一席", "其餘係 AI", "徽章會一直在"] },
  boot: { line: "記住身份，再去燈亮", cta: "去燈亮", bullets: ["睇你嘅名", "睇技能一句", "撳開始"] },
  day_talk: { line: "講一句你懷疑邊個", cta: "寫一句", bullets: ["有技能先撳發動", "講完撳準備好", "倒數見大數字"] },
  draft: { line: "寫低你想點投票", cta: "交草稿", bullets: ["可以留空", "然後準備", "平票就冇人走"] },
  vote: { line: "揀一個人票走", cta: "確認投票", bullets: ["平票就冇人走", "可以棄權", "撳準備先結算"] },
  resolve: { line: "等幾秒就熄燈", cta: "等熄燈", bullets: [] },
  night: { line: "熄燈先撳發動", cta: "發動", bullets: ["有技能先揀目標", "冇就撳跳過", "倒數見大數字"] },
  check: { line: "睇下有冇人贏", cta: "等下一輪", bullets: [] },
  ended: { line: "局完，身份公開", cta: "離開", bullets: [] },
};

export const FACTION_LABEL: Record<Faction, string> = {
  lighthouse: "燈塔網",
  silence: "消音組",
  grey: "灰頻",
};

/** Client mirror: `apps/mobile/lib/src/role_catalog.dart`. Keep skill text identical. */
export const ROLES: Record<RoleId, RoleDef> = {
  tip: {
    id: "tip",
    name: "線報",
    faction: "lighthouse",
    mnemonic: "燈亮釘一句",
    when: "燈亮",
    skill: "燈亮可以釘一句公開線報，唔佔你嘅發言。",
  },
  sweep: {
    id: "sweep",
    name: "掃頻",
    faction: "lighthouse",
    mnemonic: "熄燈查人",
    when: "熄燈",
    skill: "熄燈揀一個人，私下知道佢係消音定乾淨。",
  },
  cover: {
    id: "cover",
    name: "掩護",
    faction: "lighthouse",
    mnemonic: "擋一夜",
    when: "熄燈",
    skill: "熄燈保一個人唔會被帶走。成功後下一夜唔可以再用。",
  },
  echo: {
    id: "echo",
    name: "回波",
    faction: "lighthouse",
    mnemonic: "票走先有料",
    when: "有人被票走之後",
    skill: "有人被票走之後，你私下收到佢係邊個陣營。",
  },
  link: {
    id: "link",
    name: "通聯",
    faction: "lighthouse",
    mnemonic: "查上輪",
    when: "燈亮",
    skill: "燈亮揀一個人，知道佢上一輪用過技能未。",
  },
  civilian: {
    id: "civilian",
    name: "守燈",
    faction: "lighthouse",
    mnemonic: "冇技能",
    when: "冇",
    skill: "冇技能。你靠講一句、寫草稿同投票。",
  },
  silencer: {
    id: "silencer",
    name: "消音手",
    faction: "silence",
    mnemonic: "熄燈帶走",
    when: "熄燈",
    skill: "熄燈揀一個冇掩護嘅人，令佢離場。",
  },
  decoy: {
    id: "decoy",
    name: "假訊",
    faction: "silence",
    mnemonic: "整亂線報",
    when: "燈亮或熄燈",
    skill: "每局兩次。可以放一句假料，或者標一條線報未核實。",
  },
  plant: {
    id: "plant",
    name: "影燈",
    faction: "silence",
    mnemonic: "第一次裝乾淨",
    when: "被查或者投票",
    skill: "第一次被掃頻會顯示乾淨。投票可以匿名一次。",
  },
  warrant: {
    id: "warrant",
    name: "孤證",
    faction: "grey",
    mnemonic: "暗標兩個就贏",
    when: "隨時標，熄燈封口",
    skill: "暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。",
  },
};

/** Standard 11: 燈塔 7 / 消音 3 / 灰頻 1. AI may receive 消音手. */
export const STANDARD_DEAL: readonly RoleId[] = [
  "tip",
  "sweep",
  "cover",
  "echo",
  "link",
  "civilian",
  "civilian",
  "silencer",
  "decoy",
  "plant",
  "warrant",
];

export const PHASE_LABEL: Record<string, string> = {
  lobby: "組席",
  boot: "開局抽身分",
  day_talk: "燈亮討論",
  draft: "私人草稿",
  vote: "投票隔離",
  resolve: "結算",
  night: "熄燈行動",
  check: "勝負檢定",
  ended: "終局",
};
