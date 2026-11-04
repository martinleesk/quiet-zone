import { RULES } from "../config/rules.js";
import { AI_NICKNAMES, DRAFT_PHRASES, TALK_PHRASES } from "./phrases.js";
import { FACTION_LABEL, PHASE_LABEL, ROLES, STANDARD_DEAL } from "./roles.js";
import type {
  Faction,
  NightActionName,
  NightCommand,
  Phase,
  PrivateSnapshot,
  PublicSnapshot,
  RoleId,
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
}

const NIGHT_LABEL: Record<NightActionName, { label: string; needsTarget: boolean }> = {
  disconnect: { label: "執行失聯", needsTarget: true },
  cover: { label: "臨時掩護", needsTarget: true },
  sweep: { label: "熄燈掃頻", needsTarget: true },
  mark: { label: "標記消音", needsTarget: true },
  seal: { label: "抽樣封口", needsTarget: true },
  skip: { label: "跳過今夜", needsTarget: false },
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
  /** When true, AI seats act from the phrase bank and follow the human vote leader. */
  autoAi?: boolean;
}

/**
 * Authoritative standard-mode state machine.
 * Boot → DayTalk → Draft → Vote → Resolve → Night → Check → loop or end.
 */
export class GameEngine {
  private readonly rng: () => number;
  private readonly autoAi: boolean;
  private readonly seats: SeatState[] = [];
  private phase: Phase = "lobby";
  private round = 0;
  private nightNumber = 0;
  private banner = "私人房未開局。空位會由 AI 補上，徽章會一直顯示。";
  private log: Array<{ text: string }> = [];
  private successfulDisconnects = 0;
  private winner: PublicSnapshot["winner"] = null;
  private votes = new Map<string, string | null>();
  private drafts = new Map<string, string>();
  private nightActions = new Map<string, NightCommand>();
  private chatCount = new Map<string, number>();

