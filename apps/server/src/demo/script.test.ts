import assert from "node:assert/strict";
import test from "node:test";
import { runScriptedDemo } from "./script.js";

test("scripted loop shows tie, cooldown, private echo, seal, and grey-first win", () => {
  const lines = runScriptedDemo();
  const text = lines.join("\n");
  assert.match(text, /流局/);
  assert.match(text, /掩護冷卻中|冷卻/);
  assert.match(text, /封口/);
  assert.match(text, /訊號乾淨/);
  assert.match(text, /消音痕跡/);
  assert.match(text, /回波/);
  assert.match(text, /灰頻獨贏/);
  assert.match(text, /消音手仍然在場/);
  assert.match(text, /終局：灰頻/);
});
