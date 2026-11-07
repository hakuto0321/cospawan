import { describe, expect, it, vi } from "vitest";
import { buildRakutenRequest, fetchRakutenOffers, mentionsJan, parseRakutenResponse, RAKUTEN_ENDPOINT } from "./rakuten";

const JAN = "4902000000017";
const cfg = { applicationId: "app-id", accessKey: "secret-key", affiliateId: "aff", siteUrl: "https://cospawan.example/" };

// 公式ドキュメントの項目名どおりに作った見本（formatVersion 2）
const item = (o: Record<string, unknown>) => ({
  itemName: `ドッグフード 3kg JAN:${JAN}`,
  catchcopy: "",
  itemCaption: "",
  itemCode: "shop-a:10001",
  itemPrice: 2200,
  itemUrl: "https://item.rakuten.co.jp/shop-a/10001/",
  affiliateUrl: "https://hb.afl.rakuten.co.jp/aff/shop-a-10001",
  shopName: "ショップA",
  availability: 1,
  taxFlag: 0,
  postageFlag: 0,
  pointRate: 1,
  ...o,
});

describe("buildRakutenRequest", () => {
  it("JAN をキーワードにし、アクセスキーはヘッダーで送る", () => {
    const { url, headers } = buildRakutenRequest(JAN, cfg);
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe(RAKUTEN_ENDPOINT);
    expect(u.searchParams.get("keyword")).toBe(JAN);
    expect(u.searchParams.get("applicationId")).toBe("app-id");
    expect(u.searchParams.get("affiliateId")).toBe("aff");
    expect(u.searchParams.get("sort")).toBe("+itemPrice");
    expect(u.searchParams.has("accessKey")).toBe(false); // URL に秘密を載せない
    expect(headers).toEqual({ accessKey: "secret-key", Referer: "https://cospawan.example/", Origin: "https://cospawan.example" });
  });
});

describe("mentionsJan", () => {
  it("JAN がそのまま書いてあるときだけ true（全角数字も可）", () => {
    expect(mentionsJan(`JANコード：${JAN}`, JAN)).toBe(true);
    expect(mentionsJan("ＪＡＮ：４９０２０００００００１７", JAN)).toBe(true);
    expect(mentionsJan(`1${JAN}`, JAN)).toBe(false); // もっと長い数字の一部
    expect(mentionsJan("ドッグフード", JAN)).toBe(false);
    expect(mentionsJan(undefined, JAN)).toBe(false);
  });
});

describe("parseRakutenResponse", () => {
  it("送料込み・ポイント倍率を Offer に変換し、アフィリエイトURLを使う", () => {
    const r = parseRakutenResponse({ Items: [item({ pointRate: 5 })] }, JAN);
    expect(r.offers).toEqual([
      {
        mall: "rakuten",
        itemCode: "shop-a:10001",
        shopName: "ショップA",
        price: 2200,
        shipping: 0,
        shippingStatus: "included",
        pointRate: 5,
        points: 100, // 税抜2000円 × 5%
        url: "https://hb.afl.rakuten.co.jp/aff/shop-a-10001",
      },
    ]);
  });
  it("送料別は送料不明として扱う", () => {
    const [o] = parseRakutenResponse({ Items: [item({ postageFlag: 1 })] }, JAN).offers;
    expect(o).toMatchObject({ shipping: null, shippingStatus: "unknown" });
  });
  it("JAN を確かめられない・税抜表示・在庫なしは除外し、理由を残す", () => {
    const r = parseRakutenResponse(
      {
        Items: [
          item({ itemCode: "b:1", itemName: "似た商品" }),
          item({ itemCode: "c:1", itemName: "名前にはない", itemCaption: `説明文 JAN ${JAN}` }),
          item({ itemCode: "d:1", taxFlag: 1 }),
          item({ itemCode: "e:1", availability: 0 }),
        ],
      },
      JAN,
    );
    expect(r.offers.map((o) => o.itemCode)).toEqual(["c:1"]);
    expect(r.skipped.map((s) => [s.itemCode, s.reason])).toEqual([
      ["b:1", "JANコードを確かめられない"],
      ["d:1", "税抜表示"],
      ["e:1", "在庫なし"],
    ]);
    expect(r.total).toBe(4);
  });
  it("formatVersion 1（Item で包まれた形）も読める", () => {
    expect(parseRakutenResponse({ Items: [{ Item: item({}) }] }, JAN).offers).toHaveLength(1);
  });
  it("API のエラーは例外にする", () => {
    expect(() => parseRakutenResponse({ error: "wrong_parameter", error_description: "keyword is not valid" }, JAN)).toThrow(
      "wrong_parameter",
    );
  });
});

describe("fetchRakutenOffers", () => {
  it("取得して変換する", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ Items: [item({})] }), { status: 200 }));
    const r = await fetchRakutenOffers(JAN, cfg, { fetchImpl });
    expect(r.offers).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
