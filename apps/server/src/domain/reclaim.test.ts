import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "./engine.js";
import { RoomHub, type ServerMsg } from "../hub.js";
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

test("sealed player gets a private vote-only card and cannot speak", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.submitNight(ids[0]!, { action: "seal", targetSeatId: "s8" }).ok, true);
  engine.advance();
  until(engine, "day_talk");
  const muted = engine.privateView(ids[7]!);
  assert.equal(muted.muted, true);
  assert.match(muted.sealCard ?? "", /只可以投票/);
  assert.equal(muted.canSpeak, false);
  assert.deepEqual(muted.skillActions, []);
  const chat = engine.submitChat(ids[7]!, "我想講。");
  assert.equal(chat.ok, false);
  if (!chat.ok) assert.equal(chat.code, "sealed");
  engine.advance();
  assert.equal(engine.getPhase(), "draft");
  const draft = engine.submitDraft(ids[7]!, "草稿");
  assert.equal(draft.ok, false);
  if (!draft.ok) assert.equal(draft.code, "sealed");
  assert.equal(engine.privateView(ids[0]!).sealCard, null);
  assert.equal(engine.publicView().seats.find((seat) => seat.id === "s8")?.sealed, true);

  until(engine, "vote");
  const voting = engine.privateView(ids[7]!);
  assert.equal(voting.muted, true);
  assert.equal(voting.canVote, true);
  assert.equal(engine.submitVote(ids[7]!, "s5").ok, true);
});

test("孤證客 can mark and unmark, and two correct marks still win first", () => {
  const { engine, ids } = table();
  until(engine, "day_talk");
  const grey = ids[0]!;
  assert.equal(engine.submitSuspect(grey, "s3", true).ok, true);
  assert.equal(engine.submitSuspect(grey, "s4", true).ok, true);
  assert.deepEqual(engine.privateView(grey).marks, ["s3", "s4"]);
  assert.equal(engine.submitSuspect(grey, "s4", false).ok, true);
  assert.deepEqual(engine.privateView(grey).marks, ["s3"]);
  assert.equal(engine.privateView(ids[1]!).inbox.some((line) => line.includes("標記")), false);

  until(engine, "check");
  assert.equal(engine.publicView().winner, null);

  until(engine, "day_talk");
  assert.equal(engine.submitSuspect(grey, "s4", true).ok, true);
  until(engine, "check");
  assert.equal(engine.publicView().winner?.faction, "grey");
  assert.equal(engine.publicView().seats.find((seat) => seat.id === "s2")?.alive, true);
  assert.equal(engine.getDisconnects(), 0);
});

test("original human reclaims only their taken-over seat", () => {
  const { engine, ids } = table();
  const token = engine.privateView(ids[0]!).reclaimToken;
  const otherToken = engine.privateView(ids[1]!).reclaimToken;
  assert.ok(token);
  assert.notEqual(token, otherToken);
  assert.equal(JSON.stringify(engine.publicView()).includes(token!), false);
  assert.equal(JSON.stringify(engine.privateView(ids[6]!)).includes(token!), false);

  until(engine, "day_talk");
  assert.equal(engine.submitSuspect(ids[0]!, "s3", true).ok, true);
  assert.equal(engine.takeoverAsAi(ids[0]!).ok, true);
  assert.equal(engine.publicView().seats[0]?.isAi, true);

  const missing = engine.reclaim("human-again", "not-a-token");
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, "token_unknown");

  const stolen = engine.reclaim("thief", otherToken!);
  assert.equal(stolen.ok, false);
  if (!stolen.ok) assert.equal(stolen.code, "not_taken");
  assert.equal(engine.publicView().seats[1]?.isAi, false);

  assert.equal(engine.reclaim("human-again", token!).ok, true);
  const seat = engine.publicView().seats[0];
  assert.equal(seat?.isAi, false);
  assert.equal(seat?.nickname, "玩家1");
  const restored = engine.privateView("human-again");
  assert.equal(restored.role?.id, "warrant");
  assert.deepEqual(restored.marks, ["s3"]);
  assert.equal(restored.reclaimToken, token);
  assert.equal(engine.privateView(ids[0]!).seatId, null);
  assert.match(engine.publicView().log.map((line) => line.text).join("\n"), /重新入座/);
});

test("lobby drop cannot be reclaimed", () => {
  const engine = new GameEngine({ rng: () => 0 });
  assert.equal(engine.addPlayer("host", "主持人").ok, true);
  assert.equal(engine.addPlayer("guest", "好友").ok, true);
  const token = engine.privateView("guest").reclaimToken;
  engine.removeLobbyPlayer("guest");
  const result = engine.reclaim("guest-2", token!);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "token_unknown");
});

test("hub reclaim binds the new socket to the old seat", () => {
  const hub = new RoomHub({ timers: false, autoAi: false, rng: () => 0 });
  const seen: ServerMsg[] = [];
  hub.bind("host", (msg) => seen.push(msg));
  hub.handle("host", { type: "create_room", nickname: "主持人" });
  hub.handle("host", { type: "ready" });
  hub.handle("host", { type: "start_game" });
  const started = [...seen].reverse().find((msg) => msg.type === "state");
  assert.ok(started && started.type === "state");
  if (!started || started.type !== "state") return;
  const token = started.private.reclaimToken;
  assert.ok(token);
  hub.disconnect("host");
  hub.bind("host-2", (msg) => seen.push(msg));
  hub.handle("host-2", { type: "reclaim", token: token! });
  const back = hub.snapshot("host-2");
  assert.ok(back && back.type === "state");
  if (back && back.type === "state") {
    assert.equal(back.public.seats[0]?.isAi, false);
    assert.equal(back.public.seats[0]?.nickname, "主持人");
    assert.equal(back.private.role?.id, started.private.role?.id);
    assert.equal(back.private.reclaimToken, token);
  }
  assert.equal(hub.snapshot("host"), null);
});
