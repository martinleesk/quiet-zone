import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "./engine.js";
import { TALK_PHRASES } from "./phrases.js";
import { ROLES } from "./roles.js";
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

const ROLE_IDS = Object.keys(ROLES);

function table(autoAi = false) {
  const engine = new GameEngine({ rng: () => 0, autoAi });
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

function alive(engine: GameEngine, seatId: string): boolean {
  return engine.publicView().seats.find((seat) => seat.id === seatId)?.alive ?? false;
}

test("state machine walks Boot → DayTalk → Draft → Vote → Resolve → Night → Check → DayTalk", () => {
  const { engine } = table();
  const seen: Phase[] = [engine.getPhase()];
  for (let i = 0; i < 7; i++) {
    engine.advance();
    seen.push(engine.getPhase());
  }
  assert.deepEqual(seen, [
    "boot",
    "day_talk",
    "draft",
    "vote",
    "resolve",
    "night",
    "check",
    "day_talk",
  ]);
  assert.equal(engine.getRound(), 2);
  assert.equal(engine.getNight(), 1);
  assert.equal(engine.publicView().winner, null);
});

test("boot hides every role except your own and broadcasts composition only", () => {
  const { engine, ids } = table();
  assert.equal(engine.getPhase(), "boot");
  const pub = engine.publicView();
  assert.deepEqual(pub.composition, { lighthouse: 7, silence: 3, grey: 1 });
  const serialized = JSON.stringify(pub);
  for (const roleId of ROLE_IDS) {
    assert.equal(serialized.includes(`"${roleId}"`), false, roleId);
  }
  for (const seat of pub.seats) {
    assert.equal("faction" in seat, false);
    assert.equal("roleId" in seat, false);
  }
  for (let i = 0; i < ids.length; i++) {
    const view = engine.privateView(ids[i]!);
    assert.equal(view.role?.id, PRESET[i]);
    const blob = JSON.stringify(view);
    for (const roleId of ROLE_IDS) {
      if (roleId === view.role?.id) continue;
      assert.equal(blob.includes(`"${roleId}"`), false, `${roleId} leaked to ${ids[i]}`);
    }
    if (view.role?.faction !== "silence") assert.deepEqual(view.teammates, []);
  }
  const silencer = engine.privateView(ids[1]!);
  assert.equal(silencer.teammates.length, 2);
  assert.ok(silencer.teammates.every((mate) => mate.roleName === "假訊" || mate.roleName === "影燈"));
});

test("tie vote isolates nobody", () => {
  const { engine, ids } = table();
  until(engine, "vote");
  assert.equal(engine.submitVote(ids[0]!, "s5").ok, true);
  assert.equal(engine.submitVote(ids[1]!, "s5").ok, true);
  assert.equal(engine.submitVote(ids[2]!, "s6").ok, true);
  assert.equal(engine.submitVote(ids[3]!, "s6").ok, true);
  for (const id of ids.slice(4)) assert.equal(engine.submitVote(id, null).ok, true);
  engine.advance();
  assert.equal(engine.getPhase(), "resolve");
  assert.match(engine.publicView().banner, /流局/);
  assert.ok(engine.publicView().log.some((line) => line.text.includes("流局")));
  assert.ok(engine.publicView().seats.every((seat) => seat.alive));
});

test("timeouts: empty draft, abstain vote, skipped night", () => {
  const { engine } = table();
  until(engine, "draft");
  engine.advance();
  assert.equal(engine.getPhase(), "vote");
  assert.equal(
    engine.publicView().log.some((line) => line.text.includes("草稿")),
    false,
  );

  engine.advance();
  assert.equal(engine.getPhase(), "resolve");
  assert.match(engine.publicView().banner, /流局/);
  assert.ok(engine.publicView().seats.every((seat) => seat.alive));

  until(engine, "night");
  engine.advance();
  assert.equal(engine.getPhase(), "check");
  assert.equal(engine.getDisconnects(), 0);
  assert.ok(engine.publicView().seats.every((seat) => seat.alive));
  assert.ok(engine.publicView().log.some((line) => line.text.includes("今夜無人失聯")));
});

test("vote isolation stays faction-blind in public and echoes privately", () => {
  const { engine, ids } = table();
  until(engine, "vote");
  for (const id of ids) {
    if (engine.privateView(id).seatId === "s10") continue;
    assert.equal(engine.submitVote(id, "s10").ok, true);
  }
  engine.advance();
  assert.equal(alive(engine, "s10"), false);
  const line = engine.publicView().log.map((entry) => entry.text).find((text) => text.includes("被隔離移出"));
  assert.ok(line);
  assert.doesNotMatch(line!, /燈塔網|消音組|灰頻/);
  assert.match(engine.publicView().banner, /陣營未公開/);
  assert.match(engine.privateView(ids[6]!).inbox.join("\n"), /回波殘片：玩家10 屬於燈塔網/);
  assert.equal(
    engine.privateView(ids[0]!).inbox.some((text) => text.includes("回波殘片")),
    false,
  );
});

test("cover success blocks the next night and is allowed the night after", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.getNight(), 1);
  assert.equal(engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" }).ok, true);
  assert.equal(engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: "s11" }).ok, true);
  engine.advance();
  assert.equal(alive(engine, "s11"), true);
  assert.equal(engine.getDisconnects(), 0);
  assert.match(engine.privateView(ids[4]!).inbox.join("\n"), /掩護成功/);
  assert.match(engine.privateView(ids[1]!).inbox.join("\n"), /未生效/);

  until(engine, "night");
  assert.equal(engine.getNight(), 2);
  assert.equal(engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" }).ok, true);
  assert.equal(engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: "s10" }).ok, true);
  engine.advance();
  assert.match(engine.privateView(ids[4]!).inbox.join("\n"), /掩護冷卻中/);
  assert.equal(alive(engine, "s11"), true);
  assert.equal(alive(engine, "s10"), false);
  assert.equal(engine.getDisconnects(), 1);

  until(engine, "night");
  assert.equal(engine.getNight(), 3);
  assert.equal(engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" }).ok, true);
  engine.advance();
  const coverLines = engine.privateView(ids[4]!).inbox.filter((line) => line.includes("掩護"));
  assert.match(coverLines.at(-1) ?? "", /掩護成功/);
});

