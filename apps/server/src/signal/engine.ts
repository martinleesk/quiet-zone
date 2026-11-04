/**
 * 封鎖夜 · 訊號牌。Authoritative loop. Card text and win kinds come from the catalog.
 * AI acts as soon as a phase opens. There is no thinking delay.
 */

import type { Catalog, CardDef, Faction, Kind, PhaseId, SkillDef } from "./catalog.js";

export interface MatchOptions {
  seed?: number;
  now?: number;
  name?: string;
  fast?: boolean;
  /** Skip the opening phases so a trial can open on 出牌 or 表決. */
  at?: "play" | "vote";
  /** Tests drive every seat. AI stays idle. */
  manual?: boolean;
}

export type Command =
  | { type: "night"; action: "pass" | "arm" | "skill"; cardUid?: string; targetSeatId?: string }
  | { type: "talk"; chip: string }
  | {
      type: "play";
      action: "strike" | "fire" | "arm" | "tool" | "guard" | "skill" | "private" | "finish";
      cardUid?: string;
      targetSeatId?: string;
    }
  | { type: "vote"; targetSeatId: string }
  | { type: "discard"; cardUid: string }
  | { type: "ready" };

export interface PublicSeat {
  id: string;
  name: string;
  ai: boolean;
  connected: boolean;
  acted: boolean;
  marks: number;
  rifts: number;
  strike: string | null;
  guard: string | null;
  talk: string | null;
  vote: string | null;
  handCount: number;
  isYou: boolean;
  roleName?: string;
  factionLabel?: string;
}

export interface HandCard {
  uid: string;
  id: string;
  name: string;
  kind: Kind;
  kindLabel: string;
  text: string;
  needsTarget: boolean;
}

export interface SignalView {
  version: number;
  phase: PhaseId;
  phaseLabel: string;
  coach: string;
  round: number;
  banner: string;
  now: number;
  deadline: number;
  secondsLeft: number | null;
  secondsTotal: number;
  events: string[];
  log: string[];
  rules: string[];
  chips: string[];
  tally: Array<{ name: string; votes: number }> | null;
  winner: null | { faction: Faction | null; factionLabel: string; reason: string };
  seats: PublicSeat[];
  you: {
    seatId: string;
    name: string;
    connected: boolean;
    acted: boolean;
    voted: boolean;
    factionLabel: string;
    roleName: string;
    goal: string;
    skillName: string;
    skillText: string;
    skillWindow: SkillDef["window"];
    skillNeedsTarget: boolean;
    skillUsed: boolean;
    skillReady: boolean;
    hand: HandCard[];
    strike: string | null;
    guard: string | null;
    notes: string[];
    pending: string | null;
    canStrike: boolean;
    canFire: boolean;
    canArm: boolean;
    canTool: boolean;
    canGuard: boolean;
    quotas: { strike: string; tool: string; guard: string };
  };
}

interface CardInst {
  uid: string;
  defId: string;
}

interface NightPlan {
  action: "pass" | "arm" | "skill";
  cardUid?: string;
  targetSeatId?: string;
}

interface Seat {
  id: string;
  name: string;
  ai: boolean;
  connected: boolean;
  faction: Faction;
  roleId: string;
  roleName: string;
  skill: SkillDef;
  skillUsed: boolean;
  hand: CardInst[];
  strike: CardInst | null;
  guard: CardInst | null;
  pendingCard: CardInst | null;
  night: NightPlan | null;
  acted: boolean;
  jamNext: boolean;
  jammed: boolean;
  hushNext: boolean;
  hushed: boolean;
  noGuardNext: boolean;
  noGuard: boolean;
  marks: number;
  rifts: number;
  hop: boolean;
  anchor: boolean;
  talk: string | null;
  vote: string | null;
  strikePlayed: boolean;
  toolPlayed: boolean;
  skillPlayed: boolean;
  guardEquipped: boolean;
  lastPlayed: string[];
  previousPlayed: string[];
  notes: string[];
}

interface Winner {
  faction: Faction | null;
  reason: string;
}

interface State {
  rng: () => number;
  now: number;
  deadline: number;
  round: number;
  phase: PhaseId;
  version: number;
  seq: number;
  deck: CardInst[];
  discard: CardInst[];
  seats: Seat[];
  humanId: string;
  events: string[];
  queuedMorning: string[];
  log: string[];
  strikesMuted: boolean;
  muteNext: boolean;
  winner: Winner | null;
  tally: Array<{ seatId: string; votes: number }> | null;
  silenceProgress: number;
  fast: boolean;
  manual: boolean;
}

export interface MatchDebug {
  seats(): Array<{
    id: string;
    faction: Faction;
    connected: boolean;
    marks: number;
    rifts: number;
    jammed: boolean;
    hushed: boolean;
    noGuard: boolean;
    skillUsed: boolean;
    skillWindow: SkillDef["window"];
    guard: string | null;
    strike: string | null;
    hand: string[];
  }>;
  addCard(seatId: string, defId: string): string;
  clearHand(seatId: string): void;
  setMarks(seatId: string, marks: number): void;
  jump(phase: "night" | "play" | "vote" | "discard"): void;
  nextPlay(): void;
  disconnect(seatId: string): void;
  advanceRound(): void;
  silenceProgress(): number;
  notes(seatId: string): string[];
  log(): string[];
}

export interface Match {
  view(): SignalView;
  command(command: Command, seatId?: string): { ok: true } | { ok: false; error: string };
  tick(now: number): void;
  elapse(): void;
  debug: MatchDebug;
}

