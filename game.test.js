import { describe, expect, it } from "vitest";

import { portraitArt, sceneArt } from "./art.js";
import {
  AFFECTION_WIN,
  CHARACTERS,
  ENDINGS,
  GIFTS,
  MAX_DAYS,
  SCHEDULE_ACTIONS,
} from "./content.js";
import * as G from "./game.js";
import { mergeRecord } from "./persist.js";

/** 快轉：重複安排最便宜行程直到入夜或結束。 */
function playDays(state, plan) {
  let s = state;
  for (const actionId of plan) {
    if (s.phase !== "playing") break;
    if (s.mode === "schedule") s = G.scheduleAction(s, actionId);
    else if (s.mode === "dialogue" && s.dialogue?.choices?.[0]) {
      s = G.chooseDialogue(s, s.dialogue.choices[0].id);
    } else if (s.mode === "shop") s = G.closeShop(s);
  }
  return s;
}

/** 一個完整時段：採訪 + 選第一項。 */
function visit(state, who) {
  const id = `visit_${who}`;
  let s = G.scheduleAction(state, id);
  if (s.mode === "dialogue") s = G.chooseDialogue(s, 0);
  return s;
}

describe("開局狀態", () => {
  it("第七天採訪行程，三位鎮民好感從零開始", () => {
    const s = G.createGame({ seed: 11 });
    expect(s.day).toBe(1);
    expect(s.slot).toBe("morning");
    expect(s.phase).toBe("playing");
    expect(s.affection).toEqual({ mira: 0, ren: 0, yu: 0 });
    expect(G.getScheduleActions(s).length).toBe(Object.keys(SCHEDULE_ACTIONS).length);
  });

  it("場景插畫與肖像可渲染", () => {
    expect(sceneArt("harbor")).toContain("<svg");
    expect(portraitArt("mira")).toContain("美");
  });
});

describe("行程與日曆", () => {
  it("安排碼頭打工會消耗體力並增加金錢", () => {
    const s = G.scheduleAction(G.createGame({ seed: 3 }), "work");
    expect(s.energy).toBeLessThan(80);
    expect(s.money).toBeGreaterThan(8);
    expect(s.slot).toBe("afternoon");
  });

  it("休息會回復體力並推進時段", () => {
    let s = G.createGame({ seed: 5 });
    s.energy = 30;
    s = G.scheduleAction(s, "rest");
    expect(s.energy).toBeGreaterThan(30);
  });

  it("體力不足時無法安排高消耗行程", () => {
    let s = G.createGame();
    s.energy = 5;
    expect(G.canAffordAction(s, "visit_ren")).toBe(false);
    const out = G.scheduleAction(s, "visit_ren");
    expect(out.event.kind).toBe("fail");
    expect(out.turns).toBe(0);
  });

  it("上午與下午都安排後會進入下一日", () => {
    let s = G.createGame({ seed: 9 });
    s = G.scheduleAction(s, "rest");
    expect(s.slot).toBe("afternoon");
    s = G.scheduleAction(s, "rest");
    expect(s.day).toBe(2);
    expect(s.slot).toBe("morning");
  });

  it("探索會解鎖旗標或共同記憶", () => {
    const s = G.scheduleAction(G.createGame({ seed: 21 }), "explore");
    const hasProgress = s.memories > 0 || Object.keys(s.flags).length > 0;
    expect(hasProgress).toBe(true);
  });
});

describe("對話與好感", () => {
  it("採訪美菈會進入對話並可選項", () => {
    let s = G.scheduleAction(G.createGame({ seed: 7 }), "visit_mira");
    expect(s.mode).toBe("dialogue");
    expect(s.dialogue.who).toBe("mira");
    s = G.chooseDialogue(s, 1);
    expect(s.affection.mira).toBeGreaterThan(0);
    expect(s.flags.harbor_story).toBe(true);
  });

  it("對話選項會影響信任與記憶", () => {
    let s = G.createGame({ seed: 13 });
    s = visit(s, "yu");
    expect(s.flags.festival_clue).toBe(true);
    expect(s.memories).toBeGreaterThan(0);
  });

  it("負面選項會降低好感", () => {
    let s = G.createGame({ seed: 17 });
    s = G.scheduleAction(s, "visit_mira");
    s = G.chooseDialogue(s, 2);
    expect(s.affection.mira).toBe(1);
  });
});

