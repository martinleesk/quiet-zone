import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { parseCatalog, type Catalog } from "./catalog.js";
import { createMatch, type Command, type Match } from "./engine.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cards = JSON.parse(readFileSync(join(root, "docs/signal/cards.json"), "utf8"));
const table = JSON.parse(readFileSync(join(root, "docs/signal/table.json"), "utf8"));

function catalog(): Catalog {
  return parseCatalog(cards, table);
}

function manual(seed = 1): Match {
  return createMatch(catalog(), { manual: true, seed, now: 0 });
}

function ok(match: Match, command: Command, seatId?: string): void {
  const result = match.command(command, seatId);
  assert.equal(result.ok, true, "error" in result ? result.error : "");
}

function lockVote(match: Match): void {
  for (const seat of match.debug.seats()) {
    if (match.view().phase !== "vote") return;
    match.command({ type: "ready" }, seat.id);
  }
}

const banned = [
  "狼人",
  "預言家",
  "女巫",
  "獵人",
  "守衛",
  "白痴",
  "騎士",
  "過河拆橋",
  "順手牽羊",
  "無懈可擊",
  "無中生有",
  "樂不思蜀",
  "南蠻入侵",
  "萬箭齊發",
  "決鬥",
  "曹操",
  "劉備",
  "諸葛亮",
  "張飛",
  "關羽",
  "呂布",
];

test("card pool is 8/6/6/4 and names are original", () => {
  const book = catalog();
  assert.equal(book.cards.length, 24);
  assert.equal(book.cards.filter((card) => card.kind === "strike").length, 8);
  assert.equal(book.cards.filter((card) => card.kind === "guard").length, 6);
  assert.equal(book.cards.filter((card) => card.kind === "tool").length, 6);
  assert.equal(book.cards.filter((card) => card.kind === "skill").length, 4);
  assert.equal(book.handLimit, 4);
  assert.equal(book.drawPerRound, 1);
  const day = book.phases.find((phase) => phase.id === "day");
  assert.ok(day && day.ms >= 60000 && day.ms <= 90000);
  const labels = [
    ...book.cards.map((card) => card.name),
    ...book.roles.map((role) => role.name),
    ...book.roles.map((role) => role.skill.name),
  ];
  for (const name of labels) {
    for (const word of banned) assert.equal(name.includes(word), false, name);
  }
});

test("opening deal is four cards each", () => {
  const match = manual();
  const seats = match.debug.seats();
  assert.equal(seats.length, 5);
  for (const seat of seats) assert.equal(seat.hand.length, 4);
  const factions = seats.map((seat) => seat.faction).sort();
  assert.deepEqual(factions, ["grey", "lighthouse", "lighthouse", "lighthouse", "silence"]);
  const view = match.view();
  assert.equal(view.phase, "night");
  assert.equal(view.you.hand.length, 4);
  assert.equal(view.seats.filter((seat) => seat.ai).length, 4);
});

test("play allows one strike, one tool, and equips a guard", () => {
  const match = manual();
  match.debug.jump("play");
  match.debug.clearHand("s1");
  const strike = match.debug.addCard("s1", "pulse_sting");
  const other = match.debug.addCard("s1", "echo_nail");
  const tool = match.debug.addCard("s1", "rewrite_key");
  const guard = match.debug.addCard("s1", "quiet_shell");
  ok(match, { type: "play", action: "strike", cardUid: strike, targetSeatId: "s2" });
  const second = match.command({ type: "play", action: "strike", cardUid: other, targetSeatId: "s2" });
  assert.equal(second.ok, false);
  ok(match, { type: "play", action: "tool", cardUid: tool, targetSeatId: "s2" });
  ok(match, { type: "play", action: "guard", cardUid: guard });
  const view = match.view();
  assert.equal(view.you.quotas.strike, "1/1");
  assert.equal(view.you.quotas.tool, "1/1");
  assert.equal(view.you.quotas.guard, "1/1");
  assert.equal(view.you.guard, "靜默罩");
  assert.equal(view.you.hand.length, 1);
  assert.equal(match.debug.seats().find((seat) => seat.id === "s2")?.marks, 0);
});

