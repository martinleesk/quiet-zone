const ART = "../ui-demo/art";

const ROLES = [
  { id: "tip", name: "線報", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "燈亮釘一句", when: "燈亮", skill: "燈亮可以釘一句公開線報，唔佔你嘅發言。", busts: ["roles/tip.jpg"] },
  { id: "sweep", name: "掃頻", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "熄燈查人", when: "熄燈", skill: "熄燈揀一個人，私下知道佢係消音定乾淨。", busts: ["roles/sweep.jpg"] },
  { id: "cover", name: "掩護", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "擋一夜", when: "熄燈", skill: "熄燈保一個人唔會被帶走。成功後下一夜唔可以再用。", busts: ["roles/cover.jpg"] },
  { id: "echo", name: "回波", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "票走先有料", when: "有人被票走之後", skill: "有人被票走之後，你私下收到佢係邊個陣營。", busts: ["roles/echo.jpg"] },
  { id: "link", name: "通聯", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "查上輪", when: "燈亮", skill: "燈亮揀一個人，知道佢上一輪用過技能未。", busts: ["roles/link.jpg"] },
  { id: "civilian", name: "守燈", faction: "lighthouse", label: "燈塔網", color: "#E7C27A", win: "消音組全部離場就贏。", mnemonic: "冇技能", when: "冇", skill: "冇技能。你靠講一句、寫草稿同投票。", busts: ["roles/civilian_f.jpg", "roles/civilian_m.jpg"] },
  { id: "silencer", name: "消音手", faction: "silence", label: "消音組", color: "#E07A7A", win: "成功帶走 3 個人，或者燈塔網票唔到，就贏。", mnemonic: "熄燈帶走", when: "熄燈", skill: "熄燈揀一個冇掩護嘅人，令佢離場。", busts: ["roles/silencer.jpg"] },
  { id: "decoy", name: "假訊", faction: "silence", label: "消音組", color: "#E07A7A", win: "成功帶走 3 個人，或者燈塔網票唔到，就贏。", mnemonic: "整亂線報", when: "燈亮或熄燈", skill: "每局兩次。可以放一句假料，或者標一條線報未核實。", busts: ["roles/decoy.jpg"] },
  { id: "plant", name: "影燈", faction: "silence", label: "消音組", color: "#E07A7A", win: "成功帶走 3 個人，或者燈塔網票唔到，就贏。", mnemonic: "第一次裝乾淨", when: "被查或者投票", skill: "第一次被掃頻會顯示乾淨。投票可以匿名一次。", busts: ["roles/plant.jpg"] },
  { id: "warrant", name: "孤證", faction: "grey", label: "灰頻", color: "#9AA7B5", win: "孤證仍然在場，暗標中兩個消音就獨贏。", mnemonic: "暗標兩個就贏", when: "隨時標，熄燈封口", skill: "暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。", busts: ["roles/warrant.jpg"] },
];

const COACH = {
  home: { line: "11 人隱藏身份。你要估邊三個係消音組。", bullets: ["燈亮講一句", "投票隔離", "熄燈先用技能"] },
  lobby: { line: "記住你係邊個，再開始燈亮", bullets: ["你坐一席", "其餘係 AI", "徽章會一直在"] },
  boot: { line: "記住身份，再去燈亮", bullets: ["睇你嘅名", "睇技能一句", "撳開始"] },
  day_talk: { line: "講／釘", bullets: ["撳短動詞就講", "疑、保要再揀人", "自己寫收埋"] },
  draft: { line: "寫（可跳）", bullets: ["可以留空", "寫完先交", "跳過都得"] },
  vote: { line: "揀", bullets: ["平票就冇人走", "可以棄權", "撳準備先結算"] },
  resolve: { line: "等幾秒就熄燈", bullets: [] },
  night: { line: "發動", bullets: ["撳席位就發動", "冇就跳過", "全文喺詳情同圖鑑"] },
  check: { line: "睇下有冇人贏", bullets: [] },
  ended: { line: "局完，身份公開", bullets: [] },
};

const TALK_CHIPS = [
  { id: "suspect", verb: "疑", needsSeat: true },
  { id: "guard", verb: "保", needsSeat: true },
  { id: "follow", verb: "跟票", line: "跟票" },
  { id: "pins", verb: "睇線報", line: "睇線報" },
  { id: "none", verb: "未實錘", line: "未實錘" },
  { id: "watch", verb: "觀望", line: "觀望" },
  { id: "careful", verb: "小心", line: "小心錯票" },
  { id: "listen", verb: "再聽", line: "再聽一輪" },
];
const CUE = {
  disconnect: "帶走",
  cover: "保邊個",
  sweep: "掃邊個",
  mark: "標邊個",
  seal: "封邊個",
  pin: "釘一句",
  link: "查邊個",
  fake_plant: "放假料",
  fake_flag: "標未核",
  skip: "跳過",
};
const SILENCE = ["今夜我建議失聯一個燈塔席。", "可能有掩護，換一個目標。", "我跟組內嘅選擇。", "今輪跳過，唔好暴露。", "小心灰頻，唔好亂送頭。"];

