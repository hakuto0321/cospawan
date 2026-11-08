// 価格の鮮度：最終更新から何時間たったか
/** これより古ければ「止まっている」とみなしてオーナーに知らせる */
export const STALE_AFTER_HOURS = 12;

/** 1件の価格は、これより古ければ画面に出さない（比べる対象からも外す） */
export const OFFER_MAX_AGE_HOURS = 24;

/** 取得日時から OFFER_MAX_AGE_HOURS 以内か */
export function isOfferFresh(fetchedAt: string, now: Date, maxAgeHours = OFFER_MAX_AGE_HOURS): boolean {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t < maxAgeHours * 3_600_000;
}

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
