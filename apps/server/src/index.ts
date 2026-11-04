import { RULES } from "./config/rules.js";
import type { Phase } from "./domain/types.js";
import { createGameServer } from "./server.js";

/**
 * Quiet Zone authoritative server.
 * Standard Mode only. Roles, votes, and win checks stay in GameEngine.
 */
const PORT = Number(process.env.PORT ?? 8787);
const FAST = process.env.QZ_FAST === "1";

function phaseMs(phase: Phase): number | null {
  if (!(phase in RULES.phaseMs)) return null;
  const base = RULES.phaseMs[phase as keyof typeof RULES.phaseMs];
  return FAST ? Math.min(base, 1200) : base;
}

const { http } = createGameServer({ timers: true, autoAi: true, phaseMs });

http.listen(PORT, () => {
  console.log(`[quiet-zone] listening on http://127.0.0.1:${PORT}`);
  console.log(`[quiet-zone] websocket ws://127.0.0.1:${PORT}/ws`);
  if (FAST) console.log("[quiet-zone] QZ_FAST=1 short phase timers");
});