const app = document.getElementById("app");
const phaseLabel = document.getElementById("phase-label");
const roleChip = document.getElementById("role-chip");
const coachEl = document.getElementById("coach");
const clockEl = document.getElementById("clock");
const clockUnit = document.getElementById("clock-unit");
const meter = document.getElementById("meter");
const meterFill = document.getElementById("meter-fill");
const leaveBtn = document.getElementById("leave");
const overlay = document.getElementById("overlay");
const sheet = document.getElementById("sheet");

let view = null;
let errorText = "";
let buffer = "";
let selected = "";
let nightAction = "";
let anonymous = false;
let talkVerb = "";
let writeOpen = false;
let silenceOpen = false;
let detailOpen = false;
let lastPhase = "";
let paintedPhase = "";
let serverSeconds = null;
let phaseTotal = null;
let clockAnchor = 0;
let sessionOpen = false;
let roleGo = false;
let phaseDeadlineAt = null;
let voteSent = false;
let lastCast = "";
let swallowClick = false;
let voteGuardTimer = 0;
const VOTE_GUARD_MS = 250;
const seenTips = new Set();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function send(message) {
  if (!window.QuietZoneTrial) {
    errorText = "試玩引擎未載入。";
    paint();
    return;
  }
  QuietZoneTrial.send(JSON.stringify(message));
}

function bustSrc(roleId, seatId) {
  if (!roleId) return "";
  if (roleId === "civilian") {
    let sum = 0;
    for (const unit of seatId || "") sum += unit.codePointAt(0);
    return `${ART}/roles/${sum % 2 === 1 ? "civilian_m.jpg" : "civilian_f.jpg"}`;
  }
  return `${ART}/roles/${roleId}.jpg`;
}

function bustClass(roleId, seatId) {
  if (roleId !== "civilian") return "bust";
  let sum = 0;
  for (const unit of seatId || "") sum += unit.codePointAt(0);
  return sum % 2 === 1 ? "bust m" : "bust f";
}

function knownRole(pub, priv, seat) {
  if (priv.seatId === seat.id && priv.role) return priv.role.id;
  const revealed = (pub.reveal || []).find((item) => item.seatId === seat.id);
  return revealed ? revealed.roleId : "";
}

function sceneClass(phase) {
  return phase === "night" ? "night" : "day";
}

function aliveOthers(pub, priv) {
  return (pub.seats || []).filter((seat) => seat.alive && seat.id !== priv.seatId);
}

function paintClock() {
  if (serverSeconds == null) {
    clockEl.textContent = "—";
    clockEl.classList.remove("low");
    clockUnit.textContent = "";
    meter.classList.remove("low");
    meterFill.style.width = "0";
    return;
  }
  const elapsed = Math.floor((Date.now() - clockAnchor) / 1000);
  const left = Math.max(0, serverSeconds - elapsed);
  const low = left <= 5;
  clockEl.textContent = String(left);
  clockEl.classList.toggle("low", low);
  clockUnit.textContent = "秒";
  meter.classList.toggle("low", low);
  const total = phaseTotal || serverSeconds || 1;
  meterFill.style.width = `${Math.max(0, Math.min(100, (left / total) * 100))}%`;
}

function syncClock(seconds, phaseChanged) {
  if (seconds == null) {
    serverSeconds = null;
    phaseTotal = null;
    phaseDeadlineAt = null;
    paintClock();
    return;
  }
  if (phaseChanged || seconds !== serverSeconds) {
    if (phaseChanged || phaseTotal == null || seconds > phaseTotal) phaseTotal = seconds;
    serverSeconds = seconds;
    clockAnchor = Date.now();
    if (phaseChanged || phaseDeadlineAt == null) phaseDeadlineAt = clockAnchor + seconds * 1000;
  }
  paintClock();
}

function clearVoteGuard() {
  if (voteGuardTimer) clearTimeout(voteGuardTimer);
  voteGuardTimer = 0;
}

function resetVoteGuard() {
  clearVoteGuard();
  voteSent = false;
  lastCast = "";
  swallowClick = false;
}

function scheduleVoteGuard() {
  clearVoteGuard();
  if (!view || view.public.phase !== "vote" || phaseDeadlineAt == null) return;
  const wait = phaseDeadlineAt - VOTE_GUARD_MS - Date.now();
  if (wait <= 0) {
    freezeVote();
    return;
  }
  voteGuardTimer = setTimeout(freezeVote, wait);
}

function castVote(seatId) {
  if (seatId) selected = seatId;
  if (!selected || !view || view.public.phase !== "vote") return;
  if (lastCast === selected) return;
  lastCast = selected;
  voteSent = true;
  swallowClick = true;
  setTimeout(() => {
    swallowClick = false;
  }, 400);
  send({ type: "vote", targetSeatId: selected, anonymous });
}

function freezeVote() {
  voteGuardTimer = 0;
  if (!view || view.public.phase !== "vote") return;
  castVote();
}

