// 送客リンク
// 画面のリンクは自サイトの /go/ を通し、そこでクリックを記録してからショップへ送る。
// 行き先は必ず商品データから引く（URL をパラメータで受け取らないので、勝手なサイトへは飛ばせない）
import type { ProductWithOffers } from "@/lib/data/types";
import type { Mall, PricedOffer } from "@/lib/pricing";

/** 送客リンクに付ける rel（広告リンクであることを検索エンジンに伝える） */
export const OUTBOUND_REL = "sponsored nofollow noopener";

export function offerHref(jan: string, offer: Pick<PricedOffer, "mall" | "itemCode">): string {
  return `/go/${jan}/${offer.mall}/${encodeURIComponent(offer.itemCode)}`;
}

export function amazonHref(jan: string): string {
  return `/go/${jan}/amazon`;
}

export type OutboundTarget = { url: string; mall: Mall | "amazon" };

/**
 * /go/{jan}/{...target} の行き先を決める。見つからなければ null。
 * target は ["amazon"] か [mall, itemCode]
 */
export function resolveOutbound(item: ProductWithOffers, target: string[]): OutboundTarget | null {
  if (target.length === 1 && target[0] === "amazon") {
    return item.product.amazonUrl ? { url: item.product.amazonUrl, mall: "amazon" } : null;
  }
  if (target.length !== 2) return null;
  const [mall, itemCode] = target;
  // 保留中の価格のショップには送らない
  const offer = item.offers.find((o) => o.mall === mall && o.itemCode === itemCode && o.holdReason === null);
  return offer ? { url: offer.url, mall: offer.mall } : null;
}

/** 検索エンジンなどのロボットか（記録に入れない） */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawler|spider|crawling|preview|fetch|curl|wget|python|headless/i.test(userAgent);
}
