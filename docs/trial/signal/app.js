const phaseEl = document.getElementById("phase");
const coachEl = document.getElementById("coach");
const clockEl = document.getElementById("clock");
const unitEl = document.getElementById("unit");
const meterEl = document.getElementById("meter");
const fillEl = document.getElementById("meter-fill");
const seatsEl = document.getElementById("seats");
const eventsEl = document.getElementById("events");
const logEl = document.getElementById("log");
const dockEl = document.getElementById("dock");

let view = null;
let selected = null;
let pending = null;
let errorText = "";
let clock = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
}

function send(command) {
  errorText = "";
  pending = null;
  window.QuietZoneSignal.send(JSON.stringify(command));
}

function syncClock(next) {
  if (next.secondsLeft == null) {
    clock = null;
    paintClock();
    return;
  }
  clock = {
    skew: Date.now() - next.now,
    deadline: next.deadline,
    total: Math.max(1, next.secondsTotal),
  };
  paintClock();
}

function paintClock() {
  if (!clock) {
    clockEl.textContent = "—";
    clockEl.classList.remove("low");
    unitEl.textContent = "";
    fillEl.style.width = "0";
    meterEl.classList.remove("low");
    return;
  }
  const leftMs = Math.max(0, clock.deadline - (Date.now() - clock.skew));
  const sec = Math.ceil(leftMs / 1000);
  const low = sec <= 5;
  clockEl.textContent = String(sec);
  clockEl.classList.toggle("low", low);
  unitEl.textContent = "秒";
  fillEl.style.width = `${Math.max(0, Math.min(1, leftMs / (clock.total * 1000))) * 100}%`;
  meterEl.classList.toggle("low", low);
}

function seatHtml(seat, picking) {
  const bits = [
    seat.connected ? "" : "已斷線",
    seat.marks > 0 ? `疑點 ${seat.marks}` : "",
    seat.rifts > 0 ? `裂隙 ${seat.rifts}` : "",
    seat.talk ? seat.talk : "",
    seat.vote ? `票 ${seat.vote}` : "",
    seat.acted ? "已行動" : "",
  ].filter(Boolean);
  const tag = picking && seat.connected && !seat.isYou ? "button" : "div";
  return `<${tag} class="seat${seat.isYou ? " me" : ""}${seat.connected ? "" : " off"}" ${
    tag === "button" ? `type="button" data-target="${esc(seat.id)}"` : ""
  }>
    <div class="who"><span class="lamp${seat.acted ? " on" : ""}"></span>${esc(seat.name)}${
      seat.ai ? '<span class="badge">AI</span>' : ""
    }</div>
    <div class="meta">${esc(bits.join(" · ") || "未動")}</div>
    <div class="slot">武 ${esc(seat.strike || "空")}</div>
    <div class="slot">防 ${esc(seat.guard || "空")}</div>
    ${seat.roleName ? `<div class="meta">${esc(seat.factionLabel)} · ${esc(seat.roleName)}</div>` : ""}
  </${tag}>`;
}

function cardHtml(card) {
  return `<button type="button" class="card ${esc(card.kind)}${card.uid === selected ? " on" : ""}" data-card="${esc(card.uid)}">
    <span class="kind">${esc(card.kindLabel)}</span>
    <b>${esc(card.name)}</b>
    <p>${esc(card.text)}</p>
  </button>`;
}

function verb(label, attrs, ghost) {
  return `<button type="button" class="verb${ghost ? " ghost" : ""}" ${attrs}>${esc(label)}</button>`;
}