function faceHtml(pub, priv, seat) {
  const roleId = knownRole(pub, priv, seat);
  if (!roleId) return `<span class="face"></span>`;
  return `<img class="${bustClass(roleId, seat.id)}" src="${esc(bustSrc(roleId, seat.id))}" alt="">`;
}

function seatCard(pub, priv, seat) {
  const badge = seat.isAi ? `<span class="badge">AI</span>` : "";
  const seal = seat.sealed ? `<span class="seal-mini">封</span>` : "";
  const cls = `seat${priv.seatId === seat.id ? " me" : ""}${seat.alive ? "" : " dead"}`;
  return `<div class="${cls}">${faceHtml(pub, priv, seat)}${seal}<div class="seat-name">${esc(seat.nickname)}</div>${badge}</div>`;
}

function seatRing(pub, priv) {
  const seats = pub.seats || [];
  if (!seats.length) return "";
  const mid = Math.ceil(seats.length / 2);
  return `<div class="stage"><div class="ring">${seats.slice(0, mid).map((seat) => seatCard(pub, priv, seat)).join("")}</div><div class="table-line"></div><div class="ring">${seats.slice(mid).map((seat) => seatCard(pub, priv, seat)).join("")}</div></div>`;
}

function roleCard(priv, phase) {
  const role = priv.role;
  if (!role) return "";
  const mates = (priv.teammates || []).map((mate) => `${esc(mate.nickname)}（${esc(mate.roleName)}）`).join("、");
  const marks = (priv.marks || []).join("、");
  const lean = phase === "draft" || phase === "vote" || phase === "night";
  const actionPhase = lean || phase === "day_talk";
  const essay = actionPhase ? "" : `${role.mnemonic ? `<p class="small">記法：${esc(role.mnemonic)}</p>` : ""}<p>${esc(role.skill)}</p>`;
  const title = lean ? esc(role.name) : `${esc(role.name)} · ${esc(role.factionLabel)}`;
  const kicker = lean ? "" : `<div class="kicker">你嘅身分</div>`;
  return `<div class="me-card"><img class="${bustClass(role.id, priv.seatId)}" src="${esc(bustSrc(role.id, priv.seatId))}" alt=""><div>${kicker}<h2>${title}</h2>${essay}${mates ? `<p>組員：${mates}</p>` : ""}${marks ? `<p>標記：${esc(marks)}</p>` : ""}</div></div>`;
}

function focusPhase(phase) {
  return phase === "draft" || phase === "vote" || phase === "night";
}

function logBlock(pub, priv) {
  const lines = [];
  const brief = focusPhase(pub.phase);
  if (!brief && pub.winner) {
    const reveal = (pub.reveal || []).map((seat) => {
      const src = bustSrc(seat.roleId, seat.seatId);
      return `<div class="chip"><img class="${bustClass(seat.roleId, seat.seatId)}" src="${esc(src)}" alt=""><span>${esc(seat.seatId)} ${esc(seat.nickname)} · ${esc(seat.roleName)} · ${esc(seat.factionLabel)}${seat.alive ? "" : " · 離場"}</span></div>`;
    }).join("");
    lines.push(`<div class="card"><div class="kicker">終局</div><h2>${esc(pub.winner.factionLabel)}</h2><p>${esc(pub.winner.reason)}</p><div class="seats">${reveal}</div></div>`);
  }
  if (priv.sealCard) lines.push(`<div class="seal">${esc(priv.sealCard)}</div>`);
  if (!brief) {
    lines.push(`<p>第 ${esc(pub.round)} 輪 · 第 ${esc(pub.night)} 夜 · 失聯 ${esc(pub.disconnects)}／${esc(pub.disconnectsToWin)}</p>`);
    if (pub.banner) lines.push(`<p>${esc(pub.banner)}</p>`);
    const comp = pub.composition || {};
    lines.push(`<p class="small">公開組成　燈塔網 ${esc(comp.lighthouse)} · 消音組 ${esc(comp.silence)} · 灰頻 ${esc(comp.grey)}</p>`);
    for (const pin of pub.pins || []) lines.push(`<p>釘選${pin.unverified ? "（待核實）" : ""}｜${esc(pin.text)}</p>`);
    for (const note of priv.inbox || []) lines.push(`<p>${esc(note)}</p>`);
    for (const remnant of priv.remnants || []) lines.push(`<p>殘片｜${esc(remnant.nickname)} · ${esc(remnant.factionLabel)}：${esc(remnant.text)}</p>`);
    lines.push(`<h3 style="margin:8px 0 4px;font-size:13px">公開頻道</h3>`);
  } else {
    const note = (priv.inbox || []).at(-1);
    if (note) lines.push(`<p>${esc(note)}</p>`);
  }
  const source = brief
    ? (pub.log || []).filter((line) => !String(line.text || "").startsWith("票簿"))
    : (pub.log || []);
  const log = brief ? source.slice(-3) : source;
  for (const line of log) lines.push(`<p class="log-line">${esc(ticketText(line.text, pub))}</p>`);
  if (priv.role && priv.role.faction === "silence" && pub.phase === "night") {
    if (!brief) lines.push(`<h3 style="margin:8px 0 4px;font-size:13px">消音組夜訊</h3>`);
    for (const note of priv.silenceChannel || []) lines.push(`<p class="log-line">${esc(note.nickname)}：${esc(note.text)}</p>`);
  }
  if (brief) lines.push(`<p class="small">全文喺詳情。</p>`);
  if (errorText) lines.push(`<p class="err">${esc(errorText)}</p>`);
  return lines.join("");
}

