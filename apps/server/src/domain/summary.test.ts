import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "./engine.js";
import type { Phase, RoleId } from "./types.js";

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

function table() {
  const engine = new GameEngine({ rng: () => 0, autoAi: false });
  const ids: string[] = [];
  for (let i = 0; i < 11; i++) {
    const id = `p${i}`;
    ids.push(id);
    assert.equal(engine.addPlayer(id, `玩家${i + 1}`).ok, true);
  }
  assert.equal(engine.start(PRESET).ok, true);
  return { engine, ids };
}

function until(engine: GameEngine, phase: Phase) {
  if (engine.getPhase() === phase) return;
  for (let i = 0; i < 12; i++) {
    engine.advance();
    if (engine.getPhase() === phase || engine.getPhase() === "ended") return;
  }
  assert.fail(`stuck at ${engine.getPhase()} wanting ${phase}`);
}

test("secondsLeft is on both snapshots and is null without a deadline", () => {
  const { engine, ids } = table();
  assert.equal(engine.publicView().secondsLeft, null);
  assert.equal(engine.privateView(ids[0]!).secondsLeft, null);
  engine.setPhaseDeadline(Date.now() + 10_000);
  const left = engine.publicView().secondsLeft;
  assert.ok(left === 10 || left === 9);
  assert.equal(engine.privateView(ids[6]!).secondsLeft, left);
  engine.setPhaseDeadline(null);
  assert.equal(engine.publicView().secondsLeft, null);
});

test("echo remnants stay private and keep chronological order", () => {
  const { engine, ids } = table();
  const echo = ids[6]!;
  for (const target of ["s10", "s11"]) {
    until(engine, "vote");
    for (const id of ids) {
      const view = engine.privateView(id);
      if (!view.alive || view.seatId === target) continue;
      assert.equal(engine.submitVote(id, target).ok, true);
    }
    engine.advance();
  }
  const remnants = engine.privateView(echo).remnants;
  assert.deepEqual(remnants.map((item) => item.nickname), ["玩家10", "玩家11"]);
  assert.deepEqual(remnants.map((item) => item.factionLabel), ["燈塔網", "燈塔網"]);
  assert.equal(engine.privateView(ids[0]!).remnants.length, 0);
  assert.equal(JSON.stringify(engine.publicView()).includes("回波殘片"), false);
});

test("ended snapshot reveals every seat and names the win kind", () => {
  const { engine, ids } = table();
  until(engine, "day_talk");
  assert.equal(engine.submitSuspect(ids[0]!, "s3", true).ok, true);
  assert.equal(engine.submitSuspect(ids[0]!, "s4", true).ok, true);
  until(engine, "check");
  assert.equal(engine.publicView().winner?.kind, "grey_marks");
  assert.equal(engine.publicView().reveal, null);
  assert.equal(JSON.stringify(engine.publicView()).includes('"silencer"'), false);
  engine.advance();
  assert.equal(engine.getPhase(), "ended");
  const ended = engine.publicView();
  assert.equal(ended.reveal?.length, 11);
  assert.equal(ended.winner?.faction, "grey");
  assert.match(ended.winner?.reason ?? "", /正確消音標記/);
  const factions = { lighthouse: 0, silence: 0, grey: 0 };
  for (const seat of ended.reveal ?? []) factions[seat.faction] += 1;
  assert.deepEqual(factions, { lighthouse: 7, silence: 3, grey: 1 });
  assert.equal(ended.reveal?.find((seat) => seat.seatId === "s2")?.roleName, "消音手");
});

test("lighthouse clear and silence disconnects set their own end kinds", () => {
  const lighthouse = table();
  for (const target of ["s2", "s3", "s4"]) {
    until(lighthouse.engine, "vote");
    for (const id of lighthouse.ids) {
      const view = lighthouse.engine.privateView(id);
      if (!view.alive || view.seatId === target) continue;
      lighthouse.engine.submitVote(id, target);
    }
    lighthouse.engine.advance();
    lighthouse.engine.advance();
    lighthouse.engine.advance();
  }
  assert.equal(lighthouse.engine.getPhase(), "check");
  lighthouse.engine.advance();
  assert.equal(lighthouse.engine.publicView().winner?.kind, "lighthouse_clear");
  assert.match(lighthouse.engine.publicView().winner?.reason ?? "", /全部離場/);

  const silence = table();
  for (const target of ["s10", "s11", "s9"]) {
    until(silence.engine, "night");
    assert.equal(silence.engine.submitNight(silence.ids[1]!, { action: "disconnect", targetSeatId: target }).ok, true);
    silence.engine.advance();
  }
  silence.engine.advance();
  assert.equal(silence.engine.publicView().winner?.kind, "silence_disconnects");
  assert.match(silence.engine.publicView().winner?.reason ?? "", /成功失聯 3 次/);
  assert.equal(silence.engine.publicView().reveal?.length, 11);
});
