// トップページの「ランキング風」の並べ方
// 売れ筋の数字は取れないので、次の2つを使う（画面にも、何で並べたかを書く）
// - おトク順：前日より実質最安が下がった割合の大きい順（価格履歴から）
// - 口コミ順：Yahoo!ショッピングの口コミ数の多い順（売れた数ではない）
import { buildDeals, toDeal, type Deal } from "@/lib/deals";
import type { ProductWithOffers } from "@/lib/data/types";

export type PickupReason = "値下がり中" | "注目";
export type Pickup = { deal: Deal; reason: PickupReason };

/** おトク順。値下がりした商品だけを、下がった割合の大きい順に n 件 */
export function dropRanking(items: ProductWithOffers[], n: number): Deal[] {
  return buildDeals(items)
    .filter((d) => d.drop !== null)
    .slice(0, n);
}

/** 口コミ順。口コミ数が取れている商品だけを、多い順に n 件 */
export function popularRanking(items: ProductWithOffers[], n: number): Deal[] {
  return items
    .filter((i) => i.product.reviewCount !== null)
    .sort((a, b) => (b.product.reviewCount ?? 0) - (a.product.reviewCount ?? 0) || a.product.name.localeCompare(b.product.name, "ja"))
    .map(toDeal)
    .filter((d): d is Deal => d !== null)
    .slice(0, n);
}

/**
 * ピックアップ（自動）。値下がり中の商品から口コミの多いものを優先し、
 * 足りなければ買い時の順で埋める。先頭の「今日いちばんの買いどき」とは重ならない
 */
export function pickups(items: ProductWithOffers[], excludeId: number | null, n: number): Pickup[] {
  const deals = buildDeals(items).filter((d) => d.product.id !== excludeId);
  const falling = deals
    .filter((d) => d.drop !== null)
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  const picked = falling.slice(0, n);
  const rest = deals.filter((d) => !picked.includes(d)).slice(0, Math.max(0, n - picked.length));
  return [
    ...picked.map((deal) => ({ deal, reason: "値下がり中" as const })),
    ...rest.map((deal) => ({ deal, reason: "注目" as const })),
  ];
}