test("sweep stub: plant fog once, then a silence trace", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s4" }).ok, true);
  engine.advance();
  assert.match(engine.privateView(ids[5]!).inbox.join("\n"), /影內應|玩家4 訊號乾淨|玩家4 訊號乾淨/);
  assert.match(engine.privateView(ids[5]!).inbox.join("\n"), /訊號乾淨/);

  until(engine, "night");
  assert.equal(engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s4" }).ok, true);
  engine.advance();
  assert.match(engine.privateView(ids[5]!).inbox.join("\n"), /消音痕跡/);

  until(engine, "night");
  assert.equal(engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s10" }).ok, true);
  engine.advance();
  const lines = engine.privateView(ids[5]!).inbox;
  assert.match(lines.at(-1) ?? "", /玩家10 訊號乾淨/);
});

test("seal stub: result card, no speech, vote still allowed", () => {
  const { engine, ids } = table();
  until(engine, "night");
  assert.equal(engine.submitNight(ids[0]!, { action: "seal", targetSeatId: "s8" }).ok, true);
  engine.advance();
  assert.ok(engine.publicView().log.some((line) => line.text.includes("封口卡")));
  until(engine, "day_talk");
  const sealed = engine.publicView().seats.find((seat) => seat.id === "s8");
  assert.equal(sealed?.sealed, true);
  const chat = engine.submitChat(ids[7]!, "我想講嘢。");
  assert.equal(chat.ok, false);
  if (!chat.ok) assert.equal(chat.code, "sealed");
  until(engine, "vote");
  assert.equal(engine.submitVote(ids[7]!, "s5").ok, true);
});

test("grey wins on two correct silence marks even if silence is alive and already has 3 disconnects", () => {
  const { engine, ids } = table();
  const plan: Array<{ mark: string | null; kill: string }> = [
    { mark: "s3", kill: "s10" },
    { mark: null, kill: "s11" },
    { mark: "s4", kill: "s9" },
  ];
  for (const step of plan) {
    until(engine, "night");
    if (step.mark) {
      assert.equal(engine.submitNight(ids[0]!, { action: "mark", targetSeatId: step.mark }).ok, true);
    }
    assert.equal(engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: step.kill }).ok, true);
    engine.advance();
  }
  assert.equal(engine.getPhase(), "check");
  assert.equal(engine.getDisconnects(), 3);
  assert.equal(alive(engine, "s2"), true);
  assert.equal(alive(engine, "s3"), true);
  assert.equal(alive(engine, "s4"), true);
  assert.equal(engine.privateView(ids[1]!).role?.id, "silencer");
  assert.equal(engine.publicView().winner?.faction, "grey");
  assert.match(engine.publicView().winner?.reason ?? "", /灰頻獨贏/);
  engine.advance();
  assert.equal(engine.getPhase(), "ended");
});