const KIND_LABEL: Record<Kind, string> = {
  strike: "武",
  guard: "防",
  tool: "道",
  skill: "技",
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cleanName(value: string | undefined): string {
  const text = (value ?? "夜歸人").replace(/\s+/g, " ").trim().slice(0, 12);
  return text || "夜歸人";
}

export function createMatch(catalog: Catalog, options: MatchOptions = {}): Match {
  const seed = Number.isFinite(options.seed) ? Math.floor(options.seed as number) : 20261104;
  const state: State = {
    rng: mulberry32(seed),
    now: Number.isFinite(options.now) ? (options.now as number) : 0,
    deadline: 0,
    round: 1,
    phase: "night",
    version: 0,
    seq: 0,
    deck: [],
    discard: [],
    seats: [],
    humanId: "s1",
    events: [],
    queuedMorning: [],
    log: [],
    strikesMuted: false,
    muteNext: false,
    winner: null,
    tally: null,
    silenceProgress: 0,
    fast: options.fast === true,
    manual: options.manual === true,
  };

  const roles = [...catalog.roles];
  shuffle(state, roles);
  const names = [cleanName(options.name), ...catalog.aiNames];
  state.seats = roles.map((role, index) => ({
    id: `s${index + 1}`,
    name: names[index] ?? `席${index + 1}`,
    ai: index !== 0,
    connected: true,
    faction: role.faction,
    roleId: role.id,
    roleName: role.name,
    skill: role.skill,
    skillUsed: false,
    hand: [],
    strike: null,
    guard: null,
    pendingCard: null,
    night: null,
    acted: false,
    jamNext: false,
    jammed: false,
    hushNext: false,
    hushed: false,
    noGuardNext: false,
    noGuard: false,
    marks: 0,
    rifts: 0,
    hop: false,
    anchor: false,
    talk: null,
    vote: null,
    strikePlayed: false,
    toolPlayed: false,
    skillPlayed: false,
    guardEquipped: false,
    lastPlayed: [],
    previousPlayed: [],
    notes: [],
  }));

  state.deck = catalog.cards.map((card) => spawn(state, card.id));
  shuffle(state, state.deck);
  for (let round = 0; round < catalog.handLimit; round += 1) {
    for (const seat of state.seats) draw(state, catalog, seat, 1);
  }
  state.log.push("封鎖夜開始。每人四張訊號牌。");
  enter(state, catalog, "night");

  if (options.at === "play" || options.at === "vote") skipThrough(state, catalog, ["night", "morning", "day"]);
  if (options.at === "vote") skipThrough(state, catalog, ["play"]);

  return {
    view: () => toView(state, catalog),
    command: (command, seatId) => applyCommand(state, catalog, command, seatId ?? state.humanId),
    tick: (now) => tick(state, catalog, now),
    elapse: () => tick(state, catalog, state.deadline),
    debug: debugApi(state, catalog),
  };
}

function spawn(state: State, defId: string): CardInst {
  state.seq += 1;
  return { uid: `k${state.seq}`, defId };
}

function shuffle<T>(state: State, list: T[]): void {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(state.rng() * (i + 1));
    const swap = list[i] as T;
    list[i] = list[j] as T;
    list[j] = swap;
  }
}

function defOf(catalog: Catalog, card: CardInst): CardDef {
  const found = catalog.byId.get(card.defId);
  if (!found) throw new Error(card.defId);
  return found;
}

function seatById(state: State, id: string): Seat | undefined {
  return state.seats.find((seat) => seat.id === id);
}

function others(state: State, seat: Seat): Seat[] {
  return state.seats.filter((other) => other.id !== seat.id && other.connected);
}

function phaseMs(state: State, catalog: Catalog, phase: Exclude<PhaseId, "ended">): number {
  if (state.fast) return catalog.fastMs;
  return catalog.phaseById.get(phase)?.ms ?? catalog.fastMs;
}

function pushLog(state: State, text: string): void {
  state.log.push(text);
  if (state.log.length > 80) state.log.shift();
}

function note(seat: Seat, text: string): void {
  seat.notes.push(text);
  if (seat.notes.length > 12) seat.notes.shift();
}

function take(seat: Seat, uid: string): CardInst | null {
  const index = seat.hand.findIndex((card) => card.uid === uid);
  if (index < 0) return null;
  return seat.hand.splice(index, 1)[0] ?? null;
}

function discardCard(state: State, card: CardInst | null): void {
  if (card) state.discard.push(card);
}

function guardEffect(catalog: Catalog, seat: Seat): string | null {
  return seat.guard ? defOf(catalog, seat.guard).effect : null;
}

function breakGuard(state: State, seat: Seat): void {
  discardCard(state, seat.guard);
  seat.guard = null;
}

function reshuffle(state: State): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = state.discard;
  state.discard = [];
  shuffle(state, state.deck);
}

function draw(state: State, catalog: Catalog, seat: Seat, count: number): void {
  for (let i = 0; i < count; i += 1) {
    reshuffle(state);
    const card = state.deck.pop();
    if (!card) return;
    seat.hand.push(card);
  }
  void catalog;
}

function addMark(state: State, catalog: Catalog, target: Seat, why: string): void {
  if (guardEffect(catalog, target) === "ignore_mark") {
    breakGuard(state, target);
    pushLog(state, `${target.name} 偽裝膜擋下疑點`);
    return;
  }
  target.marks += 1;
  pushLog(state, `${why}：${target.name} 疑點 ${target.marks}`);
}

function resolveStrike(
  state: State,
  catalog: Catalog,
  actor: Seat,
  target: Seat,
  card: CardDef,
  bonus: boolean,
  bounced = false,
): void {
  if (state.strikesMuted) {
    pushLog(state, `${card.name} 被總線靜音，落空`);
    return;
  }
  const guard = guardEffect(catalog, target);
  if (!bounced && guard === "reflect") {
    breakGuard(state, target);
    pushLog(state, `${target.name} 折射 ${card.name}`);
    resolveStrike(state, catalog, target, actor, card, false, true);
    return;
  }
  if (guard === "block_strike") {
    breakGuard(state, target);
    pushLog(state, `${target.name} 靜默罩擋下 ${card.name}`);
    return;
  }
  applyStrike(state, catalog, target, card);
  if (bonus && actor.strike && actor.connected) addMark(state, catalog, target, `${actor.name} 上膛`);
}