function ticketText(text, pub) {
  const raw = String(text ?? "");
  if (!raw.startsWith("票簿")) return raw;
  const names = new Map((pub.seats || []).map((seat) => [seat.id, seat.nickname]));
  return raw.replace(/→ (s\d+)/g, (all, id) => {
    const nick = names.get(id);
    return nick ? `→ ${nick}` : all;
  });
}

function cueOf(action, label) {
  if (CUE[action]) return CUE[action];
  const raw = String(label || "發動").trim();
  return Array.from(raw).slice(0, 4).join("") || "發動";
}

function targetGrid(seats, act, marked) {
  const marks = marked || new Set();
  return `<div class="target-grid">${seats.map((seat) => {
    const on = act === "pick" ? selected === seat.id : marks.has(seat.id);
    return `<button type="button" class="target${on ? " on" : ""}" data-act="${act}" data-id="${esc(seat.id)}"><span class="target-name">${esc(seat.nickname)}</span></button>`;
  }).join("")}</div>`;
}

function skillModes(pub, priv) {
  const modes = [];
  if (pub.phase === "night") {
    for (const action of priv.nightActions || []) {
      if (action.action === "skip" || action.action === "mark") continue;
      modes.push(action);
    }
  }
  for (const action of priv.skillActions || []) {
    if (modes.some((mode) => mode.action === action.action)) continue;
    modes.push(action);
  }
  return modes;
}

function skillPicker(pub, priv) {
  const modes = skillModes(pub, priv);
  if (!modes.length) return "";
  const current = modes.some((item) => item.action === nightAction) ? nightAction : modes[0].action;
  nightAction = current;
  const choice = modes.find((item) => item.action === current);
  const switcher = modes.length > 1
    ? `<div class="verb-row">${modes.map((item) => `<button type="button" class="verb-chip${item.action === current ? " on" : ""}" data-act="night-pick" data-id="${esc(item.action)}">${esc(cueOf(item.action, item.label))}</button>`).join("")}</div>`
    : "";
  const cue = `<div class="cue" id="skill-cue">${esc(cueOf(choice.action, choice.label))}</div>`;
  if (choice.action === "pin" || choice.action === "fake_plant") {
    return `<div class="skill-block">${switcher}${cue}<button class="verb" type="button" data-act="skill-text" data-id="${esc(choice.action)}">${choice.action === "pin" ? "釘" : "放"}</button></div>`;
  }
  if (choice.action === "fake_flag") {
    const pins = (pub.pins || []).filter((pin) => !pin.unverified);
    const buttons = `<div class="target-grid">${pins.map((pin) => `<button type="button" class="target" data-act="flag" data-id="${esc(pin.id)}"><span class="target-name">${esc(Array.from(pin.text || "").slice(0, 8).join(""))}</span></button>`).join("")}</div>`;
    return `<div class="skill-block">${switcher}${cue}${buttons}</div>`;
  }
  const seats = (pub.seats || []).filter((seat) => seat.alive && (choice.action === "cover" || seat.id !== priv.seatId));
  const act = choice.action === "mark" ? "mark" : (pub.phase === "night" && (priv.nightActions || []).some((item) => item.action === choice.action) ? "night-seat" : "skill-seat");
  const marks = act === "mark" ? new Set(priv.marks || []) : new Set();
  return `<div class="skill-block">${switcher}${cue}${targetGrid(seats, act, marks)}</div>`;
}

function writeBox(label) {
  if (!writeOpen) return "";
  return `<label class="field"><span>${esc(label)}</span><input id="line" type="text" maxlength="80" value="${esc(buffer)}"></label>`;
}

