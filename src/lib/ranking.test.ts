import { describe, expect, it } from "vitest";
import { dropRanking, pickups, popularRanking } from "./ranking";
import { priceOffer } from "./pricing";
import type { ProductWithOffers } from "./data/types";

// id・下がった額・口コミ数だけ変える。どれも送料無料の1ショップ
const item = (id: number, price: number, prev: number | null, reviewCount: number | null): ProductWithOffers => ({
  product: {
    id,
    jan: String(2000000000000 + id),
    name: `商品${id}`,
    petType: "dog",
    categoryName: "フード",
    size: null,
    unit: null,
    amount: null,
    defaultPerDay: null,
    amazonUrl: null,
    reviewCount,
  },
  offers: [priceOffer({ mall: "rakuten", itemCode: `${id}`, shopName: "A", price, shipping: 0, shippingStatus: "free", pointRate: 0, points: 0, url: "https://example.com" })],
  previousMinEffectivePrice: prev,
  fetchedAt: "2026-11-08T07:00:00+09:00",
});

describe("dropRanking", () => {
  it("値下がりした商品だけを、下がった割合の大きい順に", () => {
    const items = [item(1, 900, 1000, null), item(2, 500, 1000, null), item(3, 1000, null, null)];
    expect(dropRanking(items, 5).map((d) => d.product.id)).toEqual([2, 1]);
  });
});

describe("popularRanking", () => {
  it("口コミ数が取れている商品を、多い順に。取れていない商品は出さない", () => {
    const items = [item(1, 100, null, 50), item(2, 100, null, null), item(3, 100, null, 300)];
    expect(popularRanking(items, 5).map((d) => d.product.id)).toEqual([3, 1]);
  });
  it("一件もなければ空", () => {
    expect(popularRanking([item(1, 100, null, null)], 5)).toEqual([]);
  });
});

describe("pickups", () => {
  it("値下がり中を口コミの多い順に選び、足りなければ注目で埋める。先頭の商品は外す", () => {
    const items = [
      item(1, 900, 1000, 10),   // 値下がり・口コミ少
      item(2, 900, 1000, 500),  // 値下がり・口コミ多い
      item(3, 1000, null, 900), // 値下がりなし
      item(4, 800, 1000, 200),  // 値下がり
      item(5, 1000, null, null),
    ];
    const out = pickups(items, 99, 3);
    expect(out.map((p) => [p.deal.product.id, p.reason])).toEqual([
      [2, "値下がり中"],
      [4, "値下がり中"],
      [1, "値下がり中"],
    ]);
  });
  it("先頭の商品（excludeId）は含めない", () => {
    const items = [item(1, 900, 1000, 500), item(2, 900, 1000, 10)];
    expect(pickups(items, 1, 3).map((p) => p.deal.product.id)).toEqual([2]);
  });
});