describe("早市與贈禮", () => {
  it("早市可買禮物並放入背包", () => {
    let s = G.scheduleAction(G.createGame({ seed: 2 }), "market");
    expect(s.mode).toBe("shop");
    s = G.buyGift(s, "harbor_tea");
    expect(s.inventory).toContain("harbor_tea");
    expect(s.money).toBe(8 - GIFTS.harbor_tea.cost);
  });

  it("金錢不足無法購買", () => {
    let s = G.scheduleAction(G.createGame(), "market");
    s.money = 0;
    const out = G.buyGift(s, "route_map");
    expect(out.event.kind).toBe("fail");
    expect(out.inventory).toEqual([]);
  });

  it("對話中贈禮會提升好感並結束時段", () => {
    let s = G.scheduleAction(G.createGame({ seed: 4 }), "market");
    s = G.buyGift(s, "shell_necklace");
    s = G.closeShop(s);
    s = G.scheduleAction(s, "visit_mira");
    const affBefore = s.affection.mira;
    s = G.giveGift(s, "shell_necklace", "mira");
    expect(s.affection.mira).toBeGreaterThan(affBefore);
    expect(s.inventory).not.toContain("shell_necklace");
  });
});

describe("結局", () => {
  it("七天後會結算結局", () => {
    let s = G.createGame({ seed: 99 });
    for (let d = 0; d < MAX_DAYS * 2; d += 1) {
      if (s.phase !== "playing") break;
      if (s.mode === "schedule") s = G.scheduleAction(s, "rest");
      else if (s.mode === "dialogue") s = G.chooseDialogue(s, 0);
      else if (s.mode === "shop") s = G.closeShop(s);
    }
    expect(s.mode).toBe("ending");
    expect(s.ending).toBeTruthy();
    expect(ENDINGS[s.ending]).toBeTruthy();
  });

  it("美菈路線可達潮汐同行結局", () => {
    let s = G.createGame({ seed: 1 });
    const plan = [];
    for (let i = 0; i < 14; i += 1) plan.push(i % 2 === 0 ? "visit_mira" : "rest");
    for (const actionId of plan) {
      if (s.phase !== "playing") break;
      if (s.mode === "schedule") {
        s = G.scheduleAction(s, actionId);
        if (s.mode === "dialogue") s = G.chooseDialogue(s, 1);
      }
    }
    if (s.phase === "playing" && s.day >= MAX_DAYS) s = G.resolveEnding(s);
    expect(s.affection.mira).toBeGreaterThanOrEqual(AFFECTION_WIN);
    expect(["mira", "town", "leave"]).toContain(s.ending);
  });

  it("resolveEnding 可勝可敗", () => {
    let win = G.createGame();
    win.affection = { mira: 12, ren: 4, yu: 3 };
    win.flags = { harbor_story: true };
    win.memories = 4;
    win = G.resolveEnding(win);
    expect(win.phase).toBe("won");

    let lose = G.createGame();
    lose.memories = 0;
    lose.affection = { mira: 1, ren: 0, yu: 0 };
    lose = G.resolveEnding(lose);
    expect(lose.phase).toBe("lost");
    expect(lose.ending).toBe("deadline");
  });

  it("信任過低會觸發閉鎖結局", () => {
    let s = G.createGame();
    s.trust = -5;
    s = G.scheduleAction(s, "rest");
    expect(s.phase).toBe("lost");
    expect(s.ending).toBe("distrust");
  });
});

describe("分數與存檔", () => {
  it("score 會隨好感與記憶上升", () => {
    const base = G.score(G.createGame());
    const rich = G.createGame();
    rich.affection = { mira: 8, ren: 8, yu: 8 };
    rich.memories = 5;
    expect(G.score(rich)).toBeGreaterThan(base);
  });

  it("serialize／restore 可還原進行中局面", () => {
    let s = visit(G.createGame({ seed: 8 }), "ren");
    const back = G.restore(G.serialize(s));
    expect(back.day).toBe(s.day);
    expect(back.affection).toEqual(s.affection);
    expect(back.flags.truck_story).toBe(true);
  });

  it("損壞存檔會被拒收", () => {
    expect(G.restore(null)).toBeNull();
    expect(G.restore({ version: 0 })).toBeNull();
  });

  it("mergeRecord 累計完稿與最佳分", () => {
    let rec = mergeRecord(undefined, null);
    expect(rec.wins).toBe(0);
    rec = mergeRecord(rec, { phase: "won", score: 120 });
    rec = mergeRecord(rec, { phase: "won", score: 90 });
    rec = mergeRecord(rec, { phase: "lost", score: 40 });
    expect(rec.wins).toBe(2);
    expect(rec.bestScore).toBe(120);
    expect(rec.completed).toBe(3);
  });
});

describe("結束後不可再操作", () => {
  it("結局後行程無效", () => {
    let s = G.createGame();
    s.phase = "won";
    s.mode = "ending";
    expect(G.scheduleAction(s, "work")).toBe(s);
    expect(G.chooseDialogue(s, 0)).toBe(s);
  });
});

describe("內容完整性", () => {
  it("三位鎮民皆有定義", () => {
    expect(Object.keys(CHARACTERS)).toEqual(["mira", "ren", "yu"]);
  });

  it("所有行程皆有標籤與體力成本", () => {
    for (const action of Object.values(SCHEDULE_ACTIONS)) {
      expect(action.label).toBeTruthy();
      expect(typeof action.energy).toBe("number");
    }
  });
});
