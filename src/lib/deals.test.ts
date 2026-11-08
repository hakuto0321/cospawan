import { describe, expect, it } from "vitest";
import { buildDeals, toDeal } from "./deals";
import { priceOffer, type Mall, type ShippingStatus } from "./pricing";
import type { ProductWithOffers } from "./data/types";

const item = (
  id: number,
  previousMin: number | null,
  offers: [Mall, number, ShippingStatus?][],
): ProductWithOffers => ({
  product: {
    id,
    jan: String(2000000000000 + id),
    name: `商品${id}`,
    petType: "dog",
    categoryName: "フード",
    size: null,
    unit: null,
    amount: null,
    amazonUrl: null,
    reviewCount: null,
  },
  offers: offers.map(([mall, price, status = "free"], i) =>
    priceOffer({
      mall,
      itemCode: `${id}-${i}`,
      shopName: `ショップ${i}`,
      price,
      shipping: status === "unknown" ? null : 0,
      shippingStatus: status,
      pointRate: 0,
      points: 0,
      url: "https://example.com",
    }),
  ),
  previousMinEffectivePrice: previousMin,
  fetchedAt: "2026-11-07T07:00:00+09:00",
});

describe("toDeal", () => {
  it("実質最安・前日との差・もう一方のモールを出す", () => {
    const d = toDeal(item(1, 1200, [["rakuten", 1000], ["yahoo", 1100], ["rakuten", 1050]]));
    expect(d?.best.effectivePrice).toBe(1000);
    expect(d?.drop).toBe(200);
    expect(d?.otherMall).toEqual({ mall: "yahoo", effectivePrice: 1100 });
  });
  it("前日より高い・同じ・記録なしなら drop は null", () => {
    expect(toDeal(item(1, 900, [["rakuten", 1000]]))?.drop).toBeNull();
    expect(toDeal(item(1, 1000, [["rakuten", 1000]]))?.drop).toBeNull();
    expect(toDeal(item(1, null, [["rakuten", 1000]]))?.drop).toBeNull();
  });
  it("もう一方のモールが送料別だけなら比較しない", () => {
    expect(toDeal(item(1, null, [["rakuten", 1000], ["yahoo", 900, "unknown"]]))?.otherMall).toBeNull();
  });
  it("比較できる価格がなければ null", () => {
    expect(toDeal(item(1, null, [["yahoo", 900, "unknown"]]))).toBeNull();
  });
});

describe("buildDeals", () => {
  it("下がった割合の大きい順 → モール間の差の大きい順に並べ、表示できないものは除く", () => {
    const deals = buildDeals([
      item(1, null, [["rakuten", 1000], ["yahoo", 1010]]), // 差10
      item(2, 1100, [["rakuten", 1000]]), // 約9%下落
      item(3, null, [["yahoo", 900, "unknown"]]), // 表示できない
      item(4, 2000, [["rakuten", 1000]]), // 50%下落
      item(5, null, [["rakuten", 1000], ["yahoo", 1300]]), // 差300
    ]);
    expect(deals.map((d) => d.product.id)).toEqual([4, 2, 5, 1]);
  });
});
