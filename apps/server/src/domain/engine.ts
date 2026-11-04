import { RULES } from "../config/rules.js";
import { AI_NICKNAMES, PHASE_TIPS, SILENCE_TEMPLATES } from "./phrases.js";
import {
  personaById,
  personaForSeat,
  duelPresserId,
  shouldSpeak,
  speakPriority,
  type Accusation,
  type PersonaId,
  type ThinkContext,
  dayPlan,
  draftLine,
  nightCommand,
  nightSide,
  silenceLine,
  talkDecision,
  voteTarget,
  wantsAnonymous,
} from "./persona.js";
import { FACTION_LABEL, PHASE_LABEL, ROLES, STANDARD_DEAL } from "./roles.js";
import type {
  Faction,
  NightActionName,
  NightCommand,
  Phase,
  PrivateSnapshot,
  PublicPin,
  PublicSnapshot,
  RoleId,
  SkillChoice,
  Step,
  StepError,
} from "./types.js";
import { uniqueLeader } from "./votes.js";

interface SeatState {
  id: string;
  playerId: string;
  nickname: string;
  isAi: boolean;
  alive: boolean;
  roleId: RoleId | null;
  ready: boolean;
  silenceMarks: string[];
  sealUsed: boolean;
  sealedOnRound: number | null;
  sweepFog: number;
  /** Night index on which cover may succeed again. Success on N sets this to N+2. */
  coverReadyNight: number;
  inbox: string[];
  remnants: Array<{ nickname: string; factionLabel: string; text: string }>;
  usedSkillThisRound: boolean;
  usedSkillLastRound: boolean;
  pinnedThisRound: boolean;
  linkedThisRound: boolean;
  fakeCharges: number;
  anonymousVoteUsed: boolean;
  reclaimToken: string | null;
  lobbyReady: boolean;
  /** Null on a live human. Assigned for AI fillers and again if AI takes the seat. */
  personaId: PersonaId | null;
  sweeps: Record<string, "clean" | "dirty">;
  linkedUsed: Record<string, boolean>;
  everPinned: boolean;
}

interface Ballot {
  target: string | null;
  anonymous: boolean;
}

const NIGHT_LABEL: Record<NightActionName, { label: string; needsTarget: boolean }> = {
  disconnect: { label: "帶走呢個人", needsTarget: true },
  cover: { label: "掩護呢個人", needsTarget: true },
  sweep: { label: "掃呢個人", needsTarget: true },
  mark: { label: "暗標呢個人", needsTarget: true },
  seal: { label: "封口，唔准講", needsTarget: true },
  skip: { label: "今夜唔用", needsTarget: false },
};

function ok(): Step {
  return { ok: true };
}