function actions(pub, priv) {
  if (!priv.alive) return `<p>你已離場，可以繼續睇公開頻道。</p>`;
  if (pub.winner || pub.phase === "ended") return `<p>勝負已定。可以離開再開一局。</p>`;
  if (pub.phase === "resolve" || pub.phase === "check") return `<p>結算中。</p>`;
  if (priv.ready && pub.phase !== "day_talk" && pub.phase !== "lobby") return `<p>已準備，等階段推進。</p>`;
  if (priv.muted && (pub.phase === "day_talk" || pub.phase === "draft")) {
    return `<p>封口中：呢個階段只可以等投票，唔可以發言。</p><button class="verb" type="button" data-act="ready">準備好</button>`;
  }
  if (pub.phase === "boot") return `<button class="verb" type="button" data-act="ready">我睇完身分</button>`;
  if (pub.phase === "day_talk") {
    const chipsHtml = TALK_CHIPS.map((chip) => `<button type="button" class="verb-chip${talkVerb === chip.id ? " on" : ""}" data-act="talk-verb" data-id="${esc(chip.id)}">${esc(chip.verb)}</button>`).join("");
    const chip = TALK_CHIPS.find((item) => item.id === talkVerb);
    const seats = chip && chip.needsSeat ? targetGrid(aliveOthers(pub, priv), "talk-seat") : "";
    const free = writeOpen ? `${writeBox("自己寫")}<button class="verb ghost" type="button" data-act="chat">送出</button>` : "";
    return `<div class="verb-row" id="talk-chips">${chipsHtml}<button type="button" class="verb-chip ghost" data-act="toggle-write">自己寫</button></div>
      ${seats}
      ${skillPicker(pub, priv)}
      ${free}
      <button class="verb" type="button" data-act="ready">準備好</button>`;
  }
  if (pub.phase === "draft") {
    const free = writeOpen ? `${writeBox("寫")}<button class="verb" type="button" data-act="draft">交低</button>` : "";
    return `${skillPicker(pub, priv)}
      <button class="verb" type="button" data-act="draft-skip">跳過</button>
      <button class="verb ghost" type="button" data-act="toggle-write">寫</button>
      ${free}`;
  }
  if (pub.phase === "vote") {
    const anon = priv.anonymousVote ? `<button type="button" class="verb-chip ghost${anonymous ? " on" : ""}" data-act="anon">匿名票（每局一次）</button>` : "";
    const note = priv.muted ? `<p>你被封口，而家只可以投票。</p>` : "";
    return `${note}${anon}
      ${targetGrid(aliveOthers(pub, priv), "pick")}
      <button class="verb" type="button" data-act="vote" ${selected ? "" : "disabled"}>確認投票</button>
      <div class="row-btns"><button class="verb ghost" type="button" data-act="abstain">棄權</button><button class="verb ghost" type="button" data-act="ready">準備好</button></div>`;
  }
  if (pub.phase === "night") {
    const silence = priv.role && priv.role.faction === "silence"
      ? `<button class="verb ghost" type="button" data-act="toggle-silence">夜訊</button>${silenceOpen ? `<div class="verb-row">${SILENCE.map((line) => `<button type="button" class="verb-chip ghost" data-act="silence" data-id="${esc(line)}">${esc(line)}</button>`).join("")}</div>` : ""}`
      : "";
    return `${skillPicker(pub, priv)}${silence}<button class="verb ghost" type="button" data-act="ready">跳過</button>`;
  }
  return `<p>${esc(pub.phaseLabel || "")}</p>`;
}

function coachPack(phase, pub, priv) {
  if (phase === "night" && pub && priv && skillModes(pub, priv).length === 0) {
    return {
      line: "跳過／無行動",
      bullets: ["今夜冇席位可揀", "撳跳過", "全文喺詳情同圖鑑"],
    };
  }
  return COACH[phase] || { line: "跟住下面嘅掣", bullets: [] };
}

function setCoach(phase, pub, priv) {
  const coach = coachPack(phase, pub, priv);
  coachEl.textContent = `而家做咩：${coach.line}`;
}

function detailHtml() {
  const pub = view && view.public;
  const priv = view && view.private;
  const phase = pub ? pub.phase : "home";
  const coach = coachPack(phase, pub, priv);
  const bullets = (coach.bullets || []).map((item) => `<p>${esc(item)}</p>`).join("");
  const role = priv && priv.role;
  const essay = role
    ? `<h3>${esc(role.name)} · ${esc(role.factionLabel || "")}</h3><p class="small">記法：${esc(role.mnemonic || "")}</p><p>${esc(role.skill || "")}</p>${role.when ? `<p class="small">幾時用：${esc(role.when)}</p>` : ""}`
    : `<p class="small">身分未派。全文亦喺角色圖鑑。</p>`;
  const tips = ((priv && priv.tips) || []).map((tip) => `<p>${esc(tip.text)}</p>`).join("");
  const channel = pub && priv ? `<h3 style="margin:12px 0 4px;font-size:13px">頻道</h3>${logBlock({ ...pub, phase: "detail" }, priv)}` : "";
  return `<p class="coach">而家做咩：${esc(coach.line)}</p>${bullets}${essay}${tips}${channel}`;
}

function openDetail() {
  detailOpen = true;
  const panel = document.getElementById("phase-detail");
  panel.hidden = false;
  document.getElementById("detail-body").innerHTML = detailHtml();
}

function closeDetail() {
  detailOpen = false;
  document.getElementById("phase-detail").hidden = true;
}

function syncBarHeight() {
  const bar = document.querySelector(".bar");
  if (bar) document.documentElement.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
}

