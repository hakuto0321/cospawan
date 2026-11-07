// C2 楽天市場 商品検索API（IchibaItem/Search 2026-07-01）
// https://webservice.rakuten.co.jp/documentation/ichiba-item-search
//
// 楽天の商品検索APIには JAN で探す項目がなく、応答にも JAN が入っていない。
// そこで「JAN をキーワードにして探し、商品名・キャッチコピー・説明文に JAN が書いてある商品だけ」を採用する。
import { basePoints, type Offer } from "@/lib/pricing";
import { getJson, type FetchLike } from "./http";
import type { MallResult, Skipped } from "./types";

export const RAKUTEN_ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

export type RakutenConfig = {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
  /** 楽天に登録したサイトの URL。Referer / Origin に付ける */
  siteUrl: string;
};

export function buildRakutenRequest(jan: string, cfg: RakutenConfig) {
  const params = new URLSearchParams({
    applicationId: cfg.applicationId,
    keyword: jan,
    hits: "30",
    sort: "+itemPrice",
    availability: "1",
    format: "json",
    formatVersion: "2",
  });
  if (cfg.affiliateId) params.set("affiliateId", cfg.affiliateId);
  const origin = new URL(cfg.siteUrl).origin;
  return {
    url: `${RAKUTEN_ENDPOINT}?${params}`,
    headers: {
      accessKey: cfg.accessKey,
      // 公式の説明にはないが、付けないと 403 になるという報告があるため両方付ける
      Referer: `${origin}/`,
      Origin: origin,
    },
  };
}

type RakutenItem = {
  itemName?: string;
  catchcopy?: string;
  itemCaption?: string;
  itemCode?: string;
  itemPrice?: number;
  itemUrl?: string;
  affiliateUrl?: string;
  shopName?: string;
  availability?: number;
  taxFlag?: number;
  postageFlag?: number;
  pointRate?: number;
};

/** formatVersion 2（平ら）と 1（Item で包まれる）の両方を読めるようにする */
function readItems(json: unknown): RakutenItem[] {
  const items = (json as { Items?: unknown[] })?.Items;
  if (!Array.isArray(items)) return [];
  return items.map((i) => ((i as { Item?: RakutenItem }).Item ?? i) as RakutenItem);
}

/** 文字列の中に JAN が「数字の続きではなく」そのまま書いてあるか */
export function mentionsJan(text: string | undefined, jan: string): boolean {
  if (!text) return false;
  // 全角数字を半角にそろえる
  const normalized = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return new RegExp(`(^|[^0-9])${jan}([^0-9]|$)`).test(normalized);
}

export function parseRakutenResponse(json: unknown, jan: string): MallResult {
  const err = json as { error?: string; error_description?: string };
  if (err?.error) throw new Error(`楽天APIのエラー: ${err.error} ${err.error_description ?? ""}`.trim());

  const items = readItems(json);
  const offers: Offer[] = [];
  const skipped: Skipped[] = [];

  for (const it of items) {
    const itemCode = it.itemCode ?? "";
    const shopName = it.shopName ?? "";
    const skip = (reason: string) => skipped.push({ itemCode, shopName, reason });

    if (!itemCode || !shopName || !it.itemUrl || typeof it.itemPrice !== "number") {
      skip("必要な項目が足りない");
      continue;
    }
    if (it.availability === 0) {
      skip("在庫なし");
      continue;
    }
    if (![it.itemName, it.catchcopy, it.itemCaption].some((t) => mentionsJan(t, jan))) {
      skip("JANコードを確かめられない");
      continue;
    }
    if (it.taxFlag === 1) {
      // 税抜表示の商品。税込に直すと端数がずれるおそれがあるので載せない
      skip("税抜表示");
      continue;
    }

    const price = it.itemPrice;
    const multiplier = typeof it.pointRate === "number" && it.pointRate > 0 ? it.pointRate : 1;
    // postageFlag: 0 = 送料込み（送料無料を含む） / 1 = 送料別（金額はわからない）
    const included = it.postageFlag === 0;

    offers.push({
      mall: "rakuten",
      itemCode,
      shopName,
      price,
      shipping: included ? 0 : null,
      shippingStatus: included ? "included" : "unknown",
      // 楽天の通常ポイントは税抜価格の1%。ショップの倍率（pointRate）を掛ける
      pointRate: multiplier,
      points: basePoints(price, multiplier),
      url: it.affiliateUrl || it.itemUrl,
    });
  }

  return { offers, skipped, total: items.length };
}

export async function fetchRakutenOffers(
  jan: string,
  cfg: RakutenConfig,
  deps: { fetchImpl?: FetchLike } = {},
): Promise<MallResult> {
  const { url, headers } = buildRakutenRequest(jan, cfg);
  const json = await getJson(url, { headers, fetchImpl: deps.fetchImpl });
  return parseRakutenResponse(json, jan);
}
