// 売れ筋の候補を集める：Yahoo!ショッピングの検索を「口コミ数の多い順」で使う
// 応答に janCode と review.count が入るので、JAN と人気の目安が一度に取れる
// （楽天のランキングAPIは仕様を確かめられていないため、今は使わない）
import { YAHOO_ENDPOINT } from "@/lib/malls/yahoo";

/** 自動で探すキーワード。ペット用品のカテゴリごとに分けている */
export const DISCOVERY_QUERIES = [
  "ドッグフード 成犬",
  "ドッグフード 子犬",
  "ドッグフード 小型犬",
  "ドッグフード 中型犬",
  "キャットフード 成猫",
  "キャットフード 子猫",
  "キャットフード 室内猫",
  "猫砂",
  "ペットシーツ",
  "犬 おやつ",
  "猫 おやつ",
];

export type Candidate = {
  jan: string;
  rawName: string;
  shopName: string;
  reviewCount: number;
  query: string;
};

export function buildYahooSearchRequest(query: string, clientId: string): string {
  const params = new URLSearchParams({
    appid: clientId,
    query,
    sort: "-review_count",
    results: "30",
    in_stock: "true",
  });
  return `${YAHOO_ENDPOINT}?${params}`;
}

type SearchHit = {
  name?: string;
  janCode?: string;
  seller?: { name?: string };
  review?: { count?: number };
};

export function parseYahooSearch(json: unknown, query: string): Candidate[] {
  const err = (json as { Error?: { Message?: string } })?.Error;
  if (err) throw new Error(`Yahoo!APIのエラー: ${err.Message ?? "不明"}`);

  const hits = (json as { hits?: SearchHit[] })?.hits;
  if (!Array.isArray(hits)) return [];

  const out: Candidate[] = [];
  for (const h of hits) {
    const jan = h.janCode ?? "";
    if (!/^[0-9]{8}$|^[0-9]{13}$/.test(jan) || /^0+$/.test(jan) || !h.name) continue;
    out.push({
      jan,
      rawName: h.name,
      shopName: h.seller?.name ?? "",
      reviewCount: Math.max(0, h.review?.count ?? 0),
      query,
    });
  }
  return out;
}

/** 同じ JAN は、口コミ数が多いほうの1件にまとめる。口コミ数の多い順に並べる */
export function uniqueByJan(cands: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const c of cands) {
    const cur = best.get(c.jan);
    if (!cur || c.reviewCount > cur.reviewCount) best.set(c.jan, c);
  }
  return [...best.values()].sort((a, b) => b.reviewCount - a.reviewCount);
}
