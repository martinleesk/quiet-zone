import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "./engine.js";
import { SILENCE_TEMPLATES } from "./phrases.js";
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

test("host start waits for every human, then AI fills and the room locks", () => {
  const engine = new GameEngine({ rng: () => 0 });
  assert.equal(engine.addPlayer("host", "主持人").ok, true);
  assert.equal(engine.addPlayer("guest", "好友").ok, true);
  const early = engine.start(undefined, { enforceLobbyReady: true });
  assert.equal(early.ok, false);
  if (!early.ok) assert.equal(early.code, "not_ready");
  assert.equal(engine.getPhase(), "lobby");
  assert.equal(engine.publicView().seats.length, 2);

  assert.equal(engine.setLobbyReady("host", true).ok, true);
  const still = engine.start(undefined, { enforceLobbyReady: true });
  assert.equal(still.ok, false);
  if (!still.ok) assert.equal(still.code, "not_ready");

  assert.equal(engine.setLobbyReady("guest", true).ok, true);
  assert.equal(engine.start(undefined, { enforceLobbyReady: true }).ok, true);
  const pub = engine.publicView();
  assert.equal(pub.phase, "boot");
  assert.equal(pub.locked, true);
  assert.equal(pub.seats.length, 11);
  assert.equal(pub.seats.filter((seat) => seat.isAi).length, 9);
  assert.equal(pub.seats.find((seat) => seat.nickname === "好友")?.lobbyReady, true);
  const joined = engine.addPlayer("late", "遲咗");
  assert.equal(joined.ok, false);
  if (!joined.ok) assert.equal(joined.code, "already_started");
  const relock = engine.setLobbyReady("host", false);
  assert.equal(relock.ok, false);
  if (!relock.ok) assert.equal(relock.code, "locked");
});

test("silence night lines stay on the private channel and must be templates", () => {
  const engine = new GameEngine({ rng: () => 0, autoAi: false });
  const ids: string[] = [];
  for (let i = 0; i < 11; i++) {
    const id = `p${i}`;
    ids.push(id);
    engine.addPlayer(id, `玩家${i + 1}`);
    engine.setLobbyReady(id, true);
  }
  assert.equal(engine.start(PRESET, { enforceLobbyReady: true }).ok, true);
  for (let i = 0; i < 5; i++) engine.advance();
  assert.equal(engine.getPhase(), "night");

  const silencer = ids[1]!;
  const lighthouse = ids[4]!;
  const line = SILENCE_TEMPLATES[0]!;
  const free = engine.submitSilence(silencer, "我自己寫一句。");
  assert.equal(free.ok, false);
  if (!free.ok) assert.equal(free.code, "template_only");
  const outsider = engine.submitSilence(lighthouse, line);
  assert.equal(outsider.ok, false);
  if (!outsider.ok) assert.equal(outsider.code, "not_your_skill");
  assert.equal(engine.submitSilence(silencer, line).ok, true);
  assert.equal(engine.submitSilence(ids[2]!, SILENCE_TEMPLATES[2]!).ok, true);

  const channel = engine.privateView(silencer).silenceChannel.map((note) => note.text).join("\n");
  assert.match(channel, new RegExp(line));
  assert.equal(engine.privateView(lighthouse).silenceChannel.length, 0);
  assert.equal(JSON.stringify(engine.publicView()).includes(line), false);
  assert.equal(engine.privateView(ids[3]!).silenceChannel.length, 2);
});

test("phase tips are short payloads and grey marks are only for 孤證客", () => {
  const engine = new GameEngine({ rng: () => 0 });
  assert.equal(engine.addPlayer("host", "主持人").ok, true);
  engine.setLobbyReady("host", true);
  engine.start(PRESET);
  engine.advance();
  assert.equal(engine.getPhase(), "day_talk");
  const day = engine.privateView("host");
  assert.ok(day.tips.some((tip) => tip.id === "day_talk"));
  assert.equal(day.tips.some((tip) => tip.id === "grey_marks"), day.role?.id === "warrant");
  for (let i = 0; i < 2; i++) engine.advance();
  assert.equal(engine.getPhase(), "vote");
  assert.ok(engine.privateView("host").tips.some((tip) => tip.id === "vote"));
});
