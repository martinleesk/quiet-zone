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
  day_talk: { line: "講一句你懷疑邊個", bullets: ["有技能先撳發動", "講完撳準備好", "倒數見大數字"] },
  draft: { line: "寫低你想點投票", bullets: ["可以留空", "然後準備", "平票就冇人走"] },
  vote: { line: "揀一個人票走", bullets: ["平票就冇人走", "可以棄權", "撳準備先結算"] },
  resolve: { line: "等幾秒就熄燈", bullets: [] },
  night: { line: "熄燈先撳發動", bullets: ["有技能先揀目標", "冇就撳跳過", "倒數見大數字"] },
  check: { line: "睇下有冇人贏", bullets: [] },
  ended: { line: "局完，身份公開", bullets: [] },
};

const TALK = ["我暫時未有實錘。", "我傾向跟多數。", "隔離要小心。", "未見足夠失聯痕跡。"];
const SILENCE = ["今夜我建議失聯一個燈塔席。", "可能有掩護，換一個目標。", "我跟組內嘅選擇。", "今輪跳過，唔好暴露。", "小心灰頻，唔好亂送頭。"];

const app = document.getElementById("app");
const phaseLabel = document.getElementById("phase-label");
const roleChip = document.getElementById("role-chip");
const coachEl = document.getElementById("coach");
const coachArrows = document.getElementById("coach-arrows");
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
let lastPhase = "";
let paintedPhase = "";
let serverSeconds = null;
let phaseTotal = null;
let clockAnchor = 0;
let sessionOpen = false;
let roleGo = false;
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
    paintClock();
    return;
  }
  if (phaseChanged || seconds !== serverSeconds) {
    if (phaseChanged || phaseTotal == null || seconds > phaseTotal) phaseTotal = seconds;
    serverSeconds = seconds;
    clockAnchor = Date.now();
  }
  paintClock();
}

function faceHtml(pub, priv, seat) {
  const roleId = knownRole(pub, priv, seat);
  if (!roleId) return `<span class="face"></span>`;
  return `<img class="${bustClass(roleId, seat.id)}" src="${esc(bustSrc(roleId, seat.id))}" alt="">`;
}

function seatCard(pub, priv, seat) {
  const bits = [`${esc(seat.id)} ${esc(seat.nickname)}`];
  if (!seat.alive) bits.push("離場");
  if (seat.sealed) bits.push("封口");
  const badge = seat.isAi ? `<span class="badge">AI</span>` : "";
  const cls = `seat${priv.seatId === seat.id ? " me" : ""}${seat.alive ? "" : " dead"}`;
  return `<div class="${cls}">${faceHtml(pub, priv, seat)}<div>${bits.join("<br>")}</div>${badge}</div>`;
}

function seatRing(pub, priv) {
  const seats = pub.seats || [];
  if (!seats.length) return "";
  const mid = Math.ceil(seats.length / 2);
  return `<div class="stage"><div class="ring">${seats.slice(0, mid).map((seat) => seatCard(pub, priv, seat)).join("")}</div><div class="table-line"></div><div class="ring">${seats.slice(mid).map((seat) => seatCard(pub, priv, seat)).join("")}</div></div>`;
}

function roleCard(priv) {
  const role = priv.role;
  if (!role) return "";
  const mates = (priv.teammates || []).map((mate) => `${esc(mate.nickname)}（${esc(mate.roleName)}）`).join("、");
  const marks = (priv.marks || []).join("、");
  const memo = role.mnemonic ? `<p class="small">記法：${esc(role.mnemonic)}</p>` : "";
  return `<div class="me-card"><img class="${bustClass(role.id, priv.seatId)}" src="${esc(bustSrc(role.id, priv.seatId))}" alt=""><div><div class="kicker">你嘅身分</div><h2>${esc(role.name)} · ${esc(role.factionLabel)}</h2>${memo}<p>${esc(role.skill)}</p>${mates ? `<p>組員：${mates}</p>` : ""}${marks ? `<p>你嘅標記：${esc(marks)}</p>` : ""}</div></div>`;
}

