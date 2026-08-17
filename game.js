/**
 * 潮生鎮誌 — 規則引擎（純函式，無 DOM）。
 */

import {
  AFFECTION_TOWN,
  AFFECTION_WIN,
  CHARACTERS,
  DIALOGUES,
  ENDINGS,
  EXPLORE_EVENTS,
  GIFTS,
  MAX_DAYS,
  MEMORIES_LEAVE,
  MEMORIES_MIN,
  MEMORIES_TOWN,
  SCHEDULE_ACTIONS,
  SLOTS,
  TRUST_FAIL,
} from "./content.js";

export const SAVE_VERSION = 1;
const LOG_LIMIT = 16;

export function createGame({ seed = Date.now() % 997 } = {}) {
  return {
    version: SAVE_VERSION,
    seed,
    day: 1,
    slot: SLOTS[0],
    phase: "playing",
    mode: "schedule",
    energy: 80,
    money: 8,
    trust: 0,
    affection: { mira: 0, ren: 0, yu: 0 },
    memories: 0,
    flags: {},
    inventory: [],
    schedule: [],
    dialogue: null,
    shopOpen: false,
    ending: null,
    turns: 0,
    log: [{ text: "第七天後的末班車會離港。在此之前，決定每一個時段的去向。", kind: "info" }],
    event: { sound: null, text: "第七天後的末班車會離港。在此之前，決定每一個時段的去向。", kind: "info" },
  };
}

function clone(state) {
  return {
    ...state,
    affection: { ...state.affection },
    flags: { ...state.flags },
    inventory: [...state.inventory],
    schedule: [...state.schedule],
    log: [...state.log],
    dialogue: state.dialogue ? { ...state.dialogue, choices: [...state.dialogue.choices] } : null,
  };
}