function applyStrike(state: State, catalog: Catalog, target: Seat, card: CardDef): void {
  switch (card.effect) {
    case "jam_play":
      target.jamNext = true;
      pushLog(state, `${target.name} 被擾頻`);
      break;
    case "add_mark":
      addMark(state, catalog, target, card.name);
      break;
    case "hush_tool":
      target.hushNext = true;
      pushLog(state, `${target.name} 被靜噪`);
      break;
    case "echo_pin":
      addMark(state, catalog, target, card.name);
      state.queuedMorning.push(`回聲釘留低：${target.name}`);
      break;
    case "rift":
      if (target.guard) {
        const name = defOf(catalog, target.guard).name;
        breakGuard(state, target);
        pushLog(state, `${target.name} 裂隙拆走 ${name}`);
      } else {
        target.rifts += 1;
        pushLog(state, `${target.name} 裂隙 ${target.rifts}`);
      }
      break;
    case "strip_guard":
      if (target.guard) {
        const name = defOf(catalog, target.guard).name;
        breakGuard(state, target);
        pushLog(state, `${target.name} 防槽 ${name} 被拆`);
      } else {
        pushLog(state, `${target.name} 冇防`);
      }
      break;
    case "force_discard":
      if (guardEffect(catalog, target) === "steady") {
        pushLog(state, `${target.name} 穩頻環，唔使棄`);
      } else if (target.hand.length === 0) {
        pushLog(state, `${target.name} 冇牌可棄`);
      } else {
        const index = Math.floor(state.rng() * target.hand.length);
        const [lost] = target.hand.splice(index, 1);
        discardCard(state, lost ?? null);
        pushLog(state, `${target.name} 被逼棄 1`);
      }
      break;
    case "expose":
      addMark(state, catalog, target, card.name);
      target.noGuardNext = true;
      state.queuedMorning.push(`頻閃留低：${target.name}`);
      break;
    default:
      break;
  }
}

function livingTarget(state: State, seat: Seat, targetId: string | undefined): Seat | string {
  if (!targetId) return "揀一個人";
  const target = seatById(state, targetId);
  if (!target || target.id === seat.id || !target.connected) return "揀唔到呢席";
  return target;
}

function probe(
  state: State,
  catalog: Catalog,
  actor: Seat,
  target: Seat,
  kind: "faction" | "equip" | "replay" | "ping",
  quiet: boolean,
): void {
  if (guardEffect(catalog, target) === "block_intel") {
    breakGuard(state, target);
    note(actor, `${target.name} 空殼，探唔到`);
    if (!quiet) pushLog(state, `${actor.name} 探 ${target.name}，落空`);
    return;
  }
  if (kind === "faction") {
    const seen = guardEffect(catalog, target) === "fog" ? "霧" : catalog.factions[target.faction];
    note(actor, `${target.name}：${seen}`);
    if (!quiet) pushLog(state, `${actor.name} 嗅探 ${target.name}`);
    return;
  }
  if (kind === "equip") {
    const strike = target.strike ? defOf(catalog, target.strike).name : "空";
    const guard = target.guard ? defOf(catalog, target.guard).name : "空";
    note(actor, `${target.name} 武 ${strike}／防 ${guard}`);
    if (!quiet) pushLog(state, `${actor.name} 睇 ${target.name} 裝備`);
    return;
  }
  if (kind === "replay") {
    const played = target.previousPlayed.length > 0 ? target.previousPlayed.join("、") : "上一輪冇出牌";
    note(actor, `${target.name}：${played}`);
    if (!quiet) pushLog(state, `${actor.name} 回放 ${target.name}`);
    return;
  }
  const armed = target.hand.some((card) => defOf(catalog, card).kind === "strike") || target.strike !== null;
  pushLog(state, `短波針：${target.name} ${armed ? "有武" : "冇武"}`);
}

function applyNamedEffect(
  state: State,
  catalog: Catalog,
  actor: Seat,
  target: Seat | null,
  effect: string,
  quiet: boolean,
): void {
  switch (effect) {
    case "draw1":
      draw(state, catalog, actor, 1);
      pushLog(state, `${actor.name} 備用晶片，抽 1`);
      break;
    case "sniff":
      if (target) probe(state, catalog, actor, target, "faction", quiet);
      break;
    case "rewrite":
      if (!target) break;
      if (target.marks > 0) {
        target.marks -= 1;
        pushLog(state, `${actor.name} 覆寫 ${target.name}，疑點 ${target.marks}`);
      } else {
        pushLog(state, `${target.name} 冇疑點可覆寫`);
      }
      break;
    case "mirror":
      if (target) probe(state, catalog, actor, target, "equip", quiet);
      break;
    case "replay":
      if (target) probe(state, catalog, actor, target, "replay", quiet);
      break;
    case "ping":
      if (target) probe(state, catalog, actor, target, "ping", quiet);
      break;
    case "mute_all":
      state.muteNext = true;
      pushLog(state, "總線靜音，下一輪武會落空");
      break;
    case "chorus_draw":
      draw(state, catalog, actor, 1);
      pushLog(state, `${actor.name} 燈塔齊鳴，抽 1`);
      break;
    case "hop":
      actor.hop = true;
      pushLog(state, `${actor.name} 灰線跳頻`);
      break;
    case "peek_deck": {
      reshuffle(state);
      const top = state.deck.slice(-3).reverse();
      const names = top.map((card) => defOf(catalog, card).name);
      note(actor, `牌庫頂：${names.join("、") || "空"}`);
      pushLog(state, `${actor.name} 用記錄釘`);
      break;
    }
    case "anchor":
      actor.anchor = true;
      note(actor, `${actor.skill.name} 預備`);
      break;
    case "hidden_mark":
      if (!target) break;
      addMark(state, catalog, target, "暗脈");
      state.queuedMorning.push(`暗脈點中 ${target.name}`);
      note(actor, `暗脈點中 ${target.name}`);
      break;
    default:
      break;
  }
}

