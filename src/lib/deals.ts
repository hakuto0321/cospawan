// 「今日の買い時」の並べ方
// 土日版は価格履歴が少ないので、30日平均ではなく次の2つで並べる
// 1. 前日（約24時間前）より実質最安が下がった商品を、下がった割合の大きい順に
// 2. それ以外は、もう一方のモールとの差が大きい順に
import { cheapestOffer, rankOffers, type Mall, type PricedOffer } from "@/lib/pricing";
import type { Product, ProductWithOffers } from "@/lib/data/types";

export type Deal = {
  product: Product;
  best: PricedOffer & { effectivePrice: number };
  /** 前日より安くなった金額。安くなっていなければ null */
  drop: number | null;
  /** もう一方のモールの実質最安。そのモールに比較できる価格がなければ null */
  otherMall: { mall: Mall; effectivePrice: number } | null;
  fetchedAt: string;
  /** 口コミ数（人気順の目安）。取れていなければ null */
  reviewCount: number | null;
};

export function toDeal(item: ProductWithOffers): Deal | null {
  const best = cheapestOffer(item.offers);
  if (!best) return null;

  const prev = item.previousMinEffectivePrice;
  const drop = prev != null && prev > best.effectivePrice ? prev - best.effectivePrice : null;

  const other = rankOffers(item.offers).find((o) => o.mall !== best.mall);
  const otherMall = other ? { mall: other.mall, effectivePrice: other.effectivePrice } : null;

  return {
    product: item.product,
    best,
    drop,
    otherMall,
    fetchedAt: item.fetchedAt,
    reviewCount: item.product.reviewCount,
  };
}

function dropRatio(d: Deal): number {
  return d.drop === null ? 0 : d.drop / (d.best.effectivePrice + d.drop);
}

function mallGap(d: Deal): number {
  return d.otherMall ? d.otherMall.effectivePrice - d.best.effectivePrice : 0;
}

/** 比較できる価格がない商品は除いて、買い時の順に並べる */
export function buildDeals(items: ProductWithOffers[]): Deal[] {
  return items
    .map(toDeal)
    .filter((d): d is Deal => d !== null)
    .sort((a, b) => {
      const byDrop = dropRatio(b) - dropRatio(a);
      if (byDrop !== 0) return byDrop;
      const byGap = mallGap(b) - mallGap(a);
      if (byGap !== 0) return byGap;
      return a.product.name.localeCompare(b.product.name, "ja");
    });
}
