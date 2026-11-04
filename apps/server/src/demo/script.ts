import { GameEngine } from "../domain/engine.js";
import { FACTION_LABEL, ROLES } from "../domain/roles.js";
import type { RoleId } from "../domain/types.js";

const NAMES = ["抽樣官", "封鎖線", "假訊", "影內", "掩護", "掃頻", "回波", "線報", "通聯", "閒職甲", "閒職乙"];
const DEAL: RoleId[] = [
  "warrant",
  "silencer",
  "decoy",
  "plant",
  "cover",
  "sweep",
  "echo",
  "tip",
  "link",
  "civilian",
  "civilian",
];

/**
 * Deterministic server-side walkthrough of one standard-mode loop.
 * Prints a GM transcript. Clients would only receive their own private view.
 */
export function runScriptedDemo(): string[] {
  const engine = new GameEngine({ rng: () => 0, autoAi: false });
  const ids = NAMES.map((_, index) => `p${index}`);
  for (let i = 0; i < ids.length; i++) {
    const joined = engine.addPlayer(ids[i]!, NAMES[i]!);
    if (!joined.ok) throw new Error(joined.message);
  }
  const started = engine.start(DEAL);
  if (!started.ok) throw new Error(started.message);

  const lines: string[] = [];
  const say = (line: string) => lines.push(line);
  let logCursor = 0;

  const flushPublic = (title: string) => {
    const view = engine.publicView();
    say("");
    say(`—— ${title}｜${view.phaseLabel}｜${view.banner}`);
    for (const entry of view.log.slice(logCursor)) say(`  [公開] ${entry.text}`);
    logCursor = view.log.length;
  };

  say("消音區・封鎖夜｜標準 Mode 示範腳本（伺服器 GM 視角）");
  say("客戶端只會收到自己嘅身分。下面嘅座位表係示範腳本先睇到。");
  for (let i = 0; i < ids.length; i++) {
    const role = engine.privateView(ids[i]!).role;
    if (!role) throw new Error("missing role");
    say(`  ${engine.publicView().seats[i]!.id} ${NAMES[i]}｜${role.name}｜${role.factionLabel}`);
  }
  const bootPublic = JSON.stringify(engine.publicView());
  if (bootPublic.includes('"silencer"') || bootPublic.includes('"warrant"')) {
    throw new Error("public boot snapshot leaked a role id");
  }

  engine.advance();
  engine.submitChat(ids[6]!, "我未有實錘，想先聽短句。");
  engine.submitChat(ids[4]!, "隔離要小心。");
  engine.advance();
  engine.submitDraft(ids[0]!, "我今夜會自己記低。");
  engine.submitDraft(ids[7]!, "");
  engine.advance();
  engine.submitVote(ids[0]!, "s5");
  engine.submitVote(ids[1]!, "s5");
  engine.submitVote(ids[2]!, "s6");
  engine.submitVote(ids[3]!, "s6");
  engine.advance();
  if (!engine.publicView().log.some((line) => line.text.includes("流局"))) throw new Error("expected tie");
  if (!engine.publicView().seats.every((seat) => seat.alive)) throw new Error("tie isolated someone");
  flushPublic("第 1 輪投票（平票）");

  engine.advance();
  if (engine.getNight() !== 1) throw new Error("night counter");
  engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" });
  engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: "s11" });
  engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s4" });
  engine.submitNight(ids[0]!, { action: "mark", targetSeatId: "s3" });
  engine.advance();
  if (engine.getDisconnects() !== 0) throw new Error("cover should block disconnect");
  if (!engine.privateView(ids[4]!).inbox.some((line) => line.includes("掩護成功"))) throw new Error("cover success");
  if (!engine.privateView(ids[5]!).inbox.some((line) => line.includes("訊號乾淨"))) throw new Error("plant fog");
  flushPublic("第 1 夜（掩護擋失聯）");
  say(`  [私下 掩護] ${engine.privateView(ids[4]!).inbox.at(-1)}`);
  say(`  [私下 掃頻] ${engine.privateView(ids[5]!).inbox.at(-1)}`);
  say(`  [私下 孤證客] ${engine.privateView(ids[0]!).inbox.at(-1)}`);

  engine.advance();
  engine.advance();
  engine.advance();
  for (const id of ids) {
    if (engine.privateView(id).seatId === "s10") continue;
    const voted = engine.submitVote(id, "s10");
    if (!voted.ok) throw new Error(voted.message);
  }
  engine.advance();
  const isolated = engine.publicView().log.map((line) => line.text).find((text) => text.includes("被隔離移出"));
  if (!isolated) throw new Error("missing isolation");
  if (/燈塔網|消音組|灰頻/.test(isolated)) throw new Error("public isolation revealed a faction");
  const echo = engine.privateView(ids[6]!).inbox.join("\n");
  if (!echo.includes("燈塔網")) throw new Error("echo remnant missing");
  if (engine.privateView(ids[1]!).inbox.some((line) => line.includes("回波殘片"))) throw new Error("echo leaked");
  flushPublic("第 2 輪隔離（公開唔講陣營）");
  say(`  [私下 回波] ${engine.privateView(ids[6]!).inbox.at(-1)}`);

  engine.advance();
  engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" });
  engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: "s9" });
  engine.submitNight(ids[5]!, { action: "sweep", targetSeatId: "s4" });
  engine.submitNight(ids[0]!, { action: "seal", targetSeatId: "s8" });
  engine.advance();
  if (!engine.privateView(ids[4]!).inbox.some((line) => line.includes("掩護冷卻中"))) throw new Error("cooldown");
  if (engine.getDisconnects() !== 1) throw new Error("disconnect count");
  if (!engine.publicView().log.some((line) => line.text.includes("封口卡"))) throw new Error("seal card");
  if (!engine.privateView(ids[5]!).inbox.some((line) => line.includes("消音痕跡"))) throw new Error("sweep trace");
  flushPublic("第 2 夜（冷卻、失聯、封口卡）");
  say(`  [私下 掩護] ${engine.privateView(ids[4]!).inbox.filter((line) => line.includes("掩護")).at(-1)}`);
  say(`  [私下 掃頻] ${engine.privateView(ids[5]!).inbox.filter((line) => line.includes("掃頻")).at(-1)}`);

  engine.advance();
  const sealedChat = engine.submitChat(ids[7]!, "我被封口都想講。");
  if (sealedChat.ok) throw new Error("sealed player spoke");
  const sealedVote = engine.privateView(ids[7]!);
  if (sealedVote.canSpeak) throw new Error("sealed canSpeak");
  say(`  [規則 D] 線報被封口，發言被拒：${sealedChat.message}`);
  engine.advance();
  engine.advance();
  engine.submitVote(ids[0]!, "s5");
  engine.submitVote(ids[1]!, "s5");
  engine.submitVote(ids[7]!, "s6");
  engine.submitVote(ids[2]!, "s6");
  engine.advance();
  if (!engine.publicView().log.some((line) => line.text.includes("流局"))) throw new Error("day 3 tie");
  flushPublic("第 3 輪（封口仍然可以投票，再次流局）");

  engine.advance();
  engine.submitNight(ids[4]!, { action: "cover", targetSeatId: "s11" });
  engine.submitNight(ids[1]!, { action: "disconnect", targetSeatId: "s11" });
  engine.submitNight(ids[0]!, { action: "mark", targetSeatId: "s4" });
  engine.advance();
  const coverLines = engine.privateView(ids[4]!).inbox.filter((line) => line.includes("掩護"));
  if (!coverLines.at(-1)?.includes("掩護成功")) throw new Error("cover should succeed again");
  const winner = engine.publicView().winner;
  if (winner?.faction !== "grey") throw new Error(`expected grey win, got ${winner?.faction ?? "none"}`);
  const silencerAlive = engine.publicView().seats.find((seat) => seat.id === "s2")?.alive;
  if (!silencerAlive) throw new Error("silencer should still be alive");
  if (engine.privateView(ids[1]!).role?.id !== "silencer") throw new Error("role drifted");
  flushPublic("勝負檢定（灰頻先於消音）");
  say(`  消音手仍然在場，成功失聯 ${engine.getDisconnects()}／3，但灰頻已獨贏。`);
  say(`  孤證客標記：${engine.privateView(ids[0]!).marks.map((id) => `${id} ${labelOf(engine, id)}`).join("、")}`);
  engine.advance();
  if (engine.getPhase() !== "ended") throw new Error("expected ended");
  say("");
  say(`終局：${FACTION_LABEL[winner.faction]}。${winner.reason}`);
  return lines;
}

function labelOf(engine: GameEngine, seatId: string): string {
  const seat = engine.publicView().seats.find((item) => item.id === seatId);
  const roleId = DEAL[Number(seatId.slice(1)) - 1];
  return `${seat?.nickname ?? seatId}／${roleId ? ROLES[roleId].name : ""}`;
}