function logBlock(pub, priv) {
  const lines = [];
  if (pub.winner) {
    const reveal = (pub.reveal || []).map((seat) => {
      const src = bustSrc(seat.roleId, seat.seatId);
      return `<div class="chip"><img class="${bustClass(seat.roleId, seat.seatId)}" src="${esc(src)}" alt=""><span>${esc(seat.seatId)} ${esc(seat.nickname)} · ${esc(seat.roleName)} · ${esc(seat.factionLabel)}${seat.alive ? "" : " · 離場"}</span></div>`;
    }).join("");
    lines.push(`<div class="card"><div class="kicker">終局</div><h2>${esc(pub.winner.factionLabel)}</h2><p>${esc(pub.winner.reason)}</p><div class="seats">${reveal}</div></div>`);
  }
  if (priv.sealCard) lines.push(`<div class="seal">${esc(priv.sealCard)}</div>`);
  for (const tip of priv.tips || []) lines.push(`<div class="card">${esc(tip.text)}</div>`);
  lines.push(`<p>第 ${esc(pub.round)} 輪 · 第 ${esc(pub.night)} 夜 · 失聯 ${esc(pub.disconnects)}／${esc(pub.disconnectsToWin)}</p>`);
  if (pub.banner) lines.push(`<p>${esc(pub.banner)}</p>`);
  const comp = pub.composition || {};
  lines.push(`<p class="small">公開組成　燈塔網 ${esc(comp.lighthouse)} · 消音組 ${esc(comp.silence)} · 灰頻 ${esc(comp.grey)}</p>`);
  for (const pin of pub.pins || []) lines.push(`<p>釘選${pin.unverified ? "（待核實）" : ""}｜${esc(pin.text)}</p>`);
  for (const note of priv.inbox || []) lines.push(`<p>${esc(note)}</p>`);
  for (const remnant of priv.remnants || []) lines.push(`<p>殘片｜${esc(remnant.nickname)} · ${esc(remnant.factionLabel)}：${esc(remnant.text)}</p>`);
  lines.push(`<h3 style="margin:8px 0 4px;font-size:13px">公開頻道</h3>`);
  for (const line of pub.log || []) lines.push(`<p class="log-line">${esc(line.text)}</p>`);
  if (priv.role && priv.role.faction === "silence" && pub.phase === "night") {
    lines.push(`<h3 style="margin:8px 0 4px;font-size:13px">消音組夜訊</h3>`);
    for (const note of priv.silenceChannel || []) lines.push(`<p class="log-line">${esc(note.nickname)}：${esc(note.text)}</p>`);
  }
  if (errorText) lines.push(`<p class="err">${esc(errorText)}</p>`);
  return lines.join("");
}

function chips(items, act, current) {
  return `<div class="chips">${items.map((item) => `<button type="button" class="pick${item.id === current ? " on" : ""}" data-act="${act}" data-id="${esc(item.id)}">${esc(item.label)}</button>`).join("")}</div>`;
}

