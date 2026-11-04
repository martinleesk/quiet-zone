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
  | { type: "vote"; targetSeatId?: string | null }
  | { type: "night_action"; action?: string; targetSeatId?: string }
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
    const msg = raw as Partial<ClientMsg> & { type?: string };
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
          engine.submitVote(playerId, msg.targetSeatId == null || msg.targetSeatId === "" ? null : String(msg.targetSeatId)),
        );
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
      case "ready":
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
    room.engine.fillWithAi();
    const started = room.engine.start();
    if (!started.ok) {
      this.fail(playerId, started.code, started.message);
      return;
    }
    this.arm(room);
    this.broadcast(room);
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
    if (!this.timers) return;
    this.clearTimer(room);
    const ms = this.phaseMs(room.engine.getPhase());
    if (ms == null) return;
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