test("quiet shell blocks a strike and then breaks", () => {
  const match = manual();
  match.debug.jump("play");
  match.debug.clearHand("s1");
  match.debug.clearHand("s2");
  const guard = match.debug.addCard("s1", "quiet_shell");
  const sting = match.debug.addCard("s2", "pulse_sting");
  ok(match, { type: "play", action: "guard", cardUid: guard }, "s1");
  ok(match, { type: "play", action: "strike", cardUid: sting, targetSeatId: "s1" }, "s2");
  const target = match.debug.seats().find((seat) => seat.id === "s1");
  assert.equal(target?.guard, null);
  assert.equal(target?.marks, 0);
  assert.ok(match.debug.log().some((line) => line.includes("靜默罩")));
});

test("jam blocks the next play, then clears", () => {
  const match = manual();
  match.debug.jump("play");
  match.debug.clearHand("s2");
  const jam = match.debug.addCard("s2", "jam_spear");
  ok(match, { type: "play", action: "strike", cardUid: jam, targetSeatId: "s1" }, "s2");
  match.debug.nextPlay();
  match.debug.clearHand("s1");
  const sting = match.debug.addCard("s1", "pulse_sting");
  const blocked = match.command({ type: "play", action: "strike", cardUid: sting, targetSeatId: "s2" });
  assert.equal(blocked.ok, false);
  match.debug.nextPlay();
  const again = match.debug.addCard("s1", "pulse_sting");
  ok(match, { type: "play", action: "strike", cardUid: again, targetSeatId: "s2" });
});

test("rewrite removes one mark and fog hides a faction", () => {
  const match = manual();
  match.debug.jump("play");
  match.debug.clearHand("s1");
  match.debug.clearHand("s2");
  match.debug.setMarks("s2", 2);
  const key = match.debug.addCard("s1", "rewrite_key");
  ok(match, { type: "play", action: "tool", cardUid: key, targetSeatId: "s2" });
  assert.equal(match.debug.seats().find((seat) => seat.id === "s2")?.marks, 1);
  match.debug.nextPlay();
  match.debug.clearHand("s1");
  match.debug.clearHand("s2");
  const cloak = match.debug.addCard("s2", "fog_cloak");
  const sniff = match.debug.addCard("s1", "sniffer");
  ok(match, { type: "play", action: "guard", cardUid: cloak }, "s2");
  ok(match, { type: "play", action: "tool", cardUid: sniff, targetSeatId: "s2" });
  assert.ok(match.debug.notes("s1").some((line) => line.includes("霧")));
  assert.equal(match.debug.seats().find((seat) => seat.id === "s2")?.guard, "fog");
});

test("vote disconnects a plurality and a tie stays connected", () => {
  const match = manual();
  match.debug.jump("vote");
  for (const seat of match.debug.seats()) {
    ok(match, { type: "vote", targetSeatId: seat.id === "s2" ? "s1" : "s2" }, seat.id);
  }
  lockVote(match);
  assert.equal(match.debug.seats().find((seat) => seat.id === "s2")?.connected, false);
  assert.ok(match.view().phase === "resolve" || match.view().phase === "ended");

  const tied = manual(2);
  tied.debug.jump("vote");
  ok(tied, { type: "vote", targetSeatId: "s2" }, "s1");
  ok(tied, { type: "vote", targetSeatId: "s1" }, "s2");
  ok(tied, { type: "vote", targetSeatId: "s2" }, "s3");
  ok(tied, { type: "vote", targetSeatId: "s1" }, "s4");
  ok(tied, { type: "vote", targetSeatId: "abstain" }, "s5");
  lockVote(tied);
  assert.equal(tied.view().phase, "resolve");
  assert.equal(tied.debug.seats().every((seat) => seat.connected), true);
  assert.ok(tied.debug.log().some((line) => line.includes("留線")));
});