function fail(code: string, message: string): StepError {
  return { ok: false, code, message };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export interface EngineOptions {
  rng?: () => number;
  /**
   * When true, AI seats act from the phrase bank.
   * A unique human vote leader is still copied (rule C). With no human ballot,
   * each seat uses its own persona.
   */
  autoAi?: boolean;
  /**
   * Rotates which persona sits in which chair. Same salt + same seat index is stable.
   * Does not consume `rng`, so scripted deals stay put.
   */
  personaSalt?: number;
}

export interface AiSeatDebug {
  seatId: string;
  nickname: string;
  isAi: boolean;
  alive: boolean;
  roleId: RoleId | null;
  personaId: PersonaId | null;
  personaLabel: string | null;
}

export interface AiTraceEvent {
  round: number;
  night: number;
  phase: Phase;
  seatId: string;
  personaId: PersonaId | null;
  kind: "talk" | "draft" | "vote" | "night" | "silence" | "pin" | "link" | "fake" | "mark";
  detail: string;
}

/**
 * Authoritative standard-mode state machine.
 * Boot → DayTalk → Draft → Vote → Resolve → Night → Check → loop or end.
 */
export class GameEngine {
  private readonly rng: () => number;
  private readonly autoAi: boolean;
  private readonly personaSalt: number;
  private readonly seats: SeatState[] = [];
  private phase: Phase = "lobby";
  private round = 0;
  private nightNumber = 0;
  private banner = "私人房未開局。空位會由 AI 補上，徽章會一直顯示。";
  private log: Array<{ text: string }> = [];
  private successfulDisconnects = 0;
  private winner: PublicSnapshot["winner"] = null;
  private votes = new Map<string, Ballot>();
  private drafts = new Map<string, string>();
  private nightActions = new Map<string, NightCommand>();
  private chatCount = new Map<string, number>();
  private pins: PublicPin[] = [];
  private pinSeq = 0;
  private tokenSeq = 0;
  private silenceNotes: Array<{ seatId: string; nickname: string; text: string }> = [];
  private silenceSent = new Map<string, number>();
  private deadlineAt: number | null = null;
  private accusations: Accusation[] = [];
  private aiTrace: AiTraceEvent[] = [];

  constructor(opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.autoAi = opts.autoAi ?? false;
    const salt = opts.personaSalt ?? 0;
    this.personaSalt = Number.isFinite(salt) ? Math.trunc(salt) : 0;
  }

  getPhase(): Phase {
    return this.phase;
  }

  getRound(): number {
    return this.round;
  }

  getNight(): number {
    return this.nightNumber;
  }

  getDisconnects(): number {
    return this.successfulDisconnects;
  }

  /** Absolute time in ms when the current phase should advance. Null clears it. */
  setPhaseDeadline(at: number | null): void {
    this.deadlineAt = at;
  }

  addPlayer(playerId: string, nickname: string): Step & { seatId?: string } {
    if (this.phase !== "lobby") return fail("already_started", "局已開始，唔可以再入座。");
    if (this.seats.length >= RULES.seatCount) return fail("room_full", "席位已滿。");
    const name = cleanName(nickname);
    if (!name) return fail("nickname", "請填一個暱稱。");
    const seat = this.makeSeat(playerId, name, false);
    seat.reclaimToken = this.nextToken();
    this.seats.push(seat);
    return { ok: true, seatId: seat.id };
  }

  fillWithAi(): number {
    if (this.phase !== "lobby") return 0;
    let added = 0;
    while (this.seats.length < RULES.seatCount) {
      const index = this.seats.length;
      const nickname = AI_NICKNAMES[index % AI_NICKNAMES.length] ?? "AI";
      const playerId = `ai-${this.seats.length + 1}`;
      this.seats.push(this.makeSeat(playerId, nickname, true));
      added += 1;
    }
    return added;
  }

  /**
   * Deal roles and enter Boot. `deal` is seat-ordered and only for tests / the scripted demo.
   * Clients never receive the full deal.
   */
  setLobbyReady(playerId: string, ready: boolean): Step {
    if (this.phase !== "lobby") return fail("locked", "房間已鎖定，唔可以再改準備。");
    const seat = this.seats.find((item) => item.playerId === playerId);
    if (!seat) return fail("not_seated", "你未入座。");
    if (seat.isAi) return fail("not_your_skill", "AI 席唔使準備。");
    seat.lobbyReady = ready;
    return ok();
  }

  /**
   * Trial rooms show the dealt role before Boot. Live rooms stay hidden until start.
   * Public snapshots still omit every role id.
   */
  previewDeal(): void {
    if (this.phase !== "lobby") return;
    this.fillWithAi();
    if (this.seats.length !== RULES.seatCount) return;
    if (this.seats.every((seat) => seat.roleId)) return;
    const roles = shuffle(STANDARD_DEAL, this.rng);
    this.assertDeal(roles);
    this.assignRoles(roles);
  }

  /**
   * Host start. When `enforceLobbyReady` is set, every seated human must be ready.
   * Empty seats are filled with AI, then the room locks at Boot.
   */
  start(deal?: readonly RoleId[], opts?: { enforceLobbyReady?: boolean }): Step {
    if (this.phase !== "lobby") return fail("already_started", "局已開始。");
    if (opts?.enforceLobbyReady) {
      const humans = this.seats.filter((seat) => !seat.isAi);
      if (humans.length === 0 || humans.some((seat) => !seat.lobbyReady)) {
        return fail("not_ready", "未齊人準備好，未可以開局。");
      }
    }
    this.fillWithAi();
    if (this.seats.length !== RULES.seatCount) {
      return fail("need_seats", `要 ${RULES.seatCount} 席先可以開局。`);
    }
    const predealt = !deal && this.seats.every((seat) => seat.roleId);
    const roles = deal ? [...deal] : predealt ? this.seats.map((seat) => seat.roleId as RoleId) : shuffle(STANDARD_DEAL, this.rng);
    this.assertDeal(roles);
    if (!predealt) this.assignRoles(roles);
    this.phase = "boot";
    for (const seat of this.seats) seat.ready = false;
    this.banner = "身分已私下派發。公開組成：燈塔網 ×7、消音組 ×3、灰頻 ×1。";
    this.pushLog("標準 Mode 開局。公開組成：燈塔網 ×7、消音組 ×3、灰頻 ×1。你只會收到自己嘅身分。");
    this.markAiReady();
    return ok();
  }

  submitChat(playerId: string, text: string): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "day_talk") return fail("wrong_phase", "而家唔係燈亮討論。");
    if (this.isSealed(seat.seat)) return fail("sealed", "你被封口，呢回合只可以投票。");
    const body = text.trim().slice(0, 80);
    if (!body) return fail("empty", "講句短嘅先。");
    const used = this.chatCount.get(playerId) ?? 0;
    if (used >= 4) return fail("limit", "你今輪發言已夠，留返位置畀人。");
    this.chatCount.set(playerId, used + 1);
    this.pushLog(`${seat.seat.nickname}：${body}`);
    return ok();
  }

  submitDraft(playerId: string, text: string): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "draft") return fail("wrong_phase", "而家唔係私人草稿。");
    if (this.isSealed(seat.seat)) return fail("sealed", "你被封口，草稿都交唔到。");
    this.drafts.set(playerId, text.trim().slice(0, 80));
    return ok();
  }

  submitVote(playerId: string, targetSeatId: string | null, anonymous = false): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "vote") return fail("wrong_phase", "而家唔係投票。");
    if (anonymous) {
      if (seat.seat.roleId !== "plant") return fail("not_your_skill", "只有影燈可以投匿名票。");
      if (seat.seat.anonymousVoteUsed) return fail("anonymous_spent", "你本局匿名票已經用過。");
    }
    if (targetSeatId == null) {
      this.votes.set(playerId, { target: null, anonymous });
      if (this.autoAi) this.syncAiVotes();
      return ok();
    }
    const target = this.seatById(targetSeatId);
    if (!target || !target.alive) return fail("illegal_target", "票只可以投俾仍在場嘅人。");
    if (target.id === seat.seat.id) return fail("illegal_target", "唔可以投自己。");
    this.votes.set(playerId, { target: target.id, anonymous });
    if (this.autoAi) this.syncAiVotes();
    return ok();
  }

  /** 線報員：釘一條公開殘訊。每輪燈亮一次，唔佔發言格。 */
  submitPin(playerId: string, text: string): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "day_talk") return fail("wrong_phase", "釘選只可以喺燈亮做。");
    if (seat.seat.roleId !== "tip") return fail("not_your_skill", "只有線報可以釘選。");
    if (this.isSealed(seat.seat)) return fail("sealed", "你被封口，呢回合只可以投票。");
    if (seat.seat.pinnedThisRound) return fail("pin_spent", "你今輪已經釘過。");
    const body = text.trim().slice(0, 80);
    if (!body) return fail("empty", "釘選要有一句內容。");
    this.pinSeq += 1;
    this.pins.push({ id: `pin${this.pinSeq}`, text: body, unverified: false });
    seat.seat.pinnedThisRound = true;
    seat.seat.everPinned = true;
    this.markSkill(seat.seat);
    this.pushLog(`釘選｜${seat.seat.nickname}：${body}`);
    return ok();
  }

  /** 通聯官：私下得知目標上回合用過主動技能未。唔講係邊種。 */
  submitLink(playerId: string, targetSeatId: string): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "day_talk") return fail("wrong_phase", "核對通聯只可以喺燈亮做。");
    if (seat.seat.roleId !== "link") return fail("not_your_skill", "只有通聯可以核對。");
    if (this.isSealed(seat.seat)) return fail("sealed", "你被封口，呢回合只可以投票。");
    if (seat.seat.linkedThisRound) return fail("link_spent", "你今輪已經核對過。");
    const target = this.seatById(targetSeatId);
    if (!target || !target.alive) return fail("illegal_target", "目標要仍然在場。");
    if (target.id === seat.seat.id) return fail("illegal_target", "唔可以核對自己。");
    seat.seat.linkedThisRound = true;
    this.markSkill(seat.seat);
    seat.seat.linkedUsed[target.id] = target.usedSkillLastRound;
    const used = target.usedSkillLastRound ? "用過" : "未用過";
    seat.seat.inbox.push(`通聯：${target.nickname} 上回合${used}主動技能。`);
    return ok();
  }

  /**
   * 假訊員：每局兩次。flag 將已釘殘訊標做待核實；plant 放一句來源未核。
   * 燈亮同熄燈都可以用。公開唔會講係邊個放。
   */
  submitFake(playerId: string, input: { mode: "flag" | "plant"; pinId?: string; text?: string }): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "day_talk" && this.phase !== "night") return fail("wrong_phase", "假訊只可以喺燈亮或者熄燈放。");
    if (seat.seat.roleId !== "decoy") return fail("not_your_skill", "只有假訊可以放料。");
    if (this.phase === "day_talk" && this.isSealed(seat.seat)) return fail("sealed", "你被封口，呢回合只可以投票。");
    if (seat.seat.fakeCharges <= 0) return fail("quota", "你本局假訊額度已用完。");
    if (input.mode === "flag") {
      const pin = this.pins.find((item) => item.id === input.pinId);
      if (!pin) return fail("illegal_target", "要揀一條已經釘低嘅殘訊。");
      if (pin.unverified) return fail("already_flagged", "呢條已經係待核實。");
      pin.unverified = true;
      this.pushLog("一條釘選被標做待核實。");
    } else {
      const body = (input.text ?? "").trim().slice(0, 80);
      if (!body) return fail("empty", "假訊要有一句內容。");
      this.pushLog(`來源未核：${body}`);
    }
    seat.seat.fakeCharges -= 1;
    this.markSkill(seat.seat);
    seat.seat.inbox.push(`假訊已投放。剩餘 ${seat.seat.fakeCharges} 次。`);
    return ok();
  }

  /** In-game drop: the same seat becomes AI and keeps role plus private state. */
  takeoverAsAi(playerId: string): Step {
    const seat = this.seats.find((item) => item.playerId === playerId);
    if (!seat) return fail("not_seated", "你未入座。");
    if (this.phase === "lobby") return fail("not_started", "未開局。");
    if (seat.isAi) return ok();
    seat.isAi = true;
    if (!seat.personaId) seat.personaId = personaForSeat(this.seatIndex(seat), this.personaSalt).id;
    this.pushLog(`${seat.nickname} 斷線，AI 接管同一席。徽章保持。`);
    if (this.autoAi && seat.alive) {
      this.catchUpAi(seat);
      seat.ready = true;
    }
    return ok();
  }

  removeLobbyPlayer(playerId: string): void {
    if (this.phase !== "lobby") return;
    const index = this.seats.findIndex((seat) => seat.playerId === playerId);
    if (index >= 0) this.seats.splice(index, 1);
  }

  /** Mark or clear one private silence suspect. Does not reveal whether it is correct. */
  submitSuspect(playerId: string, targetSeatId: string, marked: boolean): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (seat.seat.roleId !== "warrant") return fail("not_your_skill", "只有孤證可以標記。");
    if (this.phase !== "day_talk" && this.phase !== "draft" && this.phase !== "night") {
      return fail("wrong_phase", "標記可以喺燈亮、草稿或者熄燈改。");
    }
    if (this.isSealed(seat.seat) && this.phase !== "night") return fail("sealed", "你被封口，呢回合只可以投票。");
    const target = this.seatById(targetSeatId);
    if (!target || !target.alive) return fail("illegal_target", "目標要仍然在場。");
    if (target.id === seat.seat.id) return fail("illegal_target", "唔可以標記自己。");
    const has = seat.seat.silenceMarks.includes(target.id);
    if (marked && !has) {
      seat.seat.silenceMarks.push(target.id);
      this.markSkill(seat.seat);
      seat.seat.inbox.push(`已標記 ${target.nickname}。標記只得你知。`);
    } else if (!marked && has) {
      seat.seat.silenceMarks = seat.seat.silenceMarks.filter((id) => id !== target.id);
      this.markSkill(seat.seat);
      seat.seat.inbox.push(`已取消標記 ${target.nickname}。`);
    }
    return ok();
  }

  /**
   * Original human returns. Only the token issued for that seat works.
   * Lobby drops delete the seat, so there is nothing to reclaim.
   */
  reclaim(newPlayerId: string, token: string): Step {
    if (!token) return fail("token_unknown", "搵唔到你原本嘅席。");
    const seat = this.seats.find((item) => item.reclaimToken === token);
    if (!seat) return fail("token_unknown", "搵唔到你原本嘅席。");
    if (!seat.isAi) return fail("not_taken", "呢席未交俾 AI。");
    if (this.seats.some((item) => item.playerId === newPlayerId)) return fail("already_in_room", "你已經喺一間房。");
    const oldId = seat.playerId;
    this.rekey(oldId, newPlayerId);
    seat.isAi = false;
    seat.ready = false;
    this.pushLog(`${seat.nickname} 重新入座，AI 交還控制。`);
    return ok();
  }

  submitNight(playerId: string, command: NightCommand): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "night") return fail("wrong_phase", "而家唔係熄燈行動。");
    const allowed = this.actionsFor(seat.seat);
    if (!allowed.some((item) => item.action === command.action)) {
      return fail("not_your_skill", "你今夜冇呢個行動。");
    }
    if (command.action === "skip") {
      this.nightActions.set(playerId, { action: "skip" });
      return ok();
    }
    if (command.action === "seal" && seat.seat.sealUsed) {
      return fail("seal_spent", "你本局封口已經用過。");
    }
    const targetId = command.targetSeatId;
    if (!targetId) return fail("illegal_target", "請揀一個目標。");
    const target = this.seatById(targetId);
    if (!target || !target.alive) return fail("illegal_target", "目標要仍然在場。");
    if (target.id === seat.seat.id && command.action !== "cover") {
      return fail("illegal_target", "呢個行動唔可以揀自己。");
    }
    this.nightActions.set(playerId, { action: command.action, targetSeatId: target.id });
    return ok();
  }

  /** 消音組夜訊。必須係模板原句，而且唔會寫入公開頻道。 */
  submitSilence(playerId: string, text: string): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "night") return fail("wrong_phase", "夜訊只可以喺熄燈送。");
    if (this.factionOf(seat.seat) !== "silence") return fail("not_your_skill", "只有消音組可以入夜訊。");
    const body = text.trim();
    if (!SILENCE_TEMPLATES.includes(body as (typeof SILENCE_TEMPLATES)[number])) {
      return fail("template_only", "夜訊只可以用模板短句。");
    }
    const sent = this.silenceSent.get(playerId) ?? 0;
    if (sent >= 2) return fail("limit", "你今夜夜訊已夠。");
    this.silenceSent.set(playerId, sent + 1);
    this.silenceNotes.push({ seatId: seat.seat.id, nickname: seat.seat.nickname, text: body });
    return ok();
  }

  setReady(playerId: string): Step {
    const seat = this.seats.find((item) => item.playerId === playerId);
    if (!seat) return fail("not_seated", "你未入座。");
    if (!seat.alive) return fail("dead", "你已離場。");
    const actionable: Phase[] = ["boot", "day_talk", "draft", "vote", "night"];
    if (!actionable.includes(this.phase)) return fail("wrong_phase", "呢個階段唔使準備。");
    seat.ready = true;
    return ok();
  }

  /** True when every living human has readied. An all-AI table does not auto-fire. */
  everyoneReady(): boolean {
    const humans = this.seats.filter((seat) => seat.alive && !seat.isAi);
    if (humans.length === 0) return false;
    return humans.every((seat) => seat.ready);
  }

  /**
   * Apply timeout defaults for anyone who has not acted, then move one phase.
   * Tie votes isolate nobody. Night with no order skips.
   */
  advance(): void {
    switch (this.phase) {
      case "lobby":
        throw new Error("game has not started");
      case "ended":
        return;
      case "boot":
        this.beginDay(1);
        return;
      case "day_talk":
        this.beginPhase("draft");
        this.aiDraft();
        return;
      case "draft":
        this.fillMissingDrafts();
        this.publishDrafts();
        this.beginPhase("vote");
        this.syncAiVotes();
        return;
      case "vote":
        this.fillMissingVotes();
        this.syncAiVotes(true);
        this.resolveVotes();
        this.beginPhase("resolve");
        return;
      case "resolve":
        this.nightNumber += 1;
        this.silenceSent.clear();
        this.beginPhase("night");
        this.aiNight();
        return;
      case "night":
        this.fillMissingNights();
        this.resolveNight();
        this.beginPhase("check");
        this.evaluate();
        return;
      case "check":
        if (this.winner) {
          this.beginPhase("ended");
          this.banner = this.winner.reason;
          return;
        }
        this.beginDay(this.round + 1);
        return;
      default:
        return;
    }
  }

  publicView(): PublicSnapshot {
    return {
      mode: "standard",
      phase: this.phase,
      phaseLabel: PHASE_LABEL[this.phase] ?? this.phase,
      round: this.round,
      night: this.nightNumber,
      banner: this.banner,
      composition: { ...RULES.composition },
      seats: this.seats.map((seat) => ({
        id: seat.id,
        nickname: seat.nickname,
        isAi: seat.isAi,
        alive: seat.alive,
        sealed: this.isSealed(seat),
        lobbyReady: seat.lobbyReady,
      })),
      log: this.log.map((entry) => ({ text: entry.text })),
      pins: this.pins.map((pin) => ({ ...pin })),
      disconnects: this.successfulDisconnects,
      disconnectsToWin: RULES.silenceWin.successfulDisconnects,
      winner: this.winner ? { ...this.winner } : null,
      hostSeatId: this.seats[0]?.id ?? null,
      locked: this.phase !== "lobby",
      secondsLeft: this.secondsLeft(),
      reveal: this.phase === "ended" ? this.revealSeats() : null,
    };
  }

  /** Packet for this player only. Other hidden roles are not included. */
  privateView(playerId: string): PrivateSnapshot {
    const seat = this.seats.find((item) => item.playerId === playerId) ?? null;
    const role = seat?.roleId ? ROLES[seat.roleId] : null;
    return {
      playerId,
      seatId: seat?.id ?? null,
      isHost: seat != null && seat.id === this.seats[0]?.id,
      alive: seat?.alive ?? false,
      canSpeak: seat != null && seat.alive && !this.isSealed(seat) && (this.phase === "day_talk" || this.phase === "draft"),
      canVote: seat != null && seat.alive && this.phase === "vote",
      ready: seat == null ? false : this.phase === "lobby" ? seat.lobbyReady : seat.ready,
      role: role
        ? {
            id: role.id,
            name: role.name,
            faction: role.faction,
            factionLabel: FACTION_LABEL[role.faction],
            skill: role.skill,
            mnemonic: role.mnemonic,
            when: role.when,
          }
        : null,
      teammates: seat ? this.teammatesFor(seat) : [],
      inbox: seat ? [...seat.inbox] : [],
      nightActions: seat && this.phase === "night" && seat.alive ? this.actionsFor(seat) : [],
      skillActions: seat ? this.skillActionsFor(seat) : [],
      anonymousVote: seat != null && seat.alive && seat.roleId === "plant" && !seat.anonymousVoteUsed && this.phase === "vote",
      fakeCharges: seat?.fakeCharges ?? 0,
      muted: seat != null && this.isSealed(seat),
      sealCard: seat != null && this.isSealed(seat)
        ? "封口卡：你呢回合只可以投票。唔可以發言、交草稿，或者用白天技能。"
        : null,
      reclaimToken: seat?.reclaimToken ?? null,
      votedSeatId: seat ? (this.votes.get(playerId)?.target ?? null) : null,
      draft: seat ? (this.drafts.get(playerId) ?? null) : null,
      marks: seat ? [...seat.silenceMarks] : [],
      silenceChannel: seat && this.factionOf(seat) === "silence" ? this.silenceNotes.map((note) => ({ ...note })) : [],
      tips: seat ? this.tipsFor(seat) : [],
      secondsLeft: this.secondsLeft(),
      remnants: seat?.roleId === "echo" ? seat.remnants.map((item) => ({ ...item })) : [],
    };
  }

  /**
   * Seat personas and the decision trace. For sims and debugging.
   * Not part of the player snapshot, so the HUD stays clear of persona labels.
   */
  debugAi(): { salt: number; seats: AiSeatDebug[]; trace: AiTraceEvent[] } {
    return {
      salt: this.personaSalt,
      seats: this.seats.map((seat) => ({
        seatId: seat.id,
        nickname: seat.nickname,
        isAi: seat.isAi,
        alive: seat.alive,
        roleId: seat.roleId,
        personaId: seat.personaId,
        personaLabel: seat.personaId ? personaById(seat.personaId).label : null,
      })),
      trace: this.aiTrace.map((event) => ({ ...event })),
    };
  }

  private makeSeat(playerId: string, nickname: string, isAi: boolean): SeatState {
    return {
      id: `s${this.seats.length + 1}`,
      playerId,
      nickname,
      isAi,
      alive: true,
      roleId: null,
      ready: false,
      silenceMarks: [],
      sealUsed: false,
      sealedOnRound: null,
      sweepFog: 0,
      coverReadyNight: 1,
      inbox: [],
      remnants: [],
      usedSkillThisRound: false,
      usedSkillLastRound: false,
      pinnedThisRound: false,
      linkedThisRound: false,
      fakeCharges: 0,
      anonymousVoteUsed: false,
      reclaimToken: null,
      lobbyReady: false,
      personaId: isAi ? personaForSeat(this.seats.length, this.personaSalt).id : null,
      sweeps: {},
      linkedUsed: {},
      everPinned: false,
    };
  }

  private nextToken(): string {
    this.tokenSeq += 1;
    const mix = Math.floor(this.rng() * 0x100000000)
      .toString(16)
      .padStart(8, "0");
    return `qz${this.tokenSeq.toString(16)}${mix}`;
  }

  private rekey(oldId: string, newId: string): void {
    const seat = this.seats.find((item) => item.playerId === oldId);
    if (!seat) return;
    seat.playerId = newId;
    this.moveKey(this.votes, oldId, newId);
    this.moveKey(this.drafts, oldId, newId);
    this.moveKey(this.nightActions, oldId, newId);
    this.moveKey(this.chatCount, oldId, newId);
  }

  private moveKey<T>(map: Map<string, T>, oldId: string, newId: string): void {
    if (!map.has(oldId)) return;
    map.set(newId, map.get(oldId) as T);
    map.delete(oldId);
  }

  private assignRoles(roles: readonly RoleId[]): void {
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i]!;
      const roleId = roles[i]!;
      seat.roleId = roleId;
      seat.sweepFog = roleId === "plant" ? 1 : 0;
      seat.fakeCharges = roleId === "decoy" ? RULES.skills.fakePerGame : 0;
    }
  }

  private assertDeal(roles: RoleId[]): void {
    if (roles.length !== RULES.seatCount) throw new Error("deal length");
    const counts: Record<Faction, number> = { lighthouse: 0, silence: 0, grey: 0 };
    for (const roleId of roles) {
      const role = ROLES[roleId];
      if (!role) throw new Error(`unknown role ${roleId}`);
      counts[role.faction] += 1;
    }
    if (
      counts.lighthouse !== RULES.composition.lighthouse ||
      counts.silence !== RULES.composition.silence ||
      counts.grey !== RULES.composition.grey
    ) {
      throw new Error("deal composition");
    }
  }

  private beginDay(round: number): void {
    for (const seat of this.seats) {
      seat.usedSkillLastRound = seat.usedSkillThisRound;
      seat.usedSkillThisRound = false;
      seat.pinnedThisRound = false;
      seat.linkedThisRound = false;
    }
    this.round = round;
    this.beginPhase("day_talk");
    this.banner = `第 ${round} 輪燈亮。用短句就得，模板都可以。`;
    const sealed = this.seats.filter((seat) => seat.alive && this.isSealed(seat));
    for (const seat of sealed) {
      this.pushLog(`封口生效：${seat.nickname} 呢回合只可以投票，唔可以發言。`);
    }
    this.aiTalk();
    this.aiDaySkills();
  }

  private beginPhase(phase: Phase): void {
    this.phase = phase;
    this.chatCount.clear();
    for (const seat of this.seats) seat.ready = false;
    this.markAiReady();
  }

  private markAiReady(): void {
    if (!this.autoAi) return;
    for (const seat of this.seats) {
      if (seat.isAi && seat.alive) seat.ready = true;
    }
  }

  private aiTalk(): void {
    if (!this.autoAi) return;
    for (const seat of this.selectSpeakers()) this.speakAs(seat);
  }

  /** A few AI lines per phase so the public log stays readable. Quiet personas keep one slot. */
  private selectSpeakers(): SeatState[] {
    const pool = this.seats.filter((seat) => seat.isAi && seat.alive && seat.personaId && !this.isSealed(seat));
    const ranked = pool
      .filter((seat) => shouldSpeak(seat.personaId!, this.round, this.seatIndex(seat), this.personaSalt))
      .sort((a, b) => speakPriority(b.personaId!) - speakPriority(a.personaId!) || this.seatIndex(a) - this.seatIndex(b));
    const loud = ranked.filter((seat) => speakPriority(seat.personaId!) >= 2);
    const quiet = ranked.filter((seat) => speakPriority(seat.personaId!) <= 1);
    const picked: SeatState[] = [];
    if (loud[0]) picked.push(loud[0]);
    if (quiet[0]) picked.push(quiet[0]);
    for (const seat of loud.slice(1)) {
      if (picked.length >= 4) break;
      picked.push(seat);
    }
    if (picked.length === 0 && pool[0]) {
      const fallback = [...pool].sort(
        (a, b) => speakPriority(b.personaId!) - speakPriority(a.personaId!) || this.seatIndex(a) - this.seatIndex(b),
      );
      if (fallback[0]) picked.push(fallback[0]);
    }
    return picked;
  }

  private speakAs(seat: SeatState): void {
    if (!seat.personaId || this.isSealed(seat)) return;
    const decision = talkDecision(this.think(seat));
    const step = this.submitChat(seat.playerId, decision.text);
    if (!step.ok) return;
    if (decision.targetId && (decision.kind === "疑" || decision.kind === "保")) {
      this.accusations.push({ fromId: seat.id, targetId: decision.targetId, kind: decision.kind, round: this.round });
    }
    this.pushTrace(seat, "talk", decision.text);
  }

  private aiDraft(): void {
    if (!this.autoAi) return;
    let sent = 0;
    for (const seat of this.seats) {
      if (sent >= 8) break;
      if (!seat.isAi || !seat.alive || this.isSealed(seat) || !seat.personaId) continue;
      const line = draftLine(this.think(seat));
      if (!line) continue;
      const step = this.submitDraft(seat.playerId, line);
      if (!step.ok) continue;
      sent += 1;
      this.pushTrace(seat, "draft", line);
    }
  }

  private aiDaySkills(): void {
    if (!this.autoAi) return;
    for (const seat of this.seats) {
      if (!seat.isAi || !seat.alive || !seat.roleId || this.isSealed(seat)) continue;
      this.applyDayPlan(seat);
    }
  }

  private applyDayPlan(seat: SeatState): void {
    if (!seat.personaId || !seat.alive) return;
    const plan = dayPlan(this.think(seat));
    if (plan.pin && seat.roleId === "tip" && !seat.pinnedThisRound) {
      const step = this.submitPin(seat.playerId, plan.pin);
      if (step.ok) this.pushTrace(seat, "pin", plan.pin);
    }
    if (plan.linkId && seat.roleId === "link" && !seat.linkedThisRound) {
      const step = this.submitLink(seat.playerId, plan.linkId);
      if (step.ok) this.pushTrace(seat, "link", plan.linkId);
    }
    if (plan.fake && seat.roleId === "decoy" && seat.fakeCharges > 0) {
      const step = this.submitFake(seat.playerId, plan.fake);
      if (step.ok) this.pushTrace(seat, "fake", plan.fake.mode);
    }
    if (plan.markId && seat.roleId === "warrant") {
      const step = this.submitSuspect(seat.playerId, plan.markId, true);
      if (step.ok) this.pushTrace(seat, "mark", plan.markId);
    }
  }

  private catchUpAi(seat: SeatState): void {
    if (!seat.personaId) seat.personaId = personaForSeat(this.seatIndex(seat), this.personaSalt).id;
    if (this.phase === "day_talk") {
      if (!this.isSealed(seat) && !(this.chatCount.get(seat.playerId) ?? 0)) this.speakAs(seat);
      if (!this.isSealed(seat)) this.applyDayPlan(seat);
    } else if (this.phase === "draft" && !this.drafts.has(seat.playerId) && !this.isSealed(seat)) {
      const line = draftLine(this.think(seat));
      if (line) this.submitDraft(seat.playerId, line);
    } else if (this.phase === "vote" && !this.votes.has(seat.playerId)) {
      this.syncAiVotes();
    } else if (this.phase === "night") {
      this.actNight(seat);
    }
  }

  private aiNight(): void {
    if (!this.autoAi) return;
    for (const seat of this.seats) {
      if (!seat.isAi || !seat.alive || !seat.roleId) continue;
      this.actNight(seat);
    }
  }

  private actNight(seat: SeatState): void {
    if (!this.nightActions.has(seat.playerId)) {
      const command = nightCommand(this.think(seat));
      if (command) {
        const step = this.submitNight(seat.playerId, command);
        if (step.ok) this.pushTrace(seat, "night", `${command.action}:${command.targetSeatId ?? "none"}`);
      }
    }
    const side = nightSide(this.think(seat));
    if (side && seat.roleId === "decoy" && seat.fakeCharges > 0) {
      const step = this.submitFake(seat.playerId, side);
      if (step.ok) this.pushTrace(seat, "fake", `night-${side.mode}`);
    }
    this.postAiSilence(seat);
  }

  private postAiSilence(seat: SeatState): void {
    if (!this.autoAi || this.phase !== "night") return;
    if (!seat.isAi || !seat.alive || this.factionOf(seat) !== "silence") return;
    if ((this.silenceSent.get(seat.playerId) ?? 0) >= 1) return;
    const line = silenceLine(this.think(seat));
    const step = this.submitSilence(seat.playerId, line);
    if (step.ok) this.pushTrace(seat, "silence", line);
  }

  /**
   * Rule C: once any living human has balloted, AI copy that unique leader.
   * A split or an all-abstain human table stays a tie — personas must not break it.
   * With no human ballot (an all-AI table), each seat votes in its own style.
   */
  private syncAiVotes(record = false): void {
    if (!this.autoAi || this.phase !== "vote") return;
    const humanTargets: Array<string | null> = [];
    for (const seat of this.seats) {
      if (seat.isAi || !seat.alive) continue;
      if (!this.votes.has(seat.playerId)) continue;
      humanTargets.push(this.votes.get(seat.playerId)?.target ?? null);
    }
    const followMajority = humanTargets.length > 0;
    const leader = uniqueLeader(humanTargets);
    const living = this.seats.filter((seat) => seat.alive);
    const duelPresser = followMajority
      ? null
      : duelPresserId(living.map((seat) => ({ id: seat.id, index: this.seatIndex(seat), personaId: seat.personaId })));
    for (const seat of this.seats) {
      if (!seat.isAi || !seat.alive) continue;
      let target: string | null;
      let via: string;
      if (followMajority) {
        target = leader == null || leader === seat.id ? null : leader;
        via = leader == null ? "split" : "follow";
      } else if (duelPresser) {
        const other = living.find((item) => item.id !== seat.id);
        target = seat.id === duelPresser ? (other?.id ?? null) : null;
        via = seat.id === duelPresser ? "duel" : "duel-hold";
      } else {
        target = seat.personaId ? voteTarget(this.think(seat)) : null;
        if (target === seat.id) target = null;
        if (target) {
          const picked = this.seatById(target);
          if (!picked || !picked.alive) target = null;
          else if (this.factionOf(seat) === "silence" && this.factionOf(picked) === "silence") target = null;
        }
        via = "persona";
      }
      const anonymous =
        seat.roleId === "plant" &&
        !seat.anonymousVoteUsed &&
        target != null &&
        (followMajority || wantsAnonymous(seat.personaId ?? "follower"));
      this.votes.set(seat.playerId, { target, anonymous });
      if (record) this.pushTrace(seat, "vote", `${via}:${target ?? "abstain"}`);
    }
  }

  private think(seat: SeatState): ThinkContext {
    return {
      selfId: seat.id,
      selfIndex: this.seatIndex(seat),
      selfRole: seat.roleId,
      selfFaction: this.factionOf(seat),
      selfPersona: seat.personaId,
      seats: this.seats.map((item, index) => ({
        id: item.id,
        index,
        nickname: item.nickname,
        alive: item.alive,
      })),
      round: this.round,
      night: this.nightNumber,
      salt: this.personaSalt,
      phase: this.phase,
      accusations: this.accusations,
      pinSeatIds: this.seats.filter((item) => item.everPinned).map((item) => item.id),
      sweeps: seat.sweeps,
      linkedUsed: seat.linkedUsed,
      teammates: this.teammatesFor(seat).map((item) => item.seatId),
      marks: seat.silenceMarks,
      coverReady: this.nightNumber >= seat.coverReadyNight,
      sealUsed: seat.sealUsed,
      fakeCharges: seat.fakeCharges,
      openPinIds: this.pins.filter((pin) => !pin.unverified).map((pin) => pin.id),
    };
  }

  private pushTrace(seat: SeatState, kind: AiTraceEvent["kind"], detail: string): void {
    this.aiTrace.push({
      round: this.round,
      night: this.nightNumber,
      phase: this.phase,
      seatId: seat.id,
      personaId: seat.personaId,
      kind,
      detail,
    });
    if (this.aiTrace.length > 500) this.aiTrace.shift();
  }

  private fillMissingDrafts(): void {
    for (const seat of this.seats) {
      if (!seat.alive || this.isSealed(seat)) continue;
      if (!this.drafts.has(seat.playerId)) this.drafts.set(seat.playerId, "");
    }
  }

  private publishDrafts(): void {
    for (const seat of this.seats) {
      if (!seat.alive || this.isSealed(seat)) continue;
      const text = this.drafts.get(seat.playerId) ?? "";
      if (!text) continue;
      this.pushLog(`草稿｜${seat.nickname}：${text}`);
    }
    this.drafts.clear();
  }

  private fillMissingVotes(): void {
    for (const seat of this.seats) {
      if (!seat.alive) continue;
      if (!this.votes.has(seat.playerId)) this.votes.set(seat.playerId, { target: null, anonymous: false });
    }
  }

  private resolveVotes(): void {
    const ballots: Array<string | null> = [];
    const attributed: string[] = [];
    for (const seat of this.seats) {
      if (!seat.alive) continue;
      const ballot = this.votes.get(seat.playerId) ?? { target: null, anonymous: false };
      ballots.push(ballot.target);
      let name = seat.nickname;
      if (ballot.anonymous && seat.roleId === "plant" && !seat.anonymousVoteUsed) {
        seat.anonymousVoteUsed = true;
        this.markSkill(seat);
        name = "匿名";
      }
      attributed.push(`${name} → ${ballot.target ?? "棄權"}`);
    }
    if (attributed.length > 0) this.pushLog(`票簿：${attributed.join("、")}`);
    const leader = uniqueLeader(ballots);
    this.votes.clear();
    if (!leader) {
      this.banner = "流局，無人被隔離。";
      this.pushLog("投票流局，無人被隔離。");
      return;
    }
    const target = this.seatById(leader);
    if (!target) return;
    target.alive = false;
    this.banner = `${target.nickname} 被隔離移出。陣營未公開。`;
    this.pushLog(`${target.nickname} 被隔離移出。`);
    this.deliverEcho(target);
  }

  private deliverEcho(isolated: SeatState): void {
    const echo = this.seats.find((seat) => seat.alive && seat.roleId === "echo");
    if (!echo || !isolated.roleId) return;
    const faction = ROLES[isolated.roleId].faction;
    const text = `回波殘片：${isolated.nickname} 屬於${FACTION_LABEL[faction]}。公開頻道唔會披露陣營。`;
    echo.inbox.push(text);
    echo.remnants.push({ nickname: isolated.nickname, factionLabel: FACTION_LABEL[faction], text });
  }

  private fillMissingNights(): void {
    for (const seat of this.seats) {
      if (!seat.alive) continue;
      if (this.actionsFor(seat).length === 0) continue;
      if (!this.nightActions.has(seat.playerId)) {
        this.nightActions.set(seat.playerId, { action: "skip" });
      }
    }
  }

  private resolveNight(): void {
    const shields = new Set<string>();
    for (const seat of this.seats) {
      if (!seat.alive || seat.roleId !== "cover") continue;
      const command = this.nightActions.get(seat.playerId);
      if (!command || command.action !== "cover" || !command.targetSeatId) continue;
      this.markSkill(seat);
      if (this.nightNumber < seat.coverReadyNight) {
        seat.inbox.push("掩護冷卻中，今次唔會成功。");
        continue;
      }
      const target = this.seatById(command.targetSeatId);
      if (!target || !target.alive) continue;
      shields.add(target.id);
      seat.coverReadyNight = this.nightNumber + RULES.cover.blockedFollowingTurns + 1;
      seat.inbox.push(`掩護成功：${target.nickname} 今夜免疫失聯。下一夜唔可以再成功。`);
    }

    let disconnected = false;
    for (const seat of this.seats) {
      if (!seat.alive || seat.roleId !== "silencer") continue;
      const command = this.nightActions.get(seat.playerId);
      if (!command || command.action !== "disconnect" || !command.targetSeatId) continue;
      this.markSkill(seat);
      const target = this.seatById(command.targetSeatId);
      if (!target || !target.alive) continue;
      if (shields.has(target.id)) {
        seat.inbox.push(`失聯未生效：${target.nickname} 可能被掩護。`);
        continue;
      }
      target.alive = false;
      this.successfulDisconnects += 1;
      disconnected = true;
      this.pushLog(`${target.nickname} 失聯，移出本局。`);
      seat.inbox.push(`失聯成功：${target.nickname} 已移出。`);
    }
    if (!disconnected) this.pushLog("熄燈結束，今夜無人失聯。");

    for (const seat of this.seats) {
      if (!seat.alive || seat.roleId !== "sweep") continue;
      const command = this.nightActions.get(seat.playerId);
      if (!command || command.action !== "sweep" || !command.targetSeatId) continue;
      this.markSkill(seat);
      const target = this.seatById(command.targetSeatId);
      if (!target || !target.roleId) continue;
      const silence = ROLES[target.roleId].faction === "silence";
      let clean = !silence;
      if (silence && target.sweepFog > 0) {
        target.sweepFog -= 1;
        clean = true;
      }
      seat.sweeps[target.id] = clean ? "clean" : "dirty";
      seat.inbox.push(clean ? `掃頻：${target.nickname} 訊號乾淨。` : `掃頻：${target.nickname} 有消音痕跡。`);
    }

    for (const seat of this.seats) {
      if (!seat.alive || seat.roleId !== "warrant") continue;
      const command = this.nightActions.get(seat.playerId);
      if (!command || command.action === "skip") continue;
      this.markSkill(seat);
      if (command.action === "mark" && command.targetSeatId) {
        if (!seat.silenceMarks.includes(command.targetSeatId)) seat.silenceMarks.push(command.targetSeatId);
        const target = this.seatById(command.targetSeatId);
        seat.inbox.push(`已標記 ${target?.nickname ?? command.targetSeatId}。標記只得你知。`);
      }
      if (command.action === "seal" && command.targetSeatId && !seat.sealUsed) {
        const target = this.seatById(command.targetSeatId);
        if (!target || !target.alive) continue;
        seat.sealUsed = true;
        target.sealedOnRound = this.round + 1;
        seat.inbox.push(`你封咗 ${target.nickname}。下一輪燈亮佢只可以投票。`);
        this.pushLog(`封口卡：${target.nickname} 下一輪只可以投票，唔可以發言。`);
      }
    }

    this.nightActions.clear();
    this.banner = `第 ${this.nightNumber} 夜結束。失聯進度 ${this.successfulDisconnects}／${RULES.silenceWin.successfulDisconnects}。`;
  }

  /**
   * Grey first, even if silence is still alive.
   * Then silence on 3 successful disconnects (or no lighthouse left).
   * Then lighthouse when no silence remains.
   */
  private evaluate(): void {
    const warrant = this.seats.find((seat) => seat.alive && seat.roleId === "warrant");
    if (warrant && this.correctSilenceMarks(warrant) >= RULES.greyWin.minCorrectSilenceMarks) {
      this.winner = {
        faction: "grey",
        factionLabel: FACTION_LABEL.grey,
        reason: "灰頻獨贏：孤證仍然在場，正確消音標記達 2。",
        kind: "grey_marks",
      };
      this.banner = this.winner.reason;
      this.pushLog(this.winner.reason);
      return;
    }
    const silenceAlive = this.seats.some((seat) => seat.alive && this.factionOf(seat) === "silence");
    const lighthouseAlive = this.seats.some((seat) => seat.alive && this.factionOf(seat) === "lighthouse");
    if (this.successfulDisconnects >= RULES.silenceWin.successfulDisconnects || !lighthouseAlive) {
      this.winner = {
        faction: "silence",
        factionLabel: FACTION_LABEL.silence,
        reason: this.successfulDisconnects >= RULES.silenceWin.successfulDisconnects
          ? "消音組達標：成功失聯 3 次。"
          : "消音組勝：燈塔網已無法投票。",
        kind: "silence_disconnects",
      };
      this.banner = this.winner.reason;
      this.pushLog(this.winner.reason);
      return;
    }
    if (!silenceAlive) {
      this.winner = {
        faction: "lighthouse",
        factionLabel: FACTION_LABEL.lighthouse,
        reason: "燈塔網解封：消音組已全部離場。",
        kind: "lighthouse_clear",
      };
      this.banner = this.winner.reason;
      this.pushLog(this.winner.reason);
      return;
    }
    this.banner = "未分勝負。灰頻未達標，失聯亦未夠數。";
    this.pushLog("勝負檢定：未終局，進入下一輪燈亮。");
  }

  private correctSilenceMarks(seat: SeatState): number {
    let count = 0;
    for (const id of seat.silenceMarks) {
      const target = this.seatById(id);
      if (target && this.factionOf(target) === "silence") count += 1;
    }
    return count;
  }

  private secondsLeft(): number | null {
    if (this.deadlineAt == null) return null;
    return Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000));
  }

  private revealSeats(): PublicSnapshot["reveal"] {
    return this.seats.map((seat) => {
      const role = seat.roleId ? ROLES[seat.roleId] : null;
      return {
        seatId: seat.id,
        nickname: seat.nickname,
        alive: seat.alive,
        roleId: role?.id ?? "civilian",
        roleName: role?.name ?? "",
        faction: role?.faction ?? "lighthouse",
        factionLabel: role ? FACTION_LABEL[role.faction] : "",
      };
    });
  }

  private tipsFor(seat: SeatState): Array<{ id: string; text: string }> {
    const tips: Array<{ id: string; text: string }> = [];
    if (this.phase === "day_talk") tips.push({ ...PHASE_TIPS.day_talk });
    if (this.phase === "vote") tips.push({ ...PHASE_TIPS.vote });
    if (this.phase === "night") tips.push({ ...PHASE_TIPS.night });
    if (seat.roleId === "warrant" && (this.phase === "day_talk" || this.phase === "draft" || this.phase === "night")) {
      tips.push({ ...PHASE_TIPS.grey_marks });
    }
    return tips;
  }

  private markSkill(seat: SeatState): void {
    seat.usedSkillThisRound = true;
  }

  private skillActionsFor(seat: SeatState): SkillChoice[] {
    if (!seat.alive || !seat.roleId) return [];
    const dayMute = this.isSealed(seat) && this.phase !== "night";
    if (dayMute) return [];
    const actions: SkillChoice[] = [];
    const markWindow = this.phase === "day_talk" || this.phase === "draft" || this.phase === "night";
    if (markWindow && seat.roleId === "warrant") {
      actions.push({ action: "mark", label: "暗標呢個人", needsTarget: true, needsText: false });
    }
    if (this.phase === "day_talk" && seat.roleId === "tip" && !seat.pinnedThisRound) {
      actions.push({ action: "pin", label: "釘一句線報", needsTarget: false, needsText: true });
    }
    if (this.phase === "day_talk" && seat.roleId === "link" && !seat.linkedThisRound) {
      actions.push({ action: "link", label: "查上輪用過技能未", needsTarget: true, needsText: false });
    }
    const fakeWindow = this.phase === "day_talk" || this.phase === "night";
    if (fakeWindow && seat.roleId === "decoy" && seat.fakeCharges > 0) {
      actions.push({ action: "fake_plant", label: "放一句假料", needsTarget: false, needsText: true });
      if (this.pins.some((pin) => !pin.unverified)) {
        actions.push({ action: "fake_flag", label: "標做未核實", needsTarget: true, needsText: false });
      }
    }
    return actions;
  }

  private actionsFor(seat: SeatState): PrivateSnapshot["nightActions"] {
    const role = seat.roleId;
    const names: NightActionName[] = [];
    if (role === "silencer") names.push("disconnect", "skip");
    else if (role === "cover") names.push("cover", "skip");
    else if (role === "sweep") names.push("sweep", "skip");
    else if (role === "warrant") {
      names.push("mark");
      if (!seat.sealUsed) names.push("seal");
      names.push("skip");
    }
    return names.map((action) => ({ action, ...NIGHT_LABEL[action] }));
  }

  private teammatesFor(seat: SeatState): PrivateSnapshot["teammates"] {
    if (this.factionOf(seat) !== "silence") return [];
    return this.seats
      .filter((other) => other.playerId !== seat.playerId && this.factionOf(other) === "silence" && other.roleId)
      .map((other) => ({
        seatId: other.id,
        nickname: other.nickname,
        roleName: ROLES[other.roleId!].name,
      }));
  }

  private factionOf(seat: SeatState): Faction | null {
    if (!seat.roleId) return null;
    return ROLES[seat.roleId].faction;
  }

  private isSealed(seat: SeatState): boolean {
    return seat.sealedOnRound != null && seat.sealedOnRound === this.round;
  }

  private requireLiving(
    playerId: string,
  ): { ok: true; seat: SeatState } | { ok: false; code: string; message: string } {
    const seat = this.seats.find((item) => item.playerId === playerId);
    if (!seat) return fail("not_seated", "你未入座。");
    if (!seat.alive) return fail("dead", "你已離場。");
    if (!seat.roleId && this.phase !== "lobby") return fail("not_ready", "身分未派發。");
    return { ok: true, seat };
  }

  private seatById(id: string): SeatState | undefined {
    return this.seats.find((seat) => seat.id === id);
  }

  private seatIndex(seat: SeatState): number {
    return this.seats.indexOf(seat);
  }

  private pushLog(text: string): void {
    this.log.push({ text });
    if (this.log.length > 300) this.log.shift();
  }
}

function cleanName(nickname: string): string {
  const name = nickname.trim().slice(0, 12);
  return name;
}