function randomDiscardOne(state: State, seat: Seat): void {
  if (seat.hand.length === 0) return;
  const index = Math.floor(state.rng() * seat.hand.length);
  const [lost] = seat.hand.splice(index, 1);
  discardCard(state, lost ?? null);
}

function disconnect(state: State, catalog: Catalog, seat: Seat): void {
  seat.connected = false;
  seat.acted = true;
  discardCard(state, seat.strike);
  discardCard(state, seat.guard);
  discardCard(state, seat.pendingCard);
  seat.strike = null;
  seat.guard = null;
  seat.pendingCard = null;
  while (seat.hand.length > 0) discardCard(state, seat.hand.pop() ?? null);
  if (seat.faction === catalog.wins.silence.faction) state.silenceProgress += 1;
  pushLog(state, `${seat.name} 斷線`);
  claim(state, catalog);
}

function claim(state: State, catalog: Catalog): void {
  if (state.winner) return;
  const met = new Set<Faction>();
  if (state.silenceProgress >= catalog.wins.silence.quota) met.add("silence");
  const clear = catalog.wins.lighthouse.faction;
  if (!state.seats.some((seat) => seat.connected && seat.faction === clear)) met.add("lighthouse");
  const winner = catalog.wins.priority.find((faction) => met.has(faction));
  if (winner) setWinner(state, catalog, winner);
}

function setWinner(state: State, catalog: Catalog, faction: Faction): void {
  state.winner = { faction, reason: catalog.wins[faction].text };
  state.phase = "ended";
  state.version += 1;
}

function enter(state: State, catalog: Catalog, phase: Exclude<PhaseId, "ended">): void {
  state.phase = phase;
  state.deadline = state.now + phaseMs(state, catalog, phase);
  if (phase === "morning") {
    state.events = state.queuedMorning.splice(0);
    if (state.events.length === 0) state.events.push("夜靜。");
  }
  if (phase === "play") {
    state.strikesMuted = state.muteNext;
    state.muteNext = false;
    for (const seat of state.seats) {
      seat.jammed = seat.jamNext;
      seat.jamNext = false;
      seat.hushed = seat.hushNext;
      seat.hushNext = false;
      seat.noGuard = seat.noGuardNext;
      seat.noGuardNext = false;
      seat.strikePlayed = false;
      seat.toolPlayed = false;
      seat.skillPlayed = false;
      seat.guardEquipped = false;
      seat.previousPlayed = seat.lastPlayed;
      seat.lastPlayed = [];
    }
  }
  if (phase === "day") {
    for (const seat of state.seats) seat.talk = null;
  }
  if (phase === "vote") {
    for (const seat of state.seats) seat.vote = null;
    state.tally = null;
  }
  for (const seat of state.seats) seat.acted = seat.connected ? false : true;
  if (phase === "discard") {
    for (const seat of state.seats) {
      if (seat.connected && seat.hand.length <= catalog.handLimit) seat.acted = true;
    }
  }
  if (!state.manual) {
    for (const seat of state.seats) {
      if (seat.ai && seat.connected && !seat.acted) runAi(state, catalog, seat);
    }
  }
  state.version += 1;
}

function advanceRound(state: State, catalog: Catalog): void {
  if (state.winner) return;
  state.round += 1;
  const grey = state.seats.find((seat) => seat.faction === "grey");
  if (grey?.connected && state.round >= catalog.wins.grey.node) {
    setWinner(state, catalog, "grey");
    return;
  }
  if (state.round > catalog.maxRounds) {
    state.winner = { faction: null, reason: "時限到，未分勝負" };
    state.phase = "ended";
    state.version += 1;
    return;
  }
  for (const seat of state.seats) {
    seat.hop = false;
    seat.anchor = false;
  }
  enter(state, catalog, "night");
}

function closePhase(state: State, catalog: Catalog): void {
  const phase = state.phase;
  if (phase === "night") {
    for (const seat of state.seats) {
      if (!seat.connected) continue;
      resolveNight(state, catalog, seat);
    }
    enter(state, catalog, "morning");
    return;
  }
  if (phase === "morning") {
    enter(state, catalog, "day");
    return;
  }
  if (phase === "day") {
    enter(state, catalog, "play");
    return;
  }
  if (phase === "play") {
    enter(state, catalog, "vote");
    return;
  }
  if (phase === "vote") {
    closeVote(state, catalog);
    return;
  }
  if (phase === "resolve") {
    if (state.winner) return;
    for (const seat of state.seats) {
      if (seat.connected) draw(state, catalog, seat, catalog.drawPerRound);
    }
    if (state.seats.some((seat) => seat.connected && seat.hand.length > catalog.handLimit)) {
      enter(state, catalog, "discard");
    } else {
      advanceRound(state, catalog);
    }
    return;
  }
  if (phase === "discard") {
    for (const seat of state.seats) {
      if (!seat.connected) continue;
      while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
    }
    advanceRound(state, catalog);
  }
}

function resolveNight(state: State, catalog: Catalog, seat: Seat): void {
  const plan = seat.night ?? { action: "pass" as const };
  seat.night = null;
  if (plan.action === "arm" && seat.pendingCard) {
    discardCard(state, seat.strike);
    seat.strike = seat.pendingCard;
    seat.pendingCard = null;
    state.queuedMorning.push(`${seat.name} 武槽：${defOf(catalog, seat.strike).name}`);
    return;
  }
  if (plan.action === "skill") {
    const target = plan.targetSeatId ? seatById(state, plan.targetSeatId) : undefined;
    if (seat.skill.needsTarget && (!target || !target.connected || target.id === seat.id)) {
      note(seat, "暗技落空");
      return;
    }
    applyNamedEffect(state, catalog, seat, target ?? null, seat.skill.effect, true);
    if (seat.skill.effect === "sniff") state.queuedMorning.push("有人測向");
  }
}