test("anchor skill cancels a disconnect once", () => {
  const match = manual();
  const saver = match.debug.seats().find((seat) => seat.skillWindow === "vote");
  assert.ok(saver);
  match.debug.jump("vote");
  ok(match, { type: "play", action: "private" }, saver.id);
  const decoy = match.debug.seats().find((seat) => seat.id !== saver.id);
  assert.ok(decoy);
  for (const seat of match.debug.seats()) {
    if (seat.id === saver.id) continue;
    ok(match, { type: "vote", targetSeatId: saver.id }, seat.id);
  }
  ok(match, { type: "vote", targetSeatId: decoy.id }, saver.id);
  lockVote(match);
  assert.equal(match.debug.seats().find((seat) => seat.id === saver.id)?.connected, true);
  assert.equal(match.debug.seats().find((seat) => seat.id === saver.id)?.skillUsed, true);
  const again = match.command({ type: "play", action: "private" }, saver.id);
  assert.equal(again.ok, false);
});

test("silence quota, lighthouse clear, and grey node use the table", () => {
  const silence = manual();
  const lights = silence.debug.seats().filter((seat) => seat.faction === "lighthouse");
  silence.debug.disconnect(lights[0]!.id);
  assert.equal(silence.view().winner, null);
  silence.debug.disconnect(lights[1]!.id);
  assert.equal(silence.view().winner?.faction, "silence");
  assert.equal(silence.debug.silenceProgress(), 2);

  const lighthouse = manual(3);
  const jammer = lighthouse.debug.seats().find((seat) => seat.faction === "silence");
  lighthouse.debug.disconnect(jammer!.id);
  assert.equal(lighthouse.view().winner?.faction, "lighthouse");

  const grey = manual(4);
  grey.debug.advanceRound();
  grey.debug.advanceRound();
  assert.equal(grey.view().winner, null);
  grey.debug.advanceRound();
  assert.equal(grey.view().winner?.faction, "grey");
  assert.equal(grey.view().round, 4);
});

test("discard brings the hand back to four", () => {
  const match = manual();
  match.debug.clearHand("s1");
  for (let i = 0; i < 5; i += 1) match.debug.addCard("s1", i % 2 === 0 ? "pulse_sting" : "sniffer");
  match.debug.jump("discard");
  assert.equal(match.view().phase, "discard");
  const uid = match.view().you.hand[0]?.uid;
  assert.ok(uid);
  ok(match, { type: "discard", cardUid: uid });
  assert.equal(match.view().you.hand.length, 4);
  assert.notEqual(match.view().phase, "discard");
});

test("AI lamps are on immediately and a solo table reaches an end", () => {
  const opened = createMatch(catalog(), { seed: 7, now: 0 });
  const view = opened.view();
  assert.equal(view.phase, "night");
  assert.equal(view.seats.filter((seat) => seat.ai).every((seat) => seat.acted), true);
  assert.equal(view.seats.find((seat) => seat.isYou)?.acted, false);

  const match = createMatch(catalog(), { seed: 11, now: 0 });
  for (let step = 0; step < 80 && match.view().phase !== "ended"; step += 1) {
    const current = match.view();
    if (current.phase === "discard" && current.you.hand.length > 4) {
      ok(match, { type: "discard", cardUid: current.you.hand[0]!.uid });
      continue;
    }
    if (current.phase === "day") {
      ok(match, { type: "talk", chip: "我過" });
      continue;
    }
    ok(match, { type: "ready" });
  }
  assert.equal(match.view().phase, "ended");
  assert.ok(match.view().winner);
});

test("direct jumps land on the play and vote screens", () => {
  const play = createMatch(catalog(), { seed: 3, now: 1_000, at: "play" });
  assert.equal(play.view().phase, "play");
  assert.ok(play.view().you.hand.length <= 4);
  assert.equal(play.view().you.acted, false);
  assert.equal(play.view().seats.filter((seat) => seat.ai && seat.acted).length, 4);
  const vote = createMatch(catalog(), { seed: 3, now: 1_000, at: "vote" });
  assert.equal(vote.view().phase, "vote");
  assert.ok(vote.view().seats.some((seat) => seat.ai && seat.vote));
});
