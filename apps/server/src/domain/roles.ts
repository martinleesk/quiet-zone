import type { Faction, RoleId } from "./types.js";

export interface RoleDef {
  id: RoleId;
  name: string;
  faction: Faction;
  skill: string;
}

export const FACTION_LABEL: Record<Faction, string> = {
  lighthouse: "燈塔網",
  silence: "消音組",
  grey: "灰頻",
};

export const ROLES: Record<RoleId, RoleDef> = {
  tip: {
    id: "tip",
    name: "線報員",
    faction: "lighthouse",
    skill: "釘選殘訊（本切片未啟用主動）。你可以發言、草稿、投票。",
  },
  sweep: {
    id: "sweep",
    name: "掃頻員",
    faction: "lighthouse",
    skill: "熄燈掃頻：私下得知目標係「消音痕跡」定「訊號乾淨」。",
  },
  cover: {
    id: "cover",
    name: "掩護員",
    faction: "lighthouse",
    skill: "臨時掩護：免疫該夜失聯。成功後下一夜唔可以再成功。",
  },
  echo: {
    id: "echo",
    name: "回波師",
    faction: "lighthouse",
    skill: "失聯回波：有人被投票隔離後，你私下收到陣營殘片。",
  },
  link: {
    id: "link",
    name: "通聯官",
    faction: "lighthouse",
    skill: "核對通聯（本切片未啟用主動）。你可以發言、草稿、投票。",
  },
  civilian: {
    id: "civilian",
    name: "燈塔閒職",
    faction: "lighthouse",
    skill: "無主動技能。你可以發言、草稿、投票。",
  },
  silencer: {
    id: "silencer",
    name: "消音手",
    faction: "silence",
    skill: "執行失聯：熄燈令一名未受掩護嘅玩家失聯移出。",
  },
  decoy: {
    id: "decoy",
    name: "假訊員",
    faction: "silence",
    skill: "投放假訊（本切片未啟用主動）。你知道消音組隊友。",
  },
  plant: {
    id: "plant",
    name: "影內應",
    faction: "silence",
    skill: "訊號霧：第一次被掃頻固定回「訊號乾淨」。",
  },
  warrant: {
    id: "warrant",
    name: "孤證客",
    faction: "grey",
    skill: "私密標記消音組。仍在場且正確標記達 2 即灰頻獨贏。每局可封口一人。",
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