function closeVote(state: State, catalog: Catalog): void {
  const totals = new Map<string, number>();
  for (const seat of state.seats) {
    if (!seat.connected || !seat.vote || seat.vote === "abstain") continue;
    totals.set(seat.vote, (totals.get(seat.vote) ?? 0) + 1);
  }
  state.tally = state.seats
    .filter((seat) => seat.connected)
    .map((seat) => ({ seatId: seat.id, votes: totals.get(seat.id) ?? 0 }));
  let top = 0;
  const leaders: Seat[] = [];
  for (const seat of state.seats) {
    if (!seat.connected) continue;
    const votes = totals.get(seat.id) ?? 0;
    if (votes > top) {
      top = votes;
      leaders.splice(0, leaders.length, seat);
    } else if (votes === top && votes > 0) {
      leaders.push(seat);
    }
  }
  if (top === 0 || leaders.length !== 1) {
    pushLog(state, state.seats.some((seat) => seat.connected && seat.vote && seat.vote !== "abstain") ? catalog.tie : "冇人斷線");
  } else {
    const target = leaders[0] as Seat;
    if (target.hop || target.anchor) {
      pushLog(state, `${target.name} ${target.anchor ? target.skill.name : "跳頻"}，留低`);
    } else {
      disconnect(state, catalog, target);
    }
  }
  for (const seat of state.seats) {
    seat.hop = false;
    seat.anchor = false;
  }
  if (!state.winner) enter(state, catalog, "resolve");
}

function phaseReady(state: State): boolean {
  if (state.phase === "ended" || state.winner) return false;
  return state.seats.every((seat) => !seat.connected || seat.acted);
}

function requestSettle(state: State, catalog: Catalog): void {
  let guard = 0;
  while (phaseReady(state) && guard < 80) {
    guard += 1;
    closePhase(state, catalog);
  }
}

function timeoutSeat(state: State, catalog: Catalog, seat: Seat): void {
  if (seat.acted || !seat.connected) return;
  if (state.phase === "night" && !seat.night) seat.night = { action: "pass" };
  if (state.phase === "vote" && !seat.vote) seat.vote = "abstain";
  if (state.phase === "discard") {
    while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
  }
  seat.acted = true;
}

function skipThrough(state: State, catalog: Catalog, phases: PhaseId[]): void {
  let guard = 0;
  while (phases.includes(state.phase) && !state.winner && guard < 20) {
    guard += 1;
    for (const seat of state.seats) {
      if (seat.connected && !seat.acted) timeoutSeat(state, catalog, seat);
    }
    requestSettle(state, catalog);
  }
}

function tick(state: State, catalog: Catalog, now: number): void {
  state.now = now;
  let guard = 0;
  while (state.phase !== "ended" && !state.winner && now >= state.deadline && guard < 80) {
    guard += 1;
    for (const seat of state.seats) timeoutSeat(state, catalog, seat);
    requestSettle(state, catalog);
  }
}

function pickTarget(state: State, seat: Seat): Seat | null {
  const pool = others(state, seat);
  if (pool.length === 0) return null;
  const marked = [...pool].sort((a, b) => b.marks - a.marks || a.id.localeCompare(b.id));
  if ((marked[0]?.marks ?? 0) > 0) return marked[0] ?? null;
  return pool[Math.floor(state.rng() * pool.length)] ?? null;
}

function runAi(state: State, catalog: Catalog, seat: Seat): void {
  if (state.phase === "night") {
    aiNight(state, catalog, seat);
    return;
  }
  if (state.phase === "day") {
    seat.talk = catalog.chips[Math.floor(state.rng() * catalog.chips.length)] ?? "我過";
    seat.acted = true;
    return;
  }
  if (state.phase === "play") {
    aiPlay(state, catalog, seat);
    return;
  }
  if (state.phase === "vote") {
    aiVote(state, seat);
    return;
  }
  if (state.phase === "discard") {
    while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
    seat.acted = true;
    return;
  }
  seat.acted = true;
}

function aiNight(state: State, catalog: Catalog, seat: Seat): void {
  if (!seat.skillUsed && seat.skill.window === "night") {
    const target = seat.skill.needsTarget ? pickTarget(state, seat) : null;
    if (!seat.skill.needsTarget || target) {
      seat.skillUsed = true;
      seat.night = { action: "skill", targetSeatId: target?.id };
      seat.acted = true;
      return;
    }
  }
  const strike = seat.hand.find((card) => defOf(catalog, card).kind === "strike");
  if (strike && !seat.strike) {
    seat.pendingCard = take(seat, strike.uid);
    seat.night = { action: "arm", cardUid: strike.uid };
    seat.acted = true;
    return;
  }
  seat.night = { action: "pass" };
  seat.acted = true;
}

