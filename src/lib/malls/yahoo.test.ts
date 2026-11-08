import { describe, expect, it } from "vitest";
import { buildYahooRequest, parseYahooResponse, withSeller, YAHOO_ENDPOINT } from "./yahoo";

const JAN = "4902000000017";

// 公式ドキュメントの項目名どおりに作った見本
const hit = (o: Record<string, unknown>) => ({
  name: "ドッグフード 3kg",
  code: "store-a_10001",
  url: "https://store.shopping.yahoo.co.jp/store-a/10001.html",
  inStock: true,
  janCode: JAN,
  price: 2200,
  priceLabel: { taxable: true },
  seller: { sellerId: "store-a", name: "ストアA" },
  shipping: { code: 2, name: "送料無料" },
  point: { lyLimitedBonusAmount: 40, lyLimitedBonusTimes: 2 },
  ...o,
});

describe("buildYahooRequest", () => {
  it("JAN で探し、アフィリエイトはバリューコマース", () => {
    const u = new URL(buildYahooRequest(JAN, { clientId: "cid", valueCommerceId: "vc-id" }).url);
    expect(`${u.origin}${u.pathname}`).toBe(YAHOO_ENDPOINT);
    expect(u.searchParams.get("jan_code")).toBe(JAN);
    expect(u.searchParams.get("appid")).toBe("cid");
    expect(u.searchParams.get("affiliate_type")).toBe("vc");
    expect(u.searchParams.get("affiliate_id")).toBe("vc-id");
    expect(u.searchParams.get("in_stock")).toBe("true");
  });
  it("アフィリエイトIDがなければ付けない", () => {
    const u = new URL(buildYahooRequest(JAN, { clientId: "cid" }).url);
    expect(u.searchParams.has("affiliate_type")).toBe(false);
  });
});

describe("parseYahooResponse", () => {
  it("送料無料とストアポイントを Offer に変換する", () => {
    const r = parseYahooResponse({ hits: [hit({})] }, JAN);
    expect(r.offers).toEqual([
      {
        mall: "yahoo",
        itemCode: "store-a_10001",
        shopName: "ストアA",
        price: 2200,
        shipping: 0,
        shippingStatus: "free",
        pointRate: 2,
        points: 40,
        url: "https://store.shopping.yahoo.co.jp/store-a/10001.html",
      },
    ]);
  });
  it("送料の設定なし・条件付き送料無料は送料不明", () => {
    const r = parseYahooResponse({ hits: [hit({ shipping: { code: 1 } }), hit({ code: "x_1", shipping: { code: 3 } })] }, JAN);
    expect(r.offers.map((o) => o.shippingStatus)).toEqual(["unknown", "unknown"]);
  });
  it("ポイントの項目がなければ 0", () => {
    expect(parseYahooResponse({ hits: [hit({ point: undefined })] }, JAN).offers[0].points).toBe(0);
  });
  it("JAN 違い・在庫なし・税抜表示は除外する", () => {
    const r = parseYahooResponse(
      {
        hits: [
          hit({ code: "b_1", janCode: "4902000000024" }),
          hit({ code: "c_1", inStock: false }),
          hit({ code: "d_1", priceLabel: { taxable: false } }),
          hit({ code: "e_1" }),
        ],
      },
      JAN,
    );
    expect(r.offers.map((o) => o.itemCode)).toEqual(["store-a_e_1"]); // ストアIDが前に付く
    expect(r.skipped.map((s) => s.reason)).toEqual(["JANコードが一致しない", "在庫なし", "税抜表示"]);
  });
  it("API のエラーは例外にする", () => {
    expect(() => parseYahooResponse({ Error: { Message: "Invalid appid" } }, JAN)).toThrow("Invalid appid");
  });
});

describe("withSeller", () => {
  it("ストアIDが付いていなければ付ける", () => {
    expect(withSeller("10001", "store-a")).toBe("store-a_10001");
    expect(withSeller("store-a_10001", "store-a")).toBe("store-a_10001");
    expect(withSeller("10001", undefined)).toBe("10001");
  });
});

describe("parseYahooResponse の口コミ数", () => {
  it("同じ JAN の中で一番多い口コミ数を返す。JAN が違う商品は数えない", () => {
    const json = {
      hits: [
        { name: "A", janCode: "4902000000000", code: "s1", url: "https://e/1", price: 1000, seller: { name: "店", sellerId: "s" }, review: { count: 120 } },
        { name: "B", janCode: "4902000000000", code: "s2", url: "https://e/2", price: 1100, seller: { name: "店2", sellerId: "t" }, review: { count: 300 } },
        { name: "C", janCode: "9999999999999", code: "s3", url: "https://e/3", price: 900, seller: { name: "店3", sellerId: "u" }, review: { count: 9999 } },
      ],
    };
    expect(parseYahooResponse(json, "4902000000000").reviewCount).toBe(300);
  });
  it("口コミ数がなければ null", () => {
    expect(parseYahooResponse({ hits: [] }, "4902000000000").reviewCount).toBeNull();
  });
});
