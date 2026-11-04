import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "./domain/roles.js";
import { RoomHub, type ServerMsg } from "./hub.js";

const ROLE_IDS = Object.keys(ROLES);

function lastState(messages: ServerMsg[]): Extract<ServerMsg, { type: "state" }> {
  const state = [...messages].reverse().find((msg) => msg.type === "state");
  assert.ok(state && state.type === "state");
  return state;
}

test("private room: join by code, AI fillers keep a permanent badge, roles stay private", () => {
  const hub = new RoomHub({ timers: false, autoAi: true, rng: () => 0 });
  const seenA: ServerMsg[] = [];
  const seenB: ServerMsg[] = [];
  hub.bind("host", (msg) => seenA.push(msg));
  hub.bind("guest", (msg) => seenB.push(msg));

  hub.handle("guest", { type: "join_room", code: "ZZZZ", nickname: "好友" });
  assert.equal(seenB.at(-1)?.type, "error");
  if (seenB.at(-1)?.type === "error") assert.equal(seenB.at(-1)?.code, "room_not_found");

  hub.handle("host", { type: "create_room", nickname: "主持人" });
  const created = lastState(seenA);
  assert.equal(created.public.phase, "lobby");
  assert.equal(created.public.seats.length, 1);
  assert.equal(created.private.isHost, true);

  hub.handle("guest", { type: "join_room", code: created.public.code.toLowerCase(), nickname: "好友" });
  assert.equal(lastState(seenB).public.seats.length, 2);
  assert.equal(lastState(seenA).public.seats.length, 2);

  hub.handle("guest", { type: "start_game" });
  assert.equal(seenB.at(-1)?.type, "error");
  if (seenB.at(-1)?.type === "error") assert.equal(seenB.at(-1)?.code, "not_host");
  const before = hub.snapshot("host");
  assert.ok(before && before.type === "state");
  assert.equal(before.public.phase, "lobby");

  hub.handle("host", { type: "start_game" });
  const started = lastState(seenA);
  const guestView = lastState(seenB);
  assert.equal(started.public.phase, "boot");
  assert.equal(started.public.seats.length, 11);
  assert.equal(started.public.seats.filter((seat) => seat.isAi).length, 9);
  assert.deepEqual(started.public.composition, { lighthouse: 7, silence: 3, grey: 1 });
  assert.ok(started.private.role);
  assert.ok(guestView.private.role);
  assert.notEqual(started.private.role?.id, guestView.private.role?.id);
  const pub = JSON.stringify(started.public);
  for (const roleId of ROLE_IDS) assert.equal(pub.includes(`"${roleId}"`), false);
  const guestBlob = JSON.stringify(guestView.private);
  if (guestView.private.role) {
    for (const roleId of ROLE_IDS) {
      if (roleId === guestView.private.role.id) continue;
      assert.equal(guestBlob.includes(`"${roleId}"`), false);
    }
  }

  hub.handle("host", { type: "ready" });
  assert.equal(lastState(seenA).public.phase, "boot");
  hub.handle("guest", { type: "ready" });
  const day = lastState(seenA);
  assert.equal(day.public.phase, "day_talk");
  assert.equal(day.public.seats.filter((seat) => seat.isAi).length, 9);
  assert.ok(day.public.seats.filter((seat) => seat.isAi).every((seat) => seat.isAi));
});