function emit(state, text, kind = "info", sound = null) {
  state.event = { sound, text, kind };
  state.log = [...state.log, { text, kind }].slice(-LOG_LIMIT);
  return state;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hasFlags(state, needs = []) {
  return needs.every((flag) => state.flags[flag]);
}

function addFlag(state, flag) {
  if (!flag) return;
  if (!state.flags[flag]) state.flags[flag] = true;
}

function addMemory(state) {
  state.memories += 1;
}

function adjustAffection(state, who, delta) {
  if (!who || !delta) return;
  state.affection[who] = clamp(state.affection[who] + delta, 0, 20);
}

function applyAffectionMap(state, map = {}) {
  for (const [who, delta] of Object.entries(map)) adjustAffection(state, who, delta);
}

function pickDialogue(state, who) {
  const pool = DIALOGUES[who] ?? [];
  const eligible = pool.filter(
    (beat) => state.day >= beat.minDay && hasFlags(state, beat.needs ?? [])
  );
  return eligible.at(-1) ?? pool[0];
}

function seeded(state, salt = 0) {
  return ((state.seed * 9301 + state.turns * 49297 + state.day * 233 + salt * 17) % 233280) / 233280;
}

/** 目前時段可安排的行程。 */
export function getScheduleActions(state) {
  if (state.phase !== "playing" || state.mode !== "schedule") return [];
  return Object.keys(SCHEDULE_ACTIONS);
}

export function canAffordAction(state, actionId) {
  const action = SCHEDULE_ACTIONS[actionId];
  if (!action) return false;
  const cost = Math.max(0, action.energy);
  if (action.kind === "rest") return true;
  return state.energy >= cost;
}

/** 安排行程：可能進入對話、商店，或直接結算。 */
export function scheduleAction(state, actionId) {
  if (state.phase !== "playing" || state.mode !== "schedule") return state;
  const action = SCHEDULE_ACTIONS[actionId];
  if (!action || !canAffordAction(state, actionId)) {
    return emit(clone(state), "體力或條件不足，換個安排吧。", "fail", "error");
  }

  const next = clone(state);
  next.turns += 1;
  next.schedule.push({ day: next.day, slot: next.slot, action: actionId });

  if (action.energy > 0) next.energy = clamp(next.energy - action.energy, 0, 100);
  else next.energy = clamp(next.energy - action.energy, 0, 100);

  if (next.energy <= 0 && action.kind !== "rest") {
    next.phase = "lost";
    next.ending = "burnout";
    next.mode = "ending";
    return emit(next, ENDINGS.burnout.text, "fail", "error");
  }

  if (action.kind === "visit") {
    const beat = pickDialogue(next, action.who);
    next.mode = "dialogue";
    next.dialogue = {
      who: action.who,
      line: beat.line,
      choices: beat.choices.map((choice, index) => ({ ...choice, id: index })),
    };
    return emit(next, `${CHARACTERS[action.who].name}：${beat.line}`, "talk", "open");
  }

  if (action.kind === "market") {
    next.mode = "shop";
    next.shopOpen = true;
    return emit(next, "早市攤販擺出小禮。挑一份帶去採訪吧。", "info", "step");
  }

  if (action.kind === "work") {
    const earned = 4 + Math.floor(seeded(next) * 2);
    next.money += earned;
    advanceSlot(next);
    return finalizeDay(next, `你在碼頭卸貨，賺了 ${earned} 元，也聽見新的流言。`, "page");
  }

  if (action.kind === "rest") {
    advanceSlot(next);
    return finalizeDay(next, "你在旅館寫日記，體力緩緩回復。", "rest");
  }

  if (action.kind === "explore") {
    const event = EXPLORE_EVENTS[Math.floor(seeded(next, next.turns) * EXPLORE_EVENTS.length)];
    addFlag(next, event.flag);
    if (event.memory) addMemory(next);
    if (event.trust) next.trust += event.trust;
    if (event.money) next.money += event.money;
    applyAffectionMap(next, event.affection ?? {});
    advanceSlot(next);
    return finalizeDay(next, event.text, "step");
  }

  advanceSlot(next);
  return finalizeDay(next, "你在潮生鎮多走了一程。", "step");
}

/** 對話選項。 */
export function chooseDialogue(state, choiceId) {
  if (state.phase !== "playing" || state.mode !== "dialogue" || !state.dialogue) return state;
  const choice = state.dialogue.choices.find((item) => item.id === choiceId);
  if (!choice) return state;

  const next = clone(state);
  const who = next.dialogue.who;
  adjustAffection(next, who, choice.affection ?? 0);
  addFlag(next, choice.flag);
  if (choice.memory) addMemory(next);
  if (choice.trust) next.trust += choice.trust;
  if (choice.money) next.money += choice.money;

  next.dialogue = null;
  next.mode = "schedule";
  advanceSlot(next);
  return finalizeDay(next, `${CHARACTERS[who].name}記下了你的回答。`, "heart");
}

/** 贈禮給指定角色。 */
export function giveGift(state, giftId, who) {
  if (state.phase !== "playing") return state;
  if (!state.inventory.includes(giftId)) {
    return emit(clone(state), "你沒有這份禮物。", "fail", "error");
  }
  const gift = GIFTS[giftId];
  if (!gift || !CHARACTERS[who]) return state;

  const next = clone(state);
  next.inventory = next.inventory.filter((id) => id !== giftId);
  applyAffectionMap(next, gift.bonus);
  next.trust += 1;
  if (state.mode === "dialogue" || state.mode === "gift") {
    next.dialogue = null;
    next.mode = "schedule";
    advanceSlot(next);
  }
  return finalizeDay(next, `你將「${gift.name}」送給${CHARACTERS[who].name}。`, "gift");
}

export function buyGift(state, giftId) {
  if (state.phase !== "playing" || state.mode !== "shop") return state;
  const gift = GIFTS[giftId];
  if (!gift) return state;
  if (state.money < gift.cost) {
    return emit(clone(state), "身上的錢不夠。", "fail", "error");
  }

  const next = clone(state);
  next.money -= gift.cost;
  next.inventory.push(giftId);
  return emit(next, `買下「${gift.name}」。`, "found", "gift");
}

export function closeShop(state) {
  if (state.mode !== "shop") return state;
  const next = clone(state);
  next.shopOpen = false;
  next.mode = "schedule";
  advanceSlot(next);
  return finalizeDay(next, "你帶著禮物離開早市。", "step");
}

function advanceSlot(state) {
  if (state.slot === SLOTS[0]) {
    state.slot = SLOTS[1];
    return;
  }
  state.slot = "evening";
}

function finalizeDay(state, text, sound) {
  if (state.trust <= TRUST_FAIL) {
    state.phase = "lost";
    state.ending = "distrust";
    state.mode = "ending";
    return emit(state, ENDINGS.distrust.text, "fail", "error");
  }

  if (state.slot === "evening") {
    if (state.day >= MAX_DAYS) return resolveEnding(state);
    state.day += 1;
    state.slot = SLOTS[0];
    state.energy = clamp(state.energy + 8, 0, 100);
    return emit(state, `第 ${state.day} 天。${text}`, "info", sound);
  }

  return emit(state, text, "info", sound);
}

function topAffection(state) {
  return Object.entries(state.affection).sort((a, b) => b[1] - a[1])[0];
}

export function resolveEnding(state) {
  const next = clone(state);
  next.mode = "ending";
  next.slot = "evening";

  const [who, val] = topAffection(next);
  const flags = next.flags;

  if (val >= AFFECTION_WIN && flags.harbor_story && who === "mira") next.ending = "mira";
  else if (val >= AFFECTION_WIN && flags.truck_story && who === "ren") next.ending = "ren";
  else if (val >= AFFECTION_WIN && flags.festival_clue && who === "yu") next.ending = "yu";
  else if (
    next.affection.mira >= AFFECTION_TOWN &&
    next.affection.ren >= AFFECTION_TOWN &&
    next.affection.yu >= AFFECTION_TOWN &&
    next.memories >= MEMORIES_TOWN
  ) {
    next.ending = "town";
  } else if (next.memories >= MEMORIES_LEAVE) next.ending = "leave";
  else if (next.memories < MEMORIES_MIN) next.ending = "deadline";
  else next.ending = "leave";

  const ending = ENDINGS[next.ending];
  next.phase = ending.phase;
  return emit(next, `結局〈${ending.title}〉：${ending.text}`, ending.phase === "won" ? "won" : "fail", "ending");
}

export function score(state) {
  const aff = state.affection.mira + state.affection.ren + state.affection.yu;
  return aff * 10 + state.memories * 15 + state.trust * 5 + state.money;
}

export function calendarLabel(state) {
  return `第 ${state.day} 天 · ${state.slot === "morning" ? "上午" : state.slot === "afternoon" ? "下午" : "入夜"}`;
}

export function serialize(state) {
  return JSON.parse(JSON.stringify(state));
}

export function restore(raw) {
  if (!raw || raw.version !== SAVE_VERSION) return null;
  if (!raw.affection || raw.day < 1) return null;
  const base = createGame({ seed: raw.seed ?? 1 });
  return {
    ...base,
    ...raw,
    affection: { ...base.affection, ...raw.affection },
    flags: { ...(raw.flags ?? {}) },
    inventory: [...(raw.inventory ?? [])],
    schedule: [...(raw.schedule ?? [])],
    log: [...(raw.log ?? base.log)],
  };
}
