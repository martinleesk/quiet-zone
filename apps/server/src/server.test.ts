import assert from "node:assert/strict";
import { type AddressInfo } from "node:net";
import test from "node:test";
import { WebSocket } from "ws";
import { createGameServer } from "./server.js";

test("health and websocket create / join / start", async () => {
  const game = createGameServer({ timers: false, autoAi: true, rng: () => 0 });
  await new Promise<void>((resolve) => game.http.listen(0, "127.0.0.1", () => resolve()));
  const port = (game.http.address() as AddressInfo).port;
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    const body = (await health.json()) as { ok: boolean; ruleset: string };
    assert.equal(body.ok, true);
    assert.equal(body.ruleset, "standard-mvp-2026-11-04");

    const host = await open(`ws://127.0.0.1:${port}/ws`);
    host.socket.send(JSON.stringify({ type: "create_room", nickname: "主持人" }));
    const created = await host.nextState();
    assert.equal(created.public.phase, "lobby");
    assert.equal(created.public.code.length, 4);

    const guest = await open(`ws://127.0.0.1:${port}/ws`);
    guest.socket.send(JSON.stringify({ type: "join_room", code: created.public.code, nickname: "好友" }));
    const joined = await guest.nextState();
    assert.equal(joined.public.seats.length, 2);
    assert.equal(joined.private.isHost, false);
    const hostSawJoin = await host.nextState();
    assert.equal(hostSawJoin.public.seats.length, 2);

    guest.socket.send(JSON.stringify({ type: "start_game" }));
    const denied = await guest.next();
    assert.equal(denied.type, "error");

    host.socket.send(JSON.stringify({ type: "ready" }));
    await host.nextState();
    guest.socket.send(JSON.stringify({ type: "ready" }));
    await guest.nextState();
    await host.nextState();

    host.socket.send(JSON.stringify({ type: "start_game" }));
    const started = await host.nextState();
    assert.equal(started.public.seats.length, 11);
    assert.equal(started.public.seats.filter((seat) => seat.isAi).length, 9);
    assert.equal(started.public.composition.silence, 3);
    assert.ok(started.private.role);
    assert.equal(JSON.stringify(started.public).includes(`"${started.private.role?.id}"`), false);

    host.close();
    guest.close();
  } finally {
    await new Promise<void>((resolve, reject) => {
      game.wss.close((error) => (error ? reject(error) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      game.http.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

interface Client {
  socket: WebSocket;
  next: () => Promise<{ type: string; public?: { phase: string; code: string; seats: Array<{ isAi: boolean }>; composition: { silence: number } }; private?: { isHost: boolean; role: { id: string } | null }; code?: string }>;
  nextState: () => Promise<{ public: { phase: string; code: string; seats: Array<{ isAi: boolean }>; composition: { silence: number } }; private: { isHost: boolean; role: { id: string } | null } }>;
  close: () => void;
}

function open(url: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const queue: Array<{ type: string }> = [];
    let waiter: ((msg: { type: string }) => void) | null = null;
    const push = (msg: { type: string }) => {
      if (waiter) {
        const next = waiter;
        waiter = null;
        next(msg);
      } else queue.push(msg);
    };
    socket.on("message", (data) => {
      push(JSON.parse(data.toString()) as { type: string });
    });
    socket.on("error", reject);
    socket.on("open", () => {
      const client: Client = {
        socket,
        next: () =>
          new Promise((done) => {
            const queued = queue.shift();
            if (queued) done(queued as Awaited<ReturnType<Client["next"]>>);
            else waiter = (msg) => done(msg as Awaited<ReturnType<Client["next"]>>);
          }),
        nextState: async () => {
          const msg = await client.next();
          assert.equal(msg.type, "state");
          return msg as Awaited<ReturnType<Client["nextState"]>>;
        },
        close: () => socket.close(),
      };
      resolve(client);
    });
  });
}
