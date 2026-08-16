/** pg-township — 鎮誌 (視覺小說／選項劇情) */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function deep(o) { return JSON.parse(JSON.stringify(o)); }


export function createGame({ seed = 1 } = {}) {
  return { seed, turn: 0, score: 0, level: 1, meter: 0, resources: 10, flags: {}, log: ["鎮誌：行程／對話"], outcome: "playing", msg: "鎮誌：行程／對話" };
}
export function getLegalActions(s) {
  if (s.outcome !== "playing") return [];
  return ["work","talkA","talkB","talkC","rest"];
}
export function applyAction(state, action) {
  const s = deep(state);
  if (s.outcome !== "playing") return s;
  const rnd = mulberry32(s.seed + s.turn * 19);
  s.turn++;
  
  s.flags.day = (s.flags.day ?? 1);
  s.flags.a = s.flags.a ?? 0; s.flags.b = s.flags.b ?? 0; s.flags.c = s.flags.c ?? 0;
  if (action === "work") { s.resources += 2; s.msg = "打工賺生活費"; }
  else if (action === "talkA") { s.flags.a++; s.msg = "與里長多聊"; }
  else if (action === "talkB") { s.flags.b++; s.msg = "夜市攤商故事"; }
  else if (action === "talkC") { s.flags.c++; s.msg = "圖書館遇見故人"; }
  else { s.msg = "回家休息"; }
  s.flags.day++;
  s.meter = Math.max(s.flags.a, s.flags.b, s.flags.c) * 20;
  s.score = s.flags.a + s.flags.b + s.flags.c;
  if (s.flags.day >= 10) {
    s.level = 5; s.meter = 100;
    const best = Math.max(s.flags.a, s.flags.b, s.flags.c);
    s.msg = best === s.flags.a ? "結局：里坊共建" : best === s.flags.b ? "結局：夜市傳人" : "結局：靜謐書架";
  }

  if (s.resources < 0) s.resources = 0;
  if (s.outcome === "playing" && s.level >= 5 && s.meter >= 100) {
    s.outcome = "won";
    s.msg = "目標達成！";
  }
  if (s.outcome === "playing" && (s.resources <= 0 && s.meter < 20 && s.turn > 8)) {
    s.outcome = "lost";
    s.msg = "資源崩盤";
  }
  return s;
}
export function summarize(s) {
  return { turn: s.turn, level: s.level, meter: s.meter, score: s.score, resources: s.resources, msg: s.msg, outcome: s.outcome, flags: s.flags };
}
export function getOutcome(s) { return s.outcome; }

