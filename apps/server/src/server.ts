import express from "express";
import { createServer as createHttpServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { RULES } from "./config/rules.js";
import { RoomHub, type HubOptions } from "./hub.js";

export interface GameServer {
  app: express.Express;
  http: Server;
  wss: WebSocketServer;
  hub: RoomHub;
}

export function createGameServer(opts: HubOptions = {}): GameServer {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "quiet-zone-server",
      stack: "node+express+typescript",
      ruleset: RULES.id,
    });
  });

  app.get("/rules", (_req, res) => {
    res.json(RULES);
  });

  app.get("/", (_req, res) => {
    res.type("text").send("quiet-zone server — standard mode");
  });

  const http = createHttpServer(app);
  const wss = new WebSocketServer({ server: http, path: "/ws" });
  const hub = new RoomHub({ autoAi: true, timers: true, ...opts });

  wss.on("connection", (socket) => {
    const playerId = randomUUID();
    hub.bind(playerId, (msg) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    });
    socket.on("message", (data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        socket.send(JSON.stringify({ type: "error", code: "bad_message", message: "訊息格式唔正確。" }));
        return;
      }
      hub.handle(playerId, parsed);
    });
    socket.on("close", () => {
      hub.disconnect(playerId);
    });
  });

  return { app, http, wss, hub };
}