function dockHtml(current) {
  const you = current.you;
  const head = `<div class="you"><strong>${esc(you.factionLabel)} · ${esc(you.roleName)}</strong>
    <div class="meta">${esc(you.goal)} · ${esc(you.skillName)}${you.skillUsed ? " 已用" : ""}</div>
    <div class="meta">武 ${esc(you.quotas.strike)} · 道 ${esc(you.quotas.tool)} · 防 ${esc(you.quotas.guard)} · 武槽 ${esc(you.strike || "空")} · 防槽 ${esc(you.guard || "空")}</div>
    ${you.pending ? `<div class="meta">部署中 ${esc(you.pending)}</div>` : ""}
  </div>`;
  const err = errorText ? `<div class="err">${esc(errorText)}</div>` : "";
  const notes = you.notes?.length ? `<div class="note">${you.notes.map(esc).join("<br>")}</div>` : "";
  if (!you.connected && current.phase !== "ended") {
    return `${head}${err}<div class="winner">你已斷線</div>${notes}`;
  }
  if (current.phase === "ended") {
    const winner = current.winner;
    return `${head}${err}<div class="winner">${esc(winner ? winner.factionLabel : "終局")}</div><div class="note">${esc(winner?.reason || "")}</div>`;
  }
  if (current.phase === "morning" || current.phase === "resolve") {
    const tally = (current.tally || []).map((row) => `${esc(row.name)} ${row.votes}`).join(" · ");
    return `${head}${err}<div class="actions">${verb("繼續", 'data-cmd="ready"')}</div>${
      tally ? `<div class="note">${tally}</div>` : ""
    }${notes}`;
  }
  if (current.phase === "day") {
    const chips = (current.chips || ["可疑", "留低", "冇聲", "對頻", "我過"])
      .map((chip) => verb(chip, `data-chip="${esc(chip)}"`, true))
      .join("");
    return `${head}${err}<div class="actions">${chips}</div>${notes}`;
  }
  if (current.phase === "night") {
    const card = you.hand.find((item) => item.uid === selected);
    const actions = [];
    if (you.skillReady) actions.push(verb(you.skillName, 'data-cmd="night-skill"'));
    if (card?.kind === "strike") actions.push(verb("裝上武槽", 'data-cmd="night-arm"'));
    if (!you.acted) actions.push(verb("跳過", 'data-cmd="night-pass"', true));
    const picking = pending?.type === "night";
    return `${head}${err}<div class="hand">${you.hand.map(cardHtml).join("")}</div><div class="actions">${actions.join("")}</div>${
      picking ? `<div class="note">揀一個人</div>` : ""
    }${notes}`;
  }
  if (current.phase === "discard") {
    return `${head}${err}<div class="note">揀一張棄掉</div><div class="hand">${you.hand.map(cardHtml).join("")}</div>${notes}`;
  }
  if (current.phase === "vote") {
    const targets = current.seats
      .filter((seat) => seat.connected && !seat.isYou)
      .map((seat) => `<button type="button" class="target" data-vote="${esc(seat.id)}">${esc(seat.name)}</button>`)
      .join("");
    const actions = [];
    if (you.skillReady) actions.push(verb(you.skillName, 'data-cmd="private"'));
    actions.push(verb("棄權", 'data-cmd="abstain"', true));
    if (you.voted && !you.acted) actions.push(verb("完成", 'data-cmd="ready"'));
    return `${head}${err}<div class="targets">${targets}</div><div class="actions">${actions.join("")}</div>${notes}`;
  }
  const card = you.hand.find((item) => item.uid === selected);
  const actions = [];
  if (card?.kind === "strike" && you.canStrike) actions.push(verb("打出", 'data-cmd="strike"'));
  if (card?.kind === "strike" && you.canArm) actions.push(verb("裝上", 'data-cmd="arm"', true));
  if (card?.kind === "guard" && you.canGuard) actions.push(verb("裝上", 'data-cmd="guard"'));
  if (card?.kind === "tool" && you.canTool) actions.push(verb("打出", 'data-cmd="tool"'));
  if (card?.kind === "skill" && !you.acted) actions.push(verb("發動", 'data-cmd="skill-card"'));
  if (you.canFire) actions.push(verb("發動武槽", 'data-cmd="fire"', true));
  if (you.skillReady) actions.push(verb(you.skillName, 'data-cmd="private"', true));
  if (!you.acted) actions.push(verb("完成", 'data-cmd="finish"', true));
  return `${head}${err}<div class="hand">${you.hand.map(cardHtml).join("")}</div><div class="actions">${actions.join("")}</div>${
    pending ? `<div class="note">揀席上一人</div>` : ""
  }${notes}`;
}

