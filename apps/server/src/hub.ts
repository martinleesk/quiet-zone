import { randomUUID } from "node:crypto";
import { RULES } from "./config/rules.js";
import { GameEngine } from "./domain/engine.js";
import type { NightActionName, Phase, PrivateSnapshot, PublicSnapshot } from "./domain/types.js";

export type ClientMsg =
  | { type: "create_room"; nickname?: string }
  | { type: "join_room"; code?: string; nickname?: string }
  | { type: "start_game" }
  | { type: "chat"; text?: string }
  | { type: "draft"; text?: string }
  | { type: "vote"; targetSeatId?: string | null; anonymous?: boolean }
  | { type: "night_action"; action?: string; targetSeatId?: string }
  | { type: "skill"; action?: string; text?: string; targetId?: string }
  | { type: "ready" };

export interface DressedPublic extends PublicSnapshot {
  code: string;
}

export type ServerMsg =
  | { type: "state"; public: DressedPublic; private: PrivateSnapshot }
  | { type: "error"; code: string; message: string };

const EARLY: ReadonlySet<Phase> = new Set(["boot", "day_talk", "draft", "vote", "night"]);
const NIGHT_ACTIONS: ReadonlySet<string> = new Set(["disconnect", "cover", "sweep", "mark", "seal", "skip"]);
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface RoomRec {
  code: string;
  engine: GameEngine;
  timer?: ReturnType<typeof setTimeout>;
}

export interface HubOptions {
  timers?: boolean;
  autoAi?: boolean;
  rng?: () => number;
  phaseMs?: (phase: Phase) => number | null;
}

export class RoomHub {
  private readonly rooms = new Map<string, RoomRec>();
  private readonly playerRoom = new Map<string, string>();
  private readonly sinks = new Map<string, (msg: ServerMsg) => void>();
  private readonly timers: boolean;
  private readonly autoAi: boolean;
  private readonly rng: () => number;
  private readonly phaseMs: (phase: Phase) => number | null;

  constructor(opts: HubOptions = {}) {
    this.timers = opts.timers ?? false;
    this.autoAi = opts.autoAi ?? true;
    this.rng = opts.rng ?? Math.random;
    this.phaseMs = opts.phaseMs ?? defaultPhaseMs;
  }

  bind(playerId: string, sink: (msg: ServerMsg) => void): void {
    this.sinks.set(playerId, sink);
  }

  unbind(playerId: string): void {
    this.sinks.delete(playerId);
  }

  /**
   * Socket dropped. Lobby frees the seat. An in-progress game hands that seat to AI
   * with the same role and private state, and the badge stays on.
   */
  disconnect(playerId: string): void {
    this.unbind(playerId);
    const room = this.roomOf(playerId);
    this.playerRoom.delete(playerId);
    if (!room) return;
    if (room.engine.getPhase() === "lobby") {
      room.engine.removeLobbyPlayer(playerId);
      if (room.engine.publicView().seats.length === 0) {
        this.clearTimer(room);
        this.rooms.delete(room.code);
        return;
      }
    } else {
      room.engine.takeoverAsAi(playerId);
      this.maybeEarly(room);
    }
    this.broadcast(room);
  }

  snapshot(playerId: string): ServerMsg | null {
    const room = this.roomOf(playerId);
    if (!room) return null;
    return this.dress(room, playerId);
  }

