/**
 * Signal-card catalog. Definitions live in docs/signal/*.json.
 * The engine refuses unknown effects so a bad row cannot silently no-op.
 */

export type Faction = "lighthouse" | "silence" | "grey";
export type Kind = "strike" | "guard" | "tool" | "skill";
export type PhaseId = "night" | "morning" | "day" | "play" | "vote" | "resolve" | "discard" | "ended";

export interface CardDef {
  id: string;
  name: string;
  kind: Kind;
  text: string;
  effect: string;
  needsTarget: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
  window: "night" | "play" | "vote";
  text: string;
  effect: string;
  needsTarget: boolean;
}

export interface RoleDef {
  id: string;
  name: string;
  faction: Faction;
  factionLabel: string;
  skill: SkillDef;
}

export interface PhaseDef {
  id: Exclude<PhaseId, "ended">;
  label: string;
  coach: string;
  ms: number;
}

export interface WinGrey {
  kind: "survive_node";
  node: number;
  text: string;
}
export interface WinSilence {
  kind: "disconnect_quota";
  faction: Faction;
  quota: number;
  text: string;
}
export interface WinLighthouse {
  kind: "clear_faction";
  faction: Faction;
  text: string;
}

export interface Catalog {
  version: string;
  handLimit: number;
  drawPerRound: number;
  fastMs: number;
  maxRounds: number;
  tie: string;
  chips: string[];
  aiNames: string[];
  factions: Record<Faction, string>;
  composition: Record<Faction, number>;
  wins: {
    priority: Faction[];
    grey: WinGrey;
    silence: WinSilence;
    lighthouse: WinLighthouse;
  };
  phases: PhaseDef[];
  roles: RoleDef[];
  cards: CardDef[];
  byId: Map<string, CardDef>;
  phaseById: Map<PhaseDef["id"], PhaseDef>;
}

const KINDS = new Set<Kind>(["strike", "guard", "tool", "skill"]);
const FACTIONS = new Set<Faction>(["lighthouse", "silence", "grey"]);
const PHASES = ["night", "morning", "day", "play", "vote", "resolve", "discard"] as const;

const EFFECTS: Record<Kind, Set<string>> = {
  strike: new Set(["jam_play", "add_mark", "hush_tool", "echo_pin", "rift", "strip_guard", "force_discard", "expose"]),
  guard: new Set(["block_strike", "ignore_mark", "reflect", "block_intel", "steady", "fog"]),
  tool: new Set(["sniff", "rewrite", "mirror", "replay", "ping", "draw1"]),
  skill: new Set(["mute_all", "chorus_draw", "hop", "peek_deck"]),
};

const SKILL_EFFECTS = new Set(["sniff", "mirror", "hidden_mark", "anchor"]);
const UNTARGETED = new Set([
  "draw1",
  "mute_all",
  "chorus_draw",
  "hop",
  "peek_deck",
  "anchor",
  "block_strike",
  "ignore_mark",
  "reflect",
  "block_intel",
  "steady",
  "fog",
]);

function bad(message: string): never {
  throw new Error(`訊號牌表：${message}`);
}

function row(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) bad(`${label} 唔係物件`);
  return value as Record<string, unknown>;
}

function str(source: Record<string, unknown>, key: string, label: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") bad(`${label}.${key} 要有字`);
  return value.trim();
}

function num(source: Record<string, unknown>, key: string, label: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) bad(`${label}.${key} 要係數字`);
  return value;
}

function bool(source: Record<string, unknown>, key: string, label: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") bad(`${label}.${key} 要係布林`);
  return value;
}

function parseCard(value: unknown, index: number): CardDef {
  const raw = row(value, `cards[${index}]`);
  const kind = str(raw, "kind", `cards[${index}]`) as Kind;
  if (!KINDS.has(kind)) bad(`cards[${index}] 種類 ${kind}`);
  const effect = str(raw, "effect", `cards[${index}]`);
  if (!EFFECTS[kind].has(effect)) bad(`cards[${index}] 效果 ${effect}`);
  const needsTarget = bool(raw, "needsTarget", `cards[${index}]`);
  const expectTarget = !UNTARGETED.has(effect);
  if (needsTarget !== expectTarget) bad(`${str(raw, "name", `cards[${index}]`)} 目標旗唔夾`);
  return {
    id: str(raw, "id", `cards[${index}]`),
    name: str(raw, "name", `cards[${index}]`),
    kind,
    text: str(raw, "text", `cards[${index}]`),
    effect,
    needsTarget,
  };
}