function paintHome() {
  syncBarHeight();
  phaseLabel.textContent = "試玩";
  roleChip.textContent = "隱藏身份 · 11 席";
  setCoach("home");
  leaveBtn.hidden = true;
  document.body.dataset.phase = "home";
  overlay.hidden = true;
  syncClock(null);
  app.innerHTML = `<div class="home">
    <div class="scene day"><div class="copy">
      <h1>消音區</h1>
      <div class="sub">封鎖夜 · 標準 Mode 試玩</div>
      <p>11 人隱藏身份。你要估邊三個係消音組。</p>
      <p>燈亮講一句，然後投票。熄燈先用技能。上面會寫而家做咩。</p>
      <p class="small"><span class="hint-turn">請轉橫向。</span>倒數係上面個大數字。</p>
    </div></div>
    <form class="pane" id="home-form">
      <div class="dock" style="border-top:0;max-height:none">
        <button class="btn" type="button" data-act="codex">角色圖鑑</button>
        <label class="field"><span>暱稱</span><input id="nick" type="text" maxlength="12" value="夜歸人"></label>
        ${errorText ? `<p class="err">${esc(errorText)}</p>` : ""}
        <button class="btn fill" type="button" data-act="create">開試玩房</button>
        <p class="small">一個人就夠。AI 用模板短句，投票跟你嘅多數。</p>
      </div>
    </form>
  </div>`;
}

function paint() {
  if (!view) {
    paintHome();
    return;
  }
  syncBarHeight();
  const pub = view.public;
  const priv = view.private;
  const phase = pub.phase;
  document.body.dataset.phase = phase;
  const roundBit = phase === "lobby" ? "組席" : `第 ${pub.round || 0} 輪 · ${pub.phaseLabel || phase}`;
  phaseLabel.textContent = roundBit;
  const role = priv.role;
  roleChip.textContent = role ? `${role.name} · ${role.factionLabel}` : "身份未派";
  setCoach(phase, pub, priv);
  leaveBtn.hidden = false;
  const phaseChanged = phase !== paintedPhase;
  syncClock(pub.secondsLeft, phaseChanged);
  paintedPhase = phase;
  showOverlay(pub, priv);
  const focused = document.activeElement && document.activeElement.id === "line";
  const at = focused ? document.activeElement.selectionStart : null;
  const scroller = document.querySelector(".scroll");
  const stick = !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24;
  if (phase === "lobby") {
    const seats = (pub.seats || []).map((seat) => {
      const badge = seat.isAi ? `<span class="badge">AI</span>` : `<span>${seat.lobbyReady ? "已準備" : "未準備"}</span>`;
      return `<div class="chip"><span class="face"></span><span>${esc(seat.id)} ${esc(seat.nickname)}</span>${badge}</div>`;
    }).join("");
    app.innerHTML = `<div class="shell">
      <div class="scene day"><div class="copy">
        <div class="kicker">房間代碼</div>
        <p class="code">${esc(pub.code || "")}</p>
        <p>標準 Mode · ${esc((pub.seats || []).length)}／11 席。你準備好，就可以開始。空位已經由 AI 補滿。</p>
      </div></div>
      <div class="pane">
        <div class="scroll"><div class="seats">${seats}</div>${errorText ? `<p class="err">${esc(errorText)}</p>` : ""}</div>
        <div class="dock">
          <button class="btn fill" type="button" data-act="ready" ${priv.ready ? "disabled" : ""}>準備好</button>
          ${priv.isHost ? `<button class="btn fill" type="button" data-act="start" ${priv.ready ? "" : "disabled"}>開始封鎖</button>` : `<p>等房主開始。</p>`}
        </div>
      </div>
    </div>`;
    return;
  }
  app.innerHTML = `<div class="shell">
    <div class="scene ${sceneClass(phase)}">
      ${phase !== "boot" ? seatRing(pub, priv) : ""}
      ${phase === "boot" ? `<div class="stage"></div>` : ""}
      ${roleCard(priv, phase)}
    </div>
    <div class="pane">
      <div class="scroll">${logBlock(pub, priv)}</div>
      <div class="dock">${actions(pub, priv)}</div>
    </div>
  </div>`;
  const nextScroll = document.querySelector(".scroll");
  if (nextScroll && stick) nextScroll.scrollTop = nextScroll.scrollHeight;
  const line = document.getElementById("line");
  if (line && focused) {
    line.focus();
    if (at != null) line.setSelectionRange(at, at);
  }
  scheduleVoteGuard();
  if (detailOpen) {
    const body = document.getElementById("detail-body");
    if (body) body.innerHTML = detailHtml();
  }
}

function showOverlay(pub, priv) {
  const role = priv.role;
  if (pub.phase === "lobby" && role && !seenTips.has("role")) {
    const catalog = ROLES.find((item) => item.id === role.id);
    sheet.innerHTML = `<div class="sheet-card">
      <img class="${bustClass(role.id, priv.seatId)}" src="${esc(bustSrc(role.id, priv.seatId))}" alt="">
      <div>
        <div class="kicker">你係</div>
        <h2 style="margin:0;color:var(--gold)">${esc(role.name)}</h2>
        <p>${esc(role.factionLabel || "")} · 記法 ${esc(role.mnemonic || catalog?.mnemonic || "")}</p>
        <p>${esc(role.skill)}</p>
        <div class="row-btns">
          <button class="btn fill" type="button" data-act="begin">開始燈亮</button>
          <button class="btn" type="button" data-act="later">先睇下席</button>
        </div>
      </div>
    </div>`;
    overlay.hidden = false;
    return;
  }
  overlay.hidden = true;
}

