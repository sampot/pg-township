/**
 * 潮生鎮誌 — UI（頁內確認／對話／行程；無原生 dialog）。
 */

import { portraitArt, sceneArt } from "./art.js";
import { TownshipAudio } from "./audio.js";
import {
  CHARACTERS,
  ENDINGS,
  GAME_BRIEF,
  GAME_TITLE,
  GIFTS,
  MAX_DAYS,
  SCHEDULE_ACTIONS,
  SLOT_LABEL,
} from "./content.js";
import * as G from "./game.js";
import { loadProgress, mergeRecord, saveProgress } from "./persist.js";

const $ = (id) => document.getElementById(id);
const audio = new TownshipAudio();

let state = G.createGame();
let record = { completed: 0, bestScore: null, wins: 0 };
let saveTimer = null;
let toastTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveProgress({ save: G.serialize(state), record });
  }, 300);
}

function showToast(text) {
  const node = $("toast");
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 3200);
}

function act(next) {
  const before = state.phase;
  state = next;
  const sound = state.event?.sound;
  if (sound) void audio.play(sound, sound === "ending" ? 0.85 : 1);
  if (before === "playing" && state.phase !== "playing") {
    record = mergeRecord(record, { phase: state.phase, score: G.score(state) });
  }
  render();
  scheduleSave();
}

function currentPlace() {
  if (state.mode === "dialogue" && state.dialogue) {
    const who = state.dialogue.who;
    if (who === "mira") return "harbor";
    if (who === "ren") return "depot";
    if (who === "yu") return "archive";
  }
  if (state.mode === "shop") return "market";
  if (state.slot === "evening") return "evening";
  const last = state.schedule.at(-1);
  if (last) {
    const action = SCHEDULE_ACTIONS[last.action];
    if (action?.place) return action.place;
  }
  return "harbor";
}

function renderHud() {
  $("cal-label").textContent = G.calendarLabel(state);
  $("energy").textContent = String(state.energy);
  $("money").textContent = String(state.money);
  $("memories").textContent = String(state.memories);
  $("trust").textContent = String(state.trust);

  const aff = $("affection");
  aff.replaceChildren();
  for (const [id, person] of Object.entries(CHARACTERS)) {
    const chip = document.createElement("div");
    chip.className = "aff-chip";
    chip.style.setProperty("--c", person.color);
    chip.innerHTML = `<span>${person.name}</span><b>${state.affection[id]}</b>`;
    aff.append(chip);
  }

  const days = $("day-track");
  days.replaceChildren();
  for (let d = 1; d <= MAX_DAYS; d += 1) {
    const dot = document.createElement("span");
    dot.className = "day-dot";
    dot.dataset.on = String(d <= state.day);
    dot.dataset.current = String(d === state.day);
    dot.setAttribute("aria-label", `第 ${d} 天`);
    days.append(dot);
  }
}

function renderStage() {
  $("art").innerHTML = sceneArt(currentPlace());
  $("narration").textContent = state.event?.text ?? "";
  $("narration").dataset.kind = state.event?.kind ?? "info";
}

