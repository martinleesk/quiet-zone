"use strict";
var QuietZoneTrial = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/trial/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    close: () => close,
    open: () => open,
    send: () => send
  });

  // src/config/rules.ts
  var RULES = {
    id: "standard-mvp-2026-11-04",
    mode: "standard",
    seatCount: 11,
    composition: { lighthouse: 7, silence: 3, grey: 1 },
    /** A. 平票 → 流局，唔隔離 */
    tieVote: "no_isolation",
    /** B. 逾時預設：草稿可空白、投票當棄權、熄燈當跳過 */
    timeouts: {
      draft: "empty",
      vote: "abstain",
      night: "skip"
    },
    /** C. AI 可抽消音手；模板詞庫＋跟多數；徽章永久 */
    ai: {
      mayDrawSilencer: true,
      behavior: "template_phrase_bank_follow_majority",
      badgePermanent: true
    },
    /** D. 封口：只可投票，唔可以發言；結果卡係 stub */
    seal: {
      speech: false,
      vote: true,
      resultCard: "stub"
    },
    /** E. 11 人：成功失聯 3 次 → 消音組勝（灰頻未獨贏先） */
    silenceWin: {
      players: 11,
      successfulDisconnects: 3
    },
    /** F. 公開隔離唔披露陣營；只有回波師私下收到殘片 */
    isolation: {
      revealFaction: false,
      echoRemnant: "private"
    },
    /**
     * G. 掩護成功計作窗口第 1 回合。
     * 下一回合唔可以成功；再下一回合可以再成功。
     * `blockedFollowingTurns: 1` ⇒ 成功喺第 N 夜，第 N+1 夜失敗，第 N+2 夜可再成功。
     */
    cover: {
      successCountsAsTurn: 1,
      blockedFollowingTurns: 1
    },
    /** 灰頻獨贏優先於消音組同燈塔網 */
    greyWin: {
      minCorrectSilenceMarks: 2,
      mustBeAlive: true,
      priority: "before_silence_and_lighthouse"
    },
    /** Standard skill quotas. A–G above stay as locked. */
    skills: {
      pinPerDay: 1,
      linkPerDay: 1,
      fakePerGame: 2,
      anonymousVotesPerGame: 1
    },
    phases: ["boot", "day_talk", "draft", "vote", "resolve", "night", "check"],
    phaseMs: {
      boot: 8e3,
      day_talk: 4e4,
      draft: 25e3,
      vote: 25e3,
      resolve: 5e3,
      night: 25e3,
      check: 5e3
    }
  };

  // src/domain/phrases.ts
  function speakTalk(phrase, nickname) {
    if ((phrase === "\u7591" || phrase === "\u4FDD") && nickname) return `${phrase} ${nickname}`;
    return phrase;
  }
  var SILENCE_TEMPLATES = [
    "\u4ECA\u591C\u6211\u5EFA\u8B70\u5931\u806F\u4E00\u500B\u71C8\u5854\u5E2D\u3002",
    "\u53EF\u80FD\u6709\u63A9\u8B77\uFF0C\u63DB\u4E00\u500B\u76EE\u6A19\u3002",
    "\u6211\u8DDF\u7D44\u5167\u5605\u9078\u64C7\u3002",
    "\u4ECA\u8F2A\u8DF3\u904E\uFF0C\u5514\u597D\u66B4\u9732\u3002",
    "\u5C0F\u5FC3\u7070\u983B\uFF0C\u5514\u597D\u4E82\u9001\u982D\u3002"
  ];
  var PHASE_TIPS = {
    day_talk: { id: "day_talk", text: "\u71C8\u4EAE\u7528\u77ED\u53E5\u5C31\u5F97\u3002\u64B3\u6E96\u5099\u597D\u5148\u6703\u53BB\u8349\u7A3F\u3002" },
    vote: { id: "vote", text: "\u6295\u4E00\u500B\u4EBA\uFF0C\u6216\u8005\u68C4\u6B0A\u3002\u5E73\u7968\u5C31\u6D41\u5C40\uFF0C\u5514\u6703\u9694\u96E2\u3002" },
    night: { id: "night", text: "\u7184\u71C8\u5148\u4EA4\u884C\u52D5\u3002\u5187\u6280\u80FD\u53EF\u4EE5\u8DF3\u904E\u3002" },
    grey_marks: { id: "grey_marks", text: "\u6A19\u8A18\u53EA\u5F97\u4F60\u77E5\u3002\u6B63\u78BA\u6A19\u4E2D\u5169\u540D\u6D88\u97F3\uFF0C\u7070\u983B\u53EF\u4EE5\u7368\u8D0F\u3002" }
  };
  var AI_NICKNAMES = [
    "\u9727\u6E2F\u71C8",
    "\u975C\u9ED8\u9375",
    "\u591C\u73ED\u7C3F",
    "\u672A\u8B80\u8A0A",
    "\u4F4E\u983B",
    "\u9694\u97F3\u68C9",
    "\u5F8C\u5DF7",
    "\u5F85\u547D",
    "\u7A7A\u767D\u983B",
    "\u77ED\u8A0A"
  ];

  // src/domain/persona.ts
  var PERSONAS = [
    {
      id: "accuser",
      label: "\u5C16\u92B3\u6307\u63A7",
      talkativeness: 3,
      talk: [talk("\u7591"), talk("\u7591"), talk("\u672A\u5BE6\u9318")],
      draft: draft("\u6211\u89BA\u5F97\u8981\u518D\u6838\u5C0D\u4E00\u6B21\u5148\u597D\u9694\u96E2\u3002"),
      silence: [silence("\u4ECA\u591C\u6211\u5EFA\u8B70\u5931\u806F\u4E00\u500B\u71C8\u5854\u5E2D\u3002"), silence("\u5C0F\u5FC3\u7070\u983B\uFF0C\u5514\u597D\u4E82\u9001\u982D\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u4ECA\u8F2A\u6709\u4EBA\u7AD9\u5F97\u592A\u524D\u3002",
      plant: "\u6709\u4EBA\u8A71\u5462\u5E2D\u5514\u4E7E\u6DE8\u3002"
    },
    {
      id: "observer",
      label: "\u8B39\u614E\u65C1\u89C0",
      talkativeness: 1,
      talk: [talk("\u89C0\u671B"), talk("\u672A\u5BE6\u9318"), talk("\u518D\u807D\u4E00\u8F2A"), talk("\u5C0F\u5FC3\u932F\u7968")],
      draft: draft("\u6211\u672A\u6709\u65B0\u6599\uFF0C\u4FDD\u6301\u89C0\u671B\u3002"),
      silence: [silence("\u4ECA\u8F2A\u8DF3\u904E\uFF0C\u5514\u597D\u66B4\u9732\u3002"), silence("\u53EF\u80FD\u6709\u63A9\u8B77\uFF0C\u63DB\u4E00\u500B\u76EE\u6A19\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u672A\u898B\u8DB3\u5920\u5931\u806F\u75D5\u8DE1\u3002",
      plant: "\u672A\u6838\u5BE6\u4E4B\u524D\uFF0C\u5462\u53E5\u53EA\u4FC2\u50B3\u805E\u3002"
    },
    {
      id: "bluffer",
      label: "\u5927\u8072\u865B\u5F35",
      talkativeness: 3,
      talk: [talk("\u4FDD"), talk("\u7591"), talk("\u8DDF\u7968")],
      draft: draft("\u6211\u8DDF\u591A\u6578\u7968\uFF0C\u5514\u8FFD\u52A0\u6307\u63A7\u3002"),
      silence: [silence("\u53EF\u80FD\u6709\u63A9\u8B77\uFF0C\u63DB\u4E00\u500B\u76EE\u6A19\u3002"), silence("\u6211\u8DDF\u7D44\u5167\u5605\u9078\u64C7\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u5462\u5E2D\u8B1B\u5F97\u592A\u6EFF\uFF0C\u5148\u7576\u672A\u6838\u3002",
      plant: "\u5176\u5BE6\u4FC2\u5C0D\u5BB6\u60F3\u5E36\u7BC0\u594F\u3002"
    },
    {
      id: "follower",
      label: "\u5B89\u975C\u8DDF\u7968",
      talkativeness: 0,
      talk: [talk("\u8DDF\u7968"), talk("\u89C0\u671B")],
      draft: draft("\u6211\u8DDF\u591A\u6578\u7968\uFF0C\u5514\u8FFD\u52A0\u6307\u63A7\u3002"),
      silence: [silence("\u6211\u8DDF\u7D44\u5167\u5605\u9078\u64C7\u3002"), silence("\u4ECA\u8F2A\u8DF3\u904E\uFF0C\u5514\u597D\u66B4\u9732\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u6211\u8DDF\u5834\u4E0A\u5DF2\u7D93\u8B1B\u904E\u5605\u65B9\u5411\u3002",
      plant: "\u6211\u807D\u5230\u540C\u591A\u6578\u4EBA\u4E00\u6A23\u5605\u65B9\u5411\u3002"
    },
    {
      id: "hunter",
      label: "\u591C\u7375\u512A\u5148",
      talkativeness: 2,
      talk: [talk("\u5C0F\u5FC3\u932F\u7968"), talk("\u5C0F\u5FC3\u932F\u7968"), talk("\u7591")],
      draft: draft("\u7184\u71C8\u4E4B\u5F8C\u5148\u518D\u7747\u5931\u806F\u908A\u500B\u3002"),
      silence: [silence("\u5C0F\u5FC3\u7070\u983B\uFF0C\u5514\u597D\u4E82\u9001\u982D\u3002"), silence("\u4ECA\u591C\u6211\u5EFA\u8B70\u5931\u806F\u4E00\u500B\u71C8\u5854\u5E2D\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u5148\u7559\u610F\u6703\u67E5\u4EBA\u540C\u6703\u91D8\u9078\u5605\u5E2D\u3002",
      plant: "\u591C\u665A\u5148\u6703\u77E5\u908A\u500B\u771F\u4FC2\u5371\u96AA\u3002"
    },
    {
      id: "anchor",
      label: "\u5B88\u7DDA\u7A69\u7968",
      talkativeness: 2,
      talk: [talk("\u7747\u7DDA\u5831"), talk("\u4FDD"), talk("\u672A\u5BE6\u9318")],
      draft: draft("\u6211\u89BA\u5F97\u8981\u518D\u6838\u5C0D\u4E00\u6B21\u5148\u597D\u9694\u96E2\u3002"),
      silence: [silence("\u53EF\u80FD\u6709\u63A9\u8B77\uFF0C\u63DB\u4E00\u500B\u76EE\u6A19\u3002"), silence("\u5C0F\u5FC3\u7070\u983B\uFF0C\u5514\u597D\u4E82\u9001\u982D\u3002")],
      pin: "\u6211\u91D8\u4F4E\u4E00\u53E5\uFF1A\u672A\u5C0D\u5230\u55AE\u4E4B\u524D\uFF0C\u5514\u597D\u9760\u611F\u89BA\u9694\u96E2\u3002",
      plant: "\u5462\u53E5\u540C\u7DDA\u5831\u5514\u4E00\u81F4\u3002"
    }
  ];
  function personaForSeat(seatIndex, salt) {
    const index = (seatIndex + (salt >>> 0)) % PERSONAS.length;
    return PERSONAS[index] ?? PERSONAS[0];
  }
  function personaById(id) {
    return PERSONAS.find((persona) => persona.id === id) ?? PERSONAS[0];
  }
  function speakPriority(id) {
    return personaById(id).talkativeness;
  }
  function duelPresserId(pair) {
    if (pair.length !== 2) return null;
    const [left, right] = pair;
    if (!left || !right) return null;
    const leftScore = left.personaId ? speakPriority(left.personaId) : 0;
    const rightScore = right.personaId ? speakPriority(right.personaId) : 0;
    if (leftScore > rightScore) return left.id;
    if (rightScore > leftScore) return right.id;
    return left.index <= right.index ? left.id : right.id;
  }
  function shouldSpeak(id, round, index, salt) {
    const talkativeness = speakPriority(id);
    if (talkativeness >= 3) return true;
    if (talkativeness === 2) return round === 1 || (round + index + salt % 2) % 2 === 0;
    if (talkativeness === 1) return (round + index) % 2 === 1;
    return (round + salt % 3) % 3 === index % 3;
  }
  function shouldDraft(id, round, index) {
    if (id === "follower") return round % 3 === index % 3;
    if (id === "observer") return round % 2 === 0;
    return true;
  }
  function wantsAnonymous(id) {
    return id === "bluffer" || id === "hunter" || id === "accuser";
  }
  function talkDecision(ctx) {
    const persona = ctx.selfPersona ? personaById(ctx.selfPersona) : PERSONAS[1];
    const phrase = persona.talk[(ctx.round + ctx.selfIndex) % persona.talk.length] ?? "\u89C0\u671B";
    if (phrase !== "\u7591" && phrase !== "\u4FDD") return { text: phrase, kind: "line", targetId: null };
    const targetId = phrase === "\u4FDD" ? protectTarget(ctx) : accuseTarget(ctx);
    return finishTalk(ctx, phrase, targetId);
  }
  function draftLine(ctx) {
    if (!ctx.selfPersona) return null;
    if (!shouldDraft(ctx.selfPersona, ctx.round, ctx.selfIndex)) return null;
    return personaById(ctx.selfPersona).draft;
  }
  function silenceLine(ctx) {
    const persona = ctx.selfPersona ? personaById(ctx.selfPersona) : PERSONAS[3];
    return persona.silence[(ctx.selfIndex + ctx.night) % persona.silence.length] ?? persona.silence[0];
  }
  function voteTarget(ctx) {
    if (!ctx.selfPersona) return null;
    const pool = enemies(ctx);
    if (pool.length === 0) return null;
    if (ctx.selfFaction === "silence") return silenceVote(ctx, pool);
    return townVote(ctx, pool);
  }
  function dayPlan(ctx) {
    const personaId = ctx.selfPersona;
    const role = ctx.selfRole;
    if (!personaId || !role) return {};
    const persona = personaById(personaId);
    const plan = {};
    if (role === "tip") plan.pin = persona.pin;
    if (role === "link") {
      const id = linkTarget(ctx);
      if (id) plan.linkId = id;
    }
    if (role === "decoy") {
      const fake = dayFake(ctx);
      if (fake) plan.fake = fake;
    }
    if (role === "warrant" && (personaId === "accuser" || personaId === "hunter") && ctx.marks.length < 4) {
      const id = markTarget(ctx, unmarked(ctx));
      if (id) plan.markId = id;
    }
    return plan;
  }
  function nightSide(ctx) {
    if (ctx.selfRole !== "decoy" || !ctx.selfPersona || ctx.fakeCharges <= 0) return null;
    const persona = personaById(ctx.selfPersona);
    if (ctx.selfPersona === "anchor" || ctx.selfPersona === "observer" || ctx.selfPersona === "bluffer") {
      return { mode: "plant", text: persona.plant };
    }
    if ((ctx.selfPersona === "hunter" || ctx.selfPersona === "accuser") && ctx.openPinIds[0]) {
      return { mode: "flag", pinId: ctx.openPinIds[0] };
    }
    if (ctx.selfPersona === "hunter") return { mode: "plant", text: persona.plant };
    return null;
  }
  function nightCommand(ctx) {
    const role = ctx.selfRole;
    const persona = ctx.selfPersona;
    if (!role || !persona) return null;
    if (role === "silencer") return silenceKill(ctx);
    if (role === "cover") return coverPick(ctx);
    if (role === "sweep") return sweepPick(ctx);
    if (role === "warrant") return warrantNight(ctx);
    return null;
  }
  function townVote(ctx, pool) {
    const persona = ctx.selfPersona;
    const dirty = pool.find((seat) => ctx.sweeps[seat.id] === "dirty");
    if (dirty && persona !== "bluffer") return dirty.id;
    if (ctx.round >= 5) return campTarget(ctx, pool);
    if (persona === "bluffer") return coldest(ctx, pool).id;
    if (persona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
    if (persona === "hunter") {
      if (ctx.round >= 4) return campTarget(ctx, pool);
      return null;
    }
    const heat = uniqueHeat(ctx, pool);
    const heatScore = heat ? suspicion(ctx, heat) : 0;
    if (persona === "observer") {
      if (ctx.round < 2) return null;
      if (heat && heatScore >= 2) return heat;
      if (ctx.round >= 3) return campTarget(ctx, pool);
      return null;
    }
    if (persona === "anchor") {
      if (heat && heatScore >= 4) return heat;
      return campTarget(ctx, pool);
    }
    if (persona === "follower") {
      if (heat && (ctx.round >= 2 || heatScore >= 4)) return heat;
      if (ctx.round >= 2) return campTarget(ctx, pool);
      return null;
    }
    return null;
  }
  function silenceVote(ctx, pool) {
    const persona = ctx.selfPersona;
    if (persona === "observer" && ctx.round < 2) return null;
    if (persona === "observer" || persona === "follower") {
      return uniqueHeat(ctx, pool);
    }
    if (persona === "bluffer") return coldest(ctx, pool).id;
    if (persona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 1)?.id ?? null;
    if (persona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
    return rotated(ctx, pool, 4)?.id ?? null;
  }
  function silenceKill(ctx) {
    const pool = enemies(ctx);
    if (pool.length === 0 || !ctx.selfPersona) return { action: "skip" };
    const holdsFirstNight = ctx.selfPersona === "observer" || ctx.selfPersona === "follower" || ctx.selfPersona === "anchor" || ctx.selfPersona === "bluffer";
    if (holdsFirstNight && ctx.night <= 1) return { action: "skip" };
    if (ctx.selfPersona === "hunter") {
      return { action: "disconnect", targetSeatId: pinFirst(ctx, pool) ?? rotated(ctx, pool, 1 + ctx.night).id };
    }
    if (ctx.selfPersona === "bluffer") return { action: "disconnect", targetSeatId: coldest(ctx, pool).id };
    if (ctx.selfPersona === "accuser") {
      const named = ownSuspect(ctx, pool);
      const hot = uniqueHeat(ctx, pool);
      if (ctx.night <= 1 && (!named || named !== hot)) return { action: "skip" };
      return { action: "disconnect", targetSeatId: named ?? rotated(ctx, pool, ctx.night).id };
    }
    if (ctx.selfPersona === "follower") {
      return { action: "disconnect", targetSeatId: uniqueHeat(ctx, pool) ?? rotated(ctx, pool, 2 + ctx.night).id };
    }
    return { action: "disconnect", targetSeatId: rotated(ctx, pool, 4 + ctx.night).id };
  }
  function coverPick(ctx) {
    if (!ctx.selfPersona) return { action: "skip" };
    if (!ctx.coverReady && ctx.selfPersona !== "bluffer") return { action: "skip" };
    if (ctx.selfPersona === "hunter") {
      const pin = pinFirst(ctx, others(ctx));
      if (pin) return { action: "cover", targetSeatId: pin };
      const hot = hottest(ctx, others(ctx));
      if (hot && suspicion(ctx, hot.id) > 0) return { action: "cover", targetSeatId: hot.id };
      return { action: "cover", targetSeatId: ctx.selfId };
    }
    if (ctx.selfPersona === "observer") {
      const hot = hottest(ctx, others(ctx));
      if (hot && suspicion(ctx, hot.id) >= 2) return { action: "cover", targetSeatId: hot.id };
      return { action: "cover", targetSeatId: ctx.selfId };
    }
    if (ctx.selfPersona === "anchor") {
      const pin = others(ctx).find((seat) => ctx.pinSeatIds.includes(seat.id));
      if (pin) return { action: "cover", targetSeatId: pin.id };
      const hunch = sharedHunch(ctx, others(ctx));
      return { action: "cover", targetSeatId: hunch ?? ctx.selfId };
    }
    if (ctx.selfPersona === "accuser") {
      const hot = hottest(ctx, others(ctx));
      if (hot && suspicion(ctx, hot.id) > 0) return { action: "cover", targetSeatId: hot.id };
      return { action: "cover", targetSeatId: ctx.selfId };
    }
    if (ctx.selfPersona === "follower") {
      const guarded = lastProtect(ctx) ?? sharedHunch(ctx, others(ctx));
      return { action: "cover", targetSeatId: guarded ?? ctx.selfId };
    }
    const decoy = rotated(ctx, others(ctx), 3);
    return decoy ? { action: "cover", targetSeatId: decoy.id } : { action: "skip" };
  }
  function sweepPick(ctx) {
    const unknown = enemies(ctx).filter((seat) => ctx.sweeps[seat.id] == null);
    const pool = unknown.length > 0 ? unknown : enemies(ctx);
    if (pool.length === 0 || !ctx.selfPersona) return { action: "skip" };
    const shift = ctx.selfPersona === "bluffer" ? 3 : ctx.selfPersona === "observer" ? 2 : ctx.selfPersona === "anchor" ? 1 : 0;
    const heat = ctx.selfPersona === "follower" || ctx.selfPersona === "accuser" || ctx.selfPersona === "hunter" ? uniqueHeat(ctx, pool) : null;
    const id = heat ?? rotated(ctx, pool, shift + ctx.night)?.id;
    return id ? { action: "sweep", targetSeatId: id } : { action: "skip" };
  }
  function warrantNight(ctx) {
    if (!ctx.selfPersona) return { action: "skip" };
    const wantSeal = !ctx.sealUsed && (ctx.selfPersona === "bluffer" || ctx.selfPersona === "hunter") && ctx.night >= 2 && (ctx.selfIndex + ctx.night) % 3 === 0;
    if (wantSeal) {
      const loud = loudest(ctx, enemies(ctx));
      if (loud) return { action: "seal", targetSeatId: loud.id };
    }
    const id = markTarget(ctx, unmarked(ctx));
    if (id) return { action: "mark", targetSeatId: id };
    return { action: "skip" };
  }
  function dayFake(ctx) {
    if (ctx.fakeCharges <= 0 || !ctx.selfPersona) return null;
    const persona = personaById(ctx.selfPersona);
    if (ctx.selfPersona === "anchor") return null;
    if (ctx.selfPersona === "observer" && ctx.round < 2) return null;
    if (ctx.selfPersona === "follower" && !(ctx.fakeCharges === 2 || ctx.fakeCharges === 1 && ctx.round >= 3)) return null;
    if ((ctx.selfPersona === "hunter" || ctx.selfPersona === "accuser") && ctx.openPinIds[0]) {
      return { mode: "flag", pinId: ctx.openPinIds[0] };
    }
    return { mode: "plant", text: persona.plant };
  }
  function linkTarget(ctx) {
    const pool = enemies(ctx);
    if (!ctx.selfPersona || pool.length === 0) return null;
    if (ctx.selfPersona === "follower") return uniqueHeat(ctx, pool) ?? pool[0]?.id ?? null;
    if (ctx.selfPersona === "observer") return rotated(ctx, pool, 1)?.id ?? null;
    if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 2)?.id ?? null;
    if (ctx.selfPersona === "accuser") return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
    return rotated(ctx, pool, ctx.selfPersona === "bluffer" ? 3 : 1)?.id ?? null;
  }
  function markTarget(ctx, pool) {
    if (!ctx.selfPersona || pool.length === 0) return null;
    if (ctx.selfPersona === "bluffer") return coldest(ctx, pool).id;
    if (ctx.selfPersona === "follower") return campTarget(ctx, pool);
    if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, ctx.night)?.id ?? null;
    if (ctx.selfPersona === "observer") return rotated(ctx, pool, 2)?.id ?? null;
    if (ctx.selfPersona === "anchor") {
      const ranked = bySuspicion(ctx, pool);
      return (ranked[1] ?? ranked[0])?.id ?? null;
    }
    const hot = hottest(ctx, pool);
    if (hot && suspicion(ctx, hot.id) > 0) return hot.id;
    return rotated(ctx, pool)?.id ?? null;
  }
  function accuseTarget(ctx) {
    const pool = enemies(ctx);
    if (pool.length === 0) return null;
    const dirty = pool.find((seat) => ctx.sweeps[seat.id] === "dirty");
    if (dirty && ctx.selfPersona !== "bluffer") return dirty.id;
    if (ctx.selfPersona === "hunter") return pinFirst(ctx, pool) ?? rotated(ctx, pool, 1)?.id ?? null;
    if (ctx.selfPersona === "bluffer") return rotated(ctx, pool, 3)?.id ?? null;
    return ownSuspect(ctx, pool) ?? rotated(ctx, pool)?.id ?? null;
  }
  function protectTarget(ctx) {
    if (ctx.selfFaction === "silence" && ctx.selfPersona === "bluffer") {
      const mate = ctx.seats.find((seat) => seat.alive && ctx.teammates.includes(seat.id));
      if (mate) return mate.id;
    }
    const clean = enemies(ctx).find((seat) => ctx.sweeps[seat.id] === "clean");
    if (clean) return clean.id;
    const pool = others(ctx);
    return pool.length ? coldest(ctx, pool).id : null;
  }
  function finishTalk(ctx, phrase, targetId) {
    if (!targetId) return { text: phrase, kind: "line", targetId: null };
    const nickname = ctx.seats.find((seat) => seat.id === targetId)?.nickname;
    if (!nickname) return { text: phrase, kind: "line", targetId: null };
    return { text: speakTalk(phrase, nickname), kind: phrase, targetId };
  }
  function campTarget(ctx, pool) {
    return uniqueHeat(ctx, pool) ?? sharedHunch(ctx, pool);
  }
  function sharedHunch(ctx, pool) {
    if (pool.length === 0) return null;
    const living = ctx.seats.filter((seat) => seat.alive).sort((a, b) => a.index - b.index);
    if (living.length === 0) return pool[0]?.id ?? null;
    const start = Math.abs(ctx.salt + ctx.round * 3) % living.length;
    for (let step = 0; step < living.length; step++) {
      const seat = living[(start + step) % living.length];
      if (seat && pool.some((item) => item.id === seat.id)) return seat.id;
    }
    return pool[0]?.id ?? null;
  }
  function enemies(ctx) {
    return others(ctx).filter((seat) => !ctx.teammates.includes(seat.id));
  }
  function others(ctx) {
    return ctx.seats.filter((seat) => seat.alive && seat.id !== ctx.selfId);
  }
  function unmarked(ctx) {
    return enemies(ctx).filter((seat) => !ctx.marks.includes(seat.id));
  }
  function suspicion(ctx, seatId) {
    let score = 0;
    for (const note of ctx.accusations) {
      if (note.targetId !== seatId) continue;
      if (note.kind === "\u7591") score += note.round === ctx.round ? 2 : 1;
      else score -= 1;
    }
    if (ctx.sweeps[seatId] === "dirty") score += 6;
    if (ctx.sweeps[seatId] === "clean") score -= 5;
    if (ctx.linkedUsed[seatId] === true) score += 2;
    if (ctx.linkedUsed[seatId] === false) score -= 1;
    return score;
  }
  function bySuspicion(ctx, pool) {
    return [...pool].sort((a, b) => suspicion(ctx, b.id) - suspicion(ctx, a.id) || a.index - b.index);
  }
  function hottest(ctx, pool) {
    return bySuspicion(ctx, pool)[0] ?? null;
  }
  function uniqueHeat(ctx, pool) {
    const ranked = bySuspicion(ctx, pool);
    const top = ranked[0];
    if (!top) return null;
    const score = suspicion(ctx, top.id);
    if (score < 2) return null;
    const second = ranked[1];
    if (second && suspicion(ctx, second.id) === score) return null;
    return top.id;
  }
  function coldest(ctx, pool) {
    const ranked = [...pool].sort((a, b) => suspicion(ctx, a.id) - suspicion(ctx, b.id) || a.index - b.index);
    const best = suspicion(ctx, ranked[0].id);
    const band = ranked.filter((seat) => suspicion(ctx, seat.id) === best);
    const offset = Math.abs(ctx.selfIndex + ctx.salt % 5) % band.length;
    return band[offset] ?? ranked[0];
  }
  function rotated(ctx, pool, shift = 0) {
    if (pool.length === 0) return null;
    const offset = Math.abs(ctx.selfIndex * 3 + ctx.round + shift + ctx.salt % 7) % pool.length;
    return pool[offset] ?? null;
  }
  function ownSuspect(ctx, pool) {
    const mine = ctx.accusations.filter((note) => note.fromId === ctx.selfId && note.kind === "\u7591");
    const latest = mine.length ? mine[mine.length - 1] : void 0;
    if (!latest) return null;
    return pool.some((seat) => seat.id === latest.targetId) ? latest.targetId : null;
  }
  function lastProtect(ctx) {
    const mine = ctx.accusations.filter((note) => note.fromId === ctx.selfId && note.kind === "\u4FDD");
    const latest = mine.length ? mine[mine.length - 1] : void 0;
    if (!latest) return null;
    const seat = ctx.seats.find((item) => item.id === latest.targetId);
    return seat?.alive ? seat.id : null;
  }
  function pinFirst(ctx, pool) {
    return pool.find((seat) => ctx.pinSeatIds.includes(seat.id))?.id ?? null;
  }
  function loudest(ctx, pool) {
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => accusationsFrom(ctx, b.id) - accusationsFrom(ctx, a.id) || b.index - a.index)[0] ?? null;
  }
  function accusationsFrom(ctx, seatId) {
    return ctx.accusations.filter((note) => note.fromId === seatId && note.kind === "\u7591").length;
  }
  function talk(phrase) {
    return phrase;
  }
  function draft(phrase) {
    return phrase;
  }
  function silence(phrase) {
    return phrase;
  }

  // src/domain/roles.ts
  var FACTION_LABEL = {
    lighthouse: "\u71C8\u5854\u7DB2",
    silence: "\u6D88\u97F3\u7D44",
    grey: "\u7070\u983B"
  };
  var ROLES = {
    tip: {
      id: "tip",
      name: "\u7DDA\u5831",
      faction: "lighthouse",
      mnemonic: "\u71C8\u4EAE\u91D8\u4E00\u53E5",
      when: "\u71C8\u4EAE",
      skill: "\u71C8\u4EAE\u53EF\u4EE5\u91D8\u4E00\u53E5\u516C\u958B\u7DDA\u5831\uFF0C\u5514\u4F54\u4F60\u5605\u767C\u8A00\u3002"
    },
    sweep: {
      id: "sweep",
      name: "\u6383\u983B",
      faction: "lighthouse",
      mnemonic: "\u7184\u71C8\u67E5\u4EBA",
      when: "\u7184\u71C8",
      skill: "\u7184\u71C8\u63C0\u4E00\u500B\u4EBA\uFF0C\u79C1\u4E0B\u77E5\u9053\u4F62\u4FC2\u6D88\u97F3\u5B9A\u4E7E\u6DE8\u3002"
    },
    cover: {
      id: "cover",
      name: "\u63A9\u8B77",
      faction: "lighthouse",
      mnemonic: "\u64CB\u4E00\u591C",
      when: "\u7184\u71C8",
      skill: "\u7184\u71C8\u4FDD\u4E00\u500B\u4EBA\u5514\u6703\u88AB\u5E36\u8D70\u3002\u6210\u529F\u5F8C\u4E0B\u4E00\u591C\u5514\u53EF\u4EE5\u518D\u7528\u3002"
    },
    echo: {
      id: "echo",
      name: "\u56DE\u6CE2",
      faction: "lighthouse",
      mnemonic: "\u7968\u8D70\u5148\u6709\u6599",
      when: "\u6709\u4EBA\u88AB\u7968\u8D70\u4E4B\u5F8C",
      skill: "\u6709\u4EBA\u88AB\u7968\u8D70\u4E4B\u5F8C\uFF0C\u4F60\u79C1\u4E0B\u6536\u5230\u4F62\u4FC2\u908A\u500B\u9663\u71DF\u3002"
    },
    link: {
      id: "link",
      name: "\u901A\u806F",
      faction: "lighthouse",
      mnemonic: "\u67E5\u4E0A\u8F2A",
      when: "\u71C8\u4EAE",
      skill: "\u71C8\u4EAE\u63C0\u4E00\u500B\u4EBA\uFF0C\u77E5\u9053\u4F62\u4E0A\u4E00\u8F2A\u7528\u904E\u6280\u80FD\u672A\u3002"
    },
    civilian: {
      id: "civilian",
      name: "\u5B88\u71C8",
      faction: "lighthouse",
      mnemonic: "\u5187\u6280\u80FD",
      when: "\u5187",
      skill: "\u5187\u6280\u80FD\u3002\u4F60\u9760\u8B1B\u4E00\u53E5\u3001\u5BEB\u8349\u7A3F\u540C\u6295\u7968\u3002"
    },
    silencer: {
      id: "silencer",
      name: "\u6D88\u97F3\u624B",
      faction: "silence",
      mnemonic: "\u7184\u71C8\u5E36\u8D70",
      when: "\u7184\u71C8",
      skill: "\u7184\u71C8\u63C0\u4E00\u500B\u5187\u63A9\u8B77\u5605\u4EBA\uFF0C\u4EE4\u4F62\u96E2\u5834\u3002"
    },
    decoy: {
      id: "decoy",
      name: "\u5047\u8A0A",
      faction: "silence",
      mnemonic: "\u6574\u4E82\u7DDA\u5831",
      when: "\u71C8\u4EAE\u6216\u7184\u71C8",
      skill: "\u6BCF\u5C40\u5169\u6B21\u3002\u53EF\u4EE5\u653E\u4E00\u53E5\u5047\u6599\uFF0C\u6216\u8005\u6A19\u4E00\u689D\u7DDA\u5831\u672A\u6838\u5BE6\u3002"
    },
    plant: {
      id: "plant",
      name: "\u5F71\u71C8",
      faction: "silence",
      mnemonic: "\u7B2C\u4E00\u6B21\u88DD\u4E7E\u6DE8",
      when: "\u88AB\u67E5\u6216\u8005\u6295\u7968",
      skill: "\u7B2C\u4E00\u6B21\u88AB\u6383\u983B\u6703\u986F\u793A\u4E7E\u6DE8\u3002\u6295\u7968\u53EF\u4EE5\u533F\u540D\u4E00\u6B21\u3002"
    },
    warrant: {
      id: "warrant",
      name: "\u5B64\u8B49",
      faction: "grey",
      mnemonic: "\u6697\u6A19\u5169\u500B\u5C31\u8D0F",
      when: "\u96A8\u6642\u6A19\uFF0C\u7184\u71C8\u5C01\u53E3",
      skill: "\u6697\u4E2D\u6A19\u6D88\u97F3\u3002\u6A19\u4E2D\u5169\u500B\u53C8\u4ECD\u7136\u5728\u5834\u5C31\u4F60\u7368\u8D0F\u3002\u7184\u71C8\u53EF\u4EE5\u5C01\u4E00\u500B\u4EBA\u5514\u51C6\u8B1B\u3002"
    }
  };
  var STANDARD_DEAL = [
    "tip",
    "sweep",
    "cover",
    "echo",
    "link",
    "civilian",
    "civilian",
    "silencer",
    "decoy",
    "plant",
    "warrant"
  ];
  var PHASE_LABEL = {
    lobby: "\u7D44\u5E2D",
    boot: "\u958B\u5C40\u62BD\u8EAB\u5206",
    day_talk: "\u71C8\u4EAE\u8A0E\u8AD6",
    draft: "\u79C1\u4EBA\u8349\u7A3F",
    vote: "\u6295\u7968\u9694\u96E2",
    resolve: "\u7D50\u7B97",
    night: "\u7184\u71C8\u884C\u52D5",
    check: "\u52DD\u8CA0\u6AA2\u5B9A",
    ended: "\u7D42\u5C40"
  };

  // src/domain/votes.ts
  function uniqueLeader(targets) {
    const counts = /* @__PURE__ */ new Map();
    for (const target of targets) {
      if (!target) continue;
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    let leader = null;
    let best = 0;
    let tie = false;
    for (const [id, count] of counts) {
      if (count > best) {
        leader = id;
        best = count;
        tie = false;
      } else if (count === best) {
        tie = true;
      }
    }
    if (tie || leader == null) return null;
    return leader;
  }

  // src/domain/engine.ts
  var NIGHT_LABEL = {
    disconnect: { label: "\u5E36\u8D70\u5462\u500B\u4EBA", needsTarget: true },
    cover: { label: "\u63A9\u8B77\u5462\u500B\u4EBA", needsTarget: true },
    sweep: { label: "\u6383\u5462\u500B\u4EBA", needsTarget: true },
    mark: { label: "\u6697\u6A19\u5462\u500B\u4EBA", needsTarget: true },
    seal: { label: "\u5C01\u53E3\uFF0C\u5514\u51C6\u8B1B", needsTarget: true },
    skip: { label: "\u4ECA\u591C\u5514\u7528", needsTarget: false }
  };
  function ok() {
    return { ok: true };
  }
  function fail(code, message) {
    return { ok: false, code, message };
  }
  function shuffle(items, rng) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
  var GameEngine = class {
    rng;
    autoAi;
    personaSalt;
    seats = [];
    phase = "lobby";
    round = 0;
    nightNumber = 0;
    banner = "\u79C1\u4EBA\u623F\u672A\u958B\u5C40\u3002\u7A7A\u4F4D\u6703\u7531 AI \u88DC\u4E0A\uFF0C\u5FBD\u7AE0\u6703\u4E00\u76F4\u986F\u793A\u3002";
    log = [];
    successfulDisconnects = 0;
    winner = null;
    votes = /* @__PURE__ */ new Map();
    drafts = /* @__PURE__ */ new Map();
    nightActions = /* @__PURE__ */ new Map();
    chatCount = /* @__PURE__ */ new Map();
    pins = [];
    pinSeq = 0;
    tokenSeq = 0;
    silenceNotes = [];
    silenceSent = /* @__PURE__ */ new Map();
    deadlineAt = null;
    accusations = [];
    aiTrace = [];
    constructor(opts = {}) {
      this.rng = opts.rng ?? Math.random;
      this.autoAi = opts.autoAi ?? false;
      const salt = opts.personaSalt ?? 0;
      this.personaSalt = Number.isFinite(salt) ? Math.trunc(salt) : 0;
    }
    getPhase() {
      return this.phase;
    }
    getRound() {
      return this.round;
    }
    getNight() {
      return this.nightNumber;
    }
    getDisconnects() {
      return this.successfulDisconnects;
    }
    /** Absolute time in ms when the current phase should advance. Null clears it. */
    setPhaseDeadline(at) {
      this.deadlineAt = at;
    }
    addPlayer(playerId, nickname) {
      if (this.phase !== "lobby") return fail("already_started", "\u5C40\u5DF2\u958B\u59CB\uFF0C\u5514\u53EF\u4EE5\u518D\u5165\u5EA7\u3002");
      if (this.seats.length >= RULES.seatCount) return fail("room_full", "\u5E2D\u4F4D\u5DF2\u6EFF\u3002");
      const name = cleanName(nickname);
      if (!name) return fail("nickname", "\u8ACB\u586B\u4E00\u500B\u66B1\u7A31\u3002");
      const seat = this.makeSeat(playerId, name, false);
      seat.reclaimToken = this.nextToken();
      this.seats.push(seat);
      return { ok: true, seatId: seat.id };
    }
    fillWithAi() {
      if (this.phase !== "lobby") return 0;
      let added = 0;
      while (this.seats.length < RULES.seatCount) {
        const index = this.seats.length;
        const nickname = AI_NICKNAMES[index % AI_NICKNAMES.length] ?? "AI";
        const playerId = `ai-${this.seats.length + 1}`;
        this.seats.push(this.makeSeat(playerId, nickname, true));
        added += 1;
      }
      return added;
    }
    /**
     * Deal roles and enter Boot. `deal` is seat-ordered and only for tests / the scripted demo.
     * Clients never receive the full deal.
     */
    setLobbyReady(playerId, ready) {
      if (this.phase !== "lobby") return fail("locked", "\u623F\u9593\u5DF2\u9396\u5B9A\uFF0C\u5514\u53EF\u4EE5\u518D\u6539\u6E96\u5099\u3002");
      const seat = this.seats.find((item) => item.playerId === playerId);
      if (!seat) return fail("not_seated", "\u4F60\u672A\u5165\u5EA7\u3002");
      if (seat.isAi) return fail("not_your_skill", "AI \u5E2D\u5514\u4F7F\u6E96\u5099\u3002");
      seat.lobbyReady = ready;
      return ok();
    }
    /**
     * Trial rooms show the dealt role before Boot. Live rooms stay hidden until start.
     * Public snapshots still omit every role id.
     */
    previewDeal() {
      if (this.phase !== "lobby") return;
      this.fillWithAi();
      if (this.seats.length !== RULES.seatCount) return;
      if (this.seats.every((seat) => seat.roleId)) return;
      const roles = shuffle(STANDARD_DEAL, this.rng);
      this.assertDeal(roles);
      this.assignRoles(roles);
    }
    /**
     * Host start. When `enforceLobbyReady` is set, every seated human must be ready.
     * Empty seats are filled with AI, then the room locks at Boot.
     */
    start(deal, opts) {
      if (this.phase !== "lobby") return fail("already_started", "\u5C40\u5DF2\u958B\u59CB\u3002");
      if (opts?.enforceLobbyReady) {
        const humans = this.seats.filter((seat) => !seat.isAi);
        if (humans.length === 0 || humans.some((seat) => !seat.lobbyReady)) {
          return fail("not_ready", "\u672A\u9F4A\u4EBA\u6E96\u5099\u597D\uFF0C\u672A\u53EF\u4EE5\u958B\u5C40\u3002");
        }
      }
      this.fillWithAi();
      if (this.seats.length !== RULES.seatCount) {
        return fail("need_seats", `\u8981 ${RULES.seatCount} \u5E2D\u5148\u53EF\u4EE5\u958B\u5C40\u3002`);
      }
      const predealt = !deal && this.seats.every((seat) => seat.roleId);
      const roles = deal ? [...deal] : predealt ? this.seats.map((seat) => seat.roleId) : shuffle(STANDARD_DEAL, this.rng);
      this.assertDeal(roles);
      if (!predealt) this.assignRoles(roles);
      this.phase = "boot";
      for (const seat of this.seats) seat.ready = false;
      this.banner = "\u8EAB\u5206\u5DF2\u79C1\u4E0B\u6D3E\u767C\u3002\u516C\u958B\u7D44\u6210\uFF1A\u71C8\u5854\u7DB2 \xD77\u3001\u6D88\u97F3\u7D44 \xD73\u3001\u7070\u983B \xD71\u3002";
      this.pushLog("\u6A19\u6E96 Mode \u958B\u5C40\u3002\u516C\u958B\u7D44\u6210\uFF1A\u71C8\u5854\u7DB2 \xD77\u3001\u6D88\u97F3\u7D44 \xD73\u3001\u7070\u983B \xD71\u3002\u4F60\u53EA\u6703\u6536\u5230\u81EA\u5DF1\u5605\u8EAB\u5206\u3002");
      this.markAiReady();
      return ok();
    }
    submitChat(playerId, text) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "day_talk") return fail("wrong_phase", "\u800C\u5BB6\u5514\u4FC2\u71C8\u4EAE\u8A0E\u8AD6\u3002");
      if (this.isSealed(seat.seat)) return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002");
      const body = text.trim().slice(0, 80);
      if (!body) return fail("empty", "\u8B1B\u53E5\u77ED\u5605\u5148\u3002");
      const used = this.chatCount.get(playerId) ?? 0;
      if (used >= 4) return fail("limit", "\u4F60\u4ECA\u8F2A\u767C\u8A00\u5DF2\u5920\uFF0C\u7559\u8FD4\u4F4D\u7F6E\u7540\u4EBA\u3002");
      this.chatCount.set(playerId, used + 1);
      this.pushLog(`${seat.seat.nickname}\uFF1A${body}`);
      return ok();
    }
    submitDraft(playerId, text) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "draft") return fail("wrong_phase", "\u800C\u5BB6\u5514\u4FC2\u79C1\u4EBA\u8349\u7A3F\u3002");
      if (this.isSealed(seat.seat)) return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u8349\u7A3F\u90FD\u4EA4\u5514\u5230\u3002");
      this.drafts.set(playerId, text.trim().slice(0, 80));
      return ok();
    }
    submitVote(playerId, targetSeatId, anonymous = false) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "vote") return fail("wrong_phase", "\u800C\u5BB6\u5514\u4FC2\u6295\u7968\u3002");
      if (anonymous) {
        if (seat.seat.roleId !== "plant") return fail("not_your_skill", "\u53EA\u6709\u5F71\u71C8\u53EF\u4EE5\u6295\u533F\u540D\u7968\u3002");
        if (seat.seat.anonymousVoteUsed) return fail("anonymous_spent", "\u4F60\u672C\u5C40\u533F\u540D\u7968\u5DF2\u7D93\u7528\u904E\u3002");
      }
      if (targetSeatId == null) {
        this.votes.set(playerId, { target: null, anonymous });
        if (this.autoAi) this.syncAiVotes();
        return ok();
      }
      const target = this.seatById(targetSeatId);
      if (!target || !target.alive) return fail("illegal_target", "\u7968\u53EA\u53EF\u4EE5\u6295\u4FFE\u4ECD\u5728\u5834\u5605\u4EBA\u3002");
      if (target.id === seat.seat.id) return fail("illegal_target", "\u5514\u53EF\u4EE5\u6295\u81EA\u5DF1\u3002");
      this.votes.set(playerId, { target: target.id, anonymous });
      if (this.autoAi) this.syncAiVotes();
      return ok();
    }
    /** 線報員：釘一條公開殘訊。每輪燈亮一次，唔佔發言格。 */
    submitPin(playerId, text) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "day_talk") return fail("wrong_phase", "\u91D8\u9078\u53EA\u53EF\u4EE5\u55BA\u71C8\u4EAE\u505A\u3002");
      if (seat.seat.roleId !== "tip") return fail("not_your_skill", "\u53EA\u6709\u7DDA\u5831\u53EF\u4EE5\u91D8\u9078\u3002");
      if (this.isSealed(seat.seat)) return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002");
      if (seat.seat.pinnedThisRound) return fail("pin_spent", "\u4F60\u4ECA\u8F2A\u5DF2\u7D93\u91D8\u904E\u3002");
      const body = text.trim().slice(0, 80);
      if (!body) return fail("empty", "\u91D8\u9078\u8981\u6709\u4E00\u53E5\u5167\u5BB9\u3002");
      this.pinSeq += 1;
      this.pins.push({ id: `pin${this.pinSeq}`, text: body, unverified: false });
      seat.seat.pinnedThisRound = true;
      seat.seat.everPinned = true;
      this.markSkill(seat.seat);
      this.pushLog(`\u91D8\u9078\uFF5C${seat.seat.nickname}\uFF1A${body}`);
      return ok();
    }
    /** 通聯官：私下得知目標上回合用過主動技能未。唔講係邊種。 */
    submitLink(playerId, targetSeatId) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "day_talk") return fail("wrong_phase", "\u6838\u5C0D\u901A\u806F\u53EA\u53EF\u4EE5\u55BA\u71C8\u4EAE\u505A\u3002");
      if (seat.seat.roleId !== "link") return fail("not_your_skill", "\u53EA\u6709\u901A\u806F\u53EF\u4EE5\u6838\u5C0D\u3002");
      if (this.isSealed(seat.seat)) return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002");
      if (seat.seat.linkedThisRound) return fail("link_spent", "\u4F60\u4ECA\u8F2A\u5DF2\u7D93\u6838\u5C0D\u904E\u3002");
      const target = this.seatById(targetSeatId);
      if (!target || !target.alive) return fail("illegal_target", "\u76EE\u6A19\u8981\u4ECD\u7136\u5728\u5834\u3002");
      if (target.id === seat.seat.id) return fail("illegal_target", "\u5514\u53EF\u4EE5\u6838\u5C0D\u81EA\u5DF1\u3002");
      seat.seat.linkedThisRound = true;
      this.markSkill(seat.seat);
      seat.seat.linkedUsed[target.id] = target.usedSkillLastRound;
      const used = target.usedSkillLastRound ? "\u7528\u904E" : "\u672A\u7528\u904E";
      seat.seat.inbox.push(`\u901A\u806F\uFF1A${target.nickname} \u4E0A\u56DE\u5408${used}\u4E3B\u52D5\u6280\u80FD\u3002`);
      return ok();
    }
    /**
     * 假訊員：每局兩次。flag 將已釘殘訊標做待核實；plant 放一句來源未核。
     * 燈亮同熄燈都可以用。公開唔會講係邊個放。
     */
    submitFake(playerId, input) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "day_talk" && this.phase !== "night") return fail("wrong_phase", "\u5047\u8A0A\u53EA\u53EF\u4EE5\u55BA\u71C8\u4EAE\u6216\u8005\u7184\u71C8\u653E\u3002");
      if (seat.seat.roleId !== "decoy") return fail("not_your_skill", "\u53EA\u6709\u5047\u8A0A\u53EF\u4EE5\u653E\u6599\u3002");
      if (this.phase === "day_talk" && this.isSealed(seat.seat)) return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002");
      if (seat.seat.fakeCharges <= 0) return fail("quota", "\u4F60\u672C\u5C40\u5047\u8A0A\u984D\u5EA6\u5DF2\u7528\u5B8C\u3002");
      if (input.mode === "flag") {
        const pin = this.pins.find((item) => item.id === input.pinId);
        if (!pin) return fail("illegal_target", "\u8981\u63C0\u4E00\u689D\u5DF2\u7D93\u91D8\u4F4E\u5605\u6B98\u8A0A\u3002");
        if (pin.unverified) return fail("already_flagged", "\u5462\u689D\u5DF2\u7D93\u4FC2\u5F85\u6838\u5BE6\u3002");
        pin.unverified = true;
        this.pushLog("\u4E00\u689D\u91D8\u9078\u88AB\u6A19\u505A\u5F85\u6838\u5BE6\u3002");
      } else {
        const body = (input.text ?? "").trim().slice(0, 80);
        if (!body) return fail("empty", "\u5047\u8A0A\u8981\u6709\u4E00\u53E5\u5167\u5BB9\u3002");
        this.pushLog(`\u4F86\u6E90\u672A\u6838\uFF1A${body}`);
      }
      seat.seat.fakeCharges -= 1;
      this.markSkill(seat.seat);
      seat.seat.inbox.push(`\u5047\u8A0A\u5DF2\u6295\u653E\u3002\u5269\u9918 ${seat.seat.fakeCharges} \u6B21\u3002`);
      return ok();
    }
    /** In-game drop: the same seat becomes AI and keeps role plus private state. */
    takeoverAsAi(playerId) {
      const seat = this.seats.find((item) => item.playerId === playerId);
      if (!seat) return fail("not_seated", "\u4F60\u672A\u5165\u5EA7\u3002");
      if (this.phase === "lobby") return fail("not_started", "\u672A\u958B\u5C40\u3002");
      if (seat.isAi) return ok();
      seat.isAi = true;
      if (!seat.personaId) seat.personaId = personaForSeat(this.seatIndex(seat), this.personaSalt).id;
      this.pushLog(`${seat.nickname} \u65B7\u7DDA\uFF0CAI \u63A5\u7BA1\u540C\u4E00\u5E2D\u3002\u5FBD\u7AE0\u4FDD\u6301\u3002`);
      if (this.autoAi && seat.alive) {
        this.catchUpAi(seat);
        seat.ready = true;
      }
      return ok();
    }
    removeLobbyPlayer(playerId) {
      if (this.phase !== "lobby") return;
      const index = this.seats.findIndex((seat) => seat.playerId === playerId);
      if (index >= 0) this.seats.splice(index, 1);
    }
    /** Mark or clear one private silence suspect. Does not reveal whether it is correct. */
    submitSuspect(playerId, targetSeatId, marked) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (seat.seat.roleId !== "warrant") return fail("not_your_skill", "\u53EA\u6709\u5B64\u8B49\u53EF\u4EE5\u6A19\u8A18\u3002");
      if (this.phase !== "day_talk" && this.phase !== "draft" && this.phase !== "night") {
        return fail("wrong_phase", "\u6A19\u8A18\u53EF\u4EE5\u55BA\u71C8\u4EAE\u3001\u8349\u7A3F\u6216\u8005\u7184\u71C8\u6539\u3002");
      }
      if (this.isSealed(seat.seat) && this.phase !== "night") return fail("sealed", "\u4F60\u88AB\u5C01\u53E3\uFF0C\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002");
      const target = this.seatById(targetSeatId);
      if (!target || !target.alive) return fail("illegal_target", "\u76EE\u6A19\u8981\u4ECD\u7136\u5728\u5834\u3002");
      if (target.id === seat.seat.id) return fail("illegal_target", "\u5514\u53EF\u4EE5\u6A19\u8A18\u81EA\u5DF1\u3002");
      const has = seat.seat.silenceMarks.includes(target.id);
      if (marked && !has) {
        seat.seat.silenceMarks.push(target.id);
        this.markSkill(seat.seat);
        seat.seat.inbox.push(`\u5DF2\u6A19\u8A18 ${target.nickname}\u3002\u6A19\u8A18\u53EA\u5F97\u4F60\u77E5\u3002`);
      } else if (!marked && has) {
        seat.seat.silenceMarks = seat.seat.silenceMarks.filter((id) => id !== target.id);
        this.markSkill(seat.seat);
        seat.seat.inbox.push(`\u5DF2\u53D6\u6D88\u6A19\u8A18 ${target.nickname}\u3002`);
      }
      return ok();
    }
    /**
     * Original human returns. Only the token issued for that seat works.
     * Lobby drops delete the seat, so there is nothing to reclaim.
     */
    reclaim(newPlayerId, token) {
      if (!token) return fail("token_unknown", "\u6435\u5514\u5230\u4F60\u539F\u672C\u5605\u5E2D\u3002");
      const seat = this.seats.find((item) => item.reclaimToken === token);
      if (!seat) return fail("token_unknown", "\u6435\u5514\u5230\u4F60\u539F\u672C\u5605\u5E2D\u3002");
      if (!seat.isAi) return fail("not_taken", "\u5462\u5E2D\u672A\u4EA4\u4FFE AI\u3002");
      if (this.seats.some((item) => item.playerId === newPlayerId)) return fail("already_in_room", "\u4F60\u5DF2\u7D93\u55BA\u4E00\u9593\u623F\u3002");
      const oldId = seat.playerId;
      this.rekey(oldId, newPlayerId);
      seat.isAi = false;
      seat.ready = false;
      this.pushLog(`${seat.nickname} \u91CD\u65B0\u5165\u5EA7\uFF0CAI \u4EA4\u9084\u63A7\u5236\u3002`);
      return ok();
    }
    submitNight(playerId, command) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "night") return fail("wrong_phase", "\u800C\u5BB6\u5514\u4FC2\u7184\u71C8\u884C\u52D5\u3002");
      const allowed = this.actionsFor(seat.seat);
      if (!allowed.some((item) => item.action === command.action)) {
        return fail("not_your_skill", "\u4F60\u4ECA\u591C\u5187\u5462\u500B\u884C\u52D5\u3002");
      }
      if (command.action === "skip") {
        this.nightActions.set(playerId, { action: "skip" });
        return ok();
      }
      if (command.action === "seal" && seat.seat.sealUsed) {
        return fail("seal_spent", "\u4F60\u672C\u5C40\u5C01\u53E3\u5DF2\u7D93\u7528\u904E\u3002");
      }
      const targetId = command.targetSeatId;
      if (!targetId) return fail("illegal_target", "\u8ACB\u63C0\u4E00\u500B\u76EE\u6A19\u3002");
      const target = this.seatById(targetId);
      if (!target || !target.alive) return fail("illegal_target", "\u76EE\u6A19\u8981\u4ECD\u7136\u5728\u5834\u3002");
      if (target.id === seat.seat.id && command.action !== "cover") {
        return fail("illegal_target", "\u5462\u500B\u884C\u52D5\u5514\u53EF\u4EE5\u63C0\u81EA\u5DF1\u3002");
      }
      this.nightActions.set(playerId, { action: command.action, targetSeatId: target.id });
      return ok();
    }
    /** 消音組夜訊。必須係模板原句，而且唔會寫入公開頻道。 */
    submitSilence(playerId, text) {
      const seat = this.requireLiving(playerId);
      if (!seat.ok) return seat;
      if (this.phase !== "night") return fail("wrong_phase", "\u591C\u8A0A\u53EA\u53EF\u4EE5\u55BA\u7184\u71C8\u9001\u3002");
      if (this.factionOf(seat.seat) !== "silence") return fail("not_your_skill", "\u53EA\u6709\u6D88\u97F3\u7D44\u53EF\u4EE5\u5165\u591C\u8A0A\u3002");
      const body = text.trim();
      if (!SILENCE_TEMPLATES.includes(body)) {
        return fail("template_only", "\u591C\u8A0A\u53EA\u53EF\u4EE5\u7528\u6A21\u677F\u77ED\u53E5\u3002");
      }
      const sent = this.silenceSent.get(playerId) ?? 0;
      if (sent >= 2) return fail("limit", "\u4F60\u4ECA\u591C\u591C\u8A0A\u5DF2\u5920\u3002");
      this.silenceSent.set(playerId, sent + 1);
      this.silenceNotes.push({ seatId: seat.seat.id, nickname: seat.seat.nickname, text: body });
      return ok();
    }
    setReady(playerId) {
      const seat = this.seats.find((item) => item.playerId === playerId);
      if (!seat) return fail("not_seated", "\u4F60\u672A\u5165\u5EA7\u3002");
      if (!seat.alive) return fail("dead", "\u4F60\u5DF2\u96E2\u5834\u3002");
      const actionable = ["boot", "day_talk", "draft", "vote", "night"];
      if (!actionable.includes(this.phase)) return fail("wrong_phase", "\u5462\u500B\u968E\u6BB5\u5514\u4F7F\u6E96\u5099\u3002");
      seat.ready = true;
      return ok();
    }
    /** True when every living human has readied. An all-AI table does not auto-fire. */
    everyoneReady() {
      const humans = this.seats.filter((seat) => seat.alive && !seat.isAi);
      if (humans.length === 0) return false;
      return humans.every((seat) => seat.ready);
    }
    /**
     * Apply timeout defaults for anyone who has not acted, then move one phase.
     * Tie votes isolate nobody. Night with no order skips.
     */
    advance() {
      switch (this.phase) {
        case "lobby":
          throw new Error("game has not started");
        case "ended":
          return;
        case "boot":
          this.beginDay(1);
          return;
        case "day_talk":
          this.beginPhase("draft");
          this.aiDraft();
          return;
        case "draft":
          this.fillMissingDrafts();
          this.publishDrafts();
          this.beginPhase("vote");
          this.syncAiVotes();
          return;
        case "vote":
          this.fillMissingVotes();
          this.syncAiVotes(true);
          this.resolveVotes();
          this.beginPhase("resolve");
          return;
        case "resolve":
          this.nightNumber += 1;
          this.silenceSent.clear();
          this.beginPhase("night");
          this.aiNight();
          return;
        case "night":
          this.fillMissingNights();
          this.resolveNight();
          this.beginPhase("check");
          this.evaluate();
          return;
        case "check":
          if (this.winner) {
            this.beginPhase("ended");
            this.banner = this.winner.reason;
            return;
          }
          this.beginDay(this.round + 1);
          return;
        default:
          return;
      }
    }
    publicView() {
      return {
        mode: "standard",
        phase: this.phase,
        phaseLabel: PHASE_LABEL[this.phase] ?? this.phase,
        round: this.round,
        night: this.nightNumber,
        banner: this.banner,
        composition: { ...RULES.composition },
        seats: this.seats.map((seat) => ({
          id: seat.id,
          nickname: seat.nickname,
          isAi: seat.isAi,
          alive: seat.alive,
          sealed: this.isSealed(seat),
          lobbyReady: seat.lobbyReady
        })),
        log: this.log.map((entry) => ({ text: entry.text })),
        pins: this.pins.map((pin) => ({ ...pin })),
        disconnects: this.successfulDisconnects,
        disconnectsToWin: RULES.silenceWin.successfulDisconnects,
        winner: this.winner ? { ...this.winner } : null,
        hostSeatId: this.seats[0]?.id ?? null,
        locked: this.phase !== "lobby",
        secondsLeft: this.secondsLeft(),
        reveal: this.phase === "ended" ? this.revealSeats() : null
      };
    }
    /** Packet for this player only. Other hidden roles are not included. */
    privateView(playerId) {
      const seat = this.seats.find((item) => item.playerId === playerId) ?? null;
      const role = seat?.roleId ? ROLES[seat.roleId] : null;
      return {
        playerId,
        seatId: seat?.id ?? null,
        isHost: seat != null && seat.id === this.seats[0]?.id,
        alive: seat?.alive ?? false,
        canSpeak: seat != null && seat.alive && !this.isSealed(seat) && (this.phase === "day_talk" || this.phase === "draft"),
        canVote: seat != null && seat.alive && this.phase === "vote",
        ready: seat == null ? false : this.phase === "lobby" ? seat.lobbyReady : seat.ready,
        role: role ? {
          id: role.id,
          name: role.name,
          faction: role.faction,
          factionLabel: FACTION_LABEL[role.faction],
          skill: role.skill,
          mnemonic: role.mnemonic,
          when: role.when
        } : null,
        teammates: seat ? this.teammatesFor(seat) : [],
        inbox: seat ? [...seat.inbox] : [],
        nightActions: seat && this.phase === "night" && seat.alive ? this.actionsFor(seat) : [],
        skillActions: seat ? this.skillActionsFor(seat) : [],
        anonymousVote: seat != null && seat.alive && seat.roleId === "plant" && !seat.anonymousVoteUsed && this.phase === "vote",
        fakeCharges: seat?.fakeCharges ?? 0,
        muted: seat != null && this.isSealed(seat),
        sealCard: seat != null && this.isSealed(seat) ? "\u5C01\u53E3\u5361\uFF1A\u4F60\u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\u3002\u5514\u53EF\u4EE5\u767C\u8A00\u3001\u4EA4\u8349\u7A3F\uFF0C\u6216\u8005\u7528\u767D\u5929\u6280\u80FD\u3002" : null,
        reclaimToken: seat?.reclaimToken ?? null,
        votedSeatId: seat ? this.votes.get(playerId)?.target ?? null : null,
        draft: seat ? this.drafts.get(playerId) ?? null : null,
        marks: seat ? [...seat.silenceMarks] : [],
        silenceChannel: seat && this.factionOf(seat) === "silence" ? this.silenceNotes.map((note) => ({ ...note })) : [],
        tips: seat ? this.tipsFor(seat) : [],
        secondsLeft: this.secondsLeft(),
        remnants: seat?.roleId === "echo" ? seat.remnants.map((item) => ({ ...item })) : []
      };
    }
    /**
     * Seat personas and the decision trace. For sims and debugging.
     * Not part of the player snapshot, so the HUD stays clear of persona labels.
     */
    debugAi() {
      return {
        salt: this.personaSalt,
        seats: this.seats.map((seat) => ({
          seatId: seat.id,
          nickname: seat.nickname,
          isAi: seat.isAi,
          alive: seat.alive,
          roleId: seat.roleId,
          personaId: seat.personaId,
          personaLabel: seat.personaId ? personaById(seat.personaId).label : null
        })),
        trace: this.aiTrace.map((event) => ({ ...event }))
      };
    }
    makeSeat(playerId, nickname, isAi) {
      return {
        id: `s${this.seats.length + 1}`,
        playerId,
        nickname,
        isAi,
        alive: true,
        roleId: null,
        ready: false,
        silenceMarks: [],
        sealUsed: false,
        sealedOnRound: null,
        sweepFog: 0,
        coverReadyNight: 1,
        inbox: [],
        remnants: [],
        usedSkillThisRound: false,
        usedSkillLastRound: false,
        pinnedThisRound: false,
        linkedThisRound: false,
        fakeCharges: 0,
        anonymousVoteUsed: false,
        reclaimToken: null,
        lobbyReady: false,
        personaId: isAi ? personaForSeat(this.seats.length, this.personaSalt).id : null,
        sweeps: {},
        linkedUsed: {},
        everPinned: false
      };
    }
    nextToken() {
      this.tokenSeq += 1;
      const mix = Math.floor(this.rng() * 4294967296).toString(16).padStart(8, "0");
      return `qz${this.tokenSeq.toString(16)}${mix}`;
    }
    rekey(oldId, newId) {
      const seat = this.seats.find((item) => item.playerId === oldId);
      if (!seat) return;
      seat.playerId = newId;
      this.moveKey(this.votes, oldId, newId);
      this.moveKey(this.drafts, oldId, newId);
      this.moveKey(this.nightActions, oldId, newId);
      this.moveKey(this.chatCount, oldId, newId);
    }
    moveKey(map, oldId, newId) {
      if (!map.has(oldId)) return;
      map.set(newId, map.get(oldId));
      map.delete(oldId);
    }
    assignRoles(roles) {
      for (let i = 0; i < this.seats.length; i++) {
        const seat = this.seats[i];
        const roleId = roles[i];
        seat.roleId = roleId;
        seat.sweepFog = roleId === "plant" ? 1 : 0;
        seat.fakeCharges = roleId === "decoy" ? RULES.skills.fakePerGame : 0;
      }
    }
    assertDeal(roles) {
      if (roles.length !== RULES.seatCount) throw new Error("deal length");
      const counts = { lighthouse: 0, silence: 0, grey: 0 };
      for (const roleId of roles) {
        const role = ROLES[roleId];
        if (!role) throw new Error(`unknown role ${roleId}`);
        counts[role.faction] += 1;
      }
      if (counts.lighthouse !== RULES.composition.lighthouse || counts.silence !== RULES.composition.silence || counts.grey !== RULES.composition.grey) {
        throw new Error("deal composition");
      }
    }
    beginDay(round) {
      for (const seat of this.seats) {
        seat.usedSkillLastRound = seat.usedSkillThisRound;
        seat.usedSkillThisRound = false;
        seat.pinnedThisRound = false;
        seat.linkedThisRound = false;
      }
      this.round = round;
      this.beginPhase("day_talk");
      this.banner = `\u7B2C ${round} \u8F2A\u71C8\u4EAE\u3002\u7528\u77ED\u53E5\u5C31\u5F97\uFF0C\u6A21\u677F\u90FD\u53EF\u4EE5\u3002`;
      const sealed = this.seats.filter((seat) => seat.alive && this.isSealed(seat));
      for (const seat of sealed) {
        this.pushLog(`\u5C01\u53E3\u751F\u6548\uFF1A${seat.nickname} \u5462\u56DE\u5408\u53EA\u53EF\u4EE5\u6295\u7968\uFF0C\u5514\u53EF\u4EE5\u767C\u8A00\u3002`);
      }
      this.aiTalk();
      this.aiDaySkills();
    }
    beginPhase(phase) {
      this.phase = phase;
      this.chatCount.clear();
      for (const seat of this.seats) seat.ready = false;
      this.markAiReady();
    }
    markAiReady() {
      if (!this.autoAi) return;
      for (const seat of this.seats) {
        if (seat.isAi && seat.alive) seat.ready = true;
      }
    }
    aiTalk() {
      if (!this.autoAi) return;
      for (const seat of this.selectSpeakers()) this.speakAs(seat);
    }
    /** A few AI lines per phase so the public log stays readable. Quiet personas keep one slot. */
    selectSpeakers() {
      const pool = this.seats.filter((seat) => seat.isAi && seat.alive && seat.personaId && !this.isSealed(seat));
      const ranked = pool.filter((seat) => shouldSpeak(seat.personaId, this.round, this.seatIndex(seat), this.personaSalt)).sort((a, b) => speakPriority(b.personaId) - speakPriority(a.personaId) || this.seatIndex(a) - this.seatIndex(b));
      const loud = ranked.filter((seat) => speakPriority(seat.personaId) >= 2);
      const quiet = ranked.filter((seat) => speakPriority(seat.personaId) <= 1);
      const picked = [];
      if (loud[0]) picked.push(loud[0]);
      if (quiet[0]) picked.push(quiet[0]);
      for (const seat of loud.slice(1)) {
        if (picked.length >= 4) break;
        picked.push(seat);
      }
      if (picked.length === 0 && pool[0]) {
        const fallback = [...pool].sort(
          (a, b) => speakPriority(b.personaId) - speakPriority(a.personaId) || this.seatIndex(a) - this.seatIndex(b)
        );
        if (fallback[0]) picked.push(fallback[0]);
      }
      return picked;
    }
    speakAs(seat) {
      if (!seat.personaId || this.isSealed(seat)) return;
      const decision = talkDecision(this.think(seat));
      const step = this.submitChat(seat.playerId, decision.text);
      if (!step.ok) return;
      if (decision.targetId && (decision.kind === "\u7591" || decision.kind === "\u4FDD")) {
        this.accusations.push({ fromId: seat.id, targetId: decision.targetId, kind: decision.kind, round: this.round });
      }
      this.pushTrace(seat, "talk", decision.text);
    }
    aiDraft() {
      if (!this.autoAi) return;
      let sent = 0;
      for (const seat of this.seats) {
        if (sent >= 8) break;
        if (!seat.isAi || !seat.alive || this.isSealed(seat) || !seat.personaId) continue;
        const line = draftLine(this.think(seat));
        if (!line) continue;
        const step = this.submitDraft(seat.playerId, line);
        if (!step.ok) continue;
        sent += 1;
        this.pushTrace(seat, "draft", line);
      }
    }
    aiDaySkills() {
      if (!this.autoAi) return;
      for (const seat of this.seats) {
        if (!seat.isAi || !seat.alive || !seat.roleId || this.isSealed(seat)) continue;
        this.applyDayPlan(seat);
      }
    }
    applyDayPlan(seat) {
      if (!seat.personaId || !seat.alive) return;
      const plan = dayPlan(this.think(seat));
      if (plan.pin && seat.roleId === "tip" && !seat.pinnedThisRound) {
        const step = this.submitPin(seat.playerId, plan.pin);
        if (step.ok) this.pushTrace(seat, "pin", plan.pin);
      }
      if (plan.linkId && seat.roleId === "link" && !seat.linkedThisRound) {
        const step = this.submitLink(seat.playerId, plan.linkId);
        if (step.ok) this.pushTrace(seat, "link", plan.linkId);
      }
      if (plan.fake && seat.roleId === "decoy" && seat.fakeCharges > 0) {
        const step = this.submitFake(seat.playerId, plan.fake);
        if (step.ok) this.pushTrace(seat, "fake", plan.fake.mode);
      }
      if (plan.markId && seat.roleId === "warrant") {
        const step = this.submitSuspect(seat.playerId, plan.markId, true);
        if (step.ok) this.pushTrace(seat, "mark", plan.markId);
      }
    }
    catchUpAi(seat) {
      if (!seat.personaId) seat.personaId = personaForSeat(this.seatIndex(seat), this.personaSalt).id;
      if (this.phase === "day_talk") {
        if (!this.isSealed(seat) && !(this.chatCount.get(seat.playerId) ?? 0)) this.speakAs(seat);
        if (!this.isSealed(seat)) this.applyDayPlan(seat);
      } else if (this.phase === "draft" && !this.drafts.has(seat.playerId) && !this.isSealed(seat)) {
        const line = draftLine(this.think(seat));
        if (line) this.submitDraft(seat.playerId, line);
      } else if (this.phase === "vote" && !this.votes.has(seat.playerId)) {
        this.syncAiVotes();
      } else if (this.phase === "night") {
        this.actNight(seat);
      }
    }
    aiNight() {
      if (!this.autoAi) return;
      for (const seat of this.seats) {
        if (!seat.isAi || !seat.alive || !seat.roleId) continue;
        this.actNight(seat);
      }
    }
    actNight(seat) {
      if (!this.nightActions.has(seat.playerId)) {
        const command = nightCommand(this.think(seat));
        if (command) {
          const step = this.submitNight(seat.playerId, command);
          if (step.ok) this.pushTrace(seat, "night", `${command.action}:${command.targetSeatId ?? "none"}`);
        }
      }
      const side = nightSide(this.think(seat));
      if (side && seat.roleId === "decoy" && seat.fakeCharges > 0) {
        const step = this.submitFake(seat.playerId, side);
        if (step.ok) this.pushTrace(seat, "fake", `night-${side.mode}`);
      }
      this.postAiSilence(seat);
    }
    postAiSilence(seat) {
      if (!this.autoAi || this.phase !== "night") return;
      if (!seat.isAi || !seat.alive || this.factionOf(seat) !== "silence") return;
      if ((this.silenceSent.get(seat.playerId) ?? 0) >= 1) return;
      const line = silenceLine(this.think(seat));
      const step = this.submitSilence(seat.playerId, line);
      if (step.ok) this.pushTrace(seat, "silence", line);
    }
    /**
     * Rule C: once any living human has balloted, AI copy that unique leader.
     * A split or an all-abstain human table stays a tie — personas must not break it.
     * With no human ballot (an all-AI table), each seat votes in its own style.
     */
    syncAiVotes(record = false) {
      if (!this.autoAi || this.phase !== "vote") return;
      const humanTargets = [];
      for (const seat of this.seats) {
        if (seat.isAi || !seat.alive) continue;
        if (!this.votes.has(seat.playerId)) continue;
        humanTargets.push(this.votes.get(seat.playerId)?.target ?? null);
      }
      const followMajority = humanTargets.length > 0;
      const leader = uniqueLeader(humanTargets);
      const living = this.seats.filter((seat) => seat.alive);
      const duelPresser = followMajority ? null : duelPresserId(living.map((seat) => ({ id: seat.id, index: this.seatIndex(seat), personaId: seat.personaId })));
      for (const seat of this.seats) {
        if (!seat.isAi || !seat.alive) continue;
        let target;
        let via;
        if (followMajority) {
          target = leader == null || leader === seat.id ? null : leader;
          via = leader == null ? "split" : "follow";
        } else if (duelPresser) {
          const other = living.find((item) => item.id !== seat.id);
          target = seat.id === duelPresser ? other?.id ?? null : null;
          via = seat.id === duelPresser ? "duel" : "duel-hold";
        } else {
          target = seat.personaId ? voteTarget(this.think(seat)) : null;
          if (target === seat.id) target = null;
          if (target) {
            const picked = this.seatById(target);
            if (!picked || !picked.alive) target = null;
            else if (this.factionOf(seat) === "silence" && this.factionOf(picked) === "silence") target = null;
          }
          via = "persona";
        }
        const anonymous = seat.roleId === "plant" && !seat.anonymousVoteUsed && target != null && (followMajority || wantsAnonymous(seat.personaId ?? "follower"));
        this.votes.set(seat.playerId, { target, anonymous });
        if (record) this.pushTrace(seat, "vote", `${via}:${target ?? "abstain"}`);
      }
    }
    think(seat) {
      return {
        selfId: seat.id,
        selfIndex: this.seatIndex(seat),
        selfRole: seat.roleId,
        selfFaction: this.factionOf(seat),
        selfPersona: seat.personaId,
        seats: this.seats.map((item, index) => ({
          id: item.id,
          index,
          nickname: item.nickname,
          alive: item.alive
        })),
        round: this.round,
        night: this.nightNumber,
        salt: this.personaSalt,
        phase: this.phase,
        accusations: this.accusations,
        pinSeatIds: this.seats.filter((item) => item.everPinned).map((item) => item.id),
        sweeps: seat.sweeps,
        linkedUsed: seat.linkedUsed,
        teammates: this.teammatesFor(seat).map((item) => item.seatId),
        marks: seat.silenceMarks,
        coverReady: this.nightNumber >= seat.coverReadyNight,
        sealUsed: seat.sealUsed,
        fakeCharges: seat.fakeCharges,
        openPinIds: this.pins.filter((pin) => !pin.unverified).map((pin) => pin.id)
      };
    }
    pushTrace(seat, kind, detail) {
      this.aiTrace.push({
        round: this.round,
        night: this.nightNumber,
        phase: this.phase,
        seatId: seat.id,
        personaId: seat.personaId,
        kind,
        detail
      });
      if (this.aiTrace.length > 500) this.aiTrace.shift();
    }
    fillMissingDrafts() {
      for (const seat of this.seats) {
        if (!seat.alive || this.isSealed(seat)) continue;
        if (!this.drafts.has(seat.playerId)) this.drafts.set(seat.playerId, "");
      }
    }
    publishDrafts() {
      for (const seat of this.seats) {
        if (!seat.alive || this.isSealed(seat)) continue;
        const text = this.drafts.get(seat.playerId) ?? "";
        if (!text) continue;
        this.pushLog(`\u8349\u7A3F\uFF5C${seat.nickname}\uFF1A${text}`);
      }
      this.drafts.clear();
    }
    fillMissingVotes() {
      for (const seat of this.seats) {
        if (!seat.alive) continue;
        if (!this.votes.has(seat.playerId)) this.votes.set(seat.playerId, { target: null, anonymous: false });
      }
    }
    resolveVotes() {
      const ballots = [];
      const attributed = [];
      for (const seat of this.seats) {
        if (!seat.alive) continue;
        const ballot = this.votes.get(seat.playerId) ?? { target: null, anonymous: false };
        ballots.push(ballot.target);
        let name = seat.nickname;
        if (ballot.anonymous && seat.roleId === "plant" && !seat.anonymousVoteUsed) {
          seat.anonymousVoteUsed = true;
          this.markSkill(seat);
          name = "\u533F\u540D";
        }
        attributed.push(`${name} \u2192 ${ballot.target ?? "\u68C4\u6B0A"}`);
      }
      if (attributed.length > 0) this.pushLog(`\u7968\u7C3F\uFF1A${attributed.join("\u3001")}`);
      const leader = uniqueLeader(ballots);
      this.votes.clear();
      if (!leader) {
        this.banner = "\u6D41\u5C40\uFF0C\u7121\u4EBA\u88AB\u9694\u96E2\u3002";
        this.pushLog("\u6295\u7968\u6D41\u5C40\uFF0C\u7121\u4EBA\u88AB\u9694\u96E2\u3002");
        return;
      }
      const target = this.seatById(leader);
      if (!target) return;
      target.alive = false;
      this.banner = `${target.nickname} \u88AB\u9694\u96E2\u79FB\u51FA\u3002\u9663\u71DF\u672A\u516C\u958B\u3002`;
      this.pushLog(`${target.nickname} \u88AB\u9694\u96E2\u79FB\u51FA\u3002`);
      this.deliverEcho(target);
    }
    deliverEcho(isolated) {
      const echo = this.seats.find((seat) => seat.alive && seat.roleId === "echo");
      if (!echo || !isolated.roleId) return;
      const faction = ROLES[isolated.roleId].faction;
      const text = `\u56DE\u6CE2\u6B98\u7247\uFF1A${isolated.nickname} \u5C6C\u65BC${FACTION_LABEL[faction]}\u3002\u516C\u958B\u983B\u9053\u5514\u6703\u62AB\u9732\u9663\u71DF\u3002`;
      echo.inbox.push(text);
      echo.remnants.push({ nickname: isolated.nickname, factionLabel: FACTION_LABEL[faction], text });
    }
    fillMissingNights() {
      for (const seat of this.seats) {
        if (!seat.alive) continue;
        if (this.actionsFor(seat).length === 0) continue;
        if (!this.nightActions.has(seat.playerId)) {
          this.nightActions.set(seat.playerId, { action: "skip" });
        }
      }
    }
    resolveNight() {
      const shields = /* @__PURE__ */ new Set();
      for (const seat of this.seats) {
        if (!seat.alive || seat.roleId !== "cover") continue;
        const command = this.nightActions.get(seat.playerId);
        if (!command || command.action !== "cover" || !command.targetSeatId) continue;
        this.markSkill(seat);
        if (this.nightNumber < seat.coverReadyNight) {
          seat.inbox.push("\u63A9\u8B77\u51B7\u537B\u4E2D\uFF0C\u4ECA\u6B21\u5514\u6703\u6210\u529F\u3002");
          continue;
        }
        const target = this.seatById(command.targetSeatId);
        if (!target || !target.alive) continue;
        shields.add(target.id);
        seat.coverReadyNight = this.nightNumber + RULES.cover.blockedFollowingTurns + 1;
        seat.inbox.push(`\u63A9\u8B77\u6210\u529F\uFF1A${target.nickname} \u4ECA\u591C\u514D\u75AB\u5931\u806F\u3002\u4E0B\u4E00\u591C\u5514\u53EF\u4EE5\u518D\u6210\u529F\u3002`);
      }
      let disconnected = false;
      for (const seat of this.seats) {
        if (!seat.alive || seat.roleId !== "silencer") continue;
        const command = this.nightActions.get(seat.playerId);
        if (!command || command.action !== "disconnect" || !command.targetSeatId) continue;
        this.markSkill(seat);
        const target = this.seatById(command.targetSeatId);
        if (!target || !target.alive) continue;
        if (shields.has(target.id)) {
          seat.inbox.push(`\u5931\u806F\u672A\u751F\u6548\uFF1A${target.nickname} \u53EF\u80FD\u88AB\u63A9\u8B77\u3002`);
          continue;
        }
        target.alive = false;
        this.successfulDisconnects += 1;
        disconnected = true;
        this.pushLog(`${target.nickname} \u5931\u806F\uFF0C\u79FB\u51FA\u672C\u5C40\u3002`);
        seat.inbox.push(`\u5931\u806F\u6210\u529F\uFF1A${target.nickname} \u5DF2\u79FB\u51FA\u3002`);
      }
      if (!disconnected) this.pushLog("\u7184\u71C8\u7D50\u675F\uFF0C\u4ECA\u591C\u7121\u4EBA\u5931\u806F\u3002");
      for (const seat of this.seats) {
        if (!seat.alive || seat.roleId !== "sweep") continue;
        const command = this.nightActions.get(seat.playerId);
        if (!command || command.action !== "sweep" || !command.targetSeatId) continue;
        this.markSkill(seat);
        const target = this.seatById(command.targetSeatId);
        if (!target || !target.roleId) continue;
        const silence2 = ROLES[target.roleId].faction === "silence";
        let clean = !silence2;
        if (silence2 && target.sweepFog > 0) {
          target.sweepFog -= 1;
          clean = true;
        }
        seat.sweeps[target.id] = clean ? "clean" : "dirty";
        seat.inbox.push(clean ? `\u6383\u983B\uFF1A${target.nickname} \u8A0A\u865F\u4E7E\u6DE8\u3002` : `\u6383\u983B\uFF1A${target.nickname} \u6709\u6D88\u97F3\u75D5\u8DE1\u3002`);
      }
      for (const seat of this.seats) {
        if (!seat.alive || seat.roleId !== "warrant") continue;
        const command = this.nightActions.get(seat.playerId);
        if (!command || command.action === "skip") continue;
        this.markSkill(seat);
        if (command.action === "mark" && command.targetSeatId) {
          if (!seat.silenceMarks.includes(command.targetSeatId)) seat.silenceMarks.push(command.targetSeatId);
          const target = this.seatById(command.targetSeatId);
          seat.inbox.push(`\u5DF2\u6A19\u8A18 ${target?.nickname ?? command.targetSeatId}\u3002\u6A19\u8A18\u53EA\u5F97\u4F60\u77E5\u3002`);
        }
        if (command.action === "seal" && command.targetSeatId && !seat.sealUsed) {
          const target = this.seatById(command.targetSeatId);
          if (!target || !target.alive) continue;
          seat.sealUsed = true;
          target.sealedOnRound = this.round + 1;
          seat.inbox.push(`\u4F60\u5C01\u5497 ${target.nickname}\u3002\u4E0B\u4E00\u8F2A\u71C8\u4EAE\u4F62\u53EA\u53EF\u4EE5\u6295\u7968\u3002`);
          this.pushLog(`\u5C01\u53E3\u5361\uFF1A${target.nickname} \u4E0B\u4E00\u8F2A\u53EA\u53EF\u4EE5\u6295\u7968\uFF0C\u5514\u53EF\u4EE5\u767C\u8A00\u3002`);
        }
      }
      this.nightActions.clear();
      this.banner = `\u7B2C ${this.nightNumber} \u591C\u7D50\u675F\u3002\u5931\u806F\u9032\u5EA6 ${this.successfulDisconnects}\uFF0F${RULES.silenceWin.successfulDisconnects}\u3002`;
    }
    /**
     * Grey first, even if silence is still alive.
     * Then silence on 3 successful disconnects (or no lighthouse left).
     * Then lighthouse when no silence remains.
     */
    evaluate() {
      const warrant = this.seats.find((seat) => seat.alive && seat.roleId === "warrant");
      if (warrant && this.correctSilenceMarks(warrant) >= RULES.greyWin.minCorrectSilenceMarks) {
        this.winner = {
          faction: "grey",
          factionLabel: FACTION_LABEL.grey,
          reason: "\u7070\u983B\u7368\u8D0F\uFF1A\u5B64\u8B49\u4ECD\u7136\u5728\u5834\uFF0C\u6B63\u78BA\u6D88\u97F3\u6A19\u8A18\u9054 2\u3002",
          kind: "grey_marks"
        };
        this.banner = this.winner.reason;
        this.pushLog(this.winner.reason);
        return;
      }
      const silenceAlive = this.seats.some((seat) => seat.alive && this.factionOf(seat) === "silence");
      const lighthouseAlive = this.seats.some((seat) => seat.alive && this.factionOf(seat) === "lighthouse");
      if (this.successfulDisconnects >= RULES.silenceWin.successfulDisconnects || !lighthouseAlive) {
        this.winner = {
          faction: "silence",
          factionLabel: FACTION_LABEL.silence,
          reason: this.successfulDisconnects >= RULES.silenceWin.successfulDisconnects ? "\u6D88\u97F3\u7D44\u9054\u6A19\uFF1A\u6210\u529F\u5931\u806F 3 \u6B21\u3002" : "\u6D88\u97F3\u7D44\u52DD\uFF1A\u71C8\u5854\u7DB2\u5DF2\u7121\u6CD5\u6295\u7968\u3002",
          kind: "silence_disconnects"
        };
        this.banner = this.winner.reason;
        this.pushLog(this.winner.reason);
        return;
      }
      if (!silenceAlive) {
        this.winner = {
          faction: "lighthouse",
          factionLabel: FACTION_LABEL.lighthouse,
          reason: "\u71C8\u5854\u7DB2\u89E3\u5C01\uFF1A\u6D88\u97F3\u7D44\u5DF2\u5168\u90E8\u96E2\u5834\u3002",
          kind: "lighthouse_clear"
        };
        this.banner = this.winner.reason;
        this.pushLog(this.winner.reason);
        return;
      }
      this.banner = "\u672A\u5206\u52DD\u8CA0\u3002\u7070\u983B\u672A\u9054\u6A19\uFF0C\u5931\u806F\u4EA6\u672A\u5920\u6578\u3002";
      this.pushLog("\u52DD\u8CA0\u6AA2\u5B9A\uFF1A\u672A\u7D42\u5C40\uFF0C\u9032\u5165\u4E0B\u4E00\u8F2A\u71C8\u4EAE\u3002");
    }
    correctSilenceMarks(seat) {
      let count = 0;
      for (const id of seat.silenceMarks) {
        const target = this.seatById(id);
        if (target && this.factionOf(target) === "silence") count += 1;
      }
      return count;
    }
    secondsLeft() {
      if (this.deadlineAt == null) return null;
      return Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1e3));
    }
    revealSeats() {
      return this.seats.map((seat) => {
        const role = seat.roleId ? ROLES[seat.roleId] : null;
        return {
          seatId: seat.id,
          nickname: seat.nickname,
          alive: seat.alive,
          roleId: role?.id ?? "civilian",
          roleName: role?.name ?? "",
          faction: role?.faction ?? "lighthouse",
          factionLabel: role ? FACTION_LABEL[role.faction] : ""
        };
      });
    }
    tipsFor(seat) {
      const tips = [];
      if (this.phase === "day_talk") tips.push({ ...PHASE_TIPS.day_talk });
      if (this.phase === "vote") tips.push({ ...PHASE_TIPS.vote });
      if (this.phase === "night") tips.push({ ...PHASE_TIPS.night });
      if (seat.roleId === "warrant" && (this.phase === "day_talk" || this.phase === "draft" || this.phase === "night")) {
        tips.push({ ...PHASE_TIPS.grey_marks });
      }
      return tips;
    }
    markSkill(seat) {
      seat.usedSkillThisRound = true;
    }
    skillActionsFor(seat) {
      if (!seat.alive || !seat.roleId) return [];
      const dayMute = this.isSealed(seat) && this.phase !== "night";
      if (dayMute) return [];
      const actions = [];
      const markWindow = this.phase === "day_talk" || this.phase === "draft" || this.phase === "night";
      if (markWindow && seat.roleId === "warrant") {
        actions.push({ action: "mark", label: "\u6697\u6A19\u5462\u500B\u4EBA", needsTarget: true, needsText: false });
      }
      if (this.phase === "day_talk" && seat.roleId === "tip" && !seat.pinnedThisRound) {
        actions.push({ action: "pin", label: "\u91D8\u4E00\u53E5\u7DDA\u5831", needsTarget: false, needsText: true });
      }
      if (this.phase === "day_talk" && seat.roleId === "link" && !seat.linkedThisRound) {
        actions.push({ action: "link", label: "\u67E5\u4E0A\u8F2A\u7528\u904E\u6280\u80FD\u672A", needsTarget: true, needsText: false });
      }
      const fakeWindow = this.phase === "day_talk" || this.phase === "night";
      if (fakeWindow && seat.roleId === "decoy" && seat.fakeCharges > 0) {
        actions.push({ action: "fake_plant", label: "\u653E\u4E00\u53E5\u5047\u6599", needsTarget: false, needsText: true });
        if (this.pins.some((pin) => !pin.unverified)) {
          actions.push({ action: "fake_flag", label: "\u6A19\u505A\u672A\u6838\u5BE6", needsTarget: true, needsText: false });
        }
      }
      return actions;
    }
    actionsFor(seat) {
      const role = seat.roleId;
      const names = [];
      if (role === "silencer") names.push("disconnect", "skip");
      else if (role === "cover") names.push("cover", "skip");
      else if (role === "sweep") names.push("sweep", "skip");
      else if (role === "warrant") {
        names.push("mark");
        if (!seat.sealUsed) names.push("seal");
        names.push("skip");
      }
      return names.map((action) => ({ action, ...NIGHT_LABEL[action] }));
    }
    teammatesFor(seat) {
      if (this.factionOf(seat) !== "silence") return [];
      return this.seats.filter((other) => other.playerId !== seat.playerId && this.factionOf(other) === "silence" && other.roleId).map((other) => ({
        seatId: other.id,
        nickname: other.nickname,
        roleName: ROLES[other.roleId].name
      }));
    }
    factionOf(seat) {
      if (!seat.roleId) return null;
      return ROLES[seat.roleId].faction;
    }
    isSealed(seat) {
      return seat.sealedOnRound != null && seat.sealedOnRound === this.round;
    }
    requireLiving(playerId) {
      const seat = this.seats.find((item) => item.playerId === playerId);
      if (!seat) return fail("not_seated", "\u4F60\u672A\u5165\u5EA7\u3002");
      if (!seat.alive) return fail("dead", "\u4F60\u5DF2\u96E2\u5834\u3002");
      if (!seat.roleId && this.phase !== "lobby") return fail("not_ready", "\u8EAB\u5206\u672A\u6D3E\u767C\u3002");
      return { ok: true, seat };
    }
    seatById(id) {
      return this.seats.find((seat) => seat.id === id);
    }
    seatIndex(seat) {
      return this.seats.indexOf(seat);
    }
    pushLog(text) {
      this.log.push({ text });
      if (this.log.length > 300) this.log.shift();
    }
  };
  function cleanName(nickname) {
    const name = nickname.trim().slice(0, 12);
    return name;
  }

  // src/hub.ts
  var EARLY = /* @__PURE__ */ new Set(["boot", "day_talk", "draft", "vote", "night"]);
  var NIGHT_ACTIONS = /* @__PURE__ */ new Set(["disconnect", "cover", "sweep", "mark", "seal", "skip"]);
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var RoomHub = class {
    rooms = /* @__PURE__ */ new Map();
    playerRoom = /* @__PURE__ */ new Map();
    sinks = /* @__PURE__ */ new Map();
    timers;
    autoAi;
    rng;
    phaseMs;
    fillAiOnCreate;
    previewDeal;
    constructor(opts = {}) {
      this.timers = opts.timers ?? false;
      this.autoAi = opts.autoAi ?? true;
      this.rng = opts.rng ?? Math.random;
      this.phaseMs = opts.phaseMs ?? defaultPhaseMs;
      this.fillAiOnCreate = opts.fillAiOnCreate ?? false;
      this.previewDeal = opts.previewDeal ?? false;
    }
    /** Drop every room and pending phase timer. Used when a trial tab closes. */
    shutdown() {
      for (const room of this.rooms.values()) this.clearTimer(room);
      this.rooms.clear();
      this.playerRoom.clear();
      this.sinks.clear();
    }
    bind(playerId, sink) {
      this.sinks.set(playerId, sink);
    }
    unbind(playerId) {
      this.sinks.delete(playerId);
    }
    /**
     * Socket dropped. Lobby frees the seat. An in-progress game hands that seat to AI
     * with the same role and private state, and the badge stays on.
     */
    disconnect(playerId) {
      this.unbind(playerId);
      const room = this.roomOf(playerId);
      this.playerRoom.delete(playerId);
      if (!room) return;
      if (room.engine.getPhase() === "lobby") {
        room.engine.removeLobbyPlayer(playerId);
        if (room.engine.publicView().seats.length === 0) {
          this.clearTimer(room);
          this.rooms.delete(room.code);
          return;
        }
      } else {
        room.engine.takeoverAsAi(playerId);
        this.maybeEarly(room);
      }
      this.broadcast(room);
    }
    snapshot(playerId) {
      const room = this.roomOf(playerId);
      if (!room) return null;
      return this.dress(room, playerId);
    }
    handle(playerId, raw) {
      if (!raw || typeof raw !== "object") {
        this.fail(playerId, "bad_message", "\u8A0A\u606F\u683C\u5F0F\u5514\u6B63\u78BA\u3002");
        return;
      }
      const msg = raw;
      switch (msg.type) {
        case "create_room":
          this.create(playerId, String(msg.nickname ?? ""));
          return;
        case "join_room":
          this.join(playerId, String(msg.code ?? ""), String(msg.nickname ?? ""));
          return;
        case "start_game":
          this.start(playerId);
          return;
        case "chat":
          this.act(playerId, (engine) => engine.submitChat(playerId, String(msg.text ?? "")));
          return;
        case "draft":
          this.act(playerId, (engine) => engine.submitDraft(playerId, String(msg.text ?? "")));
          return;
        case "vote":
          this.act(
            playerId,
            (engine) => engine.submitVote(
              playerId,
              msg.targetSeatId == null || msg.targetSeatId === "" ? null : String(msg.targetSeatId),
              msg.anonymous === true
            )
          );
          return;
        case "skill":
          this.act(
            playerId,
            (engine) => this.skill(engine, playerId, {
              action: String(msg.action ?? ""),
              text: msg.text == null ? "" : String(msg.text),
              targetId: msg.targetId == null ? "" : String(msg.targetId),
              marked: msg.marked !== false && msg.action !== "unmark"
            })
          );
          return;
        case "reclaim":
          this.reclaim(playerId, String(msg.token ?? ""));
          return;
        case "night_action":
          this.act(playerId, (engine) => {
            const action = String(msg.action ?? "");
            if (!NIGHT_ACTIONS.has(action)) return { ok: false, code: "bad_message", message: "\u672A\u77E5\u5605\u7184\u71C8\u884C\u52D5\u3002" };
            return engine.submitNight(playerId, {
              action,
              targetSeatId: msg.targetSeatId ? String(msg.targetSeatId) : void 0
            });
          });
          return;
        case "silence":
          this.act(playerId, (engine) => engine.submitSilence(playerId, String(msg.text ?? "")));
          return;
        case "ready":
          if (this.roomOf(playerId)?.engine.getPhase() === "lobby") {
            this.act(playerId, (engine) => engine.setLobbyReady(playerId, msg.ready !== false));
            return;
          }
          this.act(playerId, (engine) => engine.setReady(playerId), true);
          return;
        default:
          this.fail(playerId, "bad_message", "\u672A\u77E5\u6307\u4EE4\u3002");
      }
    }
    create(playerId, nickname) {
      if (this.playerRoom.has(playerId)) {
        this.fail(playerId, "already_in_room", "\u4F60\u5DF2\u7D93\u55BA\u4E00\u9593\u623F\u3002");
        return;
      }
      const engine = new GameEngine({ rng: this.rng, autoAi: this.autoAi });
      const joined = engine.addPlayer(playerId, nickname);
      if (!joined.ok) {
        this.fail(playerId, joined.code, joined.message);
        return;
      }
      if (this.fillAiOnCreate) engine.fillWithAi();
      if (this.previewDeal) engine.previewDeal();
      const code = this.freshCode();
      const room = { code, engine };
      this.rooms.set(code, room);
      this.playerRoom.set(playerId, code);
      this.broadcast(room);
    }
    join(playerId, code, nickname) {
      if (this.playerRoom.has(playerId)) {
        this.fail(playerId, "already_in_room", "\u4F60\u5DF2\u7D93\u55BA\u4E00\u9593\u623F\u3002");
        return;
      }
      const room = this.rooms.get(code.trim().toUpperCase());
      if (!room) {
        this.fail(playerId, "room_not_found", "\u6435\u5514\u5230\u5462\u500B\u623F\u9593\u4EE3\u78BC\u3002");
        return;
      }
      const joined = room.engine.addPlayer(playerId, nickname);
      if (!joined.ok) {
        this.fail(playerId, joined.code, joined.message);
        return;
      }
      this.playerRoom.set(playerId, room.code);
      this.broadcast(room);
    }
    start(playerId) {
      const room = this.roomOf(playerId);
      if (!room) {
        this.fail(playerId, "not_in_room", "\u4F60\u672A\u5165\u623F\u3002");
        return;
      }
      if (!room.engine.privateView(playerId).isHost) {
        this.fail(playerId, "not_host", "\u53EA\u6709\u623F\u4E3B\u53EF\u4EE5\u958B\u59CB\u3002");
        return;
      }
      const started = room.engine.start(void 0, { enforceLobbyReady: true });
      if (!started.ok) {
        this.fail(playerId, started.code, started.message);
        return;
      }
      this.arm(room);
      this.broadcast(room);
    }
    skill(engine, playerId, msg) {
      if (msg.action === "pin") return engine.submitPin(playerId, msg.text);
      if (msg.action === "link") return engine.submitLink(playerId, msg.targetId);
      if (msg.action === "fake_flag") return engine.submitFake(playerId, { mode: "flag", pinId: msg.targetId });
      if (msg.action === "fake_plant") return engine.submitFake(playerId, { mode: "plant", text: msg.text });
      if (msg.action === "mark" || msg.action === "unmark") {
        return engine.submitSuspect(playerId, msg.targetId, msg.action === "mark" && msg.marked);
      }
      return { ok: false, code: "bad_message", message: "\u672A\u77E5\u5605\u6280\u80FD\u3002" };
    }
    reclaim(playerId, token) {
      if (this.playerRoom.has(playerId)) {
        this.fail(playerId, "already_in_room", "\u4F60\u5DF2\u7D93\u55BA\u4E00\u9593\u623F\u3002");
        return;
      }
      for (const room of this.rooms.values()) {
        const result = room.engine.reclaim(playerId, token);
        if (result.ok) {
          this.playerRoom.set(playerId, room.code);
          this.broadcast(room);
          return;
        }
        if (result.code !== "token_unknown") {
          this.fail(playerId, result.code, result.message);
          return;
        }
      }
      this.fail(playerId, "token_unknown", "\u6435\u5514\u5230\u4F60\u539F\u672C\u5605\u5E2D\u3002");
    }
    act(playerId, run, early = false) {
      const room = this.roomOf(playerId);
      if (!room) {
        this.fail(playerId, "not_in_room", "\u4F60\u672A\u5165\u623F\u3002");
        return;
      }
      const result = run(room.engine);
      if (!result.ok) {
        this.fail(playerId, result.code, result.message);
        return;
      }
      if (early) this.maybeEarly(room);
      this.broadcast(room);
    }
    maybeEarly(room) {
      const phase = room.engine.getPhase();
      if (!EARLY.has(phase) || !room.engine.everyoneReady()) return;
      this.clearTimer(room);
      room.engine.advance();
      this.arm(room);
    }
    arm(room) {
      this.clearTimer(room);
      if (!this.timers) {
        room.engine.setPhaseDeadline(null);
        return;
      }
      const ms = this.phaseMs(room.engine.getPhase());
      if (ms == null) {
        room.engine.setPhaseDeadline(null);
        return;
      }
      room.engine.setPhaseDeadline(Date.now() + ms);
      room.timer = setTimeout(() => {
        room.timer = void 0;
        if (room.engine.getPhase() === "ended") return;
        room.engine.advance();
        this.arm(room);
        this.broadcast(room);
      }, ms);
    }
    clearTimer(room) {
      if (room.timer) clearTimeout(room.timer);
      room.timer = void 0;
    }
    dress(room, playerId) {
      return {
        type: "state",
        public: { ...room.engine.publicView(), code: room.code },
        private: room.engine.privateView(playerId)
      };
    }
    broadcast(room) {
      for (const [playerId, code] of this.playerRoom) {
        if (code === room.code) this.emit(playerId, this.dress(room, playerId));
      }
    }
    emit(playerId, msg) {
      this.sinks.get(playerId)?.(msg);
    }
    fail(playerId, code, message) {
      this.emit(playerId, { type: "error", code, message });
    }
    roomOf(playerId) {
      const code = this.playerRoom.get(playerId);
      if (!code) return void 0;
      return this.rooms.get(code);
    }
    freshCode() {
      for (let attempt = 0; attempt < 8; attempt++) {
        let code = "";
        for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(this.rng() * ALPHABET.length)] ?? "A";
        if (!this.rooms.has(code)) return code;
      }
      return randomToken().replace(/-/g, "").slice(0, 4).toUpperCase();
    }
  };
  function randomToken() {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    if (cryptoObj?.getRandomValues) {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  }
  function defaultPhaseMs(phase) {
    if (phase === "lobby" || phase === "ended") return null;
    if (phase in RULES.phaseMs) return RULES.phaseMs[phase];
    return null;
  }

  // src/trial/session.ts
  var TRIAL_PHASE_MS = {
    boot: 7e3,
    day_talk: 4e4,
    draft: 28e3,
    vote: 24e3,
    resolve: 4e3,
    night: 28e3,
    check: 4e3
  };
  function createTrialSession(onMessage, opts = {}) {
    const playerId = opts.playerId ?? "trial-human";
    const phaseTable = { ...TRIAL_PHASE_MS, ...opts.phaseMs };
    const hub = new RoomHub({
      timers: opts.timers ?? true,
      autoAi: true,
      fillAiOnCreate: true,
      previewDeal: true,
      rng: opts.rng,
      phaseMs: (phase) => {
        if (phase === "lobby" || phase === "ended") return null;
        return phaseTable[phase] ?? null;
      }
    });
    hub.bind(playerId, onMessage);
    return {
      playerId,
      send(message) {
        hub.handle(playerId, message);
      },
      close() {
        hub.shutdown();
      }
    };
  }

  // src/trial/browser.ts
  var current = null;
  function readOptions(optionsJson) {
    if (!optionsJson) return {};
    try {
      const parsed = JSON.parse(optionsJson);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  }
  function open(listener, optionsJson) {
    current?.close();
    current = createTrialSession((message) => {
      listener(JSON.stringify(message));
    }, readOptions(optionsJson));
  }
  function send(json) {
    current?.send(JSON.parse(json));
  }
  function close() {
    current?.close();
    current = null;
  }
  return __toCommonJS(browser_exports);
})();