function actions(pub, priv) {
  if (!priv.alive) return `<p>你已離場，可以繼續睇公開頻道。</p>`;
  if (pub.winner || pub.phase === "ended") return `<p>勝負已定。可以離開再開一局。</p>`;
  if (pub.phase === "resolve" || pub.phase === "check") return `<p>結算中。</p>`;
  if (priv.ready && pub.phase !== "day_talk" && pub.phase !== "lobby") return `<p>已準備，等階段推進。</p>`;
  if (priv.muted && (pub.phase === "day_talk" || pub.phase === "draft")) {
    return `<p>封口中：呢個階段只可以等投票，唔可以發言。</p><button class="btn fill" type="button" data-act="ready">準備好</button>`;
  }
  if (pub.phase === "boot") return `<button class="btn fill" type="button" data-act="ready">我睇完身分</button>`;
  if (pub.phase === "day_talk") {
    return `${skillCard(pub, priv)}
      ${chips(TALK.map((line) => ({ id: line, label: line })), "phrase", "")}
      <label class="field"><span>短句</span><input id="line" type="text" maxlength="80" value="${esc(buffer)}"></label>
      <div class="row-btns"><button class="btn fill" type="button" data-act="chat">送出</button><button class="btn" type="button" data-act="ready">準備好</button></div>`;
  }
  if (pub.phase === "draft") {
    return `${skillCard(pub, priv)}
      <p>私人草稿。留空都得。</p>
      <label class="field"><span>草稿</span><input id="line" type="text" maxlength="80" value="${esc(buffer)}"></label>
      <button class="btn fill" type="button" data-act="draft">交草稿並準備</button>`;
  }
  if (pub.phase === "vote") {
    const choices = aliveOthers(pub, priv).map((seat) => ({ id: seat.id, label: `${seat.id} ${seat.nickname}` }));
    const anon = priv.anonymousVote ? `<button type="button" class="pick${anonymous ? " on" : ""}" data-act="anon">匿名票（每局一次）</button>` : "";
    return `${skillCard(pub, priv)}
      <p>${priv.muted ? "你被封口，而家只可以投票。" : "投一個仍在場嘅人，或者棄權。平票就冇人走。"}</p>
      ${anon}
      ${chips(choices, "pick", selected)}
      <button class="btn fill" type="button" data-act="vote" ${selected ? "" : "disabled"}>確認投票</button>
      <div class="row-btns"><button class="btn" type="button" data-act="abstain">棄權</button><button class="btn" type="button" data-act="ready">準備好</button></div>`;
  }
  if (pub.phase === "night") {
    const night = (priv.nightActions || []).filter((item) => item.action !== "mark");
    const silence = priv.role && priv.role.faction === "silence"
      ? `<p class="small">夜訊只可以用模板，唔會公開。</p>${chips(SILENCE.map((line) => ({ id: line, label: line })), "silence", "")}`
      : "";
    if (!night.length) {
      return `${skillCard(pub, priv)}${silence}<button class="verb" type="button" data-act="ready">跳過</button>`;
    }
    const current = night.some((item) => item.action === nightAction) ? nightAction : night[0].action;
    nightAction = current;
    const choice = night.find((item) => item.action === current);
    const targets = (pub.seats || []).filter((seat) => seat.alive && (choice.action === "cover" || seat.id !== priv.seatId));
    const targetChips = choice.needsTarget ? chips(targets.map((seat) => ({ id: seat.id, label: `${seat.id} ${seat.nickname}` })), "pick", selected) : "";
    return `${skillCard(pub, priv)}${silence}
      ${chips(night.map((item) => ({ id: item.action, label: item.label })), "night-pick", current)}
      ${choice.needsTarget ? `<p class="small">揀目標</p>${targetChips}` : ""}
      <p class="small">未撳就當跳過。</p>
      <div class="row-btns"><button class="verb" type="button" data-act="night" ${(choice.needsTarget && !selected) ? "disabled" : ""}>發動</button><button class="verb ghost" type="button" data-act="ready">跳過</button></div>`;
  }
  return `<p>${esc(pub.phaseLabel || "")}</p>`;
}

