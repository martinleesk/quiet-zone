import express from "express";

/**
 * Quiet Zone — authoritative server skeleton.
 * Locked stack: TypeScript on Node.js + Express (Martin 2026-11-04).
 *
 * TODO (not in this stub):
 * - Room / matchmaking
 * - Game state machine (day / draft / vote / night)
 * - Auth + private role assignment
 *
 * WebSocket stub (comment only — do not install ws yet unless needed):
 *   // import { WebSocketServer } from "ws";
 *   // const wss = new WebSocketServer({ server: httpServer });
 *   // wss.on("connection", (socket) => { ... room join / leave ... });
 * Prefer attaching WS to the same HTTP server after `app.listen`.
 */

const PORT = Number(process.env.PORT ?? 8787);
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "quiet-zone-server",
    stack: "node+express+typescript",
  });
});

app.get("/", (_req, res) => {
  res.type("text").send("quiet-zone server — hello (authoritative stub)");
});

app.listen(PORT, () => {
  console.log(`[quiet-zone] listening on http://127.0.0.1:${PORT}`);
});
