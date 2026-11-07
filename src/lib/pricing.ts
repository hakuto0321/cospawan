// 実質価格の計算と、おかしな値を保留にする判定
// 実質価格 = 価格 + 送料 − もらえるポイント（1ポイント = 1円）
// 送料の金額がわからないショップは実質価格を出さず、最安の比較にも入れない

export type Mall = "rakuten" | "yahoo";
export type ShippingStatus = "free" | "included" | "paid" | "unknown";

export type Offer = {
  mall: Mall;
  itemCode: string;
  shopName: string;
  /** 税込の商品価格（円） */
  price: number;
  /** 送料（円）。わからないときは null */
  shipping: number | null;
  shippingStatus: ShippingStatus;
  /** 基本のポイント倍率（%） */
  pointRate: number;
  /** もらえるポイント */
  points: number;
  url: string;
};

export type PricedOffer = Offer & {
  effectivePrice: number | null;
  holdReason: string | null;
};

const TAX_RATE_PERCENT = 10; // ペット用品は軽減税率の対象外

/**
 * 基本のポイントを、税抜価格 × 倍率 で計算する（1円未満切り捨て）。
 * モールがポイント数を直接返す場合はそちらを使う。細かい端数の扱いは C2/C3 で API の仕様に合わせて確かめる。
 */
export function basePoints(priceTaxIncluded: number, pointRate: number): number {
  const taxExcluded = Math.floor((priceTaxIncluded * 100) / (100 + TAX_RATE_PERCENT));
  return Math.floor((taxExcluded * pointRate) / 100);
}

/** 実際に払う送料。わからないときは null */
export function shippingCost(offer: Pick<Offer, "shipping" | "shippingStatus">): number | null {
  switch (offer.shippingStatus) {
    case "free":
    case "included":
      return 0;
    case "paid":
      return offer.shipping;
    case "unknown":
      return null;
  }
}

/** 実質価格。送料がわからないときは null */
export function effectivePrice(offer: Pick<Offer, "price" | "shipping" | "shippingStatus" | "points">): number | null {
  const shipping = shippingCost(offer);
  if (shipping === null) return null;
  return offer.price + shipping - offer.points;
}

// ---- 保留の判定 ----

/** これ以上の変動は保留（0.5 = 50%） */
export const MAX_CHANGE_RATIO = 0.5;
const MAX_PRICE = 1_000_000;
const MAX_SHIPPING = 10_000;

export type HoldContext = {
  /** 同じショップ・同じ商品の前回の価格 */
  previousPrice?: number | null;
  /** この商品の前回の実質最安（全モール） */
  previousMinEffectivePrice?: number | null;
};

/** 公開してはいけない値なら理由を返す。問題なければ null */
export function holdReason(offer: Offer, ctx: HoldContext = {}): string | null {
  const { price, shipping, points } = offer;

  if (!Number.isInteger(price) || price <= 0) return "価格が不正";
  if (price > MAX_PRICE) return "価格が大きすぎる";
  if (shipping !== null && (!Number.isInteger(shipping) || shipping < 0 || shipping > MAX_SHIPPING)) {
    return "送料が不正";
  }
  if (offer.shippingStatus === "paid" && shipping === null) return "送料が不正";
  if (!Number.isInteger(points) || points < 0 || points >= price) return "ポイントが不正";

  const prev = ctx.previousPrice;
  if (prev != null && prev > 0 && Math.abs(price - prev) / prev >= MAX_CHANGE_RATIO) {
    return "前回から50%以上の変動";
  }

  // 新しく出てきたショップが極端に安いとき（入数違いなどの取り違えが多い）
  const eff = effectivePrice(offer);
  const prevMin = ctx.previousMinEffectivePrice;
  if (eff !== null && prevMin != null && prevMin > 0 && eff <= prevMin * (1 - MAX_CHANGE_RATIO)) {
    return "前回の最安より50%以上安い";
  }

  return null;
}

/** 実質価格と保留の判定をまとめて付ける */
export function priceOffer(offer: Offer, ctx: HoldContext = {}): PricedOffer {
  return { ...offer, effectivePrice: effectivePrice(offer), holdReason: holdReason(offer, ctx) };
}

// ---- 最安の選び方 ----

/** 比較に入れてよいか：保留しておらず、実質価格がわかる */
function isComparable(o: PricedOffer): o is PricedOffer & { effectivePrice: number } {
  return o.holdReason === null && o.effectivePrice !== null;
}

/** 実質価格の安い順（同じなら価格の安い順）に並べる。比較できないものは除く */
export function rankOffers(offers: PricedOffer[]): (PricedOffer & { effectivePrice: number })[] {
  return offers
    .filter(isComparable)
    .sort((a, b) => a.effectivePrice - b.effectivePrice || a.price - b.price);
}

/** 実質最安。比較できるものがなければ null */
export function cheapestOffer(offers: PricedOffer[]) {
  return rankOffers(offers)[0] ?? null;
}

export type TopOffer = {
  shop_name: string;
  price: number;
  shipping: number;
  points: number;
  effective_price: number;
  url: string;
};

/** price_history に残す1モール分のまとめ。比較できるものがなければ null */
export function summarizeMall(offers: PricedOffer[], mall: Mall, topN = 3) {
  const ranked = rankOffers(offers.filter((o) => o.mall === mall));
  if (ranked.length === 0) return null;
  const topOffers: TopOffer[] = ranked.slice(0, topN).map((o) => ({
    shop_name: o.shopName,
    price: o.price,
    shipping: shippingCost(o) ?? 0,
    points: o.points,
    effective_price: o.effectivePrice,
    url: o.url,
  }));
  return { mall, effectivePriceMin: ranked[0].effectivePrice, topOffers };
}