test("silence wins on 3 disconnects when grey marks are short", () => {
  const { engine, ids } = table();
  for (const target of ["s10", "s11", "s9"]) {
    until(engine, "night");
    assert.equal(engine.submitNight(ids[0]!, { action: "mark", targetSeatId: "s5" }).ok, true);
    assert.equal(engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: target }).ok, true);
    engine.advance();
  }
  assert.equal(alive(engine, "s1"), true);
  assert.equal(engine.publicView().winner?.faction, "silence");
  assert.match(engine.publicView().winner?.reason ?? "", /成功失聯 3 次/);
});

test("lighthouse wins when every silence seat is isolated and grey is short", () => {
  const { engine, ids } = table();
  for (const target of ["s2", "s3", "s4"]) {
    until(engine, "vote");
    for (const id of ids) {
      const view = engine.privateView(id);
      if (!view.alive || view.seatId === target) continue;
      assert.equal(engine.submitVote(id, target).ok, true);
    }
    engine.advance();
    engine.advance();
    engine.advance();
  }
  assert.equal(engine.getPhase(), "check");
  assert.equal(alive(engine, "s2"), false);
  assert.equal(alive(engine, "s3"), false);
  assert.equal(alive(engine, "s4"), false);
  assert.equal(engine.getDisconnects(), 0);
  assert.equal(engine.publicView().winner?.faction, "lighthouse");
});

test("AI may be 消音手, keeps the badge, talks from the bank, and follows a split as a tie", () => {
  const engine = new GameEngine({ rng: () => 0, autoAi: true });
  assert.equal(engine.addPlayer("host", "主持人").ok, true);
  assert.equal(engine.fillWithAi(), 10);
  assert.equal(engine.start(["civilian", "silencer", "decoy", "plant", "cover", "sweep", "echo", "tip", "link", "civilian", "warrant"]).ok, true);
  const boot = engine.publicView();
  assert.equal(boot.seats.filter((seat) => seat.isAi).length, 10);
  assert.equal(boot.seats[1]?.isAi, true);
  assert.equal(engine.privateView("ai-2").role?.id, "silencer");
  const hostBlob = JSON.stringify(engine.privateView("host"));
  assert.equal(hostBlob.includes('"silencer"'), false);

  engine.advance();
  assert.equal(engine.getPhase(), "day_talk");
  const talked = engine.publicView().log.map((line) => line.text).join("\n");
  assert.ok(TALK_PHRASES.some((phrase) => talked.includes(phrase)));

  const rival = new GameEngine({ rng: () => 0, autoAi: true });
  assert.equal(rival.addPlayer("h1", "甲").ok, true);
  assert.equal(rival.addPlayer("h2", "乙").ok, true);
  assert.equal(rival.fillWithAi(), 9);
  assert.equal(rival.start(PRESET).ok, true);
  until(rival, "vote");
  assert.equal(rival.submitVote("h1", "s3").ok, true);
  assert.equal(rival.submitVote("h2", "s4").ok, true);
  rival.advance();
  assert.equal(rival.getPhase(), "resolve");
  assert.ok(rival.publicView().seats.every((seat) => seat.alive));
  assert.match(rival.publicView().banner, /流局/);

  until(engine, "vote");
  assert.equal(engine.submitVote("host", "s3").ok, true);
  engine.advance();
  assert.equal(engine.publicView().seats.find((seat) => seat.id === "s3")?.alive, false);
  assert.equal(engine.publicView().seats.filter((seat) => seat.isAi).length, 10);
});
