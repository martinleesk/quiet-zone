import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "./engine.js";
import { PERSONAS, duelPresserId, nightCommand, personaForSeat, voteTarget, type PersonaId, type ThinkContext } from "./persona.js";
import { TALK_PHRASES } from "./phrases.js";
import type { RoleId } from "./types.js";

const PRESET: RoleId[] = [
  "warrant",
  "silencer",
  "decoy",
  "plant",
  "cover",
  "sweep",
  "echo",
  "tip",
  "link",
  "civilian",
  "civilian",
];

test("adjacent seats get different personas and a salt rotates the ring", () => {
  for (let salt = 0; salt < 12; salt++) {
    for (let index = 0; index < 11; index++) {
      assert.notEqual(personaForSeat(index, salt).id, personaForSeat(index + 1, salt).id);
    }
  }
  assert.notEqual(personaForSeat(1, 0).id, personaForSeat(1, 1).id);
  assert.equal(personaForSeat(4, 0).id, personaForSeat(4, PERSONAS.length).id);
  assert.equal(PERSONAS.length, 6);
});

test("two silencers with different personas do not pick the same night action", () => {
  const observer = nightCommand(think({ selfIndex: 1, selfPersona: "observer" }));
  const hunter = nightCommand(think({ selfIndex: 4, selfPersona: "hunter", pinSeatIds: ["s8"] }));
  const bluffer = nightCommand(think({ selfIndex: 2, selfPersona: "bluffer", pinSeatIds: ["s8"], night: 2 }));
  assert.equal(observer?.action, "skip");
  assert.equal(hunter?.action, "disconnect");
  assert.equal(hunter?.targetSeatId, "s8");
  assert.equal(nightCommand(think({ selfIndex: 2, selfPersona: "bluffer", pinSeatIds: ["s8"] }))?.action, "skip");
  assert.equal(bluffer?.action, "disconnect");
  assert.notEqual(bluffer?.targetSeatId, hunter?.targetSeatId);
});

test("two anchors share one hunch, and follower holds the first night", () => {
  const left = voteTarget(
    think({ selfIndex: 5, selfPersona: "anchor", selfRole: "civilian", selfFaction: "lighthouse", teammates: [], round: 1 }),
  );
  const right = voteTarget(
    think({ selfIndex: 10, selfPersona: "anchor", selfRole: "civilian", selfFaction: "lighthouse", teammates: [], round: 1 }),
  );
  assert.ok(left);
  assert.equal(left, right);
  assert.equal(nightCommand(think({ selfIndex: 3, selfPersona: "follower" }))?.action, "skip");
  assert.equal(nightCommand(think({ selfIndex: 3, selfPersona: "follower", night: 2 }))?.action, "disconnect");
  assert.equal(nightCommand(think({ selfIndex: 4, selfPersona: "hunter", pinSeatIds: ["s8"] }))?.action, "disconnect");
});

test("same persona on two seats still aims at different people", () => {
  const left = voteTarget(think({ selfIndex: 0, selfPersona: "accuser", selfRole: "civilian", selfFaction: "lighthouse", teammates: [], round: 1 }));
  const right = voteTarget(think({ selfIndex: 6, selfPersona: "accuser", selfRole: "civilian", selfFaction: "lighthouse", teammates: [], round: 1 }));
  assert.ok(left);
  assert.ok(right);
  assert.notEqual(left, right);
});

test("all-AI votes are mixed, personas stay off the public snapshot, and the same role differs by seat", () => {
  const engine = new GameEngine({ rng: () => 0, autoAi: true, personaSalt: 0 });
  assert.equal(engine.fillWithAi(), 11);
  assert.equal(engine.start(PRESET).ok, true);
  const debug = engine.debugAi();
  const labels = new Set(debug.seats.map((seat) => seat.personaId));
  assert.ok(labels.size >= 4);
  const civilians = debug.seats.filter((seat) => seat.roleId === "civilian");
  assert.equal(civilians.length, 2);
  assert.notEqual(civilians[0]?.personaId, civilians[1]?.personaId);

  for (let step = 0; step < 4; step++) engine.advance();
  assert.equal(engine.getPhase(), "resolve");
  const book = engine.publicView().log.map((line) => line.text).find((text) => text.startsWith("票簿"));
  assert.ok(book);
  assert.match(book, /棄權/);
  assert.match(book, /s\d+/);
  const talked = engine.publicView().log.map((line) => line.text).join("\n");
  assert.ok(TALK_PHRASES.some((phrase) => talked.includes(phrase)));

  const pub = JSON.stringify(engine.publicView());
  for (const persona of PERSONAS) {
    assert.equal(pub.includes(persona.label), false);
    assert.equal(pub.includes(`"${persona.id}"`), false);
  }
  assert.ok(engine.debugAi().seats.some((seat) => seat.personaLabel === "尖銳指控"));
});