  handle(playerId: string, raw: unknown): void {
    if (!raw || typeof raw !== "object") {
      this.fail(playerId, "bad_message", "訊息格式唔正確。");
      return;
    }
    const msg = raw as {
      type?: string;
      nickname?: string;
      code?: string;
      text?: string;
      targetSeatId?: string | null;
      anonymous?: boolean;
      action?: string;
      targetId?: string;
      marked?: boolean;
      token?: string;
      ready?: boolean;
    };
    switch (msg.type) {
      case "create_room":
        this.create(playerId, String(msg.nickname ?? ""));
        return;
      case "join_room":
        this.join(playerId, String(msg.code ?? ""), String(msg.nickname ?? ""));
        return;
      case "start_game":
        this.start(playerId);
        return;
      case "chat":
        this.act(playerId, (engine) => engine.submitChat(playerId, String(msg.text ?? "")));
        return;
      case "draft":
        this.act(playerId, (engine) => engine.submitDraft(playerId, String(msg.text ?? "")));
        return;
      case "vote":
        this.act(playerId, (engine) =>
          engine.submitVote(
            playerId,
            msg.targetSeatId == null || msg.targetSeatId === "" ? null : String(msg.targetSeatId),
            msg.anonymous === true,
          ),
        );
        return;
      case "skill":
        this.act(playerId, (engine) =>
          this.skill(engine, playerId, {
            action: String(msg.action ?? ""),
            text: msg.text == null ? "" : String(msg.text),
            targetId: msg.targetId == null ? "" : String(msg.targetId),
            marked: msg.marked !== false && msg.action !== "unmark",
          }),
        );
        return;
      case "reclaim":
        this.reclaim(playerId, String(msg.token ?? ""));
        return;
      case "night_action":
        this.act(playerId, (engine) => {
          const action = String(msg.action ?? "");
          if (!NIGHT_ACTIONS.has(action)) return { ok: false as const, code: "bad_message", message: "未知嘅熄燈行動。" };
          return engine.submitNight(playerId, {
            action: action as NightActionName,
            targetSeatId: msg.targetSeatId ? String(msg.targetSeatId) : undefined,
          });
        });
        return;
      case "silence":
        this.act(playerId, (engine) => engine.submitSilence(playerId, String(msg.text ?? "")));
        return;
      case "ready":
        if (this.roomOf(playerId)?.engine.getPhase() === "lobby") {
          this.act(playerId, (engine) => engine.setLobbyReady(playerId, msg.ready !== false));
          return;
        }
        this.act(playerId, (engine) => engine.setReady(playerId), true);
        return;
      default:
        this.fail(playerId, "bad_message", "未知指令。");
    }
  }

  private create(playerId: string, nickname: string): void {
    if (this.playerRoom.has(playerId)) {
      this.fail(playerId, "already_in_room", "你已經喺一間房。");
      return;
    }
    const engine = new GameEngine({ rng: this.rng, autoAi: this.autoAi });
    const joined = engine.addPlayer(playerId, nickname);
    if (!joined.ok) {
      this.fail(playerId, joined.code, joined.message);
      return;
    }
    const code = this.freshCode();
    const room: RoomRec = { code, engine };
    this.rooms.set(code, room);
    this.playerRoom.set(playerId, code);
    this.broadcast(room);
  }

