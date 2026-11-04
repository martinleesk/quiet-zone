import { parseCatalog } from "./catalog.js";
import { createMatch, type Command, type Match } from "./engine.js";
import cards from "../../../../docs/signal/cards.json" with { type: "json" };
import table from "../../../../docs/signal/table.json" with { type: "json" };

/**
 * Browser bundle. The page and the Flutter web trial talk JSON only.
 * AI still acts inside the match; this file only forwards clocks and commands.
 */

interface BrowserOptions {
  seed?: number;
  name?: string;
  fast?: boolean;
  at?: "play" | "vote";
}

let current: { match: Match; listener: (json: string) => void; timer: ReturnType<typeof setInterval> | null } | null =
  null;

function emit(kind: "state" | "error", extra?: { text: string }): void {
  if (!current) return;
  if (kind === "error") {
    current.listener(JSON.stringify({ type: "error", text: extra?.text ?? "" }));
    return;
  }
  current.listener(JSON.stringify({ type: "state", view: current.match.view() }));
}

export function open(listener: (json: string) => void, optionsJson?: string): void {
  close();
  let options: BrowserOptions = {};
  if (optionsJson) {
    try {
      const parsed = JSON.parse(optionsJson) as BrowserOptions;
      if (parsed && typeof parsed === "object") options = parsed;
    } catch {
      options = {};
    }
  }
  const match = createMatch(parseCatalog(cards, table), {
    seed: options.seed,
    name: options.name,
    fast: options.fast === true,
    at: options.at,
    now: Date.now(),
  });
  current = { match, listener, timer: null };
  emit("state");
  current.timer = setInterval(() => {
    if (!current) return;
    const before = current.match.view().version;
    current.match.tick(Date.now());
    if (current.match.view().version !== before) emit("state");
  }, 250);
}

export function send(json: string): void {
  if (!current) return;
  let command: Command;
  try {
    command = JSON.parse(json) as Command;
  } catch {
    emit("error", { text: "唔明呢一下" });
    return;
  }
  const result = current.match.command(command);
  if (!result.ok) emit("error", { text: result.error });
  emit("state");
}

export function close(): void {
  if (current?.timer) clearInterval(current.timer);
  current = null;
}
