import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSimBatch, writeSimFiles } from "./batch.js";

const here = dirname(fileURLToPath(import.meta.url));
const defaultOut = resolve(here, "../../../../docs/trial/logs/latest.jsonl");

const games = numberArg("games", 10);
const seed = numberArg("seed", 20261104);
const out = stringArg("out", defaultOut);

const batch = runSimBatch(games, seed, (index, game) => {
  const faction = game.winnerFaction ?? "unfinished";
  console.log(
    `sim ${index + 1}/${games} ${faction} rounds=${game.rounds} nights=${game.nights} disconnects=${game.disconnects} silencer=${game.silencerPersonaId ?? "-"} seed=${game.seed}`,
  );
});

const written = writeSimFiles(out, batch);
console.log("---");
console.log(JSON.stringify(batch.summary, null, 2));
console.log(`wrote ${written.jsonlPath}`);
console.log(`wrote ${written.summaryPath}`);

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function stringArg(name: string, fallback: string): string {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : fallback;
}
