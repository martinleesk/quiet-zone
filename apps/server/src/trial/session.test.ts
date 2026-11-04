import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ROLES } from "../domain/roles.js";
import type { ServerMsg } from "../hub.js";
import { createTrialSession } from "./session.js";

const ROLE_IDS = Object.keys(ROLES);
const here = dirname(fileURLToPath(import.meta.url));

function waitFor(check: () => boolean, label: string): Promise<void> {
  const started = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      if (check()) {
        resolvePromise();
        return;
      }
      if (Date.now() - started > 2000) {
        reject(new Error(`timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 15);
    };
    tick();
  });
}

test("solo trial fills 11 seats and plays a day into night", async () => {
  const seen: ServerMsg[] = [];
  const session = createTrialSession((message) => seen.push(message), {
    rng: () => 0.42,
    phaseMs: {
      boot: 5000,
      day_talk: 5000,
      draft: 5000,
      vote: 5000,
      resolve: 30,
      night: 5000,
      check: 30,
    },
  });

  const latest = () => {
    const state = [...seen].reverse().find((message) => message.type === "state");
    assert.ok(state && state.type === "state");
    return state;
  };

  try {
    session.send({ type: "create_room", nickname: "夜歸人" });
    const lobby = latest();
    assert.equal(lobby.public.phase, "lobby");
    assert.equal(lobby.public.seats.length, 11);
    assert.equal(lobby.public.seats.filter((seat) => seat.isAi).length, 10);
    assert.equal(lobby.public.seats[0]?.isAi, false);
    assert.equal(lobby.public.seats[0]?.nickname, "夜歸人");
    assert.equal(lobby.private.isHost, true);
    assert.ok(lobby.private.role, "trial lobby shows the dealt role before start");
    const lobbyPub = JSON.stringify(lobby.public);
    for (const roleId of ROLE_IDS) assert.equal(lobbyPub.includes(`"${roleId}"`), false);
    assert.equal(lobby.public.composition.lighthouse, 7);
    assert.equal(lobby.public.composition.silence, 3);
    assert.equal(lobby.public.composition.grey, 1);

    session.send({ type: "start_game" });
    assert.equal(latest().type === "state" ? latest().public.phase : "", "lobby");
    const blocked = seen.at(-1);
    assert.equal(blocked?.type, "error");
    if (blocked?.type === "error") assert.equal(blocked.code, "not_ready");

    session.send({ type: "ready" });
    session.send({ type: "start_game" });
    assert.equal(latest().public.phase, "boot");
    assert.equal(latest().public.locked, true);
    assert.ok(latest().private.role);
    const dealt = latest().private.role?.id ?? "";
    const pub = JSON.stringify(latest().public);
    for (const roleId of ROLE_IDS) assert.equal(pub.includes(`"${roleId}"`), false);

    session.send({ type: "ready" });
    assert.equal(latest().public.phase, "day_talk");
    session.send({ type: "chat", text: "我暫時未有實錘。" });
    assert.ok(latest().public.log.some((line) => line.text.includes("夜歸人：我暫時未有實錘。")));
    session.send({ type: "ready" });
    assert.equal(latest().public.phase, "draft");

    const draft = "試玩草稿：先聽完再隔離。";
    session.send({ type: "draft", text: draft });
    session.send({ type: "ready" });
    const vote = latest();
    assert.equal(vote.public.phase, "vote");
    assert.ok(vote.public.log.some((line) => line.text.includes(draft)));

    const target = vote.public.seats.find((seat) => seat.alive && seat.id !== vote.private.seatId);
    assert.ok(target);
    session.send({ type: "vote", targetSeatId: target.id });
    session.send({ type: "ready" });
    assert.equal(latest().public.phase, "resolve");

    await waitFor(() => latest().public.phase === "night", "night");
    const night = latest();
    assert.equal(night.public.night, 1);
    assert.equal(night.private.role?.id, dealt);
    const choice = night.private.nightActions.find((action) => action.action === "skip") ?? night.private.nightActions[0];
    if (choice) {
      const nightTarget = night.public.seats.find((seat) => seat.alive && (choice.action === "cover" || seat.id !== night.private.seatId));
      session.send({
        type: "night_action",
        action: choice.action,
        targetSeatId: choice.needsTarget ? nightTarget?.id : undefined,
      });
    }
    session.send({ type: "ready" });
    await waitFor(() => {
      const phase = latest().public.phase;
      return phase === "day_talk" || phase === "ended";
    }, "next day or end");
    const after = latest();
    assert.ok(after.public.phase === "day_talk" || after.public.phase === "ended");
    if (after.public.phase === "ended") {
      assert.ok(after.public.winner);
      assert.ok(after.public.reveal && after.public.reveal.length === 11);
    }
  } finally {
    session.close();
  }
});

test("browser bundle exposes the trial session", () => {
  const source = readFileSync(resolve(here, "../../../../docs/trial/engine.js"), "utf8");
  const sandbox: { QuietZoneTrial?: { open: Function; send: Function; close: Function } } = {};
  const context = createContext({
    ...sandbox,
    console,
    setTimeout,
    clearTimeout,
    crypto,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    globalThis: undefined as unknown,
  });
  context.globalThis = context;
  runInContext(source, context);
  assert.equal(typeof context.QuietZoneTrial?.open, "function");
  assert.equal(typeof context.QuietZoneTrial?.send, "function");
  assert.equal(typeof context.QuietZoneTrial?.close, "function");
  const seen: string[] = [];
  context.QuietZoneTrial?.open((json: string) => seen.push(json));
  context.QuietZoneTrial?.send(JSON.stringify({ type: "create_room", nickname: "夜歸人" }));
  const message = JSON.parse(seen.at(-1) ?? "{}") as { type?: string; public?: { seats?: Array<{ isAi?: boolean }> } };
  assert.equal(message.type, "state");
  assert.equal(message.public?.seats?.length, 11);
  assert.equal(message.public?.seats?.filter((seat) => seat.isAi).length, 10);
  context.QuietZoneTrial?.close();
});
