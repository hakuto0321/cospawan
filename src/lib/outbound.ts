import type { PricedOffer } from "@/lib/pricing";

// 送客リンクの行き先。D1 で自サイト経由のリダイレクト（クリックを記録）に差し替える
export function offerHref(offer: Pick<PricedOffer, "url">): string {
  return offer.url;
}

export function amazonHref(url: string): string {
  return url;
}

/** 送客リンクに付ける rel（広告リンクであることを検索エンジンに伝える） */
export const OUTBOUND_REL = "sponsored nofollow noopener";
