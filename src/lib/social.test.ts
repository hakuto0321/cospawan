import { describe, expect, it } from "vitest";
import type { Deal } from "./deals";
import { buildCandidates, buildText, recentJansFrom } from "./social";

const deal = (jan: string, name: string, price: number, drop: number | null): Deal => ({
  product: {
    id: Number(jan.slice(-4)),
    jan,
    name,
    petType: "dog",
    categoryName: "フード",
    size: null,
    unit: null,
    amount: null,
    amazonUrl: null,
    reviewCount: null,
  },
  best: { mall: "rakuten", itemCode: jan, shopName: "ペットの森", price, shipping: 0, shippingStatus: "free", pointRate: 0, points: 0, url: "https://e", effectivePrice: price, holdReason: null },
  drop,
  otherMall: null,
  fetchedAt: "2026-11-08T07:05:00+09:00",
  reviewCount: null,
});

const SITE = "https://cospawan.com";

describe("buildText", () => {
  it("PR表記・実質価格・取得時刻・商品ページのリンクを必ず入れる", () => {
    const t = buildText(deal("2000000000015", "ドッグフード 3kg", 4066, 314), "drop", SITE, 0);
    expect(t).toContain("PR");
    expect(t).toContain("4,066円");
    expect(t).toContain("前日より314円安くなりました");
    expect(t).toContain("11月8日 7:05時点");
    expect(t).toContain("https://cospawan.com/products/2000000000015");
  });
  it("同じ種類でも、文面のパターンを変える", () => {
    const a = buildText(deal("2000000000015", "A", 100, null), "pickup", SITE, 0);
    const b = buildText(deal("2000000000015", "A", 100, null), "pickup", SITE, 1);
    expect(a).not.toBe(b);
  });
});

describe("buildCandidates", () => {
  it("3つの並びから偏りなく取り、同じ商品は1回だけ", () => {
    const drops = [deal("2000000000001", "A", 100, 10), deal("2000000000002", "B", 100, 5)];
    const pickups = [deal("2000000000001", "A", 100, 10), deal("2000000000003", "C", 100, null)];
    const popular = [deal("2000000000004", "D", 100, null)];
    const out = buildCandidates({ drops, pickups, popular, siteUrl: SITE, recentJans: new Set(), limit: 4 });
    expect(out.map((c) => c.jan)).toEqual(["2000000000001", "2000000000003", "2000000000004", "2000000000002"].slice(0, out.length));
    expect(new Set(out.map((c) => c.jan)).size).toBe(out.length);
    expect(out.map((c) => c.kind)).toContain("popular");
  });
  it("直近に候補にした商品は外す", () => {
    const drops = [deal("2000000000001", "A", 100, 10), deal("2000000000002", "B", 100, 5)];
    const out = buildCandidates({ drops, pickups: [], popular: [], siteUrl: SITE, recentJans: new Set(["2000000000001"]) });
    expect(out.map((c) => c.jan)).toEqual(["2000000000002"]);
  });
});

describe("recentJansFrom", () => {
  it("REPEAT_DAYS 日より前の履歴は数えない", () => {
    const now = new Date("2026-11-08T12:00:00+09:00");
    const set = recentJansFrom(
      [
        { jan: "2000000000001", at: "2026-11-06T12:00:00+09:00" },
        { jan: "2000000000002", at: "2026-10-01T12:00:00+09:00" },
      ],
      now,
    );
    expect([...set]).toEqual(["2000000000001"]);
  });
});