  constructor(opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.autoAi = opts.autoAi ?? false;
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

  addPlayer(playerId: string, nickname: string): Step & { seatId?: string } {
    if (this.phase !== "lobby") return fail("already_started", "局已開始，唔可以再入座。");
    if (this.seats.length >= RULES.seatCount) return fail("room_full", "席位已滿。");
    const name = cleanName(nickname);
    if (!name) return fail("nickname", "請填一個暱稱。");
    const seat = this.makeSeat(playerId, name, false);
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
  start(deal?: readonly RoleId[]): Step {
    if (this.phase !== "lobby") return fail("already_started", "局已開始。");
    if (this.seats.length !== RULES.seatCount) {
      return fail("need_seats", `要 ${RULES.seatCount} 席先可以開局。`);
    }
    const roles = deal ? [...deal] : shuffle(STANDARD_DEAL, this.rng);
    this.assertDeal(roles);
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i]!;
      const roleId = roles[i]!;
      seat.roleId = roleId;
      seat.sweepFog = roleId === "plant" ? 1 : 0;
    }
    this.phase = "boot";
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

  submitVote(playerId: string, targetSeatId: string | null): Step {
    const seat = this.requireLiving(playerId);
    if (!seat.ok) return seat;
    if (this.phase !== "vote") return fail("wrong_phase", "而家唔係投票。");
    if (targetSeatId == null) {
      this.votes.set(playerId, null);
      if (this.autoAi) this.syncAiVotes();
      return ok();
    }
    const target = this.seatById(targetSeatId);
    if (!target || !target.alive) return fail("illegal_target", "票只可以投俾仍在場嘅人。");
    if (target.id === seat.seat.id) return fail("illegal_target", "唔可以投自己。");
    this.votes.set(playerId, target.id);
    if (this.autoAi) this.syncAiVotes();
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
        this.syncAiVotes();
        this.resolveVotes();
        this.beginPhase("resolve");
        return;
      case "resolve":
        this.nightNumber += 1;
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
      })),
      log: this.log.map((entry) => ({ text: entry.text })),
      disconnects: this.successfulDisconnects,
      disconnectsToWin: RULES.silenceWin.successfulDisconnects,
      winner: this.winner ? { ...this.winner } : null,
      hostSeatId: this.seats[0]?.id ?? null,
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
      ready: seat?.ready ?? false,
      role: role
        ? {
            id: role.id,
            name: role.name,
            faction: role.faction,
            factionLabel: FACTION_LABEL[role.faction],
            skill: role.skill,
          }
        : null,
      teammates: seat ? this.teammatesFor(seat) : [],
      inbox: seat ? [...seat.inbox] : [],
      nightActions: seat && this.phase === "night" && seat.alive ? this.actionsFor(seat) : [],
      votedSeatId: seat ? (this.votes.get(playerId) ?? null) : null,
      draft: seat ? (this.drafts.get(playerId) ?? null) : null,
      marks: seat ? [...seat.silenceMarks] : [],
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
    };
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
    this.round = round;
    this.beginPhase("day_talk");
    this.banner = `第 ${round} 輪燈亮。用短句就得，模板都可以。`;
    const sealed = this.seats.filter((seat) => seat.alive && this.isSealed(seat));
    for (const seat of sealed) {
      this.pushLog(`封口生效：${seat.nickname} 呢回合只可以投票，唔可以發言。`);
    }
    this.aiTalk();
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
    for (const seat of this.sampleAi(3)) {
      const phrase = TALK_PHRASES[(this.seatIndex(seat) + this.round) % TALK_PHRASES.length]!;
      this.submitChat(seat.playerId, phrase);
    }
  }

  private aiDraft(): void {
    if (!this.autoAi) return;
    for (const seat of this.sampleAi(3)) {
      const phrase = DRAFT_PHRASES[(this.seatIndex(seat) + this.round) % DRAFT_PHRASES.length]!;
      this.submitDraft(seat.playerId, phrase);
    }
  }

  /** A few AI lines per phase so the public log stays readable. */
  private sampleAi(limit: number): SeatState[] {
    const pool = this.seats.filter((seat) => seat.isAi && seat.alive && !this.isSealed(seat));
    const rotated = pool.filter((seat) => (this.seatIndex(seat) + this.round) % 3 === 0);
    return (rotated.length > 0 ? rotated : pool).slice(0, limit);
  }

  private aiNight(): void {
    if (!this.autoAi) return;
    for (const seat of this.seats) {
      if (!seat.isAi || !seat.alive || !seat.roleId) continue;
      const command = this.scriptedAiNight(seat);
      if (command) this.submitNight(seat.playerId, command);
    }
  }

  private scriptedAiNight(seat: SeatState): NightCommand | null {
    const role = seat.roleId;
    if (role === "silencer") {
      const target = this.seats.find((item) => item.alive && item.id !== seat.id && this.factionOf(item) !== "silence");
      return target ? { action: "disconnect", targetSeatId: target.id } : { action: "skip" };
    }
    if (role === "cover") {
      const target = this.seats.find((item) => item.alive && item.id !== seat.id);
      return target ? { action: "cover", targetSeatId: target.id } : { action: "skip" };
    }
    if (role === "sweep") {
      const target = this.seats.find((item) => item.alive && item.id !== seat.id);
      return target ? { action: "sweep", targetSeatId: target.id } : { action: "skip" };
    }
    if (role === "warrant") {
      const target = this.seats.find((item) => item.alive && item.id !== seat.id && !seat.silenceMarks.includes(item.id));
      return target ? { action: "mark", targetSeatId: target.id } : { action: "skip" };
    }
    return null;
  }

  /** AI copy the unique human leader. A split human vote stays a tie. */
  private syncAiVotes(): void {
    if (!this.autoAi || this.phase !== "vote") return;
    const humanTargets: Array<string | null> = [];
    for (const seat of this.seats) {
      if (seat.isAi || !seat.alive) continue;
      if (!this.votes.has(seat.playerId)) continue;
      humanTargets.push(this.votes.get(seat.playerId) ?? null);
    }
    const leader = uniqueLeader(humanTargets);
    for (const seat of this.seats) {
      if (!seat.isAi || !seat.alive) continue;
      this.votes.set(seat.playerId, leader == null || leader === seat.id ? null : leader);
    }
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
      if (!this.votes.has(seat.playerId)) this.votes.set(seat.playerId, null);
    }
  }

  private resolveVotes(): void {
    const ballots: Array<string | null> = [];
    for (const seat of this.seats) {
      if (!seat.alive) continue;
      ballots.push(this.votes.get(seat.playerId) ?? null);
    }
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
    echo.inbox.push(`回波殘片：${isolated.nickname} 屬於${FACTION_LABEL[faction]}。公開頻道唔會披露陣營。`);
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
      const target = this.seatById(command.targetSeatId);
      if (!target || !target.roleId) continue;
      const silence = ROLES[target.roleId].faction === "silence";
      let clean = !silence;
      if (silence && target.sweepFog > 0) {
        target.sweepFog -= 1;
        clean = true;
      }
      seat.inbox.push(clean ? `掃頻：${target.nickname} 訊號乾淨。` : `掃頻：${target.nickname} 有消音痕跡。`);
    }

    for (const seat of this.seats) {
      if (!seat.alive || seat.roleId !== "warrant") continue;
      const command = this.nightActions.get(seat.playerId);
      if (!command) continue;
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
        reason: "灰頻獨贏：孤證客仍在場，正確消音標記達 2。",
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