function aiPlay(state: State, catalog: Catalog, seat: Seat): void {
  if (!seat.skillUsed && seat.skill.window === "play") {
    const target = seat.skill.needsTarget ? pickTarget(state, seat) : null;
    if (!seat.skill.needsTarget || target) usePrivate(state, catalog, seat, target);
  }
  if (!seat.guardEquipped && !seat.noGuard) {
    const guard =
      seat.hand.find((card) => defOf(catalog, card).effect === "block_strike") ??
      seat.hand.find((card) => defOf(catalog, card).kind === "guard");
    if (guard) equipGuard(state, catalog, seat, guard);
  }
  if (!seat.strikePlayed && !seat.jammed && !state.strikesMuted) {
    const strike = seat.hand.find((card) => defOf(catalog, card).kind === "strike");
    const target = pickTarget(state, seat);
    if (strike && target) playStrike(state, catalog, seat, strike, target);
  }
  if (!seat.toolPlayed && !seat.hushed) {
    const tool =
      seat.hand.find((card) => defOf(catalog, card).effect === "draw1") ??
      seat.hand.find((card) => defOf(catalog, card).kind === "tool");
    if (tool) {
      const card = defOf(catalog, tool);
      const target = card.needsTarget ? pickTarget(state, seat) : null;
      if (!card.needsTarget || target) playTool(state, catalog, seat, tool, target);
    }
  }
  const skill = seat.hand.find((card) => defOf(catalog, card).kind === "skill");
  if (skill && !seat.skillPlayed) {
    const effect = defOf(catalog, skill).effect;
    const useful = effect === "chorus_draw" || effect === "peek_deck" || (effect === "hop" && seat.marks > 0);
    if (useful) playSkillCard(state, catalog, seat, skill);
  }
  seat.acted = true;
}

function aiVote(state: State, seat: Seat): void {
  if (!seat.skillUsed && seat.skill.window === "vote") {
    seat.skillUsed = true;
    seat.anchor = true;
    note(seat, `${seat.skill.name} 預備`);
  }
  const pool = others(state, seat).sort((a, b) => b.marks - a.marks || a.id.localeCompare(b.id));
  if (pool.length === 0) seat.vote = "abstain";
  else if ((pool[0]?.marks ?? 0) > 0) seat.vote = pool[0]?.id ?? "abstain";
  else seat.vote = pool[(state.round + seatIndex(state, seat)) % pool.length]?.id ?? "abstain";
  seat.acted = true;
}

function seatIndex(state: State, seat: Seat): number {
  return state.seats.findIndex((other) => other.id === seat.id);
}

function equipGuard(state: State, catalog: Catalog, seat: Seat, card: CardInst): void {
  const held = card.uid.startsWith("pending") ? card : take(seat, card.uid);
  if (!held) return;
  discardCard(state, seat.guard);
  seat.guard = held;
  seat.guardEquipped = true;
  pushLog(state, `${seat.name} 裝上 ${defOf(catalog, held).name}`);
}

function playStrike(state: State, catalog: Catalog, seat: Seat, card: CardInst, target: Seat): void {
  const held = take(seat, card.uid);
  if (!held) return;
  const cardDef = defOf(catalog, held);
  seat.strikePlayed = true;
  seat.lastPlayed.push(cardDef.name);
  resolveStrike(state, catalog, seat, target, cardDef, true);
}

function playTool(state: State, catalog: Catalog, seat: Seat, card: CardInst, target: Seat | null): void {
  const held = take(seat, card.uid);
  if (!held) return;
  const cardDef = defOf(catalog, held);
  seat.toolPlayed = true;
  seat.lastPlayed.push(cardDef.name);
  applyNamedEffect(state, catalog, seat, target, cardDef.effect, false);
}

function playSkillCard(state: State, catalog: Catalog, seat: Seat, card: CardInst): void {
  const held = take(seat, card.uid);
  if (!held) return;
  const cardDef = defOf(catalog, held);
  seat.skillPlayed = true;
  seat.lastPlayed.push(cardDef.name);
  applyNamedEffect(state, catalog, seat, null, cardDef.effect, false);
}

function usePrivate(state: State, catalog: Catalog, seat: Seat, target: Seat | null): void {
  seat.skillUsed = true;
  applyNamedEffect(state, catalog, seat, target, seat.skill.effect, state.phase === "night");
}

function applyCommand(
  state: State,
  catalog: Catalog,
  command: Command,
  seatId: string,
): { ok: true } | { ok: false; error: string } {
  if (state.phase === "ended") return { ok: false, error: "局已完" };
  const seat = seatById(state, seatId);
  if (!seat) return { ok: false, error: "冇呢席" };
  const error = dispatch(state, catalog, seat, command);
  if (error) return { ok: false, error };
  state.version += 1;
  requestSettle(state, catalog);
  return { ok: true };
}

function dispatch(state: State, catalog: Catalog, seat: Seat, command: Command): string | null {
  if (command.type === "ready") return ready(state, catalog, seat);
  if (!seat.connected) return "你已斷線";
  if (seat.acted && !(command.type === "vote" && state.phase === "vote" && seat.skill.window === "vote")) {
    if (!(state.phase === "vote" && command.type === "play")) return "你已經行動";
  }
  switch (command.type) {
    case "night":
      return doNight(state, catalog, seat, command);
    case "talk":
      return doTalk(state, catalog, seat, command.chip);
    case "play":
      return doPlay(state, catalog, seat, command);
    case "vote":
      return doVote(state, seat, command.targetSeatId);
    case "discard":
      return doDiscard(state, catalog, seat, command.cardUid);
    default:
      return "唔明呢一下";
  }
}

function ready(state: State, catalog: Catalog, seat: Seat): string | null {
  if (!seat.connected || seat.acted) return null;
  if (state.phase === "discard" && seat.hand.length > catalog.handLimit) return "先棄牌";
  timeoutSeat(state, catalog, seat);
  return null;
}

function doNight(
  state: State,
  catalog: Catalog,
  seat: Seat,
  command: Extract<Command, { type: "night" }>,
): string | null {
  if (state.phase !== "night") return "而家唔係夜";
  if (seat.acted) return "你已經行動";
  if (command.action === "pass") {
    seat.night = { action: "pass" };
    seat.acted = true;
    return null;
  }
  if (command.action === "arm") {
    if (!command.cardUid) return "揀一張武";
    const card = seat.hand.find((item) => item.uid === command.cardUid);
    if (!card || defOf(catalog, card).kind !== "strike") return "呢張唔係武";
    seat.pendingCard = take(seat, card.uid);
    seat.night = { action: "arm", cardUid: card.uid };
    seat.acted = true;
    return null;
  }
  if (seat.skillUsed || seat.skill.window !== "night") return "暗技用唔到";
  const target = seat.skill.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
  if (typeof target === "string") return target;
  seat.skillUsed = true;
  seat.night = { action: "skill", targetSeatId: target?.id };
  seat.acted = true;
  return null;
}

