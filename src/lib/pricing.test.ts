import { describe, expect, it } from "vitest";
import {
  basePoints,
  cheapestOffer,
  effectivePrice,
  holdReason,
  priceOffer,
  rankOffers,
  summarizeMall,
  type Offer,
} from "./pricing";

const offer = (o: Partial<Offer> = {}): Offer => ({
  mall: "rakuten",
  itemCode: "shop:1",
  shopName: "ショップ",
  price: 2200,
  shipping: 0,
  shippingStatus: "free",
  pointRate: 1,
  points: 20,
  url: "https://example.com",
  ...o,
});

describe("basePoints", () => {
  it("税抜価格の1%を切り捨てで計算する", () => {
    expect(basePoints(2200, 1)).toBe(20); // 税抜2000円
    expect(basePoints(1980, 1)).toBe(18); // 税抜1800円
    expect(basePoints(1100, 10)).toBe(100);
    expect(basePoints(109, 1)).toBe(0); // 1ポイント未満は0
  });
});

describe("effectivePrice", () => {
  it("価格 + 送料 − ポイント", () => {
    expect(effectivePrice(offer({ shippingStatus: "paid", shipping: 500 }))).toBe(2680);
  });
  it("送料無料・送料込みは送料0円", () => {
    expect(effectivePrice(offer({ shippingStatus: "free", shipping: null }))).toBe(2180);
    expect(effectivePrice(offer({ shippingStatus: "included", shipping: null }))).toBe(2180);
  });
  it("送料がわからないときは null（「送料別」と表示する）", () => {
    expect(effectivePrice(offer({ shippingStatus: "unknown", shipping: null }))).toBeNull();
  });
});

describe("holdReason", () => {
  it("ふつうの値は保留しない", () => {
    expect(holdReason(offer())).toBeNull();
    expect(holdReason(offer(), { previousPrice: 2000, previousMinEffectivePrice: 2100 })).toBeNull();
  });
  it("不正な価格・送料・ポイントは保留", () => {
    expect(holdReason(offer({ price: 0 }))).toBe("価格が不正");
    expect(holdReason(offer({ price: 12.5 }))).toBe("価格が不正");
    expect(holdReason(offer({ price: 2_000_000 }))).toBe("価格が大きすぎる");
    expect(holdReason(offer({ shippingStatus: "paid", shipping: -1 }))).toBe("送料が不正");
    expect(holdReason(offer({ shippingStatus: "paid", shipping: null }))).toBe("送料が不正");
    expect(holdReason(offer({ points: 2200 }))).toBe("ポイントが不正");
  });
  it("前回から50%以上変わったら保留（上がっても下がっても）", () => {
    expect(holdReason(offer({ price: 1100 }), { previousPrice: 2200 })).toBe("前回から50%以上の変動");
    expect(holdReason(offer({ price: 3300 }), { previousPrice: 2200 })).toBe("前回から50%以上の変動");
    expect(holdReason(offer({ price: 1101, points: 10 }), { previousPrice: 2200 })).toBeNull();
  });
  it("前回の最安より極端に安い新顔は保留", () => {
    expect(
      holdReason(offer({ price: 1000, points: 9 }), { previousMinEffectivePrice: 2400 }),
    ).toBe("前回の最安より50%以上安い");
  });
  it("前回の記録がなければ変動では保留しない", () => {
    expect(holdReason(offer({ price: 100, points: 0 }), { previousPrice: null })).toBeNull();
  });
});

describe("最安の選び方", () => {
  const offers = [
    priceOffer(offer({ itemCode: "a", price: 2480, points: 22 })), // 2458
    priceOffer(offer({ itemCode: "b", price: 2280, points: 20, shippingStatus: "paid", shipping: 500 })), // 2760
    priceOffer(offer({ itemCode: "c", mall: "yahoo", price: 2398, points: 21 })), // 2377
    priceOffer(offer({ itemCode: "d", mall: "yahoo", price: 1890, points: 17, shippingStatus: "unknown", shipping: null })), // 送料別
    priceOffer(offer({ itemCode: "e", mall: "yahoo", price: 1000, points: 9 }), { previousPrice: 2400 }), // 保留
  ];

  it("送料別と保留中を除いて、実質価格の安い順に並べる", () => {
    expect(rankOffers(offers).map((o) => o.itemCode)).toEqual(["c", "a", "b"]);
  });
  it("実質価格が同じなら価格の安い方を先にする", () => {
    const tie = [
      priceOffer(offer({ itemCode: "x", price: 2300, points: 100 })), // 2200
      priceOffer(offer({ itemCode: "y", price: 2220, points: 20 })), // 2200
    ];
    expect(rankOffers(tie).map((o) => o.itemCode)).toEqual(["y", "x"]);
  });
  it("実質最安を返す。比較できるものがなければ null", () => {
    expect(cheapestOffer(offers)?.itemCode).toBe("c");
    expect(cheapestOffer([offers[3], offers[4]])).toBeNull();
  });
  it("モールごとの最安と上位を price_history 用にまとめる", () => {
    const rakuten = summarizeMall(offers, "rakuten", 1);
    expect(rakuten?.effectivePriceMin).toBe(2458);
    expect(rakuten?.topOffers).toEqual([
      { shop_name: "ショップ", price: 2480, shipping: 0, points: 22, effective_price: 2458, url: "https://example.com" },
    ]);
    expect(summarizeMall(offers, "yahoo")?.topOffers).toHaveLength(1);
    expect(summarizeMall([offers[3]], "yahoo")).toBeNull();
  });
});