test("a human majority is still copied and a split human vote stays a tie", () => {
  const engine = new GameEngine({ rng: () => 0, autoAi: true, personaSalt: 3 });
  assert.equal(engine.addPlayer("host", "主持人").ok, true);
  assert.equal(engine.fillWithAi(), 10);
  assert.equal(engine.start(PRESET).ok, true);
  for (let step = 0; step < 3; step++) engine.advance();
  assert.equal(engine.getPhase(), "vote");
  assert.equal(engine.submitVote("host", "s3").ok, true);
  engine.advance();
  assert.equal(engine.publicView().seats.find((seat) => seat.id === "s3")?.alive, false);
  const votes = engine.debugAi().trace.filter((event) => event.kind === "vote" && event.round === 1);
  assert.ok(votes.some((event) => event.detail.startsWith("follow:")));

  const rival = new GameEngine({ rng: () => 0, autoAi: true, personaSalt: 4 });
  assert.equal(rival.addPlayer("h1", "甲").ok, true);
  assert.equal(rival.addPlayer("h2", "乙").ok, true);
  assert.equal(rival.fillWithAi(), 9);
  assert.equal(rival.start(PRESET).ok, true);
  for (let step = 0; step < 3; step++) rival.advance();
  assert.equal(rival.submitVote("h1", "s3").ok, true);
  assert.equal(rival.submitVote("h2", "s4").ok, true);
  rival.advance();
  assert.ok(rival.publicView().seats.every((seat) => seat.alive));
  assert.match(rival.publicView().banner, /流局/);
  const split = rival.debugAi().trace.filter((event) => event.kind === "vote");
  assert.ok(split.every((event) => event.detail === "split:abstain"));
});

test("the same silencer seat changes night plan when the persona salt changes", () => {
  const quiet = nightOf(0);
  assert.equal(quiet.detail, "skip:none");
  assert.equal(quiet.personaId, "observer");
  assert.equal(nightCommand(think({ selfIndex: 1, selfPersona: "hunter", pinSeatIds: ["s9"] }))?.targetSeatId, "s9");
  assert.equal(nightCommand(think({ selfIndex: 1, selfPersona: "bluffer" }))?.action, "skip");
  assert.equal(nightCommand(think({ selfIndex: 1, selfPersona: "bluffer", night: 2 }))?.action, "disconnect");
});

test("a two-seat endgame lets the louder persona press the vote", () => {
  const presser = duelPresserId([
    { id: "s1", index: 0, personaId: "anchor" },
    { id: "s2", index: 1, personaId: "accuser" },
  ]);
  assert.equal(presser, "s2");
  const tied = duelPresserId([
    { id: "s1", index: 0, personaId: "bluffer" },
    { id: "s4", index: 3, personaId: "accuser" },
  ]);
  assert.equal(tied, "s1");
});

test("an all-AI table reaches a legal ending", () => {
  const engine = new GameEngine({ rng: () => 0.2, autoAi: true, personaSalt: 2 });
  engine.fillWithAi();
  assert.equal(engine.start().ok, true);
  let guard = 0;
  while (engine.getPhase() !== "ended" && guard < 100) {
    engine.advance();
    guard += 1;
  }
  assert.equal(engine.getPhase(), "ended");
  const winner = engine.publicView().winner?.faction;
  assert.ok(winner === "lighthouse" || winner === "silence" || winner === "grey");
});

function nightOf(salt: number): { detail: string; personaId: string | null } {
  const engine = new GameEngine({ rng: () => 0, autoAi: true, personaSalt: salt });
  engine.fillWithAi();
  assert.equal(engine.start(PRESET).ok, true);
  for (let step = 0; step < 5; step++) engine.advance();
  assert.equal(engine.getPhase(), "night");
  const trace = engine.debugAi().trace.find((event) => event.kind === "night" && event.seatId === "s2");
  assert.ok(trace);
  return { detail: trace.detail, personaId: trace.personaId };
}

function think(over: {
  selfIndex: number;
  selfPersona: PersonaId;
  selfRole?: RoleId;
  selfFaction?: ThinkContext["selfFaction"];
  teammates?: string[];
  pinSeatIds?: string[];
  round?: number;
  night?: number;
}): ThinkContext {
  const seats = Array.from({ length: 11 }, (_, index) => ({
    id: `s${index + 1}`,
    index,
    nickname: `席${index + 1}`,
    alive: true,
  }));
  return {
    selfId: `s${over.selfIndex + 1}`,
    selfIndex: over.selfIndex,
    selfRole: over.selfRole ?? "silencer",
    selfFaction: over.selfFaction ?? "silence",
    selfPersona: over.selfPersona,
    seats,
    round: over.round ?? 1,
    night: over.night ?? 1,
    salt: 0,
    phase: "night",
    accusations: [],
    pinSeatIds: over.pinSeatIds ?? [],
    sweeps: {},
    linkedUsed: {},
    teammates: over.teammates ?? ["s3", "s4"],
    marks: [],
    coverReady: true,
    sealUsed: false,
    fakeCharges: 2,
    openPinIds: [],
  };
}
