import assert from "node:assert/strict";
import test from "node:test";
import { runSimBatch, runSimGame } from "./batch.js";

test("two seeded games finish, differ, and keep a persona on every seat", () => {
  const batch = runSimBatch(2, 4100);
  assert.equal(batch.games.length, 2);
  assert.equal(batch.summary.finished, 2);
  assert.equal(batch.summary.wins.lighthouse + batch.summary.wins.silence + batch.summary.wins.grey, 2);
  for (const game of batch.games) {
    assert.equal(game.personas.length, 11);
    assert.ok(game.personas.every((seat) => seat.personaId && seat.personaLabel));
    assert.ok(game.personaIds.length >= 4);
    assert.ok(game.talkRound1.length >= 2);
    assert.ok(new Set(game.talkRound1).size >= 2);
  }
  assert.notEqual(
    batch.games[0]!.personas.map((seat) => seat.personaId).join(","),
    batch.games[1]!.personas.map((seat) => seat.personaId).join(","),
  );
  assert.equal(batch.summary.distinctFingerprints, 2);
});

test("the old two-seat deadlock seed now finishes", () => {
  const game = runSimGame(20261111);
  assert.equal(game.finished, true);
  assert.ok(game.winnerFaction === "lighthouse" || game.winnerFaction === "silence" || game.winnerFaction === "grey");
  assert.ok(game.rounds < 14);
});