  private join(playerId: string, code: string, nickname: string): void {
    if (this.playerRoom.has(playerId)) {
      this.fail(playerId, "already_in_room", "你已經喺一間房。");
      return;
    }
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) {
      this.fail(playerId, "room_not_found", "搵唔到呢個房間代碼。");
      return;
    }
    const joined = room.engine.addPlayer(playerId, nickname);
    if (!joined.ok) {
      this.fail(playerId, joined.code, joined.message);
      return;
    }
    this.playerRoom.set(playerId, room.code);
    this.broadcast(room);
  }

  private start(playerId: string): void {
    const room = this.roomOf(playerId);
    if (!room) {
      this.fail(playerId, "not_in_room", "你未入房。");
      return;
    }
    if (!room.engine.privateView(playerId).isHost) {
      this.fail(playerId, "not_host", "只有房主可以開始。");
      return;
    }
    const started = room.engine.start(undefined, { enforceLobbyReady: true });
    if (!started.ok) {
      this.fail(playerId, started.code, started.message);
      return;
    }
    this.arm(room);
    this.broadcast(room);
  }

  private skill(
    engine: GameEngine,
    playerId: string,
    msg: { action: string; text: string; targetId: string; marked: boolean },
  ): { ok: true } | { ok: false; code: string; message: string } {
    if (msg.action === "pin") return engine.submitPin(playerId, msg.text);
    if (msg.action === "link") return engine.submitLink(playerId, msg.targetId);
    if (msg.action === "fake_flag") return engine.submitFake(playerId, { mode: "flag", pinId: msg.targetId });
    if (msg.action === "fake_plant") return engine.submitFake(playerId, { mode: "plant", text: msg.text });
    if (msg.action === "mark" || msg.action === "unmark") {
      return engine.submitSuspect(playerId, msg.targetId, msg.action === "mark" && msg.marked);
    }
    return { ok: false, code: "bad_message", message: "未知嘅技能。" };
  }

  private reclaim(playerId: string, token: string): void {
    if (this.playerRoom.has(playerId)) {
      this.fail(playerId, "already_in_room", "你已經喺一間房。");
      return;
    }
    for (const room of this.rooms.values()) {
      const result = room.engine.reclaim(playerId, token);
      if (result.ok) {
        this.playerRoom.set(playerId, room.code);
        this.broadcast(room);
        return;
      }
      if (result.code !== "token_unknown") {
        this.fail(playerId, result.code, result.message);
        return;
      }
    }
    this.fail(playerId, "token_unknown", "搵唔到你原本嘅席。");
  }

  private act(
    playerId: string,
    run: (engine: GameEngine) => { ok: true } | { ok: false; code: string; message: string },
    early = false,
  ): void {
    const room = this.roomOf(playerId);
    if (!room) {
      this.fail(playerId, "not_in_room", "你未入房。");
      return;
    }
    const result = run(room.engine);
    if (!result.ok) {
      this.fail(playerId, result.code, result.message);
      return;
    }
    if (early) this.maybeEarly(room);
    this.broadcast(room);
  }

  private maybeEarly(room: RoomRec): void {
    const phase = room.engine.getPhase();
    if (!EARLY.has(phase) || !room.engine.everyoneReady()) return;
    this.clearTimer(room);
    room.engine.advance();
    this.arm(room);
  }

  private arm(room: RoomRec): void {
    this.clearTimer(room);
    if (!this.timers) {
      room.engine.setPhaseDeadline(null);
      return;
    }
    const ms = this.phaseMs(room.engine.getPhase());
    if (ms == null) {
      room.engine.setPhaseDeadline(null);
      return;
    }
    room.engine.setPhaseDeadline(Date.now() + ms);
    room.timer = setTimeout(() => {
      room.timer = undefined;
      if (room.engine.getPhase() === "ended") return;
      room.engine.advance();
      this.broadcast(room);
      this.arm(room);
    }, ms);
  }

  private clearTimer(room: RoomRec): void {
    if (room.timer) clearTimeout(room.timer);
    room.timer = undefined;
  }

  private dress(room: RoomRec, playerId: string): ServerMsg {
    return {
      type: "state",
      public: { ...room.engine.publicView(), code: room.code },
      private: room.engine.privateView(playerId),
    };
  }

  private broadcast(room: RoomRec): void {
    for (const [playerId, code] of this.playerRoom) {
      if (code === room.code) this.emit(playerId, this.dress(room, playerId));
    }
  }

  private emit(playerId: string, msg: ServerMsg): void {
    this.sinks.get(playerId)?.(msg);
  }

  private fail(playerId: string, code: string, message: string): void {
    this.emit(playerId, { type: "error", code, message });
  }

  private roomOf(playerId: string): RoomRec | undefined {
    const code = this.playerRoom.get(playerId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  private freshCode(): string {
    for (let attempt = 0; attempt < 8; attempt++) {
      let code = "";
      for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(this.rng() * ALPHABET.length)] ?? "A";
      if (!this.rooms.has(code)) return code;
    }
    return randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  }
}

function defaultPhaseMs(phase: Phase): number | null {
  if (phase === "lobby" || phase === "ended") return null;
  if (phase in RULES.phaseMs) return RULES.phaseMs[phase as keyof typeof RULES.phaseMs];
  return null;
}