function renderSchedule() {
  const host = $("schedule-actions");
  host.hidden = state.mode !== "schedule";
  host.replaceChildren();
  if (state.mode !== "schedule") return;

  const title = document.createElement("p");
  title.className = "section-title";
  title.textContent = `${SLOT_LABEL[state.slot] ?? ""}行程`;
  host.append(title);

  const grid = document.createElement("div");
  grid.className = "action-grid";
  for (const id of G.getScheduleActions(state)) {
    const meta = SCHEDULE_ACTIONS[id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-btn";
    button.disabled = !G.canAffordAction(state, id);
    button.innerHTML = `<span>${meta.label}</span><small>體力 ${meta.energy > 0 ? `-${meta.energy}` : "+25"}</small>`;
    button.addEventListener("click", () => act(G.scheduleAction(state, id)));
    grid.append(button);
  }
  host.append(grid);
}

function renderDialogue() {
  const box = $("dialogue");
  box.hidden = state.mode !== "dialogue" || !state.dialogue;
  if (box.hidden) return;

  const who = state.dialogue.who;
  const person = CHARACTERS[who];
  $("dialogue-portrait").innerHTML = portraitArt(who);
  $("dialogue-name").textContent = person.name;
  $("dialogue-role").textContent = person.role;
  $("dialogue-line").textContent = state.dialogue.line;

  const choices = $("dialogue-choices");
  choices.replaceChildren();
  for (const choice of state.dialogue.choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.textContent = choice.text;
    button.addEventListener("click", () => act(G.chooseDialogue(state, choice.id)));
    choices.append(button);
  }

  const gifts = $("dialogue-gifts");
  gifts.replaceChildren();
  if (state.inventory.length === 0) return;
  const hint = document.createElement("p");
  hint.className = "section-title";
  hint.textContent = "或贈送禮物";
  gifts.append(hint);
  for (const giftId of state.inventory) {
    const gift = GIFTS[giftId];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gift-btn";
    button.innerHTML = `${gift.icon} ${gift.name}`;
    button.addEventListener("click", () => act(G.giveGift(state, giftId, who)));
    gifts.append(button);
  }
}

function renderShop() {
  const box = $("shop");
  box.hidden = state.mode !== "shop";
  if (box.hidden) return;

  const list = $("shop-list");
  list.replaceChildren();
  for (const [id, gift] of Object.entries(GIFTS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-item";
    button.disabled = state.money < gift.cost;
    button.innerHTML = `<span>${gift.icon} ${gift.name}</span><span>${gift.cost} 元</span>`;
    button.addEventListener("click", () => act(G.buyGift(state, id)));
    list.append(button);
  }

  const bag = $("bag-list");
  bag.replaceChildren();
  if (state.inventory.length === 0) {
    bag.textContent = "背包是空的。";
    return;
  }
  bag.textContent = state.inventory.map((id) => GIFTS[id].name).join(" · ");
}

function renderEnding() {
  const box = $("ending");
  box.hidden = state.mode !== "ending";
  if (box.hidden) return;

  const ending = ENDINGS[state.ending];
  $("ending-mark").textContent = state.phase === "won" ? "完稿" : "擱筆";
  $("ending-mark").dataset.lost = String(state.phase === "lost");
  $("ending-title").textContent = ending?.title ?? "";
  $("ending-text").textContent = ending?.text ?? state.event?.text ?? "";
  $("ending-score").textContent = `分數 ${G.score(state)} · 共同記憶 ${state.memories} · 行動 ${state.turns} 次`;
}

function renderLog() {
  const list = $("log");
  list.replaceChildren();
  for (const entry of [...state.log].reverse().slice(0, 6)) {
    const li = document.createElement("li");
    li.dataset.kind = entry.kind;
    li.textContent = entry.text;
    list.append(li);
  }
}

function render() {
  renderHud();
  renderStage();
  renderSchedule();
  renderDialogue();
  renderShop();
  renderEnding();
  renderLog();
  $("btn-shop-done").hidden = state.mode !== "shop";
  $("play").dataset.mode = state.mode;
}

function bindLifecycle() {
  const suspend = () => audio.suspend();
  const resume = () => audio.resume();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") suspend();
    else resume();
  });
  window.addEventListener("pagehide", suspend);
}

async function enterGame() {
  await audio.unlock();
  void audio.playBgm();
  void audio.preload();
  $("intro").hidden = true;
  $("play").hidden = false;
  render();
}

async function boot() {
  document.title = GAME_TITLE;
  $("title").textContent = GAME_TITLE;
  $("brief").textContent = GAME_BRIEF;
  bind();
  bindLifecycle();
  render();

  try {
    await window.PG.ready;
  } catch {
    showToast("尚未連上存檔服務，仍可離線遊玩。");
  }

  const stored = await loadProgress();
  record = mergeRecord(stored.record, null);
  if (record.completed > 0) {
    const line = $("record");
    line.hidden = false;
    line.textContent = `已完稿 ${record.wins} 次 · 最佳分數 ${record.bestScore ?? "—"}`;
  }

  const resumed = G.restore(stored.save);
  if (resumed && resumed.phase === "playing" && resumed.turns > 0) {
    const button = $("btn-continue");
    button.hidden = false;
    button.textContent = `接續採訪（第 ${resumed.day} 天・${resumed.turns} 個行動）`;
    button.addEventListener("click", () => {
      state = resumed;
      void enterGame();
    });
  }

  $("btn-start").addEventListener("click", () => {
    state = G.createGame();
    void enterGame();
  });
}

function bind() {
  $("btn-sound").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "關閉音效" : "開啟音效");
    audio.setEnabled(on);
    if (on) void audio.playBgm();
  });

  $("btn-shop-done").addEventListener("click", () => act(G.closeShop(state)));

  $("btn-restart").addEventListener("click", () => {
    state = G.createGame();
    act(state);
  });

  $("btn-clear-save").addEventListener("click", () => {
    $("confirm-clear").hidden = false;
  });

  $("btn-clear-cancel").addEventListener("click", () => {
    $("confirm-clear").hidden = true;
  });

  $("btn-clear-ok").addEventListener("click", async () => {
    $("confirm-clear").hidden = true;
    try {
      await window.PG.ready;
      await window.PG.kv.delete("pg-township:progress");
    } catch {
      showToast("清除存檔失敗，仍可重新開始本局。");
    }
    record = { completed: 0, bestScore: null, wins: 0 };
    state = G.createGame();
    act(state);
    showToast("存檔已清除。");
  });
}

void boot();
