// SNS投稿の「候補」を作る（投稿はオーナーが行う。ここでは文面と候補の並びだけ）
// 守ること：PR表記、価格と取得時刻、同じ文の繰り返し・同じ商品の連続投稿を避ける
import type { Deal } from "@/lib/deals";
import { formatJst, MALL_LABEL, yen } from "@/lib/format";

export type CandidateKind = "drop" | "pickup" | "popular";
export type Candidate = { jan: string; name: string; kind: CandidateKind; text: string };

/** 同じ商品は、この日数のあいだ候補にしない */
export const REPEAT_DAYS = 7;

/** 1回に出す候補の数 */
export const DEFAULT_LIMIT = 5;

const KIND_LABEL: Record<CandidateKind, string> = { drop: "値下がり", pickup: "ピックアップ", popular: "口コミの多い商品" };

/** 文面。種類ごとに数パターンを持ち、候補ごとに回す（同じ文を続けないため） */
export function buildText(d: Deal, kind: CandidateKind, siteUrl: string, variant: number): string {
  const price = yen(d.best.effectivePrice);
  const when = formatJst(d.fetchedAt);
  const where = `${MALL_LABEL[d.best.mall]}・${d.best.shopName}`;
  const url = `${siteUrl}/products/${d.product.jan}`;
  const drop = d.drop !== null ? `前日より${yen(d.drop)}安くなりました。` : "";
  const head = [
    () => `【${KIND_LABEL[kind]}】${d.product.name}。実質${price}。${drop}`,
    () => `${d.product.name}、実質${price}です。${drop}`,
    () => `今日は${d.product.name}を見ています。実質${price}。${drop}`,
  ][variant % 3]();
  return [
    `${head}${where}・${when}時点の価格です。`,
    "PR",
    url,
  ].join("\n");
}

/**
 * 候補を作る。表示の並びは、おトク順・ピックアップ・口コミ順のどれかから取る。
 * 最近候補にした商品（history の jan）は外す。同じ商品は1回だけ。
 */
export function buildCandidates(input: {
  drops: Deal[];
  pickups: Deal[];
  popular: Deal[];
  siteUrl: string;
  recentJans: Set<string>;
  limit?: number;
}): Candidate[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const lists: [CandidateKind, Deal[]][] = [
    ["drop", input.drops],
    ["pickup", input.pickups],
    ["popular", input.popular],
  ];
  // 3つの並びを順番に回して、偏らないように取る
  const cursors = [0, 0, 0];
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (let k = 0; k < lists.length && out.length < limit; k++) {
      const [kind, deals] = lists[k];
      while (cursors[k] < deals.length) {
        const d = deals[cursors[k]++];
        if (seen.has(d.product.jan) || input.recentJans.has(d.product.jan)) continue;
        seen.add(d.product.jan);
        out.push({ jan: d.product.jan, name: d.product.name, kind, text: buildText(d, kind, input.siteUrl, out.length) });
        progressed = true;
        break;
      }
    }
  }
  return out;
}

/** 履歴（JSON）から、直近 REPEAT_DAYS 日に候補にした商品を取り出す */
export function recentJansFrom(history: { jan: string; at: string }[], now: Date): Set<string> {
  const since = now.getTime() - REPEAT_DAYS * 24 * 3_600_000;
  return new Set(history.filter((h) => Date.parse(h.at) >= since).map((h) => h.jan));
}