function onMessage(raw) {
  const message = JSON.parse(raw);
  if (message.type === "error") {
    errorText = message.message || "發生錯誤。";
    if (view && view.public.phase === "vote") {
      voteSent = false;
      lastCast = "";
    }
    paint();
    return;
  }
  if (message.type !== "state") return;
  errorText = "";
  const phase = message.public.phase;
  if (phase !== lastPhase) {
    buffer = "";
    selected = "";
    nightAction = "";
    anonymous = false;
    talkVerb = "";
    writeOpen = false;
    silenceOpen = false;
    resetVoteGuard();
    lastPhase = phase;
  }
  view = message;
  if (phase === "boot" && roleGo) {
    roleGo = false;
    send({ type: "ready" });
    return;
  }
  paint();
}

function openSession() {
  const params = new URLSearchParams(location.search);
  const options = params.get("fast") === "1"
    ? { phaseMs: { boot: 500, day_talk: 20000, draft: 20000, vote: 20000, resolve: 600, night: 20000, check: 600 } }
    : {};
  QuietZoneTrial.open(onMessage, JSON.stringify(options));
  sessionOpen = true;
}

function beginTrial(nickname) {
  if (!window.QuietZoneTrial) {
    errorText = "試玩引擎未載入。請重新開頁。";
    paint();
    return;
  }
  errorText = "";
  if (!sessionOpen) openSession();
  send({ type: "create_room", nickname: nickname || "夜歸人" });
}

app.addEventListener("pointerdown", (event) => {
  if (!view || view.public.phase !== "vote") return;
  const node = event.target.closest("[data-act]");
  if (!node || !app.contains(node)) return;
  const act = node.dataset.act;
  if (act !== "pick" && act !== "vote") return;
  const left = phaseDeadlineAt == null ? Infinity : phaseDeadlineAt - Date.now();
  if (left > VOTE_GUARD_MS + 120) return;
  if (act === "pick") selected = node.dataset.id || "";
  castVote();
}, true);

app.addEventListener("click", (event) => {
  if (swallowClick) {
    swallowClick = false;
    return;
  }
  const node = event.target.closest("[data-act]");
  if (!node || !app.contains(node)) return;
  const act = node.dataset.act;
  const id = node.dataset.id || "";
  if (act === "codex") {
    document.getElementById("codex").hidden = false;
    return;
  }
  if (act === "create") {
    const nick = document.getElementById("nick");
    beginTrial(nick ? nick.value.trim() : "夜歸人");
    return;
  }
  if (act === "toggle-write") {
    writeOpen = !writeOpen;
    paint();
    const line = document.getElementById("line");
    if (line) line.focus();
    return;
  }
  if (act === "toggle-silence") {
    silenceOpen = !silenceOpen;
    paint();
    return;
  }
  if (act === "talk-verb") {
    const chip = TALK_CHIPS.find((item) => item.id === id);
    if (!chip) return;
    if (chip.needsSeat) {
      talkVerb = talkVerb === chip.id ? "" : chip.id;
      paint();
      return;
    }
    talkVerb = "";
    return send({ type: "chat", text: chip.line });
  }
  if (act === "talk-seat") {
    const chip = TALK_CHIPS.find((item) => item.id === talkVerb);
    const seat = ((view && view.public.seats) || []).find((item) => item.id === id);
    if (!chip || !seat) return;
    talkVerb = "";
    return send({ type: "chat", text: `${chip.verb} ${seat.nickname}` });
  }
  if (act === "pick" || act === "night-pick") {
    if (act === "pick") selected = id;
    else {
      nightAction = id;
      selected = "";
    }
    paint();
    return;
  }
  if (act === "anon") {
    anonymous = !anonymous;
    paint();
    return;
  }
  if (act === "ready") return send({ type: "ready" });
  if (act === "start") return send({ type: "start_game" });
  if (act === "chat") {
    const text = (document.getElementById("line")?.value || buffer).trim();
    if (!text) return;
    buffer = "";
    return send({ type: "chat", text });
  }
  if (act === "draft-skip") {
    buffer = "";
    send({ type: "draft", text: "" });
    return send({ type: "ready" });
  }
  if (act === "draft") {
    const text = document.getElementById("line")?.value || buffer;
    buffer = "";
    send({ type: "draft", text });
    return send({ type: "ready" });
  }
  if (act === "vote") {
    if (!selected) return;
    return castVote();
  }
  if (act === "abstain") {
    if (lastCast === "abstain") return;
    selected = "";
    lastCast = "abstain";
    voteSent = true;
    return send({ type: "vote", targetSeatId: null, anonymous });
  }
  if (act === "night-seat") {
    const marks = (view?.private.marks) || [];
    if (nightAction === "mark" && marks.includes(id)) {
      return send({ type: "skill", action: "unmark", targetId: id });
    }
    return send({ type: "night_action", action: nightAction, targetSeatId: id });
  }
  if (act === "skill-seat") {
    return send({ type: "skill", action: nightAction || "link", targetId: id });
  }
  if (act === "skill-text") {
    const text = (document.getElementById("line")?.value || buffer).trim();
    if (!text) {
      writeOpen = true;
      paint();
      const line = document.getElementById("line");
      if (line) line.focus();
      return;
    }
    buffer = "";
    writeOpen = false;
    return send({ type: "skill", action: id, text });
  }
  if (act === "mark") {
    const marked = !(view?.private.marks || []).includes(id);
    return send({ type: "skill", action: marked ? "mark" : "unmark", targetId: id });
  }
  if (act === "flag") return send({ type: "skill", action: "fake_flag", targetId: id });
  if (act === "silence") return send({ type: "silence", text: id });
});

