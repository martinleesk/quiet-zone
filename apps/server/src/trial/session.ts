import type { Phase } from "../domain/types.js";
import { RoomHub, type ServerMsg } from "../hub.js";

/** Phone-trial pacing. Ready still skips ahead; these are the timeout ceilings. */
export const TRIAL_PHASE_MS = {
  boot: 7000,
  day_talk: 40000,
  draft: 28000,
  vote: 24000,
  resolve: 4000,
  night: 28000,
  check: 4000,
} as const;

export interface TrialOptions {
  playerId?: string;
  timers?: boolean;
  rng?: () => number;
  phaseMs?: Partial<typeof TRIAL_PHASE_MS>;
}

export interface TrialHandle {
  readonly playerId: string;
  send(message: unknown): void;
  close(): void;
}

/**
 * One human seat on the real RoomHub. AI fills the other ten seats in the lobby.
 * No WebSocket: the page and the Flutter web trial both talk to this session.
 */
export function createTrialSession(
  onMessage: (message: ServerMsg) => void,
  opts: TrialOptions = {},
): TrialHandle {
  const playerId = opts.playerId ?? "trial-human";
  const phaseTable: Record<string, number> = { ...TRIAL_PHASE_MS, ...opts.phaseMs };
  const hub = new RoomHub({
    timers: opts.timers ?? true,
    autoAi: true,
    fillAiOnCreate: true,
    rng: opts.rng,
    phaseMs: (phase: Phase) => {
      if (phase === "lobby" || phase === "ended") return null;
      return phaseTable[phase] ?? null;
    },
  });
  hub.bind(playerId, onMessage);
  return {
    playerId,
    send(message: unknown) {
      hub.handle(playerId, message);
    },
    close() {
      hub.shutdown();
    },
  };
}
