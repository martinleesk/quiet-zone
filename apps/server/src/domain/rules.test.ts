import assert from "node:assert/strict";
import test from "node:test";
import { RULES } from "../config/rules.js";
import { ROLES, STANDARD_DEAL } from "./roles.js";

test("locked MVP constants stay on the server config", () => {
  assert.equal(RULES.tieVote, "no_isolation");
  assert.deepEqual(RULES.timeouts, { draft: "empty", vote: "abstain", night: "skip" });
  assert.equal(RULES.ai.mayDrawSilencer, true);
  assert.equal(RULES.ai.behavior, "template_phrase_bank_follow_majority");
  assert.equal(RULES.ai.badgePermanent, true);
  assert.equal(RULES.seal.speech, false);
  assert.equal(RULES.seal.vote, true);
  assert.equal(RULES.silenceWin.players, 11);
  assert.equal(RULES.silenceWin.successfulDisconnects, 3);
  assert.equal(RULES.isolation.revealFaction, false);
  assert.equal(RULES.isolation.echoRemnant, "private");
  assert.equal(RULES.cover.successCountsAsTurn, 1);
  assert.equal(RULES.cover.blockedFollowingTurns, 1);
  assert.equal(RULES.greyWin.minCorrectSilenceMarks, 2);
  assert.equal(RULES.greyWin.priority, "before_silence_and_lighthouse");
  assert.deepEqual(RULES.composition, { lighthouse: 7, silence: 3, grey: 1 });
  assert.deepEqual(RULES.phases, ["boot", "day_talk", "draft", "vote", "resolve", "night", "check"]);
});

test("standard pool is 7 / 3 / 1 and includes 消音手", () => {
  assert.equal(STANDARD_DEAL.length, 11);
  const counts = { lighthouse: 0, silence: 0, grey: 0 };
  for (const id of STANDARD_DEAL) counts[ROLES[id].faction] += 1;
  assert.deepEqual(counts, { lighthouse: 7, silence: 3, grey: 1 });
  assert.ok(STANDARD_DEAL.includes("silencer"));
});
