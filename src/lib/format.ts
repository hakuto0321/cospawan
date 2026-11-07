import type { Mall } from "@/lib/pricing";

export const MALL_LABEL: Record<Mall, string> = {
  rakuten: "楽天市場",
  yahoo: "Yahoo!ショッピング",
};

/** 1980 → "1,980円" */
export function yen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

const jstDateTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "2026-11-07T07:05:00+09:00" → "11月7日 7:05" */
export function formatJst(iso: string): string {
  const parts = Object.fromEntries(jstDateTime.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** JST の日付で何日後か（今日なら 0） */
export function daysUntilJst(iso: string, now: Date): number {
  const toJstDay = (d: Date) => Math.floor((d.getTime() + 9 * 60 * 60 * 1000) / DAY_MS);
  return toJstDay(new Date(iso)) - toJstDay(now);
}