function render(next) {
  view = next;
  if (selected && !next.you.hand.some((card) => card.uid === selected)) selected = null;
  document.body.dataset.phase = next.phase;
  phaseEl.textContent = `${next.phaseLabel} · ${next.banner}`;
  coachEl.textContent = next.coach;
  const picking = Boolean(pending);
  seatsEl.innerHTML = next.seats.map((seat) => seatHtml(seat, picking)).join("");
  eventsEl.innerHTML = (next.events.length ? next.events : ["未有晨報"]).map((line) => `<span class="pill">${esc(line)}</span>`).join("");
  logEl.textContent = next.log.slice(-2).join("\n");
  dockEl.innerHTML = dockHtml(next);
  syncClock(next);
}

function selectedCard() {
  return view?.you.hand.find((card) => card.uid === selected) ?? null;
}

function onDockClick(event) {
  const card = event.target.closest("[data-card]");
  if (card) {
    selected = card.dataset.card;
    pending = null;
    if (view?.phase === "discard") {
      send({ type: "discard", cardUid: selected });
      return;
    }
    render(view);
    return;
  }
  const chip = event.target.closest("[data-chip]");
  if (chip) {
    send({ type: "talk", chip: chip.dataset.chip });
    return;
  }
  const vote = event.target.closest("[data-vote]");
  if (vote) {
    send({ type: "vote", targetSeatId: vote.dataset.vote });
    return;
  }
  const cmd = event.target.closest("[data-cmd]")?.dataset.cmd;
  if (!cmd || !view) return;
  const cardDef = selectedCard();
  if (cmd === "ready") send({ type: "ready" });
  else if (cmd === "finish") send({ type: "play", action: "finish" });
  else if (cmd === "night-pass") send({ type: "night", action: "pass" });
  else if (cmd === "night-arm" && cardDef) send({ type: "night", action: "arm", cardUid: cardDef.uid });
  else if (cmd === "night-skill") {
    if (view.you.skillNeedsTarget) {
      pending = { type: "night", action: "skill" };
      render(view);
    } else send({ type: "night", action: "skill" });
  } else if (cmd === "guard" && cardDef) send({ type: "play", action: "guard", cardUid: cardDef.uid });
  else if (cmd === "arm" && cardDef) send({ type: "play", action: "arm", cardUid: cardDef.uid });
  else if (cmd === "skill-card" && cardDef) send({ type: "play", action: "skill", cardUid: cardDef.uid });
  else if (cmd === "strike" && cardDef) {
    pending = { type: "play", action: "strike", cardUid: cardDef.uid };
    render(view);
  } else if (cmd === "tool" && cardDef) {
    if (cardDef.needsTarget) {
      pending = { type: "play", action: "tool", cardUid: cardDef.uid };
      render(view);
    } else send({ type: "play", action: "tool", cardUid: cardDef.uid });
  } else if (cmd === "fire") {
    pending = { type: "play", action: "fire" };
    render(view);
  } else if (cmd === "private") {
    if (view.you.skillNeedsTarget) {
      pending = { type: "play", action: "private" };
      render(view);
    } else send({ type: "play", action: "private" });
  } else if (cmd === "abstain") send({ type: "vote", targetSeatId: "abstain" });
}

function onSeatClick(event) {
  const target = event.target.closest("[data-target]");
  if (!target || !pending) return;
  send({ ...pending, targetSeatId: target.dataset.target });
}

dockEl.addEventListener("click", onDockClick);
seatsEl.addEventListener("click", onSeatClick);
document.getElementById("restart").addEventListener("click", () => location.reload());
setInterval(paintClock, 200);

const params = new URLSearchParams(location.search);
const options = {};
if (params.has("fast")) options.fast = true;
if (params.has("seed")) options.seed = Number(params.get("seed"));
if (params.get("at") === "play" || params.get("at") === "vote") options.at = params.get("at");
if (params.get("name")) options.name = params.get("name");

window.QuietZoneSignal.open((json) => {
  const message = JSON.parse(json);
  if (message.type === "error") {
    errorText = message.text;
    if (view) render(view);
    return;
  }
  render(message.view);
}, JSON.stringify(options));
