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

function nextDay(engine: GameEngine) {
  assert.equal(engine.getPhase(), "day_talk");
  engine.advance();
  until(engine, "day_talk");
}

test("線報員 pins one public line per day and can still speak", () => {
  const { engine, ids } = table();
  until(engine, "day_talk");
  const tip = ids[7]!;
  assert.equal(engine.submitPin(tip, "s2 今夜有動靜").ok, true);
  assert.equal(engine.publicView().pins.length, 1);
  assert.equal(engine.publicView().pins[0]?.unverified, false);
  assert.match(engine.publicView().log.map((line) => line.text).join("\n"), /釘選｜玩家8：s2 今夜有動靜/);
  assert.equal(engine.submitChat(tip, "釘完我仲可以講。").ok, true);
  const again = engine.submitPin(tip, "第二釘");
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.code, "pin_spent");

  nextDay(engine);
  assert.equal(engine.getRound(), 2);
  assert.equal(engine.submitPin(tip, "第二輪先再釘").ok, true);
  assert.equal(engine.publicView().pins.length, 2);
});

test("通聯官 reports whether last round used a skill, without naming it", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s10" }).ok, true);
  engine.advance();
  until(engine, "day_talk");
  assert.equal(engine.getRound(), 2);
  const link = ids[8]!;
  assert.equal(engine.submitLink(link, "s6").ok, true);
  const inbox = engine.privateView(link).inbox.join("\n");
  assert.match(inbox, /通聯：玩家6 上回合用過主動技能/);
  assert.doesNotMatch(inbox, /掃頻|失聯|釘選|掩護|封口/);
  const second = engine.submitLink(link, "s8");
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, "link_spent");
  assert.equal(engine.privateView(ids[0]!).inbox.some((line) => line.includes("通聯")), false);

  nextDay(engine);
  assert.equal(engine.submitLink(link, "s8").ok, true);
  assert.match(engine.privateView(link).inbox.join("\n"), /通聯：玩家8 上回合未用過主動技能/);
});

test("假訊員 has two charges: flag a pin or plant an unattributed line", () => {
  const { engine, ids } = table();
  until(engine, "day_talk");
  assert.equal(engine.submitPin(ids[7]!, "真釘").ok, true);
  const pinId = engine.publicView().pins[0]!.id;
  const decoy = ids[2]!;
  assert.equal(engine.privateView(decoy).fakeCharges, 2);
  assert.equal(engine.submitFake(decoy, { mode: "flag", pinId }).ok, true);
  assert.equal(engine.publicView().pins[0]?.unverified, true);
  const flagged = engine.publicView().log.map((line) => line.text).find((text) => text.includes("待核實"));
  assert.ok(flagged);
  assert.doesNotMatch(flagged!, /玩家3/);
  assert.equal(engine.submitFake(decoy, { mode: "plant", text: "呢席唔乾淨。" }).ok, true);
  const planted = engine.publicView().log.map((line) => line.text).find((text) => text.startsWith("來源未核"));
  assert.equal(planted, "來源未核：呢席唔乾淨。");
  assert.equal(engine.privateView(decoy).fakeCharges, 0);
  const spent = engine.submitFake(decoy, { mode: "plant", text: "第三次" });
  assert.equal(spent.ok, false);
  if (!spent.ok) assert.equal(spent.code, "quota");

  until(engine, "night");
  const night = engine.submitFake(decoy, { mode: "plant", text: "熄燈都唔夠額" });
  assert.equal(night.ok, false);
});

test("影內應 anonymous vote hides the voter once and still counts", () => {
  const { engine, ids } = table();
  until(engine, "vote");
  const plant = ids[3]!;
  assert.equal(engine.privateView(plant).anonymousVote, true);
  assert.equal(engine.submitVote(plant, "s5", true).ok, true);
  assert.equal(engine.submitVote(ids[0]!, "s5").ok, true);
  for (const id of ids) {
    if (id === plant || id === ids[0]) continue;
    engine.submitVote(id, null);
  }
  engine.advance();
  const book = engine.publicView().log.map((line) => line.text).find((text) => text.startsWith("票簿"));
  assert.ok(book);
  assert.match(book!, /匿名 → s5/);
  assert.match(book!, /玩家1 → s5/);
  assert.doesNotMatch(book!, /玩家4/);
  assert.equal(engine.publicView().seats.find((seat) => seat.id === "s5")?.alive, false);

  until(engine, "vote");
  const again = engine.submitVote(plant, "s6", true);
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.code, "anonymous_spent");
  assert.equal(engine.submitVote(plant, "s6").ok, true);
  engine.advance();
  const named = engine.publicView().log.map((line) => line.text).filter((text) => text.startsWith("票簿")).at(-1) ?? "";
  assert.match(named, /玩家4 → s6/);
});

test("disconnect takeover keeps role, inbox, marks, and cover cooldown, and shows the badge", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.submitNight(ids[0]!, { action: "mark", targetSeatId: "s3" }).ok, true);
  assert.equal(engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" }).ok, true);
  assert.equal(engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s10" }).ok, true);
  engine.advance();
  const before = engine.privateView(ids[4]!);
  assert.match(before.inbox.join("\n"), /掩護成功/);

  assert.equal(engine.takeoverAsAi(ids[0]!).ok, true);
  assert.equal(engine.takeoverAsAi(ids[4]!).ok, true);
  assert.equal(engine.takeoverAsAi(ids[5]!).ok, true);
  const pub = engine.publicView();
  assert.equal(pub.seats.find((seat) => seat.id === "s1")?.isAi, true);
  assert.equal(pub.seats.find((seat) => seat.id === "s5")?.isAi, true);
  assert.equal(pub.seats.find((seat) => seat.id === "s6")?.isAi, true);
  assert.match(pub.log.map((line) => line.text).join("\n"), /斷線，AI 接管同一席/);

  const warrant = engine.privateView(ids[0]!);
  assert.equal(warrant.role?.id, "warrant");
  assert.deepEqual(warrant.marks, ["s3"]);
  const cover = engine.privateView(ids[4]!);
  assert.equal(cover.role?.id, "cover");
  assert.match(cover.inbox.join("\n"), /掩護成功/);
  const sweep = engine.privateView(ids[5]!);
  assert.match(sweep.inbox.join("\n"), /訊號乾淨/);

  const other = JSON.stringify(engine.privateView(ids[6]!));
  assert.equal(other.includes('"warrant"'), false);
  assert.equal(other.includes('"cover"'), false);

  until(engine, "night");
  assert.equal(engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" }).ok, true);
  engine.advance();
  assert.match(engine.privateView(ids[4]!).inbox.join("\n"), /掩護冷卻中/);
});