function doTalk(state: State, catalog: Catalog, seat: Seat, chip: string): string | null {
  if (state.phase !== "day") return "而家唔係日";
  if (seat.acted) return "你已經行動";
  if (!catalog.chips.includes(chip)) return "冇呢句";
  seat.talk = chip;
  seat.acted = true;
  return null;
}

function doPlay(
  state: State,
  catalog: Catalog,
  seat: Seat,
  command: Extract<Command, { type: "play" }>,
): string | null {
  if (state.phase === "vote" && command.action === "private") {
    if (seat.skillUsed || seat.skill.window !== "vote") return "身份技用唔到";
    usePrivate(state, catalog, seat, null);
    return null;
  }
  if (state.phase !== "play") return "而家唔係出牌";
  if (seat.acted) return "你已經行動";
  if (command.action === "finish") {
    seat.acted = true;
    return null;
  }
  if (command.action === "private") {
    if (seat.skillUsed || seat.skill.window !== "play") return "身份技用唔到";
    const target = seat.skill.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
    if (typeof target === "string") return target;
    usePrivate(state, catalog, seat, target);
    return null;
  }
  if (command.action === "fire") {
    if (seat.jammed || state.strikesMuted) return "而家打唔出武";
    if (seat.strikePlayed) return "武額用咗";
    if (!seat.strike) return "武槽係空";
    const target = livingTarget(state, seat, command.targetSeatId);
    if (typeof target === "string") return target;
    const card = defOf(catalog, seat.strike);
    seat.strikePlayed = true;
    seat.lastPlayed.push(card.name);
    resolveStrike(state, catalog, seat, target, card, false);
    return null;
  }
  if (command.action === "arm") {
    if (seat.jammed) return "被擾頻，裝唔到武";
    if (seat.strikePlayed) return "武額用咗";
    if (!command.cardUid) return "揀一張武";
    const card = seat.hand.find((item) => item.uid === command.cardUid);
    if (!card || defOf(catalog, card).kind !== "strike") return "呢張唔係武";
    const held = take(seat, card.uid);
    if (!held) return "冇呢張牌";
    discardCard(state, seat.strike);
    seat.strike = held;
    seat.strikePlayed = true;
    seat.lastPlayed.push(defOf(catalog, held).name);
    pushLog(state, `${seat.name} 裝上 ${defOf(catalog, held).name}`);
    return null;
  }
  if (!command.cardUid) return "揀一張牌";
  const card = seat.hand.find((item) => item.uid === command.cardUid);
  if (!card) return "冇呢張牌";
  const cardDef = defOf(catalog, card);
  if (command.action === "guard") {
    if (seat.noGuard) return "頻閃未過，裝唔到防";
    if (seat.guardEquipped) return "今輪裝過防";
    if (cardDef.kind !== "guard") return "呢張唔係防";
    equipGuard(state, catalog, seat, card);
    return null;
  }
  if (command.action === "strike") {
    if (seat.jammed || state.strikesMuted) return "而家打唔出武";
    if (seat.strikePlayed) return "武額用咗";
    if (cardDef.kind !== "strike") return "呢張唔係武";
    const target = livingTarget(state, seat, command.targetSeatId);
    if (typeof target === "string") return target;
    playStrike(state, catalog, seat, card, target);
    return null;
  }
  if (command.action === "tool") {
    if (seat.hushed) return "被靜噪，打唔出道";
    if (seat.toolPlayed) return "道額用咗";
    if (cardDef.kind !== "tool") return "呢張唔係道";
    const target = cardDef.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
    if (typeof target === "string") return target;
    playTool(state, catalog, seat, card, target);
    return null;
  }
  if (command.action === "skill") {
    if (seat.skillPlayed) return "技額用咗";
    if (cardDef.kind !== "skill") return "呢張唔係技";
    playSkillCard(state, catalog, seat, card);
    return null;
  }
  return "唔明呢一下";
}

function doVote(state: State, seat: Seat, targetId: string): string | null {
  if (state.phase !== "vote") return "而家唔係表決";
  if (seat.vote) return "已表決";
  if (targetId !== "abstain") {
    const target = livingTarget(state, seat, targetId);
    if (typeof target === "string") return target;
    seat.vote = target.id;
  } else {
    seat.vote = "abstain";
  }
  if (seat.skillUsed || seat.skill.window !== "vote") seat.acted = true;
  return null;
}

function doDiscard(state: State, catalog: Catalog, seat: Seat, uid: string): string | null {
  if (state.phase !== "discard") return "而家唔使棄";
  if (seat.hand.length <= catalog.handLimit) return "手牌未超額";
  const card = take(seat, uid);
  if (!card) return "冇呢張牌";
  discardCard(state, card);
  pushLog(state, `${seat.name} 棄 1`);
  if (seat.hand.length <= catalog.handLimit) seat.acted = true;
  return null;
}

function handView(catalog: Catalog, card: CardInst): HandCard {
  const cardDef = defOf(catalog, card);
  return {
    uid: card.uid,
    id: cardDef.id,
    name: cardDef.name,
    kind: cardDef.kind,
    kindLabel: KIND_LABEL[cardDef.kind],
    text: cardDef.text,
    needsTarget: cardDef.needsTarget,
  };
}

function voteLabel(state: State, seat: Seat): string | null {
  if (state.phase !== "vote" && state.phase !== "resolve" && state.phase !== "ended") return null;
  if (!seat.vote) return null;
  if (seat.vote === "abstain") return "棄權";
  return seatById(state, seat.vote)?.name ?? null;
}

function goalFor(catalog: Catalog, faction: Faction): string {
  return catalog.wins[faction].text;
}

