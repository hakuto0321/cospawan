import { describe, expect, it } from "vitest";
import { priceOffer, type Mall, type ShippingStatus } from "./pricing";
import type { ProductWithOffers } from "./data/types";
import {
  buildFaq,
  daysOfUse,
  leadSentence,
  productJsonLd,
  productViewModel,
  shippingLabel,
  shopRows,
  unitPriceText,
} from "./productPage";

type Row = [mall: Mall, shop: string, price: number, status?: ShippingStatus, shipping?: number | null, prev?: number];

const item = (rows: Row[]): ProductWithOffers => ({
  product: {
    id: 1,
    jan: "2000000000015",
    name: "ドッグフード 3kg",
    petType: "dog",
    categoryName: "フード",
    size: "3kg",
    unit: "g",
    amount: 3000,
    defaultPerDay: 90,
    amazonUrl: null,
    reviewCount: null,
  },
  offers: rows.map(([mall, shopName, price, status = "free", shipping = 0, prev], i) =>
    priceOffer(
      {
        mall,
        itemCode: String(i),
        shopName,
        price,
        shipping: status === "unknown" ? null : shipping,
        shippingStatus: status,
        pointRate: 0,
        points: 0,
        url: "https://example.com",
      },
      { previousPrice: prev },
    ),
  ),
  previousMinEffectivePrice: null,
  fetchedAt: "2026-11-07T07:05:00+09:00",
});

const sample = item([
  ["rakuten", "A", 4300],
  ["yahoo", "B", 4100],
  ["rakuten", "C", 3900, "unknown"],
  ["yahoo", "D", 1000, "free", 0, 4000], // 保留
  ["rakuten", "E", 3800, "paid", 600],
]);

describe("shopRows", () => {
  it("保留を除き、実質の安い順 → 送料別の順に並べる", () => {
    expect(shopRows(sample.offers).map((o) => o.shopName)).toEqual(["B", "A", "E", "C"]);
  });
});

describe("shippingLabel", () => {
  it("送料の状態を言葉にする", () => {
    expect(shippingLabel({ shippingStatus: "free", shipping: 0 })).toBe("無料");
    expect(shippingLabel({ shippingStatus: "included", shipping: null })).toBe("込み");
    expect(shippingLabel({ shippingStatus: "paid", shipping: 600 })).toBe("600円");
    expect(shippingLabel({ shippingStatus: "unknown", shipping: null })).toBe("送料別");
  });
});

describe("leadSentence", () => {
  it("「実質最安は〇円（モール・ショップ、日時時点）。」の形", () => {
    expect(leadSentence(sample)).toBe("実質最安は4,100円（Yahoo!ショッピング・B、11月7日 7:05時点）。");
  });
  it("比較できる価格がなければ null", () => {
    expect(leadSentence(item([["rakuten", "C", 3900, "unknown"]]))).toBeNull();
  });
});

describe("unitPriceText / daysOfUse", () => {
  it("g は 1kg あたり、それ以外は 1単位あたり", () => {
    expect(unitPriceText(4100, 3000, "g")).toBe("1kgあたり約1,367円");
    expect(unitPriceText(1518, 100, "枚")).toBe("1枚あたり約15.2円");
    expect(unitPriceText(3380, 6, "袋")).toBe("1袋あたり約563円");
    expect(unitPriceText(1000, null, "g")).toBeNull();
  });
  it("何日分か", () => {
    expect(daysOfUse(3000, 90)).toBe(33);
    expect(daysOfUse(3000, null)).toBeNull();
  });
});

describe("buildFaq", () => {
  it("モール比較・単価・日数・更新時刻を答える", () => {
    const faq = buildFaq(sample);
    expect(faq.map((f) => f.q)).toEqual([
      "楽天市場とYahoo!ショッピング、どちらが安い？",
      "1kgあたりいくら？",
      "1つで何日くらいもつ？",
      "価格はいつ更新される？",
    ]);
    expect(faq[0].a).toContain("Yahoo!ショッピングのほうが安く、実質4,100円です（楽天市場は4,300円）");
  });
  it("片方のモールしかなければ比較の質問は出さない", () => {
    expect(buildFaq(item([["rakuten", "A", 4300]]))[0].q).toBe("1kgあたりいくら？");
  });
});

describe("productJsonLd", () => {
  it("表に出しているショップの価格だけで AggregateOffer を作る", () => {
    const rows = shopRows(sample.offers);
    const ld = productJsonLd(sample, rows, buildFaq(sample), "https://example.com/p");
    const product = ld["@graph"][0] as Record<string, unknown>;
    expect(product.gtin13).toBe("2000000000015");
    expect(product.offers).toEqual({
      "@type": "AggregateOffer",
      priceCurrency: "JPY",
      lowPrice: 3800,
      highPrice: 4300,
      offerCount: 4,
    });
  });
});

describe("productViewModel", () => {
  it("前回より安くなったときだけ差額を出し、個数から日数と1kgあたりを作る", () => {
    const base = { ...item([["rakuten", "A", 2000]]), previousMinEffectivePrice: 2100 };
    const v = productViewModel(base);
    expect(v.drop).toBe(100);
    expect(v.petLabel).toBe("犬・");
    expect(v.days).toBe(Math.floor(base.product.amount! / base.product.defaultPerDay!));

    const noDrop = productViewModel({ ...base, previousMinEffectivePrice: 1500 });
    expect(noDrop.drop).toBeNull();
  });

  it("比較できる価格がないときは、最安も差額も出さない", () => {
    const v = productViewModel(item([["rakuten", "A", 2000, "paid", null]]));
    expect(v.best).toBeNull();
    expect(v.drop).toBeNull();
    expect(v.unitPrice).toBeNull();
  });
});
