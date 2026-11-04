"use strict";
var QuietZoneSignal = (() => {
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

  // src/signal/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    close: () => close,
    open: () => open,
    send: () => send
  });

  // src/signal/catalog.ts
  var KINDS = /* @__PURE__ */ new Set(["strike", "guard", "tool", "skill"]);
  var FACTIONS = /* @__PURE__ */ new Set(["lighthouse", "silence", "grey"]);
  var PHASES = ["night", "morning", "day", "play", "vote", "resolve", "discard"];
  var EFFECTS = {
    strike: /* @__PURE__ */ new Set(["jam_play", "add_mark", "hush_tool", "echo_pin", "rift", "strip_guard", "force_discard", "expose"]),
    guard: /* @__PURE__ */ new Set(["block_strike", "ignore_mark", "reflect", "block_intel", "steady", "fog"]),
    tool: /* @__PURE__ */ new Set(["sniff", "rewrite", "mirror", "replay", "ping", "draw1"]),
    skill: /* @__PURE__ */ new Set(["mute_all", "chorus_draw", "hop", "peek_deck"])
  };
  var SKILL_EFFECTS = /* @__PURE__ */ new Set(["sniff", "mirror", "hidden_mark", "anchor"]);
  var UNTARGETED = /* @__PURE__ */ new Set([
    "draw1",
    "mute_all",
    "chorus_draw",
    "hop",
    "peek_deck",
    "anchor",
    "block_strike",
    "ignore_mark",
    "reflect",
    "block_intel",
    "steady",
    "fog"
  ]);
  function bad(message) {
    throw new Error(`\u8A0A\u865F\u724C\u8868\uFF1A${message}`);
  }
  function row(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) bad(`${label} \u5514\u4FC2\u7269\u4EF6`);
    return value;
  }
  function str(source, key, label) {
    const value = source[key];
    if (typeof value !== "string" || value.trim() === "") bad(`${label}.${key} \u8981\u6709\u5B57`);
    return value.trim();
  }
  function num(source, key, label) {
    const value = source[key];
    if (typeof value !== "number" || !Number.isFinite(value)) bad(`${label}.${key} \u8981\u4FC2\u6578\u5B57`);
    return value;
  }
  function bool(source, key, label) {
    const value = source[key];
    if (typeof value !== "boolean") bad(`${label}.${key} \u8981\u4FC2\u5E03\u6797`);
    return value;
  }
  function parseCard(value, index) {
    const raw = row(value, `cards[${index}]`);
    const kind = str(raw, "kind", `cards[${index}]`);
    if (!KINDS.has(kind)) bad(`cards[${index}] \u7A2E\u985E ${kind}`);
    const effect = str(raw, "effect", `cards[${index}]`);
    if (!EFFECTS[kind].has(effect)) bad(`cards[${index}] \u6548\u679C ${effect}`);
    const needsTarget = bool(raw, "needsTarget", `cards[${index}]`);
    const expectTarget = !UNTARGETED.has(effect);
    if (needsTarget !== expectTarget) bad(`${str(raw, "name", `cards[${index}]`)} \u76EE\u6A19\u65D7\u5514\u593E`);
    return {
      id: str(raw, "id", `cards[${index}]`),
      name: str(raw, "name", `cards[${index}]`),
      kind,
      text: str(raw, "text", `cards[${index}]`),
      effect,
      needsTarget
    };
  }
  function parseSkill(value, label) {
    const raw = row(value, label);
    const effect = str(raw, "effect", label);
    if (!SKILL_EFFECTS.has(effect)) bad(`${label} \u6548\u679C ${effect}`);
    const window = str(raw, "window", label);
    if (window !== "night" && window !== "play" && window !== "vote") bad(`${label} \u7A97\u53E3`);
    const needsTarget = bool(raw, "needsTarget", label);
    if (needsTarget !== !UNTARGETED.has(effect)) bad(`${label} \u76EE\u6A19\u65D7\u5514\u593E`);
    return {
      id: str(raw, "id", label),
      name: str(raw, "name", label),
      window,
      text: str(raw, "text", label),
      effect,
      needsTarget
    };
  }
  function parseCatalog(cardsDoc, tableDoc) {
    const cardsRoot = row(cardsDoc, "cards");
    const table = row(tableDoc, "table");
    const version = str(cardsRoot, "version", "cards");
    if (str(table, "version", "table") !== version) bad("\u724C\u8868\u540C\u5C40\u8868\u7248\u672C\u5514\u540C");
    const cardList = cardsRoot.cards;
    if (!Array.isArray(cardList)) bad("cards \u8981\u4FC2\u9663\u5217");
    const cards = cardList.map(parseCard);
    const expected = { strike: 8, guard: 6, tool: 6, skill: 4 };
    for (const kind of KINDS) {
      const count = cards.filter((card) => card.kind === kind).length;
      if (count !== expected[kind]) bad(`${kind} \u61C9\u6709 ${expected[kind]} \u5F35\uFF0C\u800C\u5BB6 ${count}`);
    }
    const ids = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    for (const card of cards) {
      if (ids.has(card.id) || names.has(card.name)) bad(`\u724C\u91CD\u8907 ${card.name}`);
      ids.add(card.id);
      names.add(card.name);
    }
    const factions = row(table.factions, "factions");
    const factionLabels = {
      lighthouse: str(factions, "lighthouse", "factions"),
      silence: str(factions, "silence", "factions"),
      grey: str(factions, "grey", "factions")
    };
    const compositionRaw = row(table.composition, "composition");
    const composition = {
      lighthouse: num(compositionRaw, "lighthouse", "composition"),
      silence: num(compositionRaw, "silence", "composition"),
      grey: num(compositionRaw, "grey", "composition")
    };
    const roleList = table.roles;
    if (!Array.isArray(roleList)) bad("roles \u8981\u4FC2\u9663\u5217");
    const roles = roleList.map((value, index) => {
      const raw = row(value, `roles[${index}]`);
      const faction = str(raw, "faction", `roles[${index}]`);
      if (!FACTIONS.has(faction)) bad(`roles[${index}] \u9663\u71DF`);
      const factionLabel = str(raw, "factionLabel", `roles[${index}]`);
      if (factionLabel !== factionLabels[faction]) bad(`roles[${index}] \u9663\u71DF\u540D`);
      const skill = parseSkill(raw.skill, `roles[${index}].skill`);
      if (names.has(skill.name)) bad(`\u6280\u540D\u649E\u724C ${skill.name}`);
      names.add(skill.name);
      return {
        id: str(raw, "id", `roles[${index}]`),
        name: str(raw, "name", `roles[${index}]`),
        faction,
        factionLabel,
        skill
      };
    });
    const seatCount = composition.lighthouse + composition.silence + composition.grey;
    if (roles.length !== seatCount) bad("\u89D2\u8272\u6578\u540C\u5EA7\u4F4D\u5514\u593E");
    for (const faction of FACTIONS) {
      const count = roles.filter((role) => role.faction === faction).length;
      if (count !== composition[faction]) bad(`${faction} \u4EBA\u6578\u5514\u593E`);
    }
    const phaseList = table.phases;
    if (!Array.isArray(phaseList)) bad("phases \u8981\u4FC2\u9663\u5217");
    const phases = phaseList.map((value, index) => {
      const raw = row(value, `phases[${index}]`);
      const id = str(raw, "id", `phases[${index}]`);
      if (!PHASES.includes(id)) bad(`phases[${index}] id`);
      const ms = num(raw, "ms", `phases[${index}]`);
      if (ms < 1e3) bad(`${id} \u592A\u77ED`);
      return { id, label: str(raw, "label", `phases[${index}]`), coach: str(raw, "coach", `phases[${index}]`), ms };
    });
    if (phases.length !== PHASES.length || PHASES.some((id, index) => phases[index]?.id !== id)) {
      bad("\u968E\u6BB5\u6B21\u5E8F\u8981\u4FC2\u591C\u3001\u6668\u5831\u3001\u65E5\u3001\u51FA\u724C\u3001\u8868\u6C7A\u3001\u7D50\u7B97\u3001\u68C4\u724C");
    }
    const day = phases.find((phase) => phase.id === "day");
    if (!day || day.ms < 6e4 || day.ms > 9e4) bad("\u65E5\u6BB5\u8981\u55BA 60\u201390 \u79D2");
    const winsRaw = row(table.wins, "wins");
    const priority = winsRaw.priority;
    if (!Array.isArray(priority) || priority.length !== 3) bad("wins.priority");
    for (const faction of priority) {
      if (!FACTIONS.has(faction)) bad("wins.priority \u9663\u71DF");
    }
    const grey = row(winsRaw.grey, "wins.grey");
    const silence = row(winsRaw.silence, "wins.silence");
    const lighthouse = row(winsRaw.lighthouse, "wins.lighthouse");
    if (str(grey, "kind", "wins.grey") !== "survive_node") bad("\u7070\u983B\u52DD\u6CD5");
    if (str(silence, "kind", "wins.silence") !== "disconnect_quota") bad("\u6D88\u97F3\u7D44\u52DD\u6CD5");
    if (str(lighthouse, "kind", "wins.lighthouse") !== "clear_faction") bad("\u71C8\u5854\u7DB2\u52DD\u6CD5");
    const node = num(grey, "node", "wins.grey");
    const quota = num(silence, "quota", "wins.silence");
    const silenceFaction = str(silence, "faction", "wins.silence");
    const clearFaction = str(lighthouse, "faction", "wins.lighthouse");
    if (!FACTIONS.has(silenceFaction) || !FACTIONS.has(clearFaction)) bad("\u52DD\u689D\u4EF6\u9663\u71DF");
    const maxRounds = num(table, "maxRounds", "table");
    if (node < 2 || maxRounds < node) bad("\u7BC0\u9EDE\u4E0A\u9650");
    if (quota < 1) bad("\u65B7\u7DDA\u984D");
    const chipsRaw = table.chips;
    const aiNamesRaw = table.aiNames;
    if (!Array.isArray(chipsRaw) || chipsRaw.length < 3) bad("\u77ED\u53E5");
    if (!Array.isArray(aiNamesRaw) || aiNamesRaw.length < seatCount - 1) bad("AI \u540D");
    const chips = chipsRaw.map((chip, index) => {
      if (typeof chip !== "string" || chip.trim() === "") bad(`\u77ED\u53E5 ${index}`);
      return chip.trim();
    });
    const aiNames = aiNamesRaw.map((name, index) => {
      if (typeof name !== "string" || name.trim() === "") bad(`AI \u540D ${index}`);
      return name.trim();
    });
    const handLimit = num(table, "handLimit", "table");
    const drawPerRound = num(table, "drawPerRound", "table");
    const fastMs = num(table, "fastMs", "table");
    if (handLimit !== 4 || drawPerRound !== 1) bad("\u624B\u724C\u4E0A\u9650 4\u3001\u6BCF\u8F2A\u62BD 1");
    if (fastMs < 1e3) bad("fastMs");
    return {
      version,
      handLimit,
      drawPerRound,
      fastMs,
      maxRounds,
      tie: str(table, "tie", "table"),
      chips,
      aiNames,
      factions: factionLabels,
      composition,
      wins: {
        priority,
        grey: { kind: "survive_node", node, text: str(grey, "text", "wins.grey") },
        silence: {
          kind: "disconnect_quota",
          faction: silenceFaction,
          quota,
          text: str(silence, "text", "wins.silence")
        },
        lighthouse: {
          kind: "clear_faction",
          faction: clearFaction,
          text: str(lighthouse, "text", "wins.lighthouse")
        }
      },
      phases,
      roles,
      cards,
      byId: new Map(cards.map((card) => [card.id, card])),
      phaseById: new Map(phases.map((phase) => [phase.id, phase]))
    };
  }

  // src/signal/engine.ts
  var KIND_LABEL = {
    strike: "\u6B66",
    guard: "\u9632",
    tool: "\u9053",
    skill: "\u6280"
  };
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function cleanName(value) {
    const text = (value ?? "\u591C\u6B78\u4EBA").replace(/\s+/g, " ").trim().slice(0, 12);
    return text || "\u591C\u6B78\u4EBA";
  }
  function createMatch(catalog, options = {}) {
    const seed = Number.isFinite(options.seed) ? Math.floor(options.seed) : 20261104;
    const state = {
      rng: mulberry32(seed),
      now: Number.isFinite(options.now) ? options.now : 0,
      deadline: 0,
      round: 1,
      phase: "night",
      version: 0,
      seq: 0,
      deck: [],
      discard: [],
      seats: [],
      humanId: "s1",
      events: [],
      queuedMorning: [],
      log: [],
      strikesMuted: false,
      muteNext: false,
      winner: null,
      tally: null,
      silenceProgress: 0,
      fast: options.fast === true,
      manual: options.manual === true
    };
    const roles = [...catalog.roles];
    shuffle(state, roles);
    const names = [cleanName(options.name), ...catalog.aiNames];
    state.seats = roles.map((role, index) => ({
      id: `s${index + 1}`,
      name: names[index] ?? `\u5E2D${index + 1}`,
      ai: index !== 0,
      connected: true,
      faction: role.faction,
      roleId: role.id,
      roleName: role.name,
      skill: role.skill,
      skillUsed: false,
      hand: [],
      strike: null,
      guard: null,
      pendingCard: null,
      night: null,
      acted: false,
      jamNext: false,
      jammed: false,
      hushNext: false,
      hushed: false,
      noGuardNext: false,
      noGuard: false,
      marks: 0,
      rifts: 0,
      hop: false,
      anchor: false,
      talk: null,
      vote: null,
      strikePlayed: false,
      toolPlayed: false,
      skillPlayed: false,
      guardEquipped: false,
      lastPlayed: [],
      previousPlayed: [],
      notes: []
    }));
    state.deck = catalog.cards.map((card) => spawn(state, card.id));
    shuffle(state, state.deck);
    for (let round = 0; round < catalog.handLimit; round += 1) {
      for (const seat of state.seats) draw(state, catalog, seat, 1);
    }
    state.log.push("\u5C01\u9396\u591C\u958B\u59CB\u3002\u6BCF\u4EBA\u56DB\u5F35\u8A0A\u865F\u724C\u3002");
    enter(state, catalog, "night");
    if (options.at === "play" || options.at === "vote") skipThrough(state, catalog, ["night", "morning", "day"]);
    if (options.at === "vote") skipThrough(state, catalog, ["play"]);
    return {
      view: () => toView(state, catalog),
      command: (command, seatId) => applyCommand(state, catalog, command, seatId ?? state.humanId),
      tick: (now) => tick(state, catalog, now),
      elapse: () => tick(state, catalog, state.deadline),
      debug: debugApi(state, catalog)
    };
  }
  function spawn(state, defId) {
    state.seq += 1;
    return { uid: `k${state.seq}`, defId };
  }
  function shuffle(state, list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(state.rng() * (i + 1));
      const swap = list[i];
      list[i] = list[j];
      list[j] = swap;
    }
  }
  function defOf(catalog, card) {
    const found = catalog.byId.get(card.defId);
    if (!found) throw new Error(card.defId);
    return found;
  }
  function seatById(state, id) {
    return state.seats.find((seat) => seat.id === id);
  }
  function others(state, seat) {
    return state.seats.filter((other) => other.id !== seat.id && other.connected);
  }
  function phaseMs(state, catalog, phase) {
    if (state.fast) return catalog.fastMs;
    return catalog.phaseById.get(phase)?.ms ?? catalog.fastMs;
  }
  function pushLog(state, text) {
    state.log.push(text);
    if (state.log.length > 80) state.log.shift();
  }
  function note(seat, text) {
    seat.notes.push(text);
    if (seat.notes.length > 12) seat.notes.shift();
  }
  function take(seat, uid) {
    const index = seat.hand.findIndex((card) => card.uid === uid);
    if (index < 0) return null;
    return seat.hand.splice(index, 1)[0] ?? null;
  }
  function discardCard(state, card) {
    if (card) state.discard.push(card);
  }
  function guardEffect(catalog, seat) {
    return seat.guard ? defOf(catalog, seat.guard).effect : null;
  }
  function breakGuard(state, seat) {
    discardCard(state, seat.guard);
    seat.guard = null;
  }
  function reshuffle(state) {
    if (state.deck.length > 0 || state.discard.length === 0) return;
    state.deck = state.discard;
    state.discard = [];
    shuffle(state, state.deck);
  }
  function draw(state, catalog, seat, count) {
    for (let i = 0; i < count; i += 1) {
      reshuffle(state);
      const card = state.deck.pop();
      if (!card) return;
      seat.hand.push(card);
    }
    void catalog;
  }
  function addMark(state, catalog, target, why) {
    if (guardEffect(catalog, target) === "ignore_mark") {
      breakGuard(state, target);
      pushLog(state, `${target.name} \u507D\u88DD\u819C\u64CB\u4E0B\u7591\u9EDE`);
      return;
    }
    target.marks += 1;
    pushLog(state, `${why}\uFF1A${target.name} \u7591\u9EDE ${target.marks}`);
  }
  function resolveStrike(state, catalog, actor, target, card, bonus, bounced = false) {
    if (state.strikesMuted) {
      pushLog(state, `${card.name} \u88AB\u7E3D\u7DDA\u975C\u97F3\uFF0C\u843D\u7A7A`);
      return;
    }
    const guard = guardEffect(catalog, target);
    if (!bounced && guard === "reflect") {
      breakGuard(state, target);
      pushLog(state, `${target.name} \u6298\u5C04 ${card.name}`);
      resolveStrike(state, catalog, target, actor, card, false, true);
      return;
    }
    if (guard === "block_strike") {
      breakGuard(state, target);
      pushLog(state, `${target.name} \u975C\u9ED8\u7F69\u64CB\u4E0B ${card.name}`);
      return;
    }
    applyStrike(state, catalog, target, card);
    if (bonus && actor.strike && actor.connected) addMark(state, catalog, target, `${actor.name} \u4E0A\u819B`);
  }
  function applyStrike(state, catalog, target, card) {
    switch (card.effect) {
      case "jam_play":
        target.jamNext = true;
        pushLog(state, `${target.name} \u88AB\u64FE\u983B`);
        break;
      case "add_mark":
        addMark(state, catalog, target, card.name);
        break;
      case "hush_tool":
        target.hushNext = true;
        pushLog(state, `${target.name} \u88AB\u975C\u566A`);
        break;
      case "echo_pin":
        addMark(state, catalog, target, card.name);
        state.queuedMorning.push(`\u56DE\u8072\u91D8\u7559\u4F4E\uFF1A${target.name}`);
        break;
      case "rift":
        if (target.guard) {
          const name = defOf(catalog, target.guard).name;
          breakGuard(state, target);
          pushLog(state, `${target.name} \u88C2\u9699\u62C6\u8D70 ${name}`);
        } else {
          target.rifts += 1;
          pushLog(state, `${target.name} \u88C2\u9699 ${target.rifts}`);
        }
        break;
      case "strip_guard":
        if (target.guard) {
          const name = defOf(catalog, target.guard).name;
          breakGuard(state, target);
          pushLog(state, `${target.name} \u9632\u69FD ${name} \u88AB\u62C6`);
        } else {
          pushLog(state, `${target.name} \u5187\u9632`);
        }
        break;
      case "force_discard":
        if (guardEffect(catalog, target) === "steady") {
          pushLog(state, `${target.name} \u7A69\u983B\u74B0\uFF0C\u5514\u4F7F\u68C4`);
        } else if (target.hand.length === 0) {
          pushLog(state, `${target.name} \u5187\u724C\u53EF\u68C4`);
        } else {
          const index = Math.floor(state.rng() * target.hand.length);
          const [lost] = target.hand.splice(index, 1);
          discardCard(state, lost ?? null);
          pushLog(state, `${target.name} \u88AB\u903C\u68C4 1`);
        }
        break;
      case "expose":
        addMark(state, catalog, target, card.name);
        target.noGuardNext = true;
        state.queuedMorning.push(`\u983B\u9583\u7559\u4F4E\uFF1A${target.name}`);
        break;
      default:
        break;
    }
  }
  function livingTarget(state, seat, targetId) {
    if (!targetId) return "\u63C0\u4E00\u500B\u4EBA";
    const target = seatById(state, targetId);
    if (!target || target.id === seat.id || !target.connected) return "\u63C0\u5514\u5230\u5462\u5E2D";
    return target;
  }
  function probe(state, catalog, actor, target, kind, quiet) {
    if (guardEffect(catalog, target) === "block_intel") {
      breakGuard(state, target);
      note(actor, `${target.name} \u7A7A\u6BBC\uFF0C\u63A2\u5514\u5230`);
      if (!quiet) pushLog(state, `${actor.name} \u63A2 ${target.name}\uFF0C\u843D\u7A7A`);
      return;
    }
    if (kind === "faction") {
      const seen = guardEffect(catalog, target) === "fog" ? "\u9727" : catalog.factions[target.faction];
      note(actor, `${target.name}\uFF1A${seen}`);
      if (!quiet) pushLog(state, `${actor.name} \u55C5\u63A2 ${target.name}`);
      return;
    }
    if (kind === "equip") {
      const strike = target.strike ? defOf(catalog, target.strike).name : "\u7A7A";
      const guard = target.guard ? defOf(catalog, target.guard).name : "\u7A7A";
      note(actor, `${target.name} \u6B66 ${strike}\uFF0F\u9632 ${guard}`);
      if (!quiet) pushLog(state, `${actor.name} \u7747 ${target.name} \u88DD\u5099`);
      return;
    }
    if (kind === "replay") {
      const played = target.previousPlayed.length > 0 ? target.previousPlayed.join("\u3001") : "\u4E0A\u4E00\u8F2A\u5187\u51FA\u724C";
      note(actor, `${target.name}\uFF1A${played}`);
      if (!quiet) pushLog(state, `${actor.name} \u56DE\u653E ${target.name}`);
      return;
    }
    const armed = target.hand.some((card) => defOf(catalog, card).kind === "strike") || target.strike !== null;
    pushLog(state, `\u77ED\u6CE2\u91DD\uFF1A${target.name} ${armed ? "\u6709\u6B66" : "\u5187\u6B66"}`);
  }
  function applyNamedEffect(state, catalog, actor, target, effect, quiet) {
    switch (effect) {
      case "draw1":
        draw(state, catalog, actor, 1);
        pushLog(state, `${actor.name} \u5099\u7528\u6676\u7247\uFF0C\u62BD 1`);
        break;
      case "sniff":
        if (target) probe(state, catalog, actor, target, "faction", quiet);
        break;
      case "rewrite":
        if (!target) break;
        if (target.marks > 0) {
          target.marks -= 1;
          pushLog(state, `${actor.name} \u8986\u5BEB ${target.name}\uFF0C\u7591\u9EDE ${target.marks}`);
        } else {
          pushLog(state, `${target.name} \u5187\u7591\u9EDE\u53EF\u8986\u5BEB`);
        }
        break;
      case "mirror":
        if (target) probe(state, catalog, actor, target, "equip", quiet);
        break;
      case "replay":
        if (target) probe(state, catalog, actor, target, "replay", quiet);
        break;
      case "ping":
        if (target) probe(state, catalog, actor, target, "ping", quiet);
        break;
      case "mute_all":
        state.muteNext = true;
        pushLog(state, "\u7E3D\u7DDA\u975C\u97F3\uFF0C\u4E0B\u4E00\u8F2A\u6B66\u6703\u843D\u7A7A");
        break;
      case "chorus_draw":
        draw(state, catalog, actor, 1);
        pushLog(state, `${actor.name} \u71C8\u5854\u9F4A\u9CF4\uFF0C\u62BD 1`);
        break;
      case "hop":
        actor.hop = true;
        pushLog(state, `${actor.name} \u7070\u7DDA\u8DF3\u983B`);
        break;
      case "peek_deck": {
        reshuffle(state);
        const top = state.deck.slice(-3).reverse();
        const names = top.map((card) => defOf(catalog, card).name);
        note(actor, `\u724C\u5EAB\u9802\uFF1A${names.join("\u3001") || "\u7A7A"}`);
        pushLog(state, `${actor.name} \u7528\u8A18\u9304\u91D8`);
        break;
      }
      case "anchor":
        actor.anchor = true;
        note(actor, `${actor.skill.name} \u9810\u5099`);
        break;
      case "hidden_mark":
        if (!target) break;
        addMark(state, catalog, target, "\u6697\u8108");
        state.queuedMorning.push(`\u6697\u8108\u9EDE\u4E2D ${target.name}`);
        note(actor, `\u6697\u8108\u9EDE\u4E2D ${target.name}`);
        break;
      default:
        break;
    }
  }
  function randomDiscardOne(state, seat) {
    if (seat.hand.length === 0) return;
    const index = Math.floor(state.rng() * seat.hand.length);
    const [lost] = seat.hand.splice(index, 1);
    discardCard(state, lost ?? null);
  }
  function disconnect(state, catalog, seat) {
    seat.connected = false;
    seat.acted = true;
    discardCard(state, seat.strike);
    discardCard(state, seat.guard);
    discardCard(state, seat.pendingCard);
    seat.strike = null;
    seat.guard = null;
    seat.pendingCard = null;
    while (seat.hand.length > 0) discardCard(state, seat.hand.pop() ?? null);
    if (seat.faction === catalog.wins.silence.faction) state.silenceProgress += 1;
    pushLog(state, `${seat.name} \u65B7\u7DDA`);
    claim(state, catalog);
  }
  function claim(state, catalog) {
    if (state.winner) return;
    const met = /* @__PURE__ */ new Set();
    if (state.silenceProgress >= catalog.wins.silence.quota) met.add("silence");
    const clear = catalog.wins.lighthouse.faction;
    if (!state.seats.some((seat) => seat.connected && seat.faction === clear)) met.add("lighthouse");
    const winner = catalog.wins.priority.find((faction) => met.has(faction));
    if (winner) setWinner(state, catalog, winner);
  }
  function setWinner(state, catalog, faction) {
    state.winner = { faction, reason: catalog.wins[faction].text };
    state.phase = "ended";
    state.version += 1;
  }
  function enter(state, catalog, phase) {
    state.phase = phase;
    state.deadline = state.now + phaseMs(state, catalog, phase);
    if (phase === "morning") {
      state.events = state.queuedMorning.splice(0);
      if (state.events.length === 0) state.events.push("\u591C\u975C\u3002");
    }
    if (phase === "play") {
      state.strikesMuted = state.muteNext;
      state.muteNext = false;
      for (const seat of state.seats) {
        seat.jammed = seat.jamNext;
        seat.jamNext = false;
        seat.hushed = seat.hushNext;
        seat.hushNext = false;
        seat.noGuard = seat.noGuardNext;
        seat.noGuardNext = false;
        seat.strikePlayed = false;
        seat.toolPlayed = false;
        seat.skillPlayed = false;
        seat.guardEquipped = false;
        seat.previousPlayed = seat.lastPlayed;
        seat.lastPlayed = [];
      }
    }
    if (phase === "day") {
      for (const seat of state.seats) seat.talk = null;
    }
    if (phase === "vote") {
      for (const seat of state.seats) seat.vote = null;
      state.tally = null;
    }
    for (const seat of state.seats) seat.acted = seat.connected ? false : true;
    if (phase === "discard") {
      for (const seat of state.seats) {
        if (seat.connected && seat.hand.length <= catalog.handLimit) seat.acted = true;
      }
    }
    if (!state.manual) {
      for (const seat of state.seats) {
        if (seat.ai && seat.connected && !seat.acted) runAi(state, catalog, seat);
      }
    }
    state.version += 1;
  }
  function advanceRound(state, catalog) {
    if (state.winner) return;
    state.round += 1;
    const grey = state.seats.find((seat) => seat.faction === "grey");
    if (grey?.connected && state.round >= catalog.wins.grey.node) {
      setWinner(state, catalog, "grey");
      return;
    }
    if (state.round > catalog.maxRounds) {
      state.winner = { faction: null, reason: "\u6642\u9650\u5230\uFF0C\u672A\u5206\u52DD\u8CA0" };
      state.phase = "ended";
      state.version += 1;
      return;
    }
    for (const seat of state.seats) {
      seat.hop = false;
      seat.anchor = false;
    }
    enter(state, catalog, "night");
  }
  function closePhase(state, catalog) {
    const phase = state.phase;
    if (phase === "night") {
      for (const seat of state.seats) {
        if (!seat.connected) continue;
        resolveNight(state, catalog, seat);
      }
      enter(state, catalog, "morning");
      return;
    }
    if (phase === "morning") {
      enter(state, catalog, "day");
      return;
    }
    if (phase === "day") {
      enter(state, catalog, "play");
      return;
    }
    if (phase === "play") {
      enter(state, catalog, "vote");
      return;
    }
    if (phase === "vote") {
      closeVote(state, catalog);
      return;
    }
    if (phase === "resolve") {
      if (state.winner) return;
      for (const seat of state.seats) {
        if (seat.connected) draw(state, catalog, seat, catalog.drawPerRound);
      }
      if (state.seats.some((seat) => seat.connected && seat.hand.length > catalog.handLimit)) {
        enter(state, catalog, "discard");
      } else {
        advanceRound(state, catalog);
      }
      return;
    }
    if (phase === "discard") {
      for (const seat of state.seats) {
        if (!seat.connected) continue;
        while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
      }
      advanceRound(state, catalog);
    }
  }
  function resolveNight(state, catalog, seat) {
    const plan = seat.night ?? { action: "pass" };
    seat.night = null;
    if (plan.action === "arm" && seat.pendingCard) {
      discardCard(state, seat.strike);
      seat.strike = seat.pendingCard;
      seat.pendingCard = null;
      state.queuedMorning.push(`${seat.name} \u6B66\u69FD\uFF1A${defOf(catalog, seat.strike).name}`);
      return;
    }
    if (plan.action === "skill") {
      const target = plan.targetSeatId ? seatById(state, plan.targetSeatId) : void 0;
      if (seat.skill.needsTarget && (!target || !target.connected || target.id === seat.id)) {
        note(seat, "\u6697\u6280\u843D\u7A7A");
        return;
      }
      applyNamedEffect(state, catalog, seat, target ?? null, seat.skill.effect, true);
      if (seat.skill.effect === "sniff") state.queuedMorning.push("\u6709\u4EBA\u6E2C\u5411");
    }
  }
  function closeVote(state, catalog) {
    const totals = /* @__PURE__ */ new Map();
    for (const seat of state.seats) {
      if (!seat.connected || !seat.vote || seat.vote === "abstain") continue;
      totals.set(seat.vote, (totals.get(seat.vote) ?? 0) + 1);
    }
    state.tally = state.seats.filter((seat) => seat.connected).map((seat) => ({ seatId: seat.id, votes: totals.get(seat.id) ?? 0 }));
    let top = 0;
    const leaders = [];
    for (const seat of state.seats) {
      if (!seat.connected) continue;
      const votes = totals.get(seat.id) ?? 0;
      if (votes > top) {
        top = votes;
        leaders.splice(0, leaders.length, seat);
      } else if (votes === top && votes > 0) {
        leaders.push(seat);
      }
    }
    if (top === 0 || leaders.length !== 1) {
      pushLog(state, state.seats.some((seat) => seat.connected && seat.vote && seat.vote !== "abstain") ? catalog.tie : "\u5187\u4EBA\u65B7\u7DDA");
    } else {
      const target = leaders[0];
      if (target.hop || target.anchor) {
        pushLog(state, `${target.name} ${target.anchor ? target.skill.name : "\u8DF3\u983B"}\uFF0C\u7559\u4F4E`);
      } else {
        disconnect(state, catalog, target);
      }
    }
    for (const seat of state.seats) {
      seat.hop = false;
      seat.anchor = false;
    }
    if (!state.winner) enter(state, catalog, "resolve");
  }
  function phaseReady(state) {
    if (state.phase === "ended" || state.winner) return false;
    return state.seats.every((seat) => !seat.connected || seat.acted);
  }
  function requestSettle(state, catalog) {
    let guard = 0;
    while (phaseReady(state) && guard < 80) {
      guard += 1;
      closePhase(state, catalog);
    }
  }
  function timeoutSeat(state, catalog, seat) {
    if (seat.acted || !seat.connected) return;
    if (state.phase === "night" && !seat.night) seat.night = { action: "pass" };
    if (state.phase === "vote" && !seat.vote) seat.vote = "abstain";
    if (state.phase === "discard") {
      while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
    }
    seat.acted = true;
  }
  function skipThrough(state, catalog, phases) {
    let guard = 0;
    while (phases.includes(state.phase) && !state.winner && guard < 20) {
      guard += 1;
      for (const seat of state.seats) {
        if (seat.connected && !seat.acted) timeoutSeat(state, catalog, seat);
      }
      requestSettle(state, catalog);
    }
  }
  function tick(state, catalog, now) {
    state.now = now;
    let guard = 0;
    while (state.phase !== "ended" && !state.winner && now >= state.deadline && guard < 80) {
      guard += 1;
      for (const seat of state.seats) timeoutSeat(state, catalog, seat);
      requestSettle(state, catalog);
    }
  }
  function pickTarget(state, seat) {
    const pool = others(state, seat);
    if (pool.length === 0) return null;
    const marked = [...pool].sort((a, b) => b.marks - a.marks || a.id.localeCompare(b.id));
    if ((marked[0]?.marks ?? 0) > 0) return marked[0] ?? null;
    return pool[Math.floor(state.rng() * pool.length)] ?? null;
  }
  function runAi(state, catalog, seat) {
    if (state.phase === "night") {
      aiNight(state, catalog, seat);
      return;
    }
    if (state.phase === "day") {
      seat.talk = catalog.chips[Math.floor(state.rng() * catalog.chips.length)] ?? "\u6211\u904E";
      seat.acted = true;
      return;
    }
    if (state.phase === "play") {
      aiPlay(state, catalog, seat);
      return;
    }
    if (state.phase === "vote") {
      aiVote(state, seat);
      return;
    }
    if (state.phase === "discard") {
      while (seat.hand.length > catalog.handLimit) randomDiscardOne(state, seat);
      seat.acted = true;
      return;
    }
    seat.acted = true;
  }
  function aiNight(state, catalog, seat) {
    if (!seat.skillUsed && seat.skill.window === "night") {
      const target = seat.skill.needsTarget ? pickTarget(state, seat) : null;
      if (!seat.skill.needsTarget || target) {
        seat.skillUsed = true;
        seat.night = { action: "skill", targetSeatId: target?.id };
        seat.acted = true;
        return;
      }
    }
    const strike = seat.hand.find((card) => defOf(catalog, card).kind === "strike");
    if (strike && !seat.strike) {
      seat.pendingCard = take(seat, strike.uid);
      seat.night = { action: "arm", cardUid: strike.uid };
      seat.acted = true;
      return;
    }
    seat.night = { action: "pass" };
    seat.acted = true;
  }
  function aiPlay(state, catalog, seat) {
    if (!seat.skillUsed && seat.skill.window === "play") {
      const target = seat.skill.needsTarget ? pickTarget(state, seat) : null;
      if (!seat.skill.needsTarget || target) usePrivate(state, catalog, seat, target);
    }
    if (!seat.guardEquipped && !seat.noGuard) {
      const guard = seat.hand.find((card) => defOf(catalog, card).effect === "block_strike") ?? seat.hand.find((card) => defOf(catalog, card).kind === "guard");
      if (guard) equipGuard(state, catalog, seat, guard);
    }
    if (!seat.strikePlayed && !seat.jammed && !state.strikesMuted) {
      const strike = seat.hand.find((card) => defOf(catalog, card).kind === "strike");
      const target = pickTarget(state, seat);
      if (strike && target) playStrike(state, catalog, seat, strike, target);
    }
    if (!seat.toolPlayed && !seat.hushed) {
      const tool = seat.hand.find((card) => defOf(catalog, card).effect === "draw1") ?? seat.hand.find((card) => defOf(catalog, card).kind === "tool");
      if (tool) {
        const card = defOf(catalog, tool);
        const target = card.needsTarget ? pickTarget(state, seat) : null;
        if (!card.needsTarget || target) playTool(state, catalog, seat, tool, target);
      }
    }
    const skill = seat.hand.find((card) => defOf(catalog, card).kind === "skill");
    if (skill && !seat.skillPlayed) {
      const effect = defOf(catalog, skill).effect;
      const useful = effect === "chorus_draw" || effect === "peek_deck" || effect === "hop" && seat.marks > 0;
      if (useful) playSkillCard(state, catalog, seat, skill);
    }
    seat.acted = true;
  }
  function aiVote(state, seat) {
    if (!seat.skillUsed && seat.skill.window === "vote") {
      seat.skillUsed = true;
      seat.anchor = true;
      note(seat, `${seat.skill.name} \u9810\u5099`);
    }
    const pool = others(state, seat).sort((a, b) => b.marks - a.marks || a.id.localeCompare(b.id));
    if (pool.length === 0) seat.vote = "abstain";
    else if ((pool[0]?.marks ?? 0) > 0) seat.vote = pool[0]?.id ?? "abstain";
    else seat.vote = pool[(state.round + seatIndex(state, seat)) % pool.length]?.id ?? "abstain";
    seat.acted = true;
  }
  function seatIndex(state, seat) {
    return state.seats.findIndex((other) => other.id === seat.id);
  }
  function equipGuard(state, catalog, seat, card) {
    const held = card.uid.startsWith("pending") ? card : take(seat, card.uid);
    if (!held) return;
    discardCard(state, seat.guard);
    seat.guard = held;
    seat.guardEquipped = true;
    pushLog(state, `${seat.name} \u88DD\u4E0A ${defOf(catalog, held).name}`);
  }
  function playStrike(state, catalog, seat, card, target) {
    const held = take(seat, card.uid);
    if (!held) return;
    const cardDef = defOf(catalog, held);
    seat.strikePlayed = true;
    seat.lastPlayed.push(cardDef.name);
    resolveStrike(state, catalog, seat, target, cardDef, true);
  }
  function playTool(state, catalog, seat, card, target) {
    const held = take(seat, card.uid);
    if (!held) return;
    const cardDef = defOf(catalog, held);
    seat.toolPlayed = true;
    seat.lastPlayed.push(cardDef.name);
    applyNamedEffect(state, catalog, seat, target, cardDef.effect, false);
  }
  function playSkillCard(state, catalog, seat, card) {
    const held = take(seat, card.uid);
    if (!held) return;
    const cardDef = defOf(catalog, held);
    seat.skillPlayed = true;
    seat.lastPlayed.push(cardDef.name);
    applyNamedEffect(state, catalog, seat, null, cardDef.effect, false);
  }
  function usePrivate(state, catalog, seat, target) {
    seat.skillUsed = true;
    applyNamedEffect(state, catalog, seat, target, seat.skill.effect, state.phase === "night");
  }
  function applyCommand(state, catalog, command, seatId) {
    if (state.phase === "ended") return { ok: false, error: "\u5C40\u5DF2\u5B8C" };
    const seat = seatById(state, seatId);
    if (!seat) return { ok: false, error: "\u5187\u5462\u5E2D" };
    const error = dispatch(state, catalog, seat, command);
    if (error) return { ok: false, error };
    state.version += 1;
    requestSettle(state, catalog);
    return { ok: true };
  }
  function dispatch(state, catalog, seat, command) {
    if (command.type === "ready") return ready(state, catalog, seat);
    if (!seat.connected) return "\u4F60\u5DF2\u65B7\u7DDA";
    if (seat.acted && !(command.type === "vote" && state.phase === "vote" && seat.skill.window === "vote")) {
      if (!(state.phase === "vote" && command.type === "play")) return "\u4F60\u5DF2\u7D93\u884C\u52D5";
    }
    switch (command.type) {
      case "night":
        return doNight(state, catalog, seat, command);
      case "talk":
        return doTalk(state, catalog, seat, command.chip);
      case "play":
        return doPlay(state, catalog, seat, command);
      case "vote":
        return doVote(state, seat, command.targetSeatId);
      case "discard":
        return doDiscard(state, catalog, seat, command.cardUid);
      default:
        return "\u5514\u660E\u5462\u4E00\u4E0B";
    }
  }
  function ready(state, catalog, seat) {
    if (!seat.connected || seat.acted) return null;
    if (state.phase === "discard" && seat.hand.length > catalog.handLimit) return "\u5148\u68C4\u724C";
    timeoutSeat(state, catalog, seat);
    return null;
  }
  function doNight(state, catalog, seat, command) {
    if (state.phase !== "night") return "\u800C\u5BB6\u5514\u4FC2\u591C";
    if (seat.acted) return "\u4F60\u5DF2\u7D93\u884C\u52D5";
    if (command.action === "pass") {
      seat.night = { action: "pass" };
      seat.acted = true;
      return null;
    }
    if (command.action === "arm") {
      if (!command.cardUid) return "\u63C0\u4E00\u5F35\u6B66";
      const card = seat.hand.find((item) => item.uid === command.cardUid);
      if (!card || defOf(catalog, card).kind !== "strike") return "\u5462\u5F35\u5514\u4FC2\u6B66";
      seat.pendingCard = take(seat, card.uid);
      seat.night = { action: "arm", cardUid: card.uid };
      seat.acted = true;
      return null;
    }
    if (seat.skillUsed || seat.skill.window !== "night") return "\u6697\u6280\u7528\u5514\u5230";
    const target = seat.skill.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
    if (typeof target === "string") return target;
    seat.skillUsed = true;
    seat.night = { action: "skill", targetSeatId: target?.id };
    seat.acted = true;
    return null;
  }
  function doTalk(state, catalog, seat, chip) {
    if (state.phase !== "day") return "\u800C\u5BB6\u5514\u4FC2\u65E5";
    if (seat.acted) return "\u4F60\u5DF2\u7D93\u884C\u52D5";
    if (!catalog.chips.includes(chip)) return "\u5187\u5462\u53E5";
    seat.talk = chip;
    seat.acted = true;
    return null;
  }
  function doPlay(state, catalog, seat, command) {
    if (state.phase === "vote" && command.action === "private") {
      if (seat.skillUsed || seat.skill.window !== "vote") return "\u8EAB\u4EFD\u6280\u7528\u5514\u5230";
      usePrivate(state, catalog, seat, null);
      return null;
    }
    if (state.phase !== "play") return "\u800C\u5BB6\u5514\u4FC2\u51FA\u724C";
    if (seat.acted) return "\u4F60\u5DF2\u7D93\u884C\u52D5";
    if (command.action === "finish") {
      seat.acted = true;
      return null;
    }
    if (command.action === "private") {
      if (seat.skillUsed || seat.skill.window !== "play") return "\u8EAB\u4EFD\u6280\u7528\u5514\u5230";
      const target = seat.skill.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
      if (typeof target === "string") return target;
      usePrivate(state, catalog, seat, target);
      return null;
    }
    if (command.action === "fire") {
      if (seat.jammed || state.strikesMuted) return "\u800C\u5BB6\u6253\u5514\u51FA\u6B66";
      if (seat.strikePlayed) return "\u6B66\u984D\u7528\u5497";
      if (!seat.strike) return "\u6B66\u69FD\u4FC2\u7A7A";
      const target = livingTarget(state, seat, command.targetSeatId);
      if (typeof target === "string") return target;
      const card2 = defOf(catalog, seat.strike);
      seat.strikePlayed = true;
      seat.lastPlayed.push(card2.name);
      resolveStrike(state, catalog, seat, target, card2, false);
      return null;
    }
    if (command.action === "arm") {
      if (seat.jammed) return "\u88AB\u64FE\u983B\uFF0C\u88DD\u5514\u5230\u6B66";
      if (seat.strikePlayed) return "\u6B66\u984D\u7528\u5497";
      if (!command.cardUid) return "\u63C0\u4E00\u5F35\u6B66";
      const card2 = seat.hand.find((item) => item.uid === command.cardUid);
      if (!card2 || defOf(catalog, card2).kind !== "strike") return "\u5462\u5F35\u5514\u4FC2\u6B66";
      const held = take(seat, card2.uid);
      if (!held) return "\u5187\u5462\u5F35\u724C";
      discardCard(state, seat.strike);
      seat.strike = held;
      seat.strikePlayed = true;
      seat.lastPlayed.push(defOf(catalog, held).name);
      pushLog(state, `${seat.name} \u88DD\u4E0A ${defOf(catalog, held).name}`);
      return null;
    }
    if (!command.cardUid) return "\u63C0\u4E00\u5F35\u724C";
    const card = seat.hand.find((item) => item.uid === command.cardUid);
    if (!card) return "\u5187\u5462\u5F35\u724C";
    const cardDef = defOf(catalog, card);
    if (command.action === "guard") {
      if (seat.noGuard) return "\u983B\u9583\u672A\u904E\uFF0C\u88DD\u5514\u5230\u9632";
      if (seat.guardEquipped) return "\u4ECA\u8F2A\u88DD\u904E\u9632";
      if (cardDef.kind !== "guard") return "\u5462\u5F35\u5514\u4FC2\u9632";
      equipGuard(state, catalog, seat, card);
      return null;
    }
    if (command.action === "strike") {
      if (seat.jammed || state.strikesMuted) return "\u800C\u5BB6\u6253\u5514\u51FA\u6B66";
      if (seat.strikePlayed) return "\u6B66\u984D\u7528\u5497";
      if (cardDef.kind !== "strike") return "\u5462\u5F35\u5514\u4FC2\u6B66";
      const target = livingTarget(state, seat, command.targetSeatId);
      if (typeof target === "string") return target;
      playStrike(state, catalog, seat, card, target);
      return null;
    }
    if (command.action === "tool") {
      if (seat.hushed) return "\u88AB\u975C\u566A\uFF0C\u6253\u5514\u51FA\u9053";
      if (seat.toolPlayed) return "\u9053\u984D\u7528\u5497";
      if (cardDef.kind !== "tool") return "\u5462\u5F35\u5514\u4FC2\u9053";
      const target = cardDef.needsTarget ? livingTarget(state, seat, command.targetSeatId) : null;
      if (typeof target === "string") return target;
      playTool(state, catalog, seat, card, target);
      return null;
    }
    if (command.action === "skill") {
      if (seat.skillPlayed) return "\u6280\u984D\u7528\u5497";
      if (cardDef.kind !== "skill") return "\u5462\u5F35\u5514\u4FC2\u6280";
      playSkillCard(state, catalog, seat, card);
      return null;
    }
    return "\u5514\u660E\u5462\u4E00\u4E0B";
  }
  function doVote(state, seat, targetId) {
    if (state.phase !== "vote") return "\u800C\u5BB6\u5514\u4FC2\u8868\u6C7A";
    if (seat.vote) return "\u5DF2\u8868\u6C7A";
    if (targetId !== "abstain") {
      const target = livingTarget(state, seat, targetId);
      if (typeof target === "string") return target;
      seat.vote = target.id;
    } else {
      seat.vote = "abstain";
    }
    if (seat.skillUsed || seat.skill.window !== "vote") seat.acted = true;
    return null;
  }
  function doDiscard(state, catalog, seat, uid) {
    if (state.phase !== "discard") return "\u800C\u5BB6\u5514\u4F7F\u68C4";
    if (seat.hand.length <= catalog.handLimit) return "\u624B\u724C\u672A\u8D85\u984D";
    const card = take(seat, uid);
    if (!card) return "\u5187\u5462\u5F35\u724C";
    discardCard(state, card);
    pushLog(state, `${seat.name} \u68C4 1`);
    if (seat.hand.length <= catalog.handLimit) seat.acted = true;
    return null;
  }
  function handView(catalog, card) {
    const cardDef = defOf(catalog, card);
    return {
      uid: card.uid,
      id: cardDef.id,
      name: cardDef.name,
      kind: cardDef.kind,
      kindLabel: KIND_LABEL[cardDef.kind],
      text: cardDef.text,
      needsTarget: cardDef.needsTarget
    };
  }
  function voteLabel(state, seat) {
    if (state.phase !== "vote" && state.phase !== "resolve" && state.phase !== "ended") return null;
    if (!seat.vote) return null;
    if (seat.vote === "abstain") return "\u68C4\u6B0A";
    return seatById(state, seat.vote)?.name ?? null;
  }
  function goalFor(catalog, faction) {
    return catalog.wins[faction].text;
  }
  function toView(state, catalog) {
    const you = seatById(state, state.humanId);
    const phaseDef = state.phase === "ended" ? null : catalog.phaseById.get(state.phase);
    const total = state.phase === "ended" ? 0 : phaseMs(state, catalog, state.phase);
    const secondsLeft = state.phase === "ended" ? null : Math.max(0, Math.ceil((state.deadline - state.now) / 1e3));
    const ended = state.phase === "ended";
    return {
      version: state.version,
      phase: state.phase,
      phaseLabel: ended ? "\u7D42\u5C40" : phaseDef?.label ?? "",
      coach: state.winner ? state.winner.reason : phaseDef?.coach ?? "",
      round: state.round,
      banner: `\u7B2C ${state.round} \u7BC0\u9EDE`,
      now: state.now,
      deadline: state.deadline,
      secondsLeft,
      secondsTotal: Math.max(1, Math.round(total / 1e3)),
      events: [...state.events],
      log: state.log.slice(-8),
      rules: [catalog.wins.silence.text, catalog.wins.lighthouse.text, catalog.wins.grey.text],
      chips: catalog.chips,
      tally: state.tally ? state.tally.map((row2) => ({
        name: seatById(state, row2.seatId)?.name ?? row2.seatId,
        votes: row2.votes
      })) : null,
      winner: state.winner ? {
        faction: state.winner.faction,
        factionLabel: state.winner.faction ? catalog.factions[state.winner.faction] : "\u672A\u5206\u52DD\u8CA0",
        reason: state.winner.reason
      } : null,
      seats: state.seats.map((seat) => ({
        id: seat.id,
        name: seat.name,
        ai: seat.ai,
        connected: seat.connected,
        acted: seat.acted && seat.connected,
        marks: seat.marks,
        rifts: seat.rifts,
        strike: seat.strike ? defOf(catalog, seat.strike).name : null,
        guard: seat.guard ? defOf(catalog, seat.guard).name : null,
        talk: seat.talk,
        vote: voteLabel(state, seat),
        handCount: seat.hand.length,
        isYou: seat.id === state.humanId,
        ...ended ? { roleName: seat.roleName, factionLabel: catalog.factions[seat.faction] } : {}
      })),
      you: {
        seatId: you.id,
        name: you.name,
        connected: you.connected,
        acted: you.acted,
        voted: you.vote !== null,
        factionLabel: catalog.factions[you.faction],
        roleName: you.roleName,
        goal: goalFor(catalog, you.faction),
        skillName: you.skill.name,
        skillText: you.skill.text,
        skillWindow: you.skill.window,
        skillNeedsTarget: you.skill.needsTarget,
        skillUsed: you.skillUsed,
        skillReady: you.connected && !you.skillUsed && you.skill.window === state.phase && (state.phase === "vote" || !you.acted),
        hand: you.hand.map((card) => handView(catalog, card)),
        strike: you.strike ? defOf(catalog, you.strike).name : null,
        guard: you.guard ? defOf(catalog, you.guard).name : null,
        notes: you.notes.slice(-4),
        pending: you.pendingCard ? defOf(catalog, you.pendingCard).name : null,
        canStrike: state.phase === "play" && you.connected && !you.acted && !you.strikePlayed && !you.jammed && !state.strikesMuted,
        canFire: state.phase === "play" && you.connected && !you.acted && !you.strikePlayed && !you.jammed && !state.strikesMuted && you.strike !== null,
        canArm: state.phase === "play" && you.connected && !you.acted && !you.strikePlayed && !you.jammed,
        canTool: state.phase === "play" && you.connected && !you.acted && !you.toolPlayed && !you.hushed,
        canGuard: state.phase === "play" && you.connected && !you.acted && !you.guardEquipped && !you.noGuard,
        quotas: {
          strike: `${you.strikePlayed ? 1 : 0}/1`,
          tool: `${you.toolPlayed ? 1 : 0}/1`,
          guard: `${you.guardEquipped ? 1 : 0}/1`
        }
      }
    };
  }
  function debugApi(state, catalog) {
    const find = (id) => {
      const seat = seatById(state, id);
      if (!seat) throw new Error(id);
      return seat;
    };
    return {
      seats: () => state.seats.map((seat) => ({
        id: seat.id,
        faction: seat.faction,
        connected: seat.connected,
        marks: seat.marks,
        rifts: seat.rifts,
        jammed: seat.jammed,
        hushed: seat.hushed,
        noGuard: seat.noGuard,
        skillUsed: seat.skillUsed,
        skillWindow: seat.skill.window,
        guard: seat.guard ? defOf(catalog, seat.guard).effect : null,
        strike: seat.strike ? defOf(catalog, seat.strike).name : null,
        hand: seat.hand.map((card) => card.defId)
      })),
      addCard: (seatId, defId) => {
        if (!catalog.byId.has(defId)) throw new Error(defId);
        const card = spawn(state, defId);
        find(seatId).hand.push(card);
        return card.uid;
      },
      clearHand: (seatId) => {
        const seat = find(seatId);
        while (seat.hand.length > 0) discardCard(state, seat.hand.pop() ?? null);
      },
      setMarks: (seatId, marks) => {
        find(seatId).marks = marks;
      },
      jump: (phase) => {
        state.winner = null;
        enter(state, catalog, phase);
      },
      nextPlay: () => {
        state.winner = null;
        enter(state, catalog, "play");
      },
      disconnect: (seatId) => {
        const seat = find(seatId);
        if (seat.connected) disconnect(state, catalog, seat);
      },
      advanceRound: () => advanceRound(state, catalog),
      silenceProgress: () => state.silenceProgress,
      notes: (seatId) => [...find(seatId).notes],
      log: () => [...state.log]
    };
  }

  // ../../docs/signal/cards.json
  var cards_default = {
    version: "signal-mvp-1",
    cards: [
      {
        id: "jam_spear",
        name: "\u64FE\u983B\u77DB",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u4E0B\u4E00\u8F2A\u5514\u53EF\u4EE5\u6253\u6B66\u540C\u9053\u3002",
        effect: "jam_play",
        needsTarget: true
      },
      {
        id: "pulse_sting",
        name: "\u65B7\u8108\u523A",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u52A0 1 \u500B\u7591\u9EDE\u3002",
        effect: "add_mark",
        needsTarget: true
      },
      {
        id: "hush_blade",
        name: "\u975C\u566A\u5203",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u4E0B\u4E00\u8F2A\u5514\u53EF\u4EE5\u6253\u9053\u3002",
        effect: "hush_tool",
        needsTarget: true
      },
      {
        id: "echo_nail",
        name: "\u56DE\u8072\u91D8",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u52A0 1 \u7591\u9EDE\uFF0C\u4E0B\u4E00\u6668\u5831\u9EDE\u540D\u3002",
        effect: "echo_pin",
        needsTarget: true
      },
      {
        id: "rift_arrow",
        name: "\u88C2\u9699\u77E2",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u6709\u9632\u5C31\u62C6\u9632\uFF1B\u5187\u9632\u5C31\u52A0 1 \u88C2\u9699\u3002",
        effect: "rift",
        needsTarget: true
      },
      {
        id: "mask_fist",
        name: "\u906E\u7F69\u62F3",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u62C6\u8D70\u9632\u69FD\u3002",
        effect: "strip_guard",
        needsTarget: true
      },
      {
        id: "scramble_whip",
        name: "\u932F\u983B\u97AD",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u903C\u4F62\u68C4 1 \u5F35\u624B\u724C\u3002",
        effect: "force_discard",
        needsTarget: true
      },
      {
        id: "flash_awl",
        name: "\u983B\u9583\u9310",
        kind: "strike",
        text: "\u6307\u5B9A\u4E00\u4EBA\u3002\u52A0 1 \u7591\u9EDE\uFF0C\u4E0B\u4E00\u8F2A\u5514\u53EF\u4EE5\u88DD\u9632\u3002",
        effect: "expose",
        needsTarget: true
      },
      {
        id: "quiet_shell",
        name: "\u975C\u9ED8\u7F69",
        kind: "guard",
        text: "\u64CB\u4E0B\u4E00\u6B21\u6253\u4F60\u5605\u6B66\uFF0C\u7136\u5F8C\u788E\u3002",
        effect: "block_strike",
        needsTarget: false
      },
      {
        id: "guise_film",
        name: "\u507D\u88DD\u819C",
        kind: "guard",
        text: "\u64CB\u4E0B\u4E00\u6B21\u7591\u9EDE\uFF0C\u7136\u5F8C\u788E\u3002",
        effect: "ignore_mark",
        needsTarget: false
      },
      {
        id: "prism_plate",
        name: "\u6298\u5C04\u677F",
        kind: "guard",
        text: "\u5C07\u4E0B\u4E00\u6B21\u6253\u4F60\u5605\u6B66\u5F48\u8FD4\u6253\u51FA\u55F0\u4EBA\uFF0C\u7136\u5F8C\u788E\u3002",
        effect: "reflect",
        needsTarget: false
      },
      {
        id: "hollow_coat",
        name: "\u7A7A\u6BBC\u8863",
        kind: "guard",
        text: "\u64CB\u4E0B\u4E00\u6B21\u91DD\u5C0D\u4F60\u5605\u9053\uFF0C\u7136\u5F8C\u788E\u3002",
        effect: "block_intel",
        needsTarget: false
      },
      {
        id: "steady_ring",
        name: "\u7A69\u983B\u74B0",
        kind: "guard",
        text: "\u5514\u6703\u88AB\u903C\u68C4\u724C\u3002\u7559\u5230\u88AB\u62C6\u3002",
        effect: "steady",
        needsTarget: false
      },
      {
        id: "fog_cloak",
        name: "\u9727\u71C8\u6597\u7BF7",
        kind: "guard",
        text: "\u88AB\u55C5\u63A2\u6642\u53EA\u986F\u793A\u9727\u3002\u7559\u5230\u88AB\u62C6\u3002",
        effect: "fog",
        needsTarget: false
      },
      {
        id: "sniffer",
        name: "\u55C5\u63A2\u5668",
        kind: "tool",
        text: "\u79C1\u4E0B\u77E5\u9053\u4E00\u500B\u4EBA\u5605\u9663\u71DF\u3002",
        effect: "sniff",
        needsTarget: true
      },
      {
        id: "rewrite_key",
        name: "\u8986\u5BEB\u9375",
        kind: "tool",
        text: "\u79FB\u9664\u4E00\u500B\u4EBA 1 \u500B\u7591\u9EDE\u3002",
        effect: "rewrite",
        needsTarget: true
      },
      {
        id: "band_mirror",
        name: "\u983B\u6BB5\u93E1",
        kind: "tool",
        text: "\u79C1\u4E0B\u7747\u4E00\u500B\u4EBA\u5605\u6B66\u69FD\u540C\u9632\u69FD\u3002",
        effect: "mirror",
        needsTarget: true
      },
      {
        id: "replay_tape",
        name: "\u56DE\u653E\u5E36",
        kind: "tool",
        text: "\u79C1\u4E0B\u7747\u4E00\u500B\u4EBA\u4E0A\u4E00\u8F2A\u6253\u51FA\u5605\u724C\u3002",
        effect: "replay",
        needsTarget: true
      },
      {
        id: "shortwave",
        name: "\u77ED\u6CE2\u91DD",
        kind: "tool",
        text: "\u516C\u958B\uFF1A\u4E00\u500B\u4EBA\u6709\u5187\u6B66\u3002",
        effect: "ping",
        needsTarget: true
      },
      {
        id: "spare_chip",
        name: "\u5099\u7528\u6676\u7247",
        kind: "tool",
        text: "\u5373\u62BD 1 \u5F35\u3002",
        effect: "draw1",
        needsTarget: false
      },
      {
        id: "bus_mute",
        name: "\u7E3D\u7DDA\u975C\u97F3",
        kind: "skill",
        text: "\u4E0B\u4E00\u8F2A\u51FA\u724C\uFF0C\u6240\u6709\u6B66\u90FD\u843D\u7A7A\u3002",
        effect: "mute_all",
        needsTarget: false
      },
      {
        id: "beacon_call",
        name: "\u71C8\u5854\u9F4A\u9CF4",
        kind: "skill",
        text: "\u4F60\u62BD 1\u3002\u516C\u958B\u9F4A\u9CF4\u3002",
        effect: "chorus_draw",
        needsTarget: false
      },
      {
        id: "grey_hop",
        name: "\u7070\u7DDA\u8DF3\u983B",
        kind: "skill",
        text: "\u4F60\u672C\u8F2A\u5514\u6703\u88AB\u8868\u6C7A\u65B7\u7DDA\u3002",
        effect: "hop",
        needsTarget: false
      },
      {
        id: "ledger_nail",
        name: "\u8A18\u9304\u91D8",
        kind: "skill",
        text: "\u79C1\u4E0B\u7747\u724C\u5EAB\u9802\u4E09\u5F35\u3002",
        effect: "peek_deck",
        needsTarget: false
      }
    ]
  };

  // ../../docs/signal/table.json
  var table_default = {
    version: "signal-mvp-1",
    handLimit: 4,
    drawPerRound: 1,
    fastMs: 8e3,
    maxRounds: 6,
    tie: "\u5E73\u7968\u7559\u7DDA",
    chips: ["\u53EF\u7591", "\u7559\u4F4E", "\u5187\u8072", "\u5C0D\u983B", "\u6211\u904E"],
    aiNames: ["\u9727\u6E2F\u71C8", "\u8FF4\u8DEF", "\u4F4E\u566A", "\u5CB8\u6A19"],
    factions: {
      lighthouse: "\u71C8\u5854\u7DB2",
      silence: "\u6D88\u97F3\u7D44",
      grey: "\u7070\u983B"
    },
    composition: { lighthouse: 3, silence: 1, grey: 1 },
    wins: {
      priority: ["grey", "silence", "lighthouse"],
      grey: { kind: "survive_node", node: 4, text: "\u7070\u983B\u53BB\u5230\u7B2C 4 \u7BC0\u9EDE" },
      silence: { kind: "disconnect_quota", faction: "lighthouse", quota: 2, text: "\u71C8\u5854\u7DB2\u65B7\u7DDA\u6EFF 2" },
      lighthouse: { kind: "clear_faction", faction: "silence", text: "\u8868\u6C7A\u63EA\u8D70\u5168\u90E8\u5E72\u64FE\u6E90" }
    },
    phases: [
      { id: "night", label: "\u591C", coach: "\u90E8\u7F72\u6216\u8005\u6697\u6280", ms: 2e4 },
      { id: "morning", label: "\u6668\u5831", coach: "\u7747\u4E8B\u4EF6\u689D", ms: 8e3 },
      { id: "day", label: "\u65E5", coach: "\u63C0\u4E00\u53E5", ms: 75e3 },
      { id: "play", label: "\u51FA\u724C", coach: "\u4E00\u6B66\u4E00\u9053\uFF0C\u53EF\u88DD\u9632", ms: 45e3 },
      { id: "vote", label: "\u8868\u6C7A", coach: "\u65B7\u908A\u500B\u7DDA", ms: 3e4 },
      { id: "resolve", label: "\u7D50\u7B97", coach: "\u7747\u7D50\u679C", ms: 8e3 },
      { id: "discard", label: "\u68C4\u724C", coach: "\u68C4\u5230\u56DB\u5F35", ms: 15e3 }
    ],
    roles: [
      {
        id: "keeper",
        name: "\u5B88\u983B\u54E1",
        faction: "lighthouse",
        factionLabel: "\u71C8\u5854\u7DB2",
        skill: {
          id: "anchor",
          name: "\u7A69\u983B\u9328",
          window: "vote",
          text: "\u8868\u6C7A\u6642\u767C\u52D5\u3002\u82E5\u4F60\u6703\u88AB\u65B7\u7DDA\uFF0C\u53D6\u6D88\u4E00\u6B21\u3002",
          effect: "anchor",
          needsTarget: false
        }
      },
      {
        id: "finder",
        name: "\u6E2C\u5411\u54E1",
        faction: "lighthouse",
        factionLabel: "\u71C8\u5854\u7DB2",
        skill: {
          id: "bearing",
          name: "\u65B9\u4F4D\u91DD",
          window: "night",
          text: "\u591C\uFF1A\u79C1\u4E0B\u77E5\u9053\u4E00\u500B\u4EBA\u5605\u9663\u71DF\u3002",
          effect: "sniff",
          needsTarget: true
        }
      },
      {
        id: "watch",
        name: "\u503C\u66F4\u54E1",
        faction: "lighthouse",
        factionLabel: "\u71C8\u5854\u7DB2",
        skill: {
          id: "roster",
          name: "\u66F4\u8868",
          window: "play",
          text: "\u51FA\u724C\u6642\u767C\u52D5\u3002\u79C1\u4E0B\u7747\u4E00\u500B\u4EBA\u5605\u88DD\u5099\u3002",
          effect: "mirror",
          needsTarget: true
        }
      },
      {
        id: "jammer",
        name: "\u5E72\u64FE\u624B",
        faction: "silence",
        factionLabel: "\u6D88\u97F3\u7D44",
        skill: {
          id: "vein",
          name: "\u6697\u8108",
          window: "night",
          text: "\u591C\uFF1A\u6697\u4E2D\u4FFE\u4E00\u500B\u4EBA\u52A0 1 \u7591\u9EDE\u3002\u6668\u5831\u53EA\u5BEB\u76EE\u6A19\u3002",
          effect: "hidden_mark",
          needsTarget: true
        }
      },
      {
        id: "remnant",
        name: "\u9918\u983B\u5BA2",
        faction: "grey",
        factionLabel: "\u7070\u983B",
        skill: {
          id: "lurk",
          name: "\u6F5B\u884C",
          window: "vote",
          text: "\u8868\u6C7A\u6642\u767C\u52D5\u3002\u82E5\u4F60\u6703\u88AB\u65B7\u7DDA\uFF0C\u53D6\u6D88\u4E00\u6B21\u3002",
          effect: "anchor",
          needsTarget: false
        }
      }
    ]
  };

  // src/signal/browser.ts
  var current = null;
  function emit(kind, extra) {
    if (!current) return;
    if (kind === "error") {
      current.listener(JSON.stringify({ type: "error", text: extra?.text ?? "" }));
      return;
    }
    current.listener(JSON.stringify({ type: "state", view: current.match.view() }));
  }
  function open(listener, optionsJson) {
    close();
    let options = {};
    if (optionsJson) {
      try {
        const parsed = JSON.parse(optionsJson);
        if (parsed && typeof parsed === "object") options = parsed;
      } catch {
        options = {};
      }
    }
    const match = createMatch(parseCatalog(cards_default, table_default), {
      seed: options.seed,
      name: options.name,
      fast: options.fast === true,
      at: options.at,
      now: Date.now()
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
  function send(json) {
    if (!current) return;
    let command;
    try {
      command = JSON.parse(json);
    } catch {
      emit("error", { text: "\u5514\u660E\u5462\u4E00\u4E0B" });
      return;
    }
    const result = current.match.command(command);
    if (!result.ok) emit("error", { text: result.error });
    emit("state");
  }
  function close() {
    if (current?.timer) clearInterval(current.timer);
    current = null;
  }
  return __toCommonJS(browser_exports);
})();