app.addEventListener("input", (event) => {
  if (event.target.id === "line") buffer = event.target.value;
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const nick = document.getElementById("nick");
  if (nick) beginTrial(nick.value.trim());
});

document.getElementById("open-codex").addEventListener("click", () => {
  document.getElementById("codex").hidden = false;
});
document.getElementById("open-detail").addEventListener("click", openDetail);
document.getElementById("close-detail").addEventListener("click", closeDetail);
document.getElementById("close-codex").addEventListener("click", () => {
  document.getElementById("codex").hidden = true;
  document.getElementById("detail").hidden = true;
});
overlay.addEventListener("click", (event) => {
  const node = event.target.closest("[data-act]");
  if (!node) return;
  const act = node.dataset.act;
  if (act === "begin") {
    seenTips.add("role");
    roleGo = true;
    overlay.hidden = true;
    send({ type: "ready" });
    send({ type: "start_game" });
    return;
  }
  if (act === "later") {
    seenTips.add("role");
    overlay.hidden = true;
    return;
  }
  if (act === "dismiss-tip") {
    seenTips.add(node.dataset.id || "");
    overlay.hidden = true;
  }
});

leaveBtn.addEventListener("click", () => {
  if (sessionOpen && window.QuietZoneTrial) QuietZoneTrial.close();
  sessionOpen = false;
  view = null;
  lastPhase = "";
  paintedPhase = "";
  resetVoteGuard();
  phaseDeadlineAt = null;
  roleGo = false;
  seenTips.clear();
  errorText = "";
  buffer = "";
  paint();
});

function busts(role) {
  return role.busts.map((file, index) => {
    const cls = role.id === "civilian" ? (index === 0 ? "bust f" : "bust m") : "bust";
    return `<img class="${cls}" src="${ART}/${file}" alt="">`;
  }).join("");
}

function paintCodex() {
  const groups = [
    ["lighthouse", "燈塔網", "lh"],
    ["silence", "消音組", "si"],
    ["grey", "灰頻", "gr"],
  ];
  document.getElementById("codex-overview").innerHTML = groups.map(([id, label, cls]) => `
    <div class="band ${cls}">${label}</div>
    <div class="tiles">${ROLES.filter((role) => role.faction === id).map((role) => `
      <button type="button" class="tile${role.id === "civilian" ? " wide" : ""}" data-role="${role.id}"><span class="pair">${busts(role)}</span><span>${role.name}</span><span class="memo">記法：${role.mnemonic}</span></button>
    `).join("")}</div>`).join("");
}

function openRole(id) {
  const role = ROLES.find((item) => item.id === id);
  if (!role) return;
  document.querySelectorAll(".tile").forEach((tile) => {
    const on = tile.dataset.role === id;
    tile.classList.toggle("on", on);
    tile.style.borderColor = on ? role.color : "";
  });
  const detail = document.getElementById("detail");
  detail.hidden = false;
  document.getElementById("detail-busts").innerHTML = busts(role);
  document.getElementById("detail-name").textContent = role.name;
  const faction = document.getElementById("detail-faction");
  faction.textContent = role.label;
  faction.style.color = role.color;
  document.getElementById("detail-skill").textContent = role.skill;
  document.getElementById("detail-win").textContent = role.win;
  let memo = document.getElementById("detail-memo");
  if (!memo) {
    memo = document.createElement("p");
    memo.id = "detail-memo";
    memo.className = "small";
    document.getElementById("detail-skill").before(memo);
  }
  memo.textContent = `記法：${role.mnemonic}`;
}

document.getElementById("codex-overview").addEventListener("click", (event) => {
  const tile = event.target.closest(".tile");
  if (tile) openRole(tile.dataset.role);
});

paintCodex();
paint();
setInterval(paintClock, 250);

const params = new URLSearchParams(location.search);
if (params.get("codex") === "1" || params.get("role")) {
  document.getElementById("codex").hidden = false;
  if (params.get("role")) openRole(params.get("role"));
}