function parseSkill(value: unknown, label: string): SkillDef {
  const raw = row(value, label);
  const effect = str(raw, "effect", label);
  if (!SKILL_EFFECTS.has(effect)) bad(`${label} 效果 ${effect}`);
  const window = str(raw, "window", label);
  if (window !== "night" && window !== "play" && window !== "vote") bad(`${label} 窗口`);
  const needsTarget = bool(raw, "needsTarget", label);
  if (needsTarget !== !UNTARGETED.has(effect)) bad(`${label} 目標旗唔夾`);
  return {
    id: str(raw, "id", label),
    name: str(raw, "name", label),
    window,
    text: str(raw, "text", label),
    effect,
    needsTarget,
  };
}

export function parseCatalog(cardsDoc: unknown, tableDoc: unknown): Catalog {
  const cardsRoot = row(cardsDoc, "cards");
  const table = row(tableDoc, "table");
  const version = str(cardsRoot, "version", "cards");
  if (str(table, "version", "table") !== version) bad("牌表同局表版本唔同");

  const cardList = cardsRoot.cards;
  if (!Array.isArray(cardList)) bad("cards 要係陣列");
  const cards = cardList.map(parseCard);
  const expected: Record<Kind, number> = { strike: 8, guard: 6, tool: 6, skill: 4 };
  for (const kind of KINDS) {
    const count = cards.filter((card) => card.kind === kind).length;
    if (count !== expected[kind]) bad(`${kind} 應有 ${expected[kind]} 張，而家 ${count}`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id) || names.has(card.name)) bad(`牌重複 ${card.name}`);
    ids.add(card.id);
    names.add(card.name);
  }

  const factions = row(table.factions, "factions");
  const factionLabels = {
    lighthouse: str(factions, "lighthouse", "factions"),
    silence: str(factions, "silence", "factions"),
    grey: str(factions, "grey", "factions"),
  };
  const compositionRaw = row(table.composition, "composition");
  const composition = {
    lighthouse: num(compositionRaw, "lighthouse", "composition"),
    silence: num(compositionRaw, "silence", "composition"),
    grey: num(compositionRaw, "grey", "composition"),
  };

  const roleList = table.roles;
  if (!Array.isArray(roleList)) bad("roles 要係陣列");
  const roles = roleList.map((value, index) => {
    const raw = row(value, `roles[${index}]`);
    const faction = str(raw, "faction", `roles[${index}]`) as Faction;
    if (!FACTIONS.has(faction)) bad(`roles[${index}] 陣營`);
    const factionLabel = str(raw, "factionLabel", `roles[${index}]`);
    if (factionLabel !== factionLabels[faction]) bad(`roles[${index}] 陣營名`);
    const skill = parseSkill(raw.skill, `roles[${index}].skill`);
    if (names.has(skill.name)) bad(`技名撞牌 ${skill.name}`);
    names.add(skill.name);
    return {
      id: str(raw, "id", `roles[${index}]`),
      name: str(raw, "name", `roles[${index}]`),
      faction,
      factionLabel,
      skill,
    };
  });
  const seatCount = composition.lighthouse + composition.silence + composition.grey;
  if (roles.length !== seatCount) bad("角色數同座位唔夾");
  for (const faction of FACTIONS) {
    const count = roles.filter((role) => role.faction === faction).length;
    if (count !== composition[faction]) bad(`${faction} 人數唔夾`);
  }

  const phaseList = table.phases;
  if (!Array.isArray(phaseList)) bad("phases 要係陣列");
  const phases = phaseList.map((value, index) => {
    const raw = row(value, `phases[${index}]`);
    const id = str(raw, "id", `phases[${index}]`) as PhaseDef["id"];
    if (!PHASES.includes(id)) bad(`phases[${index}] id`);
    const ms = num(raw, "ms", `phases[${index}]`);
    if (ms < 1000) bad(`${id} 太短`);
    return { id, label: str(raw, "label", `phases[${index}]`), coach: str(raw, "coach", `phases[${index}]`), ms };
  });
  if (phases.length !== PHASES.length || PHASES.some((id, index) => phases[index]?.id !== id)) {
    bad("階段次序要係夜、晨報、日、出牌、表決、結算、棄牌");
  }
  const day = phases.find((phase) => phase.id === "day");
  if (!day || day.ms < 60000 || day.ms > 90000) bad("日段要喺 60–90 秒");

  const winsRaw = row(table.wins, "wins");
  const priority = winsRaw.priority;
  if (!Array.isArray(priority) || priority.length !== 3) bad("wins.priority");
  for (const faction of priority) {
    if (!FACTIONS.has(faction as Faction)) bad("wins.priority 陣營");
  }
  const grey = row(winsRaw.grey, "wins.grey");
  const silence = row(winsRaw.silence, "wins.silence");
  const lighthouse = row(winsRaw.lighthouse, "wins.lighthouse");
  if (str(grey, "kind", "wins.grey") !== "survive_node") bad("灰頻勝法");
  if (str(silence, "kind", "wins.silence") !== "disconnect_quota") bad("消音組勝法");
  if (str(lighthouse, "kind", "wins.lighthouse") !== "clear_faction") bad("燈塔網勝法");
  const node = num(grey, "node", "wins.grey");
  const quota = num(silence, "quota", "wins.silence");
  const silenceFaction = str(silence, "faction", "wins.silence") as Faction;
  const clearFaction = str(lighthouse, "faction", "wins.lighthouse") as Faction;
  if (!FACTIONS.has(silenceFaction) || !FACTIONS.has(clearFaction)) bad("勝條件陣營");
  const maxRounds = num(table, "maxRounds", "table");
  if (node < 2 || maxRounds < node) bad("節點上限");
  if (quota < 1) bad("斷線額");

  const chipsRaw = table.chips;
  const aiNamesRaw = table.aiNames;
  if (!Array.isArray(chipsRaw) || chipsRaw.length < 3) bad("短句");
  if (!Array.isArray(aiNamesRaw) || aiNamesRaw.length < seatCount - 1) bad("AI 名");
  const chips = chipsRaw.map((chip, index) => {
    if (typeof chip !== "string" || chip.trim() === "") bad(`短句 ${index}`);
    return chip.trim();
  });
  const aiNames = aiNamesRaw.map((name, index) => {
    if (typeof name !== "string" || name.trim() === "") bad(`AI 名 ${index}`);
    return name.trim();
  });

  const handLimit = num(table, "handLimit", "table");
  const drawPerRound = num(table, "drawPerRound", "table");
  const fastMs = num(table, "fastMs", "table");
  if (handLimit !== 4 || drawPerRound !== 1) bad("手牌上限 4、每輪抽 1");
  if (fastMs < 1000) bad("fastMs");

  return {
    version,
    handLimit,
    drawPerRound,
    fastMs,
    maxRounds,
    tie: str(table, "tie", "table"),
    chips,
    aiNames,
    factions: factionLabels,
    composition,
    wins: {
      priority: priority as Faction[],
      grey: { kind: "survive_node", node, text: str(grey, "text", "wins.grey") },
      silence: {
        kind: "disconnect_quota",
        faction: silenceFaction,
        quota,
        text: str(silence, "text", "wins.silence"),
      },
      lighthouse: {
        kind: "clear_faction",
        faction: clearFaction,
        text: str(lighthouse, "text", "wins.lighthouse"),
      },
    },
    phases,
    roles,
    cards,
    byId: new Map(cards.map((card) => [card.id, card])),
    phaseById: new Map(phases.map((phase) => [phase.id, phase])),
  };
}