function toView(state: State, catalog: Catalog): SignalView {
  const you = seatById(state, state.humanId) as Seat;
  const phaseDef = state.phase === "ended" ? null : catalog.phaseById.get(state.phase);
  const total = state.phase === "ended" ? 0 : phaseMs(state, catalog, state.phase);
  const secondsLeft = state.phase === "ended" ? null : Math.max(0, Math.ceil((state.deadline - state.now) / 1000));
  const ended = state.phase === "ended";
  return {
    version: state.version,
    phase: state.phase,
    phaseLabel: ended ? "終局" : (phaseDef?.label ?? ""),
    coach: state.winner ? state.winner.reason : (phaseDef?.coach ?? ""),
    round: state.round,
    banner: `第 ${state.round} 節點`,
    now: state.now,
    deadline: state.deadline,
    secondsLeft,
    secondsTotal: Math.max(1, Math.round(total / 1000)),
    events: [...state.events],
    log: state.log.slice(-8),
    rules: [catalog.wins.silence.text, catalog.wins.lighthouse.text, catalog.wins.grey.text],
    chips: catalog.chips,
    tally: state.tally
      ? state.tally.map((row) => ({
          name: seatById(state, row.seatId)?.name ?? row.seatId,
          votes: row.votes,
        }))
      : null,
    winner: state.winner
      ? {
          faction: state.winner.faction,
          factionLabel: state.winner.faction ? catalog.factions[state.winner.faction] : "未分勝負",
          reason: state.winner.reason,
        }
      : null,
    seats: state.seats.map((seat) => ({
      id: seat.id,
      name: seat.name,
      ai: seat.ai,
      connected: seat.connected,
      acted: seat.acted && seat.connected,
      marks: seat.marks,
      rifts: seat.rifts,
      strike: seat.strike ? defOf(catalog, seat.strike).name : null,
      guard: seat.guard ? defOf(catalog, seat.guard).name : null,
      talk: seat.talk,
      vote: voteLabel(state, seat),
      handCount: seat.hand.length,
      isYou: seat.id === state.humanId,
      ...(ended
        ? { roleName: seat.roleName, factionLabel: catalog.factions[seat.faction] }
        : {}),
    })),
    you: {
      seatId: you.id,
      name: you.name,
      connected: you.connected,
      acted: you.acted,
      voted: you.vote !== null,
      factionLabel: catalog.factions[you.faction],
      roleName: you.roleName,
      goal: goalFor(catalog, you.faction),
      skillName: you.skill.name,
      skillText: you.skill.text,
      skillWindow: you.skill.window,
      skillNeedsTarget: you.skill.needsTarget,
      skillUsed: you.skillUsed,
      skillReady: you.connected && !you.skillUsed && you.skill.window === state.phase && (state.phase === "vote" || !you.acted),
      hand: you.hand.map((card) => handView(catalog, card)),
      strike: you.strike ? defOf(catalog, you.strike).name : null,
      guard: you.guard ? defOf(catalog, you.guard).name : null,
      notes: you.notes.slice(-4),
      pending: you.pendingCard ? defOf(catalog, you.pendingCard).name : null,
      canStrike: state.phase === "play" && you.connected && !you.acted && !you.strikePlayed && !you.jammed && !state.strikesMuted,
      canFire:
        state.phase === "play" &&
        you.connected &&
        !you.acted &&
        !you.strikePlayed &&
        !you.jammed &&
        !state.strikesMuted &&
        you.strike !== null,
      canArm: state.phase === "play" && you.connected && !you.acted && !you.strikePlayed && !you.jammed,
      canTool: state.phase === "play" && you.connected && !you.acted && !you.toolPlayed && !you.hushed,
      canGuard: state.phase === "play" && you.connected && !you.acted && !you.guardEquipped && !you.noGuard,
      quotas: {
        strike: `${you.strikePlayed ? 1 : 0}/1`,
        tool: `${you.toolPlayed ? 1 : 0}/1`,
        guard: `${you.guardEquipped ? 1 : 0}/1`,
      },
    },
  };
}

function debugApi(state: State, catalog: Catalog): MatchDebug {
  const find = (id: string): Seat => {
    const seat = seatById(state, id);
    if (!seat) throw new Error(id);
    return seat;
  };
  return {
    seats: () =>
      state.seats.map((seat) => ({
        id: seat.id,
        faction: seat.faction,
        connected: seat.connected,
        marks: seat.marks,
        rifts: seat.rifts,
        jammed: seat.jammed,
        hushed: seat.hushed,
        noGuard: seat.noGuard,
        skillUsed: seat.skillUsed,
        skillWindow: seat.skill.window,
        guard: seat.guard ? defOf(catalog, seat.guard).effect : null,
        strike: seat.strike ? defOf(catalog, seat.strike).name : null,
        hand: seat.hand.map((card) => card.defId),
      })),
    addCard: (seatId, defId) => {
      if (!catalog.byId.has(defId)) throw new Error(defId);
      const card = spawn(state, defId);
      find(seatId).hand.push(card);
      return card.uid;
    },
    clearHand: (seatId) => {
      const seat = find(seatId);
      while (seat.hand.length > 0) discardCard(state, seat.hand.pop() ?? null);
    },
    setMarks: (seatId, marks) => {
      find(seatId).marks = marks;
    },
    jump: (phase) => {
      state.winner = null;
      enter(state, catalog, phase);
    },
    nextPlay: () => {
      state.winner = null;
      enter(state, catalog, "play");
    },
    disconnect: (seatId) => {
      const seat = find(seatId);
      if (seat.connected) disconnect(state, catalog, seat);
    },
    advanceRound: () => advanceRound(state, catalog),
    silenceProgress: () => state.silenceProgress,
    notes: (seatId) => [...find(seatId).notes],
    log: () => [...state.log],
  };
}