function skillCard(pub, priv) {
  if (pub.phase === "boot" || pub.phase === "resolve" || pub.phase === "check" || pub.phase === "ended") return "";
  const skills = priv.skillActions || [];
  const nightSkills = pub.phase === "night"
    ? (priv.nightActions || []).filter((item) => item.action !== "skip" && item.action !== "mark")
    : [];
  if (!skills.length && !nightSkills.length) return `<p class="noskill">呢段冇得用技能</p>`;
  const role = priv.role;
  const blocks = [];
  for (const action of skills) {
    if (action.action === "pin" || action.action === "fake_plant") {
      blocks.push(`<button class="verb" type="button" data-act="skill" data-id="${esc(action.action)}">發動</button>`);
    } else if (action.action === "link") {
      blocks.push(`<p class="small">揀目標</p>${chips(aliveOthers(pub, priv).map((seat) => ({ id: seat.id, label: seat.nickname })), "pick", selected)}`);
      blocks.push(`<button class="verb" type="button" data-act="skill" data-id="link" ${selected ? "" : "disabled"}>發動</button>`);
    } else if (action.action === "mark") {
      const seats = aliveOthers(pub, priv).map((seat) => ({ id: seat.id, label: `${seat.id} ${seat.nickname}${(priv.marks || []).includes(seat.id) ? " · 已標" : ""}` }));
      blocks.push(`<p class="small">撳一下暗標，再撳取消。唔會話你知係咪消音。</p>${chips(seats, "mark", "")}`);
    } else if (action.action === "fake_flag") {
      const pins = (pub.pins || []).filter((pin) => !pin.unverified).map((pin) => ({ id: pin.id, label: `未核實｜${pin.text}` }));
      blocks.push(chips(pins, "flag", ""));
    }
  }
  const explain = role ? `${esc(role.name)} · ${esc(role.skill)}` : "";
  const when = role && role.when ? `<p class="small">幾時用：${esc(role.when)}</p>` : "";
  return `<section class="skill-card" id="skill-card"><strong>發動技能</strong><p>${explain}</p>${when}${blocks.join("")}</section>`;
}

function setCoach(id) {
  const coach = COACH[id] || { line: "跟住下面嘅掣", bullets: [] };
  coachEl.textContent = `而家做咩：${coach.line}`;
  coachArrows.innerHTML = (coach.bullets || []).slice(0, 3).map((item) => `<span>${esc(item)}</span>`).join("");
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
      <p class="small">請轉橫向。倒數係上面個大數字。</p>
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
  roleChip.textContent = role ? `${role.name} · ${role.factionLabel}${role.mnemonic ? ` · 記法 ${role.mnemonic}` : ""}` : "身份未派";
  setCoach(phase);
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
      ${roleCard(priv)}
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
  const tipId = pub.phase === "day_talk" && pub.round === 1 ? "day" : pub.phase === "night" && pub.night === 1 ? "night" : "";
  if (tipId && !seenTips.has(tipId)) {
    const coach = COACH[pub.phase];
    const tips = (coach.bullets || []).slice(0, 3).map((item) => `<p>${esc(item)}</p>`).join("");
    sheet.innerHTML = `<div class="sheet-card"><div>
      <p class="coach">而家做咩：${esc(coach.line)}</p>
      ${tips}
      <button class="btn fill" type="button" data-act="dismiss-tip" data-id="${tipId}">知道了</button>
    </div></div>`;
    overlay.hidden = false;
    return;
  }
  overlay.hidden = true;
}

function onMessage(raw) {
  const message = JSON.parse(raw);
  if (message.type === "error") {
    errorText = message.message || "發生錯誤。";
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

app.addEventListener("click", (event) => {
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
  if (act === "phrase") {
    buffer = id;
    const line = document.getElementById("line");
    if (line) line.value = id;
    return;
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
  if (act === "draft") {
    const text = document.getElementById("line")?.value || buffer;
    buffer = "";
    send({ type: "draft", text });
    return send({ type: "ready" });
  }
  if (act === "vote") return send({ type: "vote", targetSeatId: selected, anonymous });
  if (act === "abstain") return send({ type: "vote", targetSeatId: null, anonymous });
  if (act === "night") {
    const choice = (view?.private.nightActions || []).find((item) => item.action === nightAction) || (view?.private.nightActions || [])[0];
    if (!choice) return send({ type: "ready" });
    return send({ type: "night_action", action: choice.action, targetSeatId: choice.needsTarget ? selected : undefined });
  }
  if (act === "skill") {
    const text = (document.getElementById("line")?.value || buffer).trim();
    if ((id === "pin" || id === "fake_plant") && !text) return;
    send({ type: "skill", action: id, text, targetId: selected });
    if (id === "pin" || id === "fake_plant") buffer = "";
    return;
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
