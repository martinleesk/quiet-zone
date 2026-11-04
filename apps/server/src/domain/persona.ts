/**
 * Seeded AI personas. Rule C stays: phrase-bank lines, and a unique human
 * vote leader is copied by every AI. Personas only choose talk, drafts,
 * night targets, and votes when no human ballot exists to follow.
 * Two seats never share a persona just because they share a role.
 *
 * Soft timing (not a rule change): the first night kill is not automatic.
 * 謹慎旁觀、安靜跟票、守線穩票、大聲虛張 hold night 1. 尖銳指控 only strikes
 * then if their accusation is the unique public heat. 夜獵優先 still opens on
 * the pinned seat. Later nights keep different targets. 守線 and 夜獵 covers
 * guard that pin; 大聲虛張 still guards a decoy seat.
 */
import { DRAFT_PHRASES, SILENCE_TEMPLATES, TALK_PHRASES, speakTalk } from "./phrases.js";
import type { Faction, NightCommand, Phase, RoleId } from "./types.js";

export const PERSONAS = [
  {
    id: "accuser",
    label: "尖銳指控",
    talkativeness: 3,
    talk: [talk("疑"), talk("疑"), talk("未實錘")],
    draft: draft("我覺得要再核對一次先好隔離。"),
    silence: [silence("今夜我建議失聯一個燈塔席。"), silence("小心灰頻，唔好亂送頭。")],
    pin: "我釘低一句：今輪有人站得太前。",
    plant: "有人話呢席唔乾淨。",
  },
  {
    id: "observer",
    label: "謹慎旁觀",
    talkativeness: 1,
    talk: [talk("觀望"), talk("未實錘"), talk("再聽一輪"), talk("小心錯票")],
    draft: draft("我未有新料，保持觀望。"),
    silence: [silence("今輪跳過，唔好暴露。"), silence("可能有掩護，換一個目標。")],
    pin: "我釘低一句：未見足夠失聯痕跡。",
    plant: "未核實之前，呢句只係傳聞。",
  },
  {
    id: "bluffer",
    label: "大聲虛張",
    talkativeness: 3,
    talk: [talk("保"), talk("疑"), talk("跟票")],
    draft: draft("我跟多數票，唔追加指控。"),
    silence: [silence("可能有掩護，換一個目標。"), silence("我跟組內嘅選擇。")],
    pin: "我釘低一句：呢席講得太滿，先當未核。",
    plant: "其實係對家想帶節奏。",
  },
  {
    id: "follower",
    label: "安靜跟票",
    talkativeness: 0,
    talk: [talk("跟票"), talk("觀望")],
    draft: draft("我跟多數票，唔追加指控。"),
    silence: [silence("我跟組內嘅選擇。"), silence("今輪跳過，唔好暴露。")],
    pin: "我釘低一句：我跟場上已經講過嘅方向。",
    plant: "我聽到同多數人一樣嘅方向。",
  },
  {
    id: "hunter",
    label: "夜獵優先",
    talkativeness: 2,
    talk: [talk("小心錯票"), talk("小心錯票"), talk("疑")],
    draft: draft("熄燈之後先再睇失聯邊個。"),
    silence: [silence("小心灰頻，唔好亂送頭。"), silence("今夜我建議失聯一個燈塔席。")],
    pin: "我釘低一句：先留意會查人同會釘選嘅席。",
    plant: "夜晚先會知邊個真係危險。",
  },
  {
    id: "anchor",
    label: "守線穩票",
    talkativeness: 2,
    talk: [talk("睇線報"), talk("保"), talk("未實錘")],
    draft: draft("我覺得要再核對一次先好隔離。"),
    silence: [silence("可能有掩護，換一個目標。"), silence("小心灰頻，唔好亂送頭。")],
    pin: "我釘低一句：未對到單之前，唔好靠感覺隔離。",
    plant: "呢句同線報唔一致。",
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];
export type Persona = (typeof PERSONAS)[number];

export interface SeatBrief {
  id: string;
  index: number;
  nickname: string;
  alive: boolean;
}

export interface Accusation {
  fromId: string;
  targetId: string;
  kind: "疑" | "保";
  round: number;
}

export interface ThinkContext {
  selfId: string;
  selfIndex: number;
  selfRole: RoleId | null;
  selfFaction: Faction | null;
  selfPersona: PersonaId | null;
  seats: readonly SeatBrief[];
  round: number;
  night: number;
  salt: number;
  phase: Phase;
  accusations: readonly Accusation[];
  pinSeatIds: readonly string[];
  sweeps: Readonly<Record<string, "clean" | "dirty">>;
  linkedUsed: Readonly<Record<string, boolean>>;
  teammates: readonly string[];
  marks: readonly string[];
  coverReady: boolean;
  sealUsed: boolean;
  fakeCharges: number;
  openPinIds: readonly string[];
}

export interface TalkDecision {
  text: string;
  kind: "疑" | "保" | "line";
  targetId: string | null;
}

export interface FakePlan {
  mode: "flag" | "plant";
  pinId?: string;
  text?: string;
}

export interface DayPlan {
  pin?: string;
  linkId?: string;
  fake?: FakePlan;
  markId?: string;
}

/** Adjacent seats always differ. `salt` rotates the ring so the same seat changes across games. */
export function personaForSeat(seatIndex: number, salt: number): Persona {
  const index = (seatIndex + (salt >>> 0)) % PERSONAS.length;
  return PERSONAS[index] ?? PERSONAS[0];
}

export function personaById(id: PersonaId): Persona {
  return PERSONAS.find((persona) => persona.id === id) ?? PERSONAS[0];
}

export function speakPriority(id: PersonaId): number {
  return personaById(id).talkativeness;
}

/**
 * Last two living seats cannot lynch each other: both voting is a permanent tie.
 * The louder persona presses the vote. Equal volume falls to the earlier seat.
 */
/** Loudest persona. Equal volume falls to the earlier seat. */
export function loudestPresserId(
  seats: readonly { id: string; index: number; personaId: PersonaId | null }[],
): string | null {
  if (seats.length === 0) return null;
  let best = seats[0]!;
  for (const seat of seats.slice(1)) {
    const bestScore = best.personaId ? speakPriority(best.personaId) : 0;
    const score = seat.personaId ? speakPriority(seat.personaId) : 0;
    if (score > bestScore || (score === bestScore && seat.index < best.index)) best = seat;
  }
  return best.id;
}

export function duelPresserId(
  pair: readonly { id: string; index: number; personaId: PersonaId | null }[],
): string | null {
  if (pair.length !== 2) return null;
  return loudestPresserId(pair);
}

export function shouldSpeak(id: PersonaId, round: number, index: number, salt: number): boolean {
  const talkativeness = speakPriority(id);
  if (talkativeness >= 3) return true;
  if (talkativeness === 2) return round === 1 || (round + index + (salt % 2)) % 2 === 0;
  if (talkativeness === 1) return (round + index) % 2 === 1;
  return (round + (salt % 3)) % 3 === index % 3;
}

export function shouldDraft(id: PersonaId, round: number, index: number): boolean {
  if (id === "follower") return round % 3 === index % 3;
  if (id === "observer") return round % 2 === 0;
  return true;
}

/** Plant spends the anonymous ballot when thinking for itself. Majority-follow ignores this. */
export function wantsAnonymous(id: PersonaId): boolean {
  return id === "bluffer" || id === "hunter" || id === "accuser";
}

export function talkDecision(ctx: ThinkContext): TalkDecision {
  const persona = ctx.selfPersona ? personaById(ctx.selfPersona) : PERSONAS[1];
  const phrase = persona.talk[(ctx.round + ctx.selfIndex) % persona.talk.length] ?? "觀望";
  if (phrase !== "疑" && phrase !== "保") return { text: phrase, kind: "line", targetId: null };
  const targetId = phrase === "保" ? protectTarget(ctx) : accuseTarget(ctx);
  return finishTalk(ctx, phrase, targetId);
}

export function draftLine(ctx: ThinkContext): string | null {
  if (!ctx.selfPersona) return null;
  if (!shouldDraft(ctx.selfPersona, ctx.round, ctx.selfIndex)) return null;
  return personaById(ctx.selfPersona).draft;
}

export function silenceLine(ctx: ThinkContext): string {
  const persona = ctx.selfPersona ? personaById(ctx.selfPersona) : PERSONAS[3];
  return persona.silence[(ctx.selfIndex + ctx.night) % persona.silence.length] ?? persona.silence[0];
}

export function voteTarget(ctx: ThinkContext): string | null {
  if (!ctx.selfPersona) return null;
  const pool = enemies(ctx);
  if (pool.length === 0) return null;
  if (ctx.selfFaction === "silence") return silenceVote(ctx, pool);
  return townVote(ctx, pool);
}

export function dayPlan(ctx: ThinkContext): DayPlan {
  const personaId = ctx.selfPersona;
  const role = ctx.selfRole;
  if (!personaId || !role) return {};
  const persona = personaById(personaId);
  const plan: DayPlan = {};
  if (role === "tip") plan.pin = persona.pin;
  if (role === "link") {
    const id = linkTarget(ctx);
    if (id) plan.linkId = id;
  }
  if (role === "decoy") {
    const fake = dayFake(ctx);
    if (fake) plan.fake = fake;
  }
  if (role === "warrant" && (personaId === "accuser" || personaId === "hunter") && ctx.marks.length < 4) {
    const id = markTarget(ctx, unmarked(ctx));
    if (id) plan.markId = id;
  }
  return plan;
}

export function nightSide(ctx: ThinkContext): FakePlan | null {
  if (ctx.selfRole !== "decoy" || !ctx.selfPersona || ctx.fakeCharges <= 0) return null;
  const persona = personaById(ctx.selfPersona);
  if (ctx.selfPersona === "anchor" || ctx.selfPersona === "observer" || ctx.selfPersona === "bluffer") {
    return { mode: "plant", text: persona.plant };
  }
  if ((ctx.selfPersona === "hunter" || ctx.selfPersona === "accuser") && ctx.openPinIds[0]) {
    return { mode: "flag", pinId: ctx.openPinIds[0] };
  }
  if (ctx.selfPersona === "hunter") return { mode: "plant", text: persona.plant };
  return null;
}

export function nightCommand(ctx: ThinkContext): NightCommand | null {
  const role = ctx.selfRole;
  const persona = ctx.selfPersona;
  if (!role || !persona) return null;
  if (role === "silencer") return silenceKill(ctx);
  if (role === "cover") return coverPick(ctx);
  if (role === "sweep") return sweepPick(ctx);
  if (role === "warrant") return warrantNight(ctx);
  return null;
}

function townVote(ctx: ThinkContext, pool: SeatBrief[]): string | null {
  const persona = ctx.selfPersona;
  const dirty = pool.find((seat) => ctx.sweeps[seat.id] === "dirty");
  if (dirty && persona !== "bluffer") return dirty.id;
  if (ctx.round >= 5) return campTarget(ctx, pool);
  if (persona === "bluffer") return coldest(ctx, pool).id;
  if (persona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
  if (persona === "hunter") {
    if (ctx.round >= 4) return campTarget(ctx, pool);
    return null;
  }
  const heat = uniqueHeat(ctx, pool);
  const heatScore = heat ? suspicion(ctx, heat) : 0;
  if (persona === "observer") {
    if (ctx.round < 2) return null;
    if (heat && heatScore >= 2) return heat;
    if (ctx.round >= 3) return campTarget(ctx, pool);
    return null;
  }
  if (persona === "anchor") {
    if (heat && heatScore >= 4) return heat;
    return campTarget(ctx, pool);
  }
  if (persona === "follower") {
    if (heat && (ctx.round >= 2 || heatScore >= 4)) return heat;
    if (ctx.round >= 2) return campTarget(ctx, pool);
    return null;
  }
  return null;
}

function silenceVote(ctx: ThinkContext, pool: SeatBrief[]): string | null {
  const persona = ctx.selfPersona;
  if (persona === "observer" && ctx.round < 2) return null;
  if (persona === "observer" || persona === "follower") {
    return uniqueHeat(ctx, pool);
  }
  if (persona === "bluffer") return coldest(ctx, pool).id;
  if (persona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 1)?.id ?? null;
  if (persona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
  return rotated(ctx, pool, 4)?.id ?? null;
}

function silenceKill(ctx: ThinkContext): NightCommand {
  const pool = enemies(ctx);
  if (pool.length === 0 || !ctx.selfPersona) return { action: "skip" };
  const holdsFirstNight =
    ctx.selfPersona === "observer" ||
    ctx.selfPersona === "follower" ||
    ctx.selfPersona === "anchor" ||
    ctx.selfPersona === "bluffer";
  if (holdsFirstNight && ctx.night <= 1) return { action: "skip" };
  if (ctx.selfPersona === "hunter") {
    return { action: "disconnect", targetSeatId: pinFirst(ctx, pool) ?? rotated(ctx, pool, 1 + ctx.night)!.id };
  }
  if (ctx.selfPersona === "bluffer") return { action: "disconnect", targetSeatId: coldest(ctx, pool).id };
  if (ctx.selfPersona === "accuser") {
    const named = ownSuspect(ctx, pool);
    const hot = uniqueHeat(ctx, pool);
    if (ctx.night <= 1 && (!named || named !== hot)) return { action: "skip" };
    return { action: "disconnect", targetSeatId: named ?? rotated(ctx, pool, ctx.night)!.id };
  }
  if (ctx.selfPersona === "follower") {
    return { action: "disconnect", targetSeatId: uniqueHeat(ctx, pool) ?? rotated(ctx, pool, 2 + ctx.night)!.id };
  }
  return { action: "disconnect", targetSeatId: rotated(ctx, pool, 4 + ctx.night)!.id };
}

function coverPick(ctx: ThinkContext): NightCommand {
  if (!ctx.selfPersona) return { action: "skip" };
  if (!ctx.coverReady && ctx.selfPersona !== "bluffer") return { action: "skip" };
  if (ctx.selfPersona === "hunter") {
    const pin = pinFirst(ctx, others(ctx));
    if (pin) return { action: "cover", targetSeatId: pin };
    const hot = hottest(ctx, others(ctx));
    if (hot && suspicion(ctx, hot.id) > 0) return { action: "cover", targetSeatId: hot.id };
    return { action: "cover", targetSeatId: ctx.selfId };
  }
  if (ctx.selfPersona === "observer") {
    const hot = hottest(ctx, others(ctx));
    if (hot && suspicion(ctx, hot.id) >= 2) return { action: "cover", targetSeatId: hot.id };
    return { action: "cover", targetSeatId: ctx.selfId };
  }
  if (ctx.selfPersona === "anchor") {
    const pin = others(ctx).find((seat) => ctx.pinSeatIds.includes(seat.id));
    if (pin) return { action: "cover", targetSeatId: pin.id };
    const hunch = sharedHunch(ctx, others(ctx));
    return { action: "cover", targetSeatId: hunch ?? ctx.selfId };
  }
  if (ctx.selfPersona === "accuser") {
    const hot = hottest(ctx, others(ctx));
    if (hot && suspicion(ctx, hot.id) > 0) return { action: "cover", targetSeatId: hot.id };
    return { action: "cover", targetSeatId: ctx.selfId };
  }
  if (ctx.selfPersona === "follower") {
    const guarded = lastProtect(ctx) ?? sharedHunch(ctx, others(ctx));
    return { action: "cover", targetSeatId: guarded ?? ctx.selfId };
  }
  const decoy = rotated(ctx, others(ctx), 3);
  return decoy ? { action: "cover", targetSeatId: decoy.id } : { action: "skip" };
}

function sweepPick(ctx: ThinkContext): NightCommand {
  const unknown = enemies(ctx).filter((seat) => ctx.sweeps[seat.id] == null);
  const pool = unknown.length > 0 ? unknown : enemies(ctx);
  if (pool.length === 0 || !ctx.selfPersona) return { action: "skip" };
  const shift = ctx.selfPersona === "bluffer" ? 3 : ctx.selfPersona === "observer" ? 2 : ctx.selfPersona === "anchor" ? 1 : 0;
  const heat = ctx.selfPersona === "follower" || ctx.selfPersona === "accuser" || ctx.selfPersona === "hunter" ? uniqueHeat(ctx, pool) : null;
  const id = heat ?? rotated(ctx, pool, shift + ctx.night)?.id;
  return id ? { action: "sweep", targetSeatId: id } : { action: "skip" };
}

function warrantNight(ctx: ThinkContext): NightCommand {
  if (!ctx.selfPersona) return { action: "skip" };
  const wantSeal =
    !ctx.sealUsed &&
    (ctx.selfPersona === "bluffer" || ctx.selfPersona === "hunter") &&
    ctx.night >= 2 &&
    (ctx.selfIndex + ctx.night) % 3 === 0;
  if (wantSeal) {
    const loud = loudest(ctx, enemies(ctx));
    if (loud) return { action: "seal", targetSeatId: loud.id };
  }
  const id = markTarget(ctx, unmarked(ctx));
  if (id) return { action: "mark", targetSeatId: id };
  return { action: "skip" };
}

function dayFake(ctx: ThinkContext): FakePlan | null {
  if (ctx.fakeCharges <= 0 || !ctx.selfPersona) return null;
  const persona = personaById(ctx.selfPersona);
  if (ctx.selfPersona === "anchor") return null;
  if (ctx.selfPersona === "observer" && ctx.round < 2) return null;
  if (ctx.selfPersona === "follower" && !(ctx.fakeCharges === 2 || (ctx.fakeCharges === 1 && ctx.round >= 3))) return null;
  if ((ctx.selfPersona === "hunter" || ctx.selfPersona === "accuser") && ctx.openPinIds[0]) {
    return { mode: "flag", pinId: ctx.openPinIds[0] };
  }
  return { mode: "plant", text: persona.plant };
}

function linkTarget(ctx: ThinkContext): string | null {
  const pool = enemies(ctx);
  if (!ctx.selfPersona || pool.length === 0) return null;
  if (ctx.selfPersona === "follower") return uniqueHeat(ctx, pool) ?? pool[0]?.id ?? null;
  if (ctx.selfPersona === "observer") return rotated(ctx, pool, 1)?.id ?? null;
  if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 2)?.id ?? null;
  if (ctx.selfPersona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
  return rotated(ctx, pool, ctx.selfPersona === "bluffer" ? 3 : 1)?.id ?? null;
}

function markTarget(ctx: ThinkContext, pool: SeatBrief[]): string | null {
  if (!ctx.selfPersona || pool.length === 0) return null;
  if (ctx.selfPersona === "bluffer") return coldest(ctx, pool).id;
  if (ctx.selfPersona === "follower") return campTarget(ctx, pool);
  if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, ctx.night)?.id ?? null;
  if (ctx.selfPersona === "observer") return rotated(ctx, pool, 2)?.id ?? null;
  if (ctx.selfPersona === "anchor") {
    const ranked = bySuspicion(ctx, pool);
    return (ranked[1] ?? ranked[0])?.id ?? null;
  }
  const hot = hottest(ctx, pool);
  if (hot && suspicion(ctx, hot.id) > 0) return hot.id;
  return rotated(ctx, pool)?.id ?? null;
}

function accuseTarget(ctx: ThinkContext): string | null {
  const pool = enemies(ctx);
  if (pool.length === 0) return null;
  const dirty = pool.find((seat) => ctx.sweeps[seat.id] === "dirty");
  if (dirty && ctx.selfPersona !== "bluffer") return dirty.id;
  if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 1)?.id ?? null;
  if (ctx.selfPersona === "bluffer") return rotated(ctx, pool, 3)?.id ?? null;
  return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
}

function protectTarget(ctx: ThinkContext): string | null {
  if (ctx.selfFaction === "silence" && ctx.selfPersona === "bluffer") {
    const mate = ctx.seats.find((seat) => seat.alive && ctx.teammates.includes(seat.id));
    if (mate) return mate.id;
  }
  const clean = enemies(ctx).find((seat) => ctx.sweeps[seat.id] === "clean");
  if (clean) return clean.id;
  const pool = others(ctx);
  return pool.length ? coldest(ctx, pool).id : null;
}

function finishTalk(ctx: ThinkContext, phrase: "疑" | "保", targetId: string | null): TalkDecision {
  if (!targetId) return { text: phrase, kind: "line", targetId: null };
  const nickname = ctx.seats.find((seat) => seat.id === targetId)?.nickname;
  if (!nickname) return { text: phrase, kind: "line", targetId: null };
  return { text: speakTalk(phrase, nickname), kind: phrase, targetId };
}

function campTarget(ctx: ThinkContext, pool: SeatBrief[]): string | null {
  return uniqueHeat(ctx, pool) ?? sharedHunch(ctx, pool);
}

/** Same living-seat cursor for every reader. Self and teammates are skipped, so two anchors usually name one seat. */
function sharedHunch(ctx: ThinkContext, pool: readonly SeatBrief[]): string | null {
  if (pool.length === 0) return null;
  const living = ctx.seats.filter((seat) => seat.alive).sort((a, b) => a.index - b.index);
  if (living.length === 0) return pool[0]?.id ?? null;
  const start = Math.abs(ctx.salt + ctx.round * 3) % living.length;
  for (let step = 0; step < living.length; step++) {
    const seat = living[(start + step) % living.length];
    if (seat && pool.some((item) => item.id === seat.id)) return seat.id;
  }
  return pool[0]?.id ?? null;
}

function enemies(ctx: ThinkContext): SeatBrief[] {
  return others(ctx).filter((seat) => !ctx.teammates.includes(seat.id));
}

function others(ctx: ThinkContext): SeatBrief[] {
  return ctx.seats.filter((seat) => seat.alive && seat.id !== ctx.selfId);
}

function unmarked(ctx: ThinkContext): SeatBrief[] {
  return enemies(ctx).filter((seat) => !ctx.marks.includes(seat.id));
}

function suspicion(ctx: ThinkContext, seatId: string): number {
  let score = 0;
  for (const note of ctx.accusations) {
    if (note.targetId !== seatId) continue;
    if (note.kind === "疑") score += note.round === ctx.round ? 2 : 1;
    else score -= 1;
  }
  if (ctx.sweeps[seatId] === "dirty") score += 6;
  if (ctx.sweeps[seatId] === "clean") score -= 5;
  if (ctx.linkedUsed[seatId] === true) score += 2;
  if (ctx.linkedUsed[seatId] === false) score -= 1;
  return score;
}

function bySuspicion(ctx: ThinkContext, pool: readonly SeatBrief[]): SeatBrief[] {
  return [...pool].sort((a, b) => suspicion(ctx, b.id) - suspicion(ctx, a.id) || a.index - b.index);
}

function hottest(ctx: ThinkContext, pool: readonly SeatBrief[]): SeatBrief | null {
  return bySuspicion(ctx, pool)[0] ?? null;
}

function uniqueHeat(ctx: ThinkContext, pool: readonly SeatBrief[]): string | null {
  const ranked = bySuspicion(ctx, pool);
  const top = ranked[0];
  if (!top) return null;
  const score = suspicion(ctx, top.id);
  if (score < 2) return null;
  const second = ranked[1];
  if (second && suspicion(ctx, second.id) === score) return null;
  return top.id;
}

function coldest(ctx: ThinkContext, pool: readonly SeatBrief[]): SeatBrief {
  const ranked = [...pool].sort((a, b) => suspicion(ctx, a.id) - suspicion(ctx, b.id) || a.index - b.index);
  const best = suspicion(ctx, ranked[0]!.id);
  const band = ranked.filter((seat) => suspicion(ctx, seat.id) === best);
  const offset = Math.abs(ctx.selfIndex + (ctx.salt % 5)) % band.length;
  return band[offset] ?? ranked[0]!;
}

function rotated(ctx: ThinkContext, pool: readonly SeatBrief[], shift = 0): SeatBrief | null {
  if (pool.length === 0) return null;
  const offset = Math.abs(ctx.selfIndex * 3 + ctx.round + shift + (ctx.salt % 7)) % pool.length;
  return pool[offset] ?? null;
}

function ownSuspect(ctx: ThinkContext, pool: readonly SeatBrief[]): string | null {
  const mine = ctx.accusations.filter((note) => note.fromId === ctx.selfId && note.kind === "疑");
  const latest = mine.length ? mine[mine.length - 1] : undefined;
  if (!latest) return null;
  return pool.some((seat) => seat.id === latest.targetId) ? latest.targetId : null;
}

function lastProtect(ctx: ThinkContext): string | null {
  const mine = ctx.accusations.filter((note) => note.fromId === ctx.selfId && note.kind === "保");
  const latest = mine.length ? mine[mine.length - 1] : undefined;
  if (!latest) return null;
  const seat = ctx.seats.find((item) => item.id === latest.targetId);
  return seat?.alive ? seat.id : null;
}

function pinFirst(ctx: ThinkContext, pool: readonly SeatBrief[]): string | null {
  return pool.find((seat) => ctx.pinSeatIds.includes(seat.id))?.id ?? null;
}

function loudest(ctx: ThinkContext, pool: readonly SeatBrief[]): SeatBrief | null {
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => accusationsFrom(ctx, b.id) - accusationsFrom(ctx, a.id) || b.index - a.index)[0] ?? null;
}

function accusationsFrom(ctx: ThinkContext, seatId: string): number {
  return ctx.accusations.filter((note) => note.fromId === seatId && note.kind === "疑").length;
}

function talk<T extends (typeof TALK_PHRASES)[number]>(phrase: T): T {
  return phrase;
}

function draft<T extends (typeof DRAFT_PHRASES)[number]>(phrase: T): T {
  return phrase;
}

function silence<T extends (typeof SILENCE_TEMPLATES)[number]>(phrase: T): T {
  return phrase;
}
