/**
 * 進度持久化：走宿主 `PG.kv`（禁止 localStorage 當權威）。
 */

const KEY = "pg-township:progress";

export async function loadProgress() {
  try {
    await window.PG.ready;
    const raw = await window.PG.kv.get(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export async function saveProgress(data) {
  try {
    await window.PG.ready;
    await window.PG.kv.put(KEY, JSON.stringify(data));
  } catch {
    /* 離線或尚未就緒時靜默略過 */
  }
  return data;
}

export function mergeRecord(record, result) {
  const base = { completed: 0, bestScore: null, wins: 0, ...(record ?? {}) };
  if (!result) return base;
  const better = base.bestScore === null || result.score > base.bestScore;
  return {
    completed: base.completed + 1,
    wins: base.wins + (result.phase === "won" ? 1 : 0),
    bestScore: better ? result.score : base.bestScore,
  };
}
