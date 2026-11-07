// 価格の鮮度：最終更新から何時間たったか
/** これより古ければ「止まっている」とみなしてオーナーに知らせる */
export const STALE_AFTER_HOURS = 12;

export type Freshness = {
  lastUpdatedAt: string | null;
  ageHours: number | null;
  stale: boolean;
};

export function evaluateFreshness(fetchedAts: string[], now: Date, limitHours = STALE_AFTER_HOURS): Freshness {
  const times = fetchedAts.map((t) => Date.parse(t)).filter((t) => Number.isFinite(t));
  if (times.length === 0) return { lastUpdatedAt: null, ageHours: null, stale: true };
  const last = Math.max(...times);
  const hours = (now.getTime() - last) / 3_600_000;
  // 判定は丸める前の値で行い、表示用だけ小数1桁に丸める
  return {
    lastUpdatedAt: new Date(last).toISOString(),
    ageHours: Math.round(hours * 10) / 10,
    stale: hours >= limitHours,
  };
}
