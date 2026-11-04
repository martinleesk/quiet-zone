import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { GameEngine } from "../domain/engine.js";
import { PERSONAS } from "../domain/persona.js";
import type { Faction } from "../domain/types.js";

export interface SimPersonaSeat {
  seatId: string;
  nickname: string;
  roleId: string | null;
  personaId: string | null;
  personaLabel: string | null;
  alive: boolean;
}

export interface SimNightAction {
  night: number;
  round: number;
  seatId: string;
  roleId: string | null;
  personaId: string | null;
  action: string;
  targetSeatId: string | null;
}

export interface SimGame {
  seed: number;
  personaSalt: number;
  finished: boolean;
  phase: string;
  winnerFaction: Faction | null;
  winnerKind: string | null;
  reason: string | null;
  rounds: number;
  nights: number;
  disconnects: number;
  steps: number;
  personas: SimPersonaSeat[];
  personaIds: string[];
  silencerPersonaId: string | null;
  talkRound1: string[];
  keyLines: string[];
  nightActions: SimNightAction[];
  fingerprint: string;
}

export interface SimSummary {
  games: number;
  firstSeed: number;
  finished: number;
  wins: { lighthouse: number; silence: number; grey: number; unfinished: number };
  winRate: { lighthouse: number; silence: number; grey: number };
  avgRounds: number;
  avgNights: number;
  distinctFingerprints: number;
  personaIds: string[];
  personaLabels: string[];
  silencerPersonaIds: string[];
}

export interface SimBatch {
  games: SimGame[];
  summary: SimSummary;
}

function isKeyLine(text: string): boolean {
  return (
    text.startsWith("票簿") ||
    text.includes("投票流局") ||
    text.includes("被隔離移出") ||
    text.includes("失聯，移出") ||
    text.includes("今夜無人失聯") ||
    text.includes("封口卡") ||
    text.includes("獨贏") ||
    text.includes("解封") ||
    text.includes("達標")
  );
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** One full standard game. All 11 seats are AI. Advance is headless — no sockets. */
export function runSimGame(seed: number, maxRounds = 14): SimGame {
  const engine = new GameEngine({ rng: mulberry32(seed), autoAi: true, personaSalt: seed });
  engine.fillWithAi();
  const started = engine.start();
  if (!started.ok) throw new Error(`seed ${seed} failed to start`);
  let steps = 0;
  const maxSteps = maxRounds * 8 + 4;
  while (engine.getPhase() !== "ended" && steps < maxSteps) {
    engine.advance();
    steps += 1;
  }
  const view = engine.publicView();
  const debug = engine.debugAi();
  const roleBySeat = new Map(debug.seats.map((seat) => [seat.seatId, seat.roleId]));
  const nightActions: SimNightAction[] = debug.trace
    .filter((event) => event.kind === "night")
    .map((event) => {
      const [action, target] = event.detail.split(":");
      return {
        night: event.night,
        round: event.round,
        seatId: event.seatId,
        roleId: roleBySeat.get(event.seatId) ?? null,
        personaId: event.personaId,
        action: action ?? event.detail,
        targetSeatId: target && target !== "none" ? target : null,
      };
    });
  const keyLines = view.log.map((line) => line.text).filter(isKeyLine);
  const talkRound1 = debug.trace
    .filter((event) => event.kind === "talk" && event.round === 1)
    .map((event) => `${event.personaId}:${event.detail}`);
  const personas: SimPersonaSeat[] = debug.seats.map((seat) => ({
    seatId: seat.seatId,
    nickname: seat.nickname,
    roleId: seat.roleId,
    personaId: seat.personaId,
    personaLabel: seat.personaLabel,
    alive: seat.alive,
  }));
  const personaIds = [...new Set(personas.map((seat) => seat.personaId).filter((id): id is string => id != null))].sort();
  const silencer = personas.find((seat) => seat.roleId === "silencer");
  const fingerprint = [
    view.winner?.faction ?? "unfinished",
    keyLines.join("|"),
    nightActions.map((action) => `${action.night}:${action.personaId}:${action.action}:${action.targetSeatId ?? "-"}`).join("|"),
  ].join("~");
  return {
    seed,
    personaSalt: debug.salt,
    finished: view.phase === "ended",
    phase: view.phase,
    winnerFaction: view.winner?.faction ?? null,
    winnerKind: view.winner?.kind ?? null,
    reason: view.winner?.reason ?? null,
    rounds: view.round,
    nights: view.night,
    disconnects: view.disconnects,
    steps,
    personas,
    personaIds,
    silencerPersonaId: silencer?.personaId ?? null,
    talkRound1,
    keyLines,
    nightActions,
    fingerprint,
  };
}

export function summarizeSims(games: readonly SimGame[], firstSeed: number): SimSummary {
  const wins = { lighthouse: 0, silence: 0, grey: 0, unfinished: 0 };
  let rounds = 0;
  let nights = 0;
  let finished = 0;
  for (const game of games) {
    rounds += game.rounds;
    nights += game.nights;
    if (!game.winnerFaction) wins.unfinished += 1;
    else {
      wins[game.winnerFaction] += 1;
      finished += 1;
    }
  }
  const rate = (count: number) => (finished === 0 ? 0 : count / finished);
  return {
    games: games.length,
    firstSeed,
    finished,
    wins,
    winRate: {
      lighthouse: rate(wins.lighthouse),
      silence: rate(wins.silence),
      grey: rate(wins.grey),
    },
    avgRounds: games.length === 0 ? 0 : rounds / games.length,
    avgNights: games.length === 0 ? 0 : nights / games.length,
    distinctFingerprints: new Set(games.map((game) => game.fingerprint)).size,
    personaIds: PERSONAS.map((persona) => persona.id),
    personaLabels: PERSONAS.map((persona) => persona.label),
    silencerPersonaIds: [...new Set(games.map((game) => game.silencerPersonaId).filter((id): id is string => id != null))],
  };
}

export function runSimBatch(games: number, seed: number, onProgress?: (index: number, game: SimGame) => void): SimBatch {
  const count = Math.max(1, Math.floor(games));
  const played: SimGame[] = [];
  for (let index = 0; index < count; index++) {
    const game = runSimGame(seed + index);
    played.push(game);
    onProgress?.(index, game);
  }
  return { games: played, summary: summarizeSims(played, seed) };
}

export function writeSimFiles(outPath: string, batch: SimBatch): { jsonlPath: string; summaryPath: string } {
  const jsonl = batch.games.map((game) => JSON.stringify(game)).join("\n") + "\n";
  const summaryPath = outPath.replace(/\.jsonl?$/i, "") + "-summary.json";
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, jsonl);
  writeFileSync(summaryPath, JSON.stringify(batch.summary, null, 2) + "\n");
  return { jsonlPath: outPath, summaryPath };
}
