// C3 Yahoo!ショッピング 商品検索API（v3 itemSearch）
// https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html
// JAN で探せて、応答にも janCode が入るので、JAN が一致するものだけを採用する。
// 1秒に1回までの制限がある（呼ぶ側で createRateLimiter を使う）
import type { Offer } from "@/lib/pricing";
import { getJson, type FetchLike } from "./http";
import type { MallResult, Skipped } from "./types";

export const YAHOO_ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

/** Yahoo! の API は 1秒に1回まで。少し余裕をもたせる */
export const YAHOO_MIN_INTERVAL_MS = 1_100;

export type YahooConfig = {
  clientId: string;
  /** バリューコマースのアフィリエイトID。あれば商品URLがアフィリエイトURLになる */
  valueCommerceId?: string;
};

export function buildYahooRequest(jan: string, cfg: YahooConfig) {
  const params = new URLSearchParams({
    appid: cfg.clientId,
    jan_code: jan,
    results: "50",
    sort: "+price",
    in_stock: "true",
  });
  if (cfg.valueCommerceId) {
    params.set("affiliate_type", "vc");
    params.set("affiliate_id", cfg.valueCommerceId);
  }
  return { url: `${YAHOO_ENDPOINT}?${params}` };
}

type YahooHit = {
  name?: string;
  code?: string;
  url?: string;
  inStock?: boolean;
  janCode?: string;
  price?: number;
  priceLabel?: { taxable?: boolean };
  seller?: { sellerId?: string; name?: string };
  shipping?: { code?: number; name?: string };
  point?: { lyLimitedBonusAmount?: number; lyLimitedBonusTimes?: number };
  review?: { count?: number };
};

export function parseYahooResponse(json: unknown, jan: string): MallResult {
  const err = (json as { Error?: { Message?: string } })?.Error;
  if (err) throw new Error(`Yahoo!APIのエラー: ${err.Message ?? "不明"}`);

  const hits = (json as { hits?: YahooHit[] })?.hits;
  const items = Array.isArray(hits) ? hits : [];
  const offers: Offer[] = [];
  const skipped: Skipped[] = [];

  for (const h of items) {
    const itemCode = h.code ?? "";
    const shopName = h.seller?.name ?? "";
    const skip = (reason: string) => skipped.push({ itemCode, shopName, reason });

    if (!itemCode || !shopName || !h.url || typeof h.price !== "number") {
      skip("必要な項目が足りない");
      continue;
    }
    if (h.janCode !== jan) {
      skip("JANコードが一致しない");
      continue;
    }
    if (h.inStock === false) {
      skip("在庫なし");
      continue;
    }
    if (h.priceLabel?.taxable === false) {
      skip("税抜表示");
      continue;
    }

    // shipping.code: 1 = 設定なし / 2 = 送料無料 / 3 = 条件付き送料無料
    // 条件付きは条件（購入金額など）がわからないので「送料別」と同じ扱いにする
    const free = h.shipping?.code === 2;

    // ポイント：API が返すストアポイント（PayPayポイント、期間限定）だけを数える。
    // 基本ポイントの項目は 2022年から 0 固定のため、ここでは足さない（実際の値で要確認）
    const points = Math.max(0, Math.floor(h.point?.lyLimitedBonusAmount ?? 0));
    const times = Math.max(0, h.point?.lyLimitedBonusTimes ?? 0);

    offers.push({
      mall: "yahoo",
      // 同じ商品コードが別ストアにもありうるので、ストアIDを前に付ける
      itemCode: withSeller(itemCode, h.seller?.sellerId),
      shopName,
      price: h.price,
      shipping: free ? 0 : null,
      shippingStatus: free ? "free" : "unknown",
      pointRate: times,
      points,
      url: h.url,
    });
  }

  // 口コミ数：同じ JAN の中で一番多い値（売れた数ではない）
  const reviews = items
    .filter((h) => h.janCode === jan && typeof h.review?.count === "number")
    .map((h) => h.review!.count as number);
  const reviewCount = reviews.length > 0 ? Math.max(...reviews) : null;

  return { offers, skipped, total: items.length, reviewCount };
}

export async function fetchYahooOffers(
  jan: string,
  cfg: YahooConfig,
  deps: { fetchImpl?: FetchLike } = {},
): Promise<MallResult> {
  const { url } = buildYahooRequest(jan, cfg);
  const json = await getJson(url, { fetchImpl: deps.fetchImpl });
  return parseYahooResponse(json, jan);
}

/** 商品コードの前にストアIDを付ける（すでに付いていればそのまま） */
export function withSeller(code: string, sellerId: string | undefined): string {
  if (!sellerId || code.startsWith(`${sellerId}_`)) return code;
  return `${sellerId}_${code}`;
}
